import React from 'react';
import {
  ModalForm,
  ProFormDigit,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Typography, App } from 'antd';
import { request } from '@umijs/max';
import type { User } from '../../../types/user';

const { Text } = Typography;

interface BalanceOperationFormProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  user?: User;
  operation: 'deposit' | 'withdraw';
  onSuccess: () => void;
}

const BalanceOperationForm: React.FC<BalanceOperationFormProps> = ({
  visible,
  onVisibleChange,
  user,
  operation,
  onSuccess,
}) => {
  const { message } = App.useApp();

  const handleSubmit = async (values: any) => {
    if (!user) return false;

    try {
      const response = await request('/users/balance-operation', {
        method: 'POST',
        data: {
          userId: user.id,
          type: operation,
          amount: values.amount,
          remark: values.remark,
        },
      });

      if (response.success) {
        message.success(operation === 'deposit' ? '充值成功' : '提现成功');
        onVisibleChange(false);
        onSuccess();
        return true;
      } else {
        message.error(response.message || '操作失败');
        return false;
      }
    } catch (error) {
      message.error('操作失败');
      return false;
    }
  };

  const operationText = operation === 'deposit' ? '充值' : '提现';

  return (
    <ModalForm
      title={`${operationText} - ${user?.name} (${user?.username})`}
      width={500}
      open={visible}
      onOpenChange={onVisibleChange}
      onFinish={handleSubmit}
      modalProps={{
        destroyOnHidden: true,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong>当前余额: </Text>
        <Text>{user?.balance} {user?.currency}</Text>
      </div>

      <ProFormDigit
        name="amount"
        label={`${operationText}金额`}
        placeholder={`请输入${operationText}金额`}
        min={0.01}
        fieldProps={{
          precision: 2,
          addonAfter: user?.currency,
        }}
        rules={[
          { required: true, message: `请输入${operationText}金额` },
          {
            validator: (_: any, value: number) => {
              if (operation === 'withdraw' && user && value > user.balance) {
                return Promise.reject(new Error('提现金额不能超过当前余额'));
              }
              return Promise.resolve();
            },
          },
        ]}
      />

      <ProFormTextArea
        name="remark"
        label="备注"
        placeholder="请输入备注信息（可选）"
        fieldProps={{
          rows: 3,
          maxLength: 200,
          showCount: true,
        }}
      />
    </ModalForm>
  );
};

export default BalanceOperationForm;