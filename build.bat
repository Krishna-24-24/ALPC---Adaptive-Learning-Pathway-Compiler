@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Building ALPC (Adaptive Learning Pathway Compiler)
echo ========================================

set "PATH=C:\Program Files\CodeBlocks\MinGW\bin;C:\Users\Krishna\AppData\Local\Microsoft\WinGet\Packages\WinFlexBison.win_flex_bison_Microsoft.Winget.Source_8wekyb3d8bbwe;%PATH%"

if not exist obj mkdir obj
if not exist obj\tmp mkdir obj\tmp

echo [1/4] Running Bison on src\parser.y...
win_bison -d -o obj\parser.tab.c src\parser.y
if %errorlevel% neq 0 (
  echo Bison failed!
  exit /b 1
)

echo [2/4] Running Flex on src\scanner.l...
win_flex -o obj\lex.yy.c src\scanner.l
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
