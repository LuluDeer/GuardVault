<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-input v-model="query.keyword" :placeholder="t('users.searchPlaceholder')" :prefix-icon="Search" clearable @keyup.enter="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="query.status" :placeholder="t('users.statusFilter')" clearable style="width:100%">
            <el-option :label="t('users.active')" value="1" />
            <el-option :label="t('users.inactive')" value="0" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="query.deptId" :placeholder="t('departments.name')" clearable style="width:100%">
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-col>
        <el-col :span="8" style="text-align:right">
          <el-button type="primary" :icon="Search" @click="handleSearch">{{ t('common.search') }}</el-button>
          <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">{{ t('users.addUser') }}</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top:16px">
      <!-- 数据量 ≤ 50 用普通 el-table 体验更佳；> 50 用虚拟滚动 el-table-v2 -->
      <el-table
        v-if="total <= 50"
        :data="list"
        v-loading="loading"
        border
        stripe
        style="width:100%"
      >
        <el-table-column prop="id" :label="t('common.id')" width="80" />
        <el-table-column prop="username" :label="t('users.username')" min-width="140" />
        <el-table-column :label="t('departments.name')" min-width="120">
          <template #default="{ row }">
            <span v-if="row.deptName">{{ row.deptName }}</span>
            <el-tag v-else type="info" size="small">未分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.status')" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? t('users.active') : t('users.inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('users.totpEnabled')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.totpEnabled ? 'primary' : 'info'" size="small">
              {{ row.totpEnabled ? t('users.enabled') : t('users.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="t('common.createdAt')" min-width="160">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="270" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :type="row.status===1?'warning':'success'" @click="toggleStatus(row)">
              {{ row.status === 1 ? t('common.disabled') : t('common.enabled') }}
            </el-button>
            <el-button size="small" type="info" @click="openResetPwd(row)">{{ t('users.resetPassword') }}</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">{{ t('common.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 虚拟滚动版本（>50 行时启用，DOM 节点恒定 ~30） -->
      <el-auto-resizer v-else>
        <template #default="{ height, width }">
          <el-table-v2
            :columns="v2Columns"
            :data="list"
            :width="width"
            :height="height"
            :row-height="56"
            :header-height="48"
            fixed
          />
        </template>
      </el-auto-resizer>

      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @change="fetchList"
        />
      </div>
    </el-card>

    <el-dialog v-model="createVisible" :title="t('users.addUser')" width="420px" :close-on-click-modal="false">
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-width="70px">
        <el-form-item :label="t('users.username')" prop="username">
          <el-input v-model="createForm.username" :placeholder="t('users.username')" />
        </el-form-item>
        <el-form-item :label="t('login.password')" prop="password">
          <el-input v-model="createForm.password" type="password" show-password :placeholder="t('login.password')" />
        </el-form-item>
        <el-form-item :label="t('users.role')" prop="role">
          <el-select v-model="createForm.role" :placeholder="t('users.selectRole')">
            <el-option :label="t('users.roleNormal')" value="normal" />
            <el-option :label="t('users.roleAdmin')" value="admin" />
            <el-option :label="t('users.roleDeptAdmin')" value="dept_admin" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('departments.name')">
          <el-select v-model="createForm.deptId" :placeholder="t('departments.name')" clearable style="width:100%">
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible=false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetPwdVisible" :title="t('users.resetPassword')" width="420px" :close-on-click-modal="false">
      <el-form ref="resetPwdRef" :model="resetPwdForm" :rules="resetPwdRules" label-width="70px">
        <el-form-item :label="t('users.username')">
          <el-input :value="currentRow?.username" disabled />
        </el-form-item>
        <el-form-item :label="t('login.password')" prop="password">
          <el-input v-model="resetPwdForm.password" type="password" show-password :placeholder="t('login.password')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible=false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="handleResetPwd">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h, computed } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, createUser, updateUser, deleteUser } from '@/api/user'
import { getAllDepts } from '@/api/dept'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()

const loading = ref(false)
const submitting = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, keyword: '', status: '', deptId: '' })
const departments = ref([])

// 虚拟滚动表格列定义（大数据量场景，>50 行时启用，依赖 locale.value 以触发响应式刷新）
const v2Columns = computed(() => [
  { key: 'id', title: t('common.id'), dataKey: 'id', width: 80, align: 'center' },
  { key: 'username', title: t('users.username'), dataKey: 'username', width: 180 },
  {
    key: 'status', title: t('common.status'), dataKey: 'status', width: 100, align: 'center',
    cellRenderer: ({ rowData }) => h('el-tag', { type: rowData.status === 1 ? 'success' : 'danger', size: 'small' },
      () => rowData.status === 1 ? t('users.active') : t('users.inactive')),
  },
  {
    key: 'totpEnabled', title: t('users.totpEnabled'), dataKey: 'totpEnabled', width: 100, align: 'center',
    cellRenderer: ({ rowData }) => h('el-tag', { type: rowData.totpEnabled ? 'primary' : 'info', size: 'small' },
      () => rowData.totpEnabled ? t('users.enabled') : t('users.disabled')),
  },
  { key: 'createdAt', title: t('common.createdAt'), dataKey: 'createdAt', width: 200, cellRenderer: ({ rowData }) => fmt(rowData.createdAt) },
  {
    key: 'actions', title: t('common.actions'), dataKey: 'actions', width: 280, fixed: 'right', align: 'center',
    cellRenderer: ({ rowData }) => h('div', { class: 'row-actions' }, [
      h('el-button', {
        size: 'small',
        type: rowData.status === 1 ? 'warning' : 'success',
        onClick: () => toggleStatus(rowData),
      }, () => rowData.status === 1 ? t('common.disabled') : t('common.enabled')),
      h('el-button', { size: 'small', type: 'info', onClick: () => openResetPwd(rowData) }, () => t('users.resetPassword')),
      h('el-button', { size: 'small', type: 'danger', onClick: () => handleDelete(rowData) }, () => t('common.delete')),
    ]),
  },
])

const createVisible = ref(false)
const resetPwdVisible = ref(false)
const currentRow = ref(null)
const createRef = ref()
const resetPwdRef = ref()
const createForm = reactive({ username: '', password: '', role: 'normal', deptId: null })
const resetPwdForm = reactive({ password: '' })

const createRules = computed(() => ({
  username: [{ required: true, message: t('users.username'), trigger: 'blur' }, { min: 3, max: 32, message: '3-32', trigger: 'blur' }],
  password: [{ required: true, message: t('login.password'), trigger: 'blur' }, { min: 6, message: '≥6', trigger: 'blur' }],
  role: [{ required: true, message: t('users.selectRole'), trigger: 'blur' }],
}))
const resetPwdRules = computed(() => ({
  password: [{ required: true, message: t('login.password'), trigger: 'blur' }, { min: 6, message: '≥6', trigger: 'blur' }],
}))

const fmt = (v) => v ? new Date(v).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US') : '-'

async function fetchList() {
  loading.value = true
  try {
    const res = await getUserList(query)
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }
function handleReset() { query.keyword = ''; query.status = ''; query.deptId = ''; query.page = 1; fetchList() }

async function fetchDepartments() {
  try {
    const res = await getAllDepts()
    departments.value = res.data || []
  } catch {}
}

function openCreate() {
  createForm.username = ''; createForm.password = ''
  createForm.role = 'normal'; createForm.deptId = null
  createVisible.value = true
  createRef.value?.clearValidate()
}

async function handleCreate() {
  await createRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await createUser({
        username: createForm.username,
        password: createForm.password,
        role: createForm.role,
        deptId: createForm.deptId || null,
      })
      ElMessage.success(t('users.createSuccess'))
      createVisible.value = false
      fetchList()
    } finally { submitting.value = false }
  })
}

async function toggleStatus(row) {
  const action = row.status === 1 ? t('common.disabled') : t('common.enabled')
  try {
    await ElMessageBox.confirm(t('users.toggleStatusConfirm', { action, name: row.username }), t('common.tip'), { type: 'warning' })
    await updateUser(row.id, { status: row.status === 1 ? 0 : 1 })
    ElMessage.success(t('common.success'))
    fetchList()
  } catch {}
}

function openResetPwd(row) {
  currentRow.value = row
  resetPwdForm.password = ''
  resetPwdVisible.value = true
  resetPwdRef.value?.clearValidate()
}

async function handleResetPwd() {
  await resetPwdRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await updateUser(currentRow.value.id, { password: resetPwdForm.password })
      ElMessage.success(t('users.resetPwdSuccess'))
      resetPwdVisible.value = false
    } finally { submitting.value = false }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(t('users.deleteConfirm', { name: row.username }), t('common.warning'), {
      type: 'error', confirmButtonText: t('common.delete'), confirmButtonClass: 'el-button--danger',
    })
    await deleteUser(row.id)
    ElMessage.success(t('users.deleteSuccess'))
    fetchList()
  } catch {}
}

onMounted(() => { fetchDepartments(); fetchList() })
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.row-actions { display: flex; gap: 4px; justify-content: center; align-items: center; }
</style>
