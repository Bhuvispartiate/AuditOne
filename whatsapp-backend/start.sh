#!/bin/bash
# OXIS WhatsApp Automation - Linux / VPS Starter Script

echo "========================================================"
echo "  Starting OXIS WhatsApp Automation Service (Linux/VPS)"
echo "========================================================"

mkdir -p dbdata logs

if [ -f "./oxis-server" ]; then
    echo "[OK] Running oxis-server binary..."
    ./oxis-server
else
    echo "[INFO] Compiling oxis-server from oxis_backend/server.go..."
    CGO_ENABLED=0 go build -ldflags "-s -w" -o oxis-server ./oxis_backend/server.go
    ./oxis-server
fi
