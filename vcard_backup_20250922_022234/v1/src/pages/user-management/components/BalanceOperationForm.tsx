import React from 'react';
import { ProForm, ProFormText, ProFormMoney, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Space, Alert } from 'antd';
import { UserListItem } from '../index';

interface BalanceOperationFormProps {
  user?: UserListItem;
  type: 'deposit' | 'withdraw';
  onSuccess: (values: { amount: number; remark?: string }) => void;
  onCancel: () => void;
}

const BalanceOperationForm: React.FC<BalanceOperationFormProps> = ({ 
  user, 
  type, 
  onSuccess, 
  onCancel 
}) => {
  if (!user) return null;

  return (
    <ProForm
      onFinish={async (values) => {
        onSuccess(values);
      }}
      submitter={{
        render: (props, doms) => {
          return (
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={onCancel}>
                取消
              </Button>
              <Button type="primary" onClick={() => props.form?.submit?.()}>
                确认{type === 'deposit' ? '充值' : '提现'}
              </Button>
            </Space>
          );
        },
      }}
    >
      <ProFormText
        name="username"
        label="用户名"
        initialValue={user.username}
        readonly
        width="md"
      />
      
      <ProFormText
        name="currentBalance"
        label="当前余额"
        initialValue={`${user.currency} ${user.balance.toLocaleString()}`}
        readonly
        width="md"
      />
      
      <ProFormText
        name="availableAmount"
        label="可用金额"
        initialValue={`${user.currency} ${user.balance.toLocaleString()}`}
        readonly
        width="md"
      />
      
      <ProFormMoney
        name="amount"
        label={type === 'deposit' ? '充值金额' : '提现金额'}
        min={0.01}
        max={type === 'withdraw' ? user.balance : 100000}
        rules={[{ required: true, message: `请输入${type === 'deposit' ? '充值' : '提现'}金额` }]}
        width="md"
        fieldProps={{
          addonBefore: user.currency,
        }}
      />
      
      <ProFormTextArea
        name="remark"
        label="备注"
        placeholder={`请输入${type === 'deposit' ? '充值' : '提现'}备注`}
        width="xl"
      />
      
      {type === 'withdraw' && (
        <Alert
          message="提现提醒"
          description={`用户可提现金额：${user.currency} ${user.balance.toLocaleString()}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
    </ProForm>
  );
};

export default BalanceOperationForm;
