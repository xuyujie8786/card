import React, { useEffect } from 'react';
import { history, useModel } from '@umijs/max';
import { Spin } from 'antd';

/**
 * 首页组件 - 处理路由重定向
 */
const HomePage: React.FC = () => {
  const { initialState, loading } = useModel('@@initialState');

  useEffect(() => {
    // 等待初始状态加载完成
    if (!loading) {
      if (initialState?.currentUser) {
        // 用户已登录，重定向到仪表盘
        history.replace('/dashboard');
      } else {
        // 用户未登录，重定向到登录页
        history.replace('/user/login');
      }
    }
  }, [loading, initialState]);

  // 显示加载状态
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#1890ff' }}>
          虚拟卡管理系统
        </h1>
        <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
          安全、高效的虚拟卡管理平台
        </p>
      </div>
      <Spin size="large" tip="正在加载..." />
    </div>
  );
};

export default HomePage;


