# Deployment Guide for Home Server (bombz.gab1.fr)

This guide covers deploying the Bombz game server on your home server with Docker and Nginx reverse proxy.

## Prerequisites

- Docker and Docker Compose installed on your server
- Nginx installed
- Domain `bombz.gab1.fr` pointing to your server's IP address
- Ports 80 and 443 open in your firewall/router

## Step 1: DNS Configuration

Make sure your domain points to your server:

1. **A Record**: `bombz.gab1.fr` → `YOUR_SERVER_IP`
2. Wait for DNS propagation (can take a few minutes to hours)

Verify DNS:
```bash
dig bombz.gab1.fr
# or
nslookup bombz.gab1.fr
```

## Step 2: Clone and Prepare

1. **SSH into your server**:
   ```bash
   ssh user@your-server-ip
   ```

2. **Clone your repository** (or upload files):
   ```bash
   git clone <your-repo-url> /opt/bombs
   cd /opt/bombs
   ```

   Or if you're uploading manually:
   ```bash
   mkdir -p /opt/bombs
   # Upload all files to /opt/bombs
   ```

## Step 3: Set Up SSL Certificate (Let's Encrypt)

1. **Install Certbot** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Create directory for ACME challenge**:
   ```bash
   sudo mkdir -p /var/www/certbot
   ```

3. **Temporarily configure Nginx for HTTP** (for initial certificate):
   ```bash
   sudo nano /etc/nginx/sites-available/bombz.gab1.fr
   ```
   
   Add this temporary config:
   ```nginx
   server {
       listen 80;
       server_name bombz.gab1.fr;
       
       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }
       
       location / {
           return 301 https://$server_name$request_uri;
       }
   }
   ```

4. **Enable the site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/bombz.gab1.fr /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Obtain SSL certificate**:
   ```bash
   sudo certbot --nginx -d bombz.gab1.fr
   ```
   
   Follow the prompts. Certbot will automatically update your Nginx config.

## Step 4: Configure Nginx

1. **Copy the provided Nginx config**:
   ```bash
   sudo cp /opt/bombs/nginx.conf /etc/nginx/sites-available/bombz.gab1.fr
   ```

2. **Update SSL certificate paths** (if certbot used different paths):
   ```bash
   sudo nano /etc/nginx/sites-available/bombz.gab1.fr
   ```
   
   Verify the paths match what certbot created:
   - `ssl_certificate /etc/letsencrypt/live/bombz.gab1.fr/fullchain.pem;`
   - `ssl_certificate_key /etc/letsencrypt/live/bombz.gab1.fr/privkey.pem;`

3. **Test Nginx configuration**:
   ```bash
   sudo nginx -t
   ```

4. **Reload Nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

## Step 5: Build and Run Docker Container

1. **Navigate to project directory**:
   ```bash
   cd /opt/bombs
   ```

2. **Build the Docker image**:
   ```bash
   docker-compose build
   ```

3. **Start the container**:
   ```bash
   docker-compose up -d
   ```

4. **Check if it's running**:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## Step 6: Verify Everything Works

1. **Check Docker container**:
   ```bash
   curl http://localhost:5555
   ```

2. **Check Nginx proxy**:
   ```bash
   curl https://bombz.gab1.fr
   ```

3. **Test WebSocket** (in browser console):
   ```javascript
   const ws = new WebSocket('wss://bombz.gab1.fr/ws/test-session');
   ws.onopen = () => console.log('WebSocket connected!');
   ```

4. **Visit in browser**: `https://bombz.gab1.fr`

## Step 7: Set Up Auto-Start (Optional)

Create a systemd service to ensure Docker Compose starts on boot:

1. **Create service file**:
   ```bash
   sudo nano /etc/systemd/system/bombs.service
   ```

2. **Add this content**:
   ```ini
   [Unit]
   Description=Bombz Game Server
   Requires=docker.service
   After=docker.service

   [Service]
   Type=oneshot
   RemainAfterExit=yes
   WorkingDirectory=/opt/bombs
   ExecStart=/usr/local/bin/docker-compose up -d
   ExecStop=/usr/local/bin/docker-compose down
   TimeoutStartSec=0

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable bombs.service
   sudo systemctl start bombs.service
   ```

## Maintenance Commands

### View logs
```bash
cd /opt/bombs
docker-compose logs -f
```

### Restart container
```bash
cd /opt/bombs
docker-compose restart
```

### Update and redeploy
```bash
cd /opt/bombs
git pull  # or upload new files
docker-compose build
docker-compose up -d
```

### Stop container
```bash
cd /opt/bombs
docker-compose down
```

### Update SSL certificate (auto-renewal)
Certbot should auto-renew, but you can test:
```bash
sudo certbot renew --dry-run
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs

# Check if port is already in use
sudo netstat -tulpn | grep 5555

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Nginx 502 Bad Gateway
- Check if Docker container is running: `docker-compose ps`
- Check if container is listening: `curl http://localhost:5555`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/bombz.gab1.fr.error.log`

### WebSocket not working
- Verify `proxy_set_header Upgrade` and `proxy_set_header Connection` are in Nginx config
- Check browser console for WebSocket errors
- Test WebSocket connection: `wscat -c wss://bombz.gab1.fr/ws/test`

### SSL certificate issues
```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
```

## Firewall Configuration

If you're using UFW:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

If you're using iptables or have a router, ensure ports 80 and 443 are forwarded to your server.

## Environment Variables

You can modify environment variables in `docker-compose.yml`:

```yaml
environment:
  - PORT=5555
  - CORS_ORIGIN=https://bombz.gab1.fr  # Important: match your domain
```

After changing, restart:
```bash
docker-compose down
docker-compose up -d
```

## Security Notes

1. **CORS_ORIGIN**: Set to your exact domain (`https://bombz.gab1.fr`) in production
2. **Firewall**: Only expose ports 80/443, not 5555 directly
3. **SSL**: Always use HTTPS in production
4. **Updates**: Keep Docker, Nginx, and your system updated

## Quick Reference

```bash
# Project directory
cd /opt/bombs

# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Rebuild after code changes
docker-compose build && docker-compose up -d

# Nginx reload
sudo systemctl reload nginx

# Nginx test config
sudo nginx -t
```



