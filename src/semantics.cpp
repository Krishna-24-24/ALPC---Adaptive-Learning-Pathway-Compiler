#include "semantics.h"

#include <map>
#include <set>
#include <string>

#include "diagnostics.h"

namespace alpc {

namespace {
const char *const kStateVar = "state";
}

int check_program(const Program &p) {
  std::map<std::string, int> outcomes;  // declared outcome name -> adjust
  std::set<std::string> vars;      // profile vars + `state`, once SET
  const int before = error_count();

  // Every outcome name declared anywhere in the program, so a bad GOTO target
  // can be classified: declared later (Backward Design violation) vs. never
  // declared at all (unknown outcome).
  std::set<std::string> all_outcomes;
  for (const auto &node : p.stmts) {
    if (const auto *o = dyn_cast<Outcome>(node.get())) all_outcomes.insert(o->name);
  }

  for (const auto &node : p.stmts) {
    if (const auto *o = dyn_cast<Outcome>(node.get())) {
      if (o->name == kStateVar) {
        reportf(DK_SEMANTIC, "reserved-name", o->line(), o->col(),
                "'%s' is reserved and cannot be an outcome name",
                kStateVar);
      } else if (!outcomes.emplace(o->name, o->adjust).second) {
        reportf(DK_SEMANTIC, "duplicate-outcome", o->line(), o->col(),
                "outcome '%s' is already declared", o->name.c_str());
      }
    } else if (const auto *s = dyn_cast<ProfileSet>(node.get())) {
      if (s->op != OP_ASSIGN && vars.find(s->name) == vars.end()) {
        reportf(DK_SEMANTIC, "update-before-set", s->line(), s->col(),
                "'%s' is updated before it is set", s->name.c_str());
      }
      vars.insert(s->name);
    } else if (const auto *b = dyn_cast<CondBranch>(node.get())) {
      for_each_compare(b->cond.get(), [&](const Compare &c) {
        if (vars.find(c.var) == vars.end()) {
          reportf(DK_SEMANTIC, "use-before-set", c.line(), c.col(),
                  "'%s' is used in a condition before it is set",
                  c.var.c_str());
        }
      });
      auto target = outcomes.find(b->target);
      if (target == outcomes.end() && all_outcomes.count(b->target) == 0) {
        reportf(DK_SEMANTIC, "unknown-outcome", b->line(), b->target_col,
                "Backward Design violation: '%s' is referenced but never "
                "declared as an OUTCOME (unknown outcome)",
                b->target.c_str());
      } else if (target == outcomes.end()) {
        reportf(DK_SEMANTIC, "backward-design", b->line(), b->target_col,
                "Backward Design violation: '%s' is referenced before it is "
                "declared as an OUTCOME",
                b->target.c_str());
      } else if (target->second != 0 && vars.find(kStateVar) == vars.end()) {
        // Same rule as update-before-declare, applied at the jump site.
        reportf(DK_SEMANTIC, "adjust-without-state", b->line(), b->target_col,
                "outcome '%s' adjusts '%s', but '%s' is not set before this "
                "branch",
                b->target.c_str(), kStateVar, kStateVar);
      }
    }
  }

  return error_count() - before;
}

}  // namespace alpc
