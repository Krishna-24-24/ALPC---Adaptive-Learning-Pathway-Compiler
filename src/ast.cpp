#include "ast.h"

namespace alpc {

const char *set_op_str(SetOp op) {
  switch (op) {
    case OP_ADD: return "+=";
    case OP_SUB: return "-=";
    default:     return "=";
  }
}

const char *rel_op_str(RelOp op) {
  switch (op) {
    case REL_GT: return ">";
    case REL_EQ: return "==";
    case REL_NE: return "!=";
    case REL_LE: return "<=";
    case REL_GE: return ">=";
    default:     return "<";
  }
}

const char *logic_op_str(LogicOp op) { return op == LOGIC_OR ? "OR" : "AND"; }

void Compare::print(std::ostream &os) const {
  os << var << " " << rel_op_str(rel) << " " << value;
}

void Logical::print(std::ostream &os) const {
  os << "(";
  lhs->print(os);
  os << " " << logic_op_str(op) << " ";
  rhs->print(os);
  os << ")";
}

const Compare *CondBranch::simple() const { return dyn_cast<Compare>(cond.get()); }

void ProfileSet::print(std::ostream &os) const {
  os << "ProfileSet  line=" << line() << "  name=\"" << name << "\" op=\""
     << set_op_str(op) << "\" value=" << value;
}

void CondBranch::print(std::ostream &os) const {
  // A single comparison keeps the original var/rel/value form.
  if (const Compare *c = simple()) {
    os << "CondBranch  line=" << line() << "  var=\"" << c->var << "\" rel=\""
       << rel_op_str(c->rel) << "\" value=" << c->value << " target=\"" << target
       << "\"";
  } else {
    os << "CondBranch  line=" << line() << "  cond=\"";
    cond->print(os);
    os << "\" target=\"" << target << "\"";
  }
}

void Outcome::print(std::ostream &os) const {
  os << "Outcome     line=" << line() << "  name=\"" << name << "\"";
  if (adjust != 0) os << " adjust=" << (adjust > 0 ? "+" : "") << adjust;
}

void print_ast(std::ostream &os, const Program &p) {
  os << "Program binary_output=" << (p.binary_output ? 1 : 0) << "\n";
  for (const auto &stmt : p.stmts) {
    os << "  ";
    stmt->print(os);  // virtual dispatch; the node's own RTTI kind picks the form
    os << "\n";
  }
}

void print_trace(std::ostream &os, const Program &p) {
  // Walk in source order via RTTI, mirroring the bottom-up reduction sequence.
  for (const auto &stmt : p.stmts) {
    if (const auto *s = dyn_cast<ProfileSet>(stmt.get())) {
      os << "set " << s->name << " " << set_op_str(s->op) << " " << s->value
         << "\n";
    } else if (const auto *b = dyn_cast<CondBranch>(stmt.get())) {
      os << "branch ";
      if (const Compare *c = b->simple()) c->print(os); else b->cond->print(os);
      os << " -> " << b->target << "\n";
    } else if (const auto *o = dyn_cast<Outcome>(stmt.get())) {
      os << "outcome " << o->name;
      if (o->adjust > 0) os << " += " << o->adjust;
      if (o->adjust < 0) os << " -= " << -o->adjust;
      os << "\n";
    }
  }
  if (p.binary_output) os << "binary-output\n";
}

}  // namespace alpc
