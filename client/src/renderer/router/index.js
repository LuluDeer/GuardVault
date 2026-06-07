import { createRouter, createMemoryHistory } from 'vue-router';

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
  },
  {
    path: '/service/:id',
    name: 'ServiceDetail',
    component: () => import('../views/ServiceDetail.vue'),
  },
  {
    path: '/password',
    name: 'Password',
    component: () => import('../views/Password.vue'),
  },
  {
    path: '/',
    redirect: '/services',
  },
];

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

export default router;