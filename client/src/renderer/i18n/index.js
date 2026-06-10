// 轻量级 i18n 模块（无外部依赖）
// 使用方式：
//   import { useI18n } from '@/i18n'
//   const { t, locale } = useI18n()
//   t('common.confirm')  // 插值：t('common.welcome', { name: 'TOTP' })

import { ref, computed, reactive } from 'vue'

const STORAGE_KEY = 'client_locale'

// 当前语言（响应式）
export const locale = ref(localStorage.getItem(STORAGE_KEY) || 'zh-CN')

// 支持的语言列表
export const availableLocales = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
]

// 翻译资源
const messages = {
  'zh-CN': {
    common: {
      confirm: '确定',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      create: '新建',
      search: '搜索',
      reset: '重置',
      add: '新增',
      export: '导出',
      refresh: '刷新',
      close: '关闭',
      submit: '提交',
      back: '返回',
      loading: '加载中...',
      success: '操作成功',
      failed: '操作失败',
      yes: '是',
      no: '否',
      all: '全部',
      tip: '提示',
      warning: '警告',
      actions: '操作',
      enabled: '启用',
      disabled: '禁用',
      status: '状态',
      createdAt: '创建时间',
      id: 'ID',
      online: '在线',
      offline: '离线',
      configuring: '配置中…',
      scanning: '扫描中…',
      scanAgain: '重新扫描',
    },
    login: {
      title: 'TOTP 客户端',
      username: '用户名',
      password: '密码',
      totp: 'TOTP 验证码',
      login: '登录',
      loggingIn: '登录中...',
      remember: '记住用户名',
      welcome: '欢迎使用 TOTP 客户端',
      invalidTotp: '动态口令无效',
      loginFailed: '登录失败',
      tokenExpired: 'Token 已失效，请重新登录',
      pleaseEnterUsername: '请输入用户名',
      pleaseEnterPassword: '请输入密码',
      pleaseEnterTotp: '请输入 6 位动态验证码',
      totpMustBe6Digits: '验证码必须为 6 位数字',
      enterUsernamePlaceholder: '请输入用户名',
      enterPasswordPlaceholder: '请输入密码',
      enterTotpPlaceholder: '请输入 6 位动态验证码',
      configureServer: '配置服务端',
      serverOnline: '服务端在线',
      serverOffline: '服务端离线',
      serverNotConfigured: '未配置',
      checking: '检测中…',
      recheck: '重新检测',
    },
    main: {
      hi: '已登录',
      notLoggedIn: '未登录',
      changePassword: '修改密码',
      logout: '退出',
      copyCode: '复制验证码',
      copied: '已复制!',
      countdownRefresh: '{seconds}秒后刷新',
      codePlaceholder: '------',
      closeToTray: '关闭窗口将最小化到托盘',
    },
    password: {
      title: '修改密码',
      oldPassword: '原密码',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      enterOldPassword: '请输入原密码',
      enterNewPassword: '请输入新密码',
      enterConfirmPassword: '请再次输入新密码',
      pleaseEnterOldPassword: '请输入原密码',
      pleaseEnterNewPassword: '请输入新密码',
      newPasswordMin8: '新密码至少 8 位',
      newPasswordLettersAndDigits: '新密码必须同时包含字母和数字',
      passwordMismatch: '两次输入的密码不一致',
      modifying: '修改中...',
      confirmModify: '确认修改',
      success: '密码修改成功',
      back: '返回',
      networkError: '网络连接失败',
      modifyFailed: '修改失败',
    },
    config: {
      title: '服务端配置',
      back: '返回登录页',
      description: '请配置 TOTP 服务端地址',
      lanServers: '局域网内的服务端',
      rescanning: '正在扫描本机所在 /24 网段…',
      noServerFound: '未发现可用的服务端。可手动输入地址，或检查网络是否在同一局域网内。',
      serverLabel: '服务端地址（也可手动输入）',
      placeholder: 'http://192.168.1.10:3001',
      saveConfig: '保存配置',
      saveConfigLoading: '配置中…',
      cannotConnect: '无法连接到该地址，请检查服务端是否启动',
      cannotConnectNetwork: '无法连接到该地址，请检查网络和服务端',
      latency: '延迟 {ms} ms',
      selected: '已选',
    },
    services: {
      hi: '已登录',
      notLoggedIn: '未登录',
      online: '在线',
      offline: '离线',
      deptManagement: '部门管理',
      changePassword: '修改密码',
      logout: '退出登录',
      searchPlaceholder: '搜索服务...',
      loading: '加载中...',
      empty: '暂无服务，请联系管理员授权',
      clickToGet: '点击获取',
      revoked: '权限已撤销',
      unfavorite: '取消收藏',
      favoriteToShortcut: '收藏到快捷键',
      removeFromList: '从我的列表中移除',
      logoutConfirm: '确定要退出登录吗？',
      logoutCancel: '取消',
      logoutConfirmBtn: '确认',
      noAccountInfo: '无账号信息',
    },
  },
  'en-US': {
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      reset: 'Reset',
      add: 'Add',
      export: 'Export',
      refresh: 'Refresh',
      close: 'Close',
      submit: 'Submit',
      back: 'Back',
      loading: 'Loading...',
      success: 'Success',
      failed: 'Failed',
      yes: 'Yes',
      no: 'No',
      all: 'All',
      tip: 'Tip',
      warning: 'Warning',
      actions: 'Actions',
      enabled: 'Enabled',
      disabled: 'Disabled',
      status: 'Status',
      createdAt: 'Created At',
      id: 'ID',
      online: 'Online',
      offline: 'Offline',
      configuring: 'Configuring…',
      scanning: 'Scanning…',
      scanAgain: 'Rescan',
    },
    login: {
      title: 'TOTP Client',
      username: 'Username',
      password: 'Password',
      totp: 'TOTP Code',
      login: 'Sign in',
      loggingIn: 'Signing in...',
      remember: 'Remember me',
      welcome: 'Welcome to TOTP Client',
      invalidTotp: 'Invalid TOTP code',
      loginFailed: 'Login failed',
      tokenExpired: 'Token expired, please login again',
      pleaseEnterUsername: 'Please enter username',
      pleaseEnterPassword: 'Please enter password',
      pleaseEnterTotp: 'Please enter 6-digit code',
      totpMustBe6Digits: 'Code must be 6 digits',
      enterUsernamePlaceholder: 'Enter username',
      enterPasswordPlaceholder: 'Enter password',
      enterTotpPlaceholder: 'Enter 6-digit code',
      configureServer: 'Configure Server',
      serverOnline: 'Server Online',
      serverOffline: 'Server Offline',
      serverNotConfigured: 'Not configured',
      checking: 'Checking…',
      recheck: 'Recheck',
    },
    main: {
      hi: 'Logged in as',
      notLoggedIn: 'Not logged in',
      changePassword: 'Change Password',
      logout: 'Logout',
      copyCode: 'Copy Code',
      copied: 'Copied!',
      countdownRefresh: 'Refresh in {seconds}s',
      codePlaceholder: '------',
      closeToTray: 'Close window to minimize to tray',
    },
    password: {
      title: 'Change Password',
      oldPassword: 'Old Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      enterOldPassword: 'Enter old password',
      enterNewPassword: 'Enter new password',
      enterConfirmPassword: 'Enter new password again',
      pleaseEnterOldPassword: 'Please enter old password',
      pleaseEnterNewPassword: 'Please enter new password',
      newPasswordMin8: 'New password must be at least 8 characters',
      newPasswordLettersAndDigits: 'New password must contain both letters and digits',
      passwordMismatch: 'Passwords do not match',
      modifying: 'Modifying...',
      confirmModify: 'Confirm Change',
      success: 'Password changed successfully',
      back: 'Back',
      networkError: 'Network connection failed',
      modifyFailed: 'Change failed',
    },
    config: {
      title: 'Server Configuration',
      back: 'Back to Login',
      description: 'Please configure TOTP server address',
      lanServers: 'Servers in LAN',
      rescanning: 'Scanning local network…',
      noServerFound: 'No server found. You can manually enter the address or check if you are on the same LAN.',
      serverLabel: 'Server Address (or enter manually)',
      placeholder: 'http://192.168.1.10:3001',
      saveConfig: 'Save Configuration',
      saveConfigLoading: 'Configuring…',
      cannotConnect: 'Cannot connect to this address, please check if the server is running',
      cannotConnectNetwork: 'Cannot connect to this address, please check network and server',
      latency: '{ms} ms latency',
      selected: 'Selected',
    },
    services: {
      hi: 'Logged in as',
      notLoggedIn: 'Not logged in',
      online: 'Online',
      offline: 'Offline',
      deptManagement: 'Departments',
      changePassword: 'Change Password',
      logout: 'Logout',
      searchPlaceholder: 'Search services...',
      loading: 'Loading...',
      empty: 'No services, please contact administrator',
      clickToGet: 'Click to get',
      revoked: 'Permission revoked',
      unfavorite: 'Remove from favorites',
      favoriteToShortcut: 'Add to shortcuts',
      removeFromList: 'Remove from my list',
      logoutConfirm: 'Are you sure to logout?',
      logoutCancel: 'Cancel',
      logoutConfirmBtn: 'Confirm',
      noAccountInfo: 'No account info',
    },
  },
}

// 翻译函数
export function useI18n() {
  const t = (key, params = {}) => {
    const keys = key.split('.')
    let value = messages[locale.value]
    for (const k of keys) {
      value = value?.[k]
      if (!value) break
    }
    
    if (!value) {
      // 如果找不到翻译，返回 key 本身
      return key
    }
    
    // 替换参数 {name} -> value
    return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
  }
  
  const setLocale = (newLocale) => {
    if (availableLocales.some(l => l.value === newLocale)) {
      locale.value = newLocale
      localStorage.setItem(STORAGE_KEY, newLocale)
    }
  }
  
  return {
    t,
    locale,
    setLocale,
    availableLocales,
  }
}

export default useI18n
