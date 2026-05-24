@echo off
setlocal
cd /d "%~dp0"

set SRC=%~dp0
set DST=%~dp0docker

echo Building React frontend...
call npm run build
if errorlevel 1 (
  echo Build failed. Aborting.
  exit /b 1
)

echo.
echo Syncing app files to docker\...

for %%F in (
  server.js
  config.js
  package.json
  package-lock.json
) do (
  copy /Y "%SRC%%%F" "%DST%\%%F" >nul
  echo   copied %%F
)

echo.
echo Syncing dist\...
if exist "%DST%\dist" rd /s /q "%DST%\dist"
xcopy /E /I /Q "%SRC%dist" "%DST%\dist" >nul
echo   copied dist\

echo.
echo Done. Run "cd docker ^&^& docker compose up --build -d" to deploy.
endlocal
