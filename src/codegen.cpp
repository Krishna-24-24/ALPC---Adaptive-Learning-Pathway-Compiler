#include "codegen.h"

#include <map>
#include <set>
#include <sstream>
#include <string>
#include <vector>

namespace alpc {

namespace {

const char *pred_of(RelOp rel) {
  switch (rel) {
    case REL_GT: return "sgt";
    case REL_EQ: return "eq";
    case REL_NE: return "ne";
    case REL_LE: return "sle";
    case REL_GE: return "sge";
    default:     return "slt";
  }
}

}  // namespace

std::string emit_ir(const Program &p, const std::string &module_name, bool &ok) {
  std::ostringstream out;

  out << "; ModuleID = '" << module_name << "'\n";
  out << "source_filename = \"" << module_name << "\"\n\n";

  if (p.binary_output) {
    out << "declare i32 @putchar(i32)\n\n";
    out << "define internal void @print_binary(i32 %val) {\n";
    out << "entry:\n";
    out << "  %is.zero = icmp eq i32 %val, 0\n";
    out << "  br i1 %is.zero, label %zero, label %scan\n\n";
    out << "zero:\n";
    out << "  call i32 @putchar(i32 48)\n";
    out << "  br label %done\n\n";
    out << "scan:\n";
    out << "  %i = phi i32 [ 31, %entry ], [ %i.dec, %scan.next ]\n";
    out << "  %shift = lshr i32 %val, %i\n";
    out << "  %bit = and i32 %shift, 1\n";
    out << "  %bit.set = icmp ne i32 %bit, 0\n";
    out << "  br i1 %bit.set, label %emit, label %scan.next\n\n";
    out << "scan.next:\n";
    out << "  %i.dec = sub i32 %i, 1\n";
    out << "  br label %scan\n\n";
    out << "emit:\n";
    out << "  %j = phi i32 [ %i, %scan ], [ %j.dec, %emit ]\n";
    out << "  %j.shift = lshr i32 %val, %j\n";
    out << "  %j.bit = and i32 %j.shift, 1\n";
    out << "  %j.ch = add i32 %j.bit, 48\n";
    out << "  call i32 @putchar(i32 %j.ch)\n";
    out << "  %j.dec = sub i32 %j, 1\n";
    out << "  %j.done = icmp slt i32 %j.dec, 0\n";
    out << "  br i1 %j.done, label %done, label %emit\n\n";
    out << "done:\n";
    out << "  call i32 @putchar(i32 10)\n";
    out << "  ret void\n";
    out << "}\n\n";
  } else {
    out << "declare i32 @printf(ptr, ...)\n";
    out << "@.dfmt = private unnamed_addr constant [4 x i8] c\"%d\\0A\\00\"\n\n";
  }

  // The program reports the outcome it reached as a second output line,
  // "outcome <name>" (or "outcome none" if no rule held), so callers read the
  // decision from the execution instead of re-evaluating the rules.
  std::vector<const Outcome *> outcomes;
  for (const auto &s : p.stmts) {
    if (const auto *o = dyn_cast<Outcome>(s.get())) outcomes.push_back(o);
  }
  out << "declare i32 @puts(ptr)\n";
  for (size_t k = 0; k < outcomes.size(); ++k) {
    const std::string text = "outcome " + outcomes[k]->name;
    out << "@.alpc.outcome." << k << " = private unnamed_addr constant [" << text.size() + 1
        << " x i8] c\"" << text << "\\00\"\n";
  }
  out << "@.alpc.outcome.none = private unnamed_addr constant [13 x i8] c\"outcome none\\00\"\n\n";

  out << "define i32 @main() {\n";
  out << "entry:\n";

  // Collect variables
  std::set<std::string> vars;
  vars.insert("state");
  for (const auto &s : p.stmts) {
    if (const auto *ps = dyn_cast<ProfileSet>(s.get())) vars.insert(ps->name);
    if (const auto *cb = dyn_cast<CondBranch>(s.get())) vars.insert(cb->var);
  }

  for (const auto &v : vars) {
    out << "  %" << v << " = alloca i32\n";
    out << "  store i32 0, ptr %" << v << "\n";
  }

  // Lower statements in source order
  int cont_ctr = 0;
  int op_ctr = 0;
  for (const auto &s : p.stmts) {
    if (const auto *ps = dyn_cast<ProfileSet>(s.get())) {
      if (ps->op == OP_ASSIGN) {
        out << "  store i32 " << ps->value << ", ptr %" << ps->name << "\n";
      } else {
        int id = op_ctr++;
        out << "  %" << ps->name << ".cur." << id << " = load i32, ptr %" << ps->name << "\n";
        const char *op_str = (ps->op == OP_ADD) ? "add" : "sub";
        out << "  %fusion." << id << " = " << op_str << " i32 %" << ps->name << ".cur." << id << ", " << ps->value << "\n";
        out << "  store i32 %fusion." << id << ", ptr %" << ps->name << "\n";
      }
    } else if (const auto *cb = dyn_cast<CondBranch>(s.get())) {
      int id = op_ctr++;
      out << "  %" << cb->var << ".val." << id << " = load i32, ptr %" << cb->var << "\n";
      out << "  %cond." << id << " = icmp " << pred_of(cb->rel) << " i32 %" << cb->var << ".val." << id << ", " << cb->value << "\n";
      int after_id = cont_ctr++;
      out << "  br i1 %cond." << id << ", label %outcome." << cb->target << ", label %after" << after_id << "\n\n";
      out << "after" << after_id << ":\n";
    }
  }

  // The block that falls through to prog_end when no rule holds.
  const std::string fallthrough = cont_ctr == 0 ? "entry" : "after" + std::to_string(cont_ctr - 1);
  out << "  br label %prog_end\n\n";

  // Outcome basic blocks
  for (const auto &s : p.stmts) {
    if (const auto *o = dyn_cast<Outcome>(s.get())) {
      out << "outcome." << o->name << ":\n";
      if (o->adjust != 0) {
        int id = op_ctr++;
        out << "  %state.cur." << id << " = load i32, ptr %state\n";
        if (o->adjust > 0) {
          out << "  %outcome.adjust." << id << " = add i32 %state.cur." << id << ", " << o->adjust << "\n";
        } else {
          out << "  %outcome.adjust." << id << " = sub i32 %state.cur." << id << ", " << (-o->adjust) << "\n";
        }
        out << "  store i32 %outcome.adjust." << id << ", ptr %state\n";
      }
      out << "  br label %prog_end\n\n";
    }
  }

  // prog_end: which outcome block we came from, as an index (-1: none).
  // Internal values use an "alpc." prefix so they cannot clash with a
  // Path-Lang variable of the same name (e.g. SET score = 1).
  out << "prog_end:\n";
  out << "  %alpc.selected = phi i32 [ -1, %" << fallthrough << " ]";
  for (size_t k = 0; k < outcomes.size(); ++k) {
    out << ", [ " << k << ", %outcome." << outcomes[k]->name << " ]";
  }
  out << "\n";
  out << "  %alpc.score = load i32, ptr %state\n";
  if (p.binary_output) {
    out << "  call void @print_binary(i32 %alpc.score)\n";
  } else {
    out << "  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %alpc.score)\n";
  }
  out << "  switch i32 %alpc.selected, label %alpc.report.none [";
  for (size_t k = 0; k < outcomes.size(); ++k) out << " i32 " << k << ", label %alpc.report." << k;
  out << " ]\n\n";
  for (size_t k = 0; k < outcomes.size(); ++k) {
    out << "alpc.report." << k << ":\n";
    out << "  call i32 @puts(ptr @.alpc.outcome." << k << ")\n";
    out << "  br label %alpc.exit\n\n";
  }
  out << "alpc.report.none:\n";
  out << "  call i32 @puts(ptr @.alpc.outcome.none)\n";
  out << "  br label %alpc.exit\n\n";
  out << "alpc.exit:\n";
  out << "  ret i32 %alpc.score\n";
  out << "}\n";

  ok = true;
  return out.str();
}

}  // namespace alpc
