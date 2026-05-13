import { NextResponse } from "next/server";
import { join } from "path";
import { existsSync, createReadStream, statSync } from "fs";

const REPORTS_DIR = process.env.REPORT_OUTPUT_DIR || "/home/caoviet/Documents/reports_shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  const filePath = join(REPORTS_DIR, file);

  // Security: ensure file is within REPORTS_DIR
  if (!filePath.startsWith(REPORTS_DIR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stat = statSync(filePath);
  const ext = file.split(".").pop()?.toLowerCase() || "";
  const contentType = ext === "xlsx"
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : ext === "md"
    ? "text/markdown"
    : "application/octet-stream";

  const stream = createReadStream(filePath);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  });
}