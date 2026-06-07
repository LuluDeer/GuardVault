import request, { axios } from './request'

// 列表（支持条件+分页）
export function getLogList(params) {
  return request.get('/admin/log/list', { params })
}

// 直接通过 axios 原生调用，返回 blob（不经过业务码包装）
export function exportLogs(params) {
  const token = localStorage.getItem('admin_token');
  return axios.get('/api/admin/log/export', {
    params,
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(res => res.data);
}
