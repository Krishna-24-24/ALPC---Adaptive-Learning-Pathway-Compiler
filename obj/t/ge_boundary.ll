; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/ge_boundary.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/ge_boundary.edu"

declare i32 @printf(ptr, ...)
@.dfmt = private unnamed_addr constant [4 x i8] c"%d\0A\00"

define i32 @main() {
entry:
  %performance = alloca i32
  store i32 0, ptr %performance
  %state = alloca i32
  store i32 0, ptr %state
  store i32 0, ptr %state
  store i32 85, ptr %performance
  %performance.val.0 = load i32, ptr %performance
  %cond.0 = icmp slt i32 %performance.val.0, 85
  br i1 %cond.0, label %outcome.below, label %after0

after0:
  %performance.val.1 = load i32, ptr %performance
  %cond.1 = icmp sge i32 %performance.val.1, 85
  br i1 %cond.1, label %outcome.advanced, label %after1

after1:
  br label %prog_end

outcome.below:
  %state.cur.2 = load i32, ptr %state
  %outcome.adjust.2 = sub i32 %state.cur.2, 1
  store i32 %outcome.adjust.2, ptr %state
  br label %prog_end

outcome.advanced:
  %state.cur.3 = load i32, ptr %state
  %outcome.adjust.3 = add i32 %state.cur.3, 3
  store i32 %outcome.adjust.3, ptr %state
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)
  ret i32 %score
}
