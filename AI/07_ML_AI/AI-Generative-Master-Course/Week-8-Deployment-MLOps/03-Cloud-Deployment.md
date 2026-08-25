# ☁️ Day 3: Cloud Deployment

## 📚 Table of Contents
1. [Cloud Deployment Overview](#-cloud-deployment-overview)
2. [Deployment Options](#-deployment-options)
3. [AWS Deployment](#-aws-deployment)
4. [Google Cloud Deployment](#-google-cloud-deployment)
5. [Azure Deployment](#-azure-deployment)
6. [Serverless ML](#-serverless-ml)
7. [Managed ML Platforms](#-managed-ml-platforms)
8. [Cost Optimization](#-cost-optimization)
9. [Exercises](#-exercises)

---

## 🎯 Cloud Deployment Overview

### Deployment Decision Tree

```
                    ┌─────────────────────────┐
                    │ What are you deploying? │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  ┌───────────┐           ┌───────────┐           ┌───────────┐
  │Simple API │           │ ML Model  │           │ Full App  │
  │(no model) │           │ Inference │           │ + Frontend│
  └─────┬─────┘           └─────┬─────┘           └─────┬─────┘
        │                       │                       │
        ▼                       ▼                       ▼
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ Serverless   │       │ Container    │       │ VM / K8s     │
  │ Lambda/Cloud │       │ Service      │       │ + Managed    │
  │ Functions    │       │ ECS/Cloud Run│       │ Services     │
  └──────────────┘       └──────────────┘       └──────────────┘

DECISION FACTORS:
├── Traffic volume: Low → Serverless, High → Containers/VMs
├── Cold start OK?: Yes → Serverless, No → Always-on
├── GPU needed?: Yes → GPU instances, No → CPU serverless
├── Budget: Tight → Serverless (pay per use)
└── Complexity: Simple → Managed, Complex → Custom
```

### Provider Comparison

```
┌────────────────┬──────────────┬──────────────┬──────────────┐
│    Feature     │     AWS      │     GCP      │    Azure     │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ Container Svc  │ ECS/Fargate  │ Cloud Run    │ Container    │
│                │              │              │ Apps         │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ Serverless     │ Lambda       │ Functions    │ Functions    │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ ML Platform    │ SageMaker    │ Vertex AI    │ ML Studio    │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ GPU Instances  │ EC2 P/G      │ A100/T4/V100 │ NC/ND series │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ Free Tier      │ 12 months    │ $300 credit  │ $200 credit  │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ Best For       │ Enterprise   │ ML/Data      │ Microsoft    │
│                │              │              │ ecosystem    │
└────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 🚀 Deployment Options

### Option 1: Container Services (Recommended for ML)

```
CONTAINER SERVICES:

AWS ECS/Fargate:
├── Pro: Deep AWS integration, mature
├── Con: Complex configuration
└── Cost: ~$30-100/month for small app

GCP Cloud Run:
├── Pro: Simple, auto-scaling to zero
├── Con: Cold starts
└── Cost: Pay per request (can be cheap!)

Azure Container Apps:
├── Pro: Good if using Azure
├── Con: Newer service
└── Cost: ~$30-100/month
```

### Option 2: Serverless Functions

```
SERVERLESS:

AWS Lambda:
├── Max: 10GB RAM, 15 min timeout
├── Container support: Yes (up to 10GB image)
└── GPU: No

GCP Cloud Functions:
├── Max: 32GB RAM, 60 min timeout
├── Container support: Via Cloud Run
└── GPU: No

Best for: Low-traffic APIs, preprocessing, webhooks
NOT for: Large models, GPU inference
```

### Option 3: Virtual Machines

```
VMs (Full Control):

When to use:
├── Need specific GPU
├── Complex dependencies
├── Long-running processes
├── Custom networking

Options:
├── AWS EC2
├── GCP Compute Engine
├── Azure VMs
└── DigitalOcean, Linode, etc.
```

### Option 4: Managed ML Platforms

```
MANAGED PLATFORMS:

AWS SageMaker:
├── Full MLOps pipeline
├── Built-in hosting
└── $$$

GCP Vertex AI:
├── Model hosting
├── AutoML features
└── $$

Hugging Face Spaces/Endpoints:
├── Easy model hosting
├── Great for HF models
└── $ - $$

Replicate:
├── Easy GPU inference
├── Pay per prediction
└── $
```

---

## 🔶 AWS Deployment

### Option A: AWS Lambda (Serverless)

```python
# lambda_handler.py
import json
from transformers import pipeline

# Load model outside handler (reused across invocations)
classifier = pipeline("sentiment-analysis")

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        text = body.get('text', '')
        
        if not text:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Text is required'})
            }
        
        result = classifier(text)[0]
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'label': result['label'],
                'confidence': result['score']
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

```dockerfile
# Dockerfile for Lambda
FROM public.ecr.aws/lambda/python:3.11

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy handler
COPY lambda_handler.py .

# Pre-download model
RUN python -c "from transformers import pipeline; pipeline('sentiment-analysis')"

CMD ["lambda_handler.lambda_handler"]
```

```bash
# Deploy to Lambda
# 1. Build image
docker build -t ml-lambda .

# 2. Create ECR repository
aws ecr create-repository --repository-name ml-lambda

# 3. Tag and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag ml-lambda:latest <account>.dkr.ecr.us-east-1.amazonaws.com/ml-lambda:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/ml-lambda:latest

# 4. Create Lambda function
aws lambda create-function \
    --function-name ml-inference \
    --package-type Image \
    --code ImageUri=<account>.dkr.ecr.us-east-1.amazonaws.com/ml-lambda:latest \
    --role arn:aws:iam::<account>:role/lambda-role \
    --memory-size 3008 \
    --timeout 30
```

### Option B: AWS ECS/Fargate (Containers)

```yaml
# task-definition.json
{
  "family": "ml-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "ml-api",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/ml-api:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ml-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

```bash
# Deploy to ECS
# 1. Create cluster
aws ecs create-cluster --cluster-name ml-cluster

# 2. Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 3. Create service
aws ecs create-service \
    --cluster ml-cluster \
    --service-name ml-api-service \
    --task-definition ml-api \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Option C: AWS App Runner (Simplest)

```bash
# app-runner.yaml
version: 1.0
runtime: python311
build:
  commands:
    build:
      - pip install -r requirements.txt
run:
  command: uvicorn app:app --host 0.0.0.0 --port 8000
  network:
    port: 8000
```

```bash
# Deploy via console or CLI
aws apprunner create-service \
    --service-name ml-api \
    --source-configuration file://app-runner-source.json
```

---

## 🔵 Google Cloud Deployment

### Cloud Run (Recommended)

```bash
# 1. Build with Cloud Build
gcloud builds submit --tag gcr.io/PROJECT_ID/ml-api

# 2. Deploy to Cloud Run
gcloud run deploy ml-api \
    --image gcr.io/PROJECT_ID/ml-api \
    --platform managed \
    --region us-central1 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --allow-unauthenticated \
    --set-env-vars OPENAI_API_KEY=xxx

# 3. Get URL
gcloud run services describe ml-api --format='value(status.url)'
```

### Cloud Run with GPU (Preview)

```bash
# Deploy with GPU
gcloud run deploy ml-api-gpu \
    --image gcr.io/PROJECT_ID/ml-api-gpu \
    --platform managed \
    --region us-central1 \
    --memory 16Gi \
    --cpu 4 \
    --gpu 1 \
    --gpu-type nvidia-l4 \
    --allow-unauthenticated
```

### Cloud Functions (Gen 2)

```python
# main.py
import functions_framework
from flask import jsonify
from transformers import pipeline

classifier = pipeline("sentiment-analysis")

@functions_framework.http
def predict(request):
    data = request.get_json()
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'Text required'}), 400
    
    result = classifier(text)[0]
    return jsonify({
        'label': result['label'],
        'confidence': result['score']
    })
```

```bash
# Deploy
gcloud functions deploy predict \
    --runtime python311 \
    --trigger-http \
    --allow-unauthenticated \
    --memory 2048MB \
    --timeout 60
```

### Vertex AI (Managed ML)

```python
# deploy_to_vertex.py
from google.cloud import aiplatform

aiplatform.init(project='PROJECT_ID', location='us-central1')

# Upload model
model = aiplatform.Model.upload(
    display_name='sentiment-classifier',
    serving_container_image_uri='gcr.io/PROJECT_ID/ml-api:latest',
    serving_container_predict_route='/predict',
    serving_container_health_route='/health',
)

# Deploy to endpoint
endpoint = model.deploy(
    machine_type='n1-standard-4',
    min_replica_count=1,
    max_replica_count=3,
)

print(f"Endpoint: {endpoint.resource_name}")
```

---

## 🟦 Azure Deployment

### Azure Container Apps

```bash
# 1. Create Container App
az containerapp create \
    --name ml-api \
    --resource-group myResourceGroup \
    --environment myEnvironment \
    --image myregistry.azurecr.io/ml-api:latest \
    --target-port 8000 \
    --ingress external \
    --cpu 1.0 \
    --memory 2.0Gi \
    --env-vars OPENAI_API_KEY=xxx

# 2. Get URL
az containerapp show --name ml-api --resource-group myResourceGroup --query properties.configuration.ingress.fqdn
```

### Azure Functions (Containerized)

```dockerfile
# Dockerfile for Azure Functions
FROM mcr.microsoft.com/azure-functions/python:4-python3.11

ENV AzureWebJobsScriptRoot=/home/site/wwwroot
ENV AzureFunctionsJobHost__Logging__Console__IsEnabled=true

COPY requirements.txt /
RUN pip install -r /requirements.txt

COPY . /home/site/wwwroot
```

```python
# function_app.py
import azure.functions as func
import json
from transformers import pipeline

app = func.FunctionApp()
classifier = pipeline("sentiment-analysis")

@app.route(route="predict", methods=["POST"])
def predict(req: func.HttpRequest) -> func.HttpResponse:
    body = req.get_json()
    text = body.get('text', '')
    
    result = classifier(text)[0]
    
    return func.HttpResponse(
        json.dumps({'label': result['label'], 'confidence': result['score']}),
        mimetype="application/json"
    )
```

---

## ⚡ Serverless ML

### When to Use Serverless

```
SERVERLESS IS GOOD FOR:
├── Low/variable traffic (< 1000 req/day)
├── Infrequent batch processing
├── Small models (< 500MB)
├── APIs that can tolerate cold starts
└── Cost optimization (pay only when used)

SERVERLESS IS BAD FOR:
├── Large models (> 1GB)
├── GPU inference
├── Consistent low latency requirements
├── High-traffic APIs
└── Long-running processes (> 15 min)
```

### Cold Start Optimization

```python
# Pre-warm with scheduled invocations

# AWS: CloudWatch Events
# Schedule: rate(5 minutes)
# Target: Your Lambda function

# GCP: Cloud Scheduler
# gcloud scheduler jobs create http warm-up \
#     --schedule="*/5 * * * *" \
#     --uri="https://your-function-url/health"

# Code optimization
# 1. Use smaller models
# 2. Load models lazily
# 3. Use model quantization
# 4. Cache in /tmp
```

### Provisioned Concurrency (AWS)

```bash
# Keep Lambda warm with provisioned concurrency
aws lambda put-provisioned-concurrency-config \
    --function-name ml-inference \
    --qualifier latest \
    --provisioned-concurrent-executions 2
```

---

## 🤖 Managed ML Platforms

### Hugging Face Inference Endpoints

```python
# Deploy to HuggingFace
from huggingface_hub import InferenceClient

# 1. Via web interface:
# huggingface.co/settings/endpoints → Create Endpoint

# 2. Use the endpoint:
client = InferenceClient(
    "https://your-endpoint.endpoints.huggingface.cloud",
    token="hf_xxx"
)

result = client.post(
    json={"inputs": "I love this!"}
)
```

### Replicate

```python
import replicate

# Run model inference
output = replicate.run(
    "stability-ai/sdxl:latest",
    input={"prompt": "A beautiful sunset"}
)
print(output)

# Deploy your own model
# 1. Create model on replicate.com
# 2. Push with cog CLI
# cog push r8.im/your-username/your-model
```

### Modal

```python
# modal_app.py
import modal

app = modal.App("ml-api")
image = modal.Image.debian_slim().pip_install("transformers", "torch")

@app.function(image=image, gpu="T4")
def predict(text: str) -> dict:
    from transformers import pipeline
    classifier = pipeline("sentiment-analysis")
    result = classifier(text)[0]
    return {"label": result["label"], "confidence": result["score"]}

@app.local_entrypoint()
def main():
    print(predict.remote("I love this!"))
```

```bash
# Deploy
modal deploy modal_app.py
```

---

## 💰 Cost Optimization

### Cost Comparison

```
MONTHLY COST ESTIMATES (Small ML API, ~10K requests/day):

Serverless (Lambda/Cloud Functions):
├── Compute: $5-15/month
├── API Gateway: $5-10/month
└── Total: ~$15-25/month

Container Service (Cloud Run/Fargate):
├── Always-on min instance: $30-50/month
├── Scale to zero option: $10-20/month
└── Total: ~$20-50/month

VM (EC2/Compute Engine):
├── t3.medium (2 vCPU, 4GB): ~$30/month
├── Reserved/Spot: ~$15-20/month
└── Total: ~$20-40/month

Managed ML (SageMaker endpoint):
├── ml.t3.medium: ~$50/month
└── GPU instance: $200-2000/month
```

### Cost Optimization Tips

```python
# 1. Use spot/preemptible instances for training
# AWS: Spot Instances (up to 90% off)
# GCP: Preemptible VMs (60-91% off)

# 2. Scale to zero when possible
# Cloud Run: Automatic
# Lambda: Automatic
# ECS: Use Application Auto Scaling

# 3. Right-size your instances
# Start small, scale up based on metrics

# 4. Use caching
# - Cache model outputs
# - Cache embeddings
# - Use Redis/ElastiCache

# 5. Batch requests when possible
# Process multiple inputs in single inference call

# 6. Use quantized models
# INT8/INT4 = lower memory = smaller instances

# 7. Monitor and alert
# Set up billing alerts!
```

### Setting Up Billing Alerts

```bash
# AWS
aws budgets create-budget \
    --account-id ACCOUNT_ID \
    --budget file://budget.json

# GCP
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="ML API Budget" \
    --budget-amount=100USD \
    --threshold-rule=percent=80

# Azure
az consumption budget create \
    --budget-name "ML-Budget" \
    --amount 100 \
    --time-grain Monthly \
    --category Cost
```

---

## 🔄 CI/CD for Cloud Deployment

### GitHub Actions for Cloud Run

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Auth to GCP
      uses: google-github-actions/auth@v2
      with:
        credentials_json: ${{ secrets.GCP_CREDENTIALS }}
    
    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v2
    
    - name: Build and Push
      run: |
        gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT }}/ml-api
    
    - name: Deploy
      run: |
        gcloud run deploy ml-api \
          --image gcr.io/${{ secrets.GCP_PROJECT }}/ml-api \
          --region us-central1 \
          --allow-unauthenticated
```

### GitHub Actions for AWS ECS

```yaml
# .github/workflows/aws-deploy.yml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to ECR
      uses: aws-actions/amazon-ecr-login@v2
    
    - name: Build and Push
      run: |
        docker build -t ml-api .
        docker tag ml-api:latest ${{ secrets.ECR_REGISTRY }}/ml-api:latest
        docker push ${{ secrets.ECR_REGISTRY }}/ml-api:latest
    
    - name: Deploy to ECS
      run: |
        aws ecs update-service --cluster ml-cluster --service ml-api --force-new-deployment
```

---

## ✏️ Exercises

### Exercise 1: Deploy to Cloud Run
1. Take your Docker container from Day 2
2. Deploy to Google Cloud Run
3. Test the public endpoint
4. Set up auto-scaling

### Exercise 2: Serverless Function
1. Create a Lambda or Cloud Function
2. Deploy a simple text classification model
3. Measure cold start times
4. Set up a warm-up schedule

### Exercise 3: CI/CD Pipeline
1. Set up GitHub Actions for your project
2. Auto-deploy on push to main
3. Run tests before deployment
4. Implement rollback strategy

### Exercise 4: Cost Analysis
1. Deploy the same app to 2-3 platforms
2. Generate test traffic
3. Compare actual costs
4. Document findings

---

## ✅ Day 3 Checklist

By the end of today, you should:
- [ ] Understand deployment options (serverless vs containers vs VMs)
- [ ] Deploy to at least one cloud platform
- [ ] Know cost implications of different options
- [ ] Set up CI/CD for automated deployment
- [ ] Configure billing alerts

---

## 🔜 Next: Day 4

Tomorrow we'll learn about model versioning and management!

**Continue to**: [04-Model-Versioning.md](./04-Model-Versioning.md)
