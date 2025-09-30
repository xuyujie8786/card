/**
 * 安全设置页面
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Switch,
  QRCode,
  Modal,
  App,
  Alert,
  Row,
  Col,
  Steps,
} from 'antd';
import {
  SafetyOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  QrcodeOutlined,
  CopyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  changePassword,
  getTwoFAStatus,
  setup2FA,
  verify2FA,
  disable2FA,
  type ChangePasswordRequest,
  type TwoFASetupResponse,
} from '@/services/security';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 使用从服务导入的类型
type TwoFASetupData = TwoFASetupResponse;

const SecuritySettingsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const [passwordForm] = Form.useForm<ChangePasswordForm>();
  const [loading, setLoading] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<TwoFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  // 检查2FA状态
  useEffect(() => {
    checkTwoFAStatus();
  }, []);

  const checkTwoFAStatus = async () => {
    try {
      const response = await getTwoFAStatus();
      if (response.code === 200) {
        setTwoFAEnabled(response.data.enabled);
      }
    } catch (error) {
      console.error('检查2FA状态失败:', error);
      // 如果API失败，默认为false
      setTwoFAEnabled(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values: ChangePasswordForm) => {
    try {
      setLoading(true);
      
      const response = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (response.code === 200) {
        message.success(response.message || '密码修改成功');
        passwordForm.resetFields();
      } else {
        message.error('密码修改失败');
      }
    } catch (error: any) {
      message.error(error?.message || '密码修改失败，请检查当前密码是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 开启2FA
  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      
      const response = await setup2FA();
      
      if (response.code === 200) {
        setSetupData(response.data);
        setSetupModalVisible(true);
        setCurrentStep(0);
      } else {
        message.error('获取2FA设置信息失败');
      }
    } catch (error: any) {
      message.error(error?.message || '获取2FA设置信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 关闭2FA
  const handleDisable2FA = async () => {
    let verificationCodeInput = '';
    
    modal.confirm({
      title: '确认关闭两步验证',
      content: (
        <div>
          <p style={{ marginBottom: 16 }}>关闭两步验证会降低账户安全性，请输入2FA验证码以确认操作。</p>
          <Input
            placeholder="请输入6位验证码"
            maxLength={6}
            onChange={(e) => {
              verificationCodeInput = e.target.value;
            }}
            onPressEnter={(e) => {
              // 阻止默认的确认行为，因为我们需要检查验证码
              e.stopPropagation();
            }}
          />
        </div>
      ),
      okText: '确认关闭',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        if (!verificationCodeInput) {
          message.error('请输入2FA验证码');
          return Promise.reject();
        }
        
        if (verificationCodeInput.length !== 6) {
          message.error('验证码必须是6位数字');
          return Promise.reject();
        }
        
        try {
          const response = await disable2FA(verificationCodeInput);
          
          if (response.code === 200) {
            setTwoFAEnabled(false);
            message.success(response.message || '两步验证已关闭');
          } else {
            message.error('关闭两步验证失败');
          }
        } catch (error: any) {
          message.error(error?.message || '关闭两步验证失败');
          return Promise.reject();
        }
      },
    });
  };

  // 验证2FA代码
  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }

    try {
      setLoading(true);
      
      const response = await verify2FA({ 
        token: verificationCode,
      });
      
      if (response.code === 200) {
        setTwoFAEnabled(true);
        setSetupModalVisible(false);
        setVerifyModalVisible(false);
        setVerificationCode('');
        message.success(response.message || '两步验证设置成功！');
      } else {
        message.error('验证码错误，请重试');
      }
    } catch (error: any) {
      message.error(error?.message || '验证码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 复制文本到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  const setupSteps = [
    {
      title: '设置验证器',
      content: (
        <div style={{ textAlign: 'center' }}>
          <Paragraph>
            使用身份验证器应用（如 Google Authenticator、Microsoft Authenticator）扫描下方二维码：
          </Paragraph>
          {setupData && (
            <div style={{ margin: '20px 0' }}>
              <QRCode value={setupData.qrCode} size={200} />
            </div>
          )}
          <Paragraph>
            如果无法扫描二维码，请手动输入密钥：
          </Paragraph>
          <Input.Group compact>
            <Input
              value={setupData?.secret}
              readOnly
              style={{ width: 'calc(100% - 40px)' }}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={() => setupData && copyToClipboard(setupData.secret)}
            />
          </Input.Group>
        </div>
      ),
    },
    {
      title: '验证设置',
      content: (
        <div style={{ textAlign: 'center' }}>
          <Paragraph>
            请输入身份验证器应用中显示的6位验证码以完成设置：
          </Paragraph>
          <Input
            placeholder="请输入6位验证码"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{ width: 200, textAlign: 'center', fontSize: 16 }}
            maxLength={6}
          />
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '安全设置',
        subTitle: '管理您的账户安全设置',
      }}
    >
      <Row gutter={24}>
        <Col span={24}>
          {/* 修改密码 */}
          <Card
            title={
              <Space>
                <LockOutlined />
                <span>修改密码</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleChangePassword}
              style={{ maxWidth: 400 }}
            >
              <Form.Item
                name="currentPassword"
                label="当前密码"
                rules={[
                  { required: true, message: '请输入当前密码' },
                ]}
              >
                <Input.Password
                  placeholder="请输入当前密码"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码至少6位字符' },
                ]}
              >
                <Input.Password
                  placeholder="请输入新密码"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="请再次输入新密码"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 两步验证 */}
          <Card
            title={
              <Space>
                <SafetyOutlined />
                <span>两步验证</span>
              </Space>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Space direction="vertical" size={4}>
                    <Text strong>两步验证 (2FA)</Text>
                    <Text type="secondary">
                      {twoFAEnabled
                        ? '已启用两步验证，为您的账户提供额外安全保护'
                        : '启用两步验证可以为您的账户提供额外的安全保护'}
                    </Text>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    {twoFAEnabled ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : null}
                    <Switch
                      checked={twoFAEnabled}
                      onChange={(checked) => {
                        if (checked) {
                          handleEnable2FA();
                        } else {
                          handleDisable2FA();
                        }
                      }}
                      loading={loading}
                    />
                  </Space>
                </Col>
              </Row>
            </div>

            {twoFAEnabled && (
              <Alert
                message="两步验证已启用"
                description="您的账户已受到两步验证保护。如果您丢失了身份验证器设备，请联系客服获取帮助。"
                type="success"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 2FA设置弹窗 */}
      <Modal
        title="设置两步验证"
        open={setupModalVisible}
        onCancel={() => {
          setSetupModalVisible(false);
          setCurrentStep(0);
          setVerificationCode('');
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {setupSteps.map((step, index) => (
            <Step key={index} title={step.title} />
          ))}
        </Steps>

        <div style={{ minHeight: 300 }}>
          {setupSteps[currentStep]?.content}
        </div>

        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>
                上一步
              </Button>
            )}
            {currentStep < setupSteps.length - 1 && (
              <Button
                type="primary"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                下一步
              </Button>
            )}
            {currentStep === setupSteps.length - 1 && (
              <Button
                type="primary"
                onClick={handleVerify2FA}
                loading={loading}
                disabled={verificationCode.length !== 6}
              >
                完成设置
              </Button>
            )}
          </Space>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default SecuritySettingsPage;
