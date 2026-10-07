/* Path-Lang grammar (Exp 7 / Bison). See SPEC.md 2.3-2.4.
 * Non-reentrant C parser: yylex / yylval / yylloc / yyerror are globals
 * (Bison 3.8.2 manual, "Calling Convention", "Token Values"). Reduce
 * actions build the AST (SPEC 2); static-semantic checks run afterward
 * as a source-order pass (semantics.cpp). */
%{
#include <cstdlib>
#include <memory>

#include "ast.h"
#include "diagnostics.h"

int yylex(void);
extern int yylineno;
void yyerror(const char *msg);

extern alpc::Program *g_program;  // set by the driver before yyparse()
%}

%code requires {
namespace alpc { class ASTNode; }
}

%locations
%define parse.error detailed   /* report unexpected + expected tokens (>= 3.6) */
%define parse.lac full         /* make those reports accurate (manual, "LAC") */

%union {
  int   ival;
  char *sval;
  alpc::ASTNode *node;  /* condition subtree, owned by the parser until wrapped */
}

%token SET IF GOTO OUTCOME
%token <sval> IDENT
%token <ival> NUMBER
%token LT GT EQ NE LE GE ASSIGN ADD_ASSIGN SUB_ASSIGN SEMI SEMI_B
%token AND OR LPAREN RPAREN

%type <ival> set_op rel outcome_op
%type <node> cond cond_and cond_atom

/* IDENT carries a strdup'd string; free it if error recovery discards the token
 * (Bison manual, "Destructor Decl"). Rule actions free the ones they consume;
 * the destructor only runs for tokens the parser drops before a reduce. */
%destructor { free($$); } <sval>
%destructor { delete $$; } <node>

%%

program
  : %empty
  | stmt_list
  ;

stmt_list
  : stmt_list stmt
  | stmt
  ;

stmt
  : outcome_stmt
  | set_stmt
  | branch_stmt
  | error term        { yyerrok; }
  ;

outcome_stmt
  : OUTCOME IDENT term
      { g_program->stmts.push_back(
            std::make_unique<alpc::Outcome>(@2.first_line, $2, 0,
                                            @2.first_column));
        free($2); }
  | OUTCOME IDENT outcome_op NUMBER term
      { g_program->stmts.push_back(
            std::make_unique<alpc::Outcome>(@2.first_line, $2, $3 * $4,
                                            @2.first_column));
        free($2); }
  ;

/* Outcome adjustment: sign of the amount applied to `state` on arrival. */
outcome_op
  : ADD_ASSIGN  { $$ = 1; }
  | SUB_ASSIGN  { $$ = -1; }
  ;

set_stmt
  : SET IDENT set_op NUMBER term
      { g_program->stmts.push_back(
            std::make_unique<alpc::ProfileSet>(
                @2.first_line, $2, static_cast<alpc::SetOp>($3), $4,
                @2.first_column));
        free($2); }
  ;

set_op
  : ASSIGN      { $$ = alpc::OP_ASSIGN; }
  | ADD_ASSIGN  { $$ = alpc::OP_ADD; }
  | SUB_ASSIGN  { $$ = alpc::OP_SUB; }
  ;

branch_stmt
  : IF cond GOTO IDENT term
      { g_program->stmts.push_back(
            std::make_unique<alpc::CondBranch>(
                @2.first_line, std::unique_ptr<alpc::ASTNode>($2), $4,
                $2->col(), @4.first_column));
        free($4); }
  ;

/* OR has the lowest precedence, then AND; both are left-associative.
 * Written as two levels so the grammar stays conflict-free without %left. */
cond
  : cond OR cond_and
      { $$ = new alpc::Logical(@1.first_line, alpc::LOGIC_OR,
                               std::unique_ptr<alpc::ASTNode>($1),
                               std::unique_ptr<alpc::ASTNode>($3), $1->col()); }
  | cond_and
  ;

cond_and
  : cond_and AND cond_atom
      { $$ = new alpc::Logical(@1.first_line, alpc::LOGIC_AND,
                               std::unique_ptr<alpc::ASTNode>($1),
                               std::unique_ptr<alpc::ASTNode>($3), $1->col()); }
  | cond_atom
  ;

cond_atom
  : IDENT rel NUMBER
      { $$ = new alpc::Compare(@1.first_line, $1, static_cast<alpc::RelOp>($2), $3,
                               @1.first_column);
        free($1); }
  | LPAREN cond RPAREN  { $$ = $2; }
  ;

rel
  : LT  { $$ = alpc::REL_LT; }
  | GT  { $$ = alpc::REL_GT; }
  | EQ  { $$ = alpc::REL_EQ; }
  | NE  { $$ = alpc::REL_NE; }
  | LE  { $$ = alpc::REL_LE; }
  | GE  { $$ = alpc::REL_GE; }
  ;

term
  : SEMI
  | SEMI_B    { g_program->binary_output = true; }
  ;

%%

void yyerror(const char *msg) {
  alpc::report(alpc::DK_SYNTAX, "syntax", yylloc.first_line,
               yylloc.first_column, msg);
}
