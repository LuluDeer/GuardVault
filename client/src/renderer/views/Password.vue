<template>
  <div class="password-wrap">
    <div class="password-card">
      <div class="title">修改密码</div>
      
      <div class="form-group">
        <label>原密码</label>
        <input 
          v-model="oldPassword" 
          type="password" 
          placeholder="请输入原密码"
          @keyup.enter="handleSubmit"
        />
      </div>
      
      <div class="form-group">
        <label>新密码</label>
        <input 
          v-model="newPassword" 
          type="password" 
          placeholder="请输入新密码"
          @keyup.enter="handleSubmit"
        />
      </div>
      
      <div class="form-group">
        <label>确认密码</label>
        <input 
          v-model="confirmPassword" 
          type="password" 
          placeholder="请再次输入新密码"
          @keyup.enter="handleSubmit"
        />
      </div>
      
      <button :disabled="loading" @click="handleSubmit">
        {{ loading ? '修改中...' : '确认修改' }}
      </button>
      
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="showSuccess" class="success">密码修改成功</div>
      
      <button class="back-btn" @click="goBack">返回</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const auth = useAuthStore();
const showSuccess = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

async function handleSubmit() {
  if (!oldPassword.value) { error.value = '请输入原密码'; return; }
  if (!newPassword.value) { error.value = '请输入新密码'; return; }
  if (newPassword.value.length < 8) { error.value = '新密码至少8位'; return; }
  if (!/[a-zA-Z]/.test(newPassword.value) || !/[0-9]/.test(newPassword.value)) {
    error.value = '新密码必须同时包含字母和数字';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const result = await api.changePassword(oldPassword.value, newPassword.value);
    if (result.code === 0) {
      showSuccess.value = true;
      // 主进程已清token，1.5秒后跳登录
      setTimeout(() => {
        auth.showPassword = false;
        auth.user = null;
      }, 1500);
    } else {
      error.value = result.message || '修改失败';
    }
  } catch {
    error.value = '网络连接失败';
  } finally {
    loading.value = false;
  }
}

function goBack() {
  auth.showPassword = false;
}
</script>

<style scoped>
.password-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.password-card {
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

.success {
  margin-top: 16px;
  padding: 12px;
  background: #f0f9eb;
  color: #67c23a;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}

.back-btn {
  margin-top: 16px;
  background: #f5f7fa;
  color: #606266;
}

.back-btn:hover {
  background: #e4e7ed;
}
</style>