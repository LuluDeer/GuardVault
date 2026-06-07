<template>
  <el-card class="search-card">
    <slot />
  </el-card>
</template>

<script setup>
// 通用搜索栏容器，统一间距和 padding
</script>

<style scoped>
.search-card :deep(.el-card__body) { padding: 16px 20px; }
</style>
