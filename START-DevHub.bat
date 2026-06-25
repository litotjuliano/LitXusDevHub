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

:: Kill all processes that may conflict
echo  Cleaning up existing processes...

:: Kill all node.exe processes (DevHub server, UAT watcher, any frontend)
taskkill /IM node.exe /F >nul 2>&1

:: Kill any dotnet processes (LitXusTravel API)
taskkill /IM dotnet.exe /F >nul 2>&1

:: Kill any process on specific ports just in case (belt + suspenders)
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":5000 " 2^>nul') DO taskkill /PID %%P /F >nul 2>&1
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":5085 " 2^>nul') DO taskkill /PID %%P /F >nul 2>&1
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":3000 " 2^>nul') DO taskkill /PID %%P /F >nul 2>&1
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":3001 " 2^>nul') DO taskkill /PID %%P /F >nul 2>&1
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":3002 " 2^>nul') DO taskkill /PID %%P /F >nul 2>&1

echo  All processes cleared.
timeout /t 1 /nobreak >nul

:: Start UAT auto-sync watcher in background
echo  Starting UAT Auto-Sync watcher...
start /B node uat-sync.js

:: Start server, wait for it to be ready, then open browser
start /B node server.js
timeout /t 2 /nobreak >nul
start "" http://localhost:5000

pause
