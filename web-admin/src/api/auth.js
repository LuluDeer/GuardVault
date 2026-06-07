import request from './request'

export function adminLogin(data) {
  return request.post('/admin/login', data)
}

export function adminLogout() {
  return request.post('/admin/logout')
}

// 兼容旧名
export const logout = adminLogout

// 管理员修改自己的密码
export function changeAdminPassword(oldPassword, newPassword) {
  return request.put('/admin/password', { oldPassword, newPassword })
}
