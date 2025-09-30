import type { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
  title?: string;
} = {
  "navTheme": "light",
  "colorPrimary": "#1890ff",
  "layout": "top",
  "contentWidth": "Fixed",
  "fixedHeader": false,
  "fixSiderbar": true,
  "pwa": true,
  "logo": "https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg",
  "title": "VCard管理系统",
  "token": {
    "pageContainer": {
      "paddingInlinePageContainerContent": 40
    }
  },
  "splitMenus": false
}

export default Settings;
