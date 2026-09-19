# ============================================================
# ShadowScopeAI - Start Frontend Dev Server
# ============================================================
# Usage: .\scripts\start-frontend.ps1
# ============================================================

Write-Host ""
Write-Host "=== ShadowScopeAI Frontend ===" -ForegroundColor Cyan
Write-Host "Starting Vite dev server on http://localhost:5173" -ForegroundColor Green
Write-Host "API proxy -> http://127.0.0.1:8000" -ForegroundColor DarkGray
Write-Host ""

Set-Location "$PSScriptRoot\..\frontend"
npm.cmd run dev
