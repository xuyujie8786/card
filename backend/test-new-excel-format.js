const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNewExcelFormat() {
  try {
    console.log('=== 测试新的Excel格式（分离卡号和卡ID）===\n');

    // 获取测试数据
    const transactions = await prisma.cardTransaction.findMany({
      take: 3,
      orderBy: { txnTime: 'desc' },
      include: {
        virtualCard: {
          select: {
            cardId: true,
            cardNo: true,
            user: {
              select: {
                id: true,
                username: true,
                status: true
              }
            }
          }
        }
      }
    });

    console.log(`找到 ${transactions.length} 条交易记录\n`);

    // 模拟新的Excel数据格式
    const excelData = transactions.map((txn, index) => ({
      '序号': index + 1,
      '交易ID': txn.txnId,
      '卡号': txn.virtualCard?.cardNo || txn.cardNo || '',
      '卡ID': txn.cardId,
      '用户名': txn.virtualCard?.user?.username || txn.username || '',
      '交易类型': txn.txnType,
      '交易状态': txn.txnStatus === '1' ? '成功' : '失败',
      '交易金额': txn.finalAmt ? Number(txn.finalAmt).toFixed(2) : '0.00',
      '交易币种': txn.finalCcy || '',
      '商户名称': txn.merchantName || '',
      '商户国家': txn.merchantCountry || '',
      '授权码': txn.authCode || '',
      '交易时间': txn.txnTime ? new Date(txn.txnTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '',
      '失败原因': txn.declineReason || '',
      '创建时间': txn.createdAt ? new Date(txn.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
    }));

    console.log('新的Excel格式预览:\n');
    
    // 显示表头
    const headers = Object.keys(excelData[0] || {});
    console.log('表头:', headers.join(' | '));
    console.log('=' .repeat(100));
    
    // 显示前3行数据
    excelData.forEach((row, index) => {
      console.log(`\n--- 记录 ${index + 1} ---`);
      console.log('序号:', row['序号']);
      console.log('交易ID:', row['交易ID']);
      console.log('🔸 卡号:', row['卡号']);
      console.log('🔸 卡ID:', row['卡ID']);
      console.log('用户名:', row['用户名']);
      console.log('交易类型:', row['交易类型']);
      console.log('交易金额:', row['交易金额']);
    });

    console.log('\n=== 数据验证 ===');
    excelData.forEach((row, index) => {
      const cardNo = row['卡号'];
      const cardId = row['卡ID'];
      
      console.log(`记录 ${index + 1}:`);
      console.log(`  卡号: ${cardNo} ${cardNo ? '✅' : '❌ 缺失'}`);
      console.log(`  卡ID: ${cardId} ${cardId ? '✅' : '❌ 缺失'}`);
      console.log(`  分离正确: ${cardNo !== cardId ? '✅' : '❌ 相同'}`);
    });

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewExcelFormat();


