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
        <el-table-column prop="code" label="Code" width="100" />
        <el-table-column prop="remark" :label="t('services.remark')" min-width="160" />
        <el-table-column :label="t('common.status')" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? t('common.enabled') : t('common.disabled') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="Sort" width="80" />
        <el-table-column prop="createdAt" :label="t('common.createdAt')" width="180">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="200" fixed="right">
          <template #default="{ row }">
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
        <el-form-item label="Code" prop="code">
          <el-input v-model="form.code" placeholder="it, sales" />
        </el-form-item>
        <el-form-item :label="t('services.remark')">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="Sort">
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
        <el-form-item label="Code" prop="code">
          <el-input v-model="editForm.code" />
        </el-form-item>
        <el-form-item :label="t('services.remark')">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="Sort">
          <el-input-number v-model="editForm.sort" :min="0" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible=false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleEdit">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDeptList, createDept, updateDept, deleteDept } from '@/api/dept'
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

onMounted(fetchList)
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
