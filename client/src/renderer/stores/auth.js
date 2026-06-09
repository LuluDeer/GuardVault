// 客户端用户态管理：所有鉴权操作经 IPC，token 在主进程
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/index.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const tokenExpired = ref(false);
  const online = ref(true);
  const loading = ref(false);
  const serverUrl = ref('');
  const showPassword = ref(false);

  const isLoggedIn = computed(() => !!user.value);

  async function bootstrap() {
    // 读服务端地址
    const cfg = await api.getConfig();
    serverUrl.value = cfg.serverUrl || '';
    // 启动时检查主进程是否已有 token，自动恢复登录态
    const has = await api.hasToken();
    if (has) {
      user.value = await api.getUser();
    }
  }

  async function setServerUrl(url) {
    serverUrl.value = url;
    await api.setConfig({ serverUrl: url });
  }

  async function login(username, password, totpCode) {
    loading.value = true;
    try {
      const result = await api.login(username, password, totpCode);
      if (result.code === 0) {
        // TOTP 必需时不要把 user 写进 store（此时未真正登录成功）
        if (result.data.totpRequired) {
          return {
            ok: true,
            totpRequired: true,
            challengeToken: result.data.challengeToken,
            expireAt: result.data.expireAt,
          };
        }
        user.value = result.data.user || null;
        tokenExpired.value = false;
        return { ok: true };
      }
      return { ok: false, message: result.message || '登录失败', code: result.code };
    } catch (err) {
      return { ok: false, message: err.message || '网络连接失败' };
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try { await api.logout(); } catch {}
    user.value = null;
  }

  function bindNetworkEvents() {
    api.onAuthExpired(() => {
      user.value = null;
      tokenExpired.value = true;
    });
    api.onNetOnline(() => { online.value = true; });
    api.onNetOffline(() => { online.value = false; });
  }

  return {
    user, tokenExpired, online, loading, serverUrl, showPassword, isLoggedIn,
    bootstrap, setServerUrl, login, logout, bindNetworkEvents,
  };
});
