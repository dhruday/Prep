# 104. Leader Election

## 📌 Overview

**Leader election** is the process of choosing one node in a distributed system to be the **leader** (coordinator) that performs special tasks, while other nodes act as **followers**.

**Why needed**: Avoid conflicts, coordinate actions, single source of truth.

---

## 🎯 Why Leader Election?

### **Problem: Multiple Nodes Doing Same Task**
```
Task: Send daily email report

Without Leader:
Node 1: Sends email ✉️
Node 2: Sends email ✉️
Node 3: Sends email ✉️
Result: User gets 3 duplicate emails ❌

With Leader:
Node 1 (Leader): Sends email ✉️
Node 2 (Follower): Idle
Node 3 (Follower): Idle
Result: User gets 1 email ✓
```

### **Use Cases**
1. **Task coordination** (cron jobs, scheduled tasks)
2. **Write coordination** (master-slave replication)
3. **Configuration management** (single source of truth)
4. **Resource allocation** (assign work to nodes)

---

## 🏗️ Leader Election Architecture

```
Initial State (No Leader):
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Node 1   │  │ Node 2   │  │ Node 3   │
│ Follower │  │ Follower │  │ Follower │
└──────────┘  └──────────┘  └──────────┘

Election Process:
     💬              💬              💬
   "Vote me"      "Vote me"      "Vote me"
         ↓             ↓             ↓
    Majority votes → Node 2 wins

Final State:
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Node 1   │  │ Node 2   │  │ Node 3   │
│ Follower │  │ 👑 LEADER│  │ Follower │
└──────────┘  └──────────┘  └──────────┘
```

---

## 🛠️ Leader Election Algorithms

### **1. Bully Algorithm**

**Principle**: Highest ID always becomes leader.

```python
class BullyElection:
    def __init__(self, node_id, all_nodes):
        self.node_id = node_id
        self.all_nodes = all_nodes
        self.leader_id = None
    
    def start_election(self):
        """Start election by asking higher IDs"""
        higher_nodes = [n for n in self.all_nodes if n > self.node_id]
        
        if not higher_nodes:
            # I'm the highest → I'm leader
            self.become_leader()
            return
        
        # Ask higher nodes if they're alive
        responses = []
        for node_id in higher_nodes:
            try:
                response = self.send_message(node_id, 'ARE_YOU_ALIVE')
                responses.append(response)
            except Timeout:
                pass  # Node dead
        
        if responses:
            # Higher node alive → they'll become leader
            self.wait_for_coordinator()
        else:
            # All higher nodes dead → I'm leader
            self.become_leader()
    
    def become_leader(self):
        self.leader_id = self.node_id
        # Announce to all nodes
        for node_id in self.all_nodes:
            if node_id != self.node_id:
                self.send_message(node_id, f'COORDINATOR:{self.node_id}')
        print(f"Node {self.node_id} is now LEADER")
```

**Example Flow**:
```
Nodes: [1, 2, 3, 4, 5]
Node 3 crashes

Node 2 detects leader missing:
1. Node 2 asks nodes [3, 4, 5]: "Are you alive?"
2. Node 3 doesn't respond (crashed)
3. Node 4, 5 respond: "Yes, I'll take over"
4. Node 5 (highest) becomes leader
5. Node 5 announces: "I'm the coordinator"
```

**Pros**: Simple, highest ID always wins
**Cons**: Higher ID node can "bully" even if lower ID more suitable

---

### **2. Ring Algorithm**

**Principle**: Election message travels in a ring.

```python
class RingElection:
    def __init__(self, node_id, next_node):
        self.node_id = node_id
        self.next_node = next_node  # Ring topology
        self.leader_id = None
    
    def start_election(self):
        """Send election message with my ID"""
        election_msg = {
            'type': 'ELECTION',
            'ids': [self.node_id]  # Start with my ID
        }
        self.send_to_next(election_msg)
    
    def receive_election(self, msg):
        """Receive election message from previous node"""
        if self.node_id in msg['ids']:
            # Message completed the ring → I started it
            # Highest ID in list becomes leader
            leader = max(msg['ids'])
            self.announce_leader(leader)
        else:
            # Add my ID and forward
            msg['ids'].append(self.node_id)
            self.send_to_next(msg)
    
    def announce_leader(self, leader_id):
        """Announce winner to all nodes"""
        self.leader_id = leader_id
        coordinator_msg = {
            'type': 'COORDINATOR',
            'leader': leader_id
        }
        self.send_to_next(coordinator_msg)
```

**Example Flow**:
```
Ring: Node1 → Node2 → Node3 → Node4 → Node1

1. Node2 starts election, sends: {ids: [2]}
2. Node3 receives, sends: {ids: [2, 3]}
3. Node4 receives, sends: {ids: [2, 3, 4]}
4. Node1 receives, sends: {ids: [2, 3, 4, 1]}
5. Node2 receives (started the election)
6. Node2: "max([2, 3, 4, 1]) = 4 → Node4 is leader"
7. Node2 announces: "Node4 is coordinator"
```

**Pros**: Fair (everyone gets a vote)
**Cons**: Slower (full ring traversal)

---

### **3. Raft Consensus (Modern)**

**Principle**: Majority vote wins, log replication ensures consistency.

```python
class RaftNode:
    def __init__(self, node_id, cluster):
        self.node_id = node_id
        self.cluster = cluster
        self.state = 'FOLLOWER'  # FOLLOWER, CANDIDATE, LEADER
        self.current_term = 0
        self.voted_for = None
        self.leader_id = None
    
    def start_election(self):
        """Become candidate and request votes"""
        self.state = 'CANDIDATE'
        self.current_term += 1
        self.voted_for = self.node_id
        
        votes = 1  # Vote for myself
        
        # Request votes from other nodes
        for node in self.cluster:
            if node.node_id != self.node_id:
                response = node.request_vote(self.current_term, self.node_id)
                if response['vote_granted']:
                    votes += 1
        
        # Need majority
        if votes > len(self.cluster) / 2:
            self.become_leader()
        else:
            self.become_follower()
    
    def request_vote(self, term, candidate_id):
        """Respond to vote request"""
        if term > self.current_term:
            # Newer term → reset
            self.current_term = term
            self.voted_for = None
            self.state = 'FOLLOWER'
        
        if self.voted_for is None or self.voted_for == candidate_id:
            self.voted_for = candidate_id
            return {'vote_granted': True}
        else:
            return {'vote_granted': False}
    
    def become_leader(self):
        self.state = 'LEADER'
        self.leader_id = self.node_id
        # Send heartbeats to followers
        self.send_heartbeats()
    
    def send_heartbeats(self):
        """Leader sends periodic heartbeats"""
        while self.state == 'LEADER':
            for node in self.cluster:
                if node.node_id != self.node_id:
                    node.receive_heartbeat(self.current_term, self.node_id)
            time.sleep(0.1)  # Heartbeat interval
    
    def receive_heartbeat(self, term, leader_id):
        """Follower receives heartbeat"""
        if term >= self.current_term:
            self.current_term = term
            self.leader_id = leader_id
            self.state = 'FOLLOWER'
            self.reset_election_timeout()
```

**Example Flow**:
```
Cluster: [Node1, Node2, Node3, Node4, Node5]

1. All nodes start as FOLLOWER
2. Node3's election timeout fires (no heartbeat)
3. Node3 becomes CANDIDATE, term = 1
4. Node3 requests votes:
   - Node1: Vote granted ✓
   - Node2: Vote granted ✓
   - Node4: Already voted for Node5 ✗
   - Node5: Vote granted ✓
5. Node3: 3/5 votes (majority) → LEADER
6. Node3 sends heartbeats every 100ms
7. Followers reset timeout when receiving heartbeat
```

**Pros**: 
- Industry standard (etcd, Consul use Raft)
- Handles network partitions
- Strongly consistent

**Cons**: More complex than Bully/Ring

---

## 🎯 Leader Failure & Re-election

### **Detecting Leader Failure**
```python
class LeaderHealthCheck:
    def __init__(self, leader_id):
        self.leader_id = leader_id
        self.last_heartbeat = time.time()
        self.timeout = 5  # seconds
    
    def monitor(self):
        while True:
            now = time.time()
            if now - self.last_heartbeat > self.timeout:
                # Leader dead → start election
                print(f"Leader {self.leader_id} timeout, starting election")
                self.start_election()
                break
            time.sleep(1)
    
    def receive_heartbeat(self, leader_id):
        if leader_id == self.leader_id:
            self.last_heartbeat = time.time()
```

### **Split-Brain Problem**
```
Network Partition:

Group A: [Node1, Node2]     Group B: [Node3, Node4, Node5]
         ↓                            ↓
    Node1 becomes leader         Node3 becomes leader
         ↓                            ↓
     Two leaders! ❌

Solution: Require majority (quorum)
- Group A: 2/5 votes (no majority)
- Group B: 3/5 votes (majority) ✓
- Only Node3 becomes leader
```

---

## 🎯 Real-World Examples

### **1. Kafka Partition Leader**
```
Topic: orders (3 partitions)

Partition 0: Leader = Broker1, Replicas = [Broker2, Broker3]
Partition 1: Leader = Broker2, Replicas = [Broker1, Broker3]
Partition 2: Leader = Broker3, Replicas = [Broker1, Broker2]

- Producers write to partition leader
- Leader replicates to followers
- If leader fails → ZooKeeper elects new leader
```

### **2. MongoDB Replica Set**
```
Replica Set: [Primary, Secondary1, Secondary2]

- Primary handles all writes
- Secondaries replicate data
- Heartbeat every 2 seconds

Primary fails:
1. Secondaries detect missing heartbeat (10 sec timeout)
2. Election starts
3. Secondary1 gets 2/3 votes → becomes Primary
4. Clients redirect writes to new Primary
```

### **3. Kubernetes Master Node**
```
Control Plane: [Master1, Master2, Master3]

- Only one Master is leader (via etcd election)
- Leader schedules pods, manages cluster state
- Followers standby (hot backup)

Leader election via etcd (Raft consensus):
- Each Master tries to acquire lock on key "/leader"
- First to acquire = leader
- Lock has TTL → must renew with heartbeat
- If leader dies → lock expires → re-election
```

---

## ✅ Best Practices

1. **Use Existing Solutions**
```python
# Don't implement leader election from scratch
# Use proven systems:

# ZooKeeper
from kazoo.client import KazooClient
zk = KazooClient(hosts='localhost:2181')
election = zk.Election("/my-service/leader", "node1")
election.run(my_leader_function)  # Blocks until leader

# etcd
import etcd3
etcd = etcd3.client()
election = etcd.election("my-service")
election.campaign(b"node1")  # Become leader
```

2. **Heartbeat Tuning**
```python
# Too frequent → network overhead
heartbeat_interval = 0.05  # 50ms ❌

# Too infrequent → slow failure detection
heartbeat_interval = 30  # 30 seconds ❌

# Reasonable: 100ms-1s
heartbeat_interval = 0.1  # 100ms ✓
election_timeout = 3 * heartbeat_interval  # 300ms ✓
```

3. **Idempotent Leader Actions**
```python
# Leader tasks must be idempotent (safe to retry)
def leader_task():
    job_id = generate_uuid()
    if not db.exists('completed_jobs', job_id):
        execute_job(job_id)
        db.insert('completed_jobs', job_id)
    # If leader dies and new leader retries → safe
```

---

## 🎓 Interview Tips

**Q: "What is leader election and why is it needed?"**

A: "Leader election chooses one node to be the coordinator while others are followers. Needed for:
- **Task coordination** (avoid duplicate work: only leader sends daily email)
- **Write coordination** (master-slave: only master accepts writes)
- **Single source of truth** (only leader updates configuration)

Example: Kafka partition leader handles all writes, followers replicate. If leader fails, ZooKeeper elects new leader from followers."

**Q: "How does Raft leader election work?"**

A: "Raft leader election:
1. All nodes start as followers, waiting for heartbeat
2. If no heartbeat for timeout (e.g., 300ms) → become candidate
3. Candidate increments term, votes for self, requests votes from others
4. Node votes if: (1) same term, (2) hasn't voted yet
5. Candidate with majority votes → becomes leader
6. Leader sends heartbeats to followers

Prevents split-brain: Requires majority (3/5 nodes). Network partition: minority side can't elect leader."

---

## 🔗 Related Topics
- **103. Distributed Systems** - Core concepts
- **105. Distributed Locks** - Coordination
- **106. Heartbeats** - Failure detection
- **108. Consensus Basics** - Agreement protocols

---

## 📚 Summary

**Leader Election**: Choose one coordinator in distributed system

**Why**: Avoid duplicate work, coordinate writes, single source

**Algorithms**: Bully (highest ID), Ring (fair), Raft (modern)

**Failure Detection**: Heartbeats + timeout → re-election

**Best Practice**: Use ZooKeeper/etcd, don't implement from scratch 🚀
