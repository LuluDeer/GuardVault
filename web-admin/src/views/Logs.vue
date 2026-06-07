<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="5">
          <el-input v-model="query.username" :placeholder="t('logs.operator')" :prefix-icon="User" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="query.actionType" :placeholder="t('logs.action')" clearable style="width:100%">
            <el-option v-for="(label, val) in ACTION_MAP" :key="val" :label="label" :value="val" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select v-model="query.result" placeholder="结果" clearable style="width:100%">
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="0" />
          </el-select>
        </el-col>
        <el-col :span="7">
          <el-date-picker
            v-model="timeRange"
            type="datetimerange"
            range-separator="→"
            :start-placeholder="t('logs.exportRange')"
            :end-placeholder="t('logs.exportRange')"
            style="width:100%"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" :icon="Search" @click="handleSearch">{{ t('common.search') }}</el-button>
          <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top:16px">
      <TableToolbar :title="t('logs.title')">
        <el-button-group>
          <el-button type="success" :icon="Download" @click="handleExport('csv')">{{ t('common.export') }} CSV</el-button>
          <el-button type="warning" :icon="Download" @click="handleExport('json')">{{ t('common.export') }} JSON</el-button>
        </el-button-group>
      </TableToolbar>
      <el-table :data="list" v-loading="loading" border stripe style="width:100%">
        <el-table-column prop="id" :label="t('common.id')" width="80" />
        <el-table-column prop="operatorName" :label="t('logs.operator')" width="130" />
        <el-table-column :label="t('logs.action')" width="160">
          <template #default="{ row }">
            <el-tag :type="ACTION_TAG[row.actionType]" size="small">{{ ACTION_MAP[row.actionType] || row.actionType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetUsername" :label="t('logs.target')" width="130">
          <template #default="{ row }">{{ row.targetUsername || '-' }}</template>
        </el-table-column>
        <el-table-column prop="clientIp" :label="t('logs.ip')" width="130" />
        <el-table-column prop="actionDesc" :label="t('logs.detail')" min-width="180" show-overflow-tooltip />
        <el-table-column :label="t('common.status')" width="80">
          <template #default="{ row }">
            <el-tag :type="row.result===1?'success':'danger'" size="small">{{ row.result===1?'OK':'FAIL' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="t('logs.time')" min-width="160">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[20,50,100]"
          layout="total, sizes, prev, pager, next, jumper"
          @change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { Search, User, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getLogList, exportLogs } from '@/api/log'
import TableToolbar from '@/components/TableToolbar.vue'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const timeRange = ref(null)
const query = reactive({ page: 1, pageSize: 20, username: '', actionType: '', result: '', startTime: '', endTime: '' })

const ACTION_MAP = {
  ADMIN_LOGIN: '管理员登录',
  ADMIN_LOGOUT: '管理员登出',
  SYSTEM_INIT: '系统初始化',
  USER_CREATE: '创建用户',
  USER_DELETE: '删除用户',
  USER_UPDATE: '修改用户',
  USER_ENABLE: '启用用户',
  USER_DISABLE: '禁用用户',
  USER_LOGIN: '用户登录',
  USER_LOGOUT: '用户登出',
  USER_GET_CODE: '获取动态码',
  USER_CHANGE_PASSWORD: '修改密码',
  TOTP_ENABLE: '开通2FA',
  TOTP_DISABLE: '禁用2FA',
  TOTP_RESET: '重置2FA',
  ADMIN_VIEW_CODE: '管理员查看动态码',
  CONFIG_UPDATE: '修改配置',
}
const ACTION_TAG = {
  ADMIN_LOGIN: 'success', ADMIN_LOGOUT: 'info',
  SYSTEM_INIT: 'warning',
  USER_CREATE: 'primary', USER_DELETE: 'danger', USER_UPDATE: 'warning',
  USER_ENABLE: 'success', USER_DISABLE: 'danger',
  USER_LOGIN: 'success', USER_LOGOUT: 'info',
  USER_GET_CODE: '', USER_CHANGE_PASSWORD: 'warning',
  TOTP_ENABLE: 'primary', TOTP_DISABLE: 'danger', TOTP_RESET: 'warning',
  ADMIN_VIEW_CODE: 'info', CONFIG_UPDATE: 'warning',
}

const fmt = (v) => v ? new Date(v).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US') : '-'

watch(timeRange, (val) => {
  query.startTime = val?.[0] || ''
  query.endTime = val?.[1] || ''
})

async function fetchList() {
  loading.value = true
  try {
    const res = await getLogList(query)
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }
function handleReset() {
  query.username = ''; query.actionType = ''; query.result = ''
  query.startTime = ''; query.endTime = ''
  timeRange.value = null; query.page = 1; fetchList()
}

async function handleExport(format = 'csv') {
  try {
    const blob = await exportLogs({
      actionType: query.actionType,
      startTime: query.startTime,
      endTime: query.endTime,
    });
    let out
    let filename
    if (format === 'json') {
      // 解析 CSV blob 为 JSON 行（简单转换）
      const text = await blob.text()
      const rows = parseCsv(text)
      const headers = rows[0] || []
      const items = rows.slice(1).map(r => {
        const obj = {}
        headers.forEach((h, i) => { obj[h] = r[i] })
        return obj
      })
      out = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
      filename = `system_logs_${new Date().toISOString().slice(0, 10)}.json`
    } else {
      out = blob
      filename = `system_logs_${new Date().toISOString().slice(0, 10)}.csv`
    }
    const url = URL.createObjectURL(out)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(t('services.exportSuccess'))
  } catch (e) {
    ElMessage.error('导出失败: ' + (e.message || ''))
  }
}

function parseCsv(text) {
  // 去除 BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows = []
  let row = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') { inQuotes = false }
      else cur += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(cur); cur = '' }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (c === '\r') {/* skip */}
      else cur += c
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}

onMounted(fetchList)
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
