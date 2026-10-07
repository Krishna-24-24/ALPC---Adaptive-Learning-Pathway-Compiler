@echo off
setlocal

echo ========================================
echo  ALPC Compiler Demonstration Walkthrough
echo  Program: examples\pathway.edu
echo ========================================

rem lli: LLI_BIN if set, else MSYS2's, else whatever is on PATH.
if not defined MSYS2_ROOT set "MSYS2_ROOT=C:\msys64"
if exist "%MSYS2_ROOT%\mingw64\bin\lli.exe" set "PATH=%MSYS2_ROOT%\mingw64\bin;%PATH%"
if defined LLI_BIN (set "LLI=%LLI_BIN%") else (set "LLI=lli")

echo.
echo [1] Path-Lang Source:
echo ----------------------------------------
type examples\pathway.edu

echo.
echo [2] Lexer Token Stream (Flex):
echo ----------------------------------------
alpc.exe --dump-tokens examples\pathway.edu

echo.
echo [3] AST Hierarchy (LLVM-style RTTI):
echo ----------------------------------------
alpc.exe --dump-ast examples\pathway.edu

echo.
echo [4] Generated LLVM IR:
echo ----------------------------------------
alpc.exe --emit-ir examples\pathway.edu > obj\demo.ll
type obj\demo.ll

echo.
echo [5] LLVM JIT Execution (lli.exe):
echo ----------------------------------------
"%LLI%" obj\demo.ll
echo.
echo Expected output from examples\pathway.expected:
type examples\pathway.expected

echo ========================================
echo  Demonstration Complete!
echo ========================================
