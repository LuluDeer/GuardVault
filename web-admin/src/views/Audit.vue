<template>
  <div>
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6"><div class="stat-card stat-card--primary hover-lift">
        <div class="stat-icon">
          <el-icon :size="24"><Grid /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ t('menu.services') }}</div>
          <div class="stat-value">{{ summary.totalAccounts || 0 }}</div>
        </div>
      </div></el-col>
      <el-col :span="6"><div class="stat-card stat-card--success hover-lift">
        <div class="stat-icon">
          <el-icon :size="24"><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ t('menu.users') }}</div>
          <div class="stat-value">{{ summary.totalUsers || 0 }}</div>
        </div>
      </div></el-col>
      <el-col :span="6"><div class="stat-card stat-card--warning hover-lift">
        <div class="stat-icon">
          <el-icon :size="24"><OfficeBuilding /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ t('menu.departments') }}</div>
          <div class="stat-value">{{ summary.totalDepartments || 0 }}</div>
        </div>
      </div></el-col>
      <el-col :span="6"><div class="stat-card stat-card--danger hover-lift">
        <div class="stat-icon">
          <el-icon :size="24"><Key /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ t('audit.grants') }}</div>
          <div class="stat-value">{{ summary.totalGrants || 0 }}</div>
        </div>
      </div></el-col>
    </el-row>

    <el-card style="margin-bottom:16px">
      <template #header>
        <div class="card-header">
          <span>{{ t('audit.title') }} - {{ t('logs.time') }}</span>
          <el-radio-group v-model="trendDays" size="small" @change="fetchDaily">
            <el-radio-button :label="7">{{ t('audit.days7') }}</el-radio-button>
            <el-radio-button :label="14">{{ t('audit.days14') }}</el-radio-button>
            <el-radio-button :label="30">{{ t('audit.days30') }}</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div ref="dailyChart" style="width:100%; height:300px"></div>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card>
          <template #header><span>{{ t('audit.topServices') }}</span></template>
          <el-table :data="serviceStats" v-loading="loading" border style="width:100%" max-height="500">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="accountName" :label="t('menu.services')" min-width="140" />
            <el-table-column prop="viewCount" :label="t('audit.views')" width="100" sortable />
            <el-table-column prop="copyCount" :label="t('audit.copies')" width="100" sortable />
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
          <template #header><span>{{ t('audit.topUsers') }}</span></template>
          <el-table :data="userStats" v-loading="loading" border style="width:100%" max-height="500">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="username" :label="t('users.username')" min-width="140" />
            <el-table-column prop="viewCount" :label="t('audit.views')" width="100" sortable />
            <el-table-column prop="copyCount" :label="t('audit.copies')" width="100" sortable />
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
import { Grid, User, OfficeBuilding, Key } from '@element-plus/icons-vue'
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
  'LOGIN': t('audit.action.login'),
  'LOGIN_FAIL': t('audit.action.loginFail'),
  'CREATE_USER': t('audit.action.createUser'),
  'DELETE_USER': t('audit.action.deleteUser'),
  'ENABLE_TOTP': t('audit.action.enableTotp'),
  'DISABLE_TOTP': t('audit.action.disableTotp'),
  'RESET_TOTP': t('audit.action.resetTotp'),
  'CODE_VIEW': t('audit.action.codeView'),
  'CODE_COPY': t('audit.action.codeCopy'),
  'PASSWORD_CHANGE': t('audit.action.passwordChange'),
  'SERVICE_CREATE': t('audit.action.serviceCreate'),
  'SERVICE_UPDATE': t('audit.action.serviceUpdate'),
  'SERVICE_DELETE': t('audit.action.serviceDelete'),
  'SERVICE_RESET_SECRET': t('audit.action.serviceResetSecret'),
  'SERVICE_VIEW_SECRET': t('audit.action.serviceViewSecret'),
  'SERVICE_CREATE_SCAN': t('audit.action.serviceScan'),
  'SERVICE_BATCH_IMPORT': t('audit.action.serviceImport'),
  'GRANT_CREATE': t('audit.action.grantCreate'),
  'GRANT_REVOKE': t('audit.action.grantRevoke'),
  'GRANT_BATCH': t('audit.action.grantBatch'),
  'GRANT_BATCH_REVOKE': t('audit.action.grantBatchRevoke'),
  'DEPT_CREATE': t('audit.action.deptCreate'),
  'DEPT_UPDATE': t('audit.action.deptUpdate'),
  'DEPT_DELETE': t('audit.action.deptDelete'),
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
    legend: { data: [t('audit.chart.view'), t('audit.chart.copy'), t('audit.chart.service'), t('audit.chart.grant')], top: 0 },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [
      { name: t('audit.chart.view'), data: viewData, type: 'line', smooth: true, itemStyle: { color: '#409eff' } },
      { name: t('audit.chart.copy'), data: copyData, type: 'line', smooth: true, itemStyle: { color: '#67c23a' } },
      { name: t('audit.chart.service'), data: serviceData, type: 'bar', itemStyle: { color: '#e6a23c' } },
      { name: t('audit.chart.grant'), data: grantData, type: 'bar', itemStyle: { color: '#f56c6c' } },
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
  border-radius: 16px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.stat-card--primary {
  background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
}

.stat-card--success {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.stat-card--warning {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
}

.stat-card--danger {
  background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
}

.stat-icon {
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -1px;
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

html.dark .bar-wrap {
  background: #334155;
}

.bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 11px;
  transition: width 0.5s ease;
}

.bar-text {
  position: relative;
  z-index: 1;
  padding: 0 10px;
  font-size: 12px;
  color: #606266;
}

html.dark .bar-text {
  color: #cbd5e1;
}
</style>
