/**
 * 创建虚拟卡表单组件
 */
import React, { useState } from 'react';
import { ProForm, ProFormSelect, ProFormMoney, ProFormDatePicker, ProFormTextArea, ProFormDigit, ProFormText } from '@ant-design/pro-components';
import { Progress, Alert, Space, Button, App } from 'antd';
import dayjs from 'dayjs';
import { toUTCTime } from '@/utils/time';
import { createVirtualCard } from '@/services/virtual-card';
import type { CreateCardRequest, ProductCode } from '@/types/virtual-card';
import { ProductCodeText } from '@/types/virtual-card';

interface CreateCardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreateCardForm: React.FC<CreateCardFormProps> = ({ onSuccess, onCancel }) => {
  const { message } = App.useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleSubmit = async (values: any) => {
    const cardCount = values.cardCount || 1;
    
    // 如果是单张卡，使用原有逻辑
    if (cardCount === 1) {
      return await createSingleCard(values);
    }
    
    // 批量开卡逻辑
    return await createBatchCards(values, cardCount);
  };

  // 创建单张卡片
  const createSingleCard = async (values: any) => {
    // 显示进度条
    setIsCreating(true);
    setProgress(0);
    setBatchResults(null);
    
    try {
      // 模拟进度更新
      setProgress(30);
      
      const submitData: CreateCardRequest = {
        productCode: values.productCode as ProductCode,
        amt: parseFloat(values.amt || '5.00').toFixed(2),
        expdate: dayjs(values.expdate).format('YYYY-MM-DD'),
        currency: 'USD',
        remark: values.remark,
        // 持卡人信息会自动使用当前登录用户信息
      };

      setProgress(60);
      const response = await createVirtualCard(submitData);
      setProgress(100);
      
      if (response.code === 200) {
        message.success('虚拟卡创建成功！');
        onSuccess?.();
        return true;
      } else {
        message.error(response.message || '创建失败');
        return false;
      }
    } catch (error) {
      console.error('创建虚拟卡失败:', error);
      message.error('创建虚拟卡失败，请稍后重试');
      return false;
    } finally {
      // 延迟关闭进度条，让用户看到完成状态
      setTimeout(() => {
        setIsCreating(false);
        setProgress(0);
      }, 500);
    }
  };

  // 批量创建卡片
  const createBatchCards = async (values: any, cardCount: number) => {
    setIsCreating(true);
    setProgress(0);
    setBatchResults(null);

    const results = {
      total: cardCount,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const submitData: CreateCardRequest = {
        productCode: values.productCode as ProductCode,
        amt: parseFloat(values.amt || '5.00').toFixed(2),
        expdate: dayjs(values.expdate).format('YYYY-MM-DD'),
        currency: 'USD',
        remark: values.remark,
        // 持卡人信息会自动使用当前登录用户信息
      };

      // 逐张创建卡片
      for (let i = 0; i < cardCount; i++) {
        try {
          const response = await createVirtualCard(submitData);
          
          if (response.code === 200) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`第${i + 1}张卡: ${response.message || '创建失败'}`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          results.errors.push(`第${i + 1}张卡: ${errorMsg}`);
        }

        // 更新进度
        const currentProgress = Math.round(((i + 1) / cardCount) * 100);
        setProgress(currentProgress);
        
        // 添加延迟，避免请求过于频繁
        if (i < cardCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setBatchResults(results);
      
      if (results.success > 0) {
        message.success(`批量开卡完成！成功: ${results.success}张，失败: ${results.failed}张`);
        onSuccess?.();
      } else {
        message.error('所有卡片创建失败');
      }

      return results.success > 0;
    } catch (error) {
      console.error('批量创建虚拟卡失败:', error);
      message.error('批量创建虚拟卡失败，请稍后重试');
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ProForm
      title="创建虚拟卡"
      layout="horizontal"
      labelCol={{ span: 7 }}
      wrapperCol={{ span: 15 }}
      onFinish={handleSubmit}
      initialValues={{
        productCode: 'E0000001', // 默认香港卡
        amt: '5.00', // 默认金额
        expdate: dayjs().add(3, 'year'), // 默认今天+3年
        cardCount: 1, // 默认开卡数量
        // 持卡人信息自动使用当前登录用户信息，无需手动输入
      }}
      submitter={{
        resetButtonProps: false, // 移除重置按钮
        submitButtonProps: {
          children: isCreating ? '创建中...' : '提 交',
          loading: isCreating,
          type: 'primary', // 添加主要按钮样式，与对账单弹窗保持一致
        },
        render: (props, doms) => {
          // doms[0] 是重置按钮，doms[1] 是提交按钮
          const submitButton = doms[1] || doms[0]; // 如果没有重置按钮，提交按钮可能在doms[0]
          
          return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              {submitButton} {/* 提交按钮 */}
            </div>
          );
        },
      }}
    >
      {/* 开卡进度显示 */}
      {isCreating && (
        <Alert
          message={batchResults ? "正在批量创建虚拟卡" : "正在创建虚拟卡"}
          description={
            <div style={{ marginTop: 8 }}>
              <Progress 
                percent={progress} 
                status={progress === 100 ? "success" : "active"} 
                strokeColor={progress === 100 ? "#52c41a" : undefined}
              />
              <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                {batchResults ? "请耐心等待，正在逐张创建虚拟卡..." : "正在连接卡商API，请稍等..."}
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 批量开卡结果显示 */}
      {batchResults && (
        <Alert
          message="批量开卡结果"
          description={
            <div>
              <div>总计: {batchResults.total}张，成功: {batchResults.success}张，失败: {batchResults.failed}张</div>
              {batchResults.errors.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: '12px', color: '#ff4d4f' }}>失败详情:</div>
                  <ul style={{ fontSize: '12px', margin: '4px 0 0 16px', padding: 0 }}>
                    {batchResults.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {batchResults.errors.length > 5 && (
                      <li>...还有{batchResults.errors.length - 5}个错误</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          }
          type={batchResults.success > 0 ? 'success' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <ProFormSelect
        name="productCode"
        label="选择卡类型"
        placeholder="请选择卡类型"
        options={[
          { label: ProductCodeText.E0000001, value: 'E0000001' },
          { label: ProductCodeText.G0000001, value: 'G0000001' },
        ]}
        rules={[{ required: true, message: '请选择卡类型' }]}
        width="lg"
      />

      <ProFormDigit
        name="cardCount"
        label="开卡数量"
        placeholder="请输入开卡数量"
        min={1}
        max={100}
        rules={[{ required: true, message: '请输入开卡数量' }]}
        width="lg"
        fieldProps={{
          precision: 0,
          disabled: isCreating,
        }}
        tooltip="批量开卡数量，最多100张。数量为1时将使用单卡模式"
      />
      
      <ProFormDigit
        name="amt"
        label="金额"
        placeholder="请输入开卡金额"
        min={0.01}
        max={10000}
        rules={[{ required: true, message: '请输入开卡金额' }]}
        width="lg"
        fieldProps={{
          precision: 2,
          addonBefore: 'USD',
          step: 0.01,
        }}
        tooltip="开卡金额，默认5.00美元"
      />

      {/* 持卡人信息已移除，系统会自动使用当前登录用户的信息 */}
      
      <ProFormDatePicker
        name="expdate"
        label="过期时间"
        placeholder="请选择过期时间"
        rules={[{ required: true, message: '请选择过期时间' }]}
        width="lg"
        fieldProps={{
          disabledDate: (current: any) => {
            // 不能选择今天之前的日期，以及4年之后的日期
            const today = dayjs().startOf('day');
            const maxDate = dayjs().add(4, 'year');
            return current && (current.isBefore(today) || current.isAfter(maxDate));
          },
        }}
        tooltip="过期时间要求大于30天，小于4年"
      />
      
      <ProFormTextArea
        name="remark"
        label="备注"
        placeholder="请输入备注信息（可选）"
        width="lg"
        fieldProps={{
          maxLength: 32,
          showCount: true,
        }}
        tooltip="可以填写业务订单号等，最长32位"
      />
    </ProForm>
  );
};

export default CreateCardForm;
