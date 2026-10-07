; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/branch_taken.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/branch_taken.edu"

declare i32 @printf(ptr, ...)
@.dfmt = private unnamed_addr constant [4 x i8] c"%d\0A\00"

define i32 @main() {
entry:
  %performance = alloca i32
  store i32 0, ptr %performance
  %state = alloca i32
  store i32 0, ptr %state
  store i32 60, ptr %performance
  %performance.val.0 = load i32, ptr %performance
  %cond.0 = icmp slt i32 %performance.val.0, 70
  br i1 %cond.0, label %outcome.remedial, label %after0

after0:
  br label %prog_end

outcome.remedial:
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)
  ret i32 %score
}
