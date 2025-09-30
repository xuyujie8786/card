import React from 'react';
import { ProForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, Space } from 'antd';
import { createUser, getAvailableParents } from '@/services/user';

interface CreateSubUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateSubUserForm: React.FC<CreateSubUserFormProps> = ({ onSuccess, onCancel }) => {
  return (
    <ProForm
      onFinish={async (values) => {
        await createUser({
          username: values.username,
          password: values.password,
          role: 'USER',
          status: 'ACTIVE',
          name: values.username, // 使用用户名作为姓名
          email: `${values.username}@user.local`, // 生成默认邮箱
          balance: 0, // 默认余额0
          currency: 'USD', // 默认币种
          parentId: values.parentId,
        });
        onSuccess();
      }}
      submitter={{
        render: (props, doms) => {
          return (
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={onCancel}>
                取消
              </Button>
              <Button type="primary" onClick={() => props.form?.submit?.()}>
                创建
              </Button>
            </Space>
          );
        },
      }}
    >
      <ProFormText
        name="username"
        label="用户名"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, max: 50, message: '用户名长度为3-50个字符' },
          { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
        ]}
        placeholder="请输入用户名"
        width="md"
      />
      
      <ProFormSelect
        name="parentId"
        label="上级账户"
        rules={[{ required: true, message: '请选择上级账户' }]}
        request={async () => {
          try {
            const response = await getAvailableParents();
            return response.data;
          } catch (error) {
            return [];
          }
        }}
        placeholder="请选择上级账户"
        width="md"
        showSearch
      />
      
      <ProFormText.Password
        name="password"
        label="登录密码"
        rules={[
          { required: true, message: '请输入登录密码' },
          { min: 6, message: '密码至少6位' }
        ]}
        placeholder="请输入登录密码"
        width="md"
      />
      
      <ProFormText.Password
        name="confirmPassword"
        label="确认密码"
        dependencies={['password']}
        rules={[
          { required: true, message: '请确认密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致'));
            },
          }),
        ]}
        placeholder="请再次输入密码"
        width="md"
      />
    </ProForm>
  );
};

export default CreateSubUserForm;
