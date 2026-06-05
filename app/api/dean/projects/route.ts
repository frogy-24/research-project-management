import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, getDepartmentFilter } from "@/lib/auth-helpers";

/**
 * GET /api/dean/projects
 *
 * Trả về tất cả đề tài (projects) mà Dean có thể tạo giải ngân.
 * - DEAN: lọc theo departmentId của khoa
 * - ADMIN: trả về tất cả
 *
 * Không giới hạn theo deanReviewerId như /api/projects, để Dean có thể
 * thấy tất cả đề tài đã nghiệm thu hoặc đã từng được tạo giải ngân trong khoa.
 */
export async function GET(_request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (authUser.role !== "DEAN" && authUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Dean/Admin can access" },
        { status: 403 }
      );
    }

    const departmentId = getDepartmentFilter(authUser);

    // Lấy đề tài trong khoa (nếu là DEAN). Admin thì lấy tất cả.
    const projects = await prisma.project.findMany({
      where: {
        ...(departmentId
          ? {
              OR: [
                { leader: { departmentId } },
                { instructor: { departmentId } },
              ],
            }
          : {}),
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            code: true,
            department: true,
            departmentId: true,
          },
        },
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            code: true,
            department: true,
            departmentId: true,
          },
        },
        callRound: {
          select: {
            id: true,
            name: true,
            createdById: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}
