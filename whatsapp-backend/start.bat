@echo off
title OXIS WhatsApp Automation Engine
echo ========================================================
echo   Starting OXIS WhatsApp Automation Service
echo ========================================================

if not exist dbdata mkdir dbdata

if exist oxis-custom-server.exe (
    echo [OK] Launching oxis-custom-server.exe...
    oxis-custom-server.exe
) else (
    echo [INFO] Building custom server...
    go build -o oxis-custom-server.exe ./oxis_backend/server.go
    oxis-custom-server.exe
)

pause
