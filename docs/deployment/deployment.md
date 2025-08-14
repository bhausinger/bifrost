# Deployment Guide

This guide covers deploying Campaign Manager to various environments.

## 🏗️ Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │     CDN         │    │   Monitoring    │
│   (Nginx/ALB)   │    │  (CloudFlare)   │    │  (DataDog/New   │
└─────────────────┘    └─────────────────┘    │   Relic)        │
         │                       │             └─────────────────┘
         ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster / Docker Swarm            │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────┐ │
│  │   Frontend    │ │    Backend    │ │    Scraper Service    │ │
│  │   (React)     │ │  (Node.js)    │ │      (Python)         │ │
│  └───────────────┘ └───────────────┘ └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   File Storage  │
│   (Supabase)    │    │   (ElastiCache) │    │     (S3)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🐳 Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ disk space

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd campaign-manager

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Production Docker Setup

1. **Build production images**
   ```bash
   # Set registry (optional)
   export DOCKER_REGISTRY=your-registry.com
   
   # Build all images
   docker-compose -f docker-compose.yml build
   
   # Or build specific service
   docker-compose build frontend
   ```

2. **Create production override**
   ```bash
   # Create docker-compose.prod.yml
   cp docker-compose.prod.example.yml docker-compose.prod.yml
   
   # Edit production settings
   nano docker-compose.prod.yml
   ```

3. **Deploy to production**
   ```bash
   # Start production environment
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   
   # View logs
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
   ```

### Docker Configuration

**Production Environment Variables**
```env
# Application
NODE_ENV=production
APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/campaign_manager
SUPABASE_URL=https://your-project.supabase.co

# Security
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret

# Redis
REDIS_URL=redis://redis-host:6379/0

# APIs
OPENAI_API_KEY=your-openai-key
```

## ☁️ Cloud Deployment

### AWS Deployment

#### Using AWS ECS

1. **Create ECS Cluster**
   ```bash
   # Install AWS CLI and configure
   aws configure
   
   # Create cluster
   aws ecs create-cluster --cluster-name campaign-manager
   ```

2. **Push images to ECR**
   ```bash
   # Create ECR repositories
   aws ecr create-repository --repository-name campaign-manager/frontend
   aws ecr create-repository --repository-name campaign-manager/server
   aws ecr create-repository --repository-name campaign-manager/scraper
   
   # Get login token
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
   
   # Tag and push images
   docker tag campaign-manager-frontend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/campaign-manager/frontend:latest
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/campaign-manager/frontend:latest
   ```

3. **Create task definitions and services**
   ```bash
   # Use provided AWS CloudFormation templates
   aws cloudformation create-stack \
     --stack-name campaign-manager \
     --template-body file://infrastructure/aws/cloudformation.yml \
     --parameters ParameterKey=Environment,ParameterValue=production
   ```

#### Using AWS Fargate

```yaml
# infrastructure/aws/task-definition.json
{
  "family": "campaign-manager",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/campaign-manager/frontend:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ]
    }
  ]
}
```

### Google Cloud Platform

#### Using Cloud Run

```bash
# Build and deploy frontend
gcloud builds submit --tag gcr.io/PROJECT-ID/campaign-manager-frontend
gcloud run deploy campaign-manager-frontend \
  --image gcr.io/PROJECT-ID/campaign-manager-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Build and deploy backend
gcloud builds submit --tag gcr.io/PROJECT-ID/campaign-manager-server
gcloud run deploy campaign-manager-server \
  --image gcr.io/PROJECT-ID/campaign-manager-server \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=postgresql://... \
  --allow-unauthenticated
```

#### Using GKE

```yaml
# infrastructure/gcp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: campaign-manager-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: campaign-manager-frontend
  template:
    metadata:
      labels:
        app: campaign-manager-frontend
    spec:
      containers:
      - name: frontend
        image: gcr.io/PROJECT-ID/campaign-manager-frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
```

### Digital Ocean

#### Using App Platform

```yaml
# .do/app.yaml
name: campaign-manager
services:
- name: frontend
  source_dir: /apps/frontend
  github:
    repo: your-username/campaign-manager
    branch: main
  build_command: pnpm build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /
  envs:
  - key: NODE_ENV
    value: "production"

- name: server
  source_dir: /apps/server
  github:
    repo: your-username/campaign-manager
    branch: main
  build_command: pnpm build
  run_command: node dist/index.js
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xs
  routes:
  - path: /api
  envs:
  - key: NODE_ENV
    value: "production"
  - key: DATABASE_URL
    value: "${db.DATABASE_URL}"

databases:
- name: db
  engine: PG
  version: "13"
  size: basic-xs
```

## 🔧 Kubernetes Deployment

### Prerequisites

- Kubernetes 1.20+
- kubectl configured
- Helm 3+ (optional)

### Manual Kubernetes Deployment

1. **Create namespace**
   ```bash
   kubectl create namespace campaign-manager
   ```

2. **Apply configurations**
   ```bash
   # Apply all Kubernetes manifests
   kubectl apply -f infrastructure/k8s/ -n campaign-manager
   
   # Check deployment status
   kubectl get pods -n campaign-manager
   ```

3. **Set up ingress**
   ```yaml
   # infrastructure/k8s/ingress.yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: campaign-manager-ingress
     annotations:
       kubernetes.io/ingress.class: nginx
       cert-manager.io/cluster-issuer: letsencrypt-prod
   spec:
     tls:
     - hosts:
       - your-domain.com
       secretName: campaign-manager-tls
     rules:
     - host: your-domain.com
       http:
         paths:
         - path: /api
           pathType: Prefix
           backend:
             service:
               name: campaign-manager-server
               port:
                 number: 5000
         - path: /
           pathType: Prefix
           backend:
             service:
               name: campaign-manager-frontend
               port:
                 number: 80
   ```

### Helm Deployment

1. **Install with Helm**
   ```bash
   # Add helm repository (if published)
   helm repo add campaign-manager https://charts.campaign-manager.com
   
   # Install release
   helm install campaign-manager campaign-manager/campaign-manager \
     --namespace campaign-manager \
     --create-namespace \
     --set frontend.image.tag=latest \
     --set server.image.tag=latest \
     --set database.host=postgres-service
   ```

2. **Custom values**
   ```yaml
   # values.prod.yaml
   frontend:
     image:
       repository: your-registry/campaign-manager-frontend
       tag: "1.0.0"
     ingress:
       enabled: true
       hosts:
         - host: your-domain.com
           paths:
             - path: /
               pathType: Prefix
   
   server:
     image:
       repository: your-registry/campaign-manager-server
       tag: "1.0.0"
     env:
       NODE_ENV: production
       DATABASE_URL: postgresql://...
   ```

## 🔐 Security Considerations

### SSL/TLS Configuration

```nginx
# nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/ssl/certs/your-domain.com.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}
```

### Environment Security

```bash
# Use Docker secrets for sensitive data
echo "your-jwt-secret" | docker secret create jwt_secret -

# Mount secrets in docker-compose
services:
  server:
    secrets:
      - jwt_secret
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret

secrets:
  jwt_secret:
    external: true
```

### Database Security

```env
# Use strong passwords
DATABASE_PASSWORD=complex_password_with_special_chars_123!

# Enable SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Restrict database access
# Configure firewall rules to only allow application servers
```

## 📊 Monitoring & Logging

### Health Checks

```yaml
# Kubernetes health checks
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Logging

```yaml
# Centralized logging with Fluentd
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*campaign-manager*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
    </source>
    
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch-service
      port 9200
      index_name campaign-manager
    </match>
```

### Monitoring

```yaml
# Prometheus monitoring
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: campaign-manager
spec:
  selector:
    matchLabels:
      app: campaign-manager
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## 🚀 Deployment Scripts

### Automated Deployment

```bash
#!/bin/bash
# infrastructure/scripts/deploy.sh

set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "Deploying Campaign Manager v${VERSION} to ${ENVIRONMENT}"

# Build images
docker-compose build

# Tag for registry
docker tag campaign-manager-frontend:latest your-registry.com/campaign-manager-frontend:${VERSION}
docker tag campaign-manager-server:latest your-registry.com/campaign-manager-server:${VERSION}

# Push to registry
docker push your-registry.com/campaign-manager-frontend:${VERSION}
docker push your-registry.com/campaign-manager-server:${VERSION}

# Deploy to Kubernetes
helm upgrade --install campaign-manager ./infrastructure/helm/campaign-manager \
  --namespace campaign-manager \
  --set frontend.image.tag=${VERSION} \
  --set server.image.tag=${VERSION} \
  --values infrastructure/helm/values-${ENVIRONMENT}.yaml

echo "Deployment completed successfully!"
```

### Rollback Script

```bash
#!/bin/bash
# infrastructure/scripts/rollback.sh

ENVIRONMENT=${1:-production}
REVISION=${2:-1}

echo "Rolling back Campaign Manager in ${ENVIRONMENT} to revision ${REVISION}"

helm rollback campaign-manager ${REVISION} --namespace campaign-manager

echo "Rollback completed!"
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push images
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -f infrastructure/docker/frontend/Dockerfile -t $ECR_REGISTRY/campaign-manager-frontend:$IMAGE_TAG .
        docker push $ECR_REGISTRY/campaign-manager-frontend:$IMAGE_TAG
    
    - name: Deploy to ECS
      run: |
        aws ecs update-service --cluster campaign-manager --service frontend --force-new-deployment
```

## 📝 Production Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Monitoring setup complete
- [ ] Backup strategy in place

### Post-deployment
- [ ] Health checks passing
- [ ] All services responding
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Email sending functional
- [ ] Monitoring alerts configured
- [ ] Performance metrics baseline established

### Security
- [ ] Secrets properly secured
- [ ] Database access restricted
- [ ] API rate limiting enabled
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Vulnerability scanning complete

## 🆘 Troubleshooting

### Common Issues

**Service Won't Start**
```bash
# Check logs
docker-compose logs service-name

# Check resource usage
docker stats

# Verify environment variables
docker-compose config
```

**Database Connection Failed**
```bash
# Test database connectivity
docker-compose exec server npm run db:ping

# Check database logs
docker-compose logs postgres

# Verify credentials
psql $DATABASE_URL
```

**High Memory Usage**
```bash
# Check memory usage
docker stats

# Restart service
docker-compose restart service-name

# Scale down if needed
docker-compose up -d --scale frontend=1
```

### Performance Tuning

**Database Optimization**
```sql
-- Add indexes for common queries
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_artists_genre ON artists USING GIN(genres);
```

**Redis Configuration**
```conf
# redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
```

**Node.js Optimization**
```env
# Increase memory limit
NODE_OPTIONS=--max-old-space-size=4096

# Enable clustering
CLUSTER_MODE=true
CLUSTER_WORKERS=4
```