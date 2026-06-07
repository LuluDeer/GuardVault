<template>
  <div>
  <el-card v-loading="loading">
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:16px;font-weight:600">{{ t('settings.title') }}</span>
      </div>
    </template>
    <el-form label-width="200px" style="max-width:580px">
      <el-divider content-position="left">Login Security</el-divider>
      <el-form-item :label="`User ${t('login.login')} TTL (h)`">
        <el-input-number v-model="form.token_expire_hours" :min="1" :max="168" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='token_expire_hours'" @click="save('token_expire_hours', form.token_expire_hours)">{{ t('common.save') }}</el-button>
      </el-form-item>
      <el-form-item :label="`Admin Session Timeout (min)`">
        <el-input-number v-model="form.admin_session_timeout" :min="5" :max="1440" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='admin_session_timeout'" @click="save('admin_session_timeout', form.admin_session_timeout)">{{ t('common.save') }}</el-button>
      </el-form-item>
      <el-divider content-position="left">Login Lockout</el-divider>
      <el-form-item :label="`Max ${t('login.loginFailed')}`">
        <el-input-number v-model="form.login_fail_max" :min="1" :max="20" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='login_fail_max'" @click="save('login_fail_max', form.login_fail_max)">{{ t('common.save') }}</el-button>
      </el-form-item>
      <el-form-item :label="`Lockout Duration (min)`">
        <el-input-number v-model="form.login_lock_minutes" :min="1" :max="1440" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='login_lock_minutes'" @click="save('login_lock_minutes', form.login_lock_minutes)">{{ t('common.save') }}</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card style="margin-top:16px" v-loading="pwdLoading">
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:16px;font-weight:600">{{ t('settings.security') }} - {{ t('login.password') }}</span>
      </div>
    </template>
    <el-form :model="pwd" :rules="pwdRules" ref="pwdForm" label-width="160px" style="max-width:480px">
      <el-form-item :label="`Old ${t('login.password')}`" prop="oldPassword">
        <el-input v-model="pwd.oldPassword" type="password" show-password />
      </el-form-item>
      <el-form-item :label="`New ${t('login.password')}`" prop="newPassword">
        <el-input v-model="pwd.newPassword" type="password" show-password />
        <div class="form-hint">≥8 chars, letters & digits</div>
      </el-form-item>
      <el-form-item label="Confirm" prop="confirmPassword">
        <el-input v-model="pwd.confirmPassword" type="password" show-password />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="pwdSaving" @click="handleChangePassword">Change</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card style="margin-top:16px">
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:16px;font-weight:600">Audit Log Retention</span>
      </div>
    </template>
    <el-form label-width="240px" style="max-width:580px">
      <el-form-item label="Log Retention (days)">
        <el-input-number v-model="form.log_retention_days" :min="1" :max="3650" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='log_retention_days'" @click="save('log_retention_days', form.log_retention_days)">{{ t('common.save') }}</el-button>
        <el-button type="warning" size="small" style="margin-left:8px" :loading="cleaning" @click="handleCleanup">Cleanup Now</el-button>
        <div class="form-hint">Logs older than this will be auto-deleted daily at 3 AM. Manual cleanup deletes immediately.</div>
      </el-form-item>
    </el-form>
  </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { getSettings, updateSetting } from '@/api/settings'
import { changeAdminPassword } from '@/api/auth'
import { request } from '@/api/index'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const router = useRouter()
const loading = ref(false)
const savingKey = ref('')
const cleaning = ref(false)
const form = reactive({
  token_expire_hours: 2,
  admin_session_timeout: 30,
  login_fail_max: 5,
  login_lock_minutes: 10,
  log_retention_days: 90,
})

async function fetchSettings() {
  loading.value = true
  try {
    const res = await getSettings()
    const cfg = res.data
    form.token_expire_hours = Number(cfg.token_expire_hours) || 2
    form.admin_session_timeout = Number(cfg.admin_session_timeout) || 30
    form.login_fail_max = Number(cfg.login_fail_max) || 5
    form.login_lock_minutes = Number(cfg.login_lock_minutes) || 10
    form.log_retention_days = Number(cfg.log_retention_days) || 90
  } finally { loading.value = false }
}

async function save(key, value) {
  savingKey.value = key
  try {
    await updateSetting(key, String(value))
    ElMessage.success(t('common.success'))
  } finally { savingKey.value = '' }
}

async function handleCleanup() {
  try {
    await ElMessageBox.confirm(
      `This will permanently delete all system logs older than ${form.log_retention_days} days. Continue?`,
      t('common.warning'),
      { type: 'warning' }
    )
    cleaning.value = true
    const res = await request({ method: 'POST', url: '/api/admin/log/cleanup', data: {} })
    ElMessage.success(`Deleted ${res.data.deleted} log(s), retention=${res.data.retentionDays} days`)
  } catch (e) {
    if (e !== 'cancel') {
      // 失败提示已由拦截器给出
    }
  } finally {
    cleaning.value = false
  }
}

// ===== 修改管理员密码 =====
const pwdForm = ref(null)
const pwdLoading = ref(false)
const pwdSaving = ref(false)
const pwd = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const pwdRules = computed(() => ({
  oldPassword: [{ required: true, message: 'Required', trigger: 'blur' }],
  newPassword: [
    { required: true, message: 'Required', trigger: 'blur' },
    { min: 8, message: '≥8', trigger: 'blur' },
    {
      validator: (_, v, cb) => {
        if (!/[a-zA-Z]/.test(v) || !/[0-9]/.test(v)) cb(new Error('Letters & digits required'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: 'Required', trigger: 'blur' },
    {
      validator: (_, v, cb) => {
        if (v !== pwd.newPassword) cb(new Error('Mismatch'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
}))

async function handleChangePassword() {
  await pwdForm.value?.validate()
  pwdSaving.value = true
  try {
    await changeAdminPassword(pwd.oldPassword, pwd.newPassword)
    ElMessage.success('Password changed')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
    setTimeout(() => router.push('/login'), 800)
  } catch {} finally { pwdSaving.value = false }
}

onMounted(fetchSettings)
</script>

<style scoped>
.form-hint { font-size: 12px; color: #909399; line-height: 1.5; margin-top: 4px; }
</style>
