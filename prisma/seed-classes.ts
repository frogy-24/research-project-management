import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

import prisma from '../lib/prisma';

// Rule: 3-digit prefix of class code → major code trong DB
const PREFIX_TO_MAJOR_CODE: Record<string, string> = {
  '124': 'AI_IT',  // Khoa học máy tính
  '125': 'SE_IT',  // Kỹ thuật phần mềm
  '101': 'DE_IT',  // Đồ hoạ đa phương tiện
};

const MAJOR_NAMES: Record<string, string> = {
  AI_IT: 'Khoa học máy tính',
  SE_IT: 'Kỹ thuật phần mềm',
  DE_IT: 'Đồ hoạ đa phương tiện',
};

// Raw danh sách class code từ yêu cầu (có thể trùng + có mã không hợp lệ)
const RAW_CLASS_CODES: string[] = [
  '124221', '124221', '124221', '124221', '124221', '124221', '124221',
  '124231', '124231', '124231', '124231', '124231', '124231', '124231', '124231', '124231',
  '12522W.2', '12522W.2',
  '124221', '12422TN',
  '12523W.4', '12523W.4', '12523W.4', '12523W.4',
  '12523W.1', '12523W.1', '12523W.1', '12523W.1', '12523W.1', '12523W.1',
  '12523W.2', '12523W.2', '12523W.2',
  '10122G.1',
  '10922M.1', // SKIP – prefix 109
  '10122G.1', '10122G.1', '10122G.1',
  '10122G.3',
  '10123G.1', '10123G.1',
  '10124G.2',
  '12523W.2',
  '12523W.1',
  '124231',
  '124231', '124231', '124231', '124231',
  '124221',
  '12523W.3', '12523W.3', '12523W.3', '12523W.3',
  '107241.3', // SKIP – prefix 107
  '12423TN', '12423TN', '12423TN', '12423TN', '12423TN', '12423TN',
  '12423TN', '12423TN',
  '12522W4', '12522W2', '12522T.1',
  '12522W4.CN', '12522W4.CN',
  '12523W1',
  '12522W1.KS',
  '12522W2.KS',
];

function normalize(code: string): string {
  return code.trim();
}

function pickPrefix(code: string): string | null {
  // Lấy 3 ký tự đầu (chữ hoặc số). Nếu không khớp rule → null.
  const prefix = code.slice(0, 3);
  return Object.prototype.hasOwnProperty.call(PREFIX_TO_MAJOR_CODE, prefix) ? prefix : null;
}

async function main() {
  console.log('🌱 Seeding Classes theo rule prefix → major...\n');

  // 1. Làm sạch: dedupe + loại bỏ mã không hợp lệ
  const seen = new Set<string>();
  const validUniqueCodes: string[] = [];
  let droppedInvalid = 0;
  let droppedDup = 0;

  for (const raw of RAW_CLASS_CODES) {
    const code = normalize(raw);
    if (!code) continue;
    if (!pickPrefix(code)) {
      droppedInvalid++;
      continue;
    }
    if (seen.has(code)) {
      droppedDup++;
      continue;
    }
    seen.add(code);
    validUniqueCodes.push(code);
  }

  console.log(`📥 Tổng đầu vào: ${RAW_CLASS_CODES.length}`);
  console.log(`   • Bỏ trùng:    ${droppedDup}`);
  console.log(`   • Bỏ sai mã:  ${droppedInvalid}`);
  console.log(`   • Hợp lệ:     ${validUniqueCodes.length}\n`);

  // 2. Tìm department IT
  const itDept = await prisma.department.findUnique({ where: { code: 'IT' } });
  if (!itDept) {
    throw new Error('Department IT chưa tồn tại. Chạy seed-org trước.');
  }

  // 3. Upsert majors theo rule
  const majorByCode: Record<string, { id: string; code: string }> = {};
  for (const [prefix, majorCode] of Object.entries(PREFIX_TO_MAJOR_CODE)) {
    const major = await prisma.major.upsert({
      where: { code: majorCode },
      update: { name: MAJOR_NAMES[majorCode], departmentId: itDept.id },
      create: { code: majorCode, name: MAJOR_NAMES[majorCode], departmentId: itDept.id },
    });
    majorByCode[majorCode] = { id: major.id, code: major.code };
    console.log(`✅ Major [${prefix} → ${majorCode}] ${major.name}`);
  }

  // 4. Upsert classes (idempotent)
  let created = 0;
  let existed = 0;
  let updated = 0;
  for (const classCode of validUniqueCodes) {
    const prefix = pickPrefix(classCode)!;
    const majorCode = PREFIX_TO_MAJOR_CODE[prefix];
    const majorId = majorByCode[majorCode].id;

    const existing = await prisma.class.findUnique({ where: { code: classCode } });
    if (existing) {
      if (existing.majorId !== majorId) {
        await prisma.class.update({ where: { id: existing.id }, data: { majorId } });
        console.log(`   ↻ ${classCode} → cập nhật major → [${majorCode}]`);
        updated++;
      } else {
        console.log(`   ⏭  ${classCode} đã tồn tại`);
      }
      existed++;
    } else {
      await prisma.class.create({
        data: {
          code: classCode,
          name: `Lớp ${classCode}`,
          majorId,
        },
      });
      console.log(`   ✚ ${classCode} tạo mới → [${majorCode}]`);
      created++;
    }
  }

  console.log(`\n📊 Kết quả:`);
  console.log(`   • Hợp lệ (sau dedupe): ${validUniqueCodes.length}`);
  console.log(`   • Tạo mới:             ${created}`);
  console.log(`   • Đã tồn tại:          ${existed}`);
  console.log(`   • Cập nhật major:      ${updated}`);
  console.log('\n🎉 Seed classes hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
