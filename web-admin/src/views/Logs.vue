<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="5">
          <el-input v-model="query.username" placeholder="操作人" :prefix-icon="User" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="query.actionType" placeholder="操作类型" clearable style="width:100%">
            <el-option v-for="(label, val) in ACTION_MAP" :key="val" :label="label" :value="val" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-date-picker
            v-model="timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width:100%"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-col>
        <el-col :span="6">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top:16px">
      <el-table :data="list" v-loading="loading" border stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="operatorName" label="操作人" width="130" />
        <el-table-column label="操作类型" width="140">
          <template #default="{ row }">
            <el-tag :type="ACTION_TAG[row.actionType]" size="small">{{ ACTION_MAP[row.actionType] || row.actionType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetUsername" label="目标用户" width="130">
          <template #default="{ row }">{{ row.targetUsername || '-' }}</template>
        </el-table-column>
        <el-table-column prop="clientIp" label="IP" width="130" />
        <el-table-column prop="actionDesc" label="详情" min-width="180" show-overflow-tooltip />
        <el-table-column label="结果" width="80">
          <template #default="{ row }">
            <el-tag :type="row.result===1?'success':'danger'" size="small">{{ row.result===1?'成功':'失败' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" min-width="160">
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
import { ref, reactive, watch, onMounted } from 'vue'
import { Search, User } from '@element-plus/icons-vue'
import { getLogList } from '@/api/log'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const timeRange = ref(null)
const query = reactive({ page: 1, pageSize: 20, username: '', actionType: '', startTime: '', endTime: '' })

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

const fmt = (v) => v ? new Date(v).toLocaleString('zh-CN') : '-'

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
  query.username = ''; query.actionType = ''; query.startTime = ''; query.endTime = ''
  timeRange.value = null; query.page = 1; fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
