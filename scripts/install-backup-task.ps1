param([string]$At='09:00')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$nodeExecutable=(Get-Command node.exe).Source
$runner=Join-Path $projectRoot 'backend\scripts\backup-scheduled.mjs'
$action=New-ScheduledTaskAction -Execute $nodeExecutable -Argument ('"'+$runner+'"') -WorkingDirectory $projectRoot
$trigger=New-ScheduledTaskTrigger -Daily -At $At
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'ProyectoChatbot-VerifiedBackup' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Respaldo cifrado con prueba de restauración local. Requiere equipo encendido y sesión iniciada; no acredita copia externa.' -Force | Select-Object TaskName,State
