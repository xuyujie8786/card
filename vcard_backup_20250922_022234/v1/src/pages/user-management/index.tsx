import React, { useRef, useState } from 'react';
import {
  ActionType,
  ProColumns,
  ProTable,
  PageContainer,
} from '@ant-design/pro-components';
import { 
  Button, 
  Tag, 
  Space, 
  Modal, 
  message, 
  Dropdown,
  MenuProps
} from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import CreateAdminForm from './components/CreateAdminForm';
import CreateSubUserForm from './components/CreateSubUserForm';
import BalanceOperationForm from './components/BalanceOperationForm';
import { getUserList, balanceOperation } from '@/services/user';

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  roleText: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  statusText: string;
  balance: number;
  currency: string;
  availableAmount: number;
  parent?: {
    id: number;
    username: string;
    name: string;
  };
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

const UserManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [createAdminVisible, setCreateAdminVisible] = useState(false);
  const [createSubUserVisible, setCreateSubUserVisible] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [balanceType, setBalanceType] = useState<'deposit' | 'withdraw'>('deposit');
  const [currentUser, setCurrentUser] = useState<UserListItem>();

  // 处理充值
  const handleDeposit = (record: UserListItem) => {
    setCurrentUser(record);
    setBalanceType('deposit');
    setBalanceVisible(true);
  };

  // 处理提现
  const handleWithdraw = (record: UserListItem) => {
    setCurrentUser(record);
    setBalanceType('withdraw');
    setBalanceVisible(true);
  };

  // 余额操作提交
  const handleBalanceSubmit = async (values: { amount: number; remark?: string }) => {
    if (!currentUser) return;

    try {
      await balanceOperation({
        userId: currentUser.id,
        type: balanceType,
        amount: values.amount,
        remark: values.remark,
      });
      
      message.success(`${balanceType === 'deposit' ? '充值' : '提现'}成功`);
      setBalanceVisible(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(`${balanceType === 'deposit' ? '充值' : '提现'}失败`);
    }
  };

  const columns: ProColumns<UserListItem>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      width: 120,
    },
    {
      title: '上级用户',
      dataIndex: ['parent', 'username'],
      width: 120,
      render: (text) => text ? <Tag>{text}</Tag> : '-',
    },
    {
      title: '总充值',
      dataIndex: 'balance',
      width: 120,
      render: (text, record) => `${record.currency} ${text.toLocaleString()}`,
      sorter: true,
      hideInSearch: true,
    },
    {
      title: '总消费',
      dataIndex: 'totalSpent',
      width: 120,
      render: (text, record) => `${record.currency} ${text.toLocaleString()}`,
      hideInSearch: true,
    },
    {
      title: '卡内余额',
      dataIndex: 'availableAmount',
      width: 120,
      render: (text, record) => `${record.currency} ${text.toLocaleString()}`,
      hideInSearch: true,
    },
    {
      title: '账户类型',
      dataIndex: 'role',
      width: 100,
      valueEnum: {
        SUPER_ADMIN: { text: '超级管理员', status: 'Error' },
        ADMIN: { text: '管理员', status: 'Warning' },
        USER: { text: '子账户', status: 'Default' },
      },
      filters: true,
      hideInTable: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 150,
      valueType: 'dateTime',
      sorter: true,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'edit',
            label: '编辑',
          },
          {
            key: 'balance-log',
            label: '资金记录',
          },
          {
            key: 'reset-password',
            label: '重置密码',
          },
          {
            key: 'status',
            label: record.status === 'ACTIVE' ? '暂停' : '激活',
          },
        ];

        return [
          <Button 
            key="recharge" 
            type="link" 
            size="small"
            onClick={() => handleDeposit(record)}
          >
            充值
          </Button>,
          <Button 
            key="withdraw" 
            type="link" 
            size="small"
            onClick={() => handleWithdraw(record)}
          >
            提现
          </Button>,
          <Dropdown
            key="more"
            menu={{ items }}
          >
            <Button type="link" size="small">
              更多 <DownOutlined />
            </Button>
          </Dropdown>,
        ];
      },
    },
  ];

  return (
    <PageContainer>
      <ProTable<UserListItem>
        headerTitle="用户管理"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => setCreateAdminVisible(true)}
          >
            <PlusOutlined /> 创建管理员
          </Button>,
          <Button
            key="sub"
            onClick={() => setCreateSubUserVisible(true)}
          >
            <PlusOutlined /> 创建子账号
          </Button>,
        ]}
        request={async (params, sort, filter) => {
          try {
            const response = await getUserList({
              current: params.current,
              pageSize: params.pageSize,
              username: params.username,
              role: params.role,
              status: params.status,
              ...filter,
            });
            return {
              data: response.data,
              success: true,
              total: response.total,
            };
          } catch (error) {
            message.error('获取用户列表失败');
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        columns={columns}
      />

      {/* 创建管理员弹窗 */}
      <Modal
        title="创建管理员"
        open={createAdminVisible}
        onCancel={() => setCreateAdminVisible(false)}
        footer={null}
        destroyOnClose
      >
        <CreateAdminForm
          onSuccess={() => {
            setCreateAdminVisible(false);
            actionRef.current?.reload();
            message.success('管理员创建成功');
          }}
          onCancel={() => setCreateAdminVisible(false)}
        />
      </Modal>

      {/* 创建子账户弹窗 */}
      <Modal
        title="创建子账号"
        open={createSubUserVisible}
        onCancel={() => setCreateSubUserVisible(false)}
        footer={null}
        destroyOnClose
      >
        <CreateSubUserForm
          onSuccess={() => {
            setCreateSubUserVisible(false);
            actionRef.current?.reload();
            message.success('子账号创建成功');
          }}
          onCancel={() => setCreateSubUserVisible(false)}
        />
      </Modal>

      {/* 余额操作弹窗 */}
      <Modal
        title={`${balanceType === 'deposit' ? '用户充值' : '用户提现'}`}
        open={balanceVisible}
        onCancel={() => setBalanceVisible(false)}
        footer={null}
        destroyOnClose
      >
        <BalanceOperationForm
          user={currentUser}
          type={balanceType}
          onSuccess={handleBalanceSubmit}
          onCancel={() => setBalanceVisible(false)}
        />
      </Modal>
    </PageContainer>
  );
};

export default UserManagement;
