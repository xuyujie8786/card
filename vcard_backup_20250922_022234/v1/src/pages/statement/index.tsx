/**
 * 对账单页面
 */
import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Button, message, Select, Statistic, Tag, Space, Tooltip, Typography } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, ReloadOutlined, EyeOutlined, SyncOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import dayjs, { Dayjs } from 'dayjs';
import { formatBeijingTime } from '@/utils/time';
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

interface CombinedRecord extends TransactionRecord {
  recordType?: 'auth' | 'settle';
  // 兼容旧字段名
  merchName?: string;
  merchCtry?: string;
}

const StatementPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [recordType, setRecordType] = useState<'all' | 'auth' | 'settle'>('all');
  const [syncModalOpen, setSyncModalOpen] = useState(false);

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

      if (response.success) {
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

  // 导出对账单
  const handleExport = async (format: 'csv' | 'excel') => {
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
        format,
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `对账单_${dateRange[0].format('YYYYMMDD')}-${dateRange[1].format('YYYYMMDD')}.${format === 'excel' ? 'xlsx' : 'csv'}`;
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

  // 日期范围改变
  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadSummary();
  }, [dateRange, selectedUser]);

  // 表格列定义
  const columns: ProColumns<CombinedRecord>[] = [
    {
      title: '卡号',
      dataIndex: 'realCardId',
      width: 180,
      copyable: true,
      ellipsis: true,
      render: (value: string, record: CombinedRecord) => {
        const cardId = record.realCardId || record.cardId || '-';
        return (
          <Tooltip title={cardId}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
              {cardId}
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
      render: (value: string, record: CombinedRecord) => (
        <div>
          <Tooltip title={value}>
            <div style={{ fontWeight: 500, marginBottom: 2 }}>{value || record.merchName || '-'}</div>
          </Tooltip>
          {(record.merchantCountry || record.merchCtry) && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.merchantCountry || record.merchCtry}
            </Text>
          )}
          {record.mcc && (
            <div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {record.mcc}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '授权金额',
      dataIndex: 'authBillAmt',
      width: 120,
      render: (value: number, record: CombinedRecord) => {
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
          <div style={{ color: amount < 0 ? '#ff4d4f' : '#1890ff', fontWeight: 500 }}>
            {currency} {amount.toFixed(2)}
          </div>
        );
      },
      sorter: true,
    },
    {
      title: '结算金额',
      dataIndex: 'settleBillAmt',
      width: 120,
      render: (value: number, record: CombinedRecord) => {
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
          <div style={{ color: amount < 0 ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>
            {currency} {amount.toFixed(2)}
          </div>
        );
      },
      sorter: true,
    },
    {
      title: '最终金额',
      dataIndex: 'finalAmt',
      width: 120,
      render: (value: number, record: CombinedRecord) => {
        const rawAmount = value || record.billAmt || record.txnAmt || 0;
        const finalAmount = Number(rawAmount);
        const currency = record.finalCcy || record.billCcy || record.txnCcy || 'USD';
        
        // 确保 finalAmount 是有效数字
        if (isNaN(finalAmount)) {
          return <Text type="secondary">-</Text>;
        }
        
        return (
          <div style={{ 
            color: finalAmount < 0 ? '#ff4d4f' : '#52c41a', 
            fontWeight: 600,
            fontSize: '13px'
          }}>
            {currency} {finalAmount.toFixed(2)}
          </div>
        );
      },
      sorter: true,
    },
    {
      title: '授权时间',
      dataIndex: 'txnTime',
      width: 160,
      render: (value: string, record: CombinedRecord) => {
        const time = value || record.clearingDate;
        if (!time) return '-';
        
        return (
          <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            <div>{formatBeijingTime(time, 'YYYY-MM-DD')}</div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {formatBeijingTime(time, 'HH:mm:ss')}
            </Text>
          </div>
        );
      },
      sorter: true,
    },
    {
      title: '交易类型',
      dataIndex: 'txnType',
      width: 100,
      render: (value: string) => {
        let color = 'default';
        let text = value;
        
        switch (value) {
          case 'AUTH':
          case 'A':
            color = 'blue';
            text = '授权';
            break;
          case 'AUTH_CANCEL':
          case 'D':
            color = 'orange';
            text = '授权撤销';
            break;
          case 'SETTLEMENT':
          case 'C':
            color = 'green';
            text = '消费';
            break;
          case 'REFUND':
          case 'R':
            color = 'red';
            text = '退款';
            break;
          case 'CANCEL':
          case 'F':
            color = 'red';
            text = '撤销';
            break;
          default:
            text = TransactionTypeText[value as keyof typeof TransactionTypeText] || value;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '交易状态',
      dataIndex: 'txnStatus',
      width: 100,
      render: (value: string, record: CombinedRecord) => {
        const color = value === '1' ? 'success' : 'error';
        const text = value === '1' ? '成功' : value === '0' ? '失败' : '未知';
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  return (
    <PageContainer>
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
        toolBarRender={() => [
          <RangePicker
            key="dateRange"
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            allowClear={false}
          />,
          <Select
            key="recordType"
            placeholder="记录类型"
            value={recordType}
            onChange={setRecordType}
            style={{ width: 120 }}
            options={[
              { label: '全部', value: 'all' },
              { label: '授权记录', value: 'auth' },
              { label: '结算记录', value: 'settle' },
            ]}
          />,
          <Button
            key="sync"
            icon={<SyncOutlined />}
            onClick={() => setSyncModalOpen(true)}
          >
            同步数据
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>,
          <Button
            key="exportExcel"
            icon={<FileExcelOutlined />}
            onClick={() => handleExport('excel')}
            loading={exportLoading}
            type="primary"
          >
            导出Excel
          </Button>,
          <Button
            key="exportCsv"
            icon={<DownloadOutlined />}
            onClick={() => handleExport('csv')}
            loading={exportLoading}
          >
            导出CSV
          </Button>,
        ]}
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
                combinedRecords = transactions.map((record, index) => ({
                  ...record,
                  recordType: record.isSettled ? 'settle' as const : 'auth' as const,
                  id: `txn-${record.txnId}-${index}`,
                  // 映射字段名称以保持兼容性，确保数值类型
                  txnAmt: Number(record.authTxnAmt || record.finalAmt || 0),
                  billAmt: Number(record.authBillAmt || record.finalAmt || 0),
                  txnCcy: record.authTxnCcy || record.finalCcy,
                  billCcy: record.authBillCcy || record.finalCcy,
                  merchName: record.merchantName,
                  merchCtry: record.merchantCountry,
                  realCardId: record.cardId,
                  tradeNote: record.declineReason,
                  // 确保金额字段为数值类型
                  authBillAmt: Number(record.authBillAmt || 0),
                  settleBillAmt: Number(record.settleBillAmt || 0),
                  finalAmt: Number(record.finalAmt || 0),
                }));

                // 根据记录类型过滤
                if (recordType === 'auth') {
                  combinedRecords = combinedRecords.filter(record => !record.isSettled);
                } else if (recordType === 'settle') {
                  combinedRecords = combinedRecords.filter(record => record.isSettled);
                }
                // recordType === 'all' 时显示所有记录

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
