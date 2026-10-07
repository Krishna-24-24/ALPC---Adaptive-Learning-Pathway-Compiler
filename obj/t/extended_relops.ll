; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/extended_relops.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/extended_relops.edu"

declare i32 @printf(ptr, ...)
@.dfmt = private unnamed_addr constant [4 x i8] c"%d\0A\00"

define i32 @main() {
entry:
  %state = alloca i32
  store i32 0, ptr %state
  %x = alloca i32
  store i32 0, ptr %x
  store i32 0, ptr %state
  store i32 5, ptr %x
  %x.val.0 = load i32, ptr %x
  %cond.0 = icmp ne i32 %x.val.0, 5
  br i1 %cond.0, label %outcome.miss, label %after0

after0:
  %x.val.1 = load i32, ptr %x
  %cond.1 = icmp sle i32 %x.val.1, 4
  br i1 %cond.1, label %outcome.miss, label %after1

after1:
  %x.val.2 = load i32, ptr %x
  %cond.2 = icmp sge i32 %x.val.2, 6
  br i1 %cond.2, label %outcome.miss, label %after2

after2:
  %x.val.3 = load i32, ptr %x
  %cond.3 = icmp sle i32 %x.val.3, 5
  br i1 %cond.3, label %outcome.hit, label %after3

after3:
  %x.val.4 = load i32, ptr %x
  %cond.4 = icmp sge i32 %x.val.4, 0
  br i1 %cond.4, label %outcome.miss, label %after4

after4:
  br label %prog_end

outcome.hit:
  %state.cur.5 = load i32, ptr %state
  %outcome.adjust.5 = add i32 %state.cur.5, 7
  store i32 %outcome.adjust.5, ptr %state
  br label %prog_end

outcome.miss:
  %state.cur.6 = load i32, ptr %state
  %outcome.adjust.6 = sub i32 %state.cur.6, 1
  store i32 %outcome.adjust.6, ptr %state
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call i32 (ptr, ...) @printf(ptr @.dfmt, i32 %score)
  ret i32 %score
}
