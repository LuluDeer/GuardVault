<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="title">TOTP 客户端</div>
      
      <div class="form-group">
        <label>用户名</label>
        <input 
          v-model="username" 
          type="text" 
          placeholder="请输入用户名"
          @keyup.enter="handleLogin"
        />
      </div>
      
      <div class="form-group">
        <label>密码</label>
        <input 
          v-model="password" 
          type="password" 
          placeholder="请输入密码"
          @keyup.enter="handleLogin"
        />
      </div>
      
      <div class="checkbox-group">
        <label class="checkbox">
          <input type="checkbox" v-model="rememberMe" />
          <span>记住用户名</span>
        </label>
      </div>
      
      <button :disabled="loading" @click="handleLogin">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      
      <div v-if="error" class="error">{{ error }}</div>
      
      <div class="footer">
        <button class="link-btn" @click="showConfig">配置服务端</button>
      </div>
    </div>
  </div>
</template>

<script setup>import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { login as apiLogin } from '../api';
const auth = useAuthStore();
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');

onMounted(() => {
  const saved = localStorage.getItem('saved_username');
  if (saved) {
    username.value = saved;
    rememberMe.value = true;
  }
});

async function handleLogin() {
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    const result = await apiLogin(username.value.trim(), password.value);
    
    if (result.code === 0) {
      auth.login(result.data.token, username.value.trim());
      
      if (rememberMe.value) {
        localStorage.setItem('saved_username', username.value.trim());
      } else {
        localStorage.removeItem('saved_username');
      }
    } else {
      error.value = result.message || '登录失败';
    }
  } catch (e) {
    error.value = '网络连接失败，请检查服务端配置';
  } finally {
    loading.value = false;
  }
}

function showConfig() {
  auth.setServerUrl('');
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
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
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.checkbox-group {
  margin-bottom: 20px;
}

.checkbox {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}

.checkbox input {
  margin-right: 8px;
  width: 16px;
  height: 16px;
}

button {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin-top: 16px;
  padding: 12px;
  background: #fef0f0;
  color: #f56c6c;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}

.footer {
  margin-top: 20px;
  text-align: center;
}

.link-btn {
  background: none;
  color: #667eea;
  font-size: 13px;
  height: auto;
  padding: 0;
}

.link-btn:hover {
  text-decoration: underline;
}
</style>