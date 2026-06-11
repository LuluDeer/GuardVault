<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="5">
          <el-input v-model="query.keyword" :placeholder="t('users.searchPlaceholder')" :prefix-icon="Search" clearable @keyup.enter="handleSearch" />
        </el-col>
        <el-col :span="3">
          <el-select v-model="query.status" :placeholder="t('users.statusFilter')" clearable style="width:100%">
            <el-option :label="t('users.active')" value="1" />
            <el-option :label="t('users.inactive')" value="0" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="query.role" :placeholder="t('users.roleFilter')" clearable style="width:100%">
            <el-option :label="t('users.roleNormal')" value="user" />
            <el-option :label="t('users.roleDeptAdmin')" value="dept_admin" />
            <el-option :label="t('users.roleSuperAdmin')" value="super_admin" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="query.deptId" :placeholder="t('departments.name')" clearable style="width:100%">
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-col>
        <el-col :span="8" style="text-align:right">
          <el-button :icon="Refresh" @click="fetchList" :loading="loading" :title="t('common.refresh')">{{ t('common.refresh') }}</el-button>
          <el-button type="primary" :icon="Search" @click="handleSearch">{{ t('common.search') }}</el-button>
          <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">{{ t('users.addUser') }}</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top:16px">
      <!-- 批量操作工具栏：有选中项时显示 -->
      <div v-if="selectedIds.length > 0" class="batch-bar">
        <span class="batch-info">{{ t('users.batchSelected', { count: selectedIds.length }) }}</span>
        <el-button size="small" type="success" @click="handleBatchEnable">{{ t('users.batchEnable') }}</el-button>
        <el-button size="small" type="warning" @click="handleBatchDisable">{{ t('users.batchDisable') }}</el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete">{{ t('users.batchDelete') }}</el-button>
        <el-button size="small" @click="selectedIds = []">{{ t('common.cancel') }}</el-button>
      </div>

      <!-- 数据量 ≤ 50 用普通 el-table 体验更佳；> 50 用虚拟滚动 el-table-v2 -->
      <el-table
        v-if="total <= 50"
        :data="list"
        v-loading="loading"
        border
        stripe
        style="width:100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" :selectable="row => canEdit(row)" />
        <el-table-column prop="id" :label="t('common.id')" width="80" />
        <el-table-column prop="username" :label="t('users.username')" min-width="140" />
        <el-table-column :label="t('users.role')" width="120">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small" effect="light">
              {{ roleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
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
        <el-table-column :label="t('common.actions')" width="380" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :type="row.status===1?'warning':'success'" @click="toggleStatus(row)" :disabled="!canEdit(row)">
              {{ row.status === 1 ? t('common.disabled') : t('common.enabled') }}
            </el-button>
            <el-button
              v-if="row.role === 'dept_admin'"
              size="small"
              type="info"
              :disabled="!canAppointAdmin()"
              @click="handleQuickRevokeAdmin(row)"
            >{{ t('users.revokeAdmin') }}</el-button>
            <el-button
              v-else-if="row.role === 'user'"
              size="small"
              type="warning"
              :disabled="!canAppointAdmin() || !row.deptId"
              :title="!canAppointAdmin() ? t('users.appointNeedSuperAdmin') : (!row.deptId ? t('users.appointNeedDept') : '')"
              @click="handleQuickAppointAdmin(row)"
            >{{ t('users.appointAdmin') }}</el-button>
            <el-button size="small" type="info" :disabled="!canEdit(row)" @click="openResetPwd(row)">{{ t('users.resetPassword') }}</el-button>
            <el-button size="small" type="danger" :disabled="!canEdit(row) || row.id === auth.userId" @click="handleDelete(row)">{{ t('common.delete') }}</el-button>
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

    <!-- 新增用户 -->
    <el-dialog v-model="createVisible" :title="t('users.addUser')" width="420px" :close-on-click-modal="false">
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-width="70px">
        <el-form-item :label="t('users.username')" prop="username">
          <el-input v-model="createForm.username" :placeholder="t('users.username')" />
        </el-form-item>
        <el-form-item :label="t('login.password')" prop="password">
          <el-input v-model="createForm.password" type="password" show-password :placeholder="t('login.password')" />
        </el-form-item>
        <el-form-item :label="t('users.role')" prop="role">
          <el-select v-model="createForm.role" :placeholder="t('users.selectRole')" style="width:100%">
            <el-option
              v-for="r in assignableRoleOptions"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('departments.name')">
          <el-select v-model="createForm.deptId" :placeholder="t('departments.name')" clearable style="width:100%">
            <el-option
              v-for="d in availableDepartmentsForCreate"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible=false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
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

    <!-- 编辑弹窗已移除：行内按钮（启用/禁用、改密、任命/撤销、删除）覆盖所有变更操作 -->
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h, computed } from 'vue'
import { Search, Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, createUser, updateUser, deleteUser } from '@/api/user'
import { getAllDepts, appointDeptAdmin, revokeDeptAdmin } from '@/api/dept'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()
const auth = useAuthStore()

const loading = ref(false)
const submitting = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, keyword: '', status: '', deptId: '', role: '' })
const departments = ref([])

// 角色 → 等级（与后端一致）
const ROLE_RANK = { user: 0, dept_admin: 1, super_admin: 2 }
const ALL_ROLES = ['user', 'dept_admin', 'super_admin']

function roleLabel(role) {
  if (role === 'super_admin') return t('users.roleSuperAdmin')
  if (role === 'dept_admin') return t('users.roleDeptAdmin')
  return t('users.roleNormal')
}
function roleTagType(role) {
  if (role === 'super_admin') return 'danger'
  if (role === 'dept_admin') return 'warning'
  return 'info'
}

// 操作者可分配的角色（创建时用）
// - super_admin: 可选 super_admin / dept_admin / user
// - dept_admin:  仅 user（避免越权任命新管理员；如需新管理员，走「任命管理员」快捷入口或联系 super_admin）
// - user: 无权
const assignableRoleOptions = computed(() => {
  const op = auth.role
  if (op === 'super_admin') {
    return ALL_ROLES.map(r => ({ value: r, label: roleLabel(r) }))
  }
  if (op === 'dept_admin') {
    return [{ value: 'user', label: roleLabel('user') }]
  }
  return []
})

// 当前用户能否对该行进行角色/启停编辑
// - super_admin: 可对任何非自己的用户
// - dept_admin: 只能管"严格低于自己"的用户（user），禁止 dept_admin 互操
// - 其他: 拒绝
function canEdit(row) {
  if (!row) return false
  if (row.id === auth.userId) return false
  const opRank = ROLE_RANK[auth.role] ?? -1
  const targetRank = ROLE_RANK[row.role] ?? -1
  if (opRank < ROLE_RANK.dept_admin) return false
  if (auth.role === 'dept_admin') {
    return targetRank < opRank // 严格降级，自动排除 dept_admin 互操
  }
  // super_admin：允许操作任何非自己
  return opRank >= targetRank
}

// 任免部门管理员：仅超级管理员（部门管理员无权任免同级）
function canAppointAdmin() {
  return auth.role === 'super_admin'
}

// 创建时可用的部门列表（部门管理员只能选本部门）
const availableDepartmentsForCreate = computed(() => {
  if (auth.role === 'dept_admin' && auth.deptId) {
    return departments.value.filter(d => d.id === auth.deptId)
  }
  return departments.value
})

// 虚拟滚动表格列定义（大数据量场景，>50 行时启用，依赖 locale.value 以触发响应式刷新）
const v2Columns = computed(() => [
  { key: 'id', title: t('common.id'), dataKey: 'id', width: 80, align: 'center' },
  { key: 'username', title: t('users.username'), dataKey: 'username', width: 180 },
  {
    key: 'role', title: t('users.role'), dataKey: 'role', width: 120, align: 'center',
    cellRenderer: ({ rowData }) => h('el-tag', { type: roleTagType(rowData.role), size: 'small', effect: 'light' },
      () => roleLabel(rowData.role)),
  },
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
    key: 'actions', title: t('common.actions'), dataKey: 'actions', width: 380, fixed: 'right', align: 'center',
    cellRenderer: ({ rowData }) => h('div', { class: 'row-actions' }, [
      h('el-button', {
        size: 'small',
        type: rowData.status === 1 ? 'warning' : 'success',
        disabled: !canEdit(rowData),
        onClick: () => toggleStatus(rowData),
      }, () => rowData.status === 1 ? t('common.disabled') : t('common.enabled')),
      rowData.role === 'dept_admin'
        ? h('el-button', {
            size: 'small', type: 'info',
            disabled: !canAppointAdmin(),
            onClick: () => handleQuickRevokeAdmin(rowData),
          }, () => t('users.revokeAdmin'))
        : rowData.role === 'user'
          ? h('el-button', {
              size: 'small', type: 'warning',
              disabled: !canAppointAdmin() || !rowData.deptId,
              title: !canAppointAdmin() ? t('users.appointNeedSuperAdmin') : (!rowData.deptId ? t('users.appointNeedDept') : ''),
              onClick: () => handleQuickAppointAdmin(rowData),
            }, () => t('users.appointAdmin'))
          : null,
      h('el-button', { size: 'small', type: 'info', disabled: !canEdit(rowData), onClick: () => openResetPwd(rowData) }, () => t('users.resetPassword')),
      h('el-button', { size: 'small', type: 'danger', disabled: !canEdit(rowData) || rowData.id === auth.userId, onClick: () => handleDelete(rowData) }, () => t('common.delete')),
    ]),
  },
])

const createVisible = ref(false)
const resetPwdVisible = ref(false)
const currentRow = ref(null)
const createRef = ref()
const resetPwdRef = ref()
const createForm = reactive({ username: '', password: '', role: 'user', deptId: null })
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
    // 清理空字符串字段，避免后端把空 role 当作 'user' 过滤
    const params = { ...query }
    Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === null) delete params[k] })
    const res = await getUserList(params)
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }
function handleReset() {
  query.keyword = ''; query.status = ''; query.deptId = ''; query.role = ''; query.page = 1
  fetchList()
}

async function fetchDepartments() {
  try {
    const res = await getAllDepts()
    departments.value = res.data || []
  } catch {}
}

function openCreate() {
  createForm.username = ''; createForm.password = ''
  createForm.role = assignableRoleOptions.value[0]?.value || 'user'
  createForm.deptId = auth.role === 'dept_admin' ? auth.deptId : null
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
    } catch (e) {
      ElMessage.error(e?.message || 'error')
    } finally { submitting.value = false }
  })
}

async function toggleStatus(row) {
  if (!canEdit(row)) {
    ElMessage.warning(t('users.noPermissionEdit'))
    return
  }
  const action = row.status === 1 ? t('common.disabled') : t('common.enabled')
  try {
    await ElMessageBox.confirm(t('users.toggleStatusConfirm', { action, name: row.username }), t('common.tip'), { type: 'warning' })
    await updateUser(row.id, { status: row.status === 1 ? 0 : 1 })
    ElMessage.success(t('common.success'))
    fetchList()
  } catch {}
}

function openResetPwd(row) {
  if (!canEdit(row)) {
    ElMessage.warning(t('users.noPermissionEdit'))
    return
  }
  currentRow.value = row
  resetPwdForm.password = ''
  resetPwdVisible.value = true
  resetPwdRef.value?.clearValidate()
}

async function handleResetPwd() {
  if (!canEdit(currentRow.value)) {
    ElMessage.warning(t('users.noPermissionEdit'))
    resetPwdVisible.value = false
    return
  }
  await resetPwdRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await updateUser(currentRow.value.id, { password: resetPwdForm.password })
      ElMessage.success(t('users.resetPwdSuccess'))
      resetPwdVisible.value = false
    } catch (e) {
      ElMessage.error(e?.message || 'error')
    } finally { submitting.value = false }
  })
}

async function handleDelete(row) {
  if (!canEdit(row)) {
    ElMessage.warning(t('users.noPermissionEdit'))
    return
  }
  if (row.id === auth.userId) {
    ElMessage.warning('不能删除自己')
    return
  }
  try {
    await ElMessageBox.confirm(t('users.deleteConfirm', { name: row.username }), t('common.warning'), {
      type: 'error', confirmButtonText: t('common.delete'), confirmButtonClass: 'el-button--danger',
    })
    await deleteUser(row.id)
    ElMessage.success(t('users.deleteSuccess'))
    fetchList()
  } catch {}
}

// 快捷任命为部门管理员（用户必须已分配部门；仅超级管理员可操作）
async function handleQuickAppointAdmin(row) {
  if (!canAppointAdmin()) {
    ElMessage.warning(t('users.appointNeedSuperAdmin'))
    return
  }
  if (!row.deptId) {
    ElMessage.warning(t('users.appointNeedDept'))
    return
  }
  try {
    await ElMessageBox.confirm(
      t('users.appointAdminConfirm', { name: row.username, dept: row.deptName || row.deptId }),
      t('common.confirm'),
      { type: 'warning', confirmButtonText: t('users.appointAdmin') }
    )
    await appointDeptAdmin(row.deptId, { userId: row.id })
    ElMessage.success(t('users.appointAdminSuccess'))
    fetchList()
  } catch {}
}

// 快捷撤销部门管理员（仅超级管理员可操作）
async function handleQuickRevokeAdmin(row) {
  if (!canAppointAdmin()) {
    ElMessage.warning(t('users.appointNeedSuperAdmin'))
    return
  }
  if (!row.deptId) {
    return
  }
  try {
    await ElMessageBox.confirm(
      t('users.revokeAdminConfirm', { name: row.username, dept: row.deptName || row.deptId }),
      t('common.confirm'),
      { type: 'warning', confirmButtonText: t('users.revokeAdmin') }
    )
    await revokeDeptAdmin(row.deptId, row.id)
    ElMessage.success(t('users.revokeAdminSuccess'))
    fetchList()
  } catch {}
}

onMounted(() => {
  // 进入用户管理时清空部门筛选，避免因上次残留筛选条件而看不到刚被任命的部门管理员
  query.deptId = ''
  fetchDepartments()
  fetchList()
})
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.row-actions { display: flex; gap: 4px; justify-content: center; align-items: center; }
.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 4px;
}
.batch-info { font-size: 13px; color: var(--el-color-primary); margin-right: 4px; }
</style>
