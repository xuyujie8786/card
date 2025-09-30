/**
 * 通知铃铛组件 - 显示紧急公告
 */
import React, { useState, useEffect } from 'react';
import { 
  Badge, 
  Dropdown, 
  List, 
  Typography, 
  Empty, 
  Spin,
  Button,
  Space,
  Modal,
  Card
} from 'antd';
import { 
  BellOutlined, 
  EyeOutlined 
} from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { getUrgentAnnouncements } from '@/services/announcement';
import { formatBeijingTime } from '@/utils/time';
import type { AnnouncementItem } from '@/types/announcement';

const { Text, Paragraph } = Typography;

const useStyles = createStyles(({ token }) => {
  return {
    bell: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      cursor: 'pointer',
      borderRadius: token.borderRadius,
      '&:hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    dropdownContent: {
      width: '380px',
      maxHeight: '400px',
      overflowY: 'auto',
      padding: '0 !important',
    },
    header: {
      padding: '12px 16px',
      borderBottom: `1px solid ${token.colorBorder}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    listItem: {
      padding: '12px 16px',
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: token.colorBgTextHover,
      },
      '&:last-child': {
        borderBottom: 'none',
      },
    },
    emptyContainer: {
      padding: '40px 16px',
      textAlign: 'center' as const,
    },
  };
});

const NotificationBell: React.FC = () => {
  const { styles } = useStyles();
  const [urgentAnnouncements, setUrgentAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // 获取紧急公告
  const fetchUrgentAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await getUrgentAnnouncements();
      if (response.success) {
        setUrgentAnnouncements(response.data || []);
      }
    } catch (error) {
      console.error('获取紧急公告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchUrgentAnnouncements();
    
    // 每5分钟刷新一次紧急公告
    const interval = setInterval(fetchUrgentAnnouncements, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 查看公告详情
  const handleViewDetail = (announcement: AnnouncementItem) => {
    setSelectedAnnouncement(announcement);
    setDetailVisible(true);
    setDropdownVisible(false);
  };

  // 下拉菜单内容
  const dropdownContent = (
    <Card 
      size="small" 
      className={styles.dropdownContent}
      style={{ 
        backgroundColor: '#fff',
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className={styles.header}>
        <Text strong>紧急公告</Text>
        <Button 
          type="text" 
          size="small" 
          onClick={fetchUrgentAnnouncements}
          loading={loading}
        >
          刷新
        </Button>
      </div>
      
      {loading ? (
        <div className={styles.emptyContainer}>
          <Spin />
        </div>
      ) : urgentAnnouncements.length > 0 ? (
        <List
          dataSource={urgentAnnouncements}
          split={false}
          renderItem={(item) => (
            <div 
              key={item.id} 
              className={styles.listItem}
              onClick={() => handleViewDetail(item)}
            >
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text strong ellipsis style={{ flex: 1, marginRight: 8 }}>
                    {item.title}
                  </Text>
                  <EyeOutlined style={{ color: '#1890ff' }} />
                </div>
                <Paragraph 
                  ellipsis={{ rows: 2, expandable: false }}
                  style={{ margin: 0, fontSize: '12px' }}
                  type="secondary"
                >
                  {item.content}
                </Paragraph>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {formatBeijingTime(item.publishedAt || item.createdAt)}
                </Text>
              </Space>
            </div>
          )}
        />
      ) : (
        <div className={styles.emptyContainer}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无紧急公告"
            style={{ margin: 0 }}
          />
        </div>
      )}
    </Card>
  );

  return (
    <>
      <Dropdown
        popupRender={() => dropdownContent}
        trigger={['click']}
        placement="bottomRight"
        open={dropdownVisible}
        onOpenChange={setDropdownVisible}
      >
        <div className={styles.bell}>
          <Badge 
            count={urgentAnnouncements.length} 
            size="small"
            offset={[0, 0]}
          >
            <BellOutlined 
              style={{ 
                fontSize: '18px',
                color: urgentAnnouncements.length > 0 ? '#ff4d4f' : 'inherit'
              }} 
            />
          </Badge>
        </div>
      </Dropdown>

      {/* 公告详情弹窗 */}
      <Modal
        title={
          <Space>
            <BellOutlined style={{ color: '#ff4d4f' }} />
            <span>紧急公告</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedAnnouncement(null);
        }}
        footer={null}
        width={600}
      >
        {selectedAnnouncement && (
          <div style={{ padding: '16px 0' }}>
            <Typography.Title level={4} style={{ marginBottom: 16, color: '#ff4d4f' }}>
              {selectedAnnouncement.title}
            </Typography.Title>

            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              发布时间: {formatBeijingTime(selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt)}
            </Text>

            <div 
              style={{
                backgroundColor: '#fff2f0',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #ffccc7',
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
    </>
  );
};

export default NotificationBell;
