; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/prd_pathway_90.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/prd_pathway_90.edu"

declare i32 @printf(ptr, ...)
@.dfmt = private unnamed_addr constant [4 x i8] c"%d\0A\00"

define i32 @main() {
entry:
  %mastery = alloca i32
  store i32 0, ptr %mastery
  %performance = alloca i32
  store i32 0, ptr %performance
  %state = alloca i32
  store i32 0, ptr %state
  store i32 90, ptr %performance
  store i32 58, ptr %mastery
  store i32 0, ptr %state
  %performance.val.0 = load i32, ptr %performance
  %cond.0 = icmp slt i32 %performance.val.0, 50
  br i1 %cond.0, label %outcome.remedial, label %after0

after0:
  %performance.val.1 = load i32, ptr %performance
  %cond.1 = icmp slt i32 %performance.val.1, 80
  br i1 %cond.1, label %outcome.core, label %after1

after1:
  %performance.val.2 = load i32, ptr %performance
  %cond.2 = icmp sge i32 %performance.val.2, 80
  br i1 %cond.2, label %outcome.advanced, label %after2

after2:
  br label %prog_end

outcome.remedial:
  %state.cur.3 = load i32, ptr %state
  %outcome.adjust.3 = add i32 %state.cur.3, 1
  store i32 %outcome.adjust.3, ptr %state
  br label %prog_end

outcome.core:
  %state.cur.4 = load i32, ptr %state
  %outcome.adjust.4 = add i32 %state.cur.4, 2
  store i32 %outcome.adjust.4, ptr %state
  br label %prog_end

outcome.advanced:
  %state.cur.5 = load i32, ptr %state
  %outcome.adjust.5 = add i32 %state.cur.5, 3
  store i32 %outcome.adjust.5, ptr %state
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)
  ret i32 %score
}
