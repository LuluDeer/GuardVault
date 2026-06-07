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