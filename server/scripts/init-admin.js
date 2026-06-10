#!/usr/bin/env node
import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';

async function initAdmin() {
  try {
    // 检查是否已有管理员
    const adminCount = await prisma.systemUser.count({ 
      where: { role: { in: ['super_admin', 'admin', 'dept_admin'] } } 
    });
    
    if (adminCount > 0) {
      console.log('✓ 系统已有管理员账号，跳过初始化');
      const admins = await prisma.systemUser.findMany({
        where: { role: { in: ['super_admin', 'admin', 'dept_admin'] } },
        select: { id: true, username: true, role: true }
      });
      console.log('现有管理员:', JSON.stringify(admins, null, 2));
      process.exit(0);
    }

    // 创建默认管理员
    const defaultUsername = 'admin';
    const defaultPassword = 'Admin@123';
    const hash = await bcrypt.hash(defaultPassword, 12);

    const admin = await prisma.systemUser.create({
      data: {
        username: defaultUsername,
        password: hash,
        role: 'super_admin',
        status: 1,
        deptId: null
      },
      select: { id: true, username: true, role: true }
    });

    console.log('✓ 已创建默认管理员账号:');
    console.log('  用户名:', defaultUsername);
    console.log('  密码:', defaultPassword);
    console.log('  角色:', admin.role);
    
    // 初始化默认配置
    await initDefaultConfig();
    
    console.log('✓ 已初始化系统配置');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ 初始化失败:', error.message);
    process.exit(1);
  }
}

async function initDefaultConfig() {
  const configs = [
    { configKey: 'login_fail_max', configValue: '5' },
    { configKey: 'login_lock_minutes', configValue: '10' },
    { configKey: 'totp_drift_tolerance', configValue: '3' },
    { configKey: 'token_expire_hours', configValue: '2' },
    { configKey: 'refresh_token_expire_days', configValue: '7' },
    { configKey: 'ip_block_minutes', configValue: '30' },
    { configKey: 'log_retention_days', configValue: '90' },
  ];

  for (const config of configs) {
    const exists = await prisma.systemConfig.findUnique({
      where: { configKey: config.configKey }
    });
    if (!exists) {
      await prisma.systemConfig.create({ data: config });
    }
  }
}

initAdmin();
