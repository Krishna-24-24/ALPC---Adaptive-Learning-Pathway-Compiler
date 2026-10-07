#ifndef ALPC_AST_H
#define ALPC_AST_H

// Path-Lang AST (Exp 8). Three node kinds, one per curriculum stage
// (SPEC.md 2). Type identification uses the LLVM-style RTTI idiom
// (llvm.org/docs/HowToSetUpLLVMStyleRTTI.html): a NodeKind tag set by the
// base constructor, a static classof() per class, and free isa<>/cast<>/
// dyn_cast<>. No dynamic_cast, no -frtti (that is the point of Exp 8).

#include <cassert>
#include <memory>
#include <ostream>
#include <string>
#include <vector>

namespace alpc {

enum SetOp { OP_ASSIGN = 0, OP_ADD = 1, OP_SUB = 2 };
enum RelOp {
  REL_LT = 0, REL_GT = 1, REL_EQ = 2,
  REL_NE = 3, REL_LE = 4, REL_GE = 5,
};

const char *set_op_str(SetOp op);  // "=", "+=", "-="
const char *rel_op_str(RelOp op);  // "<", ">", "==", "!=", "<=", ">="

// Enum order is a preorder walk of the hierarchy so classof() range checks
// stay valid if a kind ever gains children.
enum NodeKind {
  NK_ProfileSet,
  NK_CondBranch,
  NK_Outcome,
  // Condition nodes: the test inside an IF, never a statement on their own.
  NK_Compare,
  NK_Logical,
};

enum LogicOp { LOGIC_AND = 0, LOGIC_OR = 1 };
const char *logic_op_str(LogicOp op);  // "AND", "OR"

class ASTNode {
 public:
  virtual ~ASTNode() = default;
  ASTNode(const ASTNode &) = delete;
  ASTNode &operator=(const ASTNode &) = delete;

  NodeKind kind() const { return kind_; }
  int line() const { return line_; }
  int col() const { return col_; }  // 1-based column of the node's name; 0 = unknown

  // RTTI-driven pretty-print of this node (no trailing newline).
  virtual void print(std::ostream &os) const = 0;

 protected:
  ASTNode(NodeKind k, int line, int col) : kind_(k), line_(line), col_(col) {}

 private:
  const NodeKind kind_;
  const int line_;
  const int col_;
};

// SET <name> = / += / -= <value>
class ProfileSet final : public ASTNode {
 public:
  ProfileSet(int line, std::string name, SetOp op, int value, int col = 0)
      : ASTNode(NK_ProfileSet, line, col),
        name(std::move(name)),
        op(op),
        value(value) {}

  static bool classof(const ASTNode *n) { return n->kind() == NK_ProfileSet; }
  void print(std::ostream &os) const override;

  const std::string name;
  const SetOp op;
  const int value;
};

// <var> <rel> <value>, one comparison inside a condition.
class Compare final : public ASTNode {
 public:
  Compare(int line, std::string var, RelOp rel, int value, int col = 0)
      : ASTNode(NK_Compare, line, col), var(std::move(var)), rel(rel), value(value) {}

  static bool classof(const ASTNode *n) { return n->kind() == NK_Compare; }
  void print(std::ostream &os) const override;  // "perf < 70"

  const std::string var;
  const RelOp rel;
  const int value;
};

// <lhs> AND <rhs> | <lhs> OR <rhs>. AND binds tighter than OR; both are
// short-circuit and left-associative.
class Logical final : public ASTNode {
 public:
  Logical(int line, LogicOp op, std::unique_ptr<ASTNode> lhs, std::unique_ptr<ASTNode> rhs,
          int col = 0)
      : ASTNode(NK_Logical, line, col), op(op), lhs(std::move(lhs)), rhs(std::move(rhs)) {}

  static bool classof(const ASTNode *n) { return n->kind() == NK_Logical; }
  void print(std::ostream &os) const override;  // "(a < 1 AND b > 2)"

  const LogicOp op;
  const std::unique_ptr<ASTNode> lhs;  // Compare or Logical
  const std::unique_ptr<ASTNode> rhs;
};

// IF <condition> GOTO <target>
class CondBranch final : public ASTNode {
 public:
  // `cond` is a Compare or a Logical tree; the node's column is the first
  // condition variable, `target_col` the GOTO target.
  CondBranch(int line, std::unique_ptr<ASTNode> cond, std::string target, int col = 0,
             int target_col = 0)
      : ASTNode(NK_CondBranch, line, col),
        cond(std::move(cond)),
        target(std::move(target)),
        target_col(target_col) {}

  // IF <var> <rel> <value> GOTO <target>: the common single-comparison form.
  CondBranch(int line, std::string var, RelOp rel, int value, std::string target,
             int col = 0, int target_col = 0)
      : CondBranch(line, std::make_unique<Compare>(line, std::move(var), rel, value, col),
                   std::move(target), col, target_col) {}

  static bool classof(const ASTNode *n) { return n->kind() == NK_CondBranch; }
  void print(std::ostream &os) const override;

  // The comparison when the condition is a single one, else nullptr.
  const Compare *simple() const;

  const std::unique_ptr<ASTNode> cond;
  const std::string target;
  const int target_col;
};

// Calls f(const Compare&) for every comparison in a condition, left to right.
template <class F>
void for_each_compare(const ASTNode *cond, F &&f);

// OUTCOME <name> [ += n | -= n ]
// `adjust` is the signed amount applied to `state` when a GOTO reaches this
// outcome (SPEC 2.5); 0 for a plain declaration.
class Outcome final : public ASTNode {
 public:
  Outcome(int line, std::string name, int adjust = 0, int col = 0)
      : ASTNode(NK_Outcome, line, col), name(std::move(name)), adjust(adjust) {}

  static bool classof(const ASTNode *n) { return n->kind() == NK_Outcome; }
  void print(std::ostream &os) const override;

  const std::string name;
  const int adjust;
};

// LLVM-style free functions. T must expose `static bool classof(const ASTNode*)`.
template <class T>
bool isa(const ASTNode *n) {
  return n != nullptr && T::classof(n);
}

template <class T>
const T *dyn_cast(const ASTNode *n) {
  return isa<T>(n) ? static_cast<const T *>(n) : nullptr;
}

template <class T>
const T *cast(const ASTNode *n) {
  assert(isa<T>(n) && "alpc::cast<> on the wrong NodeKind");
  return static_cast<const T *>(n);
}

template <class F>
void for_each_compare(const ASTNode *cond, F &&f) {
  if (const auto *c = dyn_cast<Compare>(cond)) {
    f(*c);
  } else if (const auto *l = dyn_cast<Logical>(cond)) {
    for_each_compare(l->lhs.get(), f);
    for_each_compare(l->rhs.get(), f);
  }
}

// The whole compiled program. Owns its statements; no cross-links, so no cycles.
struct Program {
  std::vector<std::unique_ptr<ASTNode>> stmts;
  bool binary_output = false;  // any statement ended with "; b" (SPEC 2.5)
};

// `--dump-ast` (Exp 8) and `--parse-trace` (Exp 7) renderings.
void print_ast(std::ostream &os, const Program &p);
void print_trace(std::ostream &os, const Program &p);

}  // namespace alpc

#endif  // ALPC_AST_H
