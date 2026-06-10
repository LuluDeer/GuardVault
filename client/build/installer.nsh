# 安装前自动关闭正在运行的 GuardVault 进程
!macro customInstall
  DetailPrint "正在检查并关闭 GuardVault..."
  nsExec::ExecToLog 'taskkill /F /IM "GuardVault.exe" /T'
  Sleep 1000
!macroend

!macro customUnInstall
!macroend
