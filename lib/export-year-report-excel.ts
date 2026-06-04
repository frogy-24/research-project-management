// lib/export-year-report-excel.ts
"use client"

import ExcelJS from "exceljs"
import { yearReportApi, type YearRegistration, type YearDisbursement } from "@/api/year-reports"

const formatVND = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v || 0)

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("vi-VN")
}

function applyThinBorder(cell: ExcelJS.Cell, color: string = "FFCBD5E1") {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  }
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }
    cell.alignment = { vertical: "middle", horizontal: "center" }
    applyThinBorder(cell, "FF1E3A8A")
  })
  row.height = 28
}

function styleDataRow(row: ExcelJS.Row, isAlt: boolean) {
  row.eachCell((cell) => {
    cell.font = { size: 10 }
    cell.alignment = { vertical: "middle" }
    applyThinBorder(cell)
    if (isAlt) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
    }
  })
  row.height = 22
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function buildRegistrationsBuffer(years: number[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "URMS - Dean Reports"
  wb.created = new Date()

  const ws = wb.addWorksheet("Đăng ký đề tài", {
    views: [{ state: "frozen", ySplit: 4 }],
  })

  const lastCol = 7

  // Title
  ws.mergeCells(1, 1, 1, lastCol)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = "BÁO CÁO ĐĂNG KÝ ĐỀ TÀI THEO NĂM"
  titleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" } }
  titleCell.alignment = { vertical: "middle", horizontal: "center" }
  ws.getRow(1).height = 30

  // Subtitle
  ws.mergeCells(2, 1, 2, lastCol)
  const subCell = ws.getCell(2, 1)
  subCell.value = `Năm: ${[...years].sort((a, b) => b - a).join(", ")}    |    Ngày xuất: ${new Date().toLocaleString("vi-VN")}`
  subCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } }
  subCell.alignment = { vertical: "middle", horizontal: "center" }
  ws.getRow(2).height = 20

  // Spacer
  ws.getRow(3).height = 8

  // Header
  const headers = ["STT", "Năm", "Tên đề tài", "Chủ nhiệm", "Trạng thái", "Kết quả", "Kinh phí (VNĐ)"]
  const headerRow = ws.getRow(4)
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h
  })
  styleHeaderRow(headerRow)

  // Column widths
  ws.getColumn(1).width = 6
  ws.getColumn(2).width = 8
  ws.getColumn(3).width = 50
  ws.getColumn(4).width = 25
  ws.getColumn(5).width = 20
  ws.getColumn(6).width = 20
  ws.getColumn(7).width = 20

  // Data
  const allRegs: (YearRegistration & { year: number })[] = []
  for (const y of years) {
    try {
      const detail = await yearReportApi.getYearDetail(y)
      for (const r of detail.registrations || []) {
        allRegs.push({ ...r, year: r.year ?? y })
      }
    } catch {
      // skip year on error
    }
  }

  allRegs.sort((a, b) => b.year - a.year)

  allRegs.forEach((r, idx) => {
    const row = ws.getRow(5 + idx)
    row.getCell(1).value = idx + 1
    row.getCell(2).value = r.year
    row.getCell(3).value = r.title || "—"
    row.getCell(4).value = r.ownerName || "—"
    row.getCell(5).value = r.status || "—"
    row.getCell(6).value = r.result || "—"
    if (r.budget) row.getCell(7).value = Number(r.budget)

    styleDataRow(row, idx % 2 === 1)
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" }
    row.getCell(2).alignment = { vertical: "middle", horizontal: "center" }
    row.getCell(5).alignment = { vertical: "middle", horizontal: "center" }
    row.getCell(6).alignment = { vertical: "middle", horizontal: "center" }
    row.getCell(7).alignment = { vertical: "middle", horizontal: "right" }
    row.getCell(7).numFmt = "#,##0"
  })

  // Total row
  const totalRowIdx = 5 + allRegs.length + 1
  ws.mergeCells(totalRowIdx, 1, totalRowIdx, 6)
  const totalLabel = ws.getCell(totalRowIdx, 1)
  totalLabel.value = "TỔNG CỘNG"
  totalLabel.font = { bold: true, size: 10, color: { argb: "FF1E293B" } }
  totalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } }
  totalLabel.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  applyThinBorder(totalLabel, "FF93C5FD")

  const sumBudget = allRegs.reduce((s, r) => s + (r.budget || 0), 0)
  const sumCell = ws.getCell(totalRowIdx, 7)
  sumCell.value = sumBudget
  sumCell.numFmt = "#,##0"
  sumCell.font = { bold: true, size: 10, color: { argb: "FF1D4ED8" } }
  sumCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } }
  sumCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 }
  applyThinBorder(sumCell, "FF93C5FD")
  ws.getRow(totalRowIdx).height = 26

  return wb.xlsx.writeBuffer()
}

async function buildDisbursementsBuffer(years: number[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "URMS - Dean Reports"
  wb.created = new Date()

  const ws = wb.addWorksheet("Giải ngân", {
    views: [{ state: "frozen", ySplit: 4 }],
  })

  const lastCol = 7

  // Title
  ws.mergeCells(1, 1, 1, lastCol)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = "BÁO CÁO GIẢI NGÂN THEO NĂM"
  titleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" } }
  titleCell.alignment = { vertical: "middle", horizontal: "center" }
  ws.getRow(1).height = 30

  // Subtitle
  ws.mergeCells(2, 1, 2, lastCol)
  const subCell = ws.getCell(2, 1)
  subCell.value = `Năm: ${[...years].sort((a, b) => b - a).join(", ")}    |    Ngày xuất: ${new Date().toLocaleString("vi-VN")}`
  subCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } }
  subCell.alignment = { vertical: "middle", horizontal: "center" }
  ws.getRow(2).height = 20

  ws.getRow(3).height = 8

  // Header
  const headers = ["STT", "Năm", "Tên đề tài", "Đợt", "Số tiền (VNĐ)", "Trạng thái", "Ngày giải ngân"]
  const headerRow = ws.getRow(4)
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h
  })
  styleHeaderRow(headerRow)

  ws.getColumn(1).width = 6
  ws.getColumn(2).width = 8
  ws.getColumn(3).width = 50
  ws.getColumn(4).width = 25
  ws.getColumn(5).width = 20
  ws.getColumn(6).width = 18
  ws.getColumn(7).width = 18

  const allDisb: (YearDisbursement & { year: number })[] = []
  for (const y of years) {
    try {
      const detail = await yearReportApi.getYearDetail(y)
      for (const d of detail.disbursements || []) {
        allDisb.push({ ...d, year: d.year ?? y })
      }
    } catch {
      // skip year on error
    }
  }

  allDisb.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime()
    return 0
  })

  allDisb.forEach((d, idx) => {
    const row = ws.getRow(5 + idx)
    row.getCell(1).value = idx + 1
    row.getCell(2).value = d.year
    row.getCell(3).value = d.projectTitle || "—"
    row.getCell(4).value = d.callRoundName || "—"
    if (d.amount) row.getCell(5).value = Number(d.amount)
    row.getCell(6).value = d.status || "—"
    if (d.date) row.getCell(7).value = new Date(d.date)

    styleDataRow(row, idx % 2 === 1)
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" }
    row.getCell(2).alignment = { vertical: "middle", horizontal: "center" }
    row.getCell(5).alignment = { vertical: "middle", horizontal: "right" }
    row.getCell(5).numFmt = "#,##0"
    row.getCell(6).alignment = { vertical: "middle", horizontal: "center" }
    row.getCell(7).alignment = { vertical: "middle", horizontal: "center" }
    row.getCell(7).numFmt = "dd/mm/yyyy"
  })

  // Total row
  const totalRowIdx = 5 + allDisb.length + 1
  ws.mergeCells(totalRowIdx, 1, totalRowIdx, 4)
  const totalLabel = ws.getCell(totalRowIdx, 1)
  totalLabel.value = "TỔNG CỘNG"
  totalLabel.font = { bold: true, size: 10, color: { argb: "FF1E293B" } }
  totalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } }
  totalLabel.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  applyThinBorder(totalLabel, "FF93C5FD")

  const sumAmount = allDisb.reduce((s, d) => s + (d.amount || 0), 0)
  const sumCell = ws.getCell(totalRowIdx, 5)
  sumCell.value = sumAmount
  sumCell.numFmt = "#,##0"
  sumCell.font = { bold: true, size: 10, color: { argb: "FF1D4ED8" } }
  sumCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } }
  sumCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 }
  applyThinBorder(sumCell, "FF93C5FD")

  const countCell = ws.getCell(totalRowIdx, 6)
  countCell.value = `${allDisb.length} lượt`
  countCell.font = { bold: true, size: 10, color: { argb: "FF1E293B" } }
  countCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } }
  countCell.alignment = { vertical: "middle", horizontal: "center" }
  applyThinBorder(countCell, "FF93C5FD")

  const totalTextCell = ws.getCell(totalRowIdx, 7)
  totalTextCell.value = formatVND(sumAmount)
  totalTextCell.font = { bold: true, size: 10, color: { argb: "FF1D4ED8" } }
  totalTextCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } }
  totalTextCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 }
  applyThinBorder(totalTextCell, "FF93C5FD")
  ws.getRow(totalRowIdx).height = 26

  return wb.xlsx.writeBuffer()
}

export async function exportYearRegistrationsToExcel(years: number[]) {
  const buffer = await buildRegistrationsBuffer(years)
  const fname = `BaoCao_DangKyDeTai_${[...years].sort((a, b) => b - a).join("-")}.xlsx`
  downloadBuffer(buffer, fname)
}

export async function exportYearDisbursementsToExcel(years: number[]) {
  const buffer = await buildDisbursementsBuffer(years)
  const fname = `BaoCao_GiaiNgan_${[...years].sort((a, b) => b - a).join("-")}.xlsx`
  downloadBuffer(buffer, fname)
}
