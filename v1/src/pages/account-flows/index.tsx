import React, { useState, useRef } from 'react';
import {
  PageContainer,
  ProTable,
  ActionType,
  ProColumns,
} from '@ant-design/pro-components';
import {
  Tag,
  DatePicker,
  message,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { 
  getAccountFlows, 
  AccountFlow,
  AccountOperationType
} from '@/services/account-flow';

const { RangePicker } = DatePicker;


// 操作类型配置
const operationTypeConfig: Record<AccountOperationType, { text: string; color: string; icon: React.ReactNode; description: string; }> = {
  [AccountOperationType.RECHARGE]: {
    text: '充值',
    color: 'green',
    icon: <ArrowDownOutlined />,
    description: '充值操作',
  },
  [AccountOperationType.WITHDRAW]: {
    text: '提现',
    color: 'red',
    icon: <ArrowUpOutlined />,
    description: '提现操作',
  },
  [AccountOperationType.CARD_RECHARGE]: {
    text: '卡片充值',
    color: 'blue',
    icon: <ArrowDownOutlined />,
    description: '卡片充值操作',
  },
  [AccountOperationType.CARD_WITHDRAW]: {
    text: '卡片提现',
    color: 'orange',
    icon: <ArrowUpOutlined />,
    description: '卡片提现操作',
  },
  [AccountOperationType.CARD_CREATE]: {
    text: '创建卡片',
    color: 'purple',
    icon: <ArrowDownOutlined />,
    description: '创建卡片操作',
  },
  [AccountOperationType.SYSTEM_ADJUST]: {
    text: '系统调整',
    color: 'default',
    icon: <ArrowUpOutlined />,
    description: '系统调整操作',
  },
};


const AccountFlowsPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  // 默认选择最近一周的时间范围
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);

  // 表格列定义
  const columns: ProColumns<AccountFlow>[] = [
    {
      title: '流水ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      search: false,
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 120,
      render: (_, record) => {
        const config = operationTypeConfig[record.operationType];
        if (!config) {
          return <Tag>{record.operationType}</Tag>;
        }
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(operationTypeConfig).map(([key, value]) => [key, value.text])
      ),
    },
    {
      title: '操作员',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 120,
      render: (_, record) => record.operator?.username || record.operatorName || '未知用户',
      search: false,
    },
    {
      title: '金额变动',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (_, record) => {
        // 确保 amount 是数字类型
        const amount = typeof record.amount === 'number' ? record.amount : parseFloat(record.amount || '0');
        const isPositive = amount > 0;
        return (
          <span>
            {isPositive ? '+' : ''}{amount.toFixed(2)} {record.currency}
          </span>
        );
      },
      search: false,
    },
    {
      title: '操作对象',
      key: 'targetUser',
      width: 120,
      render: (_, record) => record.targetUser?.username || record.targetName || '未知用户',
      search: false,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
      search: false,
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text) => dayjs(text as string).format('YYYY-MM-DD HH:mm:ss'),
      search: false,
    },
  ];

  return (
    <PageContainer
      header={{
        title: '账户流水',
        subTitle: '查看账户资金变动记录',
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
      {/* 流水表格 */}
      <ProTable<AccountFlow>
        headerTitle="账户流水记录"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => []}
        request={async (params) => {
          try {
            const requestParams: any = {
              current: params.current || 1,
              pageSize: params.pageSize || 20,
            };

            if (dateRange) {
              requestParams.startDate = dateRange[0].format('YYYY-MM-DD');
              requestParams.endDate = dateRange[1].format('YYYY-MM-DD');
            }

            const response = await getAccountFlows(requestParams);

            if (response.code === 200 && response.data) {
              return {
                data: response.data.data,
                success: true,
                total: response.data.total,
              };
            }
            return {
              data: [],
              success: false,
              total: 0,
            };
          } catch (error) {
            console.error('获取账户流水失败:', error);
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
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
        }}
        options={{
          density: false,
          setting: false,
        }}
        scroll={{ x: 1200 }}
      />
    </PageContainer>
  );
};

export default AccountFlowsPage;
