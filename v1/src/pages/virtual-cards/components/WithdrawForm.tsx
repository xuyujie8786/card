/**
 * 卡片提现表单组件
 */
import React from 'react';
import { ProForm, ProFormMoney, ProFormText } from '@ant-design/pro-components';
import { Alert, App } from 'antd';
import { withdrawCard } from '@/services/virtual-card';
import type { VirtualCard } from '@/types/virtual-card';

interface WithdrawFormProps {
  card: VirtualCard;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const WithdrawForm: React.FC<WithdrawFormProps> = ({ card, onSuccess, onCancel }) => {
  const { message } = App.useApp();
  
  const handleSubmit = async (values: any) => {
    try {
      const amount = parseFloat(values.amount);
      
      // 检查余额是否足够
      if (amount > card.balance) {
        message.error('提现金额不能超过卡片余额');
        return false;
      }
      
      const response = await withdrawCard({
        cardId: card.cardId,
        amt: amount.toFixed(2),
      });
      
      if (response.code === 200) {
        message.success('提现成功！');
        onSuccess?.();
        return true;
      } else {
        message.error(response.message || '提现失败');
        return false;
      }
    } catch (error) {
      console.error('提现失败:', error);
      message.error('提现失败，请稍后重试');
      return false;
    }
  };

  return (
    <ProForm
      title={`卡片提现 - ${card.cardNo ? card.cardNo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : '未知卡号'}`}
      layout="horizontal"
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 16 }}
      onFinish={handleSubmit}
      submitter={{
        resetButtonProps: {
          onClick: onCancel,
        },
        submitButtonProps: {
          children: '确认提现',
        },
        render: (props, doms) => {
          return [
            <div key="buttons" style={{ textAlign: 'right' }}>
              {doms}
            </div>
          ];
        },
      }}
    >
      <ProFormText
        name="cardNo"
        label="卡号"
        initialValue={card.cardNo ? card.cardNo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : '未知卡号'}
        readonly
        width="md"
      />
      
      <ProFormText
        name="currentBalance"
        label="当前余额"
        initialValue={`${card.currency} ${(typeof card.balance === 'number' ? card.balance : parseFloat(String(card.balance || '0'))).toFixed(2)}`}
        readonly
        width="md"
      />
      
      <Alert
        message="提现提醒"
        description={`可提现金额：${card.currency} ${(typeof card.balance === 'number' ? card.balance : parseFloat(String(card.balance || '0'))).toFixed(2)}`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <ProFormMoney
        name="amount"
        label="提现金额"
        placeholder="请输入提现金额"
        min={0.01}
        max={typeof card.balance === 'number' ? card.balance : parseFloat(card.balance || '0')}
        rules={[
          { required: true, message: '请输入提现金额' },
          {
            validator: (_: any, value: number) => {
              const balance = typeof card.balance === 'number' ? card.balance : parseFloat(card.balance || '0');
              if (value && value > balance) {
                return Promise.reject(new Error('提现金额不能超过卡片余额'));
              }
              return Promise.resolve();
            },
          },
        ]}
        width="md"
        fieldProps={{
          precision: 2,
          addonBefore: card.currency,
        }}
      />
    </ProForm>
  );
};

export default WithdrawForm;
