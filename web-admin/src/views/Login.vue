<template>
  <div class="login-wrap">
    <div class="login-bg">
      <div class="bg-gradient"></div>
      <div class="bg-decoration"></div>
      <div class="bg-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>
    </div>
    <div class="login-card animate-scale-in">
      <div class="card-header">
        <div class="brand-logo">
          <div class="logo-icon">
            <el-icon size="32"><Key /></el-icon>
          </div>
          <span class="brand-name">GuardVault</span>
          <span class="brand-tagline">{{ t('login.tagline') }}</span>
        </div>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" @keyup.enter="handleLogin" class="login-form">
        <div class="form-group">
          <el-input
            v-model="form.username"
            :placeholder="t('login.username')"
            :prefix-icon="User"
            size="large"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="t('login.password')"
            :prefix-icon="Lock"
            size="large"
            show-password
            class="form-input"
          />
        </div>
        <div class="form-actions">
          <el-button type="primary" size="large" :loading="loading" class="btn-login" @click="handleLogin">
            {{ t('login.login') }}
          </el-button>
        </div>
      </el-form>
      <div class="card-footer">
        <span class="footer-text">{{ t('login.copyright') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Key } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()
const loading = ref(false)
const formRef = ref()
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: () => t('login.username'), trigger: 'blur' }],
  password: [{ required: true, message: () => t('login.password'), trigger: 'blur' }],
}

async function handleLogin() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await auth.login(form.username, form.password)
      router.push(route.query.redirect || '/')
    } catch {}
    finally { loading.value = false }
  })
}
</script>

<style scoped>
.login-wrap {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.bg-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #409eff 100%);
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%);
}

.bg-blobs {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
}

.blob-1 {
  width: 400px;
  height: 400px;
  background: rgba(255, 255, 255, 0.3);
  top: -100px;
  left: -100px;
  animation: float 10s ease-in-out infinite;
}

.blob-2 {
  width: 300px;
  height: 300px;
  background: rgba(255, 255, 255, 0.2);
  bottom: -50px;
  right: -50px;
  animation: float 8s ease-in-out infinite reverse;
}

.blob-3 {
  width: 250px;
  height: 250px;
  background: rgba(255, 255, 255, 0.25);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float 12s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(20px, -20px) scale(1.05); }
  50% { transform: translate(-10px, 20px) scale(0.95); }
  75% { transform: translate(-20px, -10px) scale(1.02); }
}

.login-card {
  position: relative;
  z-index: 1;
  width: 420px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

html.dark .login-card {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(71, 85, 105, 0.5);
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.brand-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #409eff, #667eea);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.4);
}

.brand-name {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #1a1a1a, #409eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

html.dark .brand-name {
  background: linear-gradient(135deg, #fff, #409eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-tagline {
  font-size: 13px;
  color: #909399;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  width: 100%;
}

.form-input {
  --el-input-bg-color: rgba(255, 255, 255, 0.8);
  --el-input-border-color: rgba(224, 231, 255, 0.6);
  --el-input-hover-border-color: #409eff;
  --el-input-focus-border-color: #409eff;
  border-radius: 12px;
}

html.dark .form-input {
  --el-input-bg-color: rgba(30, 41, 59, 0.8);
  --el-input-border-color: rgba(71, 85, 105, 0.6);
}

.form-actions {
  margin-top: 8px;
}

.btn-login {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #409eff 0%, #667eea 100%) !important;
  border: none !important;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
  transition: all 0.3s ease;
}

.btn-login:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(64, 158, 255, 0.5);
}

.btn-login:active {
  transform: translateY(0);
}

.card-footer {
  text-align: center;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

html.dark .card-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.footer-text {
  font-size: 12px;
  color: #909399;
}
</style>