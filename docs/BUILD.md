# GuardVault 打包与发布指南

本文档详细介绍如何打包和发布 GuardVault 的各个组件，包括 PC 客户端、Web 管理后台和服务端。

## 目录

- [打包概述](#打包概述)
- [环境准备](#环境准备)
- [PC 客户端打包](#pc-客户端打包)
- [Web 管理后台打包](#web-管理后台打包)
- [服务端打包](#服务端打包)
- [发布流程](#发布流程)
- [签名与公证](#签名与公证)
- [版本管理](#版本管理)

## 打包概述

GuardVault 包含三个主要组件，每个组件的打包方式不同：

| 组件 | 打包工具 | 输出格式 | 平台 |
|------|---------|---------|------|
| PC 客户端 | electron-builder | .exe, .dmg, .AppImage | Windows, macOS, Linux |
| Web 管理后台 | Vite | 静态文件 | 所有平台 |
| 服务端 | 无需打包 | Node.js 应用 | 所有平台 |

## 环境准备

### 1. 通用要求

- Node.js ≥ 18.0
- npm ≥ 9.0
- Git ≥ 2.0

### 2. 平台特定要求

#### Windows

- **Windows 10 或更高版本**
- **Visual Studio Build Tools**（用于编译原生模块）
- **WiX Toolset**（用于生成 MSI 安装包，可选）

安装 Visual Studio Build Tools:
```powershell
# 下载并安装 Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022

# 或使用 chocolatey
choco install visualstudio2022buildtools
```

#### macOS

- **macOS 10.15 (Catalina) 或更高版本**
- **Xcode Command Line Tools**

安装 Xcode Command Line Tools:
```bash
xcode-select --install
```

#### Linux

- **Ubuntu 18.04+ / Debian 10+ / CentOS 8+**
- **构建工具链**

Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y build-essential libnss3-dev
```

CentOS/RHEL:
```bash
sudo yum groupinstall -y "Development Tools"
sudo yum install -y nss-devel
```

### 3. 安装项目依赖

```bash
# 克隆项目
git clone <repository-url>
cd GuardVault

# 安装所有依赖
cd server && npm install && cd ..
cd client && npm install && cd ..
cd web-admin && npm install && cd ..
```

## PC 客户端打包

### 1. 配置 electron-builder

编辑 `client/electron-builder.yml`:

```yaml
appId: com.example.guardvault
productName: GuardVault
directories:
  output: release
  buildResources: build

files:
  - "src/**/*"
  - "dist/**/*"
  - "index.html"
  - "package.json"

extraResources:
  - from: "build/icon.ico"
    to: "icon.ico"

# Windows 配置
win:
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64
  icon: build/icon.ico
  requestedExecutionLevel: asInvoker

# NSIS 安装程序配置
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
  deleteAppDataOnUninstall: false
  uninstallDisplayName: GuardVault
  include: build/installer.nsh

# macOS 配置
mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
  icon: build/icon.icns
  category: public.app-category.productivity
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

# Linux 配置
linux:
  target:
    - target: AppImage
      arch:
        - x64
    - target: deb
      arch:
        - x64
    - target: rpm
      arch:
        - x64
  icon: build/icons
  category: Utility
  synopsis: "企业级 2FA 集中管理系统客户端"

# 发布配置
publish:
  provider: github
  owner: your-username
  repo: guardvault
```

### 2. 准备图标和资源

#### Windows 图标

1. 准备 256x256 的 PNG 图标
2. 转换为 ICO 格式：
   ```bash
   cd client
   npm run gen-ico
   ```
3. 保存到 `client/build/icon.ico`

#### macOS 图标

1. 准备 1024x1024 的 PNG 图标
2. 使用 iconutil 生成 ICNS：
   ```bash
   mkdir -p build.iconset
   sips -z 16 16     icon.png --out build.iconset/icon_16x16.png
   sips -z 32 32     icon.png --out build.iconset/icon_16x16@2x.png
   sips -z 32 32     icon.png --out build.iconset/icon_32x32.png
   sips -z 64 64     icon.png --out build.iconset/icon_32x32@2x.png
   sips -z 128 128   icon.png --out build.iconset/icon_128x128.png
   sips -z 256 256   icon.png --out build.iconset/icon_128x128@2x.png
   sips -z 256 256   icon.png --out build.iconset/icon_256x256.png
   sips -z 512 512   icon.png --out build.iconset/icon_256x256@2x.png
   sips -z 512 512   icon.png --out build.iconset/icon_512x512.png
   sips -z 1024 1024 icon.png --out build.iconset/icon_512x512@2x.png
   iconutil -c icns build.iconset -o build/icon.icns
   ```

#### Linux 图标

1. 准备多种尺寸的 PNG 图标：
   ```bash
   mkdir -p build/icons
   # 准备 16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512 的图标
   ```

### 3. 构建渲染进程

```bash
cd client
npm run build
```

这会将 Vue 应用打包到 `client/dist` 目录。

### 4. 打包客户端

#### 打包所有平台

```bash
cd client
npm run build
```

这会根据 `electron-builder.yml` 的配置打包所有目标平台。

#### 仅打包 Windows

```bash
cd client
npm run build:win
```

#### 仅打包 macOS

```bash
cd client
npm run build:mac
```

#### 仅打包 Linux

```bash
cd client
npm run build:linux
```

### 5. 输出文件

打包完成后，安装包会输出到 `client/release` 目录：

**Windows:**
- `GuardVault Setup x.x.x.exe` - NSIS 安装程序
- `GuardVault x.x.x.exe` - 便携版

**macOS:**
- `GuardVault-x.x.x.dmg` - DMG 镜像
- `GuardVault-x.x.x-mac.zip` - ZIP 压缩包

**Linux:**
- `GuardVault-x.x.x.AppImage` - AppImage 格式
- `guardvault_x.x.x_amd64.deb` - Debian 包
- `guardvault-x.x.x-1.x86_64.rpm` - RPM 包

### 6. 测试安装包

#### Windows

```powershell
# 测试安装程序
.\release\GuardVault\ Setup x.x.x.exe

# 测试便携版
.\release\GuardVault x.x.x.exe
```

#### macOS

```bash
# 测试 DMG
open release/GuardVault-x.x.x.dmg

# 拖拽到 Applications 文件夹
# 启动应用
open /Applications/GuardVault.app
```

#### Linux

```bash
# 测试 AppImage
chmod +x release/GuardVault-x.x.x.AppImage
./release/GuardVault-x.x.x.AppImage

# 测试 DEB
sudo dpkg -i release/guardvault_x.x.x_amd64.deb
guardvault

# 测试 RPM
sudo rpm -i release/guardvault-x.x.x-1.x86_64.rpm
guardvault
```

## Web 管理后台打包

### 1. 构建生产版本

```bash
cd web-admin
npm run build
```

这会将 Vue 应用打包到 `web-admin/dist` 目录。

### 2. 输出文件

构建完成后，静态文件会输出到 `web-admin/dist` 目录：

```
dist/
├── index.html
├── assets/
│   ├── index-xxx.js
│   ├── index-xxx.css
│   └── ...
└── favicon.svg
```

### 3. 部署静态文件

#### 方式一：直接部署

将 `dist` 目录的内容复制到 Web 服务器的根目录：

```bash
# 复制到 Nginx
sudo cp -r web-admin/dist/* /var/www/guardvault/

# 或复制到 Apache
sudo cp -r web-admin/dist/* /var/www/html/guardvault/
```

#### 方式二：使用 Nginx 反向代理

参考 [部署指南](DEPLOYMENT.md) 中的 Nginx 配置。

#### 方式三：使用 Docker

创建 `web-admin/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

构建镜像：
```bash
cd web-admin
docker build -t guardvault-web:latest .
```

### 4. 测试构建

```bash
cd web-admin
npm run preview
```

访问 `http://localhost:4173` 测试构建结果。

## 服务端打包

### 1. 服务端无需打包

服务端是 Node.js 应用，无需打包成二进制文件。直接部署源代码即可。

### 2. 生产环境准备

```bash
# 安装生产依赖
cd server
npm ci --omit=dev

# 生成 Prisma Client
npx prisma generate
```

### 3. 创建启动脚本

创建 `server/start.sh`:

```bash
#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=production
node src/app.js
```

创建 `server/start.bat`:

```batch
@echo off
cd /d %~dp0
set NODE_ENV=production
node src/app.js
```

### 4. 使用 PM2 管理

编辑 `ecosystem.config.cjs`:

```javascript
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
```

启动服务：
```bash
pm2 start ecosystem.config.cjs
```

## 发布流程

### 1. 版本号管理

使用语义化版本（Semantic Versioning）：

- **主版本号（MAJOR）**: 不兼容的 API 修改
- **次版本号（MINOR）**: 向下兼容的功能性新增
- **修订号（PATCH）**: 向下兼容的问题修正

示例：`1.2.3`

### 2. 更新版本号

#### 更新 package.json

```bash
# 更新所有 package.json
npm version patch  # 1.2.3 -> 1.2.4
npm version minor  # 1.2.3 -> 1.3.0
npm version major  # 1.2.3 -> 2.0.0
```

#### 手动更新

编辑各个 `package.json` 文件，更新 `version` 字段。

### 3. 创建 Git 标签

```bash
# 创建标签
git tag -a v1.2.3 -m "Release version 1.2.3"

# 推送标签
git push origin v1.2.3
```

### 4. 构建发布包

```bash
# 构建 PC 客户端
cd client
npm run build

# 构建 Web 管理后台
cd ../web-admin
npm run build

# 准备服务端
cd ../server
npm ci --omit=dev
```

### 5. 创建发布说明

创建 `CHANGELOG.md` 或在 GitHub Release 中填写：

```markdown
## [1.2.3] - 2024-01-01

### Added
- 新增批量导入功能
- 支持谷歌 OTP 迁移

### Changed
- 优化客户端性能
- 改进用户界面

### Fixed
- 修复验证码刷新问题
- 修复登录失败锁定问题

### Security
- 更新依赖版本
- 加强密码加密
```

### 6. 发布到 GitHub

#### 方式一：使用 GitHub CLI

```bash
# 安装 GitHub CLI
# https://cli.github.com/

# 创建 Release
gh release create v1.2.3 \
  --title "GuardVault v1.2.3" \
  --notes "Release notes here" \
  client/release/GuardVault-Setup-1.2.3.exe \
  client/release/GuardVault-1.2.3.dmg \
  client/release/GuardVault-1.2.3.AppImage
```

#### 方式二：手动上传

1. 访问 GitHub 仓库的 Releases 页面
2. 点击 "Draft a new release"
3. 填写版本号和发布说明
4. 上传构建的安装包
5. 点击 "Publish release"

### 7. 发布到 npm（可选）

如果需要将某些包发布到 npm：

```bash
# 登录 npm
npm login

# 发布包
cd server
npm publish

cd ../client
npm publish

cd ../web-admin
npm publish
```

## 签名与公证

### Windows 代码签名

#### 1. 获取代码签名证书

从受信任的证书颁发机构（CA）购买代码签名证书：
- DigiCert
- Sectigo
- GlobalSign

#### 2. 安装证书

```powershell
# 导入 PFX 证书
certutil -importpfx certificate.pfx

# 验证证书
certutil -store MY
```

#### 3. 配置 electron-builder

编辑 `client/electron-builder.yml`:

```yaml
win:
  certificateFile: path/to/certificate.pfx
  certificatePassword: your_password
  signingHashAlgorithms:
    - sha256
```

#### 4. 签名安装包

```bash
cd client
npm run build:win
```

electron-builder 会自动使用证书签名安装包。

### macOS 代码签名

#### 1. 获取开发者证书

1. 加入 Apple Developer Program
2. 在 Xcode 中创建开发者证书：
   - "Developer ID Application"
   - "Developer ID Installer"

#### 2. 配置 electron-builder

编辑 `client/electron-builder.yml`:

```yaml
mac:
  identity: "Developer ID Application: Your Name (TEAM_ID)"
  provisioningProfile: build/embedded.provisionprofile
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
```

#### 3. 创建 entitlements 文件

创建 `client/build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
  </dict>
</plist>
```

#### 4. 签名应用

```bash
cd client
npm run build:mac
```

#### 5. 公证应用（macOS 10.15+）

```bash
# 上传到 Apple 公证服务
xcrun notarytool submit release/GuardVault-1.2.3.dmg \
  --apple-id "your-apple-id" \
  --password "app-specific-password" \
  --team-id "YOUR_TEAM_ID" \
  --wait

# 装订公证票据
xcrun stapler staple release/GuardVault-1.2.3.dmg
```

### Linux 签名

Linux 通常不需要代码签名，但可以创建 GPG 签名：

```bash
# 创建签名
gpg --detach-sign --armor release/GuardVault-1.2.3.AppImage

# 验证签名
gpg --verify release/GuardVault-1.2.3.AppImage.asc
```

## 版本管理

### 1. Git 工作流

#### 主分支

- `main`: 稳定版本，用于生产环境
- `develop`: 开发版本，用于集成新功能

#### 功能分支

```bash
# 创建功能分支
git checkout develop
git checkout -b feat/new-feature

# 开发完成后合并
git checkout develop
git merge feat/new-feature
```

#### 发布分支

```bash
# 创建发布分支
git checkout develop
git checkout -b release/v1.2.3

# 测试和修复
# ...

# 合并到 main 和 develop
git checkout main
git merge release/v1.2.3
git tag -a v1.2.3 -m "Release version 1.2.3"

git checkout develop
git merge release/v1.2.3
```

### 2. 变更日志

维护 `CHANGELOG.md` 文件，记录每个版本的变更：

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 新功能 A
- 新功能 B

### Changed
- 修改 C

### Deprecated
- 即将废弃的功能 D

### Removed
- 移除的功能 E

### Fixed
- 修复的问题 F

### Security
- 安全修复 G

## [1.2.3] - 2024-01-01

### Added
- 新增批量导入功能
- 支持谷歌 OTP 迁移

### Changed
- 优化客户端性能
- 改进用户界面

### Fixed
- 修复验证码刷新问题
- 修复登录失败锁定问题

### Security
- 更新依赖版本
- 加强密码加密

## [1.2.2] - 2023-12-15

### Fixed
- 修复客户端崩溃问题
```

### 3. 自动化发布

创建 `scripts/release.sh`:

```bash
#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Releasing version $VERSION..."

# 更新版本号
npm version $VERSION

# 构建客户端
echo "Building client..."
cd client
npm run build
cd ..

# 构建 Web 后台
echo "Building web-admin..."
cd web-admin
npm run build
cd ..

# 提交更改
echo "Committing changes..."
git add .
git commit -m "chore(release): $VERSION"

# 创建标签
echo "Creating tag..."
git tag -a v$VERSION -m "Release version $VERSION"

# 推送到远程
echo "Pushing to remote..."
git push origin main
git push origin v$VERSION

echo "Release $VERSION completed!"
```

使用脚本：
```bash
chmod +x scripts/release.sh
./scripts/release.sh 1.2.3
```

## 常见问题

### 1. 打包失败

**问题**: electron-builder 打包失败

**解决方案**:
```bash
# 清除缓存
rm -rf node_modules
npm install

# 检查 electron-builder 配置
# 确保所有路径正确

# 查看详细错误日志
DEBUG=electron-builder:* npm run build
```

### 2. 图标不显示

**问题**: 打包后图标不显示

**解决方案**:
- 确保图标文件路径正确
- 检查图标格式和尺寸
- Windows 使用 .ico 格式
- macOS 使用 .icns 格式
- Linux 使用 .png 格式

### 3. 签名失败

**问题**: 代码签名失败

**解决方案**:
- 检查证书是否有效
- 确认证书密码正确
- Windows: 检查证书存储位置
- macOS: 检查开发者身份配置

### 4. 公证失败

**问题**: macOS 公证失败

**解决方案**:
```bash
# 检查 Apple ID 和密码
# 确保使用应用专用密码
# 检查 Team ID 是否正确

# 查看公证状态
xcrun notarytool history \
  --apple-id "your-apple-id" \
  --password "app-specific-password" \
  --team-id "YOUR_TEAM_ID"
```

### 5. 依赖冲突

**问题**: 打包时依赖冲突

**解决方案**:
```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

## 下一步

- 阅读 [部署指南](DEPLOYMENT.md) 了解如何部署到生产环境
- 阅读 [开发指南](DEVELOPMENT.md) 了解如何进行开发
- 阅读 [故障排查指南](TROUBLESHOOTING.md) 解决常见问题