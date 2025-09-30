import {
  LockOutlined,
  UserOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  SelectLang,
  useIntl,
  useModel,
} from '@umijs/max';
import { Alert, App, Tabs, Modal, Input, Button } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Footer } from '@/components';
import { login, passwordlessLogin } from '@/services/auth';
import TokenManager from '@/utils/tokenManager';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(({ token }) => {
  return {
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
  };
});


const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<any>({});
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loading2FA, setLoading2FA] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);
  const [isPasswordlessLogin, setIsPasswordlessLogin] = useState(false);
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();

  // 检查URL中的免密登录token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userId = urlParams.get('userId');
    
    if (token && userId) {
      setIsPasswordlessLogin(true);
      handlePasswordlessLogin(token, parseInt(userId));
    }
  }, []);

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };

  const handlePasswordlessLogin = async (token: string, userId: number) => {
    try {
      message.loading('验证免密登录token...', 0);
      
      const response = await passwordlessLogin(token, userId);
      
      message.destroy();
      
      if (response.code === 200 && response.data) {
        await handleLoginSuccess(response.data);
      } else {
        message.error('免密登录失败');
        setIsPasswordlessLogin(false);
      }
    } catch (error: any) {
      message.destroy();
      console.error('Passwordless login error:', error);
      message.error(error.message || '免密登录失败，请重新尝试');
      setIsPasswordlessLogin(false);
      
      // 清除URL参数，避免重复尝试
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('userId');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // 只保留用户名和密码进行登录
      const loginParams = {
        username: values.username,
        password: values.password,
      };
      
      const response = await login(loginParams);
      
      if (response.code === 200 && response.data) {
        // 检查是否需要2FA验证
        if (response.data.requires2FA) {
          // 保存登录数据，显示2FA弹窗
          setPendingLoginData(values);
          setShow2FAModal(true);
          return;
        }
        
        // 直接登录成功，处理token和用户信息
        await handleLoginSuccess(response.data);
        return;
      }
      
      // 如果登录失败
      setUserLoginState({ status: 'error', type: 'account' });
    } catch (error: any) {
      console.error('Login error:', error);
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: '登录失败，请重试！',
      });
      message.error(error.message || defaultLoginFailureMessage);
      setUserLoginState({ status: 'error', type: 'account' });
    }
  };

  const handleLoginSuccess = async (loginData: any) => {
    // ✅ 使用TokenManager正确存储token
    TokenManager.setAccessToken(loginData.token);
    
    const defaultLoginSuccessMessage = intl.formatMessage({
      id: 'pages.login.success',
      defaultMessage: '登录成功！',
    });
    message.success(defaultLoginSuccessMessage);
    
    // 对于免密登录，也需要设置用户信息到全局状态
    if (isPasswordlessLogin) {
      // 先设置用户信息到全局状态
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: loginData.user,
        }));
      });
      
      const urlParams = new URL(window.location.href).searchParams;
      const redirectUrl = urlParams.get('redirect') || '/';
      message.success('免密登录成功，正在跳转...');
      // 使用location.href强制页面刷新，确保所有状态都重新初始化
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
      return;
    }
    
    // 设置用户信息到全局状态
    flushSync(() => {
      setInitialState((s) => ({
        ...s,
        currentUser: loginData.user,
      }));
    });
    
    const urlParams = new URL(window.location.href).searchParams;
    window.location.href = urlParams.get('redirect') || '/';
  };

  const handle2FASubmit = async () => {
    if (!twoFactorCode || !pendingLoginData) {
      message.error('请输入验证码');
      return;
    }

    setLoading2FA(true);
    try {
      // 使用用户名、密码和2FA代码重新登录
      const loginParams = {
        username: pendingLoginData.username,
        password: pendingLoginData.password,
        twoFactorCode: twoFactorCode,
      };
      
      const response = await login(loginParams);
      
      if (response.code === 200 && response.data && response.data.token) {
        // 登录成功
        setShow2FAModal(false);
        setTwoFactorCode('');
        setPendingLoginData(null);
        await handleLoginSuccess(response.data);
      } else {
        message.error('验证码错误，请重试');
      }
    } catch (error: any) {
      console.error('2FA verification error:', error);
      message.error(error.message || '验证码错误，请重试');
    } finally {
      setLoading2FA(false);
    }
  };

  const handle2FACancel = () => {
    setShow2FAModal(false);
    setTwoFactorCode('');
    setPendingLoginData(null);
  };
  const { status, type: loginType } = userLoginState;

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: '登录页',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <Lang />
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/logo.svg" />}
          title="VCard管理系统"
          subTitle={isPasswordlessLogin ? "正在验证免密登录..." : "虚拟卡管理平台"}
          loading={isPasswordlessLogin}
          initialValues={{
            autoLogin: true,
          }}
          actions={[]}
          onFinish={async (values) => {
            await handleSubmit(values);
          }}
        >

          {status === 'error' && loginType === 'account' && (
            <LoginMessage
              content={intl.formatMessage({
                id: 'pages.login.accountLogin.errorMessage',
                defaultMessage: '账户或密码错误',
              })}
            />
          )}
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder="请输入用户名"
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.username.required"
                        defaultMessage="请输入用户名!"
                      />
                    ),
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder="请输入密码"
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.password.required"
                        defaultMessage="请输入密码！"
                      />
                    ),
                  },
                ]}
              />
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <ProFormCheckbox noStyle name="autoLogin">
              <FormattedMessage
                id="pages.login.rememberMe"
                defaultMessage="自动登录"
              />
            </ProFormCheckbox>
            <a
              style={{
                float: 'right',
              }}
            >
              <FormattedMessage
                id="pages.login.forgotPassword"
                defaultMessage="忘记密码"
              />
            </a>
          </div>
        </LoginForm>
      </div>
      <Footer />
      
      {/* 2FA验证弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyOutlined style={{ color: '#1890ff' }} />
            <span>两步验证</span>
          </div>
        }
        open={show2FAModal}
        onCancel={handle2FACancel}
        footer={[
          <Button key="cancel" onClick={handle2FACancel}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading2FA}
            onClick={handle2FASubmit}
          >
            验证
          </Button>,
        ]}
        maskClosable={false}
        width={400}
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ marginBottom: 16, color: '#666' }}>
            请输入您的身份验证器应用中显示的6位验证码：
          </p>
          <Input
            placeholder="请输入6位验证码"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onPressEnter={handle2FASubmit}
            size="large"
            style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '8px' }}
            maxLength={6}
            autoFocus
          />
          <p style={{ marginTop: 12, fontSize: '12px', color: '#999' }}>
            验证码每30秒更新一次，请确保输入当前显示的验证码。
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Login;
