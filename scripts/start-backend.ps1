# PowerShell script to start the FastAPI backend server
Write-Host "Starting AI Security Testing Platform Backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan

$PythonExe = "C:\Users\saabi\AppData\Local\Programs\Python\Python313\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = (Get-Command python).Source
}

& $PythonExe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
