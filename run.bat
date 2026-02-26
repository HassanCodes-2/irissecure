@echo off
setlocal EnableDelayedExpansion
title Iris Secure System Launcher

echo ======================================
echo   Starting Iris Secure System
echo ======================================
echo.

:: --------------------------------------------------
:: 1. Check Python installation
:: --------------------------------------------------
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Install Python 3.11.x from https://www.python.org/downloads/
    pause
    exit /b
)

:: --------------------------------------------------
:: 2. Get Python version
:: --------------------------------------------------
for /f "tokens=2 delims= " %%I in ('python --version 2^>^&1') do (
    set PYTHON_VER=%%I
)

echo Found Python version: !PYTHON_VER!

:: --------------------------------------------------
:: 3. Enforce Python 3.11.x safely
:: --------------------------------------------------
if not "!PYTHON_VER:~0,4!"=="3.11" (
    echo.
    echo [ERROR] This application requires Python 3.11.x
    echo Detected version: !PYTHON_VER!
    echo.
    pause
    exit /b
)

:: --------------------------------------------------
:: 4. Create virtual environment if missing
:: --------------------------------------------------
if not exist "venv" (
    echo.
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b
    )
)

:: --------------------------------------------------
:: 5. Activate virtual environment (CMD-safe)
:: --------------------------------------------------
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

:: --------------------------------------------------
:: 6. Upgrade pip
:: --------------------------------------------------
echo.
echo Upgrading pip...
python -m pip install --upgrade pip

:: --------------------------------------------------
:: 7. Install dependencies
:: --------------------------------------------------
echo.
echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

:: --------------------------------------------------
:: 8. Run the application
:: --------------------------------------------------
echo.
echo Launching application...
echo --------------------------------------
python app.py

echo.
echo Application exited.
pause
