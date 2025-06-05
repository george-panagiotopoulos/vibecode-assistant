#!/bin/bash

# Vibe Assistant Cloud Deployment Setup Script
# This script helps configure the application for cloud VM deployment

set -e

echo "🌩️  Vibe Assistant Cloud Deployment Setup"
echo "=========================================="

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to get user input with default value
get_input() {
    local prompt="$1"
    local default="$2"
    local result
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " result
        echo "${result:-$default}"
    else
        read -p "$prompt: " result
        echo "$result"
    fi
}

# Function to detect current IP
detect_ip() {
    # Try to get external IP
    local external_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
    
    # Try to get internal IP
    local internal_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || ip route get 1 2>/dev/null | awk '{print $7}' | head -1 || echo "")
    
    echo "Detected IPs:"
    [ -n "$external_ip" ] && echo "  External: $external_ip"
    [ -n "$internal_ip" ] && echo "  Internal: $internal_ip"
    echo
}

echo "This script will help you configure Vibe Assistant for cloud deployment."
echo

# Detect current environment
detect_ip

# Get configuration from user
echo "📝 Configuration Setup"
echo "----------------------"

VM_HOST=$(get_input "Enter your VM hostname or IP address" "$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost')")
NEO4J_PASSWORD=$(get_input "Enter Neo4j password" "vibeassistant")
BACKEND_PORT=$(get_input "Enter backend port" "5000")
FRONTEND_PORT=$(get_input "Enter frontend port" "3000")

echo
echo "🔧 Updating configuration files..."

# Create cloud-specific .env file
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Backing up existing .env to .env.backup"
    cp "$ENV_FILE" "$ENV_FILE.backup"
fi

# Update .env file
cat > "$ENV_FILE" << EOF
# AWS Configuration
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-your_aws_access_key_here}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-your_aws_secret_key_here}
AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
AWS_BEDROCK_MODEL_ID=${AWS_BEDROCK_MODEL_ID:-anthropic.claude-3-5-sonnet-20240620-v1:0}

# GitHub Configuration
GITHUB_TOKEN=${GITHUB_TOKEN:-your_github_token_here}
GITHUB_DEFAULT_REPO=${GITHUB_DEFAULT_REPO:-https://github.com/your-username/your-repo}

# Neo4j Configuration (Cloud)
NEO4J_URI=bolt://${VM_HOST}:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=${NEO4J_PASSWORD}

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
FLASK_SECRET_KEY=vibe-assistant-secret-key-2024

# Application Configuration
LOG_LEVEL=INFO
MAX_FILE_SIZE_KB=1000
DEFAULT_TASK_TYPE=development

# React App Configuration (Cloud)
REACT_APP_API_URL=http://${VM_HOST}:${BACKEND_PORT}
REACT_APP_VERSION=1.0.0
REACT_APP_NAME=Vibe Assistant

# Development Configuration
GENERATE_SOURCEMAP=false
BROWSER=none
EOF

echo "✅ Updated .env file for cloud deployment"

# Remove proxy from frontend package.json for cloud deployment
FRONTEND_PACKAGE_JSON="$PROJECT_ROOT/frontend/package.json"
if [ -f "$FRONTEND_PACKAGE_JSON" ]; then
    echo "🔧 Removing proxy configuration from frontend package.json..."
    
    # Backup original
    cp "$FRONTEND_PACKAGE_JSON" "$FRONTEND_PACKAGE_JSON.backup"
    
    # Remove proxy line using sed
    if grep -q '"proxy"' "$FRONTEND_PACKAGE_JSON"; then
        # Remove the proxy line and the preceding comma if it exists
        sed -i.tmp '/[[:space:]]*"proxy"[[:space:]]*:[[:space:]]*"[^"]*"[[:space:]]*,\?/d' "$FRONTEND_PACKAGE_JSON"
        # Clean up any trailing commas before closing braces
        sed -i.tmp 's/,[[:space:]]*}/}/g' "$FRONTEND_PACKAGE_JSON"
        rm -f "$FRONTEND_PACKAGE_JSON.tmp"
        echo "✅ Removed proxy configuration for cloud deployment"
    else
        echo "ℹ️  No proxy configuration found in package.json"
    fi
fi

# Update Docker Compose for cloud deployment
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/database/docker-compose.yml"
if [ -f "$DOCKER_COMPOSE_FILE" ]; then
    echo "📦 Updating Docker Compose configuration..."
    
    # Backup original
    cp "$DOCKER_COMPOSE_FILE" "$DOCKER_COMPOSE_FILE.backup"
    
    # Update docker-compose.yml to bind to all interfaces
    cat > "$DOCKER_COMPOSE_FILE" << EOF
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15-community
    container_name: vibe-neo4j
    ports:
      - "0.0.0.0:7474:7474"  # HTTP - bind to all interfaces
      - "0.0.0.0:7687:7687"  # Bolt - bind to all interfaces
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
      - NEO4J_dbms_security_procedures_allowlist=apoc.*
      - NEO4J_dbms_connector_bolt_listen_address=0.0.0.0:7687
      - NEO4J_dbms_connector_http_listen_address=0.0.0.0:7474
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_import:/var/lib/neo4j/import
      - neo4j_plugins:/plugins
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -u neo4j -p ${NEO4J_PASSWORD} 'RETURN 1'"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  neo4j_data:
  neo4j_logs:
  neo4j_import:
  neo4j_plugins:
EOF
    
    echo "✅ Updated Docker Compose for cloud deployment"
fi

echo
echo "🚀 Cloud Deployment Configuration Complete!"
echo "==========================================="
echo
echo "Configuration Summary:"
echo "  VM Host: $VM_HOST"
echo "  Neo4j URI: bolt://$VM_HOST:7687"
echo "  Backend URL: http://$VM_HOST:$BACKEND_PORT"
echo "  Frontend URL: http://$VM_HOST:$FRONTEND_PORT"
echo
echo "Next Steps:"
echo "1. Ensure ports $BACKEND_PORT, $FRONTEND_PORT, 7474, and 7687 are open in your firewall"
echo "2. Start Neo4j: cd database && docker-compose up -d"
echo "3. Start the application: npm run start"
echo
echo "Firewall Commands (Ubuntu/Debian):"
echo "  sudo ufw allow $BACKEND_PORT"
echo "  sudo ufw allow $FRONTEND_PORT"
echo "  sudo ufw allow 7474"
echo "  sudo ufw allow 7687"
echo
echo "Access URLs:"
echo "  Application: http://$VM_HOST:$FRONTEND_PORT"
echo "  Neo4j Browser: http://$VM_HOST:7474"
echo "  Backend API: http://$VM_HOST:$BACKEND_PORT"
echo
echo "⚠️  Remember to:"
echo "   - Update your AWS and GitHub credentials in .env"
echo "   - Configure your cloud provider's security groups"
echo "   - Consider using HTTPS in production" 