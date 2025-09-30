/**
 * 卡片详情侧拉抽屉组件
 */
import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Tabs, Table, Tag, Spin, message, Button, Space, Modal } from 'antd';
import { CopyOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { formatBeijingTime } from '@/utils/time';
import { getVirtualCardDetail, getAuthRecords, getSettleRecords, toggleCardStatus, deleteCard } from '@/services/virtual-card';
import type { CardDetail, AuthRecord, SettleRecord } from '@/types/virtual-card';
import { CardStatusText } from '@/types/virtual-card';

interface CardDetailDrawerProps {
  open: boolean;
  cardId?: string;
  onClose: () => void;
  onRefresh?: () => void; // 用于刷新父组件数据
}

const CardDetailDrawer: React.FC<CardDetailDrawerProps> = ({ open, cardId, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [cardDetail, setCardDetail] = useState<CardDetail | null>(null);
  const [authRecords, setAuthRecords] = useState<AuthRecord[]>([]);
  const [settleRecords, setSettleRecords] = useState<SettleRecord[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  // 获取卡片详情
  const fetchCardDetail = async () => {
    if (!cardId) return;
    
    setLoading(true);
    try {
      const response = await getVirtualCardDetail(cardId);
      if (response.code === 200) {
        setCardDetail(response.data);
      } else {
        message.error(response.message || '获取卡片详情失败');
      }
    } catch (error) {
      console.error('获取卡片详情失败:', error);
      message.error('获取卡片详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取授权记录
  const fetchAuthRecords = async () => {
    if (!cardId) return;
    
    setAuthLoading(true);
    try {
      const response = await getAuthRecords(cardId);
      if (response.code === 200) {
        setAuthRecords(response.data.list);
      } else {
        message.error(response.message || '获取授权记录失败');
      }
    } catch (error) {
      console.error('获取授权记录失败:', error);
      message.error('获取授权记录失败');
    } finally {
      setAuthLoading(false);
    }
  };

  // 获取结算记录
  const fetchSettleRecords = async () => {
    if (!cardId) return;
    
    setSettleLoading(true);
    try {
      const response = await getSettleRecords(cardId);
      if (response.code === 200) {
        setSettleRecords(response.data.list);
      } else {
        message.error(response.message || '获取结算记录失败');
      }
    } catch (error) {
      console.error('获取结算记录失败:', error);
      message.error('获取结算记录失败');
    } finally {
      setSettleLoading(false);
    }
  };

  // 冻结/激活卡片
  const handleToggleStatus = async () => {
    if (!cardId || !cardDetail) return;
    
    setActionLoading(true);
    try {
      const response = await toggleCardStatus(cardId);
      if (response.code === 200) {
        message.success(response.data.message);
        await fetchCardDetail(); // 刷新卡片详情
        onRefresh?.(); // 刷新父组件数据
      } else {
        message.error(response.message || '操作失败');
      }
    } catch (error) {
      console.error('切换卡片状态失败:', error);
      message.error('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 删除卡片
  const handleDeleteCard = () => {
    if (!cardId || !cardDetail) return;

    Modal.confirm({
      title: '删除卡片',
      content: `确定要删除卡片 ${cardDetail.cardNo} 吗？此操作不可撤销。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setActionLoading(true);
        try {
          const response = await deleteCard(cardId);
          if (response.code === 200) {
            message.success(response.data.message);
            onClose(); // 关闭抽屉
            onRefresh?.(); // 刷新父组件数据
          } else {
            message.error(response.message || '删除失败');
          }
        } catch (error) {
          console.error('删除卡片失败:', error);
          message.error('删除失败');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  useEffect(() => {
    if (open && cardId) {
      fetchCardDetail();
    }
  }, [open, cardId]);

  // 授权记录表格列
  const authColumns: ColumnsType<AuthRecord> = [
    {
      title: '交易ID',
      dataIndex: 'txnId',
      width: 150,
      ellipsis: true,
    },
    {
      title: '交易类型',
      dataIndex: 'txnType',
      width: 80,
      render: (value) => {
        let color = 'default';
        let text = value;
        
        switch (value) {
          case 'A':
            color = 'green';
            text = '授权';
            break;
          case 'D':
            color = 'orange';
            text = '授权撤销';
            break;
          case 'F':
            color = 'red';
            text = '撤销';
            break;
          default:
            text = value;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '交易状态',
      dataIndex: 'txnStatus',
      width: 80,
      render: (value) => (
        <Tag color={value === '1' ? 'success' : 'error'}>
          {value === '1' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '交易金额',
      dataIndex: 'txnAmt',
      width: 100,
      render: (value, record) => `${record.txnCcy} ${value}`,
    },
    {
      title: '账单金额',
      dataIndex: 'billAmt',
      width: 100,
      render: (value, record) => `${record.billCcy} ${value}`,
    },
    {
      title: '商户名称',
      dataIndex: 'merchName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '交易时间',
      dataIndex: 'txnTime',
      width: 150,
      render: (value: string) => {
        return formatBeijingTime(value);
      },
    },
  ];

  // 结算记录表格列
  const settleColumns: ColumnsType<SettleRecord> = [
    {
      title: '交易ID',
      dataIndex: 'txnId',
      width: 150,
      ellipsis: true,
    },
    {
      title: '交易类型',
      dataIndex: 'txnType',
      width: 80,
      render: (value) => (
        <Tag color={value === 'C' ? 'blue' : 'orange'}>
          {value === 'C' ? '消费' : '退款'}
        </Tag>
      ),
    },
    {
      title: '交易金额',
      dataIndex: 'txnAmt',
      width: 100,
      render: (value, record) => `${record.txnCcy} ${value}`,
    },
    {
      title: '账单金额',
      dataIndex: 'billAmt',
      width: 100,
      render: (value, record) => `${record.billCcy} ${value}`,
    },
    {
      title: '商户名称',
      dataIndex: 'merchName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '清算日期',
      dataIndex: 'clearingDate',
      width: 100,
    },
  ];

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: cardDetail ? (
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="卡号" span={2}>
            {cardDetail.cardNo}
            <CopyOutlined
              style={{ marginLeft: 8, cursor: 'pointer' }}
              onClick={() => copyToClipboard(cardDetail.cardNo)}
            />
          </Descriptions.Item>
          <Descriptions.Item label="CVV">
            {cardDetail.cvv}
            <CopyOutlined
              style={{ marginLeft: 8, cursor: 'pointer' }}
              onClick={() => copyToClipboard(cardDetail.cvv)}
            />
          </Descriptions.Item>
          <Descriptions.Item label="有效期">{cardDetail.expDate}</Descriptions.Item>
          <Descriptions.Item label="余额">
            {cardDetail.currency} {typeof cardDetail.balance === 'number' ? cardDetail.balance.toFixed(2) : parseFloat(String(cardDetail.balance)).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={cardDetail.status === '1' ? 'success' : 'warning'}>
              {CardStatusText[cardDetail.status]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="已使用金额">
            {cardDetail.currency} {cardDetail.usedAmt}
          </Descriptions.Item>
          <Descriptions.Item label="总金额">
            {cardDetail.currency} {cardDetail.totalAmt}
          </Descriptions.Item>
          <Descriptions.Item label="开卡人姓名">{cardDetail.cardholderName}</Descriptions.Item>
          <Descriptions.Item label="开卡人用户名">{cardDetail.cardholderUsername}</Descriptions.Item>
          <Descriptions.Item label="绑定邮箱">{cardDetail.card_email || '未绑定'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{cardDetail.createdAt}</Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>{cardDetail.remark || '无'}</Descriptions.Item>
        </Descriptions>
      ) : null,
    },
    {
      key: 'auth',
      label: '授权记录',
      children: (
        <Table
          columns={authColumns}
          dataSource={authRecords}
          loading={authLoading}
          rowKey="txnId"
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
          }}
        />
      ),
    },
    {
      key: 'settle',
      label: '结算记录',
      children: (
        <Table
          columns={settleColumns}
          dataSource={settleRecords}
          loading={settleLoading}
          rowKey="txnId"
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
          }}
        />
      ),
    },
  ];

  const handleTabChange = (key: string) => {
    if (key === 'auth' && authRecords.length === 0) {
      fetchAuthRecords();
    } else if (key === 'settle' && settleRecords.length === 0) {
      fetchSettleRecords();
    }
  };

  // 渲染抽屉标题和操作按钮
  const renderTitle = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <span>卡片详情</span>
      {cardDetail && (
        <Space>
          <Button
            type={cardDetail.status === '1' ? 'default' : 'primary'}
            icon={cardDetail.status === '1' ? <LockOutlined /> : <UnlockOutlined />}
            loading={actionLoading}
            onClick={handleToggleStatus}
            size="small"
          >
            {cardDetail.status === '1' ? '冻结' : '激活'}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={actionLoading}
            onClick={handleDeleteCard}
            size="small"
            // 删卡不再限制余额
          >
            删卡
          </Button>
        </Space>
      )}
    </div>
  );

  return (
    <Drawer
      title={renderTitle()}
      width={800}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {cardDetail && (
          <Tabs
            defaultActiveKey="basic"
            items={tabItems}
            onChange={handleTabChange}
          />
        )}
      </Spin>
    </Drawer>
  );
};

export default CardDetailDrawer;
