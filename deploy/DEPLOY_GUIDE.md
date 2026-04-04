# Flappy - AWS Deployment Guide

## What You Need
- AWS account
- Domain: flappy.co.in (already have this)
- Your EC2 SSH key (.pem file)

---

## Step 1 — Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Settings:
   - Name: `flappy-server`
   - AMI: **Ubuntu Server 22.04 LTS**
   - Instance type: **t3.small** (or t3.medium for better performance)
   - Key pair: Create or select existing → download `.pem` file
   - Security Group — allow these inbound rules:

| Type  | Port | Source    |
|-------|------|-----------|
| SSH   | 22   | Your IP   |
| HTTP  | 80   | 0.0.0.0/0 |
| HTTPS | 443  | 0.0.0.0/0 |

3. Storage: **20 GB** minimum
4. Click **Launch Instance**
5. Note the **Public IP** of your instance

---

## Step 2 — Point DNS to EC2

In your domain registrar (wherever flappy.co.in is registered):

| Record | Name | Value          |
|--------|------|----------------|
| A      | @    | YOUR_EC2_IP    |
| A      | www  | YOUR_EC2_IP    |

DNS propagation takes 5–30 minutes.

---

## Step 3 — Connect to EC2

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

---

## Step 4 — Clone Your Repo & Setup Server

On the EC2 server:

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /home/ubuntu/flappy
cd /home/ubuntu/flappy

# Run server setup (installs Node, PM2, Nginx, Certbot)
bash deploy/setup-server.sh
```

---

## Step 5 — Configure Backend .env

```bash
nano /home/ubuntu/flappy/flappy_BE/.env
```

Make sure these values are set:
```env
PORT=3001
MONGODB_URI=mongodb+srv://streetnoshery:...@streetnoshery.g7ufm.mongodb.net/flappy?retryWrites=true&w=majority
FRONTEND_URL=https://flappy.co.in
ENABLE_ADVANCED_SEARCH=true
ENABLE_SHARE=true
# ... rest of flags
```

---

## Step 6 — Deploy Backend

```bash
cd /home/ubuntu/flappy
bash deploy/deploy-backend.sh
```

Verify it's running:
```bash
pm2 status
curl http://localhost:3001/health
```

---

## Step 7 — Deploy Frontend

```bash
bash deploy/deploy-frontend.sh
```

---

## Step 8 — Configure Nginx

```bash
bash deploy/setup-nginx.sh
```

Test HTTP works:
```bash
curl http://flappy.co.in
```

---

## Step 9 — Enable HTTPS (SSL)

Once DNS is pointing to your server:

```bash
bash deploy/setup-ssl.sh
```

Your site is now live at **https://flappy.co.in** 🎉

---

## Redeploying After Code Changes

Every time you push new code, SSH into the server and run:

```bash
cd /home/ubuntu/flappy
bash deploy/redeploy.sh
```

Or set up **GitHub Actions** for automatic deploys (see below).

---

## Auto Deploy with GitHub Actions (Optional)

1. Go to your GitHub repo → **Settings → Secrets → Actions**
2. Add these secrets:

| Secret      | Value                              |
|-------------|------------------------------------|
| EC2_HOST    | Your EC2 public IP                 |
| EC2_SSH_KEY | Contents of your .pem file         |

3. Push to `main` branch → deploys automatically

---

## Useful Commands on EC2

```bash
# Backend logs
pm2 logs flappy-backend

# Backend status
pm2 status

# Restart backend
pm2 restart flappy-backend

# Nginx status
sudo systemctl status nginx

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Reload nginx after config changes
sudo nginx -t && sudo systemctl reload nginx
```

---

## Estimated AWS Cost

| Resource     | Type      | Cost/month |
|--------------|-----------|------------|
| EC2          | t3.small  | ~$15       |
| Storage      | 20GB EBS  | ~$2        |
| Data transfer| ~10GB     | ~$1        |
| **Total**    |           | **~$18/mo**|

> Use a **t3.micro** (free tier eligible for 12 months) to reduce cost to ~$0 initially.
