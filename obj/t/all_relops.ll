; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/all_relops.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/all_relops.edu"

declare i32 @printf(ptr, ...)
@.dfmt = private unnamed_addr constant [4 x i8] c"%d\0A\00"

define i32 @main() {
entry:
  %state = alloca i32
  store i32 0, ptr %state
  %x = alloca i32
  store i32 0, ptr %x
  store i32 5, ptr %x
  %x.val.0 = load i32, ptr %x
  %cond.0 = icmp slt i32 %x.val.0, 10
  br i1 %cond.0, label %outcome.a, label %after0

after0:
  %x.val.1 = load i32, ptr %x
  %cond.1 = icmp sgt i32 %x.val.1, 1
  br i1 %cond.1, label %outcome.b, label %after1

after1:
  %x.val.2 = load i32, ptr %x
  %cond.2 = icmp eq i32 %x.val.2, 5
  br i1 %cond.2, label %outcome.c, label %after2

after2:
  br label %prog_end

outcome.a:
  br label %prog_end

outcome.b:
  br label %prog_end

outcome.c:
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)
  ret i32 %score
}
