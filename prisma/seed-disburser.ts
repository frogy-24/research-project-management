import prisma from '../lib/prisma';
import { Role } from './generated/prisma';

async function main() {
    const email = 'disburser@university.edu';

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name: 'Cán bộ giải ngân',
            role: Role.DISBURSER,
            code: 'DISB001',
            password: '123456',
        },
        create: {
            email,
            name: 'Cán bộ giải ngân',
            role: Role.DISBURSER,
            code: 'DISB001',
            password: '123456',
        },
    });

    console.log('Seeded DISBURSER account:');
    console.log({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        code: user.code,
    });
}

main()
    .catch((error) => {
        console.error('Failed to seed DISBURSER account:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
