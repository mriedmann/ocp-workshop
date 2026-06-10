#!/bin/bash
# Inspect the current shell's process information via /proc

echo "=== PID and PPID ==="
echo "PID:  $$"
echo "PPID: $PPID"

echo ""
echo "=== Open file descriptors ==="
ls -la /proc/$$/fd

echo ""
echo "=== First 5 memory regions ==="
head -5 /proc/$$/maps

echo ""
echo "=== Process status ==="
grep -E "^(Name|Pid|PPid|VmRSS|Threads):" /proc/$$/status
