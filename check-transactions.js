const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransactions() {
  try {
    // 查找卡号为 5257970748894121 的卡片ID
    const card = await prisma.virtualCard.findFirst({
      where: { cardNo: '5257970748894121' }
    });
    
    if (!card) {
      console.log('❌ 卡片未找到');
      return;
    }
    
    console.log('🃏 找到卡片:', { cardId: card.cardId, cardNo: card.cardNo });
    
    // 查询所有交易记录
    const transactions = await prisma.cardTransaction.findMany({
      where: { cardId: card.cardId },
      orderBy: { txnTime: 'desc' },
      take: 20
    });
    
    console.log('📊 交易记录数量:', transactions.length);
    console.log('💰 交易记录详情:');
    transactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.txnId} - ${tx.merchantName} - ${tx.finalAmt} ${tx.currency} - ${tx.txnTime} - ${tx.txnStatus}`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactions();


