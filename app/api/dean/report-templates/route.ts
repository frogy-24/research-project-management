import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getActorUserId, getActorRole } from "@/lib/project-permissions"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"

// List templates
export async function GET(req: NextRequest) {
  const userId = getActorUserId(req)
  const role = getActorRole(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dean = await prisma.user.findUnique({ where: { id: userId } })
  if (!dean || dean.role !== "DEAN") {
    return NextResponse.json({ error: "Forbidden: Only Dean can access" }, { status: 403 })
  }

  try {
    const templates = await prisma.reportTemplate.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error("List templates error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Create template
export async function POST(req: NextRequest) {
  const userId = getActorUserId(req)
  const role = getActorRole(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dean = await prisma.user.findUnique({ where: { id: userId } })
  if (!dean || dean.role !== "DEAN") {
    return NextResponse.json({ error: "Forbidden: Only Dean can access" }, { status: 403 })
  }

  try {
    // Handle FormData upload
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const name = formData.get("name") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    // Save file to uploads directory
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = join(process.cwd(), "public", "uploads", "templates")
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const filePath = join(uploadDir, fileName)

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/templates/${fileName}`
    const fileType = file.type || "application/octet-stream"
    const fileSize = file.size

    const template = await prisma.reportTemplate.create({
      data: {
        name,
        fileUrl,
        fileType,
        fileSize,
        uploadedBy: userId,
      },
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error("Create template error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
