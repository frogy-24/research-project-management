import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorUserId, getActorRole } from "@/lib/project-permissions";

const VALID_STATUSES = new Set(["PENDING", "ACCEPTED", "REJECTED"]);
const VALID_SEARCH_FIELDS = new Set(["title", "studentName", "studentEmail", "studentCode", "all"]);

export async function GET(req: Request) {
  try {
    const userId = getActorUserId(req);
    const role = getActorRole(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "LECTURER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 10)));
    const callRoundId = searchParams.get("callRoundId") || undefined;
    const instructorStatusParam = searchParams.get("instructorStatus") || "";
    const search = (searchParams.get("search") || "").trim();
    const searchFieldParam = searchParams.get("searchField") || "all";

    const instructorStatus = VALID_STATUSES.has(instructorStatusParam) ? instructorStatusParam : undefined;
    const searchField = VALID_SEARCH_FIELDS.has(searchFieldParam) ? searchFieldParam : "all";

    const whereClause: {
      instructorId: string;
      callRoundId?: string;
      instructorStatus?: "PENDING" | "ACCEPTED" | "REJECTED";
      OR?: Array<{
        title?: { contains: string; mode: "insensitive" };
        user?: {
          name?: { contains: string; mode: "insensitive" };
          email?: { contains: string; mode: "insensitive" };
          code?: { contains: string; mode: "insensitive" };
        };
      }>;
    } = {
      instructorId: userId,
    };

    if (callRoundId) {
      whereClause.callRoundId = callRoundId;
    }

    if (instructorStatus) {
      whereClause.instructorStatus = instructorStatus as "PENDING" | "ACCEPTED" | "REJECTED";
    }

    if (search) {
      const titleFilter = { title: { contains: search, mode: "insensitive" as const } };
      const studentNameFilter = { user: { name: { contains: search, mode: "insensitive" as const } } };
      const studentEmailFilter = { user: { email: { contains: search, mode: "insensitive" as const } } };
      const studentCodeFilter = { user: { code: { contains: search, mode: "insensitive" as const } } };

      if (searchField === "title") {
        whereClause.OR = [titleFilter];
      } else if (searchField === "studentName") {
        whereClause.OR = [studentNameFilter];
      } else if (searchField === "studentEmail") {
        whereClause.OR = [studentEmailFilter];
      } else if (searchField === "studentCode") {
        whereClause.OR = [studentCodeFilter];
      } else {
        whereClause.OR = [titleFilter, studentNameFilter, studentEmailFilter, studentCodeFilter];
      }
    }

    const total = await prisma.projectRegistration.count({ where: whereClause });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const registrations = await prisma.projectRegistration.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        objective: true,
        expectedOutput: true,
        proposalFiles: true,
        teamMembers: true,
        callRoundId: true,
        instructorStatus: true,
        createdAt: true,
        callRound: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            code: true,
            class: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            major: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            departmentRef: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return NextResponse.json({
      data: registrations,
      pagination: {
        total,
        page: safePage,
        limit,
        totalPages,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
