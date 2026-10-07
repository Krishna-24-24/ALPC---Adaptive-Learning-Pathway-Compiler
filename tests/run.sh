#!/usr/bin/env bash
# ALPC fixture runner.
#   valid/NAME.edu   + .tokens / .parsetrace / .ast   -> golden diff
#                    + .run                           -> lli stdout must match
#                    + .irhas                         -> each line is a substring
#                                                        the generated .ll must contain
#                    (every valid fixture: --emit-ir must pass `opt -passes=verify`)
#   invalid/NAME.edu + .err                           -> non-zero exit, stderr substring,
#                                                        no crash/hang
set -u
export PATH="C:/msys64/mingw64/bin:C:/msys64/usr/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# ALPC_BIN lets `make test-asan` point the same suite at the sanitized binary.
ALPC="${ALPC_BIN:-$ROOT/alpc}"
[ -x "$ALPC" ] || { [ -x "$ALPC.exe" ] && ALPC="$ALPC.exe"; }
VALID="$ROOT/tests/fixtures/valid"
INVALID="$ROOT/tests/fixtures/invalid"
TMP="$ROOT/obj/t"
mkdir -p "$TMP"

pass=0
fail=0

if [ ! -x "$ALPC" ]; then
  echo "FAIL: alpc binary not built ($ALPC)"
  exit 1
fi

ok()   { echo "  ok   $1"; pass=$((pass + 1)); }
bad()  { echo "  FAIL $1"; shift; [ $# -gt 0 ] && printf '%s\n' "$@" | sed 's/^/       /'; fail=$((fail + 1)); }

# alpc is a native Windows binary: stdout is text-mode, strip CR before diffing.
run_mode() { timeout 5 "$ALPC" "$1" "$2" 2>/dev/null | tr -d '\r'; }

golden_check() { # label golden mode edu
  local actual; actual="$(run_mode "$3" "$4")"
  if diff -u "$2" <(printf '%s\n' "$actual") >"$TMP/d" 2>&1; then
    ok "$1"
  else
    bad "$1" "$(cat "$TMP/d")"
  fi
}

ir_check() { # name edu
  local name="$1" edu="$2" base="${2%.edu}" ll="$TMP/$1.ll"
  if ! timeout 10 "$ALPC" --emit-ir "$edu" 2>"$TMP/e" | tr -d '\r' >"$ll"; then
    bad "ir/$name (--emit-ir failed)" "$(cat "$TMP/e")"; return
  fi
  if ! opt -passes=verify "$ll" -o /dev/null 2>"$TMP/e"; then
    bad "ir/$name (opt -passes=verify)" "$(cat "$TMP/e")"; return
  fi
  if [ -f "$base.irhas" ]; then
    while IFS= read -r pat; do
      [ -z "$pat" ] && continue
      grep -qF -- "$pat" "$ll" || { bad "ir/$name (missing: $pat)"; return; }
    done <"$base.irhas"
  fi
  if [ -f "$base.run" ]; then
    local got; got="$(timeout 10 lli "$ll" 2>/dev/null | tr -d '\r')"
    if [ "$got" != "$(cat "$base.run")" ]; then
      bad "ir/$name (lli stdout)" "want: $(cat "$base.run")" "got:  $got"; return
    fi
  fi
  ok "ir/$name"
}

invalid_check() { # label err edu
  local out rc want
  out="$(timeout 5 "$ALPC" "$3" 2>&1)"; rc=$?
  want="$(cat "$2")"
  if   [ "$rc" -eq 0 ];    then bad "$1 (expected non-zero exit)"
  elif [ "$rc" -ge 124 ];  then bad "$1 (timeout/crash rc=$rc)"
  elif printf '%s' "$out" | grep -qF -- "$want"; then ok "$1"
  else bad "$1 (want stderr substring: $want)" "$out"
  fi
}

echo "== valid fixtures =="
for edu in "$VALID"/*.edu; do
  [ -e "$edu" ] || continue
  base="${edu%.edu}"; name="$(basename "$base")"
  [ -f "$base.tokens" ]     && golden_check "tokens/$name" "$base.tokens"     --dump-tokens "$edu"
  [ -f "$base.parsetrace" ] && golden_check "parse/$name"  "$base.parsetrace" --parse-trace "$edu"
  [ -f "$base.ast" ]        && golden_check "ast/$name"    "$base.ast"        --dump-ast    "$edu"
  ir_check "$name" "$edu"
done

# --json must agree with the text modes it summarizes (needs python3; skipped otherwise).
PY="$(command -v python3 || command -v python || true)"
json_check() { # label edu expect(valid|invalid)
  local label="$1" edu="$2" expect="$3" rc
  timeout 5 "$ALPC" --json "$edu" 2>"$TMP/je" | tr -d '\r' >"$TMP/j.json"; rc=${PIPESTATUS[0]}
  if [ "$expect" = valid ] && [ "$rc" -ne 0 ]; then bad "$label (rc=$rc)"; return; fi
  if [ "$expect" = invalid ] && { [ "$rc" -eq 0 ] || [ "$rc" -ge 124 ]; }; then bad "$label (rc=$rc)"; return; fi
  if [ -s "$TMP/je" ]; then bad "$label (stderr not empty)" "$(cat "$TMP/je")"; return; fi
  run_mode --dump-tokens "$edu" >"$TMP/jt"
  if [ "$expect" = valid ]; then run_mode --emit-ir "$edu" >"$TMP/ji"; else : >"$TMP/ji"; fi
  if "$PY" -I - "$TMP/j.json" "$TMP/jt" "$TMP/ji" "$expect" <<'PYEOF' >"$TMP/jd" 2>&1
import json, sys
d = json.load(open(sys.argv[1]))
toks = ['line %d: %s "%s"' % (t["line"], t["type"], t["lexeme"]) for t in d["tokens"]] + ["EOF"]
want_toks = [l for l in open(sys.argv[2]).read().split("\n") if l]
assert toks == want_toks, "tokens differ from --dump-tokens"
if sys.argv[4] == "valid":
    assert d["success"] is True and d["diagnostics"] == [], "valid program reported failure"
    assert d["ir"].rstrip("\n") == open(sys.argv[3]).read().rstrip("\n"), "ir differs from --emit-ir"
else:
    assert d["success"] is False and d["ir"] is None, "invalid program reported success"
    assert d["diagnostics"] and all(x["line"] > 0 for x in d["diagnostics"]), "missing located diagnostics"
PYEOF
  then ok "$label"; else bad "$label" "$(cat "$TMP/jd")"; fi
}

if [ -n "$PY" ]; then
  echo "== --json =="
  for edu in "$VALID"/*.edu;   do [ -e "$edu" ] && json_check "json/$(basename "${edu%.edu}")" "$edu" valid; done
  for edu in "$INVALID"/*.edu; do [ -e "$edu" ] && json_check "json/invalid/$(basename "${edu%.edu}")" "$edu" invalid; done
else
  echo "== --json == (skipped: python3 not found)"
fi

echo "== invalid fixtures =="
for edu in "$INVALID"/*.edu; do
  [ -e "$edu" ] || continue
  base="${edu%.edu}"; name="$(basename "$base")"
  [ -f "$base.err" ] && invalid_check "invalid/$name" "$base.err" "$edu"
done

echo "---"
echo "pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
