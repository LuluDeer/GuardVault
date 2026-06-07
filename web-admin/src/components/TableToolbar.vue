<template>
  <div class="table-toolbar">
    <span class="title">{{ title }}</span>
    <div class="actions">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, default: '' } })
</script>

<style scoped>
.table-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.table-toolbar .title { font-size: 16px; font-weight: 600; color: #303133; }
.table-toolbar .actions { display: flex; gap: 8px; }
</style>
