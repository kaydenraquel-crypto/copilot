# Deployment Guide

## Deployment Options

1. **Railway** (Recommended) - $10-15/month
2. **Render** - $7/month app + $7/month database
3. **DigitalOcean App Platform** - $12/month
4. **Self-Hosted VPS** - Variable cost

---

## Railway Deployment (Recommended)

### Prerequisites
- Railway account (railway.app)
- GitHub account
- Claude API key

### Step 1: Prepare Repository

```bash
# Initialize git if not already done
git init

# Create .gitignore
cat > .gitignore << 'EOF'
.env
__pycache__/
*.py[cod]
venv/
storage/
logs/
.DS_Store
EOF

# Commit code
git add .
git commit -m "Initial commit"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/tech-copilot.git
git push -u origin main
```

### Step 2: Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to GitHub repo (optional)
railway link
```

### Step 3: Add PostgreSQL Database

Via CLI:
```bash
railway add --database postgresql
```

Via Dashboard:
1. Go to your project
2. Click "New" → "Database" → "PostgreSQL"
3. Database will provision in ~30 seconds

### Step 4: Set Environment Variables

Via CLI:
```bash
railway variables set ANTHROPIC_API_KEY=sk-ant-xxxxx
railway variables set APP_ENV=production
railway variables set APP_DEBUG=False
railway variables set STORAGE_PATH=/app/storage
```

Via Dashboard:
1. Go to project → Variables
2. Add each variable:
   - `ANTHROPIC_API_KEY`
   - `APP_ENV=production`
   - `APP_DEBUG=False`
   - `STORAGE_PATH=/app/storage`
   - `LOG_LEVEL=INFO`

**Note:** `DATABASE_URL` is automatically set by Railway's PostgreSQL service

### Step 5: Configure Build Settings

Create `railway.toml` in project root:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[volumes]
"/app/storage" = "/mnt/storage"
"/app/logs" = "/mnt/logs"
```

### Step 6: Deploy

Via CLI:
```bash
railway up
```

Via GitHub:
1. Connect GitHub repository in Railway dashboard
2. Enable automatic deploys
3. Push to main branch

### Step 7: Run Database Migrations

```bash
# Connect to Railway service
railway run alembic upgrade head

# Or via dashboard: Open shell and run
alembic upgrade head
```

### Step 8: Verify Deployment

```bash
# Get deployment URL
railway open

# Test health endpoint
curl https://your-app.up.railway.app/health

# Test API
curl https://your-app.up.railway.app/docs
```

### Step 9: Setup Persistent Storage (Optional)

Railway provides volumes for persistent storage:

```bash
# Create volume
railway volume create

# Mount to /app/storage
# Configure in railway.toml (already done above)
```

---

## Render Deployment

### Step 1: Prepare for Render

Create `render.yaml` in project root:
```yaml
services:
  - type: web
    name: tech-copilot
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: DATABASE_URL
        fromDatabase:
          name: tech-copilot-db
          property: connectionString
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: APP_ENV
        value: production
      - key: APP_DEBUG
        value: False
    
databases:
  - name: tech-copilot-db
    databaseName: tech_copilot
    user: tech_copilot
```

### Step 2: Deploy to Render

1. Create account at render.com
2. Connect GitHub repository
3. Click "New" → "Blueprint"
4. Select `render.yaml`
5. Set `ANTHROPIC_API_KEY` in environment variables
6. Deploy

---

## Docker Deployment

### Docker Setup

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create storage directories
RUN mkdir -p /app/storage/manuals /app/storage/temp /app/logs

# Run migrations and start server
CMD alembic upgrade head && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: tech_copilot
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: tech_copilot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tech_copilot"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://tech_copilot:${DB_PASSWORD}@db:5432/tech_copilot
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      APP_ENV: production
      APP_DEBUG: False
    volumes:
      - ./storage:/app/storage
      - ./logs:/app/logs
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

### Deploy with Docker

```bash
# Set environment variables
export DB_PASSWORD=your_secure_password
export ANTHROPIC_API_KEY=sk-ant-xxxxx

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f app

# Run migrations
docker-compose exec app alembic upgrade head
```

---

## DigitalOcean App Platform

### Step 1: Create App Spec

Create `.do/app.yaml`:
```yaml
name: tech-copilot
services:
- name: web
  github:
    repo: yourusername/tech-copilot
    branch: main
    deploy_on_push: true
  build_command: pip install -r requirements.txt
  run_command: |
    alembic upgrade head && \
    uvicorn app.main:app --host 0.0.0.0 --port 8080
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 8080
  envs:
  - key: ANTHROPIC_API_KEY
    scope: RUN_TIME
    type: SECRET
  - key: APP_ENV
    value: production
  - key: APP_DEBUG
    value: "False"

databases:
- name: db
  engine: PG
  version: "15"
  size: basic-xs
```

### Step 2: Deploy

```bash
# Install doctl
brew install doctl  # Mac
# Or download from digitalocean.com/docs/apis-clis/doctl/

# Authenticate
doctl auth init

# Create app
doctl apps create --spec .do/app.yaml

# Set API key
doctl apps create-deployment <app-id> --env ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## Self-Hosted VPS Deployment

### Step 1: Setup VPS

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y python3.11 python3.11-venv postgresql nginx certbot python3-certbot-nginx
```

### Step 2: Setup Application

```bash
# Create app user
useradd -m -s /bin/bash techcopilot
su - techcopilot

# Clone repository
git clone https://github.com/yourusername/tech-copilot.git
cd tech-copilot

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt gunicorn
```

### Step 3: Setup PostgreSQL

```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE tech_copilot;
CREATE USER tech_copilot WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE tech_copilot TO tech_copilot;
\q
```

### Step 4: Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://tech_copilot:secure_password@localhost/tech_copilot
ANTHROPIC_API_KEY=sk-ant-xxxxx
APP_ENV=production
APP_DEBUG=False
EOF

# Run migrations
alembic upgrade head
```

### Step 5: Setup Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/techcopilot.service
```

```ini
[Unit]
Description=Tech Copilot API
After=network.target postgresql.service

[Service]
User=techcopilot
Group=techcopilot
WorkingDirectory=/home/techcopilot/tech-copilot
Environment="PATH=/home/techcopilot/tech-copilot/venv/bin"
ExecStart=/home/techcopilot/tech-copilot/venv/bin/gunicorn \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    app.main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl start techcopilot
sudo systemctl enable techcopilot

# Check status
sudo systemctl status techcopilot
```

### Step 6: Setup Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/techcopilot
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/techcopilot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
sudo certbot --nginx -d your-domain.com
```

---

## Post-Deployment Checklist

- [ ] Verify health endpoint: `https://your-domain.com/health`
- [ ] Test API documentation: `https://your-domain.com/docs`
- [ ] Run database migrations: `alembic upgrade head`
- [ ] Upload at least one test manual
- [ ] Test troubleshooting endpoint with sample data
- [ ] Check logs for errors: `railway logs` or `docker-compose logs`
- [ ] Setup monitoring (see below)
- [ ] Configure backups (see below)
- [ ] Test file uploads work
- [ ] Verify storage is persistent across restarts

---

## Monitoring & Logging

### Railway Monitoring

View logs:
```bash
railway logs
```

Via dashboard: Project → Deployments → View Logs

### Application Monitoring

Add Sentry for error tracking:

```bash
pip install sentry-sdk
```

```python
# app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

if settings.APP_ENV == "production":
    sentry_sdk.init(
        dsn="your-sentry-dsn",
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1
    )
```

### Health Checks

Setup external monitoring:
- **UptimeRobot** (free): Monitor health endpoint every 5 minutes
- **Pingdom**: More advanced monitoring
- **Railway built-in**: Automatic health checks

---

## Backups

### Database Backups

**Railway:**
```bash
# Automated daily backups (included)
# Manual backup:
railway run pg_dump $DATABASE_URL > backup.sql
```

**Self-hosted:**
```bash
# Automated backups with cron
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump tech_copilot | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### File Storage Backups

Railway volumes can be backed up:
```bash
# Create backup
railway volume backup create

# List backups
railway volume backup list

# Restore
railway volume backup restore <backup-id>
```

---

## Scaling

### Vertical Scaling (More Resources)

Railway: Change instance size in dashboard

Self-hosted: Upgrade VPS resources

### Horizontal Scaling (More Instances)

1. Add Redis for session management
2. Use shared storage (S3/Cloudflare R2)
3. Add load balancer
4. Deploy multiple app instances

---

## Common Deployment Issues

**Issue:** Database connection refused  
**Fix:** Check `DATABASE_URL` environment variable, ensure database is running

**Issue:** Migrations fail  
**Fix:** Manually run `railway run alembic upgrade head` or SSH into server

**Issue:** File uploads fail  
**Fix:** Ensure storage directory exists and is writable, check volume mounts

**Issue:** Claude API timeout  
**Fix:** Increase timeout in config, check API key is valid

**Issue:** High memory usage  
**Fix:** Reduce database pool size, implement proper cleanup of temp files

---

## Security Checklist

- [ ] All environment variables use secrets (not hardcoded)
- [ ] `APP_DEBUG=False` in production
- [ ] Database uses strong password
- [ ] API has rate limiting (implement in Phase 2)
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS configured properly
- [ ] File upload size limits enforced
- [ ] Input validation on all endpoints
- [ ] Logs don't contain sensitive data
- [ ] Regular dependency updates

---

## Maintenance

### Update Dependencies

```bash
# Check for updates
pip list --outdated

# Update specific package
pip install --upgrade package-name

# Update requirements.txt
pip freeze > requirements.txt

# Test locally, then deploy
git commit -am "Update dependencies"
git push
```

### Clean Expired Cache

```bash
# Run cleanup script
railway run python scripts/cleanup_cache.py

# Or schedule with cron (self-hosted)
0 3 * * * cd /home/techcopilot/tech-copilot && /home/techcopilot/tech-copilot/venv/bin/python scripts/cleanup_cache.py
```

### Monitor Costs

Railway shows usage in dashboard:
- Database size
- Bandwidth
- Compute hours

Set budget alerts to avoid surprises.
