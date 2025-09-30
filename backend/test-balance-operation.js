const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 测试用户充值和提现功能
async function testBalanceOperations() {
  try {
    console.log('🧪 开始测试用户充值和提现功能...');
    
    // 首先登录获取token
    console.log('\n1. 登录获取token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: '123456'
    });
    
    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user.id;
    console.log(`✅ 登录成功，用户ID: ${userId}`);
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 测试充值
    console.log('\n2. 测试用户充值...');
    const rechargeData = {
      userId: userId,
      type: 'deposit',
      amount: 100,
      remark: '测试充值'
    };
    
    const rechargeResponse = await axios.post(`${BASE_URL}/users/balance-operation`, rechargeData, { headers });
    console.log('✅ 充值成功:', rechargeResponse.data);
    
    // 测试提现
    console.log('\n3. 测试用户提现...');
    const withdrawData = {
      userId: userId,
      type: 'withdraw',
      amount: 50,
      remark: '测试提现'
    };
    
    const withdrawResponse = await axios.post(`${BASE_URL}/users/balance-operation`, withdrawData, { headers });
    console.log('✅ 提现成功:', withdrawResponse.data);
    
    console.log('\n🎉 所有测试通过！充值和提现功能正常工作。');
    
  } catch (error) {
    console.error('❌ 测试失败:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testBalanceOperations();
