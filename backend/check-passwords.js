const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkPasswords() {
  try {
    console.log('🔍 检查用户密码哈希...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        passwordHash: true
      },
      take: 5
    });
    
    for (const user of users) {
      console.log(`\n用户: ${user.username} (ID: ${user.id})`);
      console.log(`密码哈希: ${user.passwordHash ? '存在' : '不存在'}`);
      
      if (user.passwordHash) {
        // 测试常见密码
        const passwords = ['admin123', 'password', '123456', user.username];
        for (const pwd of passwords) {
          const match = await bcrypt.compare(pwd, user.passwordHash);
          if (match) {
            console.log(`✅ 密码匹配: ${pwd}`);
            break;
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswords();


