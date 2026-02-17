# Linux for QA Engineers - Interview Question Bank

## Table of Contents
1. [Linux Fundamentals](#linux-fundamentals)
2. [File System Navigation](#file-system-navigation)
3. [File Operations](#file-operations)
4. [Text Processing Commands](#text-processing-commands)
5. [Process Management](#process-management)
6. [Permissions & Ownership](#permissions--ownership)
7. [Log Analysis](#log-analysis)
8. [Networking Commands](#networking-commands)
9. [Shell Scripting Basics](#shell-scripting-basics)
10. [Real Interview Scenarios](#real-interview-scenarios)

---

## Linux Fundamentals

### Beginner Questions

#### Q1: What is Linux?
**Answer:**

Linux is a free, open-source operating system based on Unix, widely used in servers, cloud environments, and testing infrastructure.

**Why Linux for QA:**
- Most servers run Linux
- CI/CD tools run on Linux
- Log analysis and debugging
- Automation scripts
- Docker/Kubernetes environments

---

#### Q2: What is a Shell?
**Answer:**

A Shell is a command-line interface to interact with the operating system.

**Common Shells:**
| Shell | Description |
|-------|-------------|
| bash | Bourne Again Shell (most common) |
| sh | Original Bourne Shell |
| zsh | Z Shell (macOS default) |
| csh | C Shell |
| ksh | Korn Shell |

**Check current shell:**
```bash
echo $SHELL
# /bin/bash
```

---

#### Q3: What is the Linux file system structure?
**Answer:**

```
/
├── bin     # Essential binaries (ls, cp, mv)
├── boot    # Boot loader files
├── dev     # Device files
├── etc     # Configuration files
├── home    # User home directories
│   └── user1
├── lib     # System libraries
├── opt     # Optional software
├── proc    # Process information
├── root    # Root user's home
├── tmp     # Temporary files
├── usr     # User programs
│   ├── bin
│   └── local
├── var     # Variable data (logs, databases)
│   └── log # Log files
└── mnt     # Mount points
```

---

## File System Navigation

### Q4: Basic navigation commands
**Answer:**

```bash
# Print working directory
pwd
# /home/user

# List files and directories
ls              # Basic list
ls -l           # Long format (permissions, size, date)
ls -la          # Include hidden files
ls -lh          # Human-readable sizes
ls -lt          # Sort by modification time
ls -lS          # Sort by size

# Change directory
cd /var/log     # Absolute path
cd logs         # Relative path
cd ~            # Home directory
cd -            # Previous directory
cd ..           # Parent directory
cd ../..        # Two levels up

# Create directory
mkdir testdir
mkdir -p parent/child/grandchild    # Create nested dirs

# Remove directory
rmdir emptydir           # Remove empty directory
rm -r dirname            # Remove directory and contents
rm -rf dirname           # Force remove (CAREFUL!)
```

**What Interviewer Expects:**
- Know difference between absolute (/home/user) and relative (./folder) paths
- Understand -l, -a, -h flags

---

### Q5: How do you find files in Linux?
**Answer:**

**Using `find`:**
```bash
# Find by name
find /var/log -name "*.log"
find . -name "test.txt"

# Find by name (case-insensitive)
find . -iname "test.txt"

# Find by type
find . -type f           # Files only
find . -type d           # Directories only

# Find by size
find . -size +10M        # Larger than 10MB
find . -size -1K         # Smaller than 1KB

# Find by modification time
find . -mtime -7         # Modified in last 7 days
find . -mtime +30        # Modified more than 30 days ago

# Find and execute command
find . -name "*.log" -exec rm {} \;
find . -name "*.txt" -exec grep "error" {} \;

# Find by permissions
find . -perm 755

# Combine conditions
find . -name "*.log" -size +1M -mtime -7
```

**Using `locate` (faster, uses database):**
```bash
locate test.txt
updatedb              # Update database
```

---

### Q6: How do you check disk usage?
**Answer:**

```bash
# Disk free space
df -h                    # Human-readable
df -h /home              # Specific partition

# Directory size
du -sh /var/log          # Summary of directory
du -sh *                 # Size of each item in current dir
du -h --max-depth=1      # One level deep

# Find large files
find / -type f -size +100M 2>/dev/null

# Check inodes
df -i
```

---

## File Operations

### Q7: File manipulation commands
**Answer:**

```bash
# Create file
touch newfile.txt
echo "content" > file.txt     # Create with content
cat > file.txt                # Type content, Ctrl+D to save

# Copy file
cp source.txt destination.txt
cp -r sourcedir destdir       # Copy directory
cp -p file.txt backup.txt     # Preserve permissions

# Move/Rename file
mv oldname.txt newname.txt    # Rename
mv file.txt /path/to/dir/     # Move

# Remove file
rm file.txt
rm -f file.txt                # Force (no prompt)
rm -i file.txt                # Interactive (prompt)

# View file content
cat file.txt                  # Entire file
head file.txt                 # First 10 lines
head -n 20 file.txt           # First 20 lines
tail file.txt                 # Last 10 lines
tail -n 50 file.txt           # Last 50 lines
tail -f file.txt              # Follow (real-time)
less file.txt                 # Paginated view
more file.txt                 # Simple paginated view

# File information
file document.pdf             # File type
stat file.txt                 # Detailed info
wc file.txt                   # Word, line, character count
wc -l file.txt                # Line count only
```

---

### Q8: How do you compare files?
**Answer:**

```bash
# diff - show differences
diff file1.txt file2.txt
diff -u file1.txt file2.txt    # Unified format
diff -y file1.txt file2.txt    # Side by side

# Output meaning:
# < line only in file1
# > line only in file2
# c = changed
# a = added
# d = deleted

# cmp - byte by byte comparison
cmp file1.txt file2.txt

# comm - compare sorted files
comm file1.txt file2.txt
# Column 1: only in file1
# Column 2: only in file2
# Column 3: in both
```

---

## Text Processing Commands

### Q9: Explain grep with examples
**Answer:**

`grep` searches for patterns in files.

```bash
# Basic search
grep "error" logfile.txt

# Case-insensitive
grep -i "error" logfile.txt

# Line number
grep -n "error" logfile.txt

# Count matches
grep -c "error" logfile.txt

# Recursive search
grep -r "error" /var/log/
grep -rn "error" /var/log/     # With line numbers

# Invert match (NOT containing)
grep -v "debug" logfile.txt

# Multiple patterns
grep -E "error|warning|fatal" logfile.txt
grep "error\|warning" logfile.txt

# Whole word match
grep -w "error" logfile.txt

# Context lines
grep -B 3 "error" logfile.txt   # 3 lines Before
grep -A 3 "error" logfile.txt   # 3 lines After
grep -C 3 "error" logfile.txt   # 3 lines Context (both)

# Regular expressions
grep "^Error" logfile.txt       # Lines starting with Error
grep "error$" logfile.txt       # Lines ending with error
grep "err.r" logfile.txt        # err + any char + r
grep "error[0-9]" logfile.txt   # error followed by digit

# Show only matching part
grep -o "error[0-9]*" logfile.txt

# Files containing match
grep -l "error" *.log

# Files NOT containing match
grep -L "error" *.log
```

**What Interviewer Expects:**
- Know common flags: -i, -n, -r, -v, -c
- Understand basic regex

---

### Q10: Explain awk with examples
**Answer:**

`awk` is a powerful text processing tool.

```bash
# Print specific columns
awk '{print $1}' file.txt              # First column
awk '{print $1, $3}' file.txt          # First and third
awk '{print $NF}' file.txt             # Last column
awk '{print $(NF-1)}' file.txt         # Second last

# Custom delimiter
awk -F ':' '{print $1}' /etc/passwd    # Colon separator
awk -F ',' '{print $2}' data.csv       # CSV

# Conditions
awk '$3 > 100 {print $1, $3}' file.txt # If column 3 > 100
awk '/error/ {print}' logfile.txt       # Lines with "error"
awk 'NR==5 {print}' file.txt           # Print line 5
awk 'NR>=5 && NR<=10' file.txt         # Lines 5-10

# Built-in variables
awk '{print NR, $0}' file.txt          # NR = line number
awk 'END {print NR}' file.txt          # Total lines
awk '{print NF}' file.txt              # NF = number of fields

# Calculations
awk '{sum += $3} END {print sum}' file.txt      # Sum of column 3
awk '{sum += $3} END {print sum/NR}' file.txt   # Average

# Format output
awk '{printf "%-10s %5d\n", $1, $3}' file.txt

# Multiple conditions
awk '$2 == "ERROR" && $3 > 100 {print}' log.txt
```

**Example - Extract from log:**
```bash
# Log format: 2024-01-15 10:30:45 ERROR Database connection failed
awk '/ERROR/ {print $1, $2, $4}' app.log

# Count errors per day
awk '/ERROR/ {count[$1]++} END {for (d in count) print d, count[d]}' app.log
```

---

### Q11: Explain sed with examples
**Answer:**

`sed` is a stream editor for text transformation.

```bash
# Search and replace
sed 's/old/new/' file.txt              # First occurrence per line
sed 's/old/new/g' file.txt             # All occurrences (global)
sed 's/old/new/gi' file.txt            # Case-insensitive

# Replace in place
sed -i 's/old/new/g' file.txt          # Modify file directly
sed -i.bak 's/old/new/g' file.txt      # Create backup

# Delete lines
sed '/pattern/d' file.txt              # Delete matching lines
sed '5d' file.txt                      # Delete line 5
sed '5,10d' file.txt                   # Delete lines 5-10
sed '/^$/d' file.txt                   # Delete empty lines

# Print specific lines
sed -n '5p' file.txt                   # Print line 5
sed -n '5,10p' file.txt                # Print lines 5-10
sed -n '/error/p' file.txt             # Print matching lines

# Insert/Append
sed '3a New line after 3' file.txt     # Append after line 3
sed '3i New line before 3' file.txt    # Insert before line 3

# Multiple operations
sed -e 's/foo/bar/g' -e 's/baz/qux/g' file.txt
```

**Practical Examples:**
```bash
# Remove trailing whitespace
sed 's/[[:space:]]*$//' file.txt

# Add prefix to lines
sed 's/^/PREFIX: /' file.txt

# Extract between patterns
sed -n '/START/,/END/p' file.txt

# Replace specific line
sed '5s/old/new/' file.txt
```

---

### Q12: How do you sort and filter unique values?
**Answer:**

```bash
# Sort
sort file.txt                    # Alphabetical
sort -n file.txt                 # Numeric
sort -r file.txt                 # Reverse
sort -k2 file.txt                # By column 2
sort -t',' -k2 file.csv          # CSV by column 2
sort -u file.txt                 # Unique only

# Unique
uniq file.txt                    # Remove adjacent duplicates
sort file.txt | uniq             # Remove all duplicates
sort file.txt | uniq -c          # Count occurrences
sort file.txt | uniq -d          # Show only duplicates
sort file.txt | uniq -u          # Show only unique

# Practical examples
# Top 10 most common errors
grep "ERROR" log.txt | sort | uniq -c | sort -rn | head -10

# Unique IP addresses
awk '{print $1}' access.log | sort -u

# Count unique values in column
awk -F',' '{print $2}' data.csv | sort | uniq -c
```

---

### Q13: Explain piping and redirection
**Answer:**

**Piping (|):** Pass output of one command to another
```bash
# Chain commands
cat file.txt | grep "error" | wc -l
ls -l | grep ".txt" | awk '{print $9}'

# Multiple pipes
cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

**Redirection:**
```bash
# Output redirection
command > file.txt              # Overwrite
command >> file.txt             # Append

# Input redirection
command < file.txt

# Error redirection
command 2> error.txt            # Errors only
command > output.txt 2>&1       # Both stdout and stderr
command &> all.txt              # Both (bash shortcut)

# Discard output
command > /dev/null             # Discard stdout
command 2> /dev/null            # Discard stderr
command &> /dev/null            # Discard both

# Examples
grep "error" log.txt > errors.txt
cat file1.txt file2.txt > combined.txt
./script.sh > output.log 2> error.log
```

---

## Process Management

### Q14: How do you manage processes?
**Answer:**

```bash
# View processes
ps                              # Current shell processes
ps aux                          # All processes (detailed)
ps -ef                          # Full format
ps aux | grep java              # Find Java processes

# Real-time process monitoring
top                             # Interactive process viewer
htop                            # Better interactive viewer

# top commands:
# k - kill process
# M - sort by memory
# P - sort by CPU
# q - quit

# Find process by name
pgrep java                      # Get PID
pgrep -l java                   # With name
pidof java                      # All PIDs

# Process tree
pstree
pstree -p                       # With PIDs

# Background processes
command &                       # Run in background
jobs                            # List background jobs
fg %1                           # Bring job 1 to foreground
bg %1                           # Continue job 1 in background
```

---

### Q15: How do you kill processes?
**Answer:**

```bash
# Kill by PID
kill PID                        # Graceful (SIGTERM)
kill -9 PID                     # Force (SIGKILL)
kill -15 PID                    # Terminate (default)

# Kill by name
pkill java                      # Kill by name
pkill -f "java -jar"            # Kill by full command
killall java                    # Kill all with name

# Common signals
kill -1 PID                     # SIGHUP - Reload config
kill -2 PID                     # SIGINT - Interrupt (Ctrl+C)
kill -9 PID                     # SIGKILL - Force kill
kill -15 PID                    # SIGTERM - Graceful terminate

# List all signals
kill -l

# Kill all processes of a user
pkill -u username
```

**What Interviewer Expects:**
- Know difference between SIGTERM (15) and SIGKILL (9)
- SIGTERM allows graceful shutdown, SIGKILL doesn't

---

### Q16: How do you check system resources?
**Answer:**

```bash
# Memory usage
free -h                         # Human-readable
free -m                         # In MB

# CPU information
cat /proc/cpuinfo
nproc                           # Number of CPUs
lscpu                           # CPU details

# Uptime and load
uptime
# 10:30:45 up 5 days, 2:15, 3 users, load average: 0.15, 0.10, 0.05
# Load average: 1 min, 5 min, 15 min

# Disk I/O
iostat
vmstat

# Network statistics
netstat -tuln                   # Listening ports
ss -tuln                        # Modern alternative

# System information
uname -a                        # Kernel info
hostname                        # System name
cat /etc/os-release             # OS version
```

---

## Permissions & Ownership

### Q17: Explain Linux file permissions
**Answer:**

**Permission Format:**
```
-rwxr-xr-x  1  user  group  4096  Jan 15 10:30  file.txt
│└─┬──┘└─┬──┘└─┬──┘
│  │     │     └── Others permissions
│  │     └── Group permissions
│  └── Owner permissions
└── File type (- = file, d = directory, l = link)
```

**Permission Values:**
| Letter | Value | Meaning |
|--------|-------|---------|
| r | 4 | Read |
| w | 2 | Write |
| x | 1 | Execute |
| - | 0 | No permission |

**Numeric (Octal) Representation:**
```
rwx = 4+2+1 = 7
rw- = 4+2+0 = 6
r-x = 4+0+1 = 5
r-- = 4+0+0 = 4
```

**Common Permission Sets:**
| Numeric | Symbolic | Meaning |
|---------|----------|---------|
| 755 | rwxr-xr-x | Owner: all, Others: read+execute |
| 644 | rw-r--r-- | Owner: read+write, Others: read |
| 777 | rwxrwxrwx | Everyone: all (dangerous!) |
| 700 | rwx------ | Owner only |

---

### Q18: How do you change permissions?
**Answer:**

```bash
# chmod - Change permissions

# Numeric mode
chmod 755 script.sh             # rwxr-xr-x
chmod 644 file.txt              # rw-r--r--

# Symbolic mode
chmod u+x script.sh             # Add execute for user
chmod g-w file.txt              # Remove write for group
chmod o=r file.txt              # Set others to read only
chmod a+r file.txt              # Add read for all
chmod u=rwx,g=rx,o=r file.txt   # Set specific permissions

# Recursive
chmod -R 755 directory/

# Symbols:
# u = user/owner
# g = group
# o = others
# a = all
# + = add
# - = remove
# = = set exactly
```

---

### Q19: How do you change ownership?
**Answer:**

```bash
# chown - Change owner
chown user file.txt
chown user:group file.txt
chown :group file.txt           # Change group only

# Recursive
chown -R user:group directory/

# chgrp - Change group
chgrp group file.txt

# View ownership
ls -l file.txt
```

---

## Log Analysis

### Q20: Where are log files in Linux?
**Answer:**

```
/var/log/
├── syslog          # System messages
├── messages        # General system logs (RedHat)
├── auth.log        # Authentication logs
├── secure          # Security logs (RedHat)
├── dmesg           # Kernel messages
├── kern.log        # Kernel logs
├── apache2/        # Apache logs
│   ├── access.log
│   └── error.log
├── nginx/          # Nginx logs
├── mysql/          # MySQL logs
└── application/    # Custom application logs
```

---

### Q21: How do you analyze logs?
**Answer:**

```bash
# View recent logs
tail -f /var/log/syslog         # Follow live
tail -100 /var/log/syslog       # Last 100 lines

# Search in logs
grep "ERROR" /var/log/app.log
grep -i "error\|warning\|critical" /var/log/app.log

# Filter by date/time
grep "2024-01-15" app.log
awk '$1 ~ /2024-01-15/ && $2 >= "10:00" && $2 <= "11:00"' app.log

# Count errors
grep -c "ERROR" app.log

# Errors per hour
awk '/ERROR/ {print substr($2,1,2)}' app.log | sort | uniq -c

# Find unique error types
grep "ERROR" app.log | awk '{print $4}' | sort | uniq -c | sort -rn

# Analyze access logs
# Common log format: IP - - [date] "request" status size
# Top IPs
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10

# HTTP status codes
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# 404 errors
awk '$9 == 404 {print $7}' access.log | sort | uniq -c | sort -rn

# Requests per hour
awk '{print substr($4, 14, 2)}' access.log | sort | uniq -c

# Using zcat for compressed logs
zcat /var/log/syslog.1.gz | grep "ERROR"
zgrep "ERROR" /var/log/syslog.*.gz
```

---

### Q22: Real-time log monitoring
**Answer:**

```bash
# Follow single file
tail -f /var/log/app.log

# Follow multiple files
tail -f /var/log/app.log /var/log/error.log

# Follow with highlighting
tail -f app.log | grep --color "ERROR"

# Follow with filtering
tail -f app.log | grep "ERROR\|WARNING"

# Watch for specific pattern
tail -f app.log | awk '/ERROR/ {print; system("echo ALERT!")}'

# Using multitail (if installed)
multitail /var/log/app.log /var/log/error.log

# Using less for large files
less +F /var/log/app.log        # Similar to tail -f
# Press Ctrl+C to scroll, then F to resume following
```

---

## Networking Commands

### Q23: Basic networking commands
**Answer:**

```bash
# Check IP address
ifconfig                        # Older
ip addr                         # Newer

# Check connectivity
ping google.com
ping -c 5 google.com            # 5 pings only

# DNS lookup
nslookup google.com
dig google.com
host google.com

# Check ports
netstat -tuln                   # Listening ports
netstat -tulnp                  # With process (needs sudo)
ss -tuln                        # Modern alternative

# Check specific port
netstat -tuln | grep 8080
lsof -i :8080                   # Who's using port 8080

# Test port connectivity
telnet hostname 80
nc -zv hostname 80              # netcat

# Download files
wget http://example.com/file.txt
wget -O newname.txt http://example.com/file.txt

curl http://example.com
curl -O http://example.com/file.txt    # Download
curl -I http://example.com             # Headers only

# Transfer files
scp file.txt user@remote:/path/
scp user@remote:/path/file.txt ./
scp -r directory user@remote:/path/

# Trace route
traceroute google.com
```

---

### Q24: How do you check if a port is open?
**Answer:**

```bash
# Using netstat
netstat -tuln | grep 8080

# Using ss
ss -tuln | grep 8080

# Using lsof
lsof -i :8080

# Using nc (netcat)
nc -zv localhost 8080
# Connection to localhost 8080 port [tcp/*] succeeded!

# Using telnet
telnet localhost 8080

# Check if service is listening
ss -tuln | awk '$5 ~ /:8080$/'
```

---

## Shell Scripting Basics

### Q25: Write a simple shell script
**Answer:**

```bash
#!/bin/bash
# Simple script example

# Variables
NAME="QA Tester"
DATE=$(date +%Y-%m-%d)

# Print
echo "Hello, $NAME"
echo "Today is $DATE"

# Input
read -p "Enter your name: " USER_NAME
echo "Hello, $USER_NAME"

# Conditional
if [ -f "file.txt" ]; then
    echo "File exists"
else
    echo "File does not exist"
fi

# Numeric comparison
if [ $1 -gt 10 ]; then
    echo "Greater than 10"
fi

# Loop
for i in 1 2 3 4 5; do
    echo "Number: $i"
done

# While loop
count=0
while [ $count -lt 5 ]; do
    echo "Count: $count"
    count=$((count + 1))
done

# Function
greet() {
    echo "Hello, $1!"
}
greet "World"
```

---

### Q26: Practical shell script for testing
**Answer:**

**Health Check Script:**
```bash
#!/bin/bash
# Service health check

URL="http://localhost:8080/health"
LOG_FILE="/var/log/health_check.log"

timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# Check URL
response=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $response -eq 200 ]; then
    echo "$(timestamp) - Service is UP" >> $LOG_FILE
else
    echo "$(timestamp) - Service is DOWN (HTTP $response)" >> $LOG_FILE
    # Send alert
    # mail -s "Service Down" admin@example.com < $LOG_FILE
fi
```

**Log Analyzer Script:**
```bash
#!/bin/bash
# Count errors in log file

LOG_FILE=$1

if [ -z "$LOG_FILE" ]; then
    echo "Usage: $0 <logfile>"
    exit 1
fi

if [ ! -f "$LOG_FILE" ]; then
    echo "File not found: $LOG_FILE"
    exit 1
fi

echo "=== Log Analysis Report ==="
echo "File: $LOG_FILE"
echo ""
echo "Error Count: $(grep -c 'ERROR' $LOG_FILE)"
echo "Warning Count: $(grep -c 'WARNING' $LOG_FILE)"
echo ""
echo "Top 5 Error Types:"
grep 'ERROR' $LOG_FILE | awk '{print $4}' | sort | uniq -c | sort -rn | head -5
```

---

### Q27: Comparison operators in shell
**Answer:**

**Numeric Comparisons:**
| Operator | Meaning |
|----------|---------|
| -eq | Equal |
| -ne | Not equal |
| -gt | Greater than |
| -lt | Less than |
| -ge | Greater or equal |
| -le | Less or equal |

**String Comparisons:**
| Operator | Meaning |
|----------|---------|
| = | Equal |
| != | Not equal |
| -z | Empty string |
| -n | Not empty |

**File Tests:**
| Operator | Meaning |
|----------|---------|
| -f | Is a file |
| -d | Is a directory |
| -e | Exists |
| -r | Readable |
| -w | Writable |
| -x | Executable |
| -s | File size > 0 |

```bash
# Examples
if [ $num -gt 10 ]; then echo "Greater"; fi
if [ "$str" = "hello" ]; then echo "Match"; fi
if [ -f "file.txt" ]; then echo "Exists"; fi
if [ -z "$var" ]; then echo "Empty"; fi
```

---

## Real Interview Scenarios

### Scenario 1: Find all log files modified in the last 24 hours containing "ERROR"
**Answer:**

```bash
find /var/log -name "*.log" -mtime -1 -exec grep -l "ERROR" {} \;

# Or with more details
find /var/log -name "*.log" -mtime -1 | xargs grep -l "ERROR" 2>/dev/null

# Count errors in each
find /var/log -name "*.log" -mtime -1 -exec sh -c 'echo "$1: $(grep -c ERROR "$1")"' _ {} \;
```

---

### Scenario 2: Analyze access logs to find top 10 IPs with 404 errors
**Answer:**

```bash
# Apache/Nginx access log format: IP - - [date] "request" status size
awk '$9 == 404 {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# With details
awk '$9 == 404 {print $1, $7}' access.log | sort | uniq -c | sort -rn | head -20
```

---

### Scenario 3: Monitor a log file and alert when error count exceeds threshold
**Answer:**

```bash
#!/bin/bash
LOG_FILE="/var/log/app.log"
THRESHOLD=10
INTERVAL=60  # seconds

while true; do
    ERROR_COUNT=$(tail -100 $LOG_FILE | grep -c "ERROR")
    
    if [ $ERROR_COUNT -gt $THRESHOLD ]; then
        echo "ALERT: $ERROR_COUNT errors in last 100 lines"
        # Send notification
    fi
    
    sleep $INTERVAL
done
```

---

### Scenario 4: Find and kill all processes using more than 80% CPU
**Answer:**

```bash
# Find processes
ps aux | awk '$3 > 80 {print $2, $3, $11}'

# Kill them (careful!)
ps aux | awk '$3 > 80 {print $2}' | xargs kill -15

# With confirmation
for pid in $(ps aux | awk '$3 > 80 {print $2}'); do
    process=$(ps -p $pid -o comm=)
    read -p "Kill $process (PID $pid)? [y/n] " answer
    if [ "$answer" = "y" ]; then
        kill -15 $pid
    fi
done
```

---

### Scenario 5: Check if application is running and restart if not
**Answer:**

```bash
#!/bin/bash
APP_NAME="myapp"
START_CMD="/opt/myapp/start.sh"
LOG="/var/log/app_monitor.log"

timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# Check if running
if pgrep -x "$APP_NAME" > /dev/null; then
    echo "$(timestamp) - $APP_NAME is running" >> $LOG
else
    echo "$(timestamp) - $APP_NAME is NOT running. Starting..." >> $LOG
    $START_CMD
    
    sleep 5
    
    if pgrep -x "$APP_NAME" > /dev/null; then
        echo "$(timestamp) - $APP_NAME started successfully" >> $LOG
    else
        echo "$(timestamp) - FAILED to start $APP_NAME" >> $LOG
    fi
fi
```

---

### Scenario 6: Extract specific time range from log file
**Answer:**

```bash
# Logs with format: 2024-01-15 10:30:45 ...
# Extract logs between 10:00 and 11:00

awk '$1 == "2024-01-15" && $2 >= "10:00:00" && $2 <= "11:00:00"' app.log

# Using sed
sed -n '/2024-01-15 10:00/,/2024-01-15 11:00/p' app.log

# Count errors in time range
awk '$1 == "2024-01-15" && $2 >= "10:00:00" && $2 <= "11:00:00" && /ERROR/' app.log | wc -l
```

---

## Quick Reference Card

### Essential Commands for Testers:

| Task | Command |
|------|---------|
| Find errors in logs | `grep -i "error" /var/log/app.log` |
| Follow log in real-time | `tail -f /var/log/app.log` |
| Count occurrences | `grep -c "pattern" file` |
| Find large files | `find / -size +100M` |
| Check disk space | `df -h` |
| Check memory | `free -h` |
| List processes | `ps aux` |
| Kill process | `kill -9 PID` |
| Check port | `netstat -tuln \| grep 8080` |
| Download file | `wget URL` or `curl -O URL` |
| Remote copy | `scp file user@host:/path/` |
| Find files | `find /path -name "pattern"` |
| Change permissions | `chmod 755 file` |
| View file | `cat`, `less`, `head`, `tail` |

### Common Log Analysis One-Liners:

```bash
# Count unique errors
grep "ERROR" log | sort | uniq -c | sort -rn

# Errors per hour
awk '/ERROR/ {print substr($2,1,2)}' log | sort | uniq -c

# Top IP addresses
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head

# 5xx errors
awk '$9 ~ /^5/ {print}' access.log

# Average response time (if logged)
awk '{sum+=$NF; count++} END {print sum/count}' access.log
```

---

Continue to [08_CICD_Basics.md](08_CICD_Basics.md) for CI/CD and Jenkins questions.
