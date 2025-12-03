@echo off
REM Runs frontend development server (Windows)

REM Get the directory of this script
SET DIR=%~dp0

REM Check if frontend directory exists
IF NOT EXIST "%DIR%frontend" (
    echo ❌ Error: frontend directory not found at %DIR%frontend
    exit /b 1
)

REM Navigate to frontend
cd "%DIR%frontend"

REM Check if node_modules exists
IF NOT EXIST "node_modules" (
    echo ❌ Error: node_modules not found. Installing dependencies...
    call npm install
)

REM Check if .env.local exists
IF NOT EXIST ".env.local" (
    echo ⚠️  Warning: .env.local not found. Creating from template...
    IF EXIST ".env.example" (
        copy .env.example .env.local
        echo ✅ Created .env.local from .env.example
    ) ELSE (
        echo NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 > .env.local
        echo ✅ Created default .env.local
    )
)

REM Run dev server
echo 🚀 Starting frontend server...
call npm run dev
