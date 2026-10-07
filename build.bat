@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Building ALPC (Adaptive Learning Pathway Compiler)
echo ========================================

rem Toolchain: MSYS2 (C:\msys64) if installed, else whatever is already on PATH
rem (e.g. CodeBlocks MinGW + WinFlexBison). Override the root with MSYS2_ROOT.
if not defined MSYS2_ROOT set "MSYS2_ROOT=C:\msys64"
if exist "%MSYS2_ROOT%\mingw64\bin\g++.exe" set "PATH=%MSYS2_ROOT%\mingw64\bin;%MSYS2_ROOT%\usr\bin;%PATH%"

rem Prefer WinFlexBison names, fall back to plain flex/bison (MSYS2).
set "BISON=bison"
where /q win_bison && set "BISON=win_bison"
set "FLEX=flex"
where /q win_flex && set "FLEX=win_flex"

where /q g++ || (
  echo g++ not found. Install MSYS2 and run: pacman -S mingw-w64-x86_64-gcc flex bison
  exit /b 1
)
where /q %BISON% || (
  echo bison not found. Install it: pacman -S bison  ^(MSYS2^)  or  winget install WinFlexBison.win_flex_bison
  exit /b 1
)
where /q %FLEX% || (
  echo flex not found. Install it: pacman -S flex  ^(MSYS2^)  or  winget install WinFlexBison.win_flex_bison
  exit /b 1
)

if not exist obj mkdir obj
if not exist obj\tmp mkdir obj\tmp

echo [1/4] Running Bison on src\parser.y...
%BISON% -d -o obj\parser.tab.c src\parser.y
if %errorlevel% neq 0 (
  echo Bison failed!
  exit /b 1
)

echo [2/4] Running Flex on src\scanner.l...
%FLEX% -o obj\lex.yy.c src\scanner.l
if %errorlevel% neq 0 (
  echo Flex failed!
  exit /b 1
)

echo [3/4] Compiling C++ object files...
g++ -std=c++17 -Wall -Wextra -g -O1 -Isrc -Iobj -c -o obj\diagnostics.o src\diagnostics.cpp
g++ -std=c++17 -Wall -Wextra -g -O1 -Isrc -Iobj -c -o obj\tokens.o src\tokens.cpp
g++ -std=c++17 -Wall -Wextra -g -O1 -Isrc -Iobj -c -o obj\semantics.o src\semantics.cpp
g++ -std=c++17 -Wall -Wextra -g -O1 -Isrc -Iobj -c -o obj\ast.o src\ast.cpp
g++ -std=c++17 -Wall -Wextra -g -O1 -Isrc -Iobj -c -o obj\codegen.o src\codegen.cpp
g++ -std=c++17 -Wall -Wextra -g -O1 -Isrc -Iobj -c -o obj\main.o src\main.cpp
g++ -std=c++17 -g -O1 -Isrc -Iobj -c -o obj\parser.tab.o obj\parser.tab.c
g++ -std=c++17 -g -O1 -Isrc -Iobj -c -o obj\lex.yy.o obj\lex.yy.c

echo [4/4] Linking static alpc.exe...
g++ -static -static-libgcc -static-libstdc++ -o alpc.exe obj\main.o obj\diagnostics.o obj\tokens.o obj\semantics.o obj\ast.o obj\codegen.o obj\parser.tab.o obj\lex.yy.o
if %errorlevel% neq 0 (
  echo Linking failed!
  exit /b 1
)

echo.
echo ========================================
echo  Build successful! alpc.exe is ready.
echo ========================================
alpc.exe --help
