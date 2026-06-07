<template>
  <div>
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6"><div class="stat-card stat-1">
        <div class="stat-label">{{ t('menu.services') }}</div>
        <div class="stat-value">{{ summary.totalAccounts || 0 }}</div>
      </div></el-col>
      <el-col :span="6"><div class="stat-card stat-2">
        <div class="stat-label">{{ t('menu.users') }}</div>
        <div class="stat-value">{{ summary.totalUsers || 0 }}</div>
      </div></el-col>
      <el-col :span="6"><div class="stat-card stat-3">
        <div class="stat-label">{{ t('menu.departments') }}</div>
        <div class="stat-value">{{ summary.totalDepartments || 0 }}</div>
      </div></el-col>
      <el-col :span="6"><div class="stat-card stat-4">
        <div class="stat-label">Grants</div>
        <div class="stat-value">{{ summary.totalGrants || 0 }}</div>
      </div></el-col>
    </el-row>

    <el-card style="margin-bottom:16px">
      <template #header>
        <div class="card-header">
          <span>{{ t('audit.title') }} - {{ t('logs.time') }}</span>
          <el-radio-group v-model="trendDays" size="small" @change="fetchDaily">
            <el-radio-button :label="7">7d</el-radio-button>
            <el-radio-button :label="14">14d</el-radio-button>
            <el-radio-button :label="30">30d</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div ref="dailyChart" style="width:100%; height:300px"></div>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card>
          <template #header><span>Top 20 Services</span></template>
          <el-table :data="serviceStats" v-loading="loading" border style="width:100%" max-height="500">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="accountName" :label="t('menu.services')" min-width="140" />
            <el-table-column prop="viewCount" label="Views" width="100" sortable />
            <el-table-column prop="copyCount" label="Copies" width="100" sortable />
            <el-table-column prop="total" :label="t('common.actions')" width="80" sortable>
              <template #default="{ row }">
                <el-tag type="primary">{{ row.total }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>Top 20 Users</span></template>
          <el-table :data="userStats" v-loading="loading" border style="width:100%" max-height="500">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="username" :label="t('users.username')" min-width="140" />
            <el-table-column prop="viewCount" label="Views" width="100" sortable />
            <el-table-column prop="copyCount" label="Copies" width="100" sortable />
            <el-table-column prop="total" :label="t('common.actions')" width="80" sortable>
              <template #default="{ row }">
                <el-tag type="success">{{ row.total }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top:16px">
      <template #header><span>{{ t('logs.action') }} Distribution</span></template>
      <el-table :data="actionStats" v-loading="loading" border style="width:100%">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="actionType" :label="t('logs.action')" min-width="200">
          <template #default="{ row }">
            <el-tag :type="getActionColor(row.actionType)">{{ formatAction(row.actionType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" :label="t('common.actions')" min-width="200">
          <template #default="{ row }">
            <div class="bar-wrap">
              <div class="bar-fill" :style="{ width: getBarWidth(row.count) + '%' }"></div>
              <span class="bar-text">{{ row.count }}</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { getSummary, getServiceViewStats, getUserViewStats, getActionStats, getDailyStats } from '@/api/audit'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()

const summary = ref({})
const serviceStats = ref([])
const userStats = ref([])
const actionStats = ref([])
const dailyData = ref([])
const loading = ref(false)
const trendDays = ref(7)
const dailyChart = ref(null)
let chart = null

const ACTION_LABELS = {
  'LOGIN': '登录',
  'LOGIN_FAIL': '登录失败',
  'CREATE_USER': '创建用户',
  'DELETE_USER': '删除用户',
  'ENABLE_TOTP': '启用2FA',
  'DISABLE_TOTP': '禁用2FA',
  'RESET_TOTP': '重置2FA',
  'CODE_VIEW': '查看验证码',
  'CODE_COPY': '复制验证码',
  'PASSWORD_CHANGE': '修改密码',
  'SERVICE_CREATE': '创建服务',
  'SERVICE_UPDATE': '更新服务',
  'SERVICE_DELETE': '删除服务',
  'SERVICE_RESET_SECRET': '重置密钥',
  'SERVICE_VIEW_SECRET': '查看明文密钥',
  'SERVICE_CREATE_SCAN': '扫码录入',
  'SERVICE_BATCH_IMPORT': '批量导入',
  'GRANT_CREATE': '授权',
  'GRANT_REVOKE': '撤销授权',
  'GRANT_BATCH': '批量授权',
  'GRANT_BATCH_REVOKE': '批量撤销',
  'DEPT_CREATE': '创建部门',
  'DEPT_UPDATE': '更新部门',
  'DEPT_DELETE': '删除部门',
}

const formatAction = (key) => ACTION_LABELS[key] || key

const getActionColor = (key) => {
  if (key.includes('VIEW') || key.includes('COPY')) return 'danger'
  if (key.includes('CREATE') || key.includes('GRANT')) return 'success'
  if (key.includes('DELETE') || key.includes('RESET') || key.includes('REVOKE')) return 'warning'
  if (key.includes('LOGIN') || key.includes('PASSWORD')) return 'info'
  return ''
}

const getBarWidth = (count) => {
  if (!actionStats.value.length) return 0
  const max = Math.max(...actionStats.value.map(a => a.count))
  return max ? (count / max * 100) : 0
}

async function fetchAll() {
  loading.value = true
  try {
    const [s, sv, uv, ac, daily] = await Promise.all([
      getSummary({ days: 30 }),
      getServiceViewStats(),
      getUserViewStats(),
      getActionStats(),
      getDailyStats({ days: trendDays.value }),
    ])
    summary.value = s.data || {}
    serviceStats.value = sv.data || []
    userStats.value = uv.data || []
    actionStats.value = ac.data || []
    dailyData.value = daily.data || []
    await nextTick()
    renderChart()
  } finally { loading.value = false }
}

async function fetchDaily() {
  const r = await getDailyStats({ days: trendDays.value })
  dailyData.value = r.data || []
  renderChart()
}

function renderChart() {
  if (!chart && dailyChart.value) {
    chart = echarts.init(dailyChart.value)
  }
  if (!chart) return

  const dates = dailyData.value.map(d => d.date.slice(5))
  const viewData = dailyData.value.map(d => d.CODE_VIEW || 0)
  const copyData = dailyData.value.map(d => d.CODE_COPY || 0)
  const serviceData = dailyData.value.map(d => d.SERVICE_CREATE || 0)
  const grantData = dailyData.value.map(d => d.GRANT_CREATE || 0)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['View', 'Copy', 'Service Create', 'Grant'], top: 0 },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [
      { name: 'View', data: viewData, type: 'line', smooth: true, itemStyle: { color: '#409eff' } },
      { name: 'Copy', data: copyData, type: 'line', smooth: true, itemStyle: { color: '#67c23a' } },
      { name: 'Service Create', data: serviceData, type: 'bar', itemStyle: { color: '#e6a23c' } },
      { name: 'Grant', data: grantData, type: 'bar', itemStyle: { color: '#f56c6c' } },
    ],
  })
}

function handleResize() {
  chart?.resize()
}

onMounted(() => {
  fetchAll()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.stat-card {
  padding: 24px;
  border-radius: 8px;
  color: #fff;
}
.stat-1 { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-2 { background: linear-gradient(135deg, #f093fb, #f5576c); }
.stat-3 { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.stat-4 { background: linear-gradient(135deg, #43e97b, #38f9d7); }

.stat-label {
  font-size: 14px;
  opacity: 0.85;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 32px;
  font-weight: 700;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  height: 22px;
  background: #f5f7fa;
  border-radius: 11px;
  overflow: hidden;
}
.bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 11px;
  transition: width 0.3s;
}
.bar-text {
  position: relative;
  z-index: 1;
  padding: 0 10px;
  font-size: 12px;
  color: #606266;
}
</style>
