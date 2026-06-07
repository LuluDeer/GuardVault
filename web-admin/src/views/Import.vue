<template>
  <div class="import-page">
    <div class="import-header">
      <h2>{{ t('import.title') }}</h2>
      <p class="description">{{ t('import.description') }}</p>
    </div>

    <div v-if="step === 1" class="import-step">
      <div class="step-card">
        <div class="step-icon">
          <el-icon><Upload /></el-icon>
        </div>
        <h3>{{ t('import.selectMethod') }}</h3>
        <p>{{ t('import.selectMethodDesc') }}</p>

        <div class="method-tabs">
          <el-button
            type="primary"
            :class="{ active: importMethod === 'url' }"
            @click="importMethod = 'url'"
          >
            <el-icon><Link /></el-icon>
            {{ t('import.pasteUrl') }}
          </el-button>
          <el-button
            type="primary"
            :class="{ active: importMethod === 'file' }"
            @click="importMethod = 'file'"
          >
            <el-icon><Document /></el-icon>
            {{ t('import.uploadFile') }}
          </el-button>
        </div>

        <div v-if="importMethod === 'url'" class="method-content">
          <el-textarea
            v-model="migrationUrl"
            :rows="4"
            :placeholder="t('import.urlPlaceholder')"
            class="url-input"
          />
          <p class="tip">{{ t('import.urlTip') }}</p>
        </div>

        <div v-if="importMethod === 'file'" class="method-content">
          <div class="upload-area" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop">
            <el-icon><UploadFilled /></el-icon>
            <p>{{ t('import.uploadArea') }}</p>
            <p class="file-tip">{{ t('import.uploadTip') }}</p>
            <input type="file" ref="fileInput" accept=".txt" style="display:none" @change="handleFileChange" />
          </div>
        </div>

        <el-button type="primary" size="large" @click="doParseMigration" :disabled="!canParse" :loading="parsing">
          {{ parsing ? t('import.parsing') : t('import.parse') }}
        </el-button>
      </div>
    </div>

    <div v-if="step === 2" class="import-step">
      <div class="step-card">
        <div class="step-icon">
          <el-icon><List /></el-icon>
        </div>
        <h3>{{ t('import.selectServices') }}</h3>

        <div class="dept-select">
          <el-form-item :label="t('import.dept')" required>
            <el-select v-model="selectedDeptId" :placeholder="t('import.selectDept')" style="width:200px">
              <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
            </el-select>
          </el-form-item>
        </div>

        <el-table
          :data="importItems"
          :default-sort="{ prop: 'id', order: 'ascending' }"
          class="import-table"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="name" :label="t('import.serviceName')" min-width="180" />
          <el-table-column prop="issuer" :label="t('import.issuer')" min-width="120" />
          <el-table-column :label="t('import.type')" width="80">
            <template #default="{ row }">
              <el-tag :type="row.type === 'totp' ? 'success' : 'warning'">{{ row.type.toUpperCase() }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="digits" :label="t('import.digits')" width="70" />
          <el-table-column prop="algorithm" :label="t('import.algorithm')" width="80" />
          <el-table-column :label="t('import.category')" width="100">
            <template #default="{ row }">
              <el-select v-model="row.category" style="width:100px">
                <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column :label="t('import.secret')" min-width="200">
            <template #default="{ row }">
              <span class="secret-masked">{{ maskSecret(row.secret) }}</span>
              <el-button text size="small" @click="showSecret(row.secret)">{{ t('import.viewSecret') }}</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-actions">
          <el-button @click="selectAll">{{ t('import.selectAll') }}</el-button>
          <el-button @click="selectNone">{{ t('import.selectNone') }}</el-button>
          <el-button @click="toggleSelect">{{ t('import.toggleSelect') }}</el-button>
        </div>

        <div class="step-nav">
          <el-button @click="step = 1">{{ t('common.back') }}</el-button>
          <el-button type="primary" size="large" @click="confirmImport" :disabled="!hasSelected" :loading="importing">
            {{ importing ? t('import.importing') : t('import.importSelected', { count: selectedCount }) }}
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="step === 3" class="import-step">
      <div class="step-card">
        <div class="step-icon" :class="importResult.successCount > 0 ? 'success' : 'error'">
          <el-icon v-if="importResult.successCount > 0"><CircleCheck /></el-icon>
          <el-icon v-else><CircleClose /></el-icon>
        </div>
        <h3>{{ t('import.complete') }}</h3>

        <div class="result-stats">
          <div class="stat-item success">
            <el-icon><Check /></el-icon>
            <span>{{ t('import.success', { count: importResult.successCount }) }}</span>
          </div>
          <div class="stat-item error">
            <el-icon><Close /></el-icon>
            <span>{{ t('import.fail', { count: importResult.failCount }) }}</span>
          </div>
        </div>

        <div v-if="importResult.results && importResult.results.length > 0" class="result-list">
          <h4>{{ t('import.detail') }}</h4>
          <el-table :data="importResult.results" class="result-table">
            <el-table-column prop="name" :label="t('import.serviceName')" />
            <el-table-column :label="t('common.status')" width="100">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'">
                  {{ row.success ? t('common.success') : t('common.failed') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" :label="t('common.tip')" show-overflow-tooltip />
          </el-table>
        </div>

        <div class="step-nav">
          <el-button type="primary" size="large" @click="resetImport">{{ t('import.continue') }}</el-button>
          <el-button @click="$router.push('/services')">{{ t('import.backList') }}</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showSecretDialog" :title="t('import.secretDetail')" width="400px">
      <div class="secret-dialog">
        <p class="secret-label">{{ t('import.fullSecret') }}</p>
        <p class="secret-value">{{ visibleSecret }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Upload, Link, Document, UploadFilled, List, Check, Close, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { parseMigration as parseMigrationApi, confirmImport as apiConfirmImport } from '@/api/import'
import { getAllDepts } from '@/api/dept'
import { getCategories } from '@/api/service'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const step = ref(1)
const importMethod = ref('url')
const migrationUrl = ref('')
const parsing = ref(false)
const importing = ref(false)
const importItems = ref([])
const selectedDeptId = ref(null)
const departments = ref([])
const categories = ref([])
const importResult = ref({ successCount: 0, failCount: 0, results: [] })
const showSecretDialog = ref(false)
const visibleSecret = ref('')
const fileInput = ref(null)

const canParse = computed(() => {
  if (importMethod.value === 'url') {
    return migrationUrl.value.trim().startsWith('otpauth-migration://')
  }
  return false
})

const selectedItems = computed(() => {
  return importItems.value.filter(item => item.selected)
})

const selectedCount = computed(() => selectedItems.value.length)
const hasSelected = computed(() => selectedCount.value > 0 && selectedDeptId.value !== null)

async function loadDepartments() {
  try {
    const [deptRes, catRes] = await Promise.all([
      getAllDepts(),
      getCategories(),
    ])
    if (deptRes.data) {
      departments.value = deptRes.data.filter(d => d.status === 1)
      if (departments.value.length > 0) {
        selectedDeptId.value = departments.value[0].id
      }
    }
    if (catRes.data) {
      categories.value = catRes.data
    }
  } catch (error) {
    ElMessage.error(t('common.failed'))
  }
}

async function doParseMigration() {
  parsing.value = true
  try {
    const res = await parseMigrationApi({ url: migrationUrl.value.trim() })
    if (res.code === 0 && res.data && res.data.length > 0) {
      importItems.value = res.data.map(item => ({
        ...item,
        selected: true,
        category: guessCategory(item.issuer || item.name),
      }))
      step.value = 2
    } else {
      ElMessage.warning(t('import.noOtpFound'))
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message
    ElMessage.error(t('import.parseFailed', { msg }))
  } finally {
    parsing.value = false
  }
}

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file) {
    processFile(file)
  }
}

function handleDrop(event) {
  const file = event.dataTransfer.files[0]
  if (file) {
    processFile(file)
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function processFile(file) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    const content = e.target.result
    if (typeof content === 'string') {
      const lines = content.split('\n')
      const migrationLine = lines.find(line => line.startsWith('otpauth-migration://'))
      if (migrationLine) {
        migrationUrl.value = migrationLine.trim()
        importMethod.value = 'url'
        await doParseMigration()
      } else {
        ElMessage.warning(t('import.fileNoUrl'))
      }
    }
  }
  reader.readAsText(file, 'utf-8')
}

function selectAll() {
  importItems.value.forEach(item => item.selected = true)
}

function selectNone() {
  importItems.value.forEach(item => item.selected = false)
}

function toggleSelect() {
  importItems.value.forEach(item => item.selected = !item.selected)
}

function maskSecret(secret) {
  if (!secret) return ''
  if (secret.length <= 8) return secret
  return secret.substring(0, 4) + '****' + secret.substring(secret.length - 4)
}

function guessCategory(name) {
  const keywordMap = [
    { keywords: ['aws', 'amazon', 'ec2', 's3'], category: '云服务' },
    { keywords: ['azure', 'microsoft'], category: '云服务' },
    { keywords: ['google', 'gcp'], category: '云服务' },
    { keywords: ['aliyun', 'alibaba', '阿里云'], category: '云服务' },
    { keywords: ['tencent', '腾讯云'], category: '云服务' },
    { keywords: ['huawei', '华为云'], category: '云服务' },
    { keywords: ['github', 'gitlab', 'bitbucket'], category: '代码托管' },
    { keywords: ['vpn', 'openvpn', 'wireguard'], category: 'VPN' },
    { keywords: ['ssh', '堡垒机', 'jump'], category: '堡垒机' },
    { keywords: ['mysql', 'postgres', 'mongodb', 'redis', 'database'], category: '数据库' },
    { keywords: ['slack', 'wechat', 'dingtalk', 'feishu', '钉钉', '飞书'], category: '办公' },
    { keywords: ['okta', 'azuread', 'adfs', 'ldap'], category: '身份认证' },
  ]

  const lowerName = (name || '').toLowerCase()
  for (const { keywords, category } of keywordMap) {
    if (keywords.some(k => lowerName.includes(k))) {
      if (categories.value.includes(category)) {
        return category
      }
    }
  }
  return categories.value[0] || '其他'
}

function showSecret(secret) {
  visibleSecret.value = secret
  showSecretDialog.value = true
}

async function confirmImport() {
  importing.value = true
  try {
    const items = importItems.value.filter(item => item.selected)
    const res = await apiConfirmImport({ items, deptId: selectedDeptId.value })
    if (res.code === 0 && res.data) {
      importResult.value = res.data
      step.value = 3
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message
    ElMessage.error(t('import.importFailed', { msg }))
  } finally {
    importing.value = false
  }
}

function resetImport() {
  step.value = 1
  migrationUrl.value = ''
  importItems.value = []
  importResult.value = { successCount: 0, failCount: 0, results: [] }
}

onMounted(() => {
  loadDepartments()
})
</script>

<style scoped>
.import-page { padding: 24px; max-width: 1000px; margin: 0 auto; }

.import-header { margin-bottom: 24px; }
.import-header h2 { font-size: 24px; margin: 0 0 8px 0; }
.import-header .description { color: #909399; margin: 0; }

.import-step { animation: fadeIn 0.3s ease; }

.step-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.step-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #667eea);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  font-size: 28px;
  color: #fff;
}

.step-icon.success { background: linear-gradient(135deg, #67c23a, #85ce61); }
.step-icon.error { background: linear-gradient(135deg, #f56c6c, #f89898); }

.step-card h3 { font-size: 18px; margin: 0 0 8px 0; }
.step-card p { color: #909399; margin: 0 0 24px 0; }

.method-tabs { display: flex; gap: 12px; margin-bottom: 20px; }
.method-tabs .el-button { flex: 1; padding: 16px; }
.method-tabs .el-button.active { background: #409eff; border-color: #409eff; }

.url-input { width: 100%; }

.tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px !important;
  background: #f5f7fa;
  padding: 10px 14px;
  border-radius: 6px;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.upload-area .el-icon { font-size: 48px; color: #c0c4cc; margin-bottom: 12px; }
.upload-area p { margin: 0; color: #606266; }
.file-tip { font-size: 12px; color: #909399; margin-top: 8px !important; }

.dept-select { margin-bottom: 16px; }

.import-table { margin-bottom: 16px; }
.secret-masked { font-family: monospace; font-size: 13px; color: #606266; }

.table-actions { display: flex; gap: 8px; margin-bottom: 24px; }

.step-nav { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }

.result-stats { display: flex; gap: 24px; margin-bottom: 24px; }

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
}

.stat-item.success { background: #f0f9eb; color: #67c23a; }
.stat-item.error { background: #fef0f0; color: #f56c6c; }

.result-list h4 { margin: 0 0 12px 0; font-size: 14px; }
.result-table { max-height: 300px; overflow-y: auto; }

.secret-dialog { padding: 16px; }
.secret-label { margin: 0 0 8px 0; color: #606266; font-size: 13px; }
.secret-value {
  margin: 0;
  font-family: monospace;
  font-size: 16px;
  color: #409eff;
  word-break: break-all;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dark .step-card { background: #1e293b; }
.dark .upload-area { border-color: #334155; }
.dark .upload-area:hover { border-color: #409eff; background: rgba(64, 158, 255, 0.1); }
.dark .tip { background: #334155; }
.dark .stat-item.success { background: rgba(103, 194, 58, 0.1); }
.dark .stat-item.error { background: rgba(245, 108, 108, 0.1); }
.dark .secret-value { background: #334155; }
</style>