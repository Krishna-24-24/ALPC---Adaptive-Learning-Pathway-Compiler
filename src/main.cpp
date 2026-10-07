#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#include "ast.h"
#include "codegen.h"
#include "diagnostics.h"
#include "parser.tab.h"  // yyparse, YYSTYPE (yylval)
#include "semantics.h"
#include "tokens.h"

// Provided by the Flex-generated scanner (lex.yy.c is compiled as C++).
int yylex(void);
extern int yylineno;
extern char *yytext;
extern FILE *yyin;
int yyparse(void);
void alpc_scanner_reset(FILE *in);  // scanner.l

// Shared with the parser's reduce actions.
alpc::Program *g_program = nullptr;

namespace {

int run_dump_tokens() {
  int kind;
  while ((kind = yylex()) != 0) {
    std::printf("line %d: %s \"%s\"\n", yylineno, alpc_token_name(kind), yytext);
    if (kind == IDENT) std::free(yylval.sval);
  }
  std::printf("EOF\n");
  return alpc::error_count() ? 1 : 0;
}

// Parse into `program`. Returns the Bison return code (0 == syntactically ok).
int parse_into(alpc::Program &program) {
  g_program = &program;
  int prc = yyparse();
  g_program = nullptr;
  return prc;
}

// ---------------------------------------------------------------------------
// --json: one machine-readable object with every compile-time artifact
// (tokens, parse trace, AST, diagnostics, IR), so integrations consume real
// compiler output instead of scraping the text dumps. Execution stays
// outside the compiler: run the "ir" string with lli.
// ---------------------------------------------------------------------------

struct Tok {
  int line, col;
  const char *type;
  std::string lexeme;
};

std::string jstr(const std::string &s) {
  std::string out = "\"";
  for (unsigned char c : s) {
    switch (c) {
      case '"':  out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if (c < 0x20) {
          char buf[8];
          std::snprintf(buf, sizeof buf, "\\u%04x", c);
          out += buf;
        } else {
          out += static_cast<char>(c);
        }
    }
  }
  return out + "\"";
}

std::vector<std::string> split_lines(const std::string &text) {
  std::vector<std::string> lines;
  std::istringstream in(text);
  std::string l;
  while (std::getline(in, l)) {
    if (!l.empty()) lines.push_back(l);
  }
  return lines;
}

void json_stmt(std::ostream &os, const alpc::ASTNode *n) {
  os << "{";
  if (const auto *s = alpc::dyn_cast<alpc::ProfileSet>(n)) {
    os << "\"kind\":\"ProfileSet\",\"line\":" << s->line() << ",\"col\":"
       << s->col() << ",\"name\":" << jstr(s->name) << ",\"op\":"
       << jstr(alpc::set_op_str(s->op)) << ",\"value\":" << s->value;
  } else if (const auto *b = alpc::dyn_cast<alpc::CondBranch>(n)) {
    os << "\"kind\":\"CondBranch\",\"line\":" << b->line() << ",\"col\":"
       << b->col() << ",\"var\":" << jstr(b->var) << ",\"rel\":"
       << jstr(alpc::rel_op_str(b->rel)) << ",\"value\":" << b->value
       << ",\"target\":" << jstr(b->target) << ",\"targetCol\":"
       << b->target_col;
  } else if (const auto *o = alpc::dyn_cast<alpc::Outcome>(n)) {
    os << "\"kind\":\"Outcome\",\"line\":" << o->line() << ",\"col\":"
       << o->col() << ",\"name\":" << jstr(o->name) << ",\"adjust\":"
       << o->adjust;
  }
  os << "}";
}

int run_json(const char *path) {
  alpc::set_quiet(true);

  // Pass 1: token table (same stream --dump-tokens prints).
  std::vector<Tok> toks;
  int kind;
  while ((kind = yylex()) != 0) {
    toks.push_back(Tok{yylineno, yylloc.first_column, alpc_token_name(kind), yytext});
    if (kind == IDENT) std::free(yylval.sval);
  }
  const std::vector<alpc::Diagnostic> lex_diags = alpc::diagnostics();

  // Pass 2: parse + semantics on a fresh scan. Lexical errors are re-reported
  // here, so the pass-1 copies are discarded to avoid duplicates.
  alpc::reset_errors();
  alpc_scanner_reset(yyin);
  alpc::Program program;
  const int prc = parse_into(program);
  alpc::check_program(program);
  const bool valid = (prc == 0 && alpc::error_count() == 0);

  std::string ir;
  bool ir_ok = false;
  if (valid) ir = alpc::emit_ir(program, path, ir_ok);

  std::ostringstream trace;
  alpc::print_trace(trace, program);

  const auto &all = alpc::diagnostics();
  const bool backward_ok =
      std::none_of(all.begin(), all.end(), [](const alpc::Diagnostic &d) {
        return d.code == "backward-design" || d.code == "unknown-outcome";
      });

  const bool success = valid && ir_ok;
  std::ostream &os = std::cout;
  os << "{\n";
  os << "  \"success\": " << (success ? "true" : "false") << ",\n";
  os << "  \"file\": " << jstr(path) << ",\n";
  os << "  \"binaryOutput\": " << (program.binary_output ? "true" : "false") << ",\n";

  os << "  \"stages\": {";
  auto has_kind = [](alpc::DiagKind k) {
    const auto &ds = alpc::diagnostics();
    return std::any_of(ds.begin(), ds.end(),
                       [k](const alpc::Diagnostic &d) { return d.kind == k; });
  };
  // The parser always runs (Bison recovers past lexical errors); semantic
  // results only count when the parse succeeded, codegen only for valid input.
  const bool lex_ok = lex_diags.empty();
  const bool syn_ok = prc == 0 && !has_kind(alpc::DK_SYNTAX);
  const bool sem_ok = syn_ok && !has_kind(alpc::DK_SEMANTIC);
  auto st = [](bool reached, bool ok) {
    return !reached ? "\"skipped\"" : (ok ? "\"success\"" : "\"error\"");
  };
  os << "\"lexer\": " << st(true, lex_ok)
     << ", \"parser\": " << st(true, syn_ok)
     << ", \"semantic\": " << st(syn_ok, sem_ok)
     << ", \"codegen\": " << st(valid, ir_ok) << "},\n";

  // null = not evaluated (the parse failed, so the check never ran on a full AST).
  os << "  \"checks\": {\"backwardDesign\": "
     << (!syn_ok ? "null" : (backward_ok ? "true" : "false")) << "},\n";

  os << "  \"tokens\": [";
  for (size_t i = 0; i < toks.size(); ++i) {
    os << (i ? ",\n    " : "\n    ") << "{\"line\":" << toks[i].line << ",\"col\":"
       << toks[i].col << ",\"type\":" << jstr(toks[i].type) << ",\"lexeme\":"
       << jstr(toks[i].lexeme) << "}";
  }
  os << (toks.empty() ? "" : "\n  ") << "],\n";

  const auto trace_lines = split_lines(trace.str());
  os << "  \"trace\": [";
  for (size_t i = 0; i < trace_lines.size(); ++i) {
    os << (i ? ", " : "") << jstr(trace_lines[i]);
  }
  os << "],\n";

  os << "  \"ast\": {\"kind\":\"Program\",\"binaryOutput\":"
     << (program.binary_output ? "true" : "false") << ",\"stmts\":[";
  for (size_t i = 0; i < program.stmts.size(); ++i) {
    os << (i ? ",\n    " : "\n    ");
    json_stmt(os, program.stmts[i].get());
  }
  os << (program.stmts.empty() ? "" : "\n  ") << "]},\n";

  os << "  \"diagnostics\": [";
  const auto &diags = alpc::diagnostics();
  for (size_t i = 0; i < diags.size(); ++i) {
    const auto &d = diags[i];
    os << (i ? ",\n    " : "\n    ") << "{\"kind\":" << jstr(alpc::diag_kind_str(d.kind))
       << ",\"code\":" << jstr(d.code) << ",\"line\":" << d.line << ",\"col\":"
       << d.col << ",\"message\":" << jstr(d.message) << "}";
  }
  os << (diags.empty() ? "" : "\n  ") << "],\n";

  os << "  \"ir\": " << (success ? jstr(ir) : std::string("null")) << "\n";
  os << "}\n";

  if (!valid) return 1;
  return ir_ok ? 0 : 3;
}

void usage(FILE *out) {
  std::fprintf(out,
               "usage: alpc [MODE] FILE\n"
               "  --emit-ir       emit LLVM IR to stdout       (Exp 9, default)\n"
               "  --parse         parse + static-semantic checks\n"
               "  --parse-trace   print the reduction trace    (Exp 7)\n"
               "  --dump-tokens   print the token stream        (Exp 7)\n"
               "  --dump-ast      print the AST (RTTI-driven)   (Exp 8)\n"
               "  --json          tokens + trace + AST + diagnostics + IR as JSON\n");
}

}  // namespace

int main(int argc, char **argv) {
  const char *mode = "--emit-ir";
  const char *path = nullptr;

  for (int i = 1; i < argc; ++i) {
    if (std::strcmp(argv[i], "--help") == 0) {
      usage(stdout);
      return 0;
    }
    if (std::strncmp(argv[i], "--", 2) == 0) {
      mode = argv[i];
    } else {
      path = argv[i];
    }
  }

  if (!path) {
    usage(stderr);
    return 2;
  }

  yyin = std::fopen(path, "r");
  if (!yyin) {
    std::fprintf(stderr, "cannot open %s\n", path);
    return 2;
  }

  const bool m_tokens = std::strcmp(mode, "--dump-tokens") == 0;
  const bool m_trace  = std::strcmp(mode, "--parse-trace") == 0;
  const bool m_ast    = std::strcmp(mode, "--dump-ast") == 0;
  const bool m_parse  = std::strcmp(mode, "--parse") == 0;
  const bool m_ir     = std::strcmp(mode, "--emit-ir") == 0;
  const bool m_json   = std::strcmp(mode, "--json") == 0;

  int rc;
  if (m_json) {
    rc = run_json(path);
  } else if (m_tokens) {
    rc = run_dump_tokens();
  } else if (m_trace || m_ast || m_parse || m_ir) {
    alpc::Program program;
    int prc = parse_into(program);
    if (m_trace) alpc::print_trace(std::cout, program);
    if (m_ast) alpc::print_ast(std::cout, program);
    alpc::check_program(program);  // semantic errors count for every parse mode
    const bool valid = (prc == 0 && alpc::error_count() == 0);

    if (!m_ir) {
      rc = valid ? 0 : 1;
    } else if (!valid) {
      rc = 1;  // never lower invalid input
    } else {
      bool ok = false;
      std::string ir = alpc::emit_ir(program, path, ok);
      if (ok) {
        std::cout << ir;
        rc = 0;
      } else {
        rc = 3;  // internal error: IR failed verification
      }
    }
  } else {
    std::fprintf(stderr, "unknown mode: %s\n", mode);
    usage(stderr);
    rc = 2;
  }

  std::fclose(yyin);
  return rc;
}
