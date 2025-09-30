/**
 * 公告表单组件
 */
import React, { useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Button, 
  Space 
} from 'antd';
import { 
  createAnnouncement, 
  updateAnnouncement 
} from '@/services/announcement';
import type { AnnouncementItem } from '@/types/announcement';
import { 
  AnnouncementType, 
  AnnouncementStatus,
  AnnouncementTypeText, 
  AnnouncementStatusText 
} from '@/types/announcement';

const { TextArea } = Input;
const { Option } = Select;

interface AnnouncementFormProps {
  visible: boolean;
  editingData?: AnnouncementItem | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  visible,
  editingData,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const isEditing = !!editingData;
  const title = isEditing ? '编辑公告' : '新建公告';

  // 当编辑数据变化时，更新表单
  useEffect(() => {
    if (visible && editingData) {
      form.setFieldsValue({
        title: editingData.title,
        content: editingData.content,
        type: editingData.type,
        status: editingData.status,
      });
    } else if (visible && !editingData) {
      // 新建时设置默认值
      form.setFieldsValue({
        type: AnnouncementType.NORMAL,
        status: AnnouncementStatus.ACTIVE,
      });
    }
  }, [visible, editingData, form]);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (isEditing) {
        await updateAnnouncement(editingData!.id, values);
        message.success('公告更新成功');
      } else {
        await createAnnouncement(values);
        message.success('公告创建成功');
      }

      form.resetFields();
      onSuccess();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error.message || `${isEditing ? '更新' : '创建'}公告失败`);
    } finally {
      setLoading(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      footer={
        <Space>
          <Button onClick={handleCancel}>
            取消
          </Button>
          <Button 
            type="primary" 
            loading={loading}
            onClick={handleSubmit}
          >
            {isEditing ? '更新' : '创建'}
          </Button>
        </Space>
      }
      width={800}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: AnnouncementType.NORMAL,
          status: AnnouncementStatus.ACTIVE,
        }}
      >
        <Form.Item
          name="title"
          label="公告标题"
          rules={[
            { required: true, message: '请输入公告标题' },
            { max: 200, message: '标题长度不能超过200字符' },
          ]}
        >
          <Input 
            placeholder="请输入公告标题"
            showCount
            maxLength={200}
          />
        </Form.Item>

        <Form.Item
          name="type"
          label="公告类型"
          rules={[{ required: true, message: '请选择公告类型' }]}
        >
          <Select placeholder="请选择公告类型">
            <Option value={AnnouncementType.NORMAL}>
              {AnnouncementTypeText[AnnouncementType.NORMAL]}
            </Option>
            <Option value={AnnouncementType.URGENT}>
              {AnnouncementTypeText[AnnouncementType.URGENT]}
            </Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="status"
          label="发布状态"
          rules={[{ required: true, message: '请选择发布状态' }]}
        >
          <Select placeholder="请选择发布状态">
            <Option value={AnnouncementStatus.DRAFT}>
              {AnnouncementStatusText[AnnouncementStatus.DRAFT]}
            </Option>
            <Option value={AnnouncementStatus.ACTIVE}>
              {AnnouncementStatusText[AnnouncementStatus.ACTIVE]}
            </Option>
            <Option value={AnnouncementStatus.ARCHIVED}>
              {AnnouncementStatusText[AnnouncementStatus.ARCHIVED]}
            </Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="content"
          label="公告内容"
          rules={[{ required: true, message: '请输入公告内容' }]}
        >
          <TextArea
            placeholder="请输入公告内容"
            rows={10}
            showCount
            maxLength={5000}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AnnouncementForm;
