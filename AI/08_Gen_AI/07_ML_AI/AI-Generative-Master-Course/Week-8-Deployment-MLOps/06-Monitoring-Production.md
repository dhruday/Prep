# 👁️ Day 6: Production Monitoring

## 📚 Table of Contents
1. [Why Monitor ML Systems?](#-why-monitor-ml-systems)
2. [Types of Monitoring](#-types-of-monitoring)
3. [Metrics to Track](#-metrics-to-track)
4. [Model Drift Detection](#-model-drift-detection)
5. [Logging & Alerting](#-logging--alerting)
6. [Tools & Implementation](#-tools--implementation)
7. [Dashboards](#-dashboards)
8. [Exercises](#-exercises)

---

## 🎯 Why Monitor ML Systems?

### ML Systems Fail Silently

```
TRADITIONAL SOFTWARE:
├── Bug → Error/Crash → Immediate alert
├── Easy to detect failures
└── Binary: works or doesn't

ML SYSTEMS:
├── Data drift → Degraded predictions → Silent failure
├── Model outputs look valid but are wrong
└── Gradual: works, then slowly degrades

REAL EXAMPLES:
├── Recommendation system starts recommending irrelevant items
├── Fraud detector misses new fraud patterns
├── Sentiment classifier fails on new slang
└── You only find out when users complain!
```

### Monitoring Goals

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING GOALS                              │
│                                                                  │
│  1. AVAILABILITY                                                 │
│     └── Is the system up and responding?                        │
│                                                                  │
│  2. PERFORMANCE                                                  │
│     └── How fast is inference? What's the throughput?           │
│                                                                  │
│  3. QUALITY                                                      │
│     └── Are predictions accurate? Is the model still working?   │
│                                                                  │
│  4. DATA QUALITY                                                 │
│     └── Is input data valid? Has distribution changed?          │
│                                                                  │
│  5. COST                                                         │
│     └── How much are we spending? Any anomalies?                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Types of Monitoring

### System Monitoring

```
INFRASTRUCTURE METRICS:

Compute:
├── CPU utilization (%)
├── Memory usage (GB/%)
├── GPU utilization (%)
├── GPU memory (GB/%)
└── Disk usage (%)

Network:
├── Request rate (req/s)
├── Latency (p50, p95, p99)
├── Error rate (%)
├── Bandwidth (MB/s)
└── Connection count

Container:
├── Container restarts
├── Health check status
├── Resource limits hit
└── Pod scheduling events
```

### Model Monitoring

```
MODEL-SPECIFIC METRICS:

Inference:
├── Prediction latency
├── Batch size distribution
├── Model load time
├── Inference errors
└── Timeout rate

Quality:
├── Confidence score distribution
├── Prediction distribution
├── Feature value distributions
├── Output anomalies
└── Feedback/ground truth (when available)

Drift:
├── Data drift (input features)
├── Concept drift (input-output relationship)
├── Prediction drift (output distribution)
└── Label drift (when labels available)
```

---

## 📈 Metrics to Track

### Essential Metrics Dashboard

```python
# metrics.py - Core metrics to track

from dataclasses import dataclass, field
from typing import List, Dict
import time
from collections import deque
import statistics

@dataclass
class MetricsCollector:
    """Collect and compute monitoring metrics."""
    
    latencies: deque = field(default_factory=lambda: deque(maxlen=1000))
    predictions: deque = field(default_factory=lambda: deque(maxlen=1000))
    confidence_scores: deque = field(default_factory=lambda: deque(maxlen=1000))
    errors: int = 0
    total_requests: int = 0
    
    def record_prediction(
        self,
        latency_ms: float,
        prediction: str,
        confidence: float
    ):
        self.latencies.append(latency_ms)
        self.predictions.append(prediction)
        self.confidence_scores.append(confidence)
        self.total_requests += 1
    
    def record_error(self):
        self.errors += 1
        self.total_requests += 1
    
    def get_metrics(self) -> Dict:
        if not self.latencies:
            return {}
        
        sorted_latencies = sorted(self.latencies)
        n = len(sorted_latencies)
        
        return {
            # Latency metrics
            "latency_p50_ms": sorted_latencies[int(n * 0.5)],
            "latency_p95_ms": sorted_latencies[int(n * 0.95)],
            "latency_p99_ms": sorted_latencies[int(n * 0.99)],
            "latency_avg_ms": statistics.mean(self.latencies),
            
            # Error rate
            "error_rate": self.errors / max(self.total_requests, 1),
            "total_requests": self.total_requests,
            
            # Confidence distribution
            "confidence_avg": statistics.mean(self.confidence_scores) if self.confidence_scores else 0,
            "confidence_min": min(self.confidence_scores) if self.confidence_scores else 0,
            
            # Prediction distribution
            "prediction_distribution": self._get_distribution(self.predictions),
        }
    
    def _get_distribution(self, items) -> Dict:
        counts = {}
        for item in items:
            counts[item] = counts.get(item, 0) + 1
        total = len(items)
        return {k: v/total for k, v in counts.items()}


# Global metrics collector
metrics = MetricsCollector()
```

### FastAPI Integration

```python
# app.py with monitoring
from fastapi import FastAPI, Request
import time
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

app = FastAPI()

# Prometheus metrics
REQUEST_COUNT = Counter(
    'prediction_requests_total',
    'Total prediction requests',
    ['endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'prediction_latency_seconds',
    'Request latency in seconds',
    ['endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

PREDICTION_CONFIDENCE = Histogram(
    'prediction_confidence',
    'Model confidence scores',
    buckets=[0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99]
)

PREDICTION_LABELS = Counter(
    'prediction_labels_total',
    'Prediction label distribution',
    ['label']
)

@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    latency = time.time() - start_time
    REQUEST_LATENCY.labels(endpoint=request.url.path).observe(latency)
    REQUEST_COUNT.labels(
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    return response

@app.post("/predict")
def predict(request: TextRequest):
    start_time = time.time()
    
    result = classifier(request.text)[0]
    
    # Record metrics
    latency = (time.time() - start_time) * 1000
    PREDICTION_CONFIDENCE.observe(result["score"])
    PREDICTION_LABELS.labels(label=result["label"]).inc()
    
    return {
        "label": result["label"],
        "confidence": result["score"]
    }

@app.get("/metrics")
def metrics():
    """Expose Prometheus metrics."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

---

## 🔄 Model Drift Detection

### Types of Drift

```
DATA DRIFT (Covariate Shift):
├── Input feature distributions change
├── Example: User demographics shift
├── Detection: Compare feature statistics over time
└── Action: Retrain on recent data

CONCEPT DRIFT:
├── Relationship between input and output changes
├── Example: What "spam" looks like changes
├── Detection: Monitor prediction accuracy
└── Action: Retrain with new labeled data

PREDICTION DRIFT:
├── Model output distribution changes
├── Example: More positive sentiment predictions
├── Detection: Monitor output distribution
└── Action: Investigate cause, possibly retrain

┌─────────────────────────────────────────────────────────────────┐
│                      DRIFT DETECTION                             │
│                                                                  │
│  Training Data      →     Production Data                        │
│  Distribution             Distribution                           │
│                                                                  │
│      ████                     ████                               │
│     ██████                   ████████                            │
│    ████████                 ████████████                         │
│   ██████████               ██████████████                        │
│  ────────────             ────────────────                       │
│      Normal                   DRIFTED!                           │
└─────────────────────────────────────────────────────────────────┘
```

### Drift Detection Implementation

```python
# drift_detection.py
import numpy as np
from scipy import stats
from typing import List, Dict
from dataclasses import dataclass

@dataclass
class DriftDetector:
    """Detect distribution drift in features."""
    
    reference_stats: Dict = None
    
    def fit(self, reference_data: np.ndarray, feature_names: List[str]):
        """Compute reference statistics from training data."""
        self.reference_stats = {}
        
        for i, name in enumerate(feature_names):
            column = reference_data[:, i]
            self.reference_stats[name] = {
                "mean": np.mean(column),
                "std": np.std(column),
                "min": np.min(column),
                "max": np.max(column),
                "median": np.median(column),
                "distribution": column  # Store for KS test
            }
    
    def detect_drift(
        self,
        current_data: np.ndarray,
        feature_names: List[str],
        threshold: float = 0.05
    ) -> Dict:
        """Detect drift using KS test."""
        results = {}
        
        for i, name in enumerate(feature_names):
            current = current_data[:, i]
            reference = self.reference_stats[name]["distribution"]
            
            # Kolmogorov-Smirnov test
            ks_stat, p_value = stats.ks_2samp(reference, current)
            
            # PSI (Population Stability Index)
            psi = self._calculate_psi(reference, current)
            
            drift_detected = p_value < threshold or psi > 0.2
            
            results[name] = {
                "ks_statistic": ks_stat,
                "p_value": p_value,
                "psi": psi,
                "drift_detected": drift_detected,
                "current_mean": np.mean(current),
                "reference_mean": self.reference_stats[name]["mean"],
                "mean_shift": np.mean(current) - self.reference_stats[name]["mean"]
            }
        
        return results
    
    def _calculate_psi(
        self,
        reference: np.ndarray,
        current: np.ndarray,
        bins: int = 10
    ) -> float:
        """Calculate Population Stability Index."""
        # Create bins from reference
        _, bin_edges = np.histogram(reference, bins=bins)
        
        # Calculate frequencies
        ref_freq, _ = np.histogram(reference, bins=bin_edges)
        cur_freq, _ = np.histogram(current, bins=bin_edges)
        
        # Normalize
        ref_freq = ref_freq / len(reference)
        cur_freq = cur_freq / len(current)
        
        # Avoid division by zero
        ref_freq = np.where(ref_freq == 0, 0.0001, ref_freq)
        cur_freq = np.where(cur_freq == 0, 0.0001, cur_freq)
        
        # PSI formula
        psi = np.sum((cur_freq - ref_freq) * np.log(cur_freq / ref_freq))
        
        return psi


# Usage
detector = DriftDetector()

# Fit on training data
detector.fit(train_features, ["feature1", "feature2", "feature3"])

# Check production data periodically
drift_results = detector.detect_drift(production_features, ["feature1", "feature2", "feature3"])

for feature, result in drift_results.items():
    if result["drift_detected"]:
        print(f"⚠️ DRIFT DETECTED in {feature}!")
        print(f"   PSI: {result['psi']:.4f}")
        print(f"   Mean shift: {result['mean_shift']:.4f}")
```

### Prediction Drift Monitoring

```python
# prediction_drift.py
from collections import deque
import numpy as np

class PredictionDriftMonitor:
    """Monitor for changes in prediction distribution."""
    
    def __init__(self, window_size: int = 1000, alert_threshold: float = 0.1):
        self.window_size = window_size
        self.alert_threshold = alert_threshold
        self.reference_distribution = None
        self.recent_predictions = deque(maxlen=window_size)
    
    def set_reference(self, predictions: list):
        """Set reference prediction distribution."""
        self.reference_distribution = self._compute_distribution(predictions)
    
    def add_prediction(self, prediction: str):
        """Add new prediction and check for drift."""
        self.recent_predictions.append(prediction)
        
        if len(self.recent_predictions) >= self.window_size:
            return self.check_drift()
        return None
    
    def check_drift(self) -> dict:
        """Compare current distribution to reference."""
        if self.reference_distribution is None:
            return {"error": "Reference not set"}
        
        current = self._compute_distribution(list(self.recent_predictions))
        
        # Calculate distribution difference
        all_labels = set(self.reference_distribution.keys()) | set(current.keys())
        
        total_diff = 0
        details = {}
        
        for label in all_labels:
            ref = self.reference_distribution.get(label, 0)
            cur = current.get(label, 0)
            diff = abs(cur - ref)
            total_diff += diff
            details[label] = {
                "reference": ref,
                "current": cur,
                "difference": cur - ref
            }
        
        drift_detected = total_diff > self.alert_threshold
        
        return {
            "drift_detected": drift_detected,
            "total_difference": total_diff,
            "details": details
        }
    
    def _compute_distribution(self, predictions: list) -> dict:
        counts = {}
        for pred in predictions:
            counts[pred] = counts.get(pred, 0) + 1
        total = len(predictions)
        return {k: v/total for k, v in counts.items()}


# Usage
monitor = PredictionDriftMonitor()

# Set reference from validation data
reference_predictions = ["POSITIVE"] * 600 + ["NEGATIVE"] * 400
monitor.set_reference(reference_predictions)

# In production
for prediction in production_predictions:
    result = monitor.add_prediction(prediction)
    if result and result.get("drift_detected"):
        send_alert("Prediction drift detected!", result)
```

---

## 🔔 Logging & Alerting

### Structured Logging

```python
# logging_config.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        if hasattr(record, "prediction"):
            log_obj["prediction"] = record.prediction
        if hasattr(record, "latency_ms"):
            log_obj["latency_ms"] = record.latency_ms
        
        return json.dumps(log_obj)

# Setup
def setup_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    
    logger = logging.getLogger("ml_api")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    return logger

logger = setup_logging()

# Usage
logger.info(
    "Prediction completed",
    extra={
        "request_id": "abc123",
        "prediction": "POSITIVE",
        "latency_ms": 45.2
    }
)
```

### Alerting System

```python
# alerting.py
from dataclasses import dataclass
from typing import Callable, List
from enum import Enum
import smtplib
import requests

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

@dataclass
class Alert:
    name: str
    severity: AlertSeverity
    message: str
    details: dict = None

class AlertManager:
    """Manage and send alerts."""
    
    def __init__(self):
        self.handlers = []
    
    def add_handler(self, handler: Callable):
        self.handlers.append(handler)
    
    def send_alert(self, alert: Alert):
        for handler in self.handlers:
            try:
                handler(alert)
            except Exception as e:
                print(f"Alert handler failed: {e}")

# Alert handlers
def slack_handler(alert: Alert):
    """Send alert to Slack."""
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        return
    
    color = {
        AlertSeverity.INFO: "#36a64f",
        AlertSeverity.WARNING: "#ff9800",
        AlertSeverity.CRITICAL: "#dc3545"
    }[alert.severity]
    
    payload = {
        "attachments": [{
            "color": color,
            "title": f"[{alert.severity.value.upper()}] {alert.name}",
            "text": alert.message,
            "fields": [
                {"title": k, "value": str(v), "short": True}
                for k, v in (alert.details or {}).items()
            ]
        }]
    }
    
    requests.post(webhook_url, json=payload)

def email_handler(alert: Alert):
    """Send alert via email."""
    if alert.severity != AlertSeverity.CRITICAL:
        return  # Only email for critical
    
    # Send email logic...

def console_handler(alert: Alert):
    """Print alert to console."""
    print(f"[{alert.severity.value.upper()}] {alert.name}: {alert.message}")

# Setup
alert_manager = AlertManager()
alert_manager.add_handler(console_handler)
alert_manager.add_handler(slack_handler)

# Create alerts
def check_error_rate(error_rate: float, threshold: float = 0.05):
    if error_rate > threshold:
        alert_manager.send_alert(Alert(
            name="High Error Rate",
            severity=AlertSeverity.CRITICAL if error_rate > 0.1 else AlertSeverity.WARNING,
            message=f"Error rate is {error_rate:.2%}",
            details={"error_rate": error_rate, "threshold": threshold}
        ))

def check_latency(p99_latency: float, threshold: float = 1000):
    if p99_latency > threshold:
        alert_manager.send_alert(Alert(
            name="High Latency",
            severity=AlertSeverity.WARNING,
            message=f"P99 latency is {p99_latency:.0f}ms",
            details={"p99_latency_ms": p99_latency, "threshold_ms": threshold}
        ))
```

---

## 🛠️ Tools & Implementation

### Prometheus + Grafana Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  ml-api:
    build: .
    ports:
      - "8000:8000"
  
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ml-api'
    static_configs:
      - targets: ['ml-api:8000']
    metrics_path: /metrics
```

### Custom Metrics with Evidently

```python
# evidently_monitoring.py
from evidently import ColumnMapping
from evidently.report import Report
from evidently.metrics import (
    DataDriftTable,
    DatasetDriftMetric,
    ColumnDriftMetric
)
import pandas as pd

def generate_drift_report(
    reference_data: pd.DataFrame,
    current_data: pd.DataFrame,
    feature_columns: list
) -> dict:
    """Generate drift report using Evidently."""
    
    column_mapping = ColumnMapping(
        numerical_features=feature_columns
    )
    
    report = Report(metrics=[
        DatasetDriftMetric(),
        DataDriftTable()
    ])
    
    report.run(
        reference_data=reference_data,
        current_data=current_data,
        column_mapping=column_mapping
    )
    
    # Get results
    result = report.as_dict()
    
    return {
        "dataset_drift": result["metrics"][0]["result"]["dataset_drift"],
        "drift_share": result["metrics"][0]["result"]["drift_share"],
        "column_drifts": result["metrics"][1]["result"]["drift_by_columns"]
    }

# Scheduled job
def daily_drift_check():
    # Load data
    reference = load_training_data()
    current = load_last_24h_predictions()
    
    result = generate_drift_report(reference, current, ["feature1", "feature2"])
    
    if result["dataset_drift"]:
        send_alert(f"Dataset drift detected! Drift share: {result['drift_share']:.2%}")
```

---

## 📊 Dashboards

### Key Dashboard Panels

```
ML MODEL MONITORING DASHBOARD

┌─────────────────────────────────────────────────────────────────┐
│  SYSTEM HEALTH                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Uptime      │ │ Error Rate  │ │ Latency P99 │ │ Throughput  ││
│  │   99.9%     │ │   0.02%     │ │   145ms     │ │  1.2K req/s ││
│  │     ✓       │ │     ✓       │ │     ✓       │ │     ✓       ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  LATENCY OVER TIME                    │  ERROR RATE OVER TIME   │
│  ───────────────────────────          │  ──────────────────     │
│  ╱╲    ╱╲                             │                         │
│ ╱  ╲  ╱  ╲  ╱╲                        │  ─────────────────      │
│╱    ╲╱    ╲╱  ╲                       │                         │
│                                       │                         │
├─────────────────────────────────────────────────────────────────┤
│  PREDICTION DISTRIBUTION              │  CONFIDENCE SCORES      │
│  ┌──────────────────────┐             │  ┌──────────────────┐   │
│  │ POSITIVE ████████ 62%│             │  │     ████████     │   │
│  │ NEGATIVE ████    38% │             │  │   ████████████   │   │
│  └──────────────────────┘             │  │ ████████████████ │   │
│                                       │  └──────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  DRIFT ALERTS                                                    │
│  ⚠️  Feature "user_age" showing drift (PSI: 0.24) - 2h ago      │
│  ✓  No concept drift detected in last 24h                       │
│  ✓  Prediction distribution stable                              │
└─────────────────────────────────────────────────────────────────┘
```

### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "ML Model Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(prediction_requests_total[5m])",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "Latency P99",
        "type": "gauge",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(prediction_latency_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(prediction_requests_total{status!=\"200\"}[5m]) / rate(prediction_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Prediction Distribution",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (label) (prediction_labels_total)",
            "legendFormat": "{{label}}"
          }
        ]
      }
    ]
  }
}
```

---

## ✏️ Exercises

### Exercise 1: Basic Monitoring
1. Add Prometheus metrics to your FastAPI app
2. Track latency, error rate, and throughput
3. Create a /metrics endpoint
4. Verify metrics with curl

### Exercise 2: Drift Detection
1. Implement the DriftDetector class
2. Test with synthetic drifted data
3. Set up alerting when drift is detected
4. Visualize drift metrics

### Exercise 3: Full Monitoring Stack
1. Set up Prometheus + Grafana with Docker Compose
2. Create a monitoring dashboard
3. Add alert rules for:
   - Error rate > 5%
   - Latency P99 > 500ms
   - Drift detected

### Exercise 4: Production Pipeline
1. Create a comprehensive monitoring solution for your ML API
2. Include: system metrics, model metrics, drift detection
3. Set up Slack alerting
4. Create runbook for common alerts

---

## ✅ Day 6 Checklist

By the end of today, you should:
- [ ] Understand why ML monitoring differs from traditional monitoring
- [ ] Implement latency, error rate, and throughput metrics
- [ ] Set up drift detection for features and predictions
- [ ] Create structured logging
- [ ] Set up alerting (Slack, email, etc.)
- [ ] Build a monitoring dashboard

---

## 🔜 Next: Day 7

Tomorrow we'll build end-to-end projects combining everything!

**Continue to**: [07-Projects.md](./07-Projects.md)
