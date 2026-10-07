; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/multi_binary.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/multi_binary.edu"

declare i32 @putchar(i32)

define internal void @print_binary(i32 %val) {
entry:
  %is.zero = icmp eq i32 %val, 0
  br i1 %is.zero, label %zero, label %scan

zero:
  call i32 @putchar(i32 48)
  br label %done

scan:
  %i = phi i32 [ 31, %entry ], [ %i.dec, %scan.next ]
  %shift = lshr i32 %val, %i
  %bit = and i32 %shift, 1
  %bit.set = icmp ne i32 %bit, 0
  br i1 %bit.set, label %emit, label %scan.next

scan.next:
  %i.dec = sub i32 %i, 1
  br label %scan

emit:
  %j = phi i32 [ %i, %scan ], [ %j.dec, %emit ]
  %j.shift = lshr i32 %val, %j
  %j.bit = and i32 %j.shift, 1
  %j.ch = add i32 %j.bit, 48
  call i32 @putchar(i32 %j.ch)
  %j.dec = sub i32 %j, 1
  %j.done = icmp slt i32 %j.dec, 0
  br i1 %j.done, label %done, label %emit

done:
  call i32 @putchar(i32 10)
  ret void
}

define i32 @main() {
entry:
  %state = alloca i32
  store i32 0, ptr %state
  store i32 6, ptr %state
  %state.val.0 = load i32, ptr %state
  %cond.0 = icmp slt i32 %state.val.0, 100
  br i1 %cond.0, label %outcome.a, label %after0

after0:
  br label %prog_end

outcome.a:
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call void @print_binary(i32 %score)
  ret i32 %score
}
