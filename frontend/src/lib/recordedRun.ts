// Output of a real run, captured with:
//   alpc --json demo.edu && alpc --emit-ir demo.edu | lli   (prints "58" then "outcome core")
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
      "col": 1,
      "type": "OUTCOME",
      "lexeme": "OUTCOME"
    },
    {
      "line": 2,
      "col": 9,
      "type": "IDENT",
      "lexeme": "remedial"
    },
    {
      "line": 2,
      "col": 17,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 3,
      "col": 1,
      "type": "OUTCOME",
      "lexeme": "OUTCOME"
    },
    {
      "line": 3,
      "col": 9,
      "type": "IDENT",
      "lexeme": "core"
    },
    {
      "line": 3,
      "col": 13,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 4,
      "col": 1,
      "type": "OUTCOME",
      "lexeme": "OUTCOME"
    },
    {
      "line": 4,
      "col": 9,
      "type": "IDENT",
      "lexeme": "advanced"
    },
    {
      "line": 4,
      "col": 17,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 6,
      "col": 1,
      "type": "SET",
      "lexeme": "SET"
    },
    {
      "line": 6,
      "col": 5,
      "type": "IDENT",
      "lexeme": "performance"
    },
    {
      "line": 6,
      "col": 17,
      "type": "ASSIGN",
      "lexeme": "="
    },
    {
      "line": 6,
      "col": 19,
      "type": "NUMBER",
      "lexeme": "62"
    },
    {
      "line": 6,
      "col": 21,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 7,
      "col": 1,
      "type": "SET",
      "lexeme": "SET"
    },
    {
      "line": 7,
      "col": 5,
      "type": "IDENT",
      "lexeme": "mastery"
    },
    {
      "line": 7,
      "col": 13,
      "type": "ASSIGN",
      "lexeme": "="
    },
    {
      "line": 7,
      "col": 15,
      "type": "NUMBER",
      "lexeme": "58"
    },
    {
      "line": 7,
      "col": 17,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 8,
      "col": 1,
      "type": "SET",
      "lexeme": "SET"
    },
    {
      "line": 8,
      "col": 5,
      "type": "IDENT",
      "lexeme": "state"
    },
    {
      "line": 8,
      "col": 11,
      "type": "ASSIGN",
      "lexeme": "="
    },
    {
      "line": 8,
      "col": 13,
      "type": "NUMBER",
      "lexeme": "58"
    },
    {
      "line": 8,
      "col": 15,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 10,
      "col": 1,
      "type": "IF",
      "lexeme": "IF"
    },
    {
      "line": 10,
      "col": 4,
      "type": "IDENT",
      "lexeme": "performance"
    },
    {
      "line": 10,
      "col": 16,
      "type": "LT",
      "lexeme": "<"
    },
    {
      "line": 10,
      "col": 18,
      "type": "NUMBER",
      "lexeme": "50"
    },
    {
      "line": 10,
      "col": 21,
      "type": "GOTO",
      "lexeme": "GOTO"
    },
    {
      "line": 10,
      "col": 26,
      "type": "IDENT",
      "lexeme": "remedial"
    },
    {
      "line": 10,
      "col": 34,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 11,
      "col": 1,
      "type": "IF",
      "lexeme": "IF"
    },
    {
      "line": 11,
      "col": 4,
      "type": "IDENT",
      "lexeme": "performance"
    },
    {
      "line": 11,
      "col": 16,
      "type": "LT",
      "lexeme": "<"
    },
    {
      "line": 11,
      "col": 18,
      "type": "NUMBER",
      "lexeme": "80"
    },
    {
      "line": 11,
      "col": 21,
      "type": "GOTO",
      "lexeme": "GOTO"
    },
    {
      "line": 11,
      "col": 26,
      "type": "IDENT",
      "lexeme": "core"
    },
    {
      "line": 11,
      "col": 30,
      "type": "SEMI",
      "lexeme": ";"
    },
    {
      "line": 12,
      "col": 1,
      "type": "IF",
      "lexeme": "IF"
    },
    {
      "line": 12,
      "col": 4,
      "type": "IDENT",
      "lexeme": "performance"
    },
    {
      "line": 12,
      "col": 16,
      "type": "GE",
      "lexeme": ">="
    },
    {
      "line": 12,
      "col": 19,
      "type": "NUMBER",
      "lexeme": "80"
    },
    {
      "line": 12,
      "col": 22,
      "type": "GOTO",
      "lexeme": "GOTO"
    },
    {
      "line": 12,
      "col": 27,
      "type": "IDENT",
      "lexeme": "advanced"
    },
    {
      "line": 12,
      "col": 35,
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
  "irSource": "; ModuleID = 'trees.edu'\nsource_filename = \"trees.edu\"\n\ndeclare i32 @printf(ptr, ...)\n@.dfmt = private unnamed_addr constant [4 x i8] c\"%d\\0A\\00\"\n\ndeclare i32 @puts(ptr)\n@.alpc.outcome.0 = private unnamed_addr constant [17 x i8] c\"outcome remedial\\00\"\n@.alpc.outcome.1 = private unnamed_addr constant [13 x i8] c\"outcome core\\00\"\n@.alpc.outcome.2 = private unnamed_addr constant [17 x i8] c\"outcome advanced\\00\"\n@.alpc.outcome.none = private unnamed_addr constant [13 x i8] c\"outcome none\\00\"\n\ndefine i32 @main() {\nentry:\n  %mastery = alloca i32\n  store i32 0, ptr %mastery\n  %performance = alloca i32\n  store i32 0, ptr %performance\n  %state = alloca i32\n  store i32 0, ptr %state\n  store i32 62, ptr %performance\n  store i32 58, ptr %mastery\n  store i32 58, ptr %state\n  %performance.val.0 = load i32, ptr %performance\n  %cond.0 = icmp slt i32 %performance.val.0, 50\n  br i1 %cond.0, label %outcome.remedial, label %after0\n\nafter0:\n  %performance.val.1 = load i32, ptr %performance\n  %cond.1 = icmp slt i32 %performance.val.1, 80\n  br i1 %cond.1, label %outcome.core, label %after1\n\nafter1:\n  %performance.val.2 = load i32, ptr %performance\n  %cond.2 = icmp sge i32 %performance.val.2, 80\n  br i1 %cond.2, label %outcome.advanced, label %after2\n\nafter2:\n  br label %prog_end\n\noutcome.remedial:\n  br label %prog_end\n\noutcome.core:\n  br label %prog_end\n\noutcome.advanced:\n  br label %prog_end\n\nprog_end:\n  %alpc.selected = phi i32 [ -1, %after2 ], [ 0, %outcome.remedial ], [ 1, %outcome.core ], [ 2, %outcome.advanced ]\n  %alpc.score = load i32, ptr %state\n  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %alpc.score)\n  switch i32 %alpc.selected, label %alpc.report.none [ i32 0, label %alpc.report.0 i32 1, label %alpc.report.1 i32 2, label %alpc.report.2 ]\n\nalpc.report.0:\n  call i32 @puts(ptr @.alpc.outcome.0)\n  br label %alpc.exit\n\nalpc.report.1:\n  call i32 @puts(ptr @.alpc.outcome.1)\n  br label %alpc.exit\n\nalpc.report.2:\n  call i32 @puts(ptr @.alpc.outcome.2)\n  br label %alpc.exit\n\nalpc.report.none:\n  call i32 @puts(ptr @.alpc.outcome.none)\n  br label %alpc.exit\n\nalpc.exit:\n  ret i32 %alpc.score\n}\n",
  "astText": "Program binary_output=0\n  Outcome     line=2  name=\"remedial\"\n  Outcome     line=3  name=\"core\"\n  Outcome     line=4  name=\"advanced\"\n  ProfileSet  line=6  name=\"performance\" op=\"=\" value=62\n  ProfileSet  line=7  name=\"mastery\" op=\"=\" value=58\n  ProfileSet  line=8  name=\"state\" op=\"=\" value=58\n  CondBranch  line=10  var=\"performance\" rel=\"<\" value=50 target=\"remedial\"\n  CondBranch  line=11  var=\"performance\" rel=\"<\" value=80 target=\"core\"\n  CondBranch  line=12  var=\"performance\" rel=\">=\" value=80 target=\"advanced\"\n"
};
