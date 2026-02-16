# 108. Consensus Basics

## 📌 Overview

**Consensus** is the process of getting multiple nodes in a distributed system to **agree on a single value or state**, even in the presence of failures.

**Core problem**: How do distributed nodes make a decision together when:
- Networks can fail (messages lost)
- Nodes can crash
- Messages can be delayed
- No shared memory

---

## 🎯 The Consensus Problem

### **Scenario: Distributed Transaction**
```
Problem: Transfer $100 from Account A to Account B

Node 1: Debit $100 from Account A
Node 2: Credit $100 to Account B

Question: Both must agree to commit or abort

Case 1: Node 1 commits, Node 2 aborts → $100 lost ❌
Case 2: Node 1 aborts, Node 2 commits → $100 created ❌
Case 3: Both commit → Consistent ✓
Case 4: Both abort → Consistent ✓

Need consensus: All nodes agree on commit/abort
```

### **Requirements for Consensus**

1. **Agreement**: All nodes decide on the same value
2. **Validity**: Decided value was proposed by some node
3. **Termination**: All nodes eventually decide (no deadlock)
4. **Fault Tolerance**: Works despite node failures

---

## 🎯 Famous Consensus Problem: Byzantine Generals

```
Generals surrounding enemy city:
- Must coordinate attack (all attack or none)
- Communicate via messengers
- Some generals may be traitors (Byzantine faults)

Problem: Agree on "attack" or "retreat"

General A ─────"Attack"────→ General B
                ↓
            "Retreat" (traitor changes message)
                ↓
            General C

Without consensus: Coordination fails
```

**Byzantine Fault Tolerance**: System works even with malicious nodes (blockchain uses this).

---

## 🛠️ Consensus Algorithms

### **1. Two-Phase Commit (2PC)**

**Use case**: Distributed transactions (ACID guarantees)

```
Phase 1: PREPARE (Voting)
Coordinator ──"Can you commit?"──→ Participants
           ←─────"Yes" / "No"──────

Phase 2: COMMIT / ABORT (Decision)
Coordinator ──"COMMIT" or "ABORT"──→ Participants
           ←───────"ACK"────────────
```

**Implementation**:
```python
class TwoPhaseCommit:
    def __init__(self, coordinator, participants):
        self.coordinator = coordinator
        self.participants = participants
    
    def commit_transaction(self, transaction):
        # Phase 1: PREPARE
        votes = []
        for participant in self.participants:
            try:
                vote = participant.prepare(transaction)
                votes.append(vote)
            except Exception:
                votes.append('NO')  # Participant down = NO
        
        # Check if all voted YES
        if all(v == 'YES' for v in votes):
            decision = 'COMMIT'
        else:
            decision = 'ABORT'
        
        # Phase 2: COMMIT / ABORT
        for participant in self.participants:
            try:
                if decision == 'COMMIT':
                    participant.commit(transaction)
                else:
                    participant.abort(transaction)
            except Exception:
                # Log failure, retry
                log_error(f"Participant {participant} failed to {decision}")
        
        return decision

# Example
class Participant:
    def prepare(self, transaction):
        # Check if can commit
        if self.can_commit(transaction):
            # Write to write-ahead log
            self.log_prepare(transaction)
            return 'YES'
        else:
            return 'NO'
    
    def commit(self, transaction):
        # Apply transaction
        self.apply(transaction)
        self.log_commit(transaction)
    
    def abort(self, transaction):
        # Rollback
        self.rollback(transaction)
        self.log_abort(transaction)
```

**Flow Example**:
```
Transaction: Transfer $100 (Account A → Account B)

Phase 1: PREPARE
Coordinator → Database 1: "Can you debit $100 from Account A?"
Database 1 → Coordinator: "YES" (has sufficient balance)

Coordinator → Database 2: "Can you credit $100 to Account B?"
Database 2 → Coordinator: "YES"

Phase 2: COMMIT
Coordinator → Database 1: "COMMIT"
Database 1 applies debit

Coordinator → Database 2: "COMMIT"
Database 2 applies credit

Result: Transaction committed ✓
```

**Problems with 2PC**:
```
Problem 1: Blocking
If coordinator crashes after PREPARE → participants stuck waiting

Problem 2: Not fault-tolerant
Coordinator is single point of failure

Solution: Use 3PC (Three-Phase Commit) or Paxos/Raft
```

---

### **2. Paxos (Classic Consensus)**

**Use case**: Replicated state machines (Google Chubby)

**Roles**:
- **Proposer**: Proposes values
- **Acceptor**: Votes on proposals
- **Learner**: Learns decided value

**Simplified Flow**:
```
Phase 1: PREPARE
Proposer → Acceptors: "Prepare(n)" (proposal number n)
Acceptors → Proposer: "Promise(n, v)" (promise to accept n, last accepted v)

Phase 2: ACCEPT
Proposer → Acceptors: "Accept(n, v)" (propose value v with number n)
Acceptors → Proposer: "Accepted(n, v)" (accepted)

Learners: Learn value when majority accepts
```

**Example**:
```
3 Acceptors: A1, A2, A3 (need majority = 2)

Proposer 1: Propose "X" with n=1
├─ A1: Promise(1, null)
├─ A2: Promise(1, null)
└─ A3: (down)

Proposer 1: Accept(1, "X") to A1, A2
├─ A1: Accepted(1, "X")
├─ A2: Accepted(1, "X")
└─ Majority (2/3) → Value "X" decided ✓

Proposer 2 (concurrent): Propose "Y" with n=2
├─ A1: Promise(2, "X") (already accepted "X" with n=1)
├─ A2: Promise(2, "X")
└─ Proposer 2: Must propose "X" (highest accepted value)

Result: Consensus on "X" ✓
```

**Paxos Properties**:
- **Safety**: Only one value decided
- **Liveness**: Eventually decides (if majority alive)
- **Fault Tolerance**: Tolerates f failures with 2f+1 nodes

---

### **3. Raft (Understandable Consensus)**

**Use case**: etcd, Consul, CockroachDB

**Roles**:
- **Leader**: Coordinates log replication
- **Follower**: Replicates log from leader
- **Candidate**: Competes for leadership

**Key Concepts**:
```
1. Leader Election (see Topic 104)
2. Log Replication
3. Safety (committed logs never lost)
```

**Log Replication**:
```python
class RaftNode:
    def __init__(self, node_id):
        self.node_id = node_id
        self.state = 'FOLLOWER'
        self.log = []  # Replicated log
        self.commit_index = 0  # Last committed index
    
    def replicate_log(self, entry):
        """Leader replicates log entry"""
        # Append to own log
        self.log.append(entry)
        
        # Send to followers
        acks = 1  # Leader counts as ack
        for follower in self.followers:
            if follower.append_entry(entry):
                acks += 1
        
        # Commit if majority acks
        if acks > len(self.cluster) / 2:
            self.commit_index += 1
            self.apply_to_state_machine(entry)
        
        return acks > len(self.cluster) / 2
    
    def append_entry(self, entry):
        """Follower appends entry"""
        self.log.append(entry)
        return True  # ACK

# Example
leader = RaftNode('node1')
leader.state = 'LEADER'

# Client sends command: "SET x = 5"
entry = {'command': 'SET', 'key': 'x', 'value': 5}

# Leader replicates to followers
if leader.replicate_log(entry):
    print("Command committed")
else:
    print("Failed to commit")
```

**Raft Flow**:
```
Cluster: [Leader, Follower1, Follower2, Follower3, Follower4]

1. Client → Leader: "SET x = 5"
2. Leader appends to log: [SET x=5]
3. Leader → Followers: AppendEntries(SET x=5)
4. Follower1: ACK ✓
5. Follower2: ACK ✓
6. Follower3: (down) ✗
7. Follower4: ACK ✓
8. Leader: 4/5 ACKs (majority) → commit
9. Leader applies: x = 5
10. Leader → Client: Success

Result: Consensus on "x = 5" ✓
```

**Raft vs Paxos**:
```
Paxos:
├─ Theoretically elegant
├─ Hard to understand
└─ Complex implementation

Raft:
├─ Designed for understandability
├─ Easier to implement
└─ Industry standard (etcd, Consul)
```

---

## 🎯 Consensus Use Cases

### **1. Leader Election**
```
Problem: Choose one coordinator

Consensus decides: Who is the leader?

Raft: Highest term + majority vote = leader
```

### **2. Configuration Management**
```
Problem: All nodes need same config

Consensus decides: Current configuration

ZooKeeper: Stores config, guarantees all nodes see same value
```

### **3. Service Discovery**
```
Problem: Which servers are available?

Consensus decides: List of healthy servers

Consul: Uses Raft to maintain service registry
```

### **4. Distributed Transactions**
```
Problem: Commit or abort?

Consensus decides: Transaction outcome

2PC: Coordinator + participants agree on commit/abort
```

---

## 🎯 Real-World Examples

### **1. Google Chubby (Paxos)**
```
Use case: Distributed lock service

Components:
├─ Chubby cells (replicas)
├─ Paxos for consensus (elect master)
└─ Master serves lock requests

Clients:
├─ BigTable (master election)
├─ GFS (chunk server locations)
└─ MapReduce (worker coordination)
```

### **2. etcd (Raft)**
```
Use case: Distributed key-value store

Components:
├─ Raft cluster (3 or 5 nodes)
├─ Leader handles writes
└─ Followers replicate log

Clients:
├─ Kubernetes (configuration, leader election)
├─ Service discovery
└─ Distributed locks
```

### **3. ZooKeeper (ZAB - Zookeeper Atomic Broadcast)**
```
Use case: Coordination service

Consensus algorithm: ZAB (similar to Paxos)

Components:
├─ Ensemble (3 or 5 servers)
├─ Leader (handles writes)
└─ Followers (replicate, serve reads)

Clients:
├─ Kafka (broker coordination)
├─ HBase (master election)
└─ Hadoop (NameNode HA)
```

---

## ✅ CAP Theorem & Consensus

```
CAP: Consistency + Availability + Partition Tolerance (pick 2)

Consensus systems are CP:
├─ Consistency: Guaranteed (strong consistency)
├─ Partition Tolerance: Yes (works with network splits)
└─ Availability: NO (blocks if no majority)

Example:
Cluster: [Node1, Node2, Node3]
Network partition: Node1 | Node2, Node3

Node1 (minority):
├─ Can't reach majority
├─ Rejects writes (unavailable)
└─ Maintains consistency ✓

Node2, Node3 (majority):
├─ Can elect leader
├─ Accept writes (available)
└─ Consistent ✓

Trade-off: Strong consistency, but not available during partition
```

---

## ⚠️ Consensus Challenges

1. **Performance Overhead**
```
Every write requires majority ack → higher latency

Single node: 1ms write
Consensus (3 nodes): 10-50ms write (network + coordination)
```

2. **Scalability Limit**
```
More nodes = more coordination overhead

Typical: 3-5 nodes (good balance)
Large: 7-9 nodes (rare)
```

3. **Split-Brain Prevention**
```
Requires odd number of nodes (3, 5, 7)
Even number (4, 6) can split evenly → no majority
```

---

## 🎓 Interview Tips

**Q: "What is consensus and why is it needed?"**

A: "Consensus is multiple nodes agreeing on a single value despite failures. Needed for:
- **Leader election**: Who is the coordinator?
- **Configuration**: All nodes use same config
- **Distributed transactions**: Commit or abort?

Example: Transfer $100 between accounts on two databases. Without consensus, one may commit and other abort → money lost. With 2PC consensus: Both agree to commit or both abort."

**Q: "Explain the difference between 2PC and Raft."**

A: "2PC (Two-Phase Commit):
- **Use case**: Distributed transactions
- **Phases**: PREPARE (vote) → COMMIT/ABORT (decide)
- **Problem**: Blocking (coordinator crash blocks participants)

Raft:
- **Use case**: Replicated state machine (etcd, Consul)
- **Approach**: Leader election + log replication
- **Advantage**: Fault-tolerant (leader fails → new election)

Key difference: 2PC for transactions, Raft for replication. 2PC blocks on failure, Raft continues with new leader."

**Q: "What's the trade-off of using consensus?"**

A: "Trade-offs:
- **Latency**: Requires majority ack (10-50ms vs 1ms single node)
- **Availability**: Blocks if no majority (CAP: CP not CA)
- **Complexity**: Hard to implement correctly

When to use:
- **Critical data**: Leader election, configuration (correctness matters)
- **NOT for**: High-throughput writes (use eventual consistency instead)

Example: Kafka uses ZooKeeper (consensus) for broker coordination, but not for message writes (too slow)."

---

## 🔗 Related Topics
- **104. Leader Election** - Consensus use case
- **105. Distributed Locks** - Coordination
- **89. CAP Theorem** - CP systems
- **103. Distributed Systems** - Core concepts

---

## 📚 Summary

**Consensus**: Multiple nodes agree on single value despite failures

**Requirements**: Agreement, Validity, Termination, Fault Tolerance

**Algorithms**:
- **2PC**: Distributed transactions (blocking)
- **Paxos**: Classic (complex)
- **Raft**: Modern, understandable (etcd, Consul)

**Use Cases**: Leader election, configuration, service discovery, distributed transactions

**Trade-off**: Strong consistency but higher latency, lower availability 🚀
