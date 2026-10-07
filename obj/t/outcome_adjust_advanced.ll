; ModuleID = 'C:/Users/chaks/ALPC/tests/fixtures/valid/outcome_adjust_advanced.edu'
source_filename = "C:/Users/chaks/ALPC/tests/fixtures/valid/outcome_adjust_advanced.edu"

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
  %performance = alloca i32
  store i32 0, ptr %performance
  %state = alloca i32
  store i32 0, ptr %state
  store i32 90, ptr %performance
  store i32 0, ptr %state
  %state.cur.0 = load i32, ptr %state
  %fusion.0 = add i32 %state.cur.0, 15
  store i32 %fusion.0, ptr %state
  %performance.val.1 = load i32, ptr %performance
  %cond.1 = icmp slt i32 %performance.val.1, 70
  br i1 %cond.1, label %outcome.remedial, label %after0

after0:
  %performance.val.2 = load i32, ptr %performance
  %cond.2 = icmp sgt i32 %performance.val.2, 85
  br i1 %cond.2, label %outcome.advanced, label %after1

after1:
  %performance.val.3 = load i32, ptr %performance
  %cond.3 = icmp slt i32 %performance.val.3, 1000
  br i1 %cond.3, label %outcome.core, label %after2

after2:
  br label %prog_end

outcome.remedial:
  %state.cur.4 = load i32, ptr %state
  %outcome.adjust.4 = sub i32 %state.cur.4, 5
  store i32 %outcome.adjust.4, ptr %state
  br label %prog_end

outcome.core:
  br label %prog_end

outcome.advanced:
  %state.cur.5 = load i32, ptr %state
  %outcome.adjust.5 = add i32 %state.cur.5, 10
  store i32 %outcome.adjust.5, ptr %state
  br label %prog_end

prog_end:
  %score = load i32, ptr %state
  call void @print_binary(i32 %score)
  ret i32 %score
}
