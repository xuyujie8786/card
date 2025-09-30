/**
 * 卡片详情侧拉抽屉组件
 */
import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Tabs, Table, Tag, Spin, Button, Space, Divider, App } from 'antd';
import { CopyOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { formatBeijingTime } from '@/utils/time';
import { getVirtualCardDetail, toggleCardStatus, deleteCard } from '@/services/virtual-card';
import { getCardOperationLogs, operationTypeConfig } from '@/services/operation-log';
import { getCardConsumptionRecords, consumptionTypeConfig, consumptionStatusConfig } from '@/services/consumption';
import type { CardDetail } from '@/types/virtual-card';
import type { OperationLogItem } from '@/services/operation-log';
import type { ConsumptionRecord } from '@/services/consumption';
import { CardStatusText } from '@/types/virtual-card';

interface CardDetailDrawerProps {
  open: boolean;
  cardId?: string;
  onClose: () => void;
  onRefresh?: () => void; // 用于刷新父组件数据
}

const CardDetailDrawer: React.FC<CardDetailDrawerProps> = ({ open, cardId, onClose, onRefresh }) => {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [cardDetail, setCardDetail] = useState<CardDetail | null>(null);
  const [operationLogs, setOperationLogs] = useState<OperationLogItem[]>([]);
  const [operationLoading, setOperationLoading] = useState(false);
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([]);
  const [consumptionLoading, setConsumptionLoading] = useState(false);
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



  // 获取操作记录
  const fetchOperationLogs = async () => {
    if (!cardDetail?.cardNo) return;
    
    setOperationLoading(true);
    try {
      const response = await getCardOperationLogs(cardDetail.cardNo, { pageSize: 50 });
      if (response.success) {
        setOperationLogs(response.data);
      } else {
        message.error(response.message || '获取操作记录失败');
      }
    } catch (error) {
      console.error('获取操作记录失败:', error);
      message.error('获取操作记录失败');
    } finally {
      setOperationLoading(false);
    }
  };

  // 获取消费记录
  const fetchConsumptionRecords = async () => {
    if (!cardDetail?.cardId) return;
    
    console.log('🔍 获取消费记录', { 
      cardId: cardDetail.cardId, 
      cardNo: cardDetail.cardNo,
      databaseId: cardId 
    });
    
    setConsumptionLoading(true);
    try {
      // 使用卡商的真实cardId而不是数据库主键ID
      const response = await getCardConsumptionRecords(cardDetail.cardId);
      console.log('📊 消费记录响应', response);
      if (response.success) {
        setConsumptionRecords(response.data);
      } else {
        message.error(response.message || '获取消费记录失败');
      }
    } catch (error) {
      console.error('获取消费记录失败:', error);
      message.error('获取消费记录失败');
    } finally {
      setConsumptionLoading(false);
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

    modal.confirm({
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
      // 重置状态，确保每次打开都是清空状态
      setCardDetail(null);
      setOperationLogs([]);
      setConsumptionRecords([]);
      fetchCardDetail();
    }
  }, [open, cardId]);

  // 当卡片详情加载完成后，自动加载默认选中的操作记录
  useEffect(() => {
    if (cardDetail && (!operationLogs || operationLogs.length === 0)) {
      fetchOperationLogs();
    }
  }, [cardDetail]);



  // 操作记录表格列
  const operationColumns: ColumnsType<OperationLogItem> = [
    {
      title: '操作类型',
      dataIndex: 'operationType',
      width: 100,
      render: (value: string) => {
        const config = operationTypeConfig[value as keyof typeof operationTypeConfig];
        const text = config?.text || value;
        const color = config?.color || 'blue';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (value) => {
        if (!value) return '-';
        const amount = parseFloat(value);
        const isPositive = amount >= 0;
        return (
          <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
            {isPositive ? '+' : ''}USD {amount.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '操作员',
      dataIndex: 'operatorName',
      width: 100,
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (value: string) => {
        return formatBeijingTime(value);
      },
    },
  ];

  // 消费记录表格列
  const consumptionColumns: ColumnsType<ConsumptionRecord> = [
    {
      title: '商户名称',
      dataIndex: 'merchantName',
      width: 150,
      render: (value) => value || '-',
    },
    {
      title: '交易类型',
      dataIndex: 'transactionType',
      width: 100,
      render: (value: string) => {
        let color = 'default';
        let text = value;
        
        // 和对账单页面保持一致的交易类型显示逻辑
        switch (value) {
          case 'auth':
            color = 'blue';
            text = '授权';
            break;
          case 'purchase':
            color = 'green';
            text = '消费';
            break;
          case 'refund':
            color = 'red';
            text = '退款';
            break;
          case 'cancel':
            color = 'red';
            text = '撤销';
            break;
          case 'auth_cancel':
            color = 'orange';
            text = '授权撤销';
            break;
          case 'preauth':
            color = 'purple';
            text = '预授权';
            break;
          default:
            text = consumptionTypeConfig[value as keyof typeof consumptionTypeConfig] || value;
            color = 'purple';
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (value, record) => {
        if (!value) return '-';
        const amount = parseFloat(value);
        
        // 和对账单保持一致：负数红色，正数绿色，直接显示金额不添加符号
        return (
          <span style={{ 
            color: amount < 0 ? '#ff4d4f' : '#52c41a',
            fontWeight: 500 
          }}>
            USD {amount.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value: string) => {
        const config = consumptionStatusConfig[value as keyof typeof consumptionStatusConfig];
        return config ? (
          <Tag color={config.color}>{config.text}</Tag>
        ) : (
          <Tag>{value}</Tag>
        );
      },
    },
    {
      title: '交易时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (value: string) => {
        return formatBeijingTime(value);
      },
    },
  ];

  const recordTabItems = [
    {
      key: 'operation',
      label: '操作记录',
      children: (
        <Table
          columns={operationColumns}
          dataSource={operationLogs}
          loading={operationLoading}
          rowKey="id"
          size="small"
          scroll={{ x: 600 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
          }}
        />
      ),
    },
    {
      key: 'consumption',
      label: '消费记录',
      children: (
        <Table
          columns={consumptionColumns}
          dataSource={consumptionRecords}
          loading={consumptionLoading}
          rowKey="id"
          size="small"
          scroll={{ x: 700 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
          }}
        />
      ),
    },
  ];

  const handleTabChange = (key: string) => {
    if (key === 'operation' && (!operationLogs || operationLogs.length === 0)) {
      fetchOperationLogs();
    } else if (key === 'consumption' && (!consumptionRecords || consumptionRecords.length === 0)) {
      fetchConsumptionRecords();
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
      width={700}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {cardDetail && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 上半部分：基本信息 */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>基本信息</h3>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="卡ID" span={2}>
                  {cardDetail.cardId}
                  <CopyOutlined
                    style={{ marginLeft: 8, cursor: 'pointer' }}
                    onClick={() => copyToClipboard(cardDetail.cardId)}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="卡号">
                  {cardDetail.cardNo ? cardDetail.cardNo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : cardDetail.cardNo}
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
                <Descriptions.Item label="卡片余额">
                  {cardDetail.currency} {typeof cardDetail.balance === 'number' ? cardDetail.balance.toFixed(2) : parseFloat(String(cardDetail.balance)).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="总充值">
                  {cardDetail.currency} {cardDetail.totalRecharge ? cardDetail.totalRecharge.toFixed(2) : '0.00'}
                </Descriptions.Item>
                <Descriptions.Item label="总消费">
                  {cardDetail.currency} {cardDetail.totalConsumption ? cardDetail.totalConsumption.toFixed(2) : '0.00'}
                </Descriptions.Item>
                <Descriptions.Item label="持卡人">
                  {cardDetail.cardholderUsername}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {formatBeijingTime(cardDetail.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>{cardDetail.remark || '无'}</Descriptions.Item>
              </Descriptions>
            </div>

            <Divider />

            {/* 下半部分：记录信息 */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <h3 style={{ marginBottom: 16 }}>记录信息</h3>
              <Tabs
                defaultActiveKey="operation"
                items={recordTabItems}
                onChange={handleTabChange}
                style={{ height: '100%' }}
                tabBarStyle={{ marginBottom: 16 }}
              />
            </div>
          </div>
        )}
      </Spin>
    </Drawer>
  );
};

export default CardDetailDrawer;
