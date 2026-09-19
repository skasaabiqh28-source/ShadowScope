#!/usr/bin/env bash
# ============================================================
# ShadowScopeAI — Render Build Script
# ============================================================
# Render runs this during deploy. It installs Python deps,
# builds the React frontend, and prepares the app for serving.
# ============================================================

set -o errexit  # Exit on any error

echo "=== [1/3] Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== [2/3] Building React frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== [3/3] Build complete ==="
echo "Frontend built to frontend/dist/"
echo "Ready to start with: uvicorn backend.main:app"
