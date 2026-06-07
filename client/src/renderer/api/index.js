import { ref, onMounted } from 'vue';

export async function request(config) {
  return await window.electronAPI.request(config);
}

export async function login(username, password) {
  return await request({
    method: 'POST',
    url: '/api/user/login',
    data: { username, password }
  });
}

export async function getTotpCode() {
  return await request({
    method: 'GET',
    url: '/api/user/totp/code'
  });
}

export async function changePassword(oldPassword, newPassword) {
  return await request({
    method: 'POST',
    url: '/api/user/password',
    data: { oldPassword, newPassword }
  });
}