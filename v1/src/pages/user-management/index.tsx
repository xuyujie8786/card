import React, { useState, useRef } from 'react';
import {
  PageContainer,
  ProTable,
  ProColumns,
  ActionType,
  ProDescriptionsItemProps,
  ProDescriptions,
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {
  Button,
  Tag,
  Space,
  Popconfirm,
  Drawer,
  Card,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Dropdown,
  Menu,
  App,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DollarOutlined,
  UserAddOutlined,
  SettingOutlined,
  KeyOutlined,
  SafetyOutlined,
  LinkOutlined,
  MoreOutlined,
  CheckOutlined,
  ArrowDownOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { request, useModel } from '@umijs/max';
import type { UserResponse as User } from '@/services/user';
import CreateSubUserForm from './components/CreateSubUserForm';
import CreateAdminForm from './components/CreateAdminForm';
import BalanceOperationForm from './components/BalanceOperationForm';
import { adminResetPassword, adminReset2FA, generatePasswordlessLogin } from '@/services/user';

const { Option } = Select;

const UserManagement: React.FC = () => {
  const { message, modal } = App.useApp();
  const [createSubUserVisible, setCreateSubUserVisible] = useState(false);
  const [createAdminVisible, setCreateAdminVisible] = useState(false);
  const [balanceOperationVisible, setBalanceOperationVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<User>();
  const [selectedOperation, setSelectedOperation] = useState<'deposit' | 'withdraw'>('deposit');
  const actionRef = useRef<ActionType>(null);
  const [editForm] = Form.useForm();

  // 获取当前用户信息
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  // 获取用户列表
  const fetchUsers = async (params: any) => {
    try {
      const response = await request('/users', {
        method: 'GET',
        params: {
          current: params.current,
          pageSize: params.pageSize,
          username: params.username,
          email: params.email,
          role: params.role,
          status: params.status,
        },
      });

      if (response.success) {
        return {
          data: response.data,
          success: true,
          total: response.total,
        };
      }
      throw new Error(response.message);
    } catch (error) {
      message.error('获取用户列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 删除用户
  const handleDelete = async (id: number) => {
    try {
      const response = await request(`/users/${id}`, {
        method: 'DELETE',
      });

      if (response.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 更新用户状态
  const handleStatusChange = async (id: number, status: string) => {
    try {
      const response = await request(`/users/${id}`, {
        method: 'PUT',
        data: { status },
      });

      if (response.success) {
        message.success('状态更新成功');
        actionRef.current?.reload();
      } else {
        message.error(response.message || '状态更新失败');
      }
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  // 编辑用户
  const handleEdit = async (values: any) => {
    try {
      const response = await request(`/users/${currentRow?.id}`, {
        method: 'PUT',
        data: values,
      });

      if (response.success) {
        message.success('更新成功');
        setEditVisible(false);
        actionRef.current?.reload();
      } else {
        message.error(response.message || '更新失败');
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 资金操作
  const handleBalanceOperation = (record: User, operation: 'deposit' | 'withdraw') => {
    setCurrentRow(record);
    setSelectedOperation(operation);
    setBalanceOperationVisible(true);
  };

  // 查看详情
  const handleViewDetail = (record: User) => {
    setCurrentRow(record);
    setDetailVisible(true);
  };

  // 编辑用户信息
  const handleEditUser = (record: User) => {
    setCurrentRow(record);
    editForm.setFieldsValue({
      name: record.name,
      email: record.email,
      role: record.role.toLowerCase(),
      status: record.status.toLowerCase(),
    });
    setEditVisible(true);
  };

  // 重置密码
  const handleResetPassword = async (record: User) => {
    modal.confirm({
      title: '重置密码',
      content: (
        <div>
          <p>确定要重置用户 <strong>{record.username}</strong> 的密码吗？</p>
          <Input.Password
            placeholder="请输入新密码（至少6个字符）"
            id="newPassword"
            style={{ marginTop: 10 }}
          />
        </div>
      ),
      onOk: async () => {
        const newPassword = (document.getElementById('newPassword') as HTMLInputElement)?.value;
        if (!newPassword || newPassword.length < 6) {
          message.error('新密码至少6个字符');
          return;
        }
        
        try {
          const response = await adminResetPassword(record.id, newPassword);
          if (response.success) {
            message.success('密码重置成功');
          } else {
            message.error(response.message || '重置密码失败');
          }
        } catch (error) {
          message.error('重置密码失败');
        }
      },
    });
  };

  // 重置2FA
  const handleReset2FA = async (record: User) => {
    modal.confirm({
      title: '重置2FA',
      content: `确定要重置用户 ${record.username} 的2FA设置吗？`,
      onOk: async () => {
        try {
          const response = await adminReset2FA(record.id);
          if (response.success) {
            message.success('2FA重置成功');
          } else {
            message.error(response.message || '重置2FA失败');
          }
        } catch (error) {
          message.error('重置2FA失败');
        }
      },
    });
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  // 生成免密登录链接
  const handleGeneratePasswordlessLogin = async (record: User) => {
    try {
      const response = await generatePasswordlessLogin(record.id);
      if (response.success) {
        const loginUrl = response.data.loginUrl;
        modal.info({
          title: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LinkOutlined style={{ color: '#1890ff' }} />
              <span>免密登录链接</span>
            </div>
          ),
          content: (
            <div>
              <p>用户 <strong>{record.username}</strong> 的免密登录链接：</p>
              <div style={{ position: 'relative', marginTop: 10 }}>
                <Input.TextArea
                  value={loginUrl}
                  rows={3}
                  readOnly
                  style={{ paddingRight: 40 }}
                />
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                  onClick={() => copyToClipboard(loginUrl)}
                  title="复制链接"
                />
              </div>
              <p style={{ marginTop: 10, color: '#666' }}>
                有效期：{response.data.validFor}
              </p>
              <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6f8fa', borderRadius: 6 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
                  💡 提示：将此链接发送给用户，用户点击后可直接登录，无需输入密码。
                </p>
              </div>
            </div>
          ),
          width: 650,
          okText: '关闭',
        });
      } else {
        message.error(response.message || '生成免密登录链接失败');
      }
    } catch (error) {
      message.error('生成免密登录链接失败');
    }
  };

  const columns: ProColumns<User>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      valueType: 'select',
      valueEnum: {
        super_admin: { text: '超级管理员', status: 'Error' },
        admin: { text: '管理员', status: 'Warning' },
        user: { text: '用户', status: 'Success' },
      },
      render: (_, record) => {
        const roleMap = {
          SUPER_ADMIN: { text: '超级管理员', color: 'red' },
          ADMIN: { text: '管理员', color: 'orange' },
          USER: { text: '用户', color: 'green' },
        };
        const role = roleMap[record.role as keyof typeof roleMap];
        return <Tag color={role?.color}>{role?.text}</Tag>;
      },
    },
    {
      title: '总充值',
      dataIndex: 'totalRecharge',
      width: 120,
      search: false,
      render: (_, record) => (
        <span>
          {record.totalRecharge || 0} USD
        </span>
      ),
    },
    {
      title: '总消费',
      dataIndex: 'totalConsumption',
      width: 120,
      search: false,
      render: (_, record) => (
        <span>
          {record.totalConsumption || 0} USD
        </span>
      ),
    },
    {
      title: '卡内锁定',
      dataIndex: 'cardLocked',
      width: 120,
      search: false,
      render: (_, record) => (
        <span>
          {record.cardLocked || 0} USD
        </span>
      ),
    },
    {
      title: '可用余额',
      dataIndex: 'availableAmount',
      width: 120,
      search: false,
      render: (_, record) => (
        <span>
          {record.availableAmount || 0} USD
        </span>
      ),
    },
    {
      title: '上级用户',
      dataIndex: 'parent',
      width: 120,
      search: false,
      render: (_, record) => record.parent?.username || '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 280,
      render: (text, record) => [
        <Button
          key="deposit"
          type="link"
          size="small"
          icon={<DollarOutlined />}
          onClick={() => handleBalanceOperation(record, 'deposit')}
        >
          充值
        </Button>,
        <Button
          key="withdraw"
          type="link"
          size="small"
          icon={<DollarOutlined />}
          onClick={() => handleBalanceOperation(record, 'withdraw')}
        >
          提现
        </Button>,
        <Dropdown
          key="more"
          menu={{
            items: [
              {
                key: 'reset-password',
                icon: <KeyOutlined />,
                label: '重置密码',
                onClick: () => handleResetPassword(record),
              },
              {
                key: 'reset-2fa',
                icon: <SafetyOutlined />,
                label: '重置2FA',
                onClick: () => handleReset2FA(record),
              },
              {
                key: 'passwordless-login',
                icon: <LinkOutlined />,
                label: '免密登录',
                onClick: () => handleGeneratePasswordlessLogin(record),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="link" size="small" icon={<MoreOutlined />}>
            更多
          </Button>
        </Dropdown>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<User>
        headerTitle="用户管理"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => {
          const buttons = [];
          
          // 只有超级管理员才能创建子账户和管理员
          if (currentUser?.role === 'SUPER_ADMIN') {
            buttons.push(
              <Button
                type="primary"
                key="primary"
                icon={<UserAddOutlined />}
                onClick={() => setCreateSubUserVisible(true)}
              >
                创建子账户
              </Button>,
              <Button
                key="admin"
                icon={<SettingOutlined />}
                onClick={() => setCreateAdminVisible(true)}
              >
                创建管理员
              </Button>
            );
          }
          
          return buttons;
        }}
        request={fetchUsers}
        columns={columns}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
      />

      {/* 用户详情抽屉 */}
      <Drawer
        width={600}
        title="用户详情"
        placement="right"
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
      >
        {currentRow && (
          <ProDescriptions<User>
            column={1}
            title={currentRow.name}
            request={async () => ({
              data: currentRow || {},
            })}
            params={{
              id: currentRow?.id,
            }}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
              },
              {
                title: '用户名',
                dataIndex: 'username',
              },
              {
                title: '姓名',
                dataIndex: 'name',
              },
              {
                title: '邮箱',
                dataIndex: 'email',
              },
              {
                title: '角色',
                dataIndex: 'role',
                render: (_, record) => {
                  const roleMap = {
                    SUPER_ADMIN: { text: '超级管理员', color: 'red' },
                    ADMIN: { text: '管理员', color: 'orange' },
                    USER: { text: '用户', color: 'green' },
                  };
                  const role = roleMap[record.role as keyof typeof roleMap];
                  return <Tag color={role?.color}>{role?.text}</Tag>;
                },
              },
              {
                title: '状态',
                dataIndex: 'status',
                render: (_, record) => {
                  const statusMap = {
                    ACTIVE: { text: '活跃', color: 'green' },
                    INACTIVE: { text: '未激活', color: 'default' },
                    SUSPENDED: { text: '已停用', color: 'red' },
                  };
                  const status = statusMap[record.status as keyof typeof statusMap];
                  return <Tag color={status?.color}>{status?.text}</Tag>;
                },
              },
              {
                title: '余额',
                dataIndex: 'balance',
                render: (_, record) => `${record.balance} ${record.currency}`,
              },
              {
                title: '上级用户',
                dataIndex: 'parent',
                render: (_, record) => record.parent?.name || '-',
              },
              {
                title: '创建时间',
                dataIndex: 'createdAt',
                valueType: 'dateTime',
              },
              {
                title: '更新时间',
                dataIndex: 'updatedAt',
                valueType: 'dateTime',
              },
            ]}
          />
        )}
      </Drawer>

      {/* 编辑用户模态框 */}
      <Modal
        title="编辑用户"
        open={editVisible}
        onOk={() => editForm.submit()}
        onCancel={() => setEditVisible(false)}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="user">用户</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">活跃</Option>
              <Option value="inactive">未激活</Option>
              <Option value="suspended">已停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建子用户表单 */}
      <CreateSubUserForm
        visible={createSubUserVisible}
        onVisibleChange={setCreateSubUserVisible}
        onSuccess={() => {
          actionRef.current?.reload();
        }}
      />

      {/* 创建管理员表单 */}
      <CreateAdminForm
        visible={createAdminVisible}
        onVisibleChange={setCreateAdminVisible}
        onSuccess={() => {
          actionRef.current?.reload();
        }}
      />

      {/* 资金操作表单 */}
      <BalanceOperationForm
        visible={balanceOperationVisible}
        onVisibleChange={setBalanceOperationVisible}
        user={currentRow}
        operation={selectedOperation}
        onSuccess={() => {
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default UserManagement;