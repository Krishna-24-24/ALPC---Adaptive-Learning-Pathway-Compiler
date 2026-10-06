@echo off
setlocal

echo ========================================
echo  ALPC Compiler Demonstration Walkthrough
echo  Program: examples\pathway.edu
echo ========================================

set "LLI=C:\Program Files\CodeBlocks\MinGW\bin\lli.exe"

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
