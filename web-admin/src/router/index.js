import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/services',
    children: [
      { path: 'services', name: 'Services', component: () => import('@/views/Services.vue'), meta: { title: '服务管理' } },
      { path: 'departments', name: 'Departments', component: () => import('@/views/Departments.vue'), meta: { title: '部门管理' } },
      { path: 'users', name: 'Users', component: () => import('@/views/Users.vue'), meta: { title: '用户管理' } },
      { path: 'totp', name: 'Totp', component: () => import('@/views/Totp.vue'), meta: { title: 'TOTP管理' } },
      { path: 'audit', name: 'Audit', component: () => import('@/views/Audit.vue'), meta: { title: '审计报表' } },
      { path: 'logs', name: 'Logs', component: () => import('@/views/Logs.vue'), meta: { title: '操作日志' } },
      { path: 'settings', name: 'Settings', component: () => import('@/views/Settings.vue'), meta: { title: '系统设置' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token')
  if (to.meta.requiresAuth !== false && !token) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'Login' && token) {
    return { path: '/' }
  }
})

export default router