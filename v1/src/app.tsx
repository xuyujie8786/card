import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import React from 'react';
import { App } from 'antd';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  SelectLang,
} from '@/components';
import NotificationBell from '@/components/RightContent/NotificationBell';
import { getCurrentUser } from '@/services/auth';
import { API_CONFIG } from '@/config/api';
import TokenManager from '@/utils/tokenManager';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';

const isDev = process.env.NODE_ENV === 'development';
const isDevOrTest = isDev || process.env.CI;
const loginPath = '/user/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: any;
  loading?: boolean;
  fetchUserInfo?: () => Promise<any | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      // 检查是否有token
      const token = TokenManager.getAccessToken();
      if (!token) {
        console.log('🚫 没有访问token，跳过用户信息获取');
        return undefined;
      }
      
      // 添加超时机制，防止API调用卡死
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API timeout')), 3000); // 缩短超时时间
      });
      
      const apiPromise = getCurrentUser();
      const response = await Promise.race([apiPromise, timeoutPromise]) as any;
      
      // 检查响应是否成功
      if (response && response.code === 200) {
        return response.data;
      } else {
        console.warn('获取用户信息失败:', response);
        // 清除无效token
        TokenManager.clearTokens();
        return undefined;
      }
    } catch (error) {
      console.warn('获取用户信息失败:', error);
      // 清除可能无效的token
      TokenManager.clearTokens();
      return undefined;
    }
  };

  // 如果不是登录页面，执行
  const { location } = history;
  
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
    try {
      const currentUser = await fetchUserInfo();
      
      // 如果获取用户信息失败且不在首页，跳转到登录页
      if (!currentUser && location.pathname !== '/') {
        console.log('🔄 未登录，跳转到登录页');
        history.push(loginPath);
      }
      
      return {
        fetchUserInfo,
        currentUser,
        settings: defaultSettings as Partial<LayoutSettings>,
      };
    } catch (error) {
      console.error('初始化状态失败:', error);
      // 即使失败也要返回基本状态，避免应用卡死
      return {
        fetchUserInfo,
        currentUser: undefined,
        settings: defaultSettings as Partial<LayoutSettings>,
      };
    }
  }
  
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    actionsRender: () => [
      <NotificationBell key="notification" />,
      <SelectLang key="SelectLang" />,
    ],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
    // 已移除水印配置
    // waterMarkProps: {
    //   content: initialState?.currentUser?.name,
    // },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        // 首页特殊处理：如果用户未登录，直接跳转到登录页
        if (location.pathname === '/') {
          history.push(loginPath);
        } else if (!['/user/register', '/user/register-result'].includes(location.pathname)) {
          history.push(loginPath);
        }
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDevOrTest
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <App>
          {children}
          {isDevOrTest && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </App>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  ...errorConfig,
  requestInterceptors: [
    (config: any) => {
      // 添加认证token - 使用TokenManager获取token
      const token = TokenManager.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
  ],
};
