// lib/export-disbursement-excel.ts
import ExcelJS from 'exceljs';
import type { FundingDisbursementWithRelations } from '@/types/disbursement.schema';

const formatCurrency = (value: unknown) => Number(value ?? 0);
const formatDate = (value?: Date | string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN');
};

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    PAID: 'Đã thanh toán',
    REJECTED: 'Từ chối',
  };
  return statusMap[status] || status;
};

export async function exportDisbursementsToExcel(
  disbursements: FundingDisbursementWithRelations[],
  callRoundName?: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Danh sách giải ngân', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
    },
  });

  // Set column widths
  worksheet.columns = [
    { key: 'stt', width: 6 },
    { key: 'projectCode', width: 15 },
    { key: 'projectTitle', width: 40 },
    { key: 'callRound', width: 20 },
    { key: 'amount', width: 18 },
    { key: 'disbursedAt', width: 15 },
    { key: 'status', width: 15 },
    { key: 'voucherNo', width: 15 },
    { key: 'createdBy', width: 20 },
    { key: 'approvedBy', width: 20 },
    { key: 'paidBy', width: 20 },
    { key: 'reason', width: 30 },
  ];

  // Title row
  const titleRow = worksheet.addRow([
    'DANH SÁCH GIẢI NGÂN ĐỀ TÀI NGHIÊN CỨU KHOA HỌC',
  ]);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FF1F4788' } };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 30;
  worksheet.mergeCells('A1:L1');

  // Subtitle with call round info
  if (callRoundName) {
    const subtitleRow = worksheet.addRow([`Đợt đăng ký: ${callRoundName}`]);
    subtitleRow.font = { size: 12, italic: true };
    subtitleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A2:L2');
  }

  // Export date
  const dateRow = worksheet.addRow([
    `Ngày xuất: ${new Date().toLocaleString('vi-VN')}`,
  ]);
  dateRow.font = { size: 10, italic: true };
  dateRow.alignment = { horizontal: 'right' };
  worksheet.mergeCells(`A${dateRow.number}:L${dateRow.number}`);

  // Add empty row
  worksheet.addRow([]);

  // Header row
  const headerRow = worksheet.addRow([
    'STT',
    'Mã đề tài',
    'Tên đề tài',
    'Đợt đăng ký',
    'Số tiền (VNĐ)',
    'Ngày giải ngân',
    'Trạng thái',
    'Số chứng từ',
    'Người tạo',
    'Người duyệt',
    'Người thanh toán',
    'Lý do giải ngân',
  ]);

  // Style header row
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Data rows
  disbursements.forEach((item, index) => {
    const row = worksheet.addRow([
      index + 1,
      item.project?.code || 'N/A',
      item.project?.title || '—',
      item.project?.callRound?.name || '—',
      formatCurrency(item.amount),
      formatDate(item.disbursedAt),
      getStatusText(item.status),
      item.voucherNo || '—',
      item.createdBy?.name || '—',
      item.approvedBy?.name || '—',
      item.paidBy?.name || '—',
      item.reason || '—',
    ]);

    // Style data row
    row.alignment = { vertical: 'middle', wrapText: true };
    row.height = 20;

    // Apply borders
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };

      // Center align for specific columns
      if ([1, 6, 7].includes(colNumber)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Right align for amount
      if (colNumber === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }

      // Alternate row colors
      if (index % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }

      // Status color coding
      if (colNumber === 7) {
        let statusColor = 'FF6B7280'; // default gray
        if (item.status === 'APPROVED') statusColor = 'FF10B981'; // green
        if (item.status === 'PAID') statusColor = 'FF3B82F6'; // blue
        if (item.status === 'REJECTED') statusColor = 'FFEF4444'; // red
        if (item.status === 'PENDING') statusColor = 'FFF59E0B'; // amber

        cell.font = { bold: true, color: { argb: statusColor } };
      }
    });
  });

  // Summary row
  const totalAmount = disbursements.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  const summaryRow = worksheet.addRow([
    '',
    '',
    '',
    'TỔNG CỘNG:',
    totalAmount,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  summaryRow.font = { bold: true, size: 12 };
  summaryRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  summaryRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  summaryRow.getCell(5).numFmt = '#,##0';
  summaryRow.getCell(5).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' },
  };

  // Apply borders to summary row
  summaryRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'double', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
    };
  });

  // Footer
  worksheet.addRow([]);
  const footerRow = worksheet.addRow([
    'Ghi chú: Dữ liệu được xuất từ Hệ thống Quản lý Nghiên cứu Khoa học',
  ]);
  footerRow.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
  worksheet.mergeCells(`A${footerRow.number}:L${footerRow.number}`);

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export function downloadExcelFile(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
