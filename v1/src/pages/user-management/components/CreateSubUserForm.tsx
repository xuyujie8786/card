import React, { useState, useEffect } from 'react';
import {
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
} from '@ant-design/pro-components';
import { App } from 'antd';
import { request } from '@umijs/max';

interface CreateSubUserFormProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  onSuccess: () => void;
}

interface ParentOption {
  label: string;
  value: number;
}

const CreateSubUserForm: React.FC<CreateSubUserFormProps> = ({
  visible,
  onVisibleChange,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);

  // 获取可用的上级账户选项
  const fetchParentOptions = async () => {
    try {
      const response = await request('/users/parents', {
        method: 'GET',
      });

      if (response.success) {
        setParentOptions(response.data);
      }
    } catch (error) {
      console.error('获取上级账户选项失败:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchParentOptions();
    }
  }, [visible]);

  const handleSubmit = async (values: any) => {
    try {
      const response = await request('/users', {
        method: 'POST',
        data: {
          ...values,
          role: 'user',
        },
      });

      if (response.success) {
        message.success('子账户创建成功');
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
      title="创建子账户"
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

      <ProFormSelect
        name="parentId"
        label="上级账户"
        placeholder="请选择上级账户"
        options={parentOptions}
        rules={[{ required: true, message: '请选择上级账户' }]}
      />
    </ModalForm>
  );
};

export default CreateSubUserForm;