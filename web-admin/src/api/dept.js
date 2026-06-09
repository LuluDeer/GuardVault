import request from './request'

export function getDeptList(params) {
  return request.get('/admin/dept/list', { params })
}

export function getAllDepts() {
  return request.get('/admin/dept/all')
}

export function getDept(id) {
  return request.get(`/admin/dept/${id}`)
}

export function createDept(data) {
  return request.post('/admin/dept/create', data)
}

export function updateDept(id, data) {
  return request.put(`/admin/dept/${id}`, data)
}

export function deleteDept(id) {
  return request.delete(`/admin/dept/${id}`)
}

// ============ 部门成员 / 管理员 ============
export function listDeptMembers(id, params) {
  return request.get(`/admin/dept/${id}/members`, { params })
}

export function addDeptMembers(id, data) {
  return request.post(`/admin/dept/${id}/members`, data)
}

export function removeDeptMember(id, userId) {
  return request.delete(`/admin/dept/${id}/members/${userId}`)
}

export function appointDeptAdmin(id, data) {
  return request.post(`/admin/dept/${id}/admins`, data)
}

export function revokeDeptAdmin(id, userId) {
  return request.delete(`/admin/dept/${id}/admins/${userId}`)
}