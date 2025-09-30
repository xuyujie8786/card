import React from 'react';
import {
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
} from '@ant-design/pro-components';
import { App } from 'antd';
import { request } from '@umijs/max';

interface CreateAdminFormProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  onSuccess: () => void;
}

const CreateAdminForm: React.FC<CreateAdminFormProps> = ({
  visible,
  onVisibleChange,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const handleSubmit = async (values: any) => {
    try {
      const response = await request('/users', {
        method: 'POST',
        data: {
          ...values,
          role: 'admin',
        },
      });

      if (response.success) {
        message.success('管理员创建成功');
        onVisibleChange(false);
        onSuccess();
        return true;
      } else {
        message.error(response.message || '创建失败');
        return false;
      }
    } catch (error) {
      message.error('创建失败');
      return false;
    }
  };

  return (
    <ModalForm
      title="创建管理员"
      width={500}
      open={visible}
      onOpenChange={onVisibleChange}
      onFinish={handleSubmit}
      modalProps={{
        destroyOnHidden: true,
      }}
    >
      <ProFormText
        name="username"
        label="用户名"
        placeholder="请输入用户名"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少3个字符' },
        ]}
      />

      <ProFormText.Password
        name="password"
        label="密码"
        placeholder="请输入密码"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少6个字符' },
        ]}
      />
    </ModalForm>
  );
};

export default CreateAdminForm;