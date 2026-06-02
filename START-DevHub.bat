@echo off
title LitXusDevHub Server
cd /d "C:\LitXus Systems\LitXusDevHub"

echo.
echo  =================================
echo    LitXusDevHub Starting...
echo  =================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found!
    echo  Please install from https://nodejs.org
    pause
    exit /b
)

echo  Starting server at http://localhost:5000
echo  Press Ctrl+C to stop
echo.

:: Kill anything already on port 5000
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :5000 2^>nul') DO (
    taskkill /PID %%P /F >nul 2>&1
)

:: Start server, wait for it to be ready, then open browser
start /B node server.js
ti