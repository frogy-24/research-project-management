import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getObjectFromR2 } from '@/lib/r2';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';

const allowedRoles = new Set(['ADMIN', 'DEAN', 'DISBURSER']);

const contentTypeByExtension: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  zip: 'application/zip',
};

function extractObjectKey(fileUrl: string) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error('Missing R2_BUCKET environment variable');
  }

  const url = new URL(fileUrl);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (pathParts[0] === bucket) {
    return pathParts.slice(1).join('/');
  }

  return pathParts.join('/');
}

function getFileName(key: string) {
  const rawName = key.split('/').pop() || 'payment-voucher';
  return decodeURIComponent(rawName).replace(/^\d+-/, '');
}

function getContentType(fileName: string, fallback?: string) {
  if (fallback && fallback !== 'application/octet-stream') {
    return fallback;
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return contentTypeByExtension[extension] ?? fallback ?? 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (!actorRole || !actorUserId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!allowedRoles.has(actorRole)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const disbursement = await prisma.fundingDisbursement.findUnique({
      where: { id },
      select: {
        paymentVoucherUrl: true,
        project: {
          select: {
            callRound: {
              select: {
                createdById: true,
              },
            },
          },
        },
      },
    });

    if (!disbursement?.paymentVoucherUrl) {
      return NextResponse.json(
        { success: false, message: 'Payment voucher not found' },
        { status: 404 }
      );
    }

    if (actorRole === 'DEAN' && disbursement.project.callRound?.createdById !== actorUserId) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const key = extractObjectKey(disbursement.paymentVoucherUrl);
    const object = await getObjectFromR2(key);
    const body = object.Body;

    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Payment voucher file is empty' },
        { status: 404 }
      );
    }

    const bytes = await body.transformToByteArray();
    const fileName = getFileName(key);
    const contentType = getContentType(fileName, object.ContentType);
    const responseBody = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(responseBody).set(bytes);

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `inline; filename="${fileName.replace(/"/g, '')}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading payment voucher:', error);
    return NextResponse.json(
      { success: false, message: 'Error downloading payment voucher' },
      { status: 500 }
    );
  }
}
