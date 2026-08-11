@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================
echo  La suerte de Valentina - Commit y Push
echo ============================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git no esta instalado o no esta en el PATH.
  pause
  exit /b 1
)

if not exist ".git" (
  echo Inicializando repositorio...
  git init
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo Configurando remote origin...
  git remote add origin https://github.com/sistemasjrv17/Ruleta---La-suerte-de-Valentina.git
) else (
  git remote set-url origin https://github.com/sistemasjrv17/Ruleta---La-suerte-de-Valentina.git
)

echo.
echo Remoto:
git remote -v
echo.

git checkout -B main

echo.
echo Agregando archivos (respeta .gitignore, NO sube .env)...
git add -A

git status
echo.

set /p MSG=Mensaje del commit (Enter = actualizar proyecto): 
if "%MSG%"=="" set "MSG=actualizar proyecto"

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%MSG%"
  if errorlevel 1 (
    echo ERROR: No se pudo crear el commit.
    pause
    exit /b 1
  )
) else (
  echo No hay cambios nuevos para commit.
)

echo.
echo Subiendo a GitHub (main)...
git push -u origin main
if errorlevel 1 (
  echo.
  echo ERROR al hacer push. Revisa tu sesion de GitHub ^(`gh auth login` o credenciales^).
  pause
  exit /b 1
)

echo.
echo Listo. Repo: https://github.com/sistemasjrv17/Ruleta---La-suerte-de-Valentina
echo.
pause
endlocal
