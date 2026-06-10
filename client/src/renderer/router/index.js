import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('../views/Config.vue'),
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import('../views/Services.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dept',
    name: 'Department',
    component: () => import('../views/Department.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/service/:id',
    name: 'ServiceDetail',
    component: () => import('../views/ServiceDetail.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/password',
    name: 'Password',
    component: () => import('../views/Password.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    redirect: '/services',
  },

];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export function setupRouterGuard() {
  router.beforeEach(async (to, from, next) => {
    const auth = useAuthStore();

    if (to.meta.requiresAuth && !auth.isLoggedIn) {
      next('/login');
      return;
    }
    // 部门管理页：仅 dept_admin / super_admin 可进
    if (to.meta.requiresAdmin && !['dept_admin', 'super_admin'].includes(auth.user?.role)) {
      next('/services');
      return;
    }
    next();
  });
}

export default router;