import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * POST /api/upload
 * Upload file with optional context (callRoundId, callRoundName)
 * Files are organized as: public/uploads/call-round/{callRoundName}/{timestamp}-{filename}
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyAuthToken(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    const callRoundId = data.get("callRoundId") as string | null;
    const callRoundName = data.get("callRoundName") as string | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isPdfByType = file.type === 'application/pdf';
    const isPdfByName = /\.pdf$/i.test(file.name);
    if (!isPdfByType && !isPdfByName) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine upload directory based on context
    let uploadDir: string;
    let relativePath: string;
    
    if (callRoundId && callRoundName) {
      // Student project files: public/uploads/call-round/{callRoundName}/
      const sanitizedCallRoundName = callRoundName.replace(/[^a-zA-Z0-9-_]/g, "-");
      uploadDir = join(process.cwd(), "public", "uploads", "call-round", sanitizedCallRoundName);
      relativePath = `/uploads/call-round/${sanitizedCallRoundName}`;
    } else {
      // Default: public/uploads/
      uploadDir = join(process.cwd(), "public", "uploads");
      relativePath = `/uploads`;
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
    const filePath = join(uploadDir, fileName);

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    await writeFile(filePath, buffer);

    return NextResponse.json({ 
      url: `${relativePath}/${fileName}`,
      filePath: filePath // Server-side path for deletion
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Error uploading file" }, { status: 500 });
  }
}

/**
 * DELETE /api/upload
 * Delete file from server
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyAuthToken(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    // Convert URL to file path
    // URL format: /uploads/... or /uploads/call-round/{name}/...
    const urlPath = url.startsWith('/') ? url.substring(1) : url;
    const filePath = join(process.cwd(), "public", urlPath);

    // Security check: ensure file is within uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Check if file exists before attempting to delete
    if (existsSync(filePath)) {
      await unlink(filePath);
      return NextResponse.json({ success: true, message: "File deleted successfully" });
    } else {
      return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Error deleting file" }, { status: 500 });
  }
}
