// Output of a real run, captured with:
//   alpc --json demo.edu && alpc --emit-ir demo.edu | lli
// Shown on the landing page when the backend is not reachable, so the page
// never displays compiler output that the compiler did not produce.
import type { AlpcCompileResult } from './api';

export const DEMO_TEMPLATE = (performance: number) =>
  `# Demo Student, Data Structures: Trees
OUTCOME remedial;
OUTCOME core;
OUTCOME advanced;

SET performance = ${performance};
SET mastery = 58;
SET state = 58;

IF performance < 50 GOTO remedial;
IF performance < 80 GOTO core;
IF performance >= 80 GOTO advanced;
`;

export const RECORDED_PERFORMANCE = 62;

export const RECORDED_RUN: Pick<AlpcCompileResult, 'success' | 'outcome' | 'alignmentScore' | 'binaryOutput' | 'tokens' | 'traceLines' | 'irSource'> & { astText: string } = {
  "success": true,
  "outcome": "core",
  "alignmentScore": 58,
  "binaryOutput": null,
  "tokens": [
    {
      "line": 2,
      "type": "OUTCOME",
      "lexeme": "OUTCOME"
    },
    {
      "line": 2,
      "type": "IDENT",
      "lexeme": "remedial"
    },
    {
      "line": 2,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 3,
      "type": "OUTCOME",
      "lexeme": "OUTCOME"
    },
    {
      "line": 3,
      "type": "IDENT",
      "lexeme": "core"
    },
    {
      "line": 3,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 4,
      "type": "OUTCOME",
      "lexeme": "OUTCOME"
    },
    {
      "line": 4,
      "type": "IDENT",
      "lexeme": "advanced"
    },
    {
      "line": 4,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 6,
      "type": "SET",
      "lexeme": "SET"
    },
    {
      "line": 6,
      "type": "IDENT",
      "lexeme": "performance"
    },
    {
      "line": 6,
      "type": "ASSIGN",
      "lexeme": "="
    },
    {
      "line": 6,
      "type": "NUMBER",
      "lexeme": "62"
    },
    {
      "line": 6,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 7,
      "type": "SET",
      "lexeme": "SET"
    },
    {
      "line": 7,
      "type": "IDENT",
      "lexeme": "mastery"
    },
    {
      "line": 7,
      "type": "ASSIGN",
      "lexeme": "="
    },
    {
      "line": 7,
      "type": "NUMBER",
      "lexeme": "58"
    },
    {
      "line": 7,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 8,
      "type": "SET",
      "lexeme": "SET"
    },
    {
      "line": 8,
      "type": "IDENT",
      "lexeme": "state"
    },
    {
      "line": 8,
      "type": "ASSIGN",
      "lexeme": "="
    },
    {
      "line": 8,
      "type": "NUMBER",
      "lexeme": "58"
    },
    {
      "line": 8,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 10,
      "type": "IF",
      "lexeme": "IF"
    },
    {
      "line": 10,
      "type": "IDENT",
      "lexeme": "performance"
    },
    {
      "line": 10,
      "type": "LT",
      "lexeme": "<"
    },
    {
      "line": 10,
      "type": "NUMBER",
      "lexeme": "50"
    },
    {
      "line": 10,
      "type": "GOTO",
      "lexeme": "GOTO"
    },
    {
      "line": 10,
      "type": "IDENT",
      "lexeme": "remedial"
    },
    {
      "line": 10,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 11,
      "type": "IF",
      "lexeme": "IF"
    },
    {
      "line": 11,
      "type": "IDENT",
      "lexeme": "performance"
    },
    {
      "line": 11,
      "type": "LT",
      "lexeme": "<"
    },
    {
      "line": 11,
      "type": "NUMBER",
      "lexeme": "80"
    },
    {
      "line": 11,
      "type": "GOTO",
      "lexeme": "GOTO"
    },
    {
      "line": 11,
      "type": "IDENT",
      "lexeme": "core"
    },
    {
      "line": 11,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 12,
      "type": "IF",
      "lexeme": "IF"
    },
    {
      "line": 12,
      "type": "IDENT",
      "lexeme": "performance"
    },
    {
      "line": 12,
      "type": "GE",
      "lexeme": ">="
    },
    {
      "line": 12,
      "type": "NUMBER",
      "lexeme": "80"
    },
    {
      "line": 12,
      "type": "GOTO",
      "lexeme": "GOTO"
    },
    {
      "line": 12,
      "type": "IDENT",
      "lexeme": "advanced"
    },
    {
      "line": 12,
      "type": "SEMI",
      "lexeme": ";"
    }
  ],
  "traceLines": [
    "outcome remedial",
    "outcome core",
    "outcome advanced",
    "set performance = 62",
    "set mastery = 58",
    "set state = 58",
    "branch performance < 50 -> remedial",
    "branch performance < 80 -> core",
    "branch performance >= 80 -> advanced"
  ],
  "irSource": "; ModuleID = 'trees.edu'\nsource_filename = \"trees.edu\"\n\ndeclare i32 @printf(ptr, ...)\n@.dfmt = private unnamed_addr constant [4 x i8] c\"%d\\0A\\00\"\n\ndefine i32 @main() {\nentry:\n  %mastery = alloca i32\n  store i32 0, ptr %mastery\n  %performance = alloca i32\n  store i32 0, ptr %performance\n  %state = alloca i32\n  store i32 0, ptr %state\n  store i32 62, ptr %performance\n  store i32 58, ptr %mastery\n  store i32 58, ptr %state\n  %performance.val.0 = load i32, ptr %performance\n  %cond.0 = icmp slt i32 %performance.val.0, 50\n  br i1 %cond.0, label %outcome.remedial, label %after0\n\nafter0:\n  %performance.val.1 = load i32, ptr %performance\n  %cond.1 = icmp slt i32 %performance.val.1, 80\n  br i1 %cond.1, label %outcome.core, label %after1\n\nafter1:\n  %performance.val.2 = load i32, ptr %performance\n  %cond.2 = icmp sge i32 %performance.val.2, 80\n  br i1 %cond.2, label %outcome.advanced, label %after2\n\nafter2:\n  br label %prog_end\n\noutcome.remedial:\n  br label %prog_end\n\noutcome.core:\n  br label %prog_end\n\noutcome.advanced:\n  br label %prog_end\n\nprog_end:\n  %score = load i32, ptr %state\n  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)\n  ret i32 %score\n}\n",
  "astText": "Program binary_output=0\n  Outcome     line=2  name=\"remedial\"\n  Outcome     line=3  name=\"core\"\n  Outcome     line=4  name=\"advanced\"\n  ProfileSet  line=6  name=\"performance\" op=\"=\" value=62\n  ProfileSet  line=7  name=\"mastery\" op=\"=\" value=58\n  ProfileSet  line=8  name=\"state\" op=\"=\" value=58\n  CondBranch  line=10  var=\"performance\" rel=\"<\" value=50 target=\"remedial\"\n  CondBranch  line=11  var=\"performance\" rel=\"<\" value=80 target=\"core\"\n  CondBranch  line=12  var=\"performance\" rel=\">=\" value=80 target=\"advanced\"\n"
};
