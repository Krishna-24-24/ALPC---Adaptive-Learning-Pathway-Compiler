/* Path-Lang lexer (Exp 7 / Flex). See SPEC.md 2.2. */
%{
#include <cerrno>
#include <climits>
#include <cstdio>
#include <cstdlib>
#include <cstring>

#include "diagnostics.h"
#include "parser.tab.h"

/* 1-based column of the next character to be scanned. Flex tracks lines
 * (%option yylineno) but not columns, so we keep it ourselves: every rule
 * advances it by yyleng, the newline rule resets it. A tab counts as one
 * column. */
static int alpc_col = 1;

/* Non-reentrant parser: keep yylloc in sync with the scanner (Bison manual
 * 3.5, "Tracking Locations"; flex has no automatic update for the shared
 * global yylloc). Runs before every rule action. */
#define YY_USER_ACTION                                   \
  yylloc.first_line = yylloc.last_line = yylineno;       \
  yylloc.first_column = alpc_col;                        \
  alpc_col += yyleng;                                    \
  yylloc.last_column = alpc_col - 1;
%}

%option noyywrap yylineno nounput noinput

%%

[ \t\r]+          { /* whitespace: ignore */ }
\n                { alpc_col = 1; /* yylineno advances automatically */ }
#[^\n]*           { /* comment to end of line: ignore */ }

"SET"             { return SET; }
"IF"              { return IF; }
"GOTO"            { return GOTO; }
"OUTCOME"         { return OUTCOME; }
"AND"             { return AND; }
"OR"              { return OR; }

[A-Za-z_][A-Za-z0-9_]*  { yylval.sval = strdup(yytext); return IDENT; }

[0-9]+  {
    errno = 0;
    long v = strtol(yytext, nullptr, 10);
    if (errno == ERANGE || v > INT_MAX) {
      alpc::reportf(alpc::DK_LEXICAL, "number-range", yylineno,
                    yylloc.first_column,
                    "numeric literal '%s' is out of range (max %d)",
                    yytext, INT_MAX);
      v = INT_MAX;
    }
    yylval.ival = static_cast<int>(v);
    return NUMBER;
  }

  /* Two-character operators first for readability; flex picks the longest
   * match regardless of rule order, so "<=" never lexes as "<" "=". */
"=="              { return EQ; }
"!="              { return NE; }
"<="              { return LE; }
">="              { return GE; }
"<"               { return LT; }
">"               { return GT; }
"+="              { return ADD_ASSIGN; }
"-="              { return SUB_ASSIGN; }
"="               { return ASSIGN; }
"("               { return LPAREN; }
")"               { return RPAREN; }

  /* Binary-output terminator "; b". If a letter/digit/_ follows the 'b' it is an
   * identifier, not the marker: keep only ';' and rescan from the 'b'. */
";"[ \t]*"b"[A-Za-z0-9_]  { yyless(1); alpc_col = yylloc.first_column + 1;
                            yylloc.last_column = yylloc.first_column;
                            return SEMI; }
";"[ \t]*"b"              { return SEMI_B; }
";"                       { return SEMI; }

.                 { alpc::report_lex_error(yylineno, yylloc.first_column, yytext[0]); }

%%

/* Rewind the scanner to the start of `in` (used by `--json`, which lexes the
 * file once for the token table and again for the parser). */
void alpc_scanner_reset(FILE *in) {
  std::rewind(in);
  yyrestart(in);
  yylineno = 1;
  alpc_col = 1;
}
