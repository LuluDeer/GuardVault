<template>
  <el-card v-loading="loading">
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:16px;font-weight:600">系统配置</span>
      </div>
    </template>
    <el-form label-width="200px" style="max-width:580px">
      <el-divider content-position="left">登录安全策略</el-divider>
      <el-form-item label="用户Token有效期（小时）">
        <el-input-number v-model="form.token_expire_hours" :min="1" :max="168" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='token_expire_hours'" @click="save('token_expire_hours', form.token_expire_hours)">保存</el-button>
      </el-form-item>
      <el-form-item label="管理员会话超时（分钟）">
        <el-input-number v-model="form.admin_session_timeout" :min="5" :max="1440" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='admin_session_timeout'" @click="save('admin_session_timeout', form.admin_session_timeout)">保存</el-button>
      </el-form-item>
      <el-divider content-position="left">登录失败锁定</el-divider>
      <el-form-item label="最大失败次数">
        <el-input-number v-model="form.login_fail_max" :min="1" :max="20" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='login_fail_max'" @click="save('login_fail_max', form.login_fail_max)">保存</el-button>
      </el-form-item>
      <el-form-item label="锁定时长（分钟）">
        <el-input-number v-model="form.login_lock_minutes" :min="1" :max="1440" controls-position="right" />
        <el-button type="primary" size="small" style="margin-left:12px" :loading="savingKey==='login_lock_minutes'" @click="save('login_lock_minutes', form.login_lock_minutes)">保存</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSettings, updateSetting } from '@/api/settings'

const loading = ref(false)
const savingKey = ref('')
const form = reactive({
  token_expire_hours: 2,
  admin_session_timeout: 30,
  login_fail_max: 5,
  login_lock_minutes: 10,
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
  } finally { loading.value = false }
}

async function save(key, value) {
  savingKey.value = key
  try {
    await updateSetting(key, String(value))
    ElMessage.success('保存成功')
  } finally { savingKey.value = '' }
}

onMounted(fetchSettings)
</script>
