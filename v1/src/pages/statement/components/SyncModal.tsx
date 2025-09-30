/**
 * 账单同步弹窗组件
 */
import React, { useState } from 'react';
import {
  Modal,
  Form,
  DatePicker,
  Select,
  Button,
  Space,
  Progress,
  Alert,
  Typography,
  Statistic,
  Row,
  Col,
  Card,
  Result,
  Divider,
} from 'antd';
import { SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { formatBeijingTime } from '@/utils/time';
import { syncAuthTransactions, syncSettleTransactions, type SyncResponse } from '@/services/transaction';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

interface SyncModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type SyncType = 'auth' | 'settle' | 'both';

interface SyncResult {
  type: 'auth' | 'settle';
  response: SyncResponse;
  error?: string;
}

const SyncModal: React.FC<SyncModalProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [results, setResults] = useState<SyncResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSync = async (values: {
    dateRange: [Dayjs, Dayjs];
    syncType: SyncType;
    cardId?: string;
  }) => {
    setLoading(true);
    setProgress(0);
    setResults([]);
    setShowResults(false);

    const { dateRange, syncType, cardId } = values;
    const [startDate, endDate] = dateRange;
    const params = {
      dateStart: startDate.format('YYYY-MM-DD'),
      dateEnd: endDate.format('YYYY-MM-DD'),
      cardId,
    };

    const syncResults: SyncResult[] = [];

    try {
      if (syncType === 'auth' || syncType === 'both') {
        setCurrentStep('正在同步授权账单...');
        setProgress(syncType === 'both' ? 25 : 50);
        
        try {
          const authResponse = await syncAuthTransactions(params);
          syncResults.push({ type: 'auth', response: authResponse });
          setProgress(syncType === 'both' ? 50 : 100);
        } catch (error: any) {
          syncResults.push({ 
            type: 'auth', 
            response: { success: false, message: '同步失败', data: { total: 0 } },
            error: error.message || '授权账单同步失败'
          });
        }
      }

      if (syncType === 'settle' || syncType === 'both') {
        setCurrentStep('正在同步结算账单...');
        setProgress(syncType === 'both' ? 75 : 50);
        
        try {
          const settleResponse = await syncSettleTransactions(params);
          syncResults.push({ type: 'settle', response: settleResponse });
          setProgress(100);
        } catch (error: any) {
          syncResults.push({ 
            type: 'settle', 
            response: { success: false, message: '同步失败', data: { total: 0 } },
            error: error.message || '结算账单同步失败'
          });
        }
      }

      setCurrentStep('同步完成');
      setResults(syncResults);
      setShowResults(true);
      
      // 如果有成功的同步，调用成功回调
      if (syncResults.some(r => r.response.success)) {
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('同步过程中发生错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      form.resetFields();
      setProgress(0);
      setCurrentStep('');
      setResults([]);
      setShowResults(false);
      onClose();
    }
  };

  const renderSyncResults = () => {
    if (!showResults || results.length === 0) return null;

    const hasErrors = results.some(r => !r.response.success || r.error);
    const totalProcessed = results.reduce((sum, r) => sum + (r.response.data.total || 0), 0);
    const totalInserted = results.reduce((sum, r) => sum + (r.response.data.inserted || 0), 0);
    const totalMerged = results.reduce((sum, r) => sum + (r.response.data.merged || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.response.data.errors || 0), 0);

    return (
      <div style={{ marginTop: 16 }}>
        <Divider />
        <Title level={4}>同步结果</Title>
        
        {hasErrors ? (
          <Alert
            type="warning"
            message="同步完成，但存在部分错误"
            description="请查看详细结果了解具体情况"
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            type="success"
            message="同步成功完成"
            description="所有数据已成功同步"
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="处理总数" value={totalProcessed} />
          </Col>
          <Col span={6}>
            <Statistic title="新增记录" value={totalInserted} />
          </Col>
          <Col span={6}>
            <Statistic title="合并记录" value={totalMerged} />
          </Col>
          <Col span={6}>
            <Statistic title="错误数量" value={totalErrors} valueStyle={{ color: totalErrors > 0 ? '#ff4d4f' : undefined }} />
          </Col>
        </Row>

        {results.map((result, index) => (
          <Card 
            key={index}
            size="small" 
            title={
              <Space>
                {result.response.success && !result.error ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                {result.type === 'auth' ? '授权账单同步' : '结算账单同步'}
              </Space>
            }
            style={{ marginBottom: 8 }}
          >
            {result.error ? (
              <Text type="danger">{result.error}</Text>
            ) : (
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="处理总数" value={result.response.data.total} />
                </Col>
                <Col span={8}>
                  <Statistic title="新增" value={result.response.data.inserted || 0} />
                </Col>
                <Col span={8}>
                  <Statistic title="错误" value={result.response.data.errors || 0} />
                </Col>
              </Row>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Modal
      title="同步账单数据"
      open={open}
      onCancel={handleClose}
      width={600}
      footer={
        showResults ? (
          <Button type="primary" onClick={handleClose}>
            关闭
          </Button>
        ) : (
          <Space>
            <Button onClick={handleClose} disabled={loading}>
              取消
            </Button>
            <Button 
              type="primary" 
              icon={<SyncOutlined />}
              loading={loading}
              onClick={() => form.submit()}
            >
              开始同步
            </Button>
          </Space>
        )
      }
    >
      {!showResults ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSync}
          initialValues={{
            syncType: 'both',
            dateRange: [dayjs().subtract(7, 'day'), dayjs()],
          }}
        >
          <Form.Item
            name="dateRange"
            label="同步日期范围"
            rules={[{ required: true, message: '请选择日期范围' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="syncType"
            label="同步类型"
            rules={[{ required: true, message: '请选择同步类型' }]}
          >
            <Select style={{ width: '100%' }}>
              <Option value="both">同步所有账单</Option>
              <Option value="auth">仅同步授权账单</Option>
              <Option value="settle">仅同步结算账单</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="cardId"
            label="指定卡片ID（可选）"
            extra="留空将同步所有卡片的账单数据"
          >
            <Select
              style={{ width: '100%' }}
              placeholder="选择特定卡片或留空同步所有卡片"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {/* 这里可以从API获取卡片列表 */}
              <Option value="">全部卡片</Option>
            </Select>
          </Form.Item>

          {loading && (
            <Alert
              type="info"
              message={currentStep}
              description={
                <Progress 
                  percent={progress} 
                  status={progress === 100 ? 'success' : 'active'}
                  showInfo={true}
                />
              }
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      ) : (
        renderSyncResults()
      )}
    </Modal>
  );
};

export default SyncModal;
