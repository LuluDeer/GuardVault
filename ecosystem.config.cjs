// PM2 进程配置
// 使用：pm2 start ecosystem.config.cjs
//       pm2 stop ecosystem.config.cjs
//       pm2 reload ecosystem.config.cjs
//       pm2 logs guardvault-server
module.exports = {
  apps: [
    {
      name: 'guardvault-server',
      script: 'src/app.js',
      cwd: __dirname + '/server',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '../logs/server-error.log',
      out_file: '../logs/server-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
