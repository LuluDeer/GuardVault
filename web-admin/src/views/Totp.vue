<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-input v-model="query.keyword" placeholder="搜索用户名" :prefix-icon="Search" clearable @keyup.enter="handleSearch" />
        </el-col>
        <el-col :span="5">
          <el-select v-model="query.totpStatus" placeholder="TOTP状态" clearable style="width:100%">
            <el-option label="已开启" :value="1" />
            <el-option label="未开启" :value="0" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
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
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column label="TOTP状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.totpEnabled?'primary':'info'" size="small">{{ row.totpEnabled?'已开启':'未开启' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后操作" min-width="160">
          <template #default="{ row }">{{ fmt(row.totpResetTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="310" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.totpEnabled" size="small" type="primary" @click="handleEnable(row)">开通2FA</el-button>
            <el-button v-if="row.totpEnabled" size="small" type="danger" @click="handleDisable(row)">禁用2FA</el-button>
            <el-button v-if="row.totpEnabled" size="small" type="warning" @click="handleReset2FA(row)">重置2FA</el-button>
            <el-button v-if="row.totpEnabled" size="small" type="info" @click="openCodeDialog(row)">查看动态码</el-button>
            <el-button v-if="row.totpEnabled" size="small" type="success" @click="openSecretDialog(row)">查看密钥</el-button>
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

    <el-dialog v-model="codeVisible" :title="`动态码 - ${currentRow?.username}`" width="340px" @close="stopTimer">
      <div class="code-box" v-loading="codeLoading">
        <div class="totp-code">{{ totpCode || '------' }}</div>
        <el-progress :percentage="countdownPct" :color="pctColor" :stroke-width="6" :show-text="false" style="width:180px;margin:0 auto" />
        <div class="countdown-tip">{{ countdown }}秒后刷新</div>
      </div>
      <template #footer>
        <el-button @click="codeVisible=false">关闭</el-button>
        <el-button type="primary" @click="fetchCode">刷新</el-button>
      </template>
    </el-dialog>

    <!-- TOTP 密钥查看 + 二维码 -->
    <el-dialog v-model="secretVisible" :title="`TOTP 密钥 - ${secretInfo?.username}`" width="420px">
      <div v-loading="secretLoading" class="secret-box">
        <p class="hint">用户可使用 Google Authenticator / 微软 Authenticator 扫描下方二维码绑定</p>
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
    await ElMessageBox.confirm(`确定为「${row.username}」开通2FA吗？`, '提示', { type: 'info' })
    await enableTotp(row.id); ElMessage.success('已开通2FA'); fetchList()
  } catch {}
}
async function handleDisable(row) {
  try {
    await ElMessageBox.confirm(`确定禁用「${row.username}」的2FA吗？`, '警告', { type: 'warning' })
    await disableTotp(row.id); ElMessage.success('已禁用2FA'); fetchList()
  } catch {}
}
async function handleReset2FA(row) {
  try {
    await ElMessageBox.confirm(`确定重置「${row.username}」的2FA密钥吗？`, '警告', { type: 'warning' })
    await resetTotp(row.id); ElMessage.success('2FA已重置'); fetchList()
  } catch {}
}
async function handleBatchReset() {
  try {
    await ElMessageBox.confirm(`确定批量重置 ${selectedIds.value.length} 个用户的2FA吗？`, '警告', { type: 'warning' })
    await batchResetTotp(selectedIds.value)
    ElMessage.success(`已批量重置 ${selectedIds.value.length} 个用户的2FA`)
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

onMounted(fetchList)
onUnmounted(stopTimer)
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
.secret-box { text-align: center; }
.hint { font-size: 13px; color: #909399; margin-bottom: 12px; }
.qr-wrap { display: flex; justify-content: center; margin-bottom: 16px; }
.qr-img { width: 220px; height: 220px; border: 1px solid #eee; border-radius: 8px; }
.qr-loading { width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; color: #909399; background: #f5f7fa; border-radius: 8px; }
.secret-text { text-align: left; }
.secret-text label { display: block; font-size: 13px; color: #606266; margin-bottom: 6px; }
</style>
