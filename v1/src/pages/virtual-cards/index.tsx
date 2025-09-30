/**
 * 虚拟卡管理页面
 */
import React, { useState, useRef } from 'react';
import { Button, Modal, Tag, Space, Tooltip, Input, Progress, Alert, Popover, Form, Select, App } from 'antd';
import { PlusOutlined, CopyOutlined, EyeOutlined, EditOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable, ProFormText, ProFormSelect, PageContainer, ProFormMoney } from '@ant-design/pro-components';
import { getVirtualCardList, updateCardRemark, deleteCard, rechargeCard, withdrawCard } from '@/services/virtual-card';
import type { VirtualCard, CardListParams, CardStatus } from '@/types/virtual-card';
import { CardStatusText } from '@/types/virtual-card';
import CreateCardForm from './components/CreateCardForm';
import RechargeForm from './components/RechargeForm';
import WithdrawForm from './components/WithdrawForm';
import CardDetailDrawer from './components/CardDetailDrawer';

const VirtualCardList: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingRemark, setEditingRemark] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<CardStatus | ''>('1'); // 默认显示已激活的卡片
  
  // Popover 状态管理
  const [rechargePopoverOpen, setRechargePopoverOpen] = useState<string | null>(null);
  const [withdrawPopoverOpen, setWithdrawPopoverOpen] = useState<string | null>(null);
  const [rechargeForm] = Form.useForm();
  const [withdrawForm] = Form.useForm();
  
  // 加载状态管理
  const [rechargeLoading, setRechargeLoading] = useState<string | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState<string | null>(null);
  
  // 批量删除相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [batchDeleteResults, setBatchDeleteResults] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  // 处理充值 Popover
  const handleRechargePopover = (cardId: string, open: boolean) => {
    if (open) {
      setRechargePopoverOpen(cardId);
      rechargeForm.resetFields();
    } else {
      // 如果正在加载中，不允许关闭弹窗
      if (rechargeLoading === cardId) {
        return;
      }
      setRechargePopoverOpen(null);
    }
  };

  // 处理提现 Popover
  const handleWithdrawPopover = (cardId: string, open: boolean) => {
    if (open) {
      setWithdrawPopoverOpen(cardId);
      withdrawForm.resetFields();
    } else {
      // 如果正在加载中，不允许关闭弹窗
      if (withdrawLoading === cardId) {
        return;
      }
      setWithdrawPopoverOpen(null);
    }
  };

  // 执行充值
  const handleRechargeSubmit = async (card: VirtualCard) => {
    try {
      const values = await rechargeForm.validateFields();
      const amount = parseFloat(values.amount);
      
      if (isNaN(amount) || amount <= 0) {
        message.error('请输入有效的充值金额');
        return;
      }
      
      // 设置加载状态
      setRechargeLoading(card.cardId);
      
      const response = await rechargeCard({
        cardId: card.cardId,
        amt: amount.toFixed(2),
      });
      
      if (response.code === 200) {
        message.success('充值成功！');
        setRechargePopoverOpen(null);
        rechargeForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(response.message || '充值失败');
      }
    } catch (error: any) {
      console.error('充值失败:', error);
      if (error?.errorFields) {
        // 表单验证失败
        return;
      }
      message.error('充值失败，请稍后重试');
    } finally {
      // 清除加载状态
      setRechargeLoading(null);
    }
  };

  // 执行提现
  const handleWithdrawSubmit = async (card: VirtualCard) => {
    try {
      const values = await withdrawForm.validateFields();
      const amount = parseFloat(values.amount);
      
      // 检查余额是否足够
      if (amount > card.balance) {
        message.error('提现金额不能超过卡片余额');
        return;
      }
      
      // 设置加载状态
      setWithdrawLoading(card.cardId);
      
      const response = await withdrawCard({
        cardId: card.cardId,
        amt: amount.toFixed(2),
      });
      
      if (response.code === 200) {
        message.success('提现成功！');
        setWithdrawPopoverOpen(null);
        withdrawForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(response.message || '提现失败');
      }
    } catch (error) {
      console.error('提现失败:', error);
      message.error('提现失败，请稍后重试');
    } finally {
      // 清除加载状态
      setWithdrawLoading(null);
    }
  };

  // 处理充值（保留原有弹窗方式作为备用）
  const handleRecharge = (card: VirtualCard) => {
    setSelectedCard(card);
    setRechargeModalOpen(true);
  };

  // 处理提现（保留原有弹窗方式作为备用）
  const handleWithdraw = (card: VirtualCard) => {
    setSelectedCard(card);
    setWithdrawModalOpen(true);
  };

  // 查看详情
  const handleViewDetail = (card: VirtualCard) => {
    setSelectedCard(card);
    setDetailDrawerOpen(true);
  };

  // 开始编辑备注
  const handleStartEditRemark = (card: VirtualCard) => {
    setEditingCardId(card.cardId);
    setEditingRemark(card.remark || '');
  };

  // 保存备注
  const handleSaveRemark = async (cardId: string) => {
    try {
      await updateCardRemark(cardId, { remark: editingRemark });
      message.success('备注更新成功！');
      setEditingCardId(null);
      setEditingRemark('');
      actionRef.current?.reload();
    } catch (error) {
      message.error('备注更新失败');
    }
  };

  // 取消编辑
  const handleCancelEditRemark = () => {
    setEditingCardId(null);
    setEditingRemark('');
  };

  // 批量删除卡片
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的卡片');
      return;
    }
    setBatchDeleteModalOpen(true);
  };

  // 执行批量删除
  const executeBatchDelete = async () => {
    setIsDeleting(true);
    setDeleteProgress(0);
    setBatchDeleteResults(null);

    const results = {
      total: selectedRowKeys.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // 逐张删除卡片
      for (let i = 0; i < selectedRowKeys.length; i++) {
        const cardId = selectedRowKeys[i] as string;
        
        try {
          const response = await deleteCard(cardId);
          
          if (response.code === 200) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`卡片${cardId}: ${response.message || '删除失败'}`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          results.errors.push(`卡片${cardId}: ${errorMsg}`);
        }

        // 更新进度
        const currentProgress = Math.round(((i + 1) / selectedRowKeys.length) * 100);
        setDeleteProgress(currentProgress);
        
        // 添加延迟，避免请求过于频繁
        if (i < selectedRowKeys.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setBatchDeleteResults(results);
      
      if (results.success > 0) {
        message.success(`批量删除完成！成功: ${results.success}张，失败: ${results.failed}张`);
        setSelectedRowKeys([]);
        actionRef.current?.reload();
      } else {
        message.error('所有卡片删除失败');
      }

    } catch (error) {
      console.error('批量删除虚拟卡失败:', error);
      message.error('批量删除虚拟卡失败，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  // 取消批量删除
  const cancelBatchDelete = () => {
    setBatchDeleteModalOpen(false);
    setBatchDeleteResults(null);
    setDeleteProgress(0);
  };

  // 表格列定义
  const columns: ProColumns<VirtualCard>[] = [
    {
      title: '卡号',
      dataIndex: 'cardNo',
      width: 200,
      copyable: true,
      render: (text: any, record: VirtualCard) => {
        const cardNo = record?.cardNo;
        if (!cardNo || typeof cardNo !== 'string') {
          return <span style={{ color: '#999' }}>未知卡号</span>;
        }
        // 显示完整卡号，移除脱敏处理
        const displayCardNo = cardNo.includes('****') ? cardNo : cardNo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
        return (
          <Space>
            <span style={{ fontFamily: 'monospace' }}>{displayCardNo}</span>
            <Tooltip title="复制卡号">
              <CopyOutlined
                style={{ cursor: 'pointer', color: '#1890ff' }}
                onClick={() => copyToClipboard(cardNo.replace(/\s/g, ''))}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'CVV',
      dataIndex: 'cvv',
      width: 80,
      hideInSearch: true,
      render: (text: any, record: VirtualCard) => {
        const cvv = record?.cvv;
        if (!cvv || typeof cvv !== 'string') return '-';
        // 显示真实CVV，移除星号遮罩
        const displayCvv = cvv === '***' ? '***' : cvv;
        return (
          <Space>
            <span style={{ fontFamily: 'monospace' }}>{displayCvv}</span>
            <Tooltip title="复制CVV">
              <CopyOutlined
                style={{ cursor: 'pointer', color: '#1890ff' }}
                onClick={() => copyToClipboard(cvv)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '有效期',
      dataIndex: 'expDate',
      width: 100,
      hideInSearch: true,
      render: (text: any, record: VirtualCard) => {
        const expDate = record?.expDate;
        if (!expDate || typeof expDate !== 'string') return '-';
        // 确保显示 MM/YY 格式
        const formatExpDate = (date: string) => {
          // 如果已经是 MM/YY 格式，直接返回
          if (/^\d{2}\/\d{2}$/.test(date)) {
            return date;
          }
          // 如果是其他格式，尝试转换
          try {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = String(d.getFullYear()).slice(-2);
              return `${month}/${year}`;
            }
          } catch (e) {
            console.error('Failed to format exp date:', e);
          }
          return date;
        };
        
        const displayDate = formatExpDate(expDate);
        return (
          <Space>
            <span style={{ fontFamily: 'monospace' }}>{displayDate}</span>
            <Tooltip title="复制有效期">
              <CopyOutlined
                style={{ cursor: 'pointer', color: '#1890ff' }}
                onClick={() => copyToClipboard(displayDate)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '余额',
      dataIndex: 'balance',
      width: 120,
      hideInSearch: true,
      render: (_, record: VirtualCard) => {
        const balance = typeof record.balance === 'number' ? record.balance : parseFloat(String(record.balance || '0'));
        return (
          <span>
            {record.currency} {balance.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      hideInSearch: true, // 隐藏状态筛选，使用右上角的状态选择器
      render: (value: any, record: VirtualCard) => {
        const status = record?.status || value;
        const color = status === '1' ? 'success' : status === '2' ? 'warning' : 'default';
        return <Tag color={color}>{CardStatusText[status as keyof typeof CardStatusText] || '未知状态'}</Tag>;
      },
      valueEnum: {
        '0': { text: '已注销', status: 'Default' },
        '1': { text: '已激活', status: 'Success' },
        '2': { text: '已冻结', status: 'Warning' },
        '3': { text: '已过期', status: 'Error' },
        '4': { text: '已锁定', status: 'Error' },
        '9': { text: '待激活', status: 'Processing' },
      },
    },
    {
      title: '卡操作',
      width: 150,
      hideInSearch: true,
      render: (_, record: VirtualCard) => (
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Popover
            title="充值"
            open={rechargePopoverOpen === record.cardId}
            onOpenChange={(open) => handleRechargePopover(record.cardId, open)}
            trigger="click"
            placement="topLeft"
            content={
              <div style={{ width: 280 }}>
                <Form form={rechargeForm} layout="vertical" size="small">
                  <Form.Item
                    name="amount"
                    label="充值金额"
                    rules={[
                      { required: true, message: '请输入充值金额' },
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          const num = parseFloat(value);
                          if (isNaN(num) || num < 0.01 || num > 10000) {
                            return Promise.reject(new Error('金额范围：0.01-10000'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Input
                      type="number"
                      placeholder="请输入充值金额"
                      addonBefore={record.currency}
                      step="0.01"
                      min="0.01"
                      max="10000"
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                    <Space>
                      <Button 
                        size="small" 
                        disabled={rechargeLoading === record.cardId}
                        onClick={() => setRechargePopoverOpen(null)}
                      >
                        取消
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        loading={rechargeLoading === record.cardId}
                        disabled={rechargeLoading === record.cardId}
                        onClick={() => handleRechargeSubmit(record)}
                      >
                        {rechargeLoading === record.cardId ? '充值中...' : '确认充值'}
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </div>
            }
          >
            <Button
              type="link"
              size="small"
              disabled={record.status !== '1' || rechargeLoading === record.cardId}
              loading={rechargeLoading === record.cardId}
            >
              {rechargeLoading === record.cardId ? '充值中' : '充值'}
            </Button>
          </Popover>
          <Popover
            title="提现"
            open={withdrawPopoverOpen === record.cardId}
            onOpenChange={(open) => handleWithdrawPopover(record.cardId, open)}
            trigger="click"
            placement="topLeft"
            content={
              <div style={{ width: 280 }}>
                <Form form={withdrawForm} layout="vertical" size="small">
                  <Form.Item
                    label={`当前余额: ${record.currency} ${(typeof record.balance === 'number' ? record.balance : parseFloat(record.balance || '0')).toFixed(2)}`}
                    style={{ marginBottom: 8 }}
                  >
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      可提现金额不超过当前余额
                    </div>
                  </Form.Item>
                  <Form.Item
                    name="amount"
                    label="提现金额"
                    rules={[
                      { required: true, message: '请输入提现金额' },
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          const num = parseFloat(value);
                          if (isNaN(num) || num < 0.01) {
                            return Promise.reject(new Error('最小金额：0.01'));
                          }
                          const balance = typeof record.balance === 'number' ? record.balance : parseFloat(record.balance || '0');
                          if (num > balance) {
                            return Promise.reject(new Error('提现金额不能超过卡片余额'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input
                      type="number"
                      placeholder="请输入提现金额"
                      addonBefore={record.currency}
                      step="0.01"
                      min="0.01"
                      max={typeof record.balance === 'number' ? record.balance : parseFloat(record.balance || '0')}
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                    <Space>
                      <Button 
                        size="small" 
                        disabled={withdrawLoading === record.cardId}
                        onClick={() => setWithdrawPopoverOpen(null)}
                      >
                        取消
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        loading={withdrawLoading === record.cardId}
                        disabled={withdrawLoading === record.cardId}
                        onClick={() => handleWithdrawSubmit(record)}
                      >
                        {withdrawLoading === record.cardId ? '提现中...' : '确认提现'}
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </div>
            }
          >
            <Button
              type="link"
              size="small"
              disabled={record.status !== '1' || record.balance <= 0 || withdrawLoading === record.cardId}
              loading={withdrawLoading === record.cardId}
            >
              {withdrawLoading === record.cardId ? '提现中' : '提现'}
            </Button>
          </Popover>
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      render: (_, record: VirtualCard) => {
        const isEditing = editingCardId === record.cardId;
        
        if (isEditing) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Input
                size="small"
                value={editingRemark}
                onChange={(e) => setEditingRemark(e.target.value)}
                maxLength={32}
                placeholder="请输入备注"
                style={{ flex: 1 }}
                onPressEnter={() => handleSaveRemark(record.cardId)}
                autoFocus
              />
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleSaveRemark(record.cardId)}
                style={{ color: '#52c41a' }}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancelEditRemark}
                style={{ color: '#ff4d4f' }}
              />
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ flex: 1 }}>
              {record.remark || '-'}
            </span>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleStartEditRemark(record)}
              style={{ opacity: 0.6 }}
            />
          </div>
        );
      },
    },
    {
      title: '详情',
      width: 80,
      hideInSearch: true,
      render: (_, record: VirtualCard) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '虚拟卡管理',
        subTitle: '创建和管理虚拟信用卡',
        extra: [
          <Space key="status-filter" style={{ alignItems: 'center' }}>
            <span>状态:</span>
            <Select
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                actionRef.current?.reload();
              }}
              style={{ width: 120 }}
              options={[
                { label: '全部', value: '' },
                { label: '已激活', value: '1' },
                { label: '已冻结', value: '2' },
                { label: '已注销', value: '0' },
                { label: '已过期', value: '3' },
                { label: '已锁定', value: '4' },
                { label: '待激活', value: '9' },
              ]}
            />
          </Space>,
        ],
      }}
    >
      <ProTable<VirtualCard>
        headerTitle="虚拟卡管理"
        actionRef={actionRef}
        rowKey="cardId"
        search={{
          labelWidth: 'auto',
          collapsed: false,
          collapseRender: false,
          searchText: '搜索',
          resetText: '重置',
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            创建虚拟卡
          </Button>,
          <Button
            key="batchDelete"
            danger
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>,
        ]}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record: VirtualCard) => ({
            // 禁用已注销的卡片
            disabled: record.status === '0',
            name: record.cardId,
          }),
        }}
        request={async (params) => {
          try {
            const queryParams: CardListParams = {
              current: params.current,
              pageSize: params.pageSize,
              cardNo: params.cardNo,
              remark: params.remark,
              status: statusFilter === '' ? undefined : statusFilter, // 使用右上角的状态筛选
            };

            const response = await getVirtualCardList(queryParams);
            
            if (response.code === 200) {
              return {
                data: response.data.list,
                success: true,
                total: response.data.pagination.total,
              };
            } else {
              message.error(response.message || '获取数据失败');
              return {
                data: [],
                success: false,
                total: 0,
              };
            }
          } catch (error) {
            console.error('获取虚拟卡列表失败:', error);
            message.error('获取数据失败，请稍后重试');
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
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        options={{
          density: false,
          setting: false,
        }}
      >
        {/* 搜索表单 */}
        <ProFormText
          name="cardNo"
          label="卡号"
          placeholder="请输入卡号进行模糊查找"
          
        />
        <ProFormText
          name="remark"
          label="备注"
          placeholder="请输入备注进行模糊查找"
         
        />
      </ProTable>

      {/* 创建虚拟卡弹窗 */}
      <Modal
        title="创建虚拟卡"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <CreateCardForm
          onSuccess={() => {
            setCreateModalOpen(false);
            actionRef.current?.reload();
          }}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      {/* 充值弹窗 */}
      <Modal
        title="卡片充值"
        open={rechargeModalOpen}
        onCancel={() => setRechargeModalOpen(false)}
        footer={null}
        width={500}
        destroyOnHidden
      >
        {selectedCard && (
          <RechargeForm
            card={selectedCard}
            onSuccess={() => {
              setRechargeModalOpen(false);
              actionRef.current?.reload();
            }}
            onCancel={() => setRechargeModalOpen(false)}
          />
        )}
      </Modal>

      {/* 提现弹窗 */}
      <Modal
        title="卡片提现"
        open={withdrawModalOpen}
        onCancel={() => setWithdrawModalOpen(false)}
        footer={null}
        width={500}
        destroyOnHidden
      >
        {selectedCard && (
          <WithdrawForm
            card={selectedCard}
            onSuccess={() => {
              setWithdrawModalOpen(false);
              actionRef.current?.reload();
            }}
            onCancel={() => setWithdrawModalOpen(false)}
          />
        )}
      </Modal>

      {/* 卡片详情侧拉抽屉 */}
      <CardDetailDrawer
        open={detailDrawerOpen}
        cardId={selectedCard?.cardId}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedCard(null);
        }}
        onRefresh={() => {
          actionRef.current?.reload();
        }}
      />

      {/* 批量删除确认对话框 */}
      <Modal
        title="批量删除确认"
        open={batchDeleteModalOpen}
        onCancel={cancelBatchDelete}
        footer={null}
        width={600}
        destroyOnHidden
      >
        {!isDeleting && !batchDeleteResults && (
          <div>
            <Alert
              message="警告"
              description={`您即将删除 ${selectedRowKeys.length} 张虚拟卡，此操作不可撤销！`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <p>确认要删除以下卡片吗？</p>
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Space>
                <Button onClick={cancelBatchDelete}>
                  取消
                </Button>
                <Button
                  type="primary"
                  danger
                  onClick={executeBatchDelete}
                >
                  确认删除
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* 删除进度显示 */}
        {isDeleting && (
          <div>
            <Alert
              message="正在批量删除虚拟卡"
              description={
                <div style={{ marginTop: 8 }}>
                  <Progress percent={deleteProgress} status="active" />
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    请耐心等待，正在逐张删除虚拟卡...
                  </div>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </div>
        )}

        {/* 删除结果显示 */}
        {batchDeleteResults && (
          <div>
            <Alert
              message="批量删除结果"
              description={
                <div>
                  <div>总计: {batchDeleteResults.total}张，成功: {batchDeleteResults.success}张，失败: {batchDeleteResults.failed}张</div>
                  {batchDeleteResults.errors.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: '12px', color: '#ff4d4f' }}>失败详情:</div>
                      <ul style={{ fontSize: '12px', margin: '4px 0 0 16px', padding: 0 }}>
                        {batchDeleteResults.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {batchDeleteResults.errors.length > 5 && (
                          <li>...还有{batchDeleteResults.errors.length - 5}个错误</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              }
              type={batchDeleteResults.success > 0 ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={cancelBatchDelete}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </PageContainer>
  );
};

export default VirtualCardList;
