# 🎓 ALPC + LearnSmart AI — Unified Adaptive Learning Platform

> **A Compiler-Driven Adaptive Learning Platform Demonstrating Transparent, Formally Verified Educational Decision Making via Domain-Specific Language (Path-Lang) Compilation to LLVM IR.**

[![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015%20(React%2019)-blue?logo=nextdotjs&style=flat-square)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&style=flat-square)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styles-Tailwind%20CSS%20v4-38B2AC?logo=tailwind-css&style=flat-square)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Backend-Express.js-black?logo=express&style=flat-square)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&style=flat-square)](https://www.mongodb.com/)
[![FastAPI](https://img.shields.io/badge/ML%20Engine-FastAPI%20(Python)-009688?logo=fastapi&style=flat-square)](https://fastapi.tiangolo.com/)
[![C++17](https://img.shields.io/badge/Compiler-C%2B%2B17-00599C?logo=c%2B%2B&style=flat-square)](https://isocpp.org/)
[![Flex](https://img.shields.io/badge/Lexer-Flex%202.6.4-orange?style=flat-square)](https://github.com/westes/flex)
[![Bison](https://img.shields.io/badge/Parser-Bison%203.8.2-yellow?style=flat-square)](https://www.gnu.org/software/bison/)
[![LLVM](https://img.shields.io/badge/Codegen-LLVM%20IR%20(lli)-purple?logo=llvm&style=flat-square)](https://llvm.org/)

---

## 📌 Unified Project Layout (Single Root: `ALPC/`)

Everything is self-contained in this single project directory (`C:\Users\Krishna\Projects\ALPC`). All build commands, backend services, frontend services, and ML engines run directly from here.

```
ALPC/
├── backend/                  # Express.js REST API & ALPC Compiler Bridge
│   ├── src/routes/alpc.js    # Compiler playground & pathway generation endpoints
│   ├── src/services/alpcRunner.js # Executes alpc.exe & lli.exe
│   ├── src/models/           # Pathway & CompilerDecision models
│   └── .env                  # Port 5000, MongoDB, ALPC_BIN configuration
│
├── frontend/                 # Next.js 15 App Router Frontend (React 19, Tailwind v4)
│   ├── src/app/compiler/     # ALPC Compiler Playground (/compiler)
│   ├── src/app/pathway-builder/ # Adaptive Pathway Builder & Simulator (/pathway-builder)
│   ├── src/app/dashboard/    # Student Dashboard + Adaptive Engine Card (/dashboard)
│   └── src/app/quiz/results/ # Assessment Results + ALPC Decision Card
│
├── ml-service/               # FastAPI Python Psychometrics Engine (BKT & IRT 1PL)
│   ├── app/main.py           # Bayesian Knowledge Tracing & IRT API
│   └── venv/                 # Virtual environment (FastAPI, Uvicorn, Pydantic)
│
├── src/                      # Native C++ Compiler Engine
│   ├── scanner.l             # Flex 2.6.4 lexical analyzer
│   ├── parser.y              # Bison 3.8.2 LALR(1) grammar
│   ├── ast.h / ast.cpp       # AST hierarchy with LLVM-style RTTI (classof, isa, dyn_cast)
│   ├── codegen.h / codegen.cpp # LLVM IR code generator
│   └── main.cpp              # CLI driver (--dump-tokens, --emit-ir, --json, etc.)
│
├── tests/                    # Compiler golden fixtures (14 valid, 10 invalid)
├── examples/                 # Demonstration programs (pathway.edu)
├── alpc.exe                  # Compiled static native compiler binary
├── build.bat                 # 1-click Windows compiler build script
├── demo.bat                  # 1-click full pipeline demo script
├── package.json              # Root unified npm scripts (runs everything from ALPC)
└── Makefile                  # GNU Makefile for building the compiler
```

---

## 🚀 How to Run in Local (All from `ALPC`)

Open your terminals directly in **`C:\Users\Krishna\Projects\ALPC`**.

### 🟢 Terminal 1: Express Backend (Port 5000)

```powershell
cd C:\Users\Krishna\Projects\ALPC
npm run dev:backend
```
> Starts the Express backend on `http://localhost:5000`. Connects to MongoDB and shells out directly to `alpc.exe`.

---

### 🟢 Terminal 2: Python ML Engine (Port 8000)

```powershell
cd C:\Users\Krishna\Projects\ALPC
npm run dev:ml
```
> Starts the FastAPI psychometrics engine on `http://localhost:8000` with Bayesian Knowledge Tracing (BKT) and Item Response Theory (IRT).

---

### 🟢 Terminal 3: Next.js Frontend (Port 3000)

```powershell
cd C:\Users\Krishna\Projects\ALPC
npm run dev:frontend
```
> Starts the Next.js 15 web UI on `http://localhost:3000`.

---

## ⚡ Useful One-Click CLI Commands (Run from `ALPC`)

All commands run directly in `C:\Users\Krishna\Projects\ALPC`:

| Command | Action |
|---|---|
| `npm test` | Runs the PRD Section 33 integration suite (14 tests; the 6 end-to-end ones run the real `alpc.exe` + `lli`, so rebuild the compiler first). |
| `npm run seed` | Seeds the MongoDB database with initial DSA skills and questions. |
| `npm run demo:compiler` | Runs the full 5-stage compiler pipeline demo on `examples/pathway.edu`. |
| `npm run build:compiler` | Recompiles `alpc.exe` using Flex, Bison, and g++ (takes ~3s). |
| `npm run build:frontend` | Runs a production Next.js build with Turbopack. |

---

## 🌐 Navigating the Web Application

With the services running, open **`http://localhost:3000`** in your browser:

1. **[Compiler Playground](http://localhost:3000/compiler)** (`/compiler`):
   - Live Path-Lang code editor.
   - Inspect the real **Flex tokens**, **Bison parse trace**, **AST tree (RTTI)**, **LLVM IR**, and **JIT execution output**.
   - Preset examples for 4-tier adaptive logic, `; b` binary output, and Backward Design violation checks.

2. **[Adaptive Pathway Builder](http://localhost:3000/pathway-builder)** (`/pathway-builder`):
   - Visual rule builder for educators.
   - Live Path-Lang code preview (enforcing Backward Design).
   - **Student Simulation Mode**: Drag performance sliders &rarr; click **Run Adaptive Pathway** &rarr; watch the real compiler pipeline execute in real time.

3. **[Student Dashboard](http://localhost:3000/dashboard)** (`/dashboard`):
   - View skill proficiency, recent quiz performance, and the embedded **Adaptive Learning Engine** compiler decision card.

4. **[Adaptive Assessment](http://localhost:3000/quiz/adaptive)** (`/quiz/adaptive`):
   - Practice assessment with questions matched to mastery.
   - On completion, results automatically trigger ALPC to compile a personalized multi-step study plan.

---

## 🧪 Verification & Acceptance Tests

Run the integration test suite:

```powershell
cd C:\Users\Krishna\Projects\ALPC
npm test
```

**Results:**
```
========================================
 ALPC + LearnSmart Integration Tests
========================================

  ✓ Test 1: Student score 40 maps to REMEDIAL outcome
  ✓ Test 2: Student score 65 maps to PRACTICE/CORE outcome
  ✓ Test 3: Student score 90 maps to ADVANCED outcome
  ✓ Test 4: Rule referencing undeclared outcome detected
  ✓ Test 5: Backward Design — OUTCOME declared before SET & IF
  ✓ Test 6: Token parsing handles keywords, identifiers, and literals
  ✓ Test 7: AST parser constructs hierarchical tree from dump-ast
  ✓ Test 8: Binary output (; b) parsing
  ✓ Run output: decimal score made of 0s and 1s is not read as binary
  ✓ E2E: default pathway compiles and runs (score 40)
  ✓ E2E: default pathway compiles and runs (score 65)
  ✓ E2E: default pathway compiles and runs (score 90)
  ✓ E2E: Alignment Score comes from execution (state += 15, and ; b)
  ✓ E2E: unknown outcome is rejected with line and column

Results: 14 passed, 0 failed.
```

The E2E tests use `ALPC_BIN` / `LLI_BIN` (same variables as the backend) and are skipped
when the compiler binary is not found.

Compiler fixtures (lexer, parser, AST, IR, execution and `--json` goldens):

```bash
make check
```
