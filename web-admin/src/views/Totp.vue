<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
      <el-input v-model="query.keyword" :placeholder="t('users.searchPlaceholder')" :prefix-icon="Search" clearable @keyup.enter="handleSearch" />
    </el-col>
    <el-col :span="5">
      <el-select v-model="query.totpStatus" :placeholder="t('totp.statusFilter')" clearable style="width:100%">
        <el-option :label="t('users.enabled')" :value="1" />
        <el-option :label="t('users.disabled')" :value="0" />
      </el-select>
    </el-col>
    <el-col :span="6">
      <el-button type="primary" :icon="Search" @click="handleSearch">{{ t('common.search') }}</el-button>
      <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
    </el-col>
        <el-col :span="7" style="text-align:right">
          <el-button type="warning" :disabled="selectedIds.length===0" @click="handleBatchReset">
            批量重置 ({{ selectedIds.length }})
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top:16px">
      <el-table :data="filteredList" v-loading="loading" border stripe style="width:100%" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" :label="t('users.username')" min-width="140" />
        <el-table-column :label="t('users.totpEnabled')" width="110">
          <template #default="{ row }">
            <el-tag :type="row.totpEnabled?'primary':'info'" size="small">{{ row.totpEnabled ? t('users.enabled') : t('users.disabled') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('totp.lastAction')" min-width="160">
          <template #default="{ row }">{{ fmt(row.totpResetTime) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="310" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.totpEnabled" size="small" type="primary" @click="handleEnable(row)">{{ t('totp.enable') }}</el-button>
            <el-button v-if="row.totpEnabled" size="small" type="danger" @click="handleDisable(row)">{{ t('totp.disable') }}</el-button>
            <el-button v-if="row.totpEnabled" size="small" type="warning" @click="handleReset2FA(row)">{{ t('totp.reset') }}</el-button>
            <el-button v-if="row.totpEnabled" size="small" type="info" @click="openCodeDialog(row)">{{ t('totp.viewCode') }}</el-button>
            <el-button v-if="row.totpEnabled" size="small" type="success" @click="openSecretDialog(row)">{{ t('totp.viewSecret') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10,20,50]"
          layout="total, sizes, prev, pager, next, jumper"
          @change="fetchList"
        />
      </div>
    </el-card>

    <el-dialog v-model="codeVisible" :title="t('totp.codeTitle', { name: currentRow?.username })" width="340px" @close="stopTimer">
      <div class="code-box" v-loading="codeLoading">
        <div class="totp-code">{{ totpCode || '------' }}</div>
        <el-progress :percentage="countdownPct" :color="pctColor" :stroke-width="6" :show-text="false" style="width:180px;margin:0 auto" />
        <div class="countdown-tip">{{ t('totp.countdown', { seconds: countdown }) }}</div>
      </div>
      <template #footer>
        <el-button @click="codeVisible=false">{{ t('common.close') }}</el-button>
        <el-button type="primary" @click="fetchCode">{{ t('common.refresh') }}</el-button>
      </template>
    </el-dialog>

    <!-- TOTP 密钥查看 + 二维码 -->
    <el-dialog v-model="secretVisible" :title="t('totp.secretTitle', { name: secretInfo?.username })" width="420px">
      <div v-loading="secretLoading" class="secret-box">
        <p class="hint">{{ t('totp.secretHint') }}</p>
        <div class="qr-wrap">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="qr-img" />
          <div v-else class="qr-loading">生成二维码中...</div>
        </div>
        <div class="secret-text">
          <label>密钥（Base32）</label>
          <el-input v-model="secretInfo.secret" readonly>
            <template #append>
              <el-button @click="copySecret">复制</el-button>
            </template>
          </el-input>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList } from '@/api/user'
import { enableTotp, disableTotp, resetTotp, batchResetTotp, getTotpCode, getUserSecret } from '@/api/totp'
import QRCode from 'qrcode'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const selectedIds = ref([])
const query = reactive({ page: 1, pageSize: 20, keyword: '', totpStatus: '' })

// 前端过滤 totpStatus
const filteredList = computed(() => {
  if (query.totpStatus === '') return list.value
  return list.value.filter(r => (query.totpStatus === 1 ? r.totpEnabled : !r.totpEnabled))
})

const codeVisible = ref(false)
const codeLoading = ref(false)
const currentRow = ref(null)
const totpCode = ref('')
const countdown = ref(30)
let timer = null

// 密钥查看对话框
const secretVisible = ref(false)
const secretLoading = ref(false)
const secretInfo = ref({ userId: null, username: '', secret: '', otpauthUrl: '' })
const qrDataUrl = ref('')
let secretTimer = null

const countdownPct = computed(() => (countdown.value / 30) * 100)
const pctColor = computed(() => countdown.value > 15 ? '#67c23a' : countdown.value > 8 ? '#e6a23c' : '#f56c6c')

const fmt = (v) => v ? new Date(v).toLocaleString('zh-CN') : '-'

async function fetchList() {
  loading.value = true
  try {
    const res = await getUserList({ page: query.page, pageSize: query.pageSize, keyword: query.keyword })
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }
function handleReset() { query.keyword = ''; query.totpStatus = ''; query.page = 1; fetchList() }
function onSelectionChange(rows) { selectedIds.value = rows.map((r) => r.id) }

async function handleEnable(row) {
  try {
    await ElMessageBox.confirm(t('totp.enableConfirm', { name: row.username }), t('common.tip'), { type: 'info' })
    await enableTotp(row.id); ElMessage.success(t('totp.enableSuccess')); fetchList()
  } catch {}
}
async function handleDisable(row) {
  try {
    await ElMessageBox.confirm(t('totp.disableConfirm', { name: row.username }), t('common.warning'), { type: 'warning' })
    await disableTotp(row.id); ElMessage.success(t('totp.disableSuccess')); fetchList()
  } catch {}
}
async function handleReset2FA(row) {
  try {
    await ElMessageBox.confirm(t('totp.resetConfirm', { name: row.username }), t('common.warning'), { type: 'warning' })
    await resetTotp(row.id); ElMessage.success(t('totp.resetSuccess')); fetchList()
  } catch {}
}
async function handleBatchReset() {
  try {
    await ElMessageBox.confirm(t('totp.batchResetConfirm', { count: selectedIds.value.length }), t('common.warning'), { type: 'warning' })
    await batchResetTotp(selectedIds.value)
    ElMessage.success(t('totp.batchResetSuccess', { count: selectedIds.value.length }))
    fetchList()
  } catch {}
}

async function fetchCode() {
  if (!currentRow.value) return
  codeLoading.value = true
  try {
    const res = await getTotpCode(currentRow.value.id)
    totpCode.value = res.data.code
    countdown.value = res.data.remainSeconds ?? 30
  } finally { codeLoading.value = false }
}

function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

function openCodeDialog(row) {
  currentRow.value = row
  totpCode.value = ''
  countdown.value = 30
  codeVisible.value = true
  fetchCode().then(() => {
    stopTimer()
    timer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) fetchCode()
    }, 1000)
  })
}

async function openSecretDialog(row) {
  // 高危：先弹窗要求管理员二次输入密码确认
  let adminPassword
  try {
    const { value } = await ElMessageBox.prompt(
      `查看「${row.username}」的 TOTP 明文密钥是高危操作，请输入管理员密码以确认身份`,
      '安全验证',
      {
        type: 'warning',
        confirmButtonText: '确认查看',
        cancelButtonText: '取消',
        inputType: 'password',
        inputValidator: (v) => (v && v.length >= 1 ? true : '请输入管理员密码'),
      }
    )
    adminPassword = value
  } catch {
    return // 用户取消
  }

  secretVisible.value = true
  secretLoading.value = true
  secretInfo.value = { userId: row.id, username: row.username, secret: '', otpauthUrl: '' }
  qrDataUrl.value = ''
  try {
    const res = await getUserSecret(row.id, adminPassword)
    const data = res.data || {}
    secretInfo.value = {
      userId: data.userId,
      username: data.username,
      secret: data.secret,
      otpauthUrl: data.otpauthUrl,
    }
    // 生成二维码（dataURL），避免外部依赖图片
    if (data.otpauthUrl) {
      try {
        qrDataUrl.value = await QRCode.toDataURL(data.otpauthUrl, { width: 220, margin: 1 })
      } catch (e) {
        // 二维码生成失败不影响明文展示
        qrDataUrl.value = ''
      }
    }
  } catch (err) {
    secretVisible.value = false
    ElMessage.error(err?.response?.data?.message || '获取密钥失败')
  } finally {
    secretLoading.value = false
  }
}

async function copySecret() {
  if (!secretInfo.value?.secret) {
    ElMessage.warning('暂无可复制的密钥')
    return
  }
  try {
    await navigator.clipboard.writeText(secretInfo.value.secret)
    ElMessage.success('已复制密钥')
  } catch {
    ElMessage.error('复制失败，请手动选中复制')
  }
}

onMounted(fetchList)
onUnmounted(() => { stopTimer(); if (secretTimer) clearInterval(secretTimer) })
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.code-box { text-align: center; padding: 16px 0; }
.totp-code {
  font-size: 46px;
  font-weight: 700;
  letter-spacing: 8px;
  color: #303133;
  font-family: 'Courier New', monospace;
  margin-bottom: 16px;
}
.countdown-tip { margin-top: 8px; font-size: 13px; color: #909399; }

/* TOTP 密钥查看对话框 */
.secret-box .hint { font-size: 12px; color: #909399; margin: 0 0 12px; line-height: 1.5; }
.secret-box .qr-wrap { display: flex; justify-content: center; padding: 10px 0 14px; }
.secret-box .qr-img { width: 200px; height: 200px; border: 1px solid #ebeef5; border-radius: 6px; padding: 6px; background: #fff; }
.secret-box .qr-loading { width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; color: #909399; font-size: 12px; border: 1px dashed #dcdfe6; border-radius: 6px; }
.secret-box .secret-text { text-align: left; }
.secret-box .secret-text label { display: block; font-size: 12px; color: #606266; margin-bottom: 6px; }
</style>
