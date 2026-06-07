<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <div class="login-title">{{ t('login.title') }}</div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" :placeholder="t('login.username')" :prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" :placeholder="t('login.password')" :prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" style="width:100%" @click="handleLogin">{{ t('login.login') }}</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
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
  background: #f0f2f5;
}
.login-card {
  width: 380px;
}
.login-title {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 28px;
  color: #303133;
}
</style>
