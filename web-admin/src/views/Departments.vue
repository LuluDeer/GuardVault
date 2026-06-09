<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="8">
          <el-input v-model="query.keyword" :placeholder="`搜索${t('departments.name')}`" :prefix-icon="Search" clearable @keyup.enter="handleSearch" />
        </el-col>
        <el-col :span="5">
          <el-select v-model="query.status" :placeholder="t('common.status')" clearable style="width:100%">
            <el-option :label="t('common.enabled')" :value="1" />
            <el-option :label="t('common.disabled')" :value="0" />
          </el-select>
        </el-col>
        <el-col :span="11" style="text-align:right">
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">{{ t('departments.add') }}</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top:16px">
      <el-table :data="list" v-loading="loading" border stripe style="width:100%">
        <el-table-column prop="id" :label="t('common.id')" width="80" />
        <el-table-column prop="name" :label="t('departments.name')" min-width="140" />
        <el-table-column prop="code" :label="t('departments.code')" width="120" />
        <el-table-column prop="remark" :label="t('services.remark')" min-width="160" />
        <el-table-column :label="t('common.status')" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? t('common.enabled') : t('common.disabled') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" :label="t('departments.sort')" width="80" />
        <el-table-column prop="createdAt" :label="t('common.createdAt')" width="180">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openManage(row)">管理</el-button>
            <el-button size="small" type="warning" @click="openEditDialog(row)">{{ t('common.edit') }}</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">{{ t('common.delete') }}</el-button>
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

    <el-dialog v-model="createVisible" :title="t('departments.add')" width="400px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item :label="t('departments.name')" prop="name">
          <el-input v-model="form.name" :placeholder="t('departments.name')" />
        </el-form-item>
        <el-form-item :label="t('departments.code')" prop="code">
          <el-input v-model="form.code" :placeholder="t('departments.codePlaceholder')" />
          <div style="font-size: 12px; color: #999; margin-top: 4px;">{{ t('departments.codeDesc') }}</div>
        </el-form-item>
        <el-form-item :label="t('services.remark')">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item :label="t('departments.sort')">
          <el-input-number v-model="form.sort" :min="0" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible=false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleCreate">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editVisible" :title="`${t('common.edit')}${t('departments.name')}`" width="400px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item :label="t('departments.name')" prop="name">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item :label="t('departments.code')" prop="code">
          <el-input v-model="editForm.code" :placeholder="t('departments.codePlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('services.remark')">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item :label="t('departments.sort')">
          <el-input-number v-model="editForm.sort" :min="0" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible=false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleEdit">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 部门管理抽屉：成员 + 管理员 -->
    <el-drawer v-model="manageVisible" :title="`部门管理 - ${currentDept?.name || ''}`" size="640px" direction="rtl">
      <div v-loading="manageLoading">
        <el-tabs v-model="manageTab">
          <el-tab-pane label="成员" name="members">
            <div style="margin-bottom:12px">
              <el-button type="primary" :icon="Plus" size="small" @click="openAddMembers">添加成员</el-button>
            </div>
            <el-table :data="members" border size="small" max-height="500">
              <el-table-column prop="id" label="ID" width="60" />
              <el-table-column prop="username" label="用户名" min-width="120" />
              <el-table-column label="角色" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.role === 'dept_admin' ? 'warning' : 'info'" size="small">
                    {{ row.role === 'dept_admin' ? '部门管理员' : '普通成员' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                    {{ row.status === 1 ? '启用' : '停用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <el-button v-if="row.role !== 'dept_admin'" size="small" type="warning" @click="handleAppointAdmin(row)">任命为管理员</el-button>
                  <el-button v-else size="small" type="info" @click="handleRevokeAdmin(row)">撤销管理员</el-button>
                  <el-button size="small" type="danger" @click="handleRemoveMember(row)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="部门管理员" name="admins">
            <el-table :data="admins" border size="small">
              <el-table-column prop="id" label="ID" width="60" />
              <el-table-column prop="username" label="用户名" min-width="120" />
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                    {{ row.status === 1 ? '启用' : '停用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" type="danger" @click="handleRevokeAdmin(row)">撤销</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="admins.length === 0" style="color:#909399;padding:24px;text-align:center">该部门暂无管理员</div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>

    <!-- 添加成员：选未分配 / 跨部门用户 -->
    <el-dialog v-model="addMembersVisible" title="添加成员" width="520px">
      <el-input v-model="addMemberKeyword" placeholder="搜索用户名" style="margin-bottom:12px" clearable @keyup.enter="searchAddableUsers" />
      <el-table :data="addableUsers" v-loading="addableLoading" border @selection-change="onAddableSelectionChange" max-height="400">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column label="当前部门" min-width="100">
          <template #default="{ row }">
            <span v-if="row.deptName">{{ row.deptName }}</span>
            <el-tag v-else type="info" size="small">未分配</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="addMembersVisible=false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="addMembersSubmitting" :disabled="selectedAddableIds.length===0" @click="handleAddMembers">添加 {{ selectedAddableIds.length }} 人</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDeptList, createDept, updateDept, deleteDept, listDeptMembers, addDeptMembers, removeDeptMember, appointDeptAdmin, revokeDeptAdmin } from '@/api/dept'
import { getUserList } from '@/api/user'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, keyword: '', status: '' })

const createVisible = ref(false)
const editVisible = ref(false)
const formRef = ref(null)
const editFormRef = ref(null)
const form = reactive({ name: '', code: '', remark: '', status: 1, sort: 0 })
const editForm = reactive({ id: null, name: '', code: '', remark: '', status: 1, sort: 0 })

const rules = computed(() => ({
  name: [{ required: true, message: t('departments.name'), trigger: 'blur' }],
  code: [{ required: true, message: 'Code', trigger: 'blur' }],
}))

const editRules = computed(() => ({
  name: [{ required: true, message: t('departments.name'), trigger: 'blur' }],
  code: [{ required: true, message: 'Code', trigger: 'blur' }],
}))

const fmt = (v) => v ? new Date(v).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US') : '-'

async function fetchList() {
  loading.value = true
  try {
    const res = await getDeptList(query)
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }

function resetForm() {
  Object.assign(form, { name: '', code: '', remark: '', status: 1, sort: 0 })
  formRef.value?.resetFields()
}

function openCreateDialog() { resetForm(); createVisible.value = true }

async function handleCreate() {
  if (!await formRef.value?.validate()) return
  try {
    await createDept(form)
    ElMessage.success(t('services.createSuccess'))
    createVisible.value = false
    fetchList()
  } catch {}
}

function openEditDialog(row) {
  Object.assign(editForm, { ...row })
  editVisible.value = true
}

async function handleEdit() {
  if (!await editFormRef.value?.validate()) return
  try {
    await updateDept(editForm.id, editForm)
    ElMessage.success(t('services.updateSuccess'))
    editVisible.value = false
    fetchList()
  } catch {}
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`Delete "${row.name}"?`, t('common.warning'), { type: 'warning' })
    await deleteDept(row.id)
    ElMessage.success(t('services.deleteSuccess'))
    fetchList()
  } catch {}
}

// ============ 部门管理：成员 / 管理员 ============
const manageVisible = ref(false)
const manageLoading = ref(false)
const manageTab = ref('members')
const currentDept = ref(null)
const members = ref([])
const admins = ref([])

const addMembersVisible = ref(false)
const addableUsers = ref([])
const addableLoading = ref(false)
const addMemberKeyword = ref('')
const selectedAddableIds = ref([])
const addMembersSubmitting = ref(false)

async function openManage(row) {
  currentDept.value = row
  manageTab.value = 'members'
  manageVisible.value = true
  await loadMembers()
}

async function loadMembers() {
  if (!currentDept.value) return
  manageLoading.value = true
  try {
    const res = await listDeptMembers(currentDept.value.id, { pageSize: 500 })
    const all = res.data?.members || []
    members.value = all
    admins.value = all.filter(u => u.role === 'dept_admin')
  } finally { manageLoading.value = false }
}

async function openAddMembers() {
  addMembersVisible.value = true
  addMemberKeyword.value = ''
  selectedAddableIds.value = []
  await searchAddableUsers()
}

async function searchAddableUsers() {
  addableLoading.value = true
  try {
    // 拉所有用户，跨部门也行；前端过滤
    const res = await getUserList({ keyword: addMemberKeyword.value, pageSize: 500 })
    addableUsers.value = res.data?.list || []
  } finally { addableLoading.value = false }
}

function onAddableSelectionChange(rows) {
  selectedAddableIds.value = rows.map(r => r.id)
}

async function handleAddMembers() {
  if (!currentDept.value || selectedAddableIds.value.length === 0) return
  addMembersSubmitting.value = true
  try {
    const res = await addDeptMembers(currentDept.value.id, { userIds: selectedAddableIds.value })
    ElMessage.success(`已添加 ${res.data?.assigned ?? 0} 人到部门 ${currentDept.value.name}`)
    addMembersVisible.value = false
    await loadMembers()
  } catch {} finally { addMembersSubmitting.value = false }
}

async function handleRemoveMember(row) {
  if (!currentDept.value) return
  try {
    await ElMessageBox.confirm(`确定将 ${row.username} 移出部门？`, t('common.warning'), { type: 'warning' })
    await removeDeptMember(currentDept.value.id, row.id)
    ElMessage.success('已移除')
    await loadMembers()
  } catch {}
}

async function handleAppointAdmin(row) {
  if (!currentDept.value) return
  try {
    await ElMessageBox.confirm(`确定将 ${row.username} 任命为部门管理员？`, t('common.tip'), { type: 'warning' })
    await appointDeptAdmin(currentDept.value.id, { userId: row.id })
    ElMessage.success('已任命')
    await loadMembers()
  } catch {}
}

async function handleRevokeAdmin(row) {
  if (!currentDept.value) return
  try {
    await ElMessageBox.confirm(`确定撤销 ${row.username} 的部门管理员身份？`, t('common.tip'), { type: 'warning' })
    await revokeDeptAdmin(currentDept.value.id, row.id)
    ElMessage.success('已撤销')
    await loadMembers()
  } catch {}
}

onMounted(fetchList)
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
