@echo off
title Linear Audit - WhatsApp Engine
echo ========================================================
echo   Starting Linear Audit WhatsApp Automation Engine
echo   Port: 8080 (REST API + Whatsmeow Protocol)
echo ========================================================

if not exist dbdata mkdir dbdata

if exist linear-whatsapp.exe (
    echo [OK] Launching linear-whatsapp.exe...
    linear-whatsapp.exe
) else (
    echo [INFO] Compiling linear-whatsapp binary...
    go build -o linear-whatsapp.exe ./oxis_backend/server.go
    linear-whatsapp.exe
)

pause

