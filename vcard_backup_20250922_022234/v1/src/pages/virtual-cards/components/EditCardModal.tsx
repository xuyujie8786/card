/**
 * 编辑卡片备注弹窗组件
 */
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { updateCardRemark } from '@/services/virtual-card';
import type { VirtualCard } from '@/types/virtual-card';

interface EditCardModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  card: VirtualCard | null;
}

const EditCardModal: React.FC<EditCardModalProps> = ({ 
  open, 
  onCancel, 
  onSuccess, 
  card 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 当卡片数据变化时，更新表单
  useEffect(() => {
    if (card && open) {
      form.setFieldsValue({
        remark: card.remark || ''
      });
    }
  }, [card, open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (!card?.cardId) {
        message.error('卡片ID不存在');
        return;
      }

      const response = await updateCardRemark(card.cardId, {
        remark: values.remark || null
      });

      if (response.code === 200) {
        message.success('备注更新成功！');
        onSuccess();
        onCancel();
      } else {
        message.error(response.message || '更新失败');
      }
    } catch (error) {
      console.error('更新卡片备注失败:', error);
      message.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="编辑卡片备注"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="保存"
      cancelText="取消"
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
      >
        <Form.Item label="卡号">
          <Input 
            value={card?.cardNo ? card.cardNo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1****$3$4') : ''} 
            disabled 
          />
        </Form.Item>
        
        <Form.Item label="持卡人">
          <Input 
            value={card?.cardholderName || ''} 
            disabled 
          />
        </Form.Item>

        <Form.Item
          name="remark"
          label="备注"
          rules={[
            { max: 32, message: '备注不能超过32个字符' }
          ]}
        >
          <Input.TextArea
            placeholder="请输入备注信息（可选）"
            maxLength={32}
            showCount
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditCardModal;
