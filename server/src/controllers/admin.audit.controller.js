import * as auditService from '../services/audit.service.js';
import { success } from '../utils/response.js';

export async function getSummary(request, reply) {
  const { days = 30 } = request.query;
  const result = await auditService.getSummary({ days: Number(days) });
  return success(reply, result);
}

export async function getServiceViewStats(request, reply) {
  const { startDate, endDate, deptId } = request.query;
  const result = await auditService.getServiceViewStats({ startDate, endDate, deptId });
  return success(reply, result);
}

export async function getUserViewStats(request, reply) {
  const { startDate, endDate } = request.query;
  const result = await auditService.getUserViewStats({ startDate, endDate });
  return success(reply, result);
}

export async function getActionStats(request, reply) {
  const { startDate, endDate } = request.query;
  const result = await auditService.getActionStats({ startDate, endDate });
  return success(reply, result);
}

export async function getDailyStats(request, reply) {
  const { days = 7 } = request.query;
  const result = await auditService.getDailyStats({ days: Number(days) });
  return success(reply, result);
}