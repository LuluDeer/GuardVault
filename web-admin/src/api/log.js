import request from './request'

export function getLogList(params) {
  return request.get('/admin/log/list', { params })
}
