; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/negative_score.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/negative_score.edu"

declare i32 @printf(ptr, ...)
@.dfmt = private unnamed_addr constant [4 x i8] c"%d\0A\00"

define i32 @main() {
entry:
  %state = alloca i32
  store i32 0, ptr %state
  store i32 3, ptr %state
  %state.cur.0 = load i32, ptr %state
  %fusion.0 = sub i32 %state.cur.0, 10
  store i32 %fusion.0, ptr %state
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)
  ret i32 %score
}
