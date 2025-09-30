/**
 * 账单审核页面
 * 专门用于审核D类型（授权撤销）和F类型（撤销）交易
 */
import React, { useState, useRef } from 'react';
import { Card, Row, Col, DatePicker, Button, message, Select, Statistic, Tag, Space, Typography, Modal, Progress } from 'antd';
import { ReloadOutlined, EyeOutlined, CheckOutlined, DollarOutlined, BankOutlined, RetweetOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import dayjs, { Dayjs } from 'dayjs';
import { formatBeijingTime, formatBeijingTimeWithSeconds } from '@/utils/time';
import { 
  getTransactions, 
  getStatementSummary,
  compensationRecharge,
  retryWithdrawal,
  freePass
} from '@/services/transaction';
import type { 
  StatementSummary,
  TransactionQueryParams,
  TransactionRecord 
} from '@/types/transaction';
import { 
  TransactionStatusText, 
  TransactionTypeText 
} from '@/types/transaction';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface AuditRecord extends TransactionRecord {
  recordType?: 'auth' | 'settle';
  // 兼容旧字段名
  merchName?: string;
  merchCtry?: string;
}

const AuditPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // 获取汇总数据
  const fetchSummary = async (startDate: string, endDate: string) => {
    try {
      const result = await getStatementSummary(startDate, endDate);
      setSummary(result);
    } catch (error) {
      console.error('获取汇总数据失败:', error);
    }
  };

  // 日期范围改变
  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    if (dates) {
      setDateRange(dates);
      const [start, end] = dates;
      fetchSummary(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
      actionRef.current?.reload();
    }
  };

  // 补偿充值操作
  const handleCompensationRecharge = (record: AuditRecord) => {
    Modal.confirm({
      title: '确认执行补偿充值？',
      content: (
        <div>
          <p><strong>交易ID:</strong> {record.txnId}</p>
          <p><strong>卡号:</strong> {record.cardId}</p>
          <p><strong>类型:</strong> {record.txnType === 'D' || record.txnType === 'AUTH_CANCEL' ? '授权撤销' : '失败交易'}</p>
          <p><strong>金额:</strong> {record.finalCcy} {record.finalAmt}</p>
          <p><strong>商户:</strong> {record.merchantName || record.merchName}</p>
          <p style={{ color: '#ff4d4f', marginTop: 16 }}>
            <strong>操作说明：</strong>
          </p>
          <ul style={{ color: '#ff4d4f', margin: 0 }}>
            <li>调用卡商API给该卡充值相应的金额</li>
            <li>将该账单的交易类型改为撤销（F类型）</li>
            <li>将该账单数据库的授权时间改为当前时间</li>
            <li>交易进程变为已经平账</li>
          </ul>
        </div>
      ),
      onOk: async () => {
        try {
          const loadingMessage = message.loading('正在执行补偿充值...', 0);
          
          const result = await compensationRecharge(record.txnId);
          
          loadingMessage();
          
          if (result.success) {
            message.success('补偿充值操作执行成功');
            actionRef.current?.reload();
          } else {
            message.error(`补偿充值操作失败: ${result.error?.message || '未知错误'}`);
          }
        } catch (error) {
          message.error(`补偿充值操作失败: ${error}`);
        }
      },
    });
  };

  // 重试提现操作
  const handleRetryWithdrawal = (record: AuditRecord) => {
    Modal.confirm({
      title: '确认重试提现？',
      content: (
        <div>
          <p><strong>交易ID:</strong> {record.txnId}</p>
          <p><strong>卡号:</strong> {record.cardId}</p>
          <p><strong>金额:</strong> {record.finalCcy} {record.finalAmt}</p>
          <p><strong>商户:</strong> {record.merchantName || record.merchName}</p>
          <p style={{ color: '#faad14', marginTop: 16 }}>
            将重新调用卡商API进行提现操作
          </p>
        </div>
      ),
      onOk: async () => {
        try {
          const loadingMessage = message.loading('正在重试提现...', 0);
          
          const result = await retryWithdrawal(record.txnId);
          
          loadingMessage();
          
          if (result.success) {
            if (result.data?.alreadyWithdrawn) {
              message.info('该交易已经提现成功，无需重试');
            } else {
              message.success('重试提现操作执行成功');
            }
            actionRef.current?.reload();
          } else {
            message.error(`重试提现操作失败: ${result.error?.message || '未知错误'}`);
          }
        } catch (error) {
          message.error(`重试提现操作失败: ${error}`);
        }
      },
    });
  };

  // 无偿通过操作
  const handleFreePass = (record: AuditRecord) => {
    Modal.confirm({
      title: '确认无偿通过？',
      content: (
        <div>
          <p><strong>交易ID:</strong> {record.txnId}</p>
          <p><strong>卡号:</strong> {record.cardId}</p>
          <p><strong>类型:</strong> {record.txnType === 'D' || record.txnType === 'AUTH_CANCEL' ? '授权撤销' : '失败交易'}</p>
          <p><strong>金额:</strong> {record.finalCcy} {record.finalAmt}</p>
          <p><strong>商户:</strong> {record.merchantName || record.merchName}</p>
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
            <p style={{ margin: 0, color: '#52c41a' }}>
              <strong>操作说明：</strong>
            </p>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, color: '#52c41a' }}>
              <li>将交易类型改为撤销（F）</li>
              <li>将授权时间改为当前北京时间</li>
              <li>设置为已平账状态</li>
            </ul>
          </div>
        </div>
      ),
      onOk: async () => {
        try {
          const loadingMessage = message.loading('正在执行无偿通过...', 0);
          
          const result = await freePass(record.txnId);
          
          loadingMessage();
          
          if (result.success) {
            message.success('无偿通过操作执行成功');
            actionRef.current?.reload();
          } else {
            message.error(`无偿通过操作失败: ${result.error?.message || '未知错误'}`);
          }
        } catch (error) {
          message.error(`无偿通过操作失败: ${error}`);
        }
      },
    });
  };

  // 查看详情
  const handleViewDetail = (record: AuditRecord) => {
    Modal.info({
      title: '交易详情',
      width: 800,
      content: (
        <div>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <p><strong>交易ID:</strong> {record.txnId}</p>
              <p><strong>卡号:</strong> {record.cardId}</p>
              <p><strong>用户名:</strong> {record.username}</p>
              <p><strong>交易类型:</strong> 
                <Tag color={record.txnType === 'D' || record.txnType === 'AUTH_CANCEL' ? 'orange' : 'red'}>
                  {record.txnType === 'D' || record.txnType === 'AUTH_CANCEL' ? '授权撤销' : '失败交易'}
                </Tag>
              </p>
              <p><strong>交易状态:</strong> 
                <Tag color={record.txnStatus === '1' ? 'success' : 'error'}>
                  {record.txnStatus === '1' ? '成功' : '失败'}
                </Tag>
              </p>
            </Col>
            <Col span={12}>
              <p><strong>最终金额:</strong> {record.finalCcy} {record.finalAmt}</p>
              <p><strong>商户名称:</strong> {record.merchantName || record.merchName}</p>
              <p><strong>商户国家:</strong> {record.merchantCountry || record.merchCtry}</p>
              <p><strong>MCC:</strong> {record.mcc}</p>
              <p><strong>交易时间:</strong> {formatBeijingTimeWithSeconds(record.txnTime)}</p>
            </Col>
          </Row>
          {record.declineReason && (
            <Row>
              <Col span={24}>
                <p><strong>拒绝原因:</strong> {record.declineReason}</p>
              </Col>
            </Row>
          )}
          {record.originTxnId && record.originTxnId !== '0' && (
            <Row>
              <Col span={24}>
                <p><strong>原始交易ID:</strong> {record.originTxnId}</p>
              </Col>
            </Row>
          )}
        </div>
      ),
    });
  };

  // 表格列定义
  const columns: ProColumns<AuditRecord>[] = [
    {
      title: '卡号',
      dataIndex: 'cardId',
      width: 180,
      ellipsis: true,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 120,
    },
    {
      title: '交易类型',
      dataIndex: 'txnType',
      width: 120,
      render: (value: string) => {
        let color = 'default';
        let text = value;
        
        switch (value) {
          case 'D':
          case 'AUTH_CANCEL':
            color = 'orange';
            text = '授权撤销';
            break;
          case 'F':
          case 'CANCEL':
            color = 'red';
            text = '撤销交易';
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
      render: (value: string) => {
        const color = value === '1' ? 'success' : 'error';
        const text = value === '1' ? '成功' : '失败';
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '最终金额',
      dataIndex: 'finalAmt',
      width: 120,
      render: (value: number, record: AuditRecord) => (
        <span style={{ 
          color: value < 0 ? '#ff4d4f' : '#52c41a',
          fontWeight: 'bold'
        }}>
          {record.finalCcy} {value}
        </span>
      ),
      sorter: true,
    },
    {
      title: '商户名称',
      dataIndex: 'merchantName',
      width: 200,
      ellipsis: true,
      render: (value: string, record: AuditRecord) => {
        const merchantName = value || record.merchName;
        return merchantName || '-';
      },
    },
    {
      title: '交易时间',
      dataIndex: 'txnTime',
      width: 170,
      render: (value: string) => {
        return formatBeijingTime(value);
      },
      sorter: true,
    },
    {
      title: '交易进程',
      dataIndex: 'withdrawalStatus',
      width: 120,
      render: (status: string, record: AuditRecord) => {
        // 只有D类型（授权撤销）交易才显示提现进程
        if (record.txnType !== 'D' && record.txnType !== 'AUTH_CANCEL') {
          return '-';
        }

        switch (status) {
          case 'SUCCESS':
            return (
              <Button
                type="primary"
                size="small"
                icon={<BankOutlined />}
                style={{ 
                  backgroundColor: '#52c41a',
                  borderColor: '#52c41a'
                }}
              >
                已提现
              </Button>
            );
          case 'FAILED':
            return <Tag color="red">提现失败</Tag>;
          case 'PENDING':
            return (
              <Space direction="vertical" size={0}>
                <Progress size="small" percent={50} showInfo={false} />
                <span style={{ fontSize: '12px', color: '#999' }}>提现中</span>
              </Space>
            );
          default:
            return <Tag color="orange">待提现</Tag>;
        }
      },
    },
    {
      title: '操作',
      width: 280,
      fixed: 'right',
      render: (_, record: AuditRecord) => {
        // 根据提现状态显示不同的按钮
        const isWithdrawn = record.withdrawalStatus === 'SUCCESS';
        const isWithdrawFailed = record.withdrawalStatus === 'FAILED';
        const isWithdrawPending = record.withdrawalStatus === 'PENDING';
        
        return (
          <Space>
            {/* 无偿通过按钮 */}
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleFreePass(record)}
              style={{ color: '#52c41a' }}
            >
              无偿通过
            </Button>
            
            {/* 补偿充值按钮 - 只在未成功提现时显示 */}
            {!isWithdrawn && (
              <Button
                type="link"
                size="small"
                icon={<DollarOutlined />}
                onClick={() => handleCompensationRecharge(record)}
                style={{ color: '#1890ff' }}
              >
                补偿充值
              </Button>
            )}
            
            {/* 重试提现按钮 - 只在提现失败或待提现时显示 */}
            {(isWithdrawFailed || (!isWithdrawn && !isWithdrawPending)) && (
              <Button
                type="link"
                size="small"
                icon={<RetweetOutlined />}
                onClick={() => handleRetryWithdrawal(record)}
                style={{ color: '#faad14' }}
              >
                重试提现
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer>
      {/* 汇总统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核交易"
              value={summary?.authSummary?.totalTransactions || 0}
              suffix="笔"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="撤销交易金额"
              value={summary?.authSummary?.totalAmount || 0}
              precision={2}
              suffix="USD"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败交易数"
              value={summary?.authSummary?.failedCount || 0}
              suffix="笔"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="涉及卡片"
              value={summary?.cardCount || 0}
              suffix="张"
            />
          </Card>
        </Col>
      </Row>

      {/* 交易记录表格 */}
      <Card>
        <ProTable<AuditRecord>
          headerTitle={
            <Space>
              <Title level={4} style={{ margin: 0 }}>账单审核</Title>
              <Text type="secondary">仅显示授权撤销(D)和撤销交易(F)</Text>
            </Space>
          }
          actionRef={actionRef}
          rowKey="id"
          search={false}
          toolBarRender={() => [
            <Space key="toolbar">
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="YYYY-MM-DD"
                allowClear={false}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  actionRef.current?.reload();
                  if (dateRange) {
                    fetchSummary(
                      dateRange[0].format('YYYY-MM-DD'),
                      dateRange[1].format('YYYY-MM-DD')
                    );
                  }
                }}
              >
                刷新
              </Button>
            </Space>
          ]}
          request={async (params, sort, filter) => {
            setLoading(true);
            try {
              const queryParams: TransactionQueryParams = {
                startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
                endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
                current: params.current || 1,
                pageSize: params.pageSize || 20,
                // 只查询D和F类型的交易
                txnType: 'D,F'
              };

              const result = await getTransactions(queryParams);
              
              return {
                data: result.data?.data || [],
                success: true,
                total: result.data?.pagination?.total || 0,
              };
            } catch (error) {
              message.error(`查询失败: ${error}`);
              return {
                data: [],
                success: false,
                total: 0,
              };
            } finally {
              setLoading(false);
            }
          }}
          columns={columns}
          rowSelection={false}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
          size="small"
        />
      </Card>
    </PageContainer>
  );
};

export default AuditPage;
