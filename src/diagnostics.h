#ifndef ALPC_DIAGNOSTICS_H
#define ALPC_DIAGNOSTICS_H

#include <string>
#include <vector>

namespace alpc {

// Which compiler phase raised the diagnostic. Surfaced by `--json` so the UI
// can mark the failing pipeline stage (lexer / parser / semantic check).
enum DiagKind { DK_LEXICAL, DK_SYNTAX, DK_SEMANTIC };

const char *diag_kind_str(DiagKind k);  // "lexical", "syntax", "semantic"

struct Diagnostic {
  DiagKind kind;
  std::string code;     // stable machine id, e.g. "backward-design"
  int line;             // 1-based; 0 = unknown
  int col;              // 1-based; 0 = unknown
  std::string message;
};

// Every lexical / syntax / semantic error in ALPC goes through here so the
// diagnostic format stays uniform (CONSTRAINTS.md F4):
//   "line N, col C: msg"   (column known)
//   "line N: msg"          (column unknown)
//   "msg"                  (line unknown)
// The diagnostic is also recorded for `--json` and bumps the error counter.
void report(DiagKind kind, const char *code, int line, int col, const char *msg);

// printf-style variant.
void reportf(DiagKind kind, const char *code, int line, int col,
             const char *fmt, ...)
#if defined(__GNUC__)
    __attribute__((format(printf, 5, 6)))
#endif
    ;

// Convenience for the scanner's catch-all rule.
void report_lex_error(int line, int col, char bad);

// When quiet, diagnostics are recorded but not printed (`--json` carries them
// in its own output instead of on stderr).
void set_quiet(bool quiet);

const std::vector<Diagnostic> &diagnostics();
int error_count();
void reset_errors();  // clears the counter and the recorded list

}  // namespace alpc

#endif  // ALPC_DIAGNOSTICS_H
