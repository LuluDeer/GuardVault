<template>
  <div class="password-wrap">
    <div class="password-card">
      <div class="title">{{ t('password.title') }}</div>
      
      <div class="form-group">
        <label>{{ t('password.oldPassword') }}</label>
        <input 
          v-model="oldPassword" 
          type="password" 
          :placeholder="t('password.enterOldPassword')"
          @keyup.enter="handleSubmit"
        />
      </div>
      
      <div class="form-group">
        <label>{{ t('password.newPassword') }}</label>
        <input 
          v-model="newPassword" 
          type="password" 
          :placeholder="t('password.enterNewPassword')"
          @keyup.enter="handleSubmit"
        />
      </div>
      
      <div class="form-group">
        <label>{{ t('password.confirmPassword') }}</label>
        <input 
          v-model="confirmPassword" 
          type="password" 
          :placeholder="t('password.enterConfirmPassword')"
          @keyup.enter="handleSubmit"
        />
      </div>
      
      <button :disabled="loading" @click="handleSubmit">
        {{ loading ? t('password.modifying') : t('password.confirmModify') }}
      </button>
      
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="showSuccess" class="success">{{ t('password.success') }}</div>
      
      <button class="back-btn" @click="goBack">{{ t('password.back') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import api from '../api';

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();
const showSuccess = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

async function handleSubmit() {
  if (!oldPassword.value) { error.value = t('password.pleaseEnterOldPassword'); return; }
  if (!newPassword.value) { error.value = t('password.pleaseEnterNewPassword'); return; }
  if (newPassword.value.length < 8) { error.value = t('password.newPasswordMin8'); return; }
  if (!/[a-zA-Z]/.test(newPassword.value) || !/[0-9]/.test(newPassword.value)) {
    error.value = t('password.newPasswordLettersAndDigits');
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = t('password.passwordMismatch');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const result = await api.changePassword(oldPassword.value, newPassword.value);
    if (result.code === 0) {
      showSuccess.value = true;
      // 主进程已清 token，1.5 秒后跳登录
      setTimeout(async () => {
        await auth.logout();
        router.replace('/login');
      }, 1500);
    } else {
      error.value = result.message || t('password.modifyFailed');
    }
  } catch {
    error.value = t('password.networkError');
  } finally {
    loading.value = false;
  }
}

function goBack() {
  // 走真实路由返回（不要只翻 auth.showPassword，那是旧 flag 模式）
  if (window.history.length > 1) {
    router.back();
  } else {
    router.replace('/services');
  }
}
</script>

<style scoped>
.password-wrap {
  min-height: 100vh;
  display: flex;
  /* 卡片靠上放（不再垂直居中），8vh 适配不同窗口高度 */
  align-items: flex-start;
  justify-content: center;
  padding: 8vh 20px 20px;
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