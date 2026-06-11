<template>
  <div>
  <el-card v-loading="loading">
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:8px">
          <el-button :icon="ArrowLeft" circle size="small" @click="goBack" :title="t('common.back')" />
          <span style="font-size:16px;font-weight:600">{{ t('settings.title') }}</span>
        </div>
      </div>
    </template>
    <el-form label-width="200px" style="max-width:580px">
      <el-divider content-position="left">{{ t('settings.loginSecurity') }}</el-divider>
      <el-form-item :label="t('settings.userLoginTtl')">
        <el-input-number v-model="form.token_expire_hours" :min="1" :max="168" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='token_expire_hours'" @click="save('token_expire_hours', form.token_expire_hours)">{{ t('common.save') }}</el-button>
      </el-form-item>
      <el-form-item :label="t('settings.adminSessionTimeout')">
        <el-input-number v-model="form.admin_session_timeout" :min="5" :max="1440" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='admin_session_timeout'" @click="save('admin_session_timeout', form.admin_session_timeout)">{{ t('common.save') }}</el-button>
      </el-form-item>
      <el-divider content-position="left">{{ t('settings.loginLockout') }}</el-divider>
      <el-form-item :label="t('settings.maxLoginFail')">
        <el-input-number v-model="form.login_fail_max" :min="1" :max="20" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='login_fail_max'" @click="save('login_fail_max', form.login_fail_max)">{{ t('common.save') }}</el-button>
      </el-form-item>
      <el-form-item :label="t('settings.lockoutDuration')">
        <el-input-number v-model="form.login_lock_minutes" :min="1" :max="1440" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='login_lock_minutes'" @click="save('login_lock_minutes', form.login_lock_minutes)">{{ t('common.save') }}</el-button>
      </el-form-item>
      <el-divider content-position="left">{{ t('settings.userRegistration') }}</el-divider>
      <el-form-item :label="t('settings.allowSelfRegister')">
        <el-switch
          v-model="form.allow_self_register"
          :active-value="true"
          :inactive-value="false"
          :loading="savingKey==='allow_self_register'"
          @change="save('allow_self_register', form.allow_self_register ? '1' : '0')"
        />
        <span style="margin-left:10px;font-size:12px;color:#909399">{{ t('settings.allowSelfRegisterHint') }}</span>
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
      <el-form-item :label="t('settings.oldPassword')" prop="oldPassword">
        <el-input v-model="pwd.oldPassword" type="password" show-password />
      </el-form-item>
      <el-form-item :label="t('settings.newPassword')" prop="newPassword">
        <el-input v-model="pwd.newPassword" type="password" show-password />
        <div class="form-hint">{{ t('settings.passwordHint') }}</div>
      </el-form-item>
      <el-form-item :label="t('settings.confirmPassword')" prop="confirmPassword">
        <el-input v-model="pwd.confirmPassword" type="password" show-password />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="pwdSaving" @click="handleChangePassword">{{ t('settings.changePassword') }}</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card style="margin-top:16px">
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:16px;font-weight:600">{{ t('settings.auditRetention') }}</span>
      </div>
    </template>
    <el-form label-width="240px" style="max-width:580px">
      <el-form-item :label="t('settings.logRetention')">
        <el-input-number v-model="form.log_retention_days" :min="1" :max="3650" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='log_retention_days'" @click="save('log_retention_days', form.log_retention_days)">{{ t('common.save') }}</el-button>
        <el-button type="warning" size="small" style="margin-left:8px" :loading="cleaning" @click="handleCleanup">{{ t('settings.cleanupNow') }}</el-button>
        <div class="form-hint">{{ t('settings.logRetentionHint') }}</div>
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
import { ArrowLeft } from '@element-plus/icons-vue'

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
  allow_self_register: false,
})

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/dashboard')
}

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
