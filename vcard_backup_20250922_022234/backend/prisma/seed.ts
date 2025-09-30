import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 创建超级管理员账户
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'admin@vcard.com',
      passwordHash: hashedPassword,
      name: '超级管理员',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      balance: 1000000.00,
      creditLimit: 500000.00,
      currency: 'USD',
    },
  });

  console.log('Created super admin:', superAdmin);

  // 创建测试管理员账户
  const testAdminPassword = await bcrypt.hash('admin123', 12);
  
  const testAdmin = await prisma.user.upsert({
    where: { username: 'admin001' },
    update: {},
    create: {
      username: 'admin001',
      email: 'admin001@vcard.com',
      passwordHash: testAdminPassword,
      name: '管理员A',
      role: 'ADMIN',
      status: 'ACTIVE',
      balance: 50000.00,
      creditLimit: 25000.00,
      currency: 'USD',
      parentId: superAdmin.id,
    },
  });

  console.log('Created test admin:', testAdmin);

  // 创建测试用户账户
  const testUserPassword = await bcrypt.hash('user123', 12);
  
  const testUser = await prisma.user.upsert({
    where: { username: 'user001' },
    update: {},
    create: {
      username: 'user001',
      email: 'user001@vcard.com',
      passwordHash: testUserPassword,
      name: '张三',
      role: 'USER',
      status: 'ACTIVE',
      balance: 5000.00,
      creditLimit: 10000.00,
      currency: 'USD',
      parentId: testAdmin.id,
    },
  });

  console.log('Created test user:', testUser);

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
