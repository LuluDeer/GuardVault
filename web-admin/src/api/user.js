import request from './request'

export function getUserList(params) {
  return request.get('/admin/user/list', { params })
}

export function createUser(data) {
  return request.post('/admin/user/create', data)
}

export function updateUser(id, data) {
  return request.put(`/admin/user/${id}`, data)
}

export function deleteUser(id) {
  return request.delete(`/admin/user/${id}`)
}
