; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/profile_only.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/profile_only.edu"

declare i32 @printf(ptr, ...)
@.dfmt = private unnamed_addr constant [4 x i8] c"%d\0A\00"

define i32 @main() {
entry:
  %grade_level = alloca i32
  store i32 0, ptr %grade_level
  %performance = alloca i32
  store i32 0, ptr %performance
  %state = alloca i32
  store i32 0, ptr %state
  store i32 5, ptr %grade_level
  store i32 60, ptr %performance
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)
  ret i32 %score
}
