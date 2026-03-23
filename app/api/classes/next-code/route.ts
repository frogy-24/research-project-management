import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAuthUser, getDepartmentFilter } from '@/lib/auth-helpers';

export async function GET(request: Request) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Build where clause
        const whereClause: any = { code: { not: null } };

        // Apply department filter for DEAN
        const departmentFilter = getDepartmentFilter(authUser);
        if (departmentFilter) {
            whereClause.major = {
                departmentId: departmentFilter,
            };
        }

        // Get the last class with a code
        const lastClass = await prisma.class.findFirst({
            where: whereClause,
            orderBy: { code: 'desc' },
            select: { code: true },
        });

        // Generate next code
        let nextCode: string;
        const prefix = 'LOP';

        if (!lastClass || !lastClass.code) {
            nextCode = `${prefix}001`;
        } else {
            // Extract number from code (e.g., LOP011 -> 11)
            const match = lastClass.code.match(/\d+$/);
            if (match) {
                const lastNumber = parseInt(match[0], 10);
                const nextNumber = lastNumber + 1;
                nextCode = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
            } else {
                nextCode = `${prefix}001`;
            }
        }

        return NextResponse.json({ code: nextCode });
    } catch (error) {
        console.error('Error generating next class code:', error);
        return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }
}
