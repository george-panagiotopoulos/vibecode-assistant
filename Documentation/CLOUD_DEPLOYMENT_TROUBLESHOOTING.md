# Cloud Deployment Troubleshooting Guide

This guide helps resolve common issues when deploying Vibe Assistant on cloud VMs.

## Quick Diagnosis

### 1. Check if the issue is specific to Hierarchical Planning

**Symptoms:**
- ✅ Import graph works fine
- ✅ Graph loads in prompt builder
- ❌ Graph won't load in hierarchical planning screen

**Root Cause:** Usually hardcoded localhost references or network configuration issues.

### 2. Test API Connectivity

```bash
# Test if backend is accessible
curl -X GET http://YOUR_VM_IP:5000/api/health

# Test graph nodes endpoint specifically
curl -X GET http://YOUR_VM_IP:5000/api/graph/nodes

# Test Neo4j connectivity
curl -X POST http://YOUR_VM_IP:5000/api/test-connection/neo4j
```

## Common Issues and Solutions

### Issue 1: "Neo4j service not available" Error

**Symptoms:**
- Error message: "Neo4j service not available"
- Hierarchical planning screen shows loading state indefinitely

**Solutions:**

1. **Check Neo4j Container Status:**
   ```bash
   cd database
   docker-compose ps
   docker-compose logs neo4j
   ```

2. **Verify Neo4j Configuration:**
   ```bash
   # Check if Neo4j is accessible
   docker exec -it vibe-neo4j cypher-shell -u neo4j -p vibeassistant
   ```

3. **Update Environment Variables:**
   ```bash
   # In .env file, update:
   NEO4J_URI=bolt://YOUR_VM_IP:7687
   # or for localhost:
   NEO4J_URI=bolt://localhost:7687
   ```

4. **Restart Services:**
   ```bash
   # Restart Neo4j
   cd database && docker-compose restart neo4j
   
   # Restart backend
   cd backend && python app.py
   ```

### Issue 2: Frontend Can't Connect to Backend

**Symptoms:**
- Network errors in browser console
- API calls failing with connection refused

**Solutions:**

1. **Check Backend Configuration:**
   ```bash
   # Ensure backend is running on all interfaces
   # In backend/app.py, verify:
   app.run(host='0.0.0.0', port=5000, debug=True)
   ```

2. **Update Frontend Configuration:**
   ```bash
   # Set REACT_APP_API_URL in .env:
   REACT_APP_API_URL=http://YOUR_VM_IP:5000
   
   # Or leave empty for relative URLs:
   REACT_APP_API_URL=
   ```

3. **Check Firewall Rules:**
   ```bash
   # Ubuntu/Debian
   sudo ufw status
   sudo ufw allow 5000
   sudo ufw allow 3000
   sudo ufw allow 7474
   sudo ufw allow 7687
   
   # CentOS/RHEL
   sudo firewall-cmd --list-all
   sudo firewall-cmd --add-port=5000/tcp --permanent
   sudo firewall-cmd --add-port=3000/tcp --permanent
   sudo firewall-cmd --add-port=7474/tcp --permanent
   sudo firewall-cmd --add-port=7687/tcp --permanent
   sudo firewall-cmd --reload
   ```

### Issue 3: Neo4j Browser Links Don't Work

**Symptoms:**
- Clicking "Open Neo4j Browser" opens localhost:7474
- Neo4j browser not accessible from external IP

**Solutions:**

1. **Use Cloud Setup Script:**
   ```bash
   chmod +x scripts/setup-cloud.sh
   ./scripts/setup-cloud.sh
   ```

2. **Manual Fix - Update Docker Compose:**
   ```yaml
   # In database/docker-compose.yml
   services:
     neo4j:
       ports:
         - "0.0.0.0:7474:7474"  # Bind to all interfaces
         - "0.0.0.0:7687:7687"  # Bind to all interfaces
       environment:
         - NEO4J_dbms_connector_bolt_listen_address=0.0.0.0:7687
         - NEO4J_dbms_connector_http_listen_address=0.0.0.0:7474
   ```

3. **Verify Neo4j Accessibility:**
   ```bash
   # Test from external machine
   curl http://YOUR_VM_IP:7474
   ```

### Issue 4: CORS Issues

**Symptoms:**
- CORS errors in browser console
- API calls blocked by browser

**Solutions:**

1. **Update Backend CORS Configuration:**
   ```python
   # In backend/app.py, ensure CORS is configured:
   from flask_cors import CORS
   CORS(app, origins=['http://YOUR_VM_IP:3000', 'http://localhost:3000'])
   ```

2. **Use Proxy Configuration:**
   ```json
   // In frontend/package.json (for development)
   {
     "proxy": "http://YOUR_VM_IP:5000"
   }
   ```

### Issue 5: Environment Variables Not Loading

**Symptoms:**
- Default localhost values being used
- Configuration not reflecting .env changes

**Solutions:**

1. **Verify .env File Location:**
   ```bash
   # .env should be in project root
   ls -la .env
   cat .env | grep NEO4J_URI
   ```

2. **Restart All Services:**
   ```bash
   # Stop all services
   pkill -f "python app.py"
   pkill -f "npm start"
   cd database && docker-compose down
   
   # Start fresh
   cd database && docker-compose up -d
   cd backend && python app.py &
   cd frontend && npm start
   ```

3. **Check Environment Loading:**
   ```bash
   # In backend, add debug logging:
   import os
   print(f"NEO4J_URI: {os.getenv('NEO4J_URI')}")
   ```

## Automated Setup

Use the cloud setup script for automatic configuration:

```bash
# Run the cloud setup script
chmod +x scripts/setup-cloud.sh
./scripts/setup-cloud.sh

# Follow the prompts to configure:
# - VM hostname/IP
# - Neo4j password
# - Port configurations
```

## Manual Verification Steps

### 1. Test Neo4j Connection
```bash
# Direct connection test
docker exec -it vibe-neo4j cypher-shell -u neo4j -p vibeassistant "RETURN 'Connected' as status"
```

### 2. Test Backend API
```bash
# Health check
curl http://YOUR_VM_IP:5000/api/health

# Graph data
curl http://YOUR_VM_IP:5000/api/graph/nodes
```

### 3. Test Frontend Access
```bash
# Check if frontend is accessible
curl http://YOUR_VM_IP:3000
```

## Cloud Provider Specific Notes

### AWS EC2
- Update Security Groups to allow ports 3000, 5000, 7474, 7687
- Consider using Elastic IP for stable addressing
- Use IAM roles for AWS service access

### Google Cloud Platform
- Update firewall rules: `gcloud compute firewall-rules create allow-vibe-ports --allow tcp:3000,tcp:5000,tcp:7474,tcp:7687`
- Use static external IP

### Azure
- Update Network Security Group rules
- Configure public IP address

### DigitalOcean
- Update firewall rules in control panel
- Use floating IP for stability

## Production Considerations

1. **Use HTTPS:**
   ```bash
   # Set up SSL certificates
   sudo apt install certbot
   sudo certbot --nginx -d your-domain.com
   ```

2. **Use Environment-Specific Configs:**
   ```bash
   # Create production .env
   cp .env .env.production
   # Edit .env.production with production values
   ```

3. **Monitor Services:**
   ```bash
   # Use systemd for service management
   sudo systemctl enable docker
   sudo systemctl enable nginx
   ```

4. **Backup Neo4j Data:**
   ```bash
   # Regular backups
   docker exec vibe-neo4j neo4j-admin dump --database=neo4j --to=/backups/neo4j-backup.dump
   ```

## Getting Help

If issues persist:

1. Check application logs:
   ```bash
   # Backend logs
   tail -f backend/logs/app.log
   
   # Neo4j logs
   docker-compose logs neo4j
   
   # Frontend console (browser developer tools)
   ```

2. Verify network connectivity:
   ```bash
   # Test port accessibility
   telnet YOUR_VM_IP 5000
   telnet YOUR_VM_IP 7687
   ```

3. Create a minimal test case and share logs when seeking support. 