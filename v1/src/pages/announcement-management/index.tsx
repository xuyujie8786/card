/**
 * 公告管理页面
 */
import React, { useState, useRef } from 'react';
import { 
  Card, 
  Button, 
  message, 
  Modal, 
  Tag, 
  Space, 
  Popconfirm 
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import { formatBeijingTime } from '@/utils/time';
import { 
  getAnnouncements,
  deleteAnnouncement
} from '@/services/announcement';
import type { AnnouncementItem } from '@/types/announcement';
import { 
  AnnouncementType, 
  AnnouncementStatus,
  AnnouncementTypeText, 
  AnnouncementStatusText 
} from '@/types/announcement';
import AnnouncementForm from './components/AnnouncementForm';
import AnnouncementDetail from './components/AnnouncementDetail';

const AnnouncementManagement: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<AnnouncementItem | null>(null);

  // 删除公告
  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncement(id);
      message.success('公告删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 编辑公告
  const handleEdit = (record: AnnouncementItem) => {
    setEditingAnnouncement(record);
    setFormVisible(true);
  };

  // 查看公告详情
  const handleView = (record: AnnouncementItem) => {
    setViewingAnnouncement(record);
    setDetailVisible(true);
  };

  // 创建新公告
  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormVisible(true);
  };

  // 表单提交成功回调
  const handleFormSuccess = () => {
    setFormVisible(false);
    setEditingAnnouncement(null);
    actionRef.current?.reload();
  };

  const columns: ProColumns<AnnouncementItem>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (text, record) => (
        <Space>
          {record.type === AnnouncementType.URGENT && (
            <NotificationOutlined style={{ color: '#ff4d4f' }} />
          )}
          <span style={{ fontWeight: record.type === AnnouncementType.URGENT ? 'bold' : 'normal' }}>
            {text}
          </span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueEnum: {
        [AnnouncementType.NORMAL]: {
          text: AnnouncementTypeText[AnnouncementType.NORMAL],
          status: 'Default',
        },
        [AnnouncementType.URGENT]: {
          text: AnnouncementTypeText[AnnouncementType.URGENT],
          status: 'Error',
        },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        [AnnouncementStatus.DRAFT]: {
          text: AnnouncementStatusText[AnnouncementStatus.DRAFT],
          status: 'Default',
        },
        [AnnouncementStatus.ACTIVE]: {
          text: AnnouncementStatusText[AnnouncementStatus.ACTIVE],
          status: 'Success',
        },
        [AnnouncementStatus.ARCHIVED]: {
          text: AnnouncementStatusText[AnnouncementStatus.ARCHIVED],
          status: 'Warning',
        },
      },
    },
    {
      title: '创建者',
      dataIndex: ['creator', 'name'],
      width: 120,
      render: (text, record) => text || record.creator?.username || '-',
      search: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      valueType: 'dateTime',
      render: (text) => formatBeijingTime(text as string),
      search: false,
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      width: 160,
      valueType: 'dateTime',
      render: (text) => text ? formatBeijingTime(text as string) : '-',
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="view"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
        >
          查看
        </Button>,
        <Button
          key="edit"
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定要删除这条公告吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      header={{
        title: '公告管理',
        subTitle: '管理系统公告信息',
      }}
    >
      <Card>
        <ProTable<AnnouncementItem>
          headerTitle="公告列表"
          actionRef={actionRef}
          rowKey="id"
          search={false}
          size="middle"
          toolBarRender={() => [
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新建公告
            </Button>,
          ]}
          request={async (params) => {
            try {
              const response = await getAnnouncements({
                current: params.current,
                pageSize: params.pageSize,
              });

              return {
                data: response.data || [],
                success: response.success,
                total: response.total || 0,
              };
            } catch (error) {
              message.error('获取公告列表失败');
              return {
                data: [],
                success: false,
                total: 0,
              };
            }
          }}
          columns={columns}
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          options={{
            density: false,
            setting: false,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 公告表单弹窗 */}
      <AnnouncementForm
        visible={formVisible}
        editingData={editingAnnouncement}
        onCancel={() => {
          setFormVisible(false);
          setEditingAnnouncement(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* 公告详情弹窗 */}
      <AnnouncementDetail
        visible={detailVisible}
        data={viewingAnnouncement}
        onCancel={() => {
          setDetailVisible(false);
          setViewingAnnouncement(null);
        }}
      />
    </PageContainer>
  );
};

export default AnnouncementManagement;
