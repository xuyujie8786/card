/**
 * 公告详情组件
 */
import React from 'react';
import { 
  Modal, 
  Descriptions, 
  Tag, 
  Typography, 
  Space,
  Divider 
} from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { formatBeijingTime } from '@/utils/time';
import type { AnnouncementItem } from '@/types/announcement';
import { 
  AnnouncementType,
  AnnouncementTypeText, 
  AnnouncementStatusText 
} from '@/types/announcement';

const { Title, Paragraph } = Typography;

interface AnnouncementDetailProps {
  visible: boolean;
  data?: AnnouncementItem | null;
  onCancel: () => void;
}

const AnnouncementDetail: React.FC<AnnouncementDetailProps> = ({
  visible,
  data,
  onCancel,
}) => {
  if (!data) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'draft':
        return 'default';
      case 'archived':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'red';
      case 'normal':
        return 'blue';
      default:
        return 'default';
    }
  };

  return (
    <Modal
      title={
        <Space>
          {data.type === AnnouncementType.URGENT && (
            <BellOutlined style={{ color: '#ff4d4f' }} />
          )}
          <span>公告详情</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <div style={{ padding: '16px 0' }}>
        <Title 
          level={3} 
          style={{ 
            marginBottom: 16,
            fontWeight: data.type === AnnouncementType.URGENT ? 'bold' : 'normal'
          }}
        >
          {data.title}
        </Title>

        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="公告类型">
            <Tag color={getTypeColor(data.type)}>
              {AnnouncementTypeText[data.type]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="发布状态">
            <Tag color={getStatusColor(data.status)}>
              {AnnouncementStatusText[data.status]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建者">
            {data.creator?.name || data.creator?.username || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatBeijingTime(data.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="最后更新">
            {formatBeijingTime(data.updatedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="发布时间">
            {data.publishedAt ? formatBeijingTime(data.publishedAt) : '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <div>
          <Title level={5}>公告内容</Title>
          <div 
            style={{
              backgroundColor: '#fafafa',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #d9d9d9',
              marginTop: '8px',
            }}
          >
            <Paragraph 
              style={{ 
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {data.content}
            </Paragraph>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AnnouncementDetail;


