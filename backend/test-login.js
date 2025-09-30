const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testLogin() {
  const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'admin', password: 'password' },
    { username: 'superadmin', password: 'admin123' },
    { username: 'admin001', password: 'admin123' }
  ];
  
  for (const user of users) {
    try {
      console.log(`🔐 测试登录: ${user.username} / ${user.password}`);
      const response = await axios.post(`${BASE_URL}/auth/login`, user);
      console.log(`✅ 登录成功! 用户ID: ${response.data.data.user.id}, 角色: ${response.data.data.user.role}`);
      return { user: response.data.data.user, token: response.data.data.token };
    } catch (error) {
      console.log(`❌ 登录失败: ${error.response?.data?.message || error.message}`);
    }
  }
  
  throw new Error('所有登录尝试都失败了');
}

testLogin().catch(console.error);


