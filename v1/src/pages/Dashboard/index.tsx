import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Typography, App, List, Avatar, Space, Alert } from 'antd';
import { 
  DollarOutlined, 
  NotificationOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { PageContainer, StatisticCard } from '@ant-design/pro-components';
import { Column } from '@ant-design/plots';
import { useModel } from '@umijs/max';
import dayjs from 'dayjs';
import { getDashboardData, getConsumptionTrend } from '@/services/dashboard';
import { getAnnouncements } from '@/services/announcement';
import type { AnnouncementItem } from '@/types/announcement';
import { AnnouncementStatus } from '@/types/announcement';

const { Title, Text } = Typography;

interface DashboardData {
  totalRecharge: number;
  totalConsumption: number;
  cardLocked: number;
  availableAmount: number;
}

interface ConsumptionTrendItem {
  date: string;
  consumption: number;
}

const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [consumptionTrend, setConsumptionTrend] = useState<ConsumptionTrendItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [announcementLoading, setAnnouncementLoading] = useState(true);

  // 获取仪表盘数据
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await getDashboardData();
      if (response.success) {
        setDashboardData(response.data);
      } else {
        message.error('获取仪表盘数据失败');
      }
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      message.error('获取仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取消费趋势数据
  const fetchConsumptionTrend = async () => {
    try {
      setTrendLoading(true);
      const response = await getConsumptionTrend(7);
      if (response.success) {
        // 格式化数据用于图表显示
        const formattedData = response.data.map((item: any) => {
          // 使用原生JavaScript进行日期格式化，避免dayjs依赖问题
          const date = new Date(item.date);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return {
            date: `${month}-${day}`,
            consumption: item.consumption
          };
        });
        console.log('🔍 格式化后的消费趋势数据:', formattedData);
        setConsumptionTrend(formattedData);
      } else {
        message.error('获取消费趋势失败');
      }
    } catch (error) {
      console.error('获取消费趋势失败:', error);
      message.error('获取消费趋势失败');
    } finally {
      setTrendLoading(false);
    }
  };

  // 获取公告数据
  const fetchAnnouncements = async () => {
    try {
      setAnnouncementLoading(true);
      const response = await getAnnouncements({ 
        current: 1, 
        pageSize: 5,
        status: AnnouncementStatus.ACTIVE
      });
      if (response.success) {
        setAnnouncements(response.data);
      } else {
        message.error('获取公告失败');
      }
    } catch (error) {
      console.error('获取公告失败:', error);
      message.error('获取公告失败');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchConsumptionTrend();
    fetchAnnouncements();
  }, []);

  // 柱状图配置
  
  const chartConfig = {
    data: consumptionTrend,
    xField: 'date',
    yField: 'consumption',
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    color: '#1890ff',
    meta: {
      consumption: {
        alias: '消费金额 (USD)',
      },
      date: {
        alias: '日期',
      },
    },
    label: {
      position: 'top' as const,
      style: {
        fill: '#FFFFFF', // 修改为白色
        fontSize: 12,
      },
      formatter: (datum: any) => {
        // 在@ant-design/plots中，formatter接收到的是数值，不是对象
        const value = typeof datum === 'number' ? datum.toFixed(2) : '0.00';
        return `$${value}`;
      },
    },
    tooltip: false,
  };

  if (loading || !dashboardData) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 欢迎标语 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              size={48} 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'user'}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`}
              style={{ marginRight: 16 }}
            />
            <div>
              <Title level={3} style={{ margin: 0, color: '#262626' }}>
                👋 欢迎回来，{currentUser?.username || '用户'}
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                <CalendarOutlined style={{ marginRight: 8 }} />
                今日 {dayjs().format('YYYY-MM-DD')} | 账户状态：
                <Text style={{ color: '#52c41a', marginLeft: 4 }}>正常</Text>
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* 核心数据统计 */}
      <StatisticCard.Group>
        <StatisticCard
          statistic={{
            title: '总充值',
            value: dashboardData.totalRecharge,
            precision: 2,
            suffix: 'USD',
            valueStyle: { color: '#52c41a' }
          }}
        />
        <StatisticCard
          statistic={{
            title: '总消费',
            value: dashboardData.totalConsumption,
            precision: 2,
            suffix: 'USD',
            valueStyle: { color: '#f5222d' }
          }}
        />
        <StatisticCard
          statistic={{
            title: '卡内锁定',
            value: dashboardData.cardLocked,
            precision: 2,
            suffix: 'USD',
            valueStyle: { color: '#faad14' }
          }}
        />
        <StatisticCard
          statistic={{
            title: '可用余额',
            value: dashboardData.availableAmount,
            precision: 2,
            suffix: 'USD',
            valueStyle: { 
              color: dashboardData.availableAmount >= 0 ? '#52c41a' : '#f5222d'
            }
          }}
        />
      </StatisticCard.Group>

      {/* 图表和公告 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 7天消费趋势 */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <Space>
                <DollarOutlined style={{ color: '#1890ff' }} />
                近7天消费趋势
              </Space>
            }
            loading={trendLoading}
          >
            {consumptionTrend.length > 0 ? (
              <div style={{ height: 300 }}>
                <Column {...chartConfig} />
              </div>
            ) : (
              <div style={{ 
                height: 300, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#999'
              }}>
                暂无消费数据
              </div>
            )}
          </Card>
        </Col>

        {/* 系统公告 */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <NotificationOutlined style={{ color: '#52c41a' }} />
                系统公告
              </Space>
            }
            loading={announcementLoading}
          >
            {announcements.length > 0 ? (
              <List
                size="small"
                dataSource={announcements}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small" 
                          style={{ 
                            backgroundColor: item.priority === 'HIGH' ? '#f5222d' : 
                                            item.priority === 'MEDIUM' ? '#faad14' : '#52c41a'
                          }}
                        >
                          {item.priority === 'HIGH' ? '!' : 
                           item.priority === 'MEDIUM' ? '⚠' : 'ℹ'}
                        </Avatar>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text ellipsis style={{ maxWidth: '70%' }}>
                            {item.title}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.createdAt).format('MM-DD')}
                          </Text>
                        </div>
                      }
                      description={
                        <div 
                          style={{ 
                            fontSize: 12, 
                            color: 'rgba(0, 0, 0, 0.45)',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {item.content}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0',
                color: '#999'
              }}>
                <NotificationOutlined style={{ fontSize: 32, marginBottom: 16 }} />
                <div>暂无公告</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Dashboard;