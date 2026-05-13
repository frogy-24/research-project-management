import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getActorUserId, getActorRole } from "@/lib/project-permissions"

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
    const body = await req.json()
    const { reportType, parameters, templateUrl, templateId, callRoundId } = body

    // Default reportType if not provided
    const type = reportType || "custom_report"

    // Determine template type
    let templateType = "default"
    if (templateId) {
      templateType = "uploaded"
    }

    // Create job in DB
    const job = await prisma.reportJob.create({
      data: {
        deanId: userId,
        reportType: type,
        templateUrl,
        templateId,
        callRoundId,
        templateType,
        parameters: parameters || {},
        status: "QUEUED",
        progress: 0,
      },
    })

    // Publish to RabbitMQ
    const QUEUE_NAME = process.env.REPORT_QUEUE || "report_generation_queue"

    try {
      const response = await fetch(`${process.env.BOT_API_URL || "http://localhost:8000"}/queues/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue: QUEUE_NAME,
          payload: {
            jobId: job.id,
            reportType: type,
            parameters: parameters || {},
            templateUrl,
            templateId,
            callRoundId,
            templateType,
          },
        }),
      })

      if (!response.ok) {
        console.error("Failed to publish to RabbitMQ")
      }
    } catch (err) {
      console.error("RabbitMQ publish error:", err)
    }

    return NextResponse.json({ success: true, data: job })
  } catch (error) {
    console.error("Create report job error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const userId = getActorUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where = {
      deanId: userId,
      ...(status ? { status: status as "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" } : {}),
    }

    const [jobs, total] = await Promise.all([
      prisma.reportJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.reportJob.count({ where }),
    ])

    return NextResponse.json({ success: true, data: jobs, total })
  } catch (error) {
    console.error("List report jobs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
