<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
onMounted(() => {
  theme.init()
})
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ============== 暗色模式全局样式 ============== */
html.dark body { background: #0f172a; color: #e2e8f0; }
html.dark .el-card { background: #1e293b !important; border-color: #334155 !important; color: #e2e8f0; }
html.dark .el-card__header { border-bottom-color: #334155 !important; color: #e2e8f0; }
html.dark .el-table { background: #1e293b !important; color: #e2e8f0 !important; --el-table-bg-color: #1e293b; --el-table-tr-bg-color: #1e293b; --el-table-header-bg-color: #0f172a; --el-table-border-color: #334155; --el-table-header-text-color: #cbd5e1; --el-table-text-color: #e2e8f0; }
html.dark .el-table tr { background: #1e293b !important; }
html.dark .el-table--striped .el-table__body tr.el-table__row--striped td { background: #243044 !important; }
html.dark .el-table td, html.dark .el-table th.el-table__cell { border-bottom-color: #334155 !important; }
html.dark .el-input__wrapper, html.dark .el-textarea__inner, html.dark .el-select__wrapper { background: #0f172a !important; box-shadow: 0 0 0 1px #334155 inset !important; color: #e2e8f0; }
html.dark .el-input__inner, html.dark .el-textarea__inner { color: #e2e8f0 !important; }
html.dark .el-dialog { background: #1e293b !important; color: #e2e8f0; }
html.dark .el-dialog__title { color: #e2e8f0 !important; }
html.dark .el-dialog__header { border-bottom: 1px solid #334155; }
html.dark .el-pagination { color: #cbd5e1 !important; }
html.dark .el-pagination .el-pager li { background: #1e293b !important; color: #cbd5e1 !important; }
html.dark .el-pagination .el-pager li.is-active { background: #2563eb !important; color: #fff !important; }
html.dark .el-descriptions__label { color: #94a3b8 !important; }
html.dark .el-descriptions__content { color: #e2e8f0 !important; }
html.dark .el-descriptions__cell { background: #1e293b !important; }
html.dark .el-divider__text { background: #1e293b !important; color: #cbd5e1; }
html.dark .el-form-item__label { color: #cbd5e1 !important; }
html.dark .el-button.is-plain { --el-button-plain-bg-color: #1e293b; }
html.dark .el-tag { border-color: #334155; }
html.dark .el-menu { background-color: #0f172a !important; }
html.dark .el-menu-item { color: rgba(255,255,255,0.7) !important; }
html.dark .el-menu-item:hover { background-color: rgba(255,255,255,0.05) !important; }
html.dark .el-dropdown-menu { background: #1e293b !important; border-color: #334155 !important; }
html.dark .el-dropdown-menu__item { color: #e2e8f0 !important; }
html.dark .el-dropdown-menu__item:hover { background: #334155 !important; }
html.dark .el-table-v2__header-cell, html.dark .el-table-v2__row-cell { color: #e2e8f0; }
html.dark .el-table-v2__header { background: #0f172a; }
html.dark .el-table-v2__row { background: #1e293b; }
html.dark .el-upload-dragger { background: #0f172a !important; border-color: #334155 !important; }
html.dark .el-empty__description p { color: #94a3b8 !important; }
</style>
