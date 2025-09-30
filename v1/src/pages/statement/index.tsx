/**
 * 对账单页面
 */
import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Button, Select, Statistic, Tag, Space, Tooltip, Typography, App } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, ReloadOutlined, EyeOutlined, SyncOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import dayjs, { Dayjs } from 'dayjs';
import { formatBeijingTime } from '@/utils/time';
import { useModel } from '@umijs/max';
import { 
  getTransactions, 
  getStatementSummary, 
  exportStatement,
  getAuthRecordsByDateRange,
  getSettleRecordsByDateRange
} from '@/services/transaction';
import SyncModal from './components/SyncModal';
import type { 
  AuthRecord, 
  SettleRecord, 
  StatementSummary,
  TransactionQueryParams,
  TransactionRecord 
} from '@/types/transaction';
import { 
  TransactionStatusText, 
  TransactionTypeText, 
  BusinessTypeText 
} from '@/types/transaction';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface CombinedRecord extends Omit<TransactionRecord, 'id'> {
  recordType?: 'auth' | 'settle';
  // 兼容旧字段名
  merchName?: string;
  merchCtry?: string;
  // 添加缺失的字段
  billAmt?: number;
  txnAmt?: number;
  billCcy?: string;
  txnCcy?: string;
  cardNo?: string;
  cardNumber?: string;
  id?: string | number;
}

const StatementPage: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<'all' | 'AUTH' | 'SETTLEMENT' | 'REFUND' | 'CANCEL'>('all');
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // 获取当前用户信息
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  // 加载汇总数据
  const loadSummary = async () => {
    if (!dateRange || dateRange.length !== 2) return;
    
    try {
      setLoading(true);
      const response = await getStatementSummary({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        username: selectedUser || undefined,
      });

      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        message.error(response.error?.message || '获取汇总数据失败');
      }
    } catch (error) {
      console.error('获取汇总数据失败:', error);
      message.error('获取汇总数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出对账单（Excel格式）
  const handleExport = async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning('请选择日期范围');
      return;
    }

    try {
      setExportLoading(true);
      const blob = await exportStatement({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        username: selectedUser || undefined,
        excludeAuthCancel: true, // 默认排除AUTH_CANCEL交易
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `交易对账单_${dateRange[0].format('YYYYMMDD')}-${dateRange[1].format('YYYYMMDD')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    loadSummary();
    actionRef.current?.reload();
  };

  // 处理同步成功
  const handleSyncSuccess = () => {
    message.success('数据同步完成');
    // 同步成功后刷新数据
    loadSummary();
    actionRef.current?.reload();
  };


  // 初始化加载
  useEffect(() => {
    loadSummary();
  }, [dateRange, selectedUser]);

  // 表格列定义
  const columns: ProColumns<CombinedRecord>[] = [
    {
      title: '卡号',
      dataIndex: 'cardNo',
      width: 180,
      copyable: true,
      ellipsis: true,
      render: (dom, record: CombinedRecord) => {
        const cardNo = record.cardNo || '-';
        return (
          <Tooltip title={cardNo}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
              {cardNo}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '授权商户',
      dataIndex: 'merchantName',
      width: 200,
      ellipsis: true,
      render: (dom, record: CombinedRecord) => {
        // 移除商户名称中的国家代码后缀（如 NLD）
        const merchantName = record.merchantName || record.merchName || '-';
        const cleanMerchantName = merchantName.replace(/\s+(NLD|USA|GBR|CHN|FRA|DEU|JPN|KOR|SGP|AUS|CAN)\s*$/i, '');
        
        return (
          <Tooltip title={cleanMerchantName}>
            <span>{cleanMerchantName}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '授权金额',
      dataIndex: 'authBillAmt',
      width: 120,
      render: (dom, record: CombinedRecord) => {
        const value = record.authBillAmt;
        // 显示授权账单金额，如果没有则显示 "-"
        if (!value && !record.authBillAmt) {
          return <Text type="secondary">-</Text>;
        }
        
        const amount = Number(value || record.authBillAmt || 0);
        const currency = record.authBillCcy || record.finalCcy || 'USD';
        
        // 确保 amount 是有效数字
        if (isNaN(amount)) {
          return <Text type="secondary">-</Text>;
        }
        
        return (
          <div>
            {currency} {amount.toFixed(2)}
          </div>
        );
      },
    },
    {
      title: '结算金额',
      dataIndex: 'settleBillAmt',
      width: 120,
      render: (dom, record: CombinedRecord) => {
        // 对于已结算的交易显示结算金额，对于未结算的显示 "-"
        if (!record.isSettled) {
          return <Text type="secondary">-</Text>;
        }
        
        // 优先使用结算金额，如果没有则使用最终金额
        const rawAmount = record.settleBillAmt ?? record.finalAmt;
        const amount = Number(rawAmount || 0);
        const currency = record.settleBillCcy || record.finalCcy || record.authBillCcy;
        
        // 确保 amount 是有效数字
        if (isNaN(amount)) {
          return <Text type="secondary">-</Text>;
        }
        
        return (
          <div>
            {currency} {amount.toFixed(2)}
          </div>
        );
      },
    },
    {
      title: '最终金额',
      dataIndex: 'finalAmt',
      width: 120,
      render: (dom, record: CombinedRecord) => {
        const rawAmount = record.finalAmt || record.billAmt || record.txnAmt || 0;
        const finalAmount = Number(rawAmount);
        const currency = record.finalCcy || record.billCcy || record.txnCcy || 'USD';
        
        // 确保 finalAmount 是有效数字
        if (isNaN(finalAmount)) {
          return <Text type="secondary">-</Text>;
        }
        
        return (
          <div style={{ 
            fontSize: '13px'
          }}>
            {currency} {finalAmount.toFixed(2)}
          </div>
        );
      },
    },
    {
      title: '授权时间',
      dataIndex: 'txnTime',
      width: 160,
      render: (dom, record: CombinedRecord) => {
        const time = record.txnTime || record.clearingDate;
        if (!time) return '-';
        
        return (
          <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            {formatBeijingTime(time, 'YYYY-MM-DD HH:mm:ss')}
          </span>
        );
      },
    },
    {
      title: '交易类型',
      dataIndex: 'txnType',
      width: 100,
      render: (dom, record: CombinedRecord) => {
        const value = record.txnType;
        let text = value;
        
        switch (value) {
          case 'AUTH':
          case 'A':
            text = '授权';
            break;
          case 'SETTLEMENT':
          case 'C':
            text = '消费';
            break;
          case 'REFUND':
          case 'R':
            text = '退款';
            break;
          case 'CANCEL':
          case 'F':
            text = '撤销';
            break;
          default:
            text = TransactionTypeText[value as keyof typeof TransactionTypeText] || value;
        }
        
        return <span>{text}</span>;
      },
    },
    {
      title: '交易状态',
      dataIndex: 'txnStatus',
      width: 100,
      render: (dom, record: CombinedRecord) => {
        const value = record.txnStatus;
        const color = value === '1' ? 'success' : 'error';
        const text = value === '1' ? '成功' : value === '0' ? '失败' : '未知';
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title: '交易对账单',
        subTitle: '查看和管理交易授权与结算记录',
        extra: [
          <RangePicker
            key="dateRange"
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                // 检查时间范围是否超过30天
                const diffDays = dates[1].diff(dates[0], 'day');
                if (diffDays > 30) {
                  message.error('时间范围不能超过30天');
                  return;
                }
                setDateRange([dates[0], dates[1]]);
                // 立即重新加载数据
                loadSummary();
                actionRef.current?.reload();
              }
            }}
            format="YYYY-MM-DD"
            allowClear={false}
            disabledDate={(current) => {
              if (!current) return false;
              // 禁用未来日期
              if (current > dayjs().endOf('day')) return true;
              // 如果已选择开始日期，限制结束日期不能超过30天
              if (dateRange && dateRange[0] && current.diff(dateRange[0], 'day') > 30) {
                return true;
              }
              // 如果已选择结束日期，限制开始日期不能超过30天
              if (dateRange && dateRange[1] && dateRange[1].diff(current, 'day') > 30) {
                return true;
              }
              return false;
            }}
          />,
        ],
      }}
    >
      {/* 汇总统计卡片 */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="授权交易总数"
                value={summary.authSummary.totalTransactions}
                precision={0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="结算交易总数"
                value={summary.settleSummary.totalTransactions}
                precision={0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="授权总金额"
                value={summary.authSummary.totalAmount}
                precision={2}
                suffix={summary.authSummary.currency}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="结算总金额"
                value={summary.settleSummary.totalAmount}
                precision={2}
                suffix={summary.settleSummary.currency}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <ProTable<CombinedRecord>
        headerTitle="交易对账单"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => {
          const buttons = [
            <Select
              key="transactionType"
              placeholder="交易类型"
              value={transactionType}
              onChange={(value) => {
                setTransactionType(value);
                actionRef.current?.reload();
              }}
              style={{ width: 120 }}
              options={[
                { label: '全部', value: 'all' },
                { label: '授权', value: 'AUTH' },
                { label: '消费', value: 'SETTLEMENT' },
                { label: '退款', value: 'REFUND' },
                { label: '撤销', value: 'CANCEL' },
              ]}
            />,
          ];
          
          // 只有超级管理员才能看到同步数据按钮
          if (currentUser?.role === 'SUPER_ADMIN') {
            buttons.push(
              <Button
                key="sync"
                icon={<SyncOutlined />}
                onClick={() => setSyncModalOpen(true)}
              >
                同步数据
              </Button>
            );
          }
          
          buttons.push(
            <Button
              key="exportExcel"
              icon={<FileExcelOutlined />}
              onClick={handleExport}
              loading={exportLoading}
              type="primary"
            >
              导出Excel
            </Button>,
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              刷新
            </Button>
          );
          
          return buttons;
        }}
        request={async (params) => {
          if (!dateRange || dateRange.length !== 2) {
            return {
              data: [],
              success: true,
              total: 0,
            };
          }

          try {
            const queryParams: TransactionQueryParams = {
              startDate: dateRange[0].format('YYYY-MM-DD'),
              endDate: dateRange[1].format('YYYY-MM-DD'),
              username: selectedUser || undefined,
              current: params.current,
              pageSize: params.pageSize,
            };

            const response = await getTransactions(queryParams);
            
            if (response.success && response.data) {
              const { data: transactions, pagination } = response.data;
              
              // 将后端返回的交易记录转换为前端需要的格式
              let combinedRecords: CombinedRecord[] = [];
              
              if (transactions && Array.isArray(transactions)) {
                combinedRecords = transactions
                  .map((record, index) => ({
                    ...record,
                    recordType: record.isSettled ? 'settle' as const : 'auth' as const,
                    id: record.txnId || `txn-${index}`,
                    // 映射字段名称以保持兼容性，确保数值类型
                    txnAmt: Number(record.authTxnAmt || record.finalAmt || 0),
                    billAmt: Number(record.authBillAmt || record.finalAmt || 0),
                    txnCcy: record.authTxnCcy || record.finalCcy,
                    billCcy: record.authBillCcy || record.finalCcy,
                    merchName: record.merchantName,
                    merchCtry: record.merchantCountry,
                    cardNo: record.cardNo || '-',
                    realCardId: record.cardId,
                    tradeNote: record.declineReason,
                    // 确保金额字段为数值类型
                    authBillAmt: Number(record.authBillAmt || 0),
                    settleBillAmt: Number(record.settleBillAmt || 0),
                    finalAmt: Number(record.finalAmt || 0),
                  }));

                // 先过滤掉AUTH_CANCEL交易，完全不显示
                combinedRecords = combinedRecords.filter(record => {
                  return record.txnType !== 'D' && record.txnType !== 'AUTH_CANCEL'; // 默认过滤掉授权撤销交易
                });

                // 根据交易类型过滤
                if (transactionType !== 'all') {
                  combinedRecords = combinedRecords.filter(record => {
                    // 标准化交易类型字段
                    let txnType = record.txnType;
                    if (txnType === 'A') txnType = 'AUTH';
                    else if (txnType === 'C') txnType = 'SETTLEMENT';
                    else if (txnType === 'R') txnType = 'REFUND';
                    else if (txnType === 'F') txnType = 'CANCEL';
                    
                    return txnType === transactionType;
                  });
                }

                // 按时间排序
                combinedRecords.sort((a, b) => {
                  const timeA = a.txnTime || a.createdAt || '';
                  const timeB = b.txnTime || b.createdAt || '';
                  return dayjs(timeB).valueOf() - dayjs(timeA).valueOf();
                });
              }

              return {
                data: combinedRecords,
                success: true,
                total: pagination?.total || combinedRecords.length,
              };
            } else {
              message.error(response.error?.message || '获取数据失败');
              return {
                data: [],
                success: false,
                total: 0,
              };
            }
          } catch (error) {
            console.error('获取交易记录失败:', error);
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
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
        }}
        options={{
          density: false,
          setting: false,
        }}
        scroll={{ x: 1200 }}
        size="small"
      />
      
      <SyncModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onSuccess={handleSyncSuccess}
      />
    </PageContainer>
  );
};

export default StatementPage;
