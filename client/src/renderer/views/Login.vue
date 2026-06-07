<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="title">TOTP 客户端</div>

      <div v-if="auth.tokenExpired" class="warning">
        Token 已失效，请重新登录
      </div>

      <div class="form-group">
        <label>用户名</label>
        <input v-model="username" type="text" placeholder="请输入用户名"
               autocomplete="username" @keyup.enter="handleLogin" />
      </div>

      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="请输入密码"
               autocomplete="current-password" @keyup.enter="handleLogin" />
      </div>

      <div v-if="showTotpInput" class="form-group">
        <label>TOTP 验证码</label>
        <input v-model="totpCode" type="text" placeholder="请输入6位动态验证码"
               maxlength="6" @keyup.enter="handleLogin" />
      </div>

      <div class="checkbox-group">
        <label class="checkbox">
          <input type="checkbox" v-model="rememberMe" />
          <span>记住用户名</span>
        </label>
      </div>

      <button :disabled="auth.loading" @click="handleLogin">
        {{ auth.loading ? '登录中...' : '登录' }}
      </button>

      <div v-if="error" class="error">{{ error }}</div>

      <div class="footer">
        <button class="link-btn" @click="showConfig">配置服务端</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const error = ref('');
const showTotpInput = ref(false);
const totpCode = ref('');
const challengeToken = ref('');

onMounted(() => {
  const saved = localStorage.getItem('saved_username');
  if (saved) {
    username.value = saved;
    rememberMe.value = true;
  }
});

async function handleLogin() {
  error.value = '';

  if (!showTotpInput.value) {
    if (!username.value.trim() || !password.value) {
      error.value = '请输入用户名和密码';
      return;
    }
  } else {
    if (!totpCode.value.trim()) {
      error.value = '请输入TOTP验证码';
      return;
    }
    if (totpCode.value.length !== 6) {
      error.value = '验证码必须为6位数字';
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

  if (rememberMe.value) {
    localStorage.setItem('saved_username', username.value.trim());
  } else {
    localStorage.removeItem('saved_username');
  }
}

function showConfig() {
  auth.setServerUrl('');
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
