<template>
  <div class="import-page">
    <!-- 页头 -->
    <div class="import-header">
      <div class="import-header__text">
        <h2>{{ t('import.title') }}</h2>
        <p>{{ t('import.description') }}</p>
      </div>
    </div>

    <!-- 步骤指示器 -->
    <div class="step-indicator">
      <div v-for="(s, idx) in steps" :key="s.id" class="step-item" :class="{ active: step >= s.id, completed: step > s.id }">
        <div class="step-circle">
          <el-icon v-if="step > s.id"><Check /></el-icon>
          <span v-else>{{ s.id }}</span>
        </div>
        <span class="step-label">{{ s.label }}</span>
        <div v-if="idx < steps.length - 1" class="step-connector" :class="{ completed: step > s.id }"></div>
      </div>
    </div>

    <!-- ===== 步骤1：选择导入方式 ===== -->
    <div v-if="step === 1" class="step1-layout">
      <!-- 左栏 -->
      <div class="step1-left">
        <div class="method-tabs">
          <div
            v-for="m in methodList"
            :key="m.value"
            class="method-tab"
            :class="{ 'method-tab--active': importMethod === m.value }"
            @click="importMethod = m.value"
          >
            <el-icon class="method-tab__icon"><component :is="m.icon" /></el-icon>
            <span class="method-tab__label">{{ m.label }}</span>
          </div>
        </div>

        <!-- 输入内容区 -->
        <div class="input-body">
          <div v-if="importMethod === 'url'" class="input-section">
            <div class="input-section__label">粘贴迁移链接</div>
            <el-input v-model="migrationUrl" type="textarea" :rows="6" :placeholder="t('import.urlPlaceholder')" class="url-textarea" />
            <div class="input-hint"><el-icon><InfoFilled /></el-icon>{{ t('import.urlTip') }}</div>
          </div>

          <div v-if="importMethod === 'image'" class="input-section">
            <div class="input-section__label">上传二维码图片</div>
            <div class="drop-zone" :class="{ 'drop-zone--has-image': previewImage }" @click="triggerImageInput" @dragover.prevent @drop.prevent="handleImageDrop">
              <template v-if="!previewImage">
                <el-icon class="drop-zone__icon"><Picture /></el-icon>
                <p class="drop-zone__title">{{ t('import.imageUploadArea') }}</p>
                <p class="drop-zone__sub">{{ t('import.imageUploadTip') }}</p>
              </template>
              <template v-else><img :src="previewImage" alt="QR Preview" class="preview-img" /></template>
            </div>
            <input type="file" ref="imageInput" accept="image/*" style="display:none" @change="handleImageChange" />
            <div v-if="previewImage" class="image-actions">
              <el-button text type="danger" size="small" @click.stop="clearPreviewImage"><el-icon><Close /></el-icon> {{ t('import.removeImage') }}</el-button>
            </div>
          </div>

          <div v-if="importMethod === 'file'" class="input-section">
            <div class="input-section__label">上传文本文件</div>
            <div class="drop-zone" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop">
              <el-icon class="drop-zone__icon"><UploadFilled /></el-icon>
              <p class="drop-zone__title">{{ t('import.uploadArea') }}</p>
              <p class="drop-zone__sub">{{ t('import.fileUploadTip') }}</p>
            </div>
            <input type="file" ref="fileInput" accept=".txt" style="display:none" @change="handleFileChange" />
          </div>
        </div>

        <div class="step1-footer">
          <el-button type="primary" size="large" :disabled="!canParse" :loading="parsing" @click="doParseMigration" style="width:100%">
            <el-icon v-if="!parsing"><ArrowRight /></el-icon>
            {{ parsing ? t('import.parsing') : t('import.parse') }}
          </el-button>
        </div>
      </div>

      <!-- 右栏：说明面板 -->
      <div class="step1-right">
        <div v-if="importMethod === 'url'" class="guide-card">
          <div class="guide-card__header">
            <div class="guide-card__icon-wrap url"><el-icon><Link /></el-icon></div>
            <div><div class="guide-card__title">如何获取迁移链接？</div><div class="guide-card__subtitle">Google Authenticator 导出步骤</div></div>
          </div>
          <div class="guide-steps">
            <div class="guide-step"><div class="guide-step__num">1</div><div class="guide-step__content"><div class="guide-step__title">打开 Google Authenticator</div><div class="guide-step__desc">点击右上角 ⋮ 菜单，选择「转移账户」</div></div></div>
            <div class="guide-step"><div class="guide-step__num">2</div><div class="guide-step__content"><div class="guide-step__title">选择「导出账户」</div><div class="guide-step__desc">勾选要导出的 OTP 账户，点击「下一步」</div></div></div>
            <div class="guide-step"><div class="guide-step__num">3</div><div class="guide-step__content"><div class="guide-step__title">扫描二维码获取链接</div><div class="guide-step__desc">用另一台设备扫描，获取 <code>otpauth-migration://</code> 开头的链接</div></div></div>
            <div class="guide-step"><div class="guide-step__num">4</div><div class="guide-step__content"><div class="guide-step__title">粘贴链接到左侧</div><div class="guide-step__desc">将完整链接粘贴到左侧输入框，点击「解析」</div></div></div>
          </div>
          <div class="guide-tip"><el-icon><InfoFilled /></el-icon>链接仅在本次会话使用，不会被保存或上传到第三方</div>
        </div>
        <div v-else-if="importMethod === 'image'" class="guide-card">
          <div class="guide-card__header">
            <div class="guide-card__icon-wrap image"><el-icon><Picture /></el-icon></div>
            <div><div class="guide-card__title">图片识别导入</div><div class="guide-card__subtitle">上传包含 OTP 迁移二维码的截图</div></div>
          </div>
          <div class="guide-steps">
            <div class="guide-step"><div class="guide-step__num">1</div><div class="guide-step__content"><div class="guide-step__title">在 GA 中生成迁移二维码</div><div class="guide-step__desc">按 URL 方式步骤 1~2 操作，截图保存二维码</div></div></div>
            <div class="guide-step"><div class="guide-step__num">2</div><div class="guide-step__content"><div class="guide-step__title">上传截图</div><div class="guide-step__desc">支持 PNG / JPG / WEBP，建议截图清晰、二维码完整</div></div></div>
            <div class="guide-step"><div class="guide-step__num">3</div><div class="guide-step__content"><div class="guide-step__title">自动识别解析</div><div class="guide-step__desc">系统使用 jsQR 在浏览器本地识别，图片不会上传服务器</div></div></div>
          </div>
          <div class="guide-tip warning"><el-icon><InfoFilled /></el-icon>若识别失败，请尝试截图质量更高的图片，或切换为 URL 方式</div>
        </div>
        <div v-else-if="importMethod === 'file'" class="guide-card">
          <div class="guide-card__header">
            <div class="guide-card__icon-wrap file"><el-icon><Document /></el-icon></div>
            <div><div class="guide-card__title">文本文件导入</div><div class="guide-card__subtitle">上传包含迁移链接的 .txt 文件</div></div>
          </div>
          <div class="guide-steps">
            <div class="guide-step"><div class="guide-step__num">1</div><div class="guide-step__content"><div class="guide-step__title">准备文本文件</div><div class="guide-step__desc">新建 .txt 文件，将 <code>otpauth-migration://</code> 链接粘贴进去，每行一条</div></div></div>
            <div class="guide-step"><div class="guide-step__num">2</div><div class="guide-step__content"><div class="guide-step__title">上传文件</div><div class="guide-step__desc">点击或拖拽上传 .txt 文件，系统将自动读取并解析</div></div></div>
          </div>
          <div class="guide-tip"><el-icon><InfoFilled /></el-icon>文件内容仅在浏览器本地读取，解析完成后即丢弃</div>
        </div>
      </div>
    </div>

    <!-- ===== 步骤2：数据预览 ===== -->
    <div v-if="step === 2" class="step2-container">
      <div class="step2-toolbar">
        <div class="step2-toolbar__info">
          <span class="step2-toolbar__title">{{ t('import.selectServices') }}</span>
          <el-tag type="info" size="small" style="margin-left:8px">共 {{ importItems.length }} 条</el-tag>
          <span class="step2-toolbar__tip">
            <el-icon><InfoFilled /></el-icon>
            {{ t('import.deptPerRowTip') }}
          </span>
        </div>
        <div class="step2-toolbar__actions">
          <span class="step2-toolbar__label">{{ t('import.batchSetDept') }}：</span>
          <el-select v-model="batchDeptId" size="small" style="width:130px" @change="applyBatchDept">
            <el-option :label="t('services.sharedService')" :value="0" />
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
          <el-divider direction="vertical" />
          <el-button-group>
            <el-button size="small" @click="selectAll">{{ t('import.selectAll') }}</el-button>
            <el-button size="small" @click="selectNone">{{ t('import.selectNone') }}</el-button>
            <el-button size="small" @click="toggleSelect">{{ t('import.toggleSelect') }}</el-button>
          </el-button-group>
        </div>
      </div>

      <el-table
        ref="importTableRef"
        :data="importItems"
        :default-sort="{ prop: 'id', order: 'ascending' }"
        class="import-table"
        @selection-change="onImportSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" :label="t('import.serviceName')" min-width="160" />
        <el-table-column prop="issuer" :label="t('import.issuer')" min-width="120" />
        <el-table-column :label="t('import.type')" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'totp' ? 'success' : 'warning'" size="small">{{ row.type.toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('import.category')" min-width="150">
          <template #default="{ row }">
            <el-select v-model="row.category" style="width:140px" size="small" allow-create filterable>
              <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column :label="t('import.dept')" min-width="170">
          <template #default="{ row }">
            <el-select v-model="row.deptId" size="small" style="width:155px">
              <el-option :label="t('services.sharedService')" :value="0" />
              <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
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

      <div class="step2-footer">
        <el-button @click="step = 1">{{ t('common.back') }}</el-button>
        <div class="step2-footer__right">
          <span v-if="selectedCount > 0" class="selected-tip">已选 <strong>{{ selectedCount }}</strong> 条</span>
          <el-button type="primary" size="large" @click="confirmImport" :disabled="!hasSelected" :loading="importing">
            {{ importing ? t('import.importing') : t('import.importSelected', { count: selectedCount }) }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- ===== 步骤3：导入结果 ===== -->
    <div v-if="step === 3" class="step3-container">
      <div class="result-card">
        <div class="result-icon" :class="importResult.successCount > 0 ? 'success' : 'error'">
          <el-icon v-if="importResult.successCount > 0"><CircleCheck /></el-icon>
          <el-icon v-else><CircleClose /></el-icon>
        </div>
        <h2 class="result-title">{{ t('import.complete') }}</h2>
        <div class="result-stats">
          <div class="stat-block success">
            <div class="stat-block__num">{{ importResult.successCount }}</div>
            <div class="stat-block__label">导入成功</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-block error">
            <div class="stat-block__num">{{ importResult.failCount }}</div>
            <div class="stat-block__label">导入失败</div>
          </div>
        </div>
        <div v-if="importResult.results && importResult.results.length > 0" class="result-detail">
          <div class="result-detail__header">{{ t('import.detail') }}</div>
          <el-table :data="importResult.results" style="width:100%" max-height="320">
            <el-table-column prop="name" :label="t('import.serviceName')" min-width="160" />
            <el-table-column :label="t('common.status')" width="100">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                  {{ row.success ? t('common.success') : t('common.failed') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" :label="t('common.tip')" show-overflow-tooltip />
          </el-table>
        </div>
        <div class="result-actions">
          <el-button size="large" @click="$router.push('/services')">{{ t('import.backList') }}</el-button>
          <el-button type="primary" size="large" @click="resetImport">{{ t('import.continue') }}</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showSecretDialog" :title="t('import.secretDetail')" width="420px">
      <div class="secret-dialog">
        <p class="secret-label">{{ t('import.fullSecret') }}</p>
        <p class="secret-value">{{ visibleSecret }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Upload, Link, Picture, Document, UploadFilled, List, Check, Close, CircleCheck, CircleClose, ArrowRight, InfoFilled } from '@element-plus/icons-vue'
import { parseMigration as parseMigrationApi, confirmImport as apiConfirmImport } from '@/api/import'
import { getAllDepts } from '@/api/dept'
import { getCategories } from '@/api/service'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import jsQR from 'jsqr'

const { t } = useI18n()

const step = ref(1)
const steps = computed(() => [
  { id: 1, label: t('import.step1') },
  { id: 2, label: t('import.step2') },
  { id: 3, label: t('import.step3') },
])
const importMethod = ref('url')
const methodList = [
  {
    value: 'url',
    label: t('import.pasteUrl'),
    desc: t('import.urlMethodDesc'),
    icon: Link,
  },
  {
    value: 'image',
    label: t('import.uploadImage'),
    desc: t('import.imageMethodDesc'),
    icon: Picture,
  },
  {
    value: 'file',
    label: t('import.uploadFile'),
    desc: t('import.fileMethodDesc'),
    icon: Document,
  },
]
const migrationUrl = ref('')
const parsing = ref(false)
const importing = ref(false)
const importItems = ref([])
const selectedDeptId = ref(null)
const batchDeptId = ref(null)
const departments = ref([])
const categories = ref([])
const importResult = ref({ successCount: 0, failCount: 0, results: [] })
const showSecretDialog = ref(false)
const deptsLoaded = ref(false)
const visibleSecret = ref('')
const fileInput = ref(null)
const imageInput = ref(null)
const previewImage = ref('')

const hasFile = ref(false)

const canParse = computed(() => {
  if (importMethod.value === 'url') {
    return migrationUrl.value.trim().startsWith('otpauth-migration://')
  }
  if (importMethod.value === 'image') {
    return previewImage.value !== ''
  }
  if (importMethod.value === 'file') {
    return hasFile.value
  }
  return false
})

const selectedItems = computed(() => {
  return importItems.value.filter(item => item.selected)
})

const selectedCount = computed(() => selectedItems.value.length)
const hasSelected = computed(() => selectedCount.value > 0)

async function loadDepartments() {
  try {
    const [deptRes, catRes] = await Promise.all([
      getAllDepts(),
      getCategories(),
    ])
    if (deptRes.data) {
      // 不过滤 status，只要接口返回的部门都可用；后端已控制权限
      departments.value = Array.isArray(deptRes.data) ? deptRes.data : []
    }
    if (catRes.data) {
      categories.value = catRes.data
    }
    deptsLoaded.value = true
    // 不弹警告：部门为空时仍可导入为共享服务
  } catch (error) {
    ElMessage.error(t('import.loadDeptFailed'))
    deptsLoaded.value = true
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
        deptId: item.deptId ?? 0,
        category: guessCategory(item.issuer || item.name),
      }))
      step.value = 2
      await nextTick()
      selectAll()
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
    hasFile.value = true
    processTextFile(file)
  }
}

function handleDrop(event) {
  const file = event.dataTransfer.files[0]
  if (file) {
    hasFile.value = true
    processTextFile(file)
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function processTextFile(file) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    const content = e.target.result
    if (typeof content === 'string') {
      const lines = content.split('\n')
      const migrationLine = lines.find(line => line.startsWith('otpauth-migration://'))
      if (migrationLine) {
        migrationUrl.value = migrationLine.trim()
        await doParseMigration()
      } else {
        ElMessage.warning(t('import.fileNoUrl'))
      }
    }
  }
  reader.readAsText(file, 'utf-8')
}

function handleImageChange(event) {
  const file = event.target.files[0]
  if (file) {
    processImageFile(file)
  }
}

function handleImageDrop(event) {
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    processImageFile(file)
  }
}

function triggerImageInput() {
  imageInput.value?.click()
}

function clearPreviewImage() {
  previewImage.value = ''
  migrationUrl.value = ''
  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

function processImageFile(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target.result
    if (typeof result === 'string') {
      previewImage.value = result
      decodeQrCode(result)
    }
  }
  reader.readAsDataURL(file)
}

async function decodeQrCode(dataUrl) {
  try {
    console.log('开始解析二维码...')
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = dataUrl

    await new Promise((resolve, reject) => {
      img.onload = () => {
        console.log('图片加载成功，尺寸:', img.width, 'x', img.height)
        resolve()
      }
      img.onerror = (err) => {
        console.error('图片加载失败:', err)
        reject(err)
      }
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0, img.width, img.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    console.log('ImageData获取成功，大小:', imageData.data.length, 'bytes')

    // 尝试不同的inversionAttempts选项
    const options = [
      { inversionAttempts: "dontInvert" },
      { inversionAttempts: "onlyInvert" },
      { inversionAttempts: "attemptBoth" },
    ]

    let code = null
    for (const opt of options) {
      code = jsQR(imageData.data, imageData.width, imageData.height, opt)
      if (code) {
        console.log('二维码识别成功，使用选项:', opt.inversionAttempts)
        break
      }
    }

    if (code) {
      console.log('识别到的数据长度:', code.data.length)
      console.log('数据前50字符:', code.data.substring(0, 50))
      migrationUrl.value = code.data
      if (code.data.startsWith('otpauth-migration://')) {
        console.log('这是Google Authenticator迁移二维码')
        await doParseMigration()
      } else {
        console.warn('这不是迁移二维码')
        ElMessage.warning(t('import.notMigrationQr'))
      }
    } else {
      console.error('二维码识别失败')
      ElMessage.error(t('import.qrDecodeFailed'))
    }
  } catch (error) {
    console.error('二维码解析错误:', error)
    ElMessage.error(t('import.qrDecodeFailed'))
  }
}

const importTableRef = ref(null)

function onImportSelectionChange(selection) {
  importItems.value.forEach(item => {
    item.selected = selection.some(s => s.id === item.id)
  })
}

function applyBatchDept(deptId) {
  if (deptId === null || deptId === undefined) return
  importItems.value.forEach(item => {
    item.deptId = deptId
  })
}

function selectAll() {
  importItems.value.forEach(item => {
    importTableRef.value?.toggleRowSelection(item, true)
  })
}

function selectNone() {
  importTableRef.value?.clearSelection()
}

function toggleSelect() {
  importItems.value.forEach(item => {
    importTableRef.value?.toggleRowSelection(item, !item.selected)
  })
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
    // 每条 item 已携带独立 deptId（单独设置优先，批量设置也已写入各 item），不再传顶层 deptId
    const res = await apiConfirmImport({ items })
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
  previewImage.value = ''
  hasFile.value = false
  batchDeptId.value = null
  selectedDeptId.value = null
}

watch(importMethod, () => {
  hasFile.value = false
  if (importMethod.value !== 'image') {
    previewImage.value = ''
    if (imageInput.value) {
      imageInput.value.value = ''
    }
  }
})

onMounted(() => {
  loadDepartments()
})
</script>

<style scoped>
/* ===== 页面容器 ===== */
.import-page { padding: 24px; }

.import-header { margin-bottom: 28px; }
.import-header h2 { font-size: 22px; margin: 0 0 6px 0; font-weight: 600; }
.import-header p { color: #909399; margin: 0; font-size: 14px; }

/* ===== 步骤指示器 ===== */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  gap: 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f2f5;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
  border: 2px solid #e4e7ed;
}

.step-item.active .step-circle {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
  box-shadow: 0 0 0 4px rgba(64,158,255,0.15);
}

.step-item.completed .step-circle {
  background: #67c23a;
  color: #fff;
  border-color: #67c23a;
}

.step-label {
  font-size: 13px;
  color: #909399;
  transition: color 0.3s;
}

.step-item.active .step-label { color: #409eff; font-weight: 500; }
.step-item.completed .step-label { color: #67c23a; }

.step-connector {
  width: 48px;
  height: 2px;
  background: #e4e7ed;
  margin: 0 8px;
  transition: background 0.3s;
  flex-shrink: 0;
}
.step-connector.completed { background: #67c23a; }

/* ============================================================
   步骤1 布局
   ============================================================ */
.step1-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  animation: fadeIn 0.3s ease;
}

.step1-left {
  flex: 0 0 58%;
  min-width: 0;
  background: var(--bg-card, #fff);
  border-radius: 16px;
  border: 1px solid var(--border-color, #e5e6eb);
  box-shadow: 0 1px 8px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.step1-right {
  flex: 1;
  min-width: 0;
}

/* 方法 Tab */
.method-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--border-color, #e5e6eb);
}
.method-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px 8px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  color: #86909c;
  font-size: 13px;
}
.method-tab:not(:last-child) {
  border-right: 1px solid var(--border-color, #e5e6eb);
}
.method-tab:hover {
  background: #f7f8fa;
  color: #165dff;
}
.method-tab--active {
  color: #165dff;
  background: #f0f5ff;
  border-bottom-color: #165dff;
}
.method-tab__icon {
  font-size: 22px;
}
.method-tab__label {
  font-size: 13px;
  font-weight: 500;
}

/* 输入内容区 */
.input-body {
  flex: 1;
  padding: 24px;
}
.input-section__label {
  font-size: 13px;
  font-weight: 600;
  color: #4e5969;
  margin-bottom: 10px;
}
.url-textarea :deep(.el-textarea__inner) {
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
}
.input-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
  color: #86909c;
  background: #f7f8fa;
  padding: 8px 12px;
  border-radius: 6px;
}

/* 解析按钮区 */
.step1-footer {
  padding: 16px 24px 24px;
}

/* 上传拖拽区 */
.drop-zone {
  border: 2px dashed #c9cdd4;
  border-radius: 10px;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.drop-zone:hover {
  border-color: #165dff;
  background: #f0f5ff;
}
.drop-zone--has-image {
  padding: 12px;
  border-style: solid;
  border-color: #165dff;
}
.drop-zone__icon { font-size: 48px; color: #c9cdd4; margin-bottom: 12px; }
.drop-zone__title { font-size: 14px; color: #4e5969; margin: 0 0 6px 0; font-weight: 500; }
.drop-zone__sub { font-size: 12px; color: #86909c; margin: 0; }
.preview-img {
  max-width: 100%;
  max-height: 220px;
  border-radius: 8px;
  object-fit: contain;
}
.image-actions {
  margin-top: 10px;
  text-align: center;
}

/* ===== 说明面板（右栏） ===== */
.guide-panel {
  background: var(--bg-card, #fff);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border: 1px solid var(--border-color, #ebeef5);
  height: 100%;
  box-sizing: border-box;
}

.guide-panel__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.guide-panel__steps {
  padding-left: 20px;
  margin: 0;
}

.guide-panel__steps li {
  margin-bottom: 12px;
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
}

.guide-panel__steps li code,
.guide-panel__desc code {
  background: #f5f7fa;
  padding: 1px 5px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #409eff;
}

.guide-panel__desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
  margin: 0;
}

/* ===== 步骤2 容器 ===== */
.step2-container {
  background: var(--bg-card, #fff);
  border-radius: 16px;
  border: 1px solid var(--border-color, #e5e6eb);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  overflow: hidden;
  animation: fadeIn 0.3s ease;
}
.step2-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color, #e5e6eb);
  background: #fafafa;
}
.step2-toolbar__info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.step2-toolbar__title { font-size: 15px; font-weight: 600; color: #1d2129; }
.step2-toolbar__tip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}
.step2-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.step2-toolbar__label { font-size: 13px; color: #606266; white-space: nowrap; }
.step2-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e5e6eb);
  background: #fafafa;
}
.step2-footer__right { display: flex; align-items: center; gap: 12px; }
.selected-tip { font-size: 13px; color: #606266; }

/* ===== guide-card ===== */
.guide-card {
  background: var(--bg-card, #fff);
  border-radius: 16px;
  border: 1px solid var(--border-color, #e5e6eb);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  overflow: hidden;
}
.guide-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e5e6eb);
}
.guide-card__icon-wrap {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.guide-card__icon-wrap.url   { background: #e8f3ff; color: #165dff; }
.guide-card__icon-wrap.image { background: #e8ffea; color: #00b42a; }
.guide-card__icon-wrap.file  { background: #fff7e6; color: #ff7d00; }
.guide-card__title { font-size: 15px; font-weight: 600; color: #1d2129; margin-bottom: 2px; }
.guide-card__subtitle { font-size: 12px; color: #86909c; }
.guide-steps {
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 16px;
}
.guide-step { display: flex; align-items: flex-start; gap: 14px; }
.guide-step__num {
  width: 26px; height: 26px; border-radius: 50%;
  background: #f2f3f5; color: #4e5969;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.guide-step__content { flex: 1; min-width: 0; }
.guide-step__title { font-size: 13px; font-weight: 600; color: #1d2129; margin-bottom: 3px; }
.guide-step__desc { font-size: 12px; color: #86909c; line-height: 1.6; }
.guide-step__desc code {
  background: #f2f3f5; padding: 1px 5px; border-radius: 4px;
  font-family: monospace; font-size: 11px; color: #165dff;
}
.guide-tip {
  display: flex; align-items: flex-start; gap: 8px;
  margin: 0 24px 20px;
  padding: 10px 14px; border-radius: 8px;
  font-size: 12px; color: #165dff;
  background: rgba(22,93,255,0.06); line-height: 1.6;
}
.guide-tip.warning { color: #ff7d00; background: rgba(255,125,0,0.06); }

/* ===== 步骤2：表格全宽 ===== */
.import-step--table {
  background: var(--bg-card, #fff);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border: 1px solid var(--border-color, #ebeef5);
}

.import-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color, #ebeef5);
}

.import-toolbar__left { display: flex; flex-direction: column; gap: 4px; }
.import-toolbar__title { margin: 0; font-size: 15px; font-weight: 600; }
.import-toolbar__tip { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #909399; }
.import-toolbar__right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.import-toolbar__label { font-size: 13px; color: #606266; white-space: nowrap; }

.import-table { margin-bottom: 0; }
.secret-masked { font-family: monospace; font-size: 13px; color: #606266; }

/* ===== 导航按钮 ===== */
.step-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}
.step-nav--right { justify-content: flex-end; }

/* ============================================================
   步骤3 结果
   ============================================================ */
.step3-container {
  display: flex;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.result-card {
  width: 100%;
  max-width: 780px;
  background: var(--bg-card, #fff);
  border-radius: 20px;
  border: 1px solid var(--border-color, #e5e6eb);
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  padding: 40px 48px;
  text-align: center;
}

.result-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 32px;
  color: #fff;
}
.result-icon.success { background: linear-gradient(135deg, #00b42a, #4cd263); }
.result-icon.error { background: linear-gradient(135deg, #f53f3f, #f98981); }

.result-title {
  font-size: 20px;
  font-weight: 700;
  color: #1d2129;
  margin: 0 0 28px 0;
}

.result-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.stat-block {
  flex: 1;
  padding: 24px 32px;
  border-radius: 12px;
}
.stat-block.success { background: #e8ffea; }
.stat-block.error { background: #ffece8; }
.stat-block__num {
  font-size: 48px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 6px;
}
.stat-block.success .stat-block__num { color: #00b42a; }
.stat-block.error .stat-block__num { color: #f53f3f; }
.stat-block__label {
  font-size: 14px;
  color: #86909c;
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 80px;
  background: #e5e6eb;
  margin: 0 8px;
  flex-shrink: 0;
}

.result-detail {
  text-align: left;
  margin-bottom: 28px;
}
.result-detail__header {
  font-size: 14px;
  font-weight: 600;
  color: #4e5969;
  margin-bottom: 10px;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* ============================================================
   密钥弹窗
   ============================================================ */
.secret-dialog { padding: 8px; }
.secret-label { margin: 0 0 8px 0; color: #4e5969; font-size: 13px; }
.secret-value {
  margin: 0;
  font-family: monospace;
  font-size: 15px;
  color: #165dff;
  word-break: break-all;
  padding: 14px;
  background: #f2f3f5;
  border-radius: 8px;
  line-height: 1.6;
}

/* ============================================================
   动画
   ============================================================ */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   暗色模式
   ============================================================ */
html.dark .step1-left,
html.dark .guide-card,
html.dark .step2-container,
html.dark .result-card {
  background: #1e293b;
  border-color: #334155;
}
html.dark .method-tabs { border-bottom-color: #334155; }
html.dark .method-tab { color: #94a3b8; }
html.dark .method-tab:not(:last-child) { border-right-color: #334155; }
html.dark .method-tab:hover { background: #1e3a5f; color: #60a5fa; }
html.dark .method-tab--active { color: #60a5fa; background: #1e3a5f; border-bottom-color: #60a5fa; }
html.dark .input-body { background: transparent; }
html.dark .input-section__label { color: #94a3b8; }
html.dark .input-hint { background: #334155; color: #94a3b8; }
html.dark .drop-zone { border-color: #334155; }
html.dark .drop-zone:hover { border-color: #60a5fa; background: rgba(96,165,250,0.08); }
html.dark .guide-card__header { border-bottom-color: #334155; }
html.dark .guide-card__title { color: #e2e8f0; }
html.dark .guide-card__subtitle { color: #64748b; }
html.dark .guide-step__num { background: #334155; color: #94a3b8; }
html.dark .guide-step__title { color: #e2e8f0; }
html.dark .guide-step__desc { color: #64748b; }
html.dark .guide-step__desc code { background: #334155; color: #60a5fa; }
html.dark .guide-tip { background: rgba(96,165,250,0.1); color: #60a5fa; }
html.dark .guide-tip.warning { background: rgba(255,125,0,0.1); color: #ff9a3c; }
html.dark .step2-toolbar { background: #1a2333; border-bottom-color: #334155; }
html.dark .step2-toolbar__title { color: #e2e8f0; }
html.dark .step2-toolbar__tip { color: #64748b; }
html.dark .step2-footer { background: #1a2333; border-top-color: #334155; }
html.dark .step1-footer { background: transparent; }
html.dark .result-title { color: #e2e8f0; }
html.dark .stat-block.success { background: rgba(0,180,42,0.1); }
html.dark .stat-block.error { background: rgba(245,63,63,0.1); }
html.dark .stat-divider { background: #334155; }
html.dark .result-detail__header { color: #94a3b8; }
html.dark .secret-value { background: #334155; color: #60a5fa; }
html.dark .import-header__title { color: #e2e8f0; }
html.dark .import-header__desc { color: #64748b; }
</style>
