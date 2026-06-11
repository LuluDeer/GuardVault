<template>
  <div>
    <el-card class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-input v-model="query.keyword" :placeholder="t('services.searchPlaceholder')" :prefix-icon="Search" clearable @keyup.enter="handleSearch" />
        </el-col>
        <el-col :span="5">
          <el-select v-model="query.category" :placeholder="t('services.categoryFilter')" clearable style="width:100%">
            <el-option :label="t('common.all')" value="" />
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="query.deptId" :placeholder="t('services.deptFilter')" clearable style="width:100%">
            <el-option :label="t('common.all')" value="" />
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-col>
        <el-col :span="8" style="text-align:right">
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">{{ t('services.addService') }}</el-button>
          <el-button :icon="Camera" @click="openScanDialog">{{ t('services.scan') }}</el-button>
          <el-button :icon="Upload" @click="openImportDialog">{{ t('services.import') }}</el-button>
          <el-button :icon="Setting" @click="catMgrVisible = true">管理分类</el-button>
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
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" :label="t('common.id')" width="80" />
        <el-table-column prop="name" :label="t('services.name')" min-width="140" />
        <el-table-column prop="category" :label="t('services.category')" width="100">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.category)" size="small">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="identifier" :label="t('services.identifier')" min-width="160" />
        <el-table-column prop="deptName" :label="t('services.deptName')" width="120" />
        <el-table-column prop="status" :label="t('common.status')" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? t('common.enabled') : t('common.disabled') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="t('common.createdAt')" width="180">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="380" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openDetailDialog(row)">{{ t('services.detail') }}</el-button>
            <el-button size="small" type="success" @click="openSecretDialog(row)">{{ t('services.qrCode') }}</el-button>
            <el-button size="small" type="warning" @click="openEditDialog(row)">{{ t('common.edit') }}</el-button>
            <el-button size="small" type="info" @click="handleResetSecret(row)">{{ t('services.resetSecret') }}</el-button>
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

    <el-dialog v-model="createVisible" title="新增服务" width="560px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入服务名称" />
        </el-form-item>
        <el-form-item label="服务分类" prop="category">
          <el-select v-model="form.category" :placeholder="t('services.selectCategory')" allow-create filterable style="width:100%">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
          <div style="font-size: 12px; color: #999; margin-top: 4px;">{{ t('services.categoryHint') }}</div>
        </el-form-item>
        <el-form-item label="账号/ARN" prop="identifier">
          <el-input v-model="form.identifier" placeholder="如：admin@example.com" />
        </el-form-item>
        <el-form-item label="服务地址" prop="url">
          <el-input v-model="form.url" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="所属部门" prop="deptId">
          <el-select v-model="form.deptId" :placeholder="t('services.selectDept')" style="width:100%"
            :model-value="form.deptId === null ? '__shared__' : form.deptId"
            @update:model-value="val => form.deptId = (val === '__shared__' ? null : val)"
          >
            <el-option :label="t('services.sharedService')" value="__shared__" />
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
          <div style="font-size: 12px; color: #999; margin-top: 4px;">{{ t('services.deptHint') }}</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-divider content-position="left" style="margin-bottom:12px">高级选项</el-divider>
        <el-form-item label="密钥">
          <el-input v-model="form.secret" placeholder="留空自动生成，Base32格式">
            <template #append>
              <el-button @click="generateSecret">生成</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label=" ">
          <div style="display:flex;gap:16px;align-items:center">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;color:#606266;white-space:nowrap">位数</span>
              <el-select v-model="form.digits" style="width:80px">
                <el-option label="6位" :value="6" />
                <el-option label="8位" :value="8" />
              </el-select>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;color:#606266;white-space:nowrap">周期</span>
              <el-select v-model="form.period" style="width:90px">
                <el-option label="30秒" :value="30" />
                <el-option label="60秒" :value="60" />
              </el-select>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;color:#606266;white-space:nowrap">算法</span>
              <el-select v-model="form.algorithm" style="width:110px">
                <el-option label="SHA1" value="SHA1" />
                <el-option label="SHA256" value="SHA256" />
                <el-option label="SHA512" value="SHA512" />
              </el-select>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible=false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editVisible" title="编辑服务" width="560px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="80px">
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="服务分类" prop="category">
          <el-select v-model="editForm.category" :placeholder="t('services.selectCategory')" allow-create filterable style="width:100%">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号/ARN" prop="identifier">
          <el-input v-model="editForm.identifier" />
        </el-form-item>
        <el-form-item label="服务地址" prop="url">
          <el-input v-model="editForm.url" />
        </el-form-item>
        <el-form-item label="所属部门" prop="deptId">
          <el-select v-model="editForm.deptId" :placeholder="t('services.selectDept')" clearable>
            <el-option :label="t('services.sharedService')" :value="null" />
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-divider content-position="left" style="margin-bottom:12px">高级选项</el-divider>
        <el-form-item label=" ">
          <div style="display:flex;gap:16px;align-items:center">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;color:#606266;white-space:nowrap">位数</span>
              <el-select v-model="editForm.digits" style="width:80px">
                <el-option label="6位" :value="6" />
                <el-option label="8位" :value="8" />
              </el-select>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;color:#606266;white-space:nowrap">周期</span>
              <el-select v-model="editForm.period" style="width:90px">
                <el-option label="30秒" :value="30" />
                <el-option label="60秒" :value="60" />
              </el-select>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;color:#606266;white-space:nowrap">算法</span>
              <el-select v-model="editForm.algorithm" style="width:110px">
                <el-option label="SHA1" value="SHA1" />
                <el-option label="SHA256" value="SHA256" />
                <el-option label="SHA512" value="SHA512" />
              </el-select>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible=false">取消</el-button>
        <el-button type="primary" @click="handleEdit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="secretVisible" :title="`二维码 - ${secretInfo?.name}`" width="420px">
      <div v-loading="secretLoading" class="secret-box">
        <p class="hint">可使用 Google Authenticator 扫描下方二维码</p>
        <div class="qr-wrap">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="qr-img" />
          <div v-else class="qr-loading">生成二维码中...</div>
        </div>
        <div class="secret-text">
          <label>密钥（Base32）</label>
          <el-input v-model="secretInfo.secret" readonly>
            <template #append>
              <el-button @click="copySecret">复制</el-button>
            </template>
          </el-input>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="detailVisible" :title="`详情 - ${detailInfo?.name}`" width="500px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="服务名称">{{ detailInfo?.name }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ detailInfo?.category }}</el-descriptions-item>
        <el-descriptions-item label="账号/ARN">{{ detailInfo?.identifier || '-' }}</el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ detailInfo?.deptName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="服务地址">{{ detailInfo?.url || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailInfo?.status === 1 ? '启用' : '停用' }}</el-descriptions-item>
        <el-descriptions-item label="位数">{{ detailInfo?.digits }}</el-descriptions-item>
        <el-descriptions-item label="周期">{{ detailInfo?.period }}秒</el-descriptions-item>
        <el-descriptions-item label="算法">{{ detailInfo?.algorithm }}</el-descriptions-item>
        <el-descriptions-item label="创建者">{{ detailInfo?.createdByName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ fmt(detailInfo?.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailInfo?.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible=false">关闭</el-button>
        <el-button type="primary" @click="openGrantDialog(detailInfo)">授权管理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="grantVisible" :title="`授权管理 - ${currentService?.name}`" width="600px">
      <div style="margin-bottom:16px">
        <el-input v-model="grantQuery.keyword" placeholder="搜索用户名" :prefix-icon="Search" clearable style="width:240px" @keyup.enter="fetchGrantUsers" />
        <el-button type="primary" @click="fetchGrantUsers">查询</el-button>
        <el-button @click="openBatchGrantDialog">批量授权</el-button>
      </div>
      <el-table :data="grantUsers" v-loading="grantLoading" border style="width:100%">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="deptName" label="部门" width="120" />
        <el-table-column prop="granted" label="授权状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.granted ? 'success' : 'info'" size="small">{{ row.granted ? '已授权' : '未授权' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button v-if="!row.granted" size="small" type="primary" @click="handleGrant(row)">授权</el-button>
            <el-button v-else size="small" type="danger" @click="handleRevoke(row)">撤销</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="grantVisible=false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scanVisible" title="扫码录入" width="560px">
      <div class="scan-box">
        <p class="hint">{{ t('services.scanHint') }}</p>
        <el-form :model="scanForm" label-width="100px">
          <el-form-item :label="t('services.scanMethod')">
            <el-radio-group v-model="scanInputMethod">
              <el-radio label="uri">{{ t('services.inputUri') }}</el-radio>
              <el-radio label="image">{{ t('services.uploadQrCode') }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="scanInputMethod === 'uri'" :label="t('services.otpauthUri')">
            <el-input v-model="scanForm.uri" type="textarea" :rows="3" placeholder="otpauth://totp/..." />
          </el-form-item>
          <el-form-item v-else :label="t('services.qrCodeImage')">
            <el-upload
              class="qr-upload"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="handleQrCodeChange"
            >
              <img v-if="qrCodeImageUrl" :src="qrCodeImageUrl" class="qr-preview-img" />
              <div v-else class="qr-upload-placeholder">
                <el-icon class="el-icon--upload"><Upload /></el-icon>
                <span>{{ t('services.clickToUpload') }}</span>
              </div>
            </el-upload>
          </el-form-item>
          <el-form-item :label="t('services.serviceName')">
            <el-input v-model="scanForm.name" :placeholder="t('services.nameAutoFill')" />
          </el-form-item>
          <el-form-item :label="t('services.dept')">
            <el-select v-model="scanForm.deptId" :placeholder="t('services.selectDept')" clearable style="width:100%">
              <el-option :label="t('services.sharedService')" :value="null" />
              <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('services.category')">
            <el-select v-model="scanForm.category" style="width:100%">
              <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
            </el-select>
          </el-form-item>
        </el-form>
        <div v-if="scanPreview" class="scan-preview">
          <el-divider />
          <h4>{{ t('services.parseResult') }}</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item :label="t('services.issuer')">{{ scanPreview.issuer || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('services.account')">{{ scanPreview.account || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('services.secret')">{{ scanPreview.secret.substring(0, 8) }}...</el-descriptions-item>
            <el-descriptions-item :label="t('services.algorithm')">{{ scanPreview.algorithm }}</el-descriptions-item>
            <el-descriptions-item :label="t('services.digits')">{{ scanPreview.digits }}</el-descriptions-item>
            <el-descriptions-item :label="t('services.period')">{{ scanPreview.period }}s</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="scanVisible=false">取消</el-button>
        <el-button v-if="scanInputMethod === 'uri'" @click="previewScan">{{ t('services.parsePreview') }}</el-button>
        <el-button v-else type="primary" :disabled="!qrCodeImageUrl || qrCodeLoading" @click="handleQrCodeParse">
          {{ qrCodeLoading ? t('services.analyzing') : t('services.analyzeQrCode') }}
        </el-button>
        <el-button type="primary" :disabled="!scanPreview" @click="handleScanCreate">{{ t('services.confirmCreate') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="批量导入服务" width="560px">
      <div class="import-box">
        <el-button type="success" :icon="Download" @click="downloadTemplate">下载CSV模板</el-button>
        <el-button type="info" @click="downloadJsonTemplate">下载JSON模板</el-button>
        <el-divider />
        <el-upload
          class="upload-demo"
          drag
          :auto-upload="false"
          :show-file-list="false"
          @change="handleFileChange"
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">拖放文件到此处，或<em>点击上传</em></div>
          <div class="el-upload__tip">支持 CSV 或 JSON 格式</div>
        </el-upload>
        <div v-if="importPreview.length > 0" class="preview-box">
          <el-divider />
          <h4>预览数据</h4>
          <el-table :data="importPreview" border style="width:100%">
            <el-table-column prop="name" label="服务名称" />
            <el-table-column prop="category" label="分类" />
            <el-table-column prop="identifier" label="账号" />
            <el-table-column prop="error" label="错误" width="180">
              <template #default="{ row }">
                <span v-if="row.error" style="color:#f56c6c">{{ row.error }}</span>
                <span v-else style="color:#67c23a">验证通过</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="importVisible=false">取消</el-button>
        <el-button type="primary" :disabled="importPreview.length === 0 || hasErrors" @click="handleImport">确认导入</el-button>
      </template>
    </el-dialog>

    <!-- 分类管理弹窗 -->
    <el-dialog v-model="catMgrVisible" title="管理分类" width="400px">
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <el-input v-model="newCatName" placeholder="输入新分类名称" clearable @keyup.enter="handleAddCategory" />
        <el-button type="primary" @click="handleAddCategory">添加</el-button>
      </div>
      <el-table :data="categories.map(c => ({ name: c }))" border style="width:100%" empty-text="暂无分类">
        <el-table-column prop="name" label="分类名称" />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button size="small" type="danger" @click="handleDeleteCategory(row.name)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="batchGrantVisible" title="批量授权" width="520px">
      <el-tabs v-model="batchGrantTab">
        <el-tab-pane label="按用户" name="user">
          <div>
            <p>请选择要授权的用户（已选中 {{ batchGrantIds.length }} 人）</p>
            <el-input v-model="batchGrantKeyword" placeholder="搜索用户名" style="width:100%;margin-bottom:12px" @keyup.enter="fetchBatchGrantUsers" />
            <el-table :data="batchGrantUsers" v-loading="batchGrantLoading" border style="width:100%">
              <el-table-column type="selection" :reserve-selection="true" width="55" @selection-change="onBatchGrantSelectionChange" />
              <el-table-column prop="username" label="用户名" />
              <el-table-column prop="deptName" label="部门" />
            </el-table>
          </div>
        </el-tab-pane>
        <el-tab-pane label="按部门" name="dept">
          <div>
            <p>选择要授权的部门（已选 {{ batchGrantDeptIds.length }} 个）</p>
            <el-table :data="departments" v-loading="deptsLoading" border @selection-change="onBatchGrantDeptChange" style="width:100%">
              <el-table-column type="selection" width="55" />
              <el-table-column prop="name" label="部门名称" />
              <el-table-column prop="code" label="编码" width="120" />
              <el-table-column label="成员数" width="100" :formatter="(r) => deptMemberCount[r.id] ?? '-' " />
            </el-table>
            <div style="margin-top:8px;color:#909399;font-size:12px">
              系统将展开所选部门下所有<strong>已启用</strong>用户，重复授权自动跳过
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="batchGrantVisible=false">取消</el-button>
        <el-button v-if="batchGrantTab === 'user'" type="primary" :disabled="batchGrantIds.length === 0" @click="handleBatchGrant">确认授权</el-button>
        <el-button v-else type="primary" :disabled="batchGrantDeptIds.length === 0" :loading="batchGrantDeptLoading" @click="handleBatchGrantByDept">确认授权</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h, computed } from 'vue'
import { Search, Plus, Upload, Download, Camera, Setting } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import QRCode from 'qrcode'
import { getServiceList, getService, getServiceSecret, createService, updateService, resetSecret, deleteService, getCategories, addCategory, deleteCategory, batchImport } from '@/api/service'
import { getAllDepts } from '@/api/dept'
import { grantAccess, revokeAccess, batchGrant, batchGrantByDept } from '@/api/grant'
import { getUserList } from '@/api/user'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const selectedIds = ref([])
const categories = ref([])
const departments = ref([])
const catMgrVisible = ref(false)
const newCatName = ref('')
const query = reactive({ page: 1, pageSize: 20, keyword: '', category: '', deptId: '' })

// 虚拟滚动表格列定义（大数据量场景，>50 行时启用；依赖 locale 以触发响应式刷新）
const v2Columns = computed(() => [
  { key: 'id', title: t('common.id'), dataKey: 'id', width: 80, align: 'center' },
  { key: 'name', title: t('services.name'), dataKey: 'name', width: 200 },
  {
    key: 'category', title: t('services.category'), dataKey: 'category', width: 120,
    cellRenderer: ({ rowData }) => h('el-tag', { type: getCategoryType(rowData.category), size: 'small' }, () => rowData.category),
  },
  { key: 'identifier', title: t('services.identifier'), dataKey: 'identifier', width: 200 },
  { key: 'deptName', title: t('services.deptName'), dataKey: 'deptName', width: 140 },
  {
    key: 'status', title: t('common.status'), dataKey: 'status', width: 100,
    cellRenderer: ({ rowData }) => h('el-tag', { type: rowData.status === 1 ? 'success' : 'danger', size: 'small' },
      () => rowData.status === 1 ? t('common.enabled') : t('common.disabled')),
  },
  { key: 'createdAt', title: t('common.createdAt'), dataKey: 'createdAt', width: 180, cellRenderer: ({ rowData }) => fmt(rowData.createdAt) },
  {
    key: 'actions', title: t('common.actions'), dataKey: 'actions', width: 380, fixed: 'right', align: 'center',
    cellRenderer: ({ rowData }) => h('div', { class: 'row-actions' }, [
      h('el-button', { size: 'small', type: 'primary', onClick: () => openDetailDialog(rowData) }, () => t('services.detail')),
      h('el-button', { size: 'small', type: 'success', onClick: () => openSecretDialog(rowData) }, () => t('services.qrCode')),
      h('el-button', { size: 'small', type: 'warning', onClick: () => openEditDialog(rowData) }, () => t('common.edit')),
      h('el-button', { size: 'small', type: 'info', onClick: () => handleResetSecret(rowData) }, () => t('services.resetSecret')),
      h('el-button', { size: 'small', type: 'danger', onClick: () => handleDelete(rowData) }, () => t('common.delete')),
    ]),
  },
])

const createVisible = ref(false)
const editVisible = ref(false)
const secretVisible = ref(false)
const detailVisible = ref(false)
const grantVisible = ref(false)
const importVisible = ref(false)
const batchGrantVisible = ref(false)
const scanVisible = ref(false)
const scanPreview = ref(null)
const scanForm = reactive({ uri: '', name: '', deptId: null, category: '其他' })
const scanInputMethod = ref('uri')
const qrCodeImageUrl = ref('')
const qrCodeLoading = ref(false)

const formRef = ref(null)
const editFormRef = ref(null)
const form = reactive({ name: '', category: '', identifier: '', url: '', deptId: null, remark: '', secret: '', digits: 6, period: 30, algorithm: 'SHA1' })
const editForm = reactive({ id: null, name: '', category: '', identifier: '', url: '', deptId: null, remark: '', status: 1, digits: 6, period: 30, algorithm: 'SHA1' })
const secretInfo = reactive({ id: null, name: '', secret: '', digits: 6, period: 30, algorithm: 'SHA1' })
const detailInfo = ref(null)
const currentService = ref(null)
const secretLoading = ref(false)
const qrDataUrl = ref('')

const grantQuery = reactive({ keyword: '' })
const grantUsers = ref([])
const grantLoading = ref(false)

const importPreview = ref([])
const batchGrantIds = ref([])
const batchGrantUsers = ref([])
const batchGrantLoading = ref(false)
const batchGrantKeyword = ref('')
const batchGrantTab = ref('user')
const batchGrantDeptIds = ref([])
const batchGrantDeptLoading = ref(false)
const deptsLoading = ref(false)
const deptMemberCount = ref({})

const rules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

const editRules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

const fmt = (v) => v ? new Date(v).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US') : '-'

const getCategoryType = (cat) => {
  const types = { '云服务': 'primary', 'VPN': 'warning', '代码托管': 'success', '堡垒机': 'danger', '数据库': 'info', '办公': '', '其他': '' }
  return types[cat] || ''
}

const hasErrors = () => importPreview.value.some(r => r.error)

function generateSecret() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  for (let i = 0; i < 32; i++) {
    secret += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  form.secret = secret
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getServiceList(query)
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } finally { loading.value = false }
}

async function fetchCategories() {
  try {
    const res = await getCategories()
    categories.value = res.data || []
  } catch {}
}

async function handleAddCategory() {
  const name = newCatName.value.trim()
  if (!name) return
  if (categories.value.some(c => c.toLowerCase() === name.toLowerCase())) {
    ElMessage.warning('分类已存在')
    return
  }
  try {
    await addCategory(name)
    categories.value.push(name)
    newCatName.value = ''
    ElMessage.success('添加成功')
  } catch { ElMessage.error('添加失败') }
}

async function handleDeleteCategory(name) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${name}」吗？`, '提示', { type: 'warning' })
    await deleteCategory(name)
    categories.value = categories.value.filter(c => c !== name)
    ElMessage.success('已删除')
  } catch {}
}

async function fetchDepartments() {
  try {
    const res = await getAllDepts()
    departments.value = res.data || []
  } catch {}
}

function handleSearch() { query.page = 1; fetchList() }
function onSelectionChange(rows) { selectedIds.value = rows.map(r => r.id) }

function resetForm() {
  Object.assign(form, { name: '', category: '', identifier: '', url: '', deptId: null, remark: '', secret: '', digits: 6, period: 30, algorithm: 'SHA1' })
  formRef.value?.resetFields()
}

function openCreateDialog() { resetForm(); createVisible.value = true }

async function handleCreate() {
  if (!await formRef.value?.validate()) return
  // 如果输入了新分类，自动保存（大小写不敏感比较；后端「已存在」静默吞）
  if (form.category && !categories.value.some(c => c.toLowerCase() === form.category.toLowerCase())) {
    try {
      await addCategory(form.category)
      categories.value.push(form.category)
    } catch (e) { /* 已存在或后端拒绝均可忽略 */ }
  }
  try {
    await createService(form)
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
  // 编辑时不再自动 addCategory：updateService 直接接受任意 category 字符串；
  // 本地 categories 缓存与后端 config 偶有不同步，自动同步会触发「分类已存在」误报
  try {
    await updateService(editForm.id, editForm)
    ElMessage.success(t('services.updateSuccess'))
    editVisible.value = false
    fetchList()
    fetchCategories()
  } catch {}
}

async function openSecretDialog(row) {
  secretInfo.id = row.id
  secretInfo.name = row.name
  secretLoading.value = true
  qrDataUrl.value = ''
  secretVisible.value = true
  try {
    const res = await getServiceSecret(row.id)
    secretInfo.secret = res.data.plainSecret
    secretInfo.digits = res.data.digits
    secretInfo.period = res.data.period
    secretInfo.algorithm = res.data.algorithm

    const otpauth = `otpauth://totp/${encodeURIComponent(row.name)}?secret=${res.data.plainSecret}&digits=${res.data.digits}&period=${res.data.period}&algorithm=${res.data.algorithm}`
    qrDataUrl.value = await QRCode.toDataURL(otpauth, { width: 220 })
  } catch {} finally { secretLoading.value = false }
}

async function copySecret() {
  try {
    await navigator.clipboard.writeText(secretInfo.secret)
    ElMessage.success('已复制')
  } catch { ElMessage.error('复制失败') }
}

function openDetailDialog(row) {
  detailInfo.value = row
  detailVisible.value = true
}

async function handleResetSecret(row) {
  try {
    await ElMessageBox.confirm(t('services.resetSecretConfirm', { name: row.name }), t('common.warning'), { type: 'warning' })
    await resetSecret(row.id)
    ElMessage.success(t('common.success'))
    fetchList()
  } catch {}
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(t('services.deleteConfirm', { name: row.name }), t('common.warning'), { type: 'warning' })
    await deleteService(row.id)
    ElMessage.success(t('services.deleteSuccess'))
    fetchList()
  } catch {}
}

function openGrantDialog(service) {
  currentService.value = service
  detailVisible.value = false
  grantVisible.value = true
  fetchGrantUsers()
}

async function fetchGrantUsers() {
  grantLoading.value = true
  try {
    const res = await getUserList({ keyword: grantQuery.keyword })
    const userList = res.data.list || []
    const serviceId = currentService.value?.id

    grantUsers.value = await Promise.all(userList.map(async (u) => {
      try {
        const checkRes = await import('@/api/grant').then(m => m.checkGrant({ userId: u.id, accountId: serviceId }))
        return { ...u, granted: checkRes.data.granted }
      } catch {
        return { ...u, granted: false }
      }
    }))
  } finally { grantLoading.value = false }
}

async function handleGrant(row) {
  try {
    await grantAccess({ userId: row.id, accountId: currentService.value.id })
    ElMessage.success('授权成功')
    fetchGrantUsers()
  } catch {}
}

async function handleRevoke(row) {
  try {
    await ElMessageBox.confirm('确定撤销授权吗？', '警告', { type: 'warning' })
    await revokeAccess({ userId: row.id, accountId: currentService.value.id })
    ElMessage.success('已撤销')
    fetchGrantUsers()
  } catch {}
}

function openBatchGrantDialog() {
  batchGrantIds.value = []
  batchGrantDeptIds.value = []
  batchGrantKeyword.value = ''
  batchGrantTab.value = 'user'
  batchGrantVisible.value = true
  fetchBatchGrantUsers()
  fetchDepartmentsForGrant()
}

function openScanDialog() {
  scanForm.uri = ''
  scanForm.name = ''
  scanForm.deptId = null
  scanForm.category = categories.value[0] || '其他'
  scanPreview.value = null
  scanInputMethod.value = 'uri'
  qrCodeImageUrl.value = ''
  qrCodeLoading.value = false
  scanVisible.value = true
}

function previewScan() {
  if (!scanForm.uri) {
    ElMessage.warning('请输入 otpauth URI')
    return
  }
  const uri = scanForm.uri.trim()
  if (!uri.startsWith('otpauth://')) {
    ElMessage.error('URI必须以 otpauth:// 开头')
    return
  }
  try {
    const url = new URL(uri)
    if (url.host !== 'totp') {
      ElMessage.error('仅支持 TOTP 协议')
      return
    }
    const secret = url.searchParams.get('secret')
    if (!secret) {
      ElMessage.error('缺少 secret 参数')
      return
    }
    const label = decodeURIComponent(url.pathname.replace(/^\//, ''))
    let issuer = url.searchParams.get('issuer') || ''
    let account = label
    if (label.includes(':')) {
      const parts = label.split(':')
      issuer = issuer || parts[0]
      account = parts[1] || parts[0]
    }
    scanPreview.value = {
      issuer,
      account,
      secret,
      algorithm: (url.searchParams.get('algorithm') || 'SHA1').toUpperCase(),
      digits: parseInt(url.searchParams.get('digits') || '6', 10),
      period: parseInt(url.searchParams.get('period') || '30', 10),
    }
    ElMessage.success('解析成功')
  } catch (err) {
    ElMessage.error('解析失败: ' + err.message)
  }
}

// 处理二维码图片上传
function handleQrCodeChange(file) {
  qrCodeImageUrl.value = URL.createObjectURL(file.raw)
  scanPreview.value = null
}

// 解析二维码图片
async function handleQrCodeParse() {
  if (!qrCodeImageUrl.value) return
  qrCodeLoading.value = true
  try {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // 使用 jsQR 库解析二维码
      if (typeof window.jsQR !== 'undefined') {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height)
        if (code && code.data && code.data.startsWith('otpauth://')) {
          scanForm.uri = code.data
          previewScan()
          ElMessage.success(t('services.qrCodeParseSuccess'))
        } else if (code) {
          ElMessage.error(t('services.qrCodeNotOtp'))
        } else {
          ElMessage.error(t('services.qrCodeNotFound'))
        }
      } else {
        // 如果没有 jsQR，动态加载
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
        script.onload = () => {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height)
          if (code && code.data && code.data.startsWith('otpauth://')) {
            scanForm.uri = code.data
            previewScan()
            ElMessage.success(t('services.qrCodeParseSuccess'))
          } else if (code) {
            ElMessage.error(t('services.qrCodeNotOtp'))
          } else {
            ElMessage.error(t('services.qrCodeNotFound'))
          }
        }
        script.onerror = () => {
          ElMessage.error(t('services.jsQrLoadFailed'))
        }
        document.head.appendChild(script)
      }
      qrCodeLoading.value = false
    }
    img.onerror = () => {
      ElMessage.error(t('services.imageLoadFailed'))
      qrCodeLoading.value = false
    }
    img.src = qrCodeImageUrl.value
  } catch (err) {
    ElMessage.error(t('services.parseError') + err.message)
    qrCodeLoading.value = false
  }
}

async function handleScanCreate() {
  try {
    const result = await scanCreate({ ...scanForm, name: scanForm.name || undefined })
    if (result.code === 0) {
      ElMessage.success('创建成功')
      scanVisible.value = false
      fetchList()
    } else {
      ElMessage.error(result.message || '创建失败')
    }
  } catch {}
}

async function fetchBatchGrantUsers() {
  batchGrantLoading.value = true
  try {
    const res = await getUserList({ keyword: batchGrantKeyword.value })
    batchGrantUsers.value = res.data.list || []
  } finally { batchGrantLoading.value = false }
}

function onBatchGrantSelectionChange(rows) {
  batchGrantIds.value = rows.map(r => r.id)
}

async function handleBatchGrant() {
  try {
    await batchGrant({ userIds: batchGrantIds.value, accountId: currentService.value.id })
    ElMessage.success(`成功授权 ${batchGrantIds.value.length} 个用户`)
    batchGrantVisible.value = false
    fetchGrantUsers()
  } catch {}
}

function onBatchGrantDeptChange(rows) {
  batchGrantDeptIds.value = rows.map(r => r.id)
}

async function fetchDepartmentsForGrant() {
  deptsLoading.value = true
  try {
    const res = await getAllDepts()
    departments.value = res.data || []
    // 拉取每个部门的成员数（用 user/list filter）
    const counts = {}
    await Promise.all(departments.value.map(async (d) => {
      try {
        const r = await getUserList({ deptId: d.id, page: 1, pageSize: 1 })
        counts[d.id] = r.data.total
      } catch { counts[d.id] = 0 }
    }))
    deptMemberCount.value = counts
  } finally { deptsLoading.value = false }
}

async function handleBatchGrantByDept() {
  batchGrantDeptLoading.value = true
  try {
    const res = await batchGrantByDept({ deptIds: batchGrantDeptIds.value, accountId: currentService.value.id })
    const { successCount, total, deptCount } = res.data
    ElMessage.success(`按 ${deptCount} 个部门授权：成功 ${successCount}/${total} 人`)
    batchGrantVisible.value = false
    fetchGrantUsers()
  } catch {} finally { batchGrantDeptLoading.value = false }
}

function downloadTemplate() {
  const content = '服务名称,分类,账号/ARN,服务地址,部门ID,备注\nAWS生产账号,云服务,admin@example.com,https://aws.amazon.com,1,生产环境\nGitHub,代码托管,dev@example.com,https://github.com,1,开发账号'
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'services_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

function downloadJsonTemplate() {
  const content = JSON.stringify([{ name: 'AWS生产账号', category: '云服务', identifier: 'admin@example.com', url: 'https://aws.amazon.com', deptId: 1, remark: '生产环境' }], null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'services_template.json'; a.click()
  URL.revokeObjectURL(url)
}

function handleFileChange(file) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    const content = e.target.result
    try {
      if (file.name.endsWith('.json')) {
        importPreview.value = await parseJson(content)
      } else {
        importPreview.value = await parseCsv(content)
      }
    } catch (err) {
      ElMessage.error('解析文件失败：' + err.message)
      importPreview.value = []
    }
  }
  reader.readAsText(file.raw)
}

async function parseJson(content) {
  const data = JSON.parse(content)
  if (!Array.isArray(data)) throw new Error('JSON必须是数组格式')
  return data.map(item => validateService(item))
}

async function parseCsv(content) {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.trim())
  const result = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const item = {}
    headers.forEach((h, idx) => {
      const keyMap = { '服务名称': 'name', '分类': 'category', '账号/ARN': 'identifier', '服务地址': 'url', '部门ID': 'deptId', '备注': 'remark' }
      const key = keyMap[h] || h
      item[key] = values[idx]?.trim()
    })
    if (Object.keys(item).length > 0) {
      result.push(validateService(item))
    }
  }
  return result
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (char === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += char }
  }
  result.push(current)
  return result
}

function validateService(item) {
  const errors = []
  if (!item.name) errors.push('缺少服务名称')
  if (!item.deptId) errors.push('缺少部门ID')
  return { ...item, error: errors.join('; ') || null }
}

async function handleImport() {
  const validItems = importPreview.value.filter(i => !i.error)
  try {
    await batchImport({ services: validItems })
    ElMessage.success(`成功导入 ${validItems.length} 个服务`)
    importVisible.value = false
    fetchList()
  } catch {}
}

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchDepartments(), fetchList()])
})
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.secret-box { text-align: center; }
.hint { font-size: 13px; color: #909399; margin-bottom: 12px; }
.qr-wrap { display: flex; justify-content: center; margin-bottom: 16px; }
.qr-img { width: 220px; height: 220px; border: 1px solid #eee; border-radius: 8px; }
.qr-loading { width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; color: #909399; background: #f5f7fa; border-radius: 8px; }
.secret-text { text-align: left; }
.secret-text label { display: block; font-size: 13px; color: #606266; margin-bottom: 6px; }
.import-box { max-height: 400px; overflow-y: auto; }
.preview-box { max-height: 200px; overflow-y: auto; }
.scan-box h4 { margin: 0 0 12px 0; font-size: 14px; }
.qr-upload { width: 200px; height: 200px; border: 1px dashed #d9d9d9; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.qr-upload:hover { border-color: #409eff; }
.qr-upload-placeholder { text-align: center; color: #909399; }
.qr-upload-placeholder .el-icon { font-size: 32px; margin-bottom: 8px; }
.qr-preview-img { width: 200px; height: 200px; object-fit: contain; border-radius: 8px; }

.category-manager { display: flex; flex-direction: column; gap: 16px; }
.category-add { display: flex; gap: 8px; align-items: center; }
.category-list { border: 1px solid #e4e7ed; border-radius: 6px; max-height: 300px; overflow-y: auto; }
.category-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
.category-item:last-child { border-bottom: none; }
.category-item span { font-size: 14px; }
.category-empty { padding: 24px; text-align: center; color: #909399; font-size: 13px; }
</style>