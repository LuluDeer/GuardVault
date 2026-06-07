<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-input v-model="query.keyword" placeholder="搜索用户名" :prefix-icon="Search" clearable @keyup.enter="handleSearch" />
        </el-col>
        <el-col :span="5">
          <el-select v-model="query.status" placeholder="状态筛选" clearable style="width:100%">
            <el-option label="正常" value="1" />
            <el-option label="禁用" value="0" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-col>
        <el-col :span="9" style="text-align:right">
          <el-button type="primary" :icon="Plus" @click="openCreate">新增用户</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top:16px">
      <el-table :data="list" v-loading="loading" border stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="TOTP" width="100">
          <template #default="{ row }">
            <el-tag :type="row.totpEnabled ? 'primary' : 'info'" size="small">
              {{ row.totpEnabled ? '已开启' : '未开启' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="160">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :type="row.status===1?'warning':'success'" @click="toggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="info" @click="openResetPwd(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="createVisible" title="新增用户" width="420px" :close-on-click-modal="false">
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-width="70px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="createForm.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetPwdVisible" title="重置密码" width="420px" :close-on-click-modal="false">
      <el-form ref="resetPwdRef" :model="resetPwdForm" :rules="resetPwdRules" label-width="70px">
        <el-form-item label="用户名">
          <el-input :value="currentRow?.username" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="resetPwdForm.password" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleResetPwd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, createUser, updateUser, deleteUser } from '@/api/user'

const loading = ref(false)
const submitting = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, keyword: '', status: '' })

const createVisible = ref(false)
const resetPwdVisible = ref(false)
const currentRow = ref(null)
const createRef = ref()
const resetPwdRef = ref()
const createForm = reactive({ username: '', password: '' })
const resetPwdForm = reactive({ password: '' })

const createRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 3, max: 32, message: '3-32位字符', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '至少6位', trigger: 'blur' }],
}
const resetPwdRules = {
  password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '至少6位', trigger: 'blur' }],
}

const fmt = (v) => v ? new Date(v).toLocaleString('zh-CN') : '-'

async function fetchList() {
  loading.value = true
  try {
    const res = await getUserList(query)
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }
function handleReset() { query.keyword = ''; query.status = ''; query.page = 1; fetchList() }

function openCreate() {
  createForm.username = ''; createForm.password = ''
  createVisible.value = true
  createRef.value?.clearValidate()
}

async function handleCreate() {
  await createRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await createUser({ username: createForm.username, password: createForm.password })
      ElMessage.success('创建成功')
      createVisible.value = false
      fetchList()
    } finally { submitting.value = false }
  })
}

async function toggleStatus(row) {
  const action = row.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}用户「${row.username}」吗？`, '提示', { type: 'warning' })
    await updateUser(row.id, { status: row.status === 1 ? 0 : 1 })
    ElMessage.success(`${action}成功`)
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
      ElMessage.success('密码重置成功')
      resetPwdVisible.value = false
    } finally { submitting.value = false }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」吗？此操作不可撤销。`, '警告', {
      type: 'error', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger',
    })
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch {}
}

onMounted(fetchList)
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
