/**
 * 卡片充值表单组件
 */
import React from 'react';
import { ProForm, ProFormMoney, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import { rechargeCard } from '@/services/virtual-card';
import type { VirtualCard } from '@/types/virtual-card';

interface RechargeFormProps {
  card: VirtualCard;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RechargeForm: React.FC<RechargeFormProps> = ({ card, onSuccess, onCancel }) => {
  const handleSubmit = async (values: any) => {
    try {
      const response = await rechargeCard({
        cardId: card.cardId,
        amt: parseFloat(values.amount).toFixed(2),
      });
      
      if (response.code === 200) {
        message.success('充值成功！');
        onSuccess?.();
        return true;
      } else {
        message.error(response.message || '充值失败');
        return false;
      }
    } catch (error) {
      console.error('充值失败:', error);
      message.error('充值失败，请稍后重试');
      return false;
    }
  };

  return (
    <ProForm
      title={`卡片充值 - ${card.cardNo ? card.cardNo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : '未知卡号'}`}
      layout="horizontal"
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 16 }}
      onFinish={handleSubmit}
      submitter={{
        resetButtonProps: {
          onClick: onCancel,
        },
        submitButtonProps: {
          children: '确认充值',
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
        initialValue={`${card.currency} ${card.balance.toFixed(2)}`}
        readonly
        width="md"
      />
      
      <ProFormMoney
        name="amount"
        label="充值金额"
        placeholder="请输入充值金额"
        min={0.01}
        max={10000}
        rules={[{ required: true, message: '请输入充值金额' }]}
        width="md"
        fieldProps={{
          precision: 2,
          addonBefore: card.currency,
        }}
      />
    </ProForm>
  );
};

export default RechargeForm;
