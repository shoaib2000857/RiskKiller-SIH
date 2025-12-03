@echo off
REM Auto-activates venv and runs backend server (Windows)

REM Get the directory of this script
SET DIR=%~dp0

REM Check if virtual environment exists
IF NOT EXIST "%DIR%.venv" (
    echo ❌ Error: Virtual environment not found at %DIR%.venv
    echo Please run: python3.11 -m venv .venv
    exit /b 1
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call "%DIR%.venv\Scripts\activate.bat"

REM Check if uvicorn is installed
where uvicorn >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: uvicorn not found. Installing dependencies...
    python -m pip install -r "%DIR%requirements.txt"
)

REM Run uvicorn
echo 🚀 Starting backend server...
uvicorn app.main:app --reload
