/**
 * 公告展示页面（用户查看公告）
 */
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Tag, 
  Typography, 
  Space, 
  Modal,
  Empty,
  Spin,
  message
} from 'antd';
import { 
  NotificationOutlined, 
  BellOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { formatBeijingTime } from '@/utils/time';
import { getAnnouncements } from '@/services/announcement';
import type { AnnouncementItem } from '@/types/announcement';
import { 
  AnnouncementType,
  AnnouncementStatus,
  AnnouncementTypeText 
} from '@/types/announcement';

const { Title, Paragraph, Text } = Typography;

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 获取公告列表
  const fetchAnnouncements = async (params?: { current?: number }) => {
    try {
      setLoading(true);
      const response = await getAnnouncements({
        current: params?.current || 1,
        pageSize: pagination.pageSize,
        status: AnnouncementStatus.ACTIVE, // 只显示已发布的公告
      });

      if (response.success) {
        setAnnouncements(response.data || []);
        setPagination({
          current: response.current,
          pageSize: response.pageSize,
          total: response.total,
        });
      }
    } catch (error) {
      message.error('获取公告列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // 查看公告详情
  const handleViewDetail = (item: AnnouncementItem) => {
    setSelectedAnnouncement(item);
    setDetailVisible(true);
  };

  // 分页变化
  const handlePageChange = (page: number) => {
    fetchAnnouncements({ current: page });
  };

  const getTypeIcon = (type: AnnouncementType) => {
    return type === AnnouncementType.URGENT ? (
      <BellOutlined style={{ color: '#ff4d4f' }} />
    ) : (
      <NotificationOutlined style={{ color: '#1890ff' }} />
    );
  };

  const getTypeColor = (type: AnnouncementType) => {
    return type === AnnouncementType.URGENT ? 'red' : 'blue';
  };

  return (
    <PageContainer
      header={{
        title: '系统公告',
        subTitle: '查看最新的系统公告和重要通知',
      }}
    >
      <Card>
        <Spin spinning={loading}>
          {announcements.length > 0 ? (
            <List
              itemLayout="vertical"
              dataSource={announcements}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: handlePageChange,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  actions={[
                    <Space key="view" onClick={() => handleViewDetail(item)}>
                      <EyeOutlined />
                      <Text type="secondary">查看详情</Text>
                    </Space>
                  ]}
                  style={{
                    cursor: 'pointer',
                    padding: '16px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    backgroundColor: item.type === AnnouncementType.URGENT ? '#fff2f0' : '#fff',
                  }}
                  onClick={() => handleViewDetail(item)}
                >
                  <List.Item.Meta
                    avatar={getTypeIcon(item.type)}
                    title={
                      <Space>
                        <span 
                          style={{ 
                            fontWeight: item.type === AnnouncementType.URGENT ? 'bold' : 'normal',
                            fontSize: '16px'
                          }}
                        >
                          {item.title}
                        </span>
                        <Tag color={getTypeColor(item.type)}>
                          {AnnouncementTypeText[item.type]}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <Text type="secondary">
                          发布时间: {formatBeijingTime(item.publishedAt || item.createdAt)}
                        </Text>
                        <Paragraph 
                          ellipsis={{ rows: 2, expandable: false }} 
                          style={{ margin: 0, marginTop: 8 }}
                        >
                          {item.content}
                        </Paragraph>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无公告"
            />
          )}
        </Spin>
      </Card>

      {/* 公告详情弹窗 */}
      <Modal
        title={
          <Space>
            {selectedAnnouncement && getTypeIcon(selectedAnnouncement.type)}
            <span>公告详情</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedAnnouncement(null);
        }}
        footer={null}
        width={800}
      >
        {selectedAnnouncement && (
          <div style={{ padding: '16px 0' }}>
            <Title 
              level={3} 
              style={{ 
                marginBottom: 16,
                fontWeight: selectedAnnouncement.type === AnnouncementType.URGENT ? 'bold' : 'normal'
              }}
            >
              {selectedAnnouncement.title}
            </Title>

            <Space style={{ marginBottom: 16 }}>
              <Tag color={getTypeColor(selectedAnnouncement.type)}>
                {AnnouncementTypeText[selectedAnnouncement.type]}
              </Tag>
              <Text type="secondary">
                发布时间: {formatBeijingTime(selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt)}
              </Text>
            </Space>

            <div 
              style={{
                backgroundColor: '#fafafa',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #d9d9d9',
              }}
            >
              <Paragraph 
                style={{ 
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: '1.6'
                }}
              >
                {selectedAnnouncement.content}
              </Paragraph>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default AnnouncementsPage;
