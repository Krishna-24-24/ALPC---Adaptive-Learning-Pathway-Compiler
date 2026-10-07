; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/ne_taken.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/ne_taken.edu"

declare i32 @printf(ptr, ...)
@.dfmt = private unnamed_addr constant [4 x i8] c"%d\0A\00"

define i32 @main() {
entry:
  %attempts = alloca i32
  store i32 0, ptr %attempts
  %state = alloca i32
  store i32 0, ptr %state
  store i32 0, ptr %state
  store i32 3, ptr %attempts
  %attempts.val.0 = load i32, ptr %attempts
  %cond.0 = icmp ne i32 %attempts.val.0, 1
  br i1 %cond.0, label %outcome.other, label %after0

after0:
  %attempts.val.1 = load i32, ptr %attempts
  %cond.1 = icmp eq i32 %attempts.val.1, 1
  br i1 %cond.1, label %outcome.same, label %after1

after1:
  br label %prog_end

outcome.other:
  %state.cur.2 = load i32, ptr %state
  %outcome.adjust.2 = add i32 %state.cur.2, 4
  store i32 %outcome.adjust.2, ptr %state
  br label %prog_end

outcome.same:
  %state.cur.3 = load i32, ptr %state
  %outcome.adjust.3 = sub i32 %state.cur.3, 1
  store i32 %outcome.adjust.3, ptr %state
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)
  ret i32 %score
}
