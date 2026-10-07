#include "diagnostics.h"

#include <cstdarg>
#include <cstdio>

namespace alpc {

namespace {
std::vector<Diagnostic> g_diags;
bool g_quiet = false;
}  // namespace

const char *diag_kind_str(DiagKind k) {
  switch (k) {
    case DK_LEXICAL: return "lexical";
    case DK_SYNTAX:  return "syntax";
    default:         return "semantic";
  }
}

void set_quiet(bool quiet) { g_quiet = quiet; }

const std::vector<Diagnostic> &diagnostics() { return g_diags; }

void reset_errors() { g_diags.clear(); }

int error_count() { return static_cast<int>(g_diags.size()); }

void report(DiagKind kind, const char *code, int line, int col, const char *msg) {
  g_diags.push_back(Diagnostic{kind, code, line, col, msg});
  if (g_quiet) return;
  if (line > 0 && col > 0) {
    std::fprintf(stderr, "line %d, col %d: %s\n", line, col, msg);
  } else if (line > 0) {
    std::fprintf(stderr, "line %d: %s\n", line, msg);
  } else {
    std::fprintf(stderr, "%s\n", msg);
  }
}

void reportf(DiagKind kind, const char *code, int line, int col,
             const char *fmt, ...) {
  char buf[512];
  va_list ap;
  va_start(ap, fmt);
  std::vsnprintf(buf, sizeof buf, fmt, ap);
  va_end(ap);
  report(kind, code, line, col, buf);
}

void report_lex_error(int line, int col, char bad) {
  reportf(DK_LEXICAL, "unexpected-char", line, col,
          "unexpected character '%c'", bad);
}

}  // namespace alpc
