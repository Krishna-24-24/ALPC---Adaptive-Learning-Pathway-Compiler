# Deployment patch verification

Base: `7a4e5b1` on `main`. Checked 2026-10-07.

## Passed locally

| Check | Result |
|---|---|
| Linux compiler build, GCC 13 / LLVM 18.1.3 | Pass; hand-written sources use `-Wall -Wextra -Werror` |
| Bison conflict gate | Pass |
| `make check` | 112 passed, 0 failed; includes IR verification and execution |
| `make demo` | Expected score and outcome |
| `npm test` | 45 passed: integration 13, study 14, features 14, hosting 4; compiler tests not skipped |
| Frontend `tsc --noEmit` | Pass |
| Frontend ESLint | Pass |
| Next.js production build | Pass; all 18 static pages generated |
| `cppcheck` warning/style gate | Pass |
| ASan + UBSan, with `ASAN_OPTIONS=detect_leaks=0` locally | 28 AST checks and 112 compiler checks passed |
| `ldd alpc` | No missing libraries; current emitter has no dynamic libLLVM dependency |
| actionlint 1.7.7 | Pass; optional shellcheck integration unavailable |
| `bash -n tests/deploy-smoke.sh` | Pass |
| Root Render Blueprint | Valid against Render's published JSON schema |
| Python ML API smoke checks | Health, BKT update, batch update, invalid mastery: 4 passed |
| `git diff --check` | Pass |

The local runtime used Node 24 and Python 3.12. CI/images target Node 22;
the ML image uses Python 3.11. Container verification is still required.

## Required checks that remain outside this environment

- **Docker builds and container smoke tests:** Docker is unavailable here. The new
  Deployment images CI job builds both images and exercises them with MongoDB.
  No successful GitHub Actions run or live deployment is claimed by this report.
- **Full LeakSanitizer:** the default sanitizer run cannot inspect `/proc` tasks in
  this environment. The ASan/UBSan-only local run does not verify memory leaks.
  CI keeps full Linux ASan/UBSan defaults; no leak suppression was committed.
- **Windows build:** covered by the existing Windows CI job, not run locally.
- **Live Atlas/Render/Vercel/browser workflow:** requires the owner's service
  accounts and deployment configuration; follow the acceptance steps in DEPLOY.md.
- Study-resource structure, supported hosts and routing passed tests. External
  study links were not revalidated in this deployment-only patch; their existing
  verification metadata is retained.

The old task/ship documents describe an earlier offline compiler release, not
proof that the current web application has been deployed or audited end-to-end.
