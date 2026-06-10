<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="title">TOTP 客户端</div>

      <!-- 服务端在线状态 -->
      <div class="server-status" :class="{ online: serverOnline, offline: !serverOnline }">
        <span class="status-dot"></span>
        <span class="status-text">
          <template v-if="checking">{{ t('login.checking') }}</template>
          <template v-else-if="serverOnline">{{ t('login.serverOnline') }}</template>
          <template v-else>{{ t('login.serverOffline') }}</template>
        </span>
        <span class="status-url" :title="currentServerUrl || auth.serverUrl">{{ currentServerUrl || auth.serverUrl || t('login.serverNotConfigured') }}</span>
        <button class="status-refresh" :disabled="checking" @click="checkServer" :title="t('login.recheck')">↻</button>
      </div>

      <div v-if="auth.tokenExpired" class="warning">
        {{ t('login.tokenExpired') }}
      </div>

      <div class="form-group">
        <label>{{ t('login.username') }}</label>
        <input v-model="username" type="text" :placeholder="t('login.enterUsernamePlaceholder')"
               autocomplete="username" @keyup.enter="handleLogin" />
      </div>

      <div class="form-group">
        <label>{{ t('login.password') }}</label>
        <input v-model="password" type="password" :placeholder="t('login.enterPasswordPlaceholder')"
               autocomplete="current-password" @keyup.enter="handleLogin" />
      </div>

      <div v-if="showTotpInput" class="form-group">
        <label>{{ t('login.totp') }}</label>
        <input v-model="totpCode" type="text" :placeholder="t('login.enterTotpPlaceholder')"
               maxlength="6" @keyup.enter="handleLogin" />
      </div>

      <div class="checkbox-group">
        <label class="checkbox">
          <input type="checkbox" v-model="rememberMe" />
          <span>{{ t('login.remember') }}</span>
        </label>
      </div>

      <button :disabled="auth.loading" @click="handleLogin">
        {{ auth.loading ? t('login.loggingIn') : t('login.login') }}
      </button>

      <div v-if="error" class="error">{{ error }}</div>

      <div class="footer">
        <button class="link-btn" @click="showConfig">{{ t('login.configureServer') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import api from '../api';

const router = useRouter();
const auth = useAuthStore();
const { t } = useI18n();
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const error = ref('');
const showTotpInput = ref(false);
const totpCode = ref('');
const challengeToken = ref('');

// 服务端在线状态（不依赖心跳，立即主动 ping）
const serverOnline = ref(false);
const checking = ref(false);
const currentServerUrl = ref('');

async function checkServer() {
  // 避免和 App.vue 的 bootstrap 竞态：每次独立读 config
  const cfg = await api.getConfig();
  const url = cfg?.serverUrl || '';
  currentServerUrl.value = url;
  if (!url) {
    serverOnline.value = false;
    return;
  }
  checking.value = true;
  try {
    const r = await api.request({ method: 'GET', url: '/health' });
    const ok = r && (r.status === 'ok' || (r.code === 0 && r.data?.status === 'ok'));
    serverOnline.value = !!ok;
  } catch (e) {
    serverOnline.value = false;
  } finally {
    checking.value = false;
  }
}

onMounted(async () => {
  const saved = localStorage.getItem('saved_username');
  if (saved) {
    username.value = saved;
    rememberMe.value = true;
  }
  // 启动后立即检测一次服务端
  await checkServer();
});

async function handleLogin() {
  error.value = '';

  if (!showTotpInput.value) {
    if (!username.value.trim() || !password.value) {
      error.value = t('login.pleaseEnterUsername') + ' ' + t('login.pleaseEnterPassword');
      return;
    }
  } else {
    if (!totpCode.value.trim()) {
      error.value = t('login.pleaseEnterTotp');
      return;
    }
    if (totpCode.value.length !== 6) {
      error.value = t('login.totpMustBe6Digits');
      return;
    }
  }

  const loginData = showTotpInput.value
    ? { username: username.value.trim(), password: password.value, totpCode: totpCode.value }
    : { username: username.value.trim(), password: password.value };

  const r = await auth.login(loginData.username, loginData.password, loginData.totpCode);
  if (!r.ok) {
    error.value = r.message;
    showTotpInput.value = false;
    totpCode.value = '';
    challengeToken.value = '';
    return;
  }

  if (r.totpRequired) {
    showTotpInput.value = true;
    challengeToken.value = r.challengeToken;
    error.value = '请输入TOTP动态验证码';
    return;
  }

  // 登录成功：保存用户名（如果勾选记住）并跳转到服务列表
  if (rememberMe.value) {
    localStorage.setItem('saved_username', username.value.trim());
  } else {
    localStorage.removeItem('saved_username');
  }
  router.replace('/services');
}

function showConfig() {
  auth.setServerUrl('');
  router.replace('/config');
}
</script>

<style scoped>
.login-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: calc(100vh - 36px - 32px);
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  text-align: center;
  margin-bottom: 24px;
}

.warning {
  background: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 13px;
  text-align: center;
}

.server-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 16px;
  font-size: 12px;
}
.server-status .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.2s;
}
.server-status.online .status-dot {
  background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103,194,58,0.15);
  animation: pulse 2s ease-in-out infinite;
}
.server-status.offline .status-dot {
  background: #f56c6c;
  box-shadow: 0 0 0 3px rgba(245,108,108,0.15);
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(103,194,58,0.15); }
  50% { box-shadow: 0 0 0 6px rgba(103,194,58,0.05); }
}
.server-status .status-text {
  font-weight: 600;
  color: #303133;
  flex-shrink: 0;
}
.server-status.offline .status-text { color: #f56c6c; }
.server-status .status-url {
  flex: 1;
  min-width: 0;
  font-family: monospace;
  font-size: 11px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}
.server-status .status-refresh {
  width: 24px;
  height: 24px;
  background: none;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.2s;
}
.server-status .status-refresh:hover:not(:disabled) {
  background: #ecf5ff;
  color: #409eff;
  border-color: #409eff;
}
.server-status .status-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group { margin-bottom: 16px; }
.form-group label {
  display: block;
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}
.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.form-group input:focus { border-color: #667eea; }

.checkbox-group { margin: 12px 0 20px; }
.checkbox { display: flex; align-items: center; font-size: 13px; color: #606266; cursor: pointer; }
.checkbox input { margin-right: 6px; }

button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
button:hover:not(:disabled) { opacity: 0.9; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.error {
  background: #fee;
  color: #c33;
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 12px;
  font-size: 13px;
  text-align: center;
}

.footer { text-align: center; margin-top: 20px; }
.link-btn {
  background: none;
  color: #667eea;
  border: none;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  width: auto;
}
</style>
