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
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import {
  FileTextOutlined,
  PlusOutlined,
  MinusOutlined,
  DollarOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import dayjs from 'dayjs';
import { formatBeijingTime } from '@/utils/time';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

// 操作类型枚举
enum OperationType {
  CREATE_CARD = 'CREATE_CARD',
  DELETE_CARD = 'DELETE_CARD',
  RECHARGE = 'RECHARGE',
  WITHDRAW = 'WITHDRAW',
  FREEZE = 'FREEZE',
  UNFREEZE = 'UNFREEZE',
}

// 卡状态枚举
enum CardStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  RELEASED = 'released',
}

// 操作类型配置
const operationTypeConfig = {
  // 大写版本
  [OperationType.CREATE_CARD]: {
    text: '开卡',
    color: 'success',
    icon: <PlusOutlined />,
  },
  [OperationType.DELETE_CARD]: {
    text: '删卡',
    color: 'error',
    icon: <DeleteOutlined />,
  },
  [OperationType.RECHARGE]: {
    text: '充值',
    color: 'processing',
    icon: <DollarOutlined />,
  },
  [OperationType.WITHDRAW]: {
    text: '提现',
    color: 'warning',
    icon: <MinusOutlined />,
  },
  [OperationType.FREEZE]: {
    text: '冻结',
    color: 'default',
    icon: <LockOutlined />,
  },
  [OperationType.UNFREEZE]: {
    text: '解冻',
    color: 'cyan',
    icon: <UnlockOutlined />,
  },
  // 小写版本和其他变体
  'create_card': {
    text: '开卡',
    color: 'success',
    icon: <PlusOutlined />,
  },
  'delete_card': {
    text: '删卡',
    color: 'error',
    icon: <DeleteOutlined />,
  },
  'delete': {
    text: '删卡',
    color: 'error',
    icon: <DeleteOutlined />,
  },
  'recharge': {
    text: '充值',
    color: 'processing',
    icon: <DollarOutlined />,
  },
  'withdraw': {
    text: '提现',
    color: 'warning',
    icon: <MinusOutlined />,
  },
  'freeze': {
    text: '冻结',
    color: 'default',
    icon: <LockOutlined />,
  },
  'unfreeze': {
    text: '解冻',
    color: 'cyan',
    icon: <UnlockOutlined />,
  },
  'update_remark': {
    text: '修改备注',
    color: 'default',
    icon: <FileTextOutlined />,
  },
  'UPDATE_REMARK': {
    text: '修改备注',
    color: 'default',
    icon: <FileTextOutlined />,
  },
};

// 卡状态配置
const cardStatusConfig = {
  [CardStatus.ACTIVE]: {
    text: '正常',
    color: 'success',
  },
  [CardStatus.FROZEN]: {
    text: '冻结',
    color: 'warning',
  },
  [CardStatus.RELEASED]: {
    text: '已释放',
    color: 'default',
  },
};

interface OperationLogItem {
  id: number;
  cardId: string;
  cardNo: string;
  operationType: OperationType;
  amount: string;
  currency: string;
  operatorId: number;
  operatorName: string;
  description?: string;
  cardStatus: CardStatus;
  createdAt: string;
}


const OperationLogs: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);


  // 表格列定义
  const columns: ProColumns<OperationLogItem>[] = [
    {
      title: '卡号',
      dataIndex: 'cardNo',
      key: 'cardNo',
      width: 180,
      copyable: true,
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text}</span>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 120,
      valueType: 'select',
      valueEnum: Object.entries(operationTypeConfig).reduce(
        (acc, [key, config]) => {
          acc[key] = {
            text: config.text,
            status: config.color,
          };
          return acc;
        },
        {} as any
      ),
      render: (_, record) => {
        const config = operationTypeConfig[record.operationType] || {
          text: record.operationType,
          color: 'default',
        };
        return (
          <Tag>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      search: false, // 禁用搜索
      render: (amount, record) => {
        const numAmount = parseFloat(String(amount));
        return (
          <span>
            {numAmount > 0 ? '+' : ''}
            {numAmount.toFixed(2)} {record.currency}
          </span>
        );
      },
    },
    {
      title: '操作员',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 120,
      search: false, // 禁用搜索
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
      search: false, // 禁用搜索
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      valueType: 'dateTime',
      search: false, // 禁用搜索
      render: (text, record) => {
        // 优先使用record中的createdAt字段
        const timeValue = record?.createdAt || text;
        
        if (!timeValue) return '-';
        
        // 更健壮的时间解析
        try {
          // 如果是字符串，直接解析
          if (typeof timeValue === 'string') {
            const date = dayjs(timeValue);
            return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : '-';
          }
          
          // 如果是对象，尝试提取时间
          if (typeof timeValue === 'object' && timeValue !== null) {
            // 可能是Date对象
            if (timeValue instanceof Date) {
              return dayjs(timeValue).format('YYYY-MM-DD HH:mm:ss');
            }
            
            // 可能是dayjs对象 - 使用any类型避免TypeScript错误
            const anyValue = timeValue as any;
            if (anyValue.format && typeof anyValue.format === 'function') {
              return anyValue.format('YYYY-MM-DD HH:mm:ss');
            }
            
            // 尝试转换为字符串
            const timeStr = String(timeValue);
            if (timeStr && timeStr !== '[object Object]') {
              const date = dayjs(timeStr);
              return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : '-';
            }
          }
          
          // 如果都失败了，转换为字符串再解析
          const timeStr = String(timeValue);
          const date = dayjs(timeStr);
          return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : '-';
        } catch (error) {
          console.error('时间解析错误:', error, 'text:', text);
          return '-';
        }
      },
    },
  ];

  // 获取操作记录列表
  const fetchOperationLogs = async (params: any) => {
    try {
      const response = await request('/operation-logs', {
        params: {
          current: params.current,
          pageSize: params.pageSize,
          cardNo: params.cardNo,
          operationType: params.operationType,
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
        },
      });

      if (response.success) {
        return {
          data: response.data,
          total: response.total,
          success: true,
        };
      }
      return {
        data: [],
        total: 0,
        success: false,
      };
    } catch (error) {
      console.error('获取操作记录失败:', error);
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  };


  return (
    <PageContainer
      header={{
        title: '操作记录',
        subTitle: '记录所有卡片相关操作的详细信息',
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
      <ProTable<OperationLogItem>
        headerTitle="操作记录列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
          defaultCollapsed: false,
        }}
        toolBarRender={() => [
          <Space key="toolbar">
            <FileTextOutlined />
            <span>仅显示指定时间范围内的操作记录</span>
          </Space>,
        ]}
        request={fetchOperationLogs}
        columns={columns}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        scroll={{ x: 1200 }}
        options={{
          reload: true,
          density: false,
          setting: false,
        }}
      />
    </PageContainer>
  );
};

export default OperationLogs;
