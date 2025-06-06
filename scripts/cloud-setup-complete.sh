#!/bin/bash

# Vibe Assistant Complete Cloud Setup Script
# This script does EVERYTHING needed after creating the .env file
# Run this ONCE after creating your .env file in the cloud VM

set -e

echo "🌩️  Vibe Assistant Complete Cloud Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

# Function to detect VM IP addresses
detect_vm_ips() {
    log_step "Detecting VM IP addresses..."
    
    # Try multiple methods to get external IP
    EXTERNAL_IP=""
    for service in "ifconfig.me" "ipinfo.io/ip" "icanhazip.com" "checkip.amazonaws.com"; do
        EXTERNAL_IP=$(curl -s --connect-timeout 5 "$service" 2>/dev/null | tr -d '\n' || echo "")
        if [[ "$EXTERNAL_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            break
        fi
        EXTERNAL_IP=""
    done
    
    # Get internal/private IP
    INTERNAL_IP=""
    if command -v hostname >/dev/null 2>&1; then
        INTERNAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
    fi
    
    # Alternative method for internal IP
    if [[ -z "$INTERNAL_IP" ]]; then
        INTERNAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -1 || echo "")
    fi
    
    # Another alternative
    if [[ -z "$INTERNAL_IP" ]]; then
        INTERNAL_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d'/' -f1 || echo "")
    fi
    
    # Determine the best IP to use
    if [[ -n "$EXTERNAL_IP" ]]; then
        VM_HOST="$EXTERNAL_IP"
        log_success "Using external IP: $EXTERNAL_IP"
    elif [[ -n "$INTERNAL_IP" ]]; then
        VM_HOST="$INTERNAL_IP"
        log_success "Using internal IP: $INTERNAL_IP"
    else
        VM_HOST="localhost"
        log_warning "Could not detect IP, using localhost"
    fi
    
    echo
    log_info "Detected IP Addresses:"
    [[ -n "$EXTERNAL_IP" ]] && echo "  🌐 External IP: $EXTERNAL_IP"
    [[ -n "$INTERNAL_IP" ]] && echo "  🏠 Internal IP: $INTERNAL_IP"
    echo "  🎯 Using for configuration: $VM_HOST"
    echo
}

# Function to validate .env file exists
validate_env_file() {
    log_step "Validating .env file..."
    
    ENV_FILE="$PROJECT_ROOT/.env"
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error ".env file not found at $ENV_FILE"
        echo
        echo "Please create a .env file with your configuration first:"
        echo "Example .env file:"
        echo "AWS_ACCESS_KEY_ID=your_aws_key"
        echo "AWS_SECRET_ACCESS_KEY=your_aws_secret"
        echo "AWS_DEFAULT_REGION=us-east-1"
        echo "GITHUB_TOKEN=your_github_token"
        echo "GITHUB_DEFAULT_REPO=https://github.com/user/repo"
        echo
        exit 1
    fi
    
    # Load environment variables
    source "$ENV_FILE"
    
    # Validate required variables
    if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
        log_warning "AWS credentials not found in .env file"
        log_warning "AI features will not work without AWS credentials"
    else
        log_success "AWS credentials found in .env file"
    fi
    
    if [[ -z "$GITHUB_TOKEN" ]]; then
        log_warning "GitHub token not found in .env file"
        log_warning "Repository features will be limited"
    else
        log_success "GitHub token found in .env file"
    fi
    
    log_success ".env file validation complete"
}

# Function to fix package.json (from fix-package-json.sh)
fix_package_json() {
    log_step "Fixing frontend package.json for cloud deployment..."
    
    FRONTEND_DIR="$PROJECT_ROOT/frontend"
    PACKAGE_JSON="$FRONTEND_DIR/package.json"
    
    # Backup the current package.json
    if [[ -f "$PACKAGE_JSON" ]]; then
        cp "$PACKAGE_JSON" "$PACKAGE_JSON.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backed up current package.json"
    fi
    
    # Create a clean package.json without proxy
    cat > "$PACKAGE_JSON" << 'EOF'
{
  "name": "vibe-assistant-frontend",
  "version": "1.0.0",
  "description": "Frontend for Vibe Coding Assistant - AI-powered prompt builder for developers",
  "private": true,
  "dependencies": {
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^3.5.0"
  },
  "scripts": {
    "start": "BROWSER=none HOST=0.0.0.0 react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^14.5.0",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.4",
    "tailwindcss": "^3.4.17"
  }
}
EOF
    
    log_success "Created clean package.json without proxy"
    
    # Validate JSON syntax
    if command -v node >/dev/null 2>&1; then
        if node -e "JSON.parse(require('fs').readFileSync('$PACKAGE_JSON', 'utf8'))" 2>/dev/null; then
            log_success "JSON syntax is valid"
        else
            log_error "JSON syntax is invalid"
            exit 1
        fi
    fi
}

# Function to create frontend .env file
create_frontend_env() {
    log_step "Creating frontend .env file..."
    
    FRONTEND_ENV_FILE="$PROJECT_ROOT/frontend/.env"
    
    # Backup existing frontend .env if it exists
    if [[ -f "$FRONTEND_ENV_FILE" ]]; then
        cp "$FRONTEND_ENV_FILE" "$FRONTEND_ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Create frontend .env with proper API URL
    cat > "$FRONTEND_ENV_FILE" << EOF
# Frontend Cloud Configuration
# Generated on $(date)

# API Configuration - CRITICAL for cloud deployment
REACT_APP_API_URL=http://$VM_HOST:5000

# App Information
REACT_APP_VERSION=1.0.0
REACT_APP_NAME=Vibe Assistant
REACT_APP_ENVIRONMENT=production

# Build Optimization
GENERATE_SOURCEMAP=false
DISABLE_ESLINT_PLUGIN=true
TSC_COMPILE_ON_ERROR=true
SKIP_PREFLIGHT_CHECK=true
BROWSER=none
NODE_ENV=production

# Network Configuration
HOST=0.0.0.0
PORT=3000
EOF
    
    log_success "Created frontend .env file with API URL: http://$VM_HOST:5000"
}

# Function to update main .env file for cloud
update_main_env() {
    log_step "Updating main .env file for cloud deployment..."
    
    ENV_FILE="$PROJECT_ROOT/.env"
    
    # Backup the original .env
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Read existing .env and add cloud-specific variables
    {
        # Keep existing content
        cat "$ENV_FILE"
        echo
        echo "# Cloud VM Configuration - Added by cloud-setup-complete.sh"
        echo "VM_HOST=$VM_HOST"
        echo "EXTERNAL_IP=${EXTERNAL_IP:-}"
        echo "INTERNAL_IP=${INTERNAL_IP:-}"
        echo "HOST=0.0.0.0"
        echo "PORT=5000"
        echo "FLASK_ENV=production"
        echo "FLASK_DEBUG=False"
        echo "NEO4J_URI=bolt://$VM_HOST:7687"
        echo "NEO4J_USER=neo4j"
        echo "NEO4J_PASSWORD=${NEO4J_PASSWORD:-vibeassistant}"
    } > "$ENV_FILE.tmp"
    
    mv "$ENV_FILE.tmp" "$ENV_FILE"
    
    log_success "Updated main .env file for cloud deployment"
}

# Function to configure Docker Compose for cloud
configure_docker_compose() {
    log_step "Configuring Docker Compose for cloud deployment..."
    
    DOCKER_COMPOSE_FILE="$PROJECT_ROOT/database/docker-compose.yml"
    
    # Create database directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/database"
    
    # Backup existing docker-compose.yml if it exists
    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        cp "$DOCKER_COMPOSE_FILE" "$DOCKER_COMPOSE_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Create cloud-optimized docker-compose.yml
    cat > "$DOCKER_COMPOSE_FILE" << EOF
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15-community
    container_name: vibe-neo4j-cloud
    ports:
      - "0.0.0.0:7474:7474"  # HTTP - accessible from all interfaces
      - "0.0.0.0:7687:7687"  # Bolt - accessible from all interfaces
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD:-vibeassistant}
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
      - NEO4J_dbms_security_procedures_allowlist=apoc.*
      - NEO4J_dbms_connector_bolt_listen_address=0.0.0.0:7687
      - NEO4J_dbms_connector_http_listen_address=0.0.0.0:7474
      - NEO4J_dbms_memory_heap_initial_size=512m
      - NEO4J_dbms_memory_heap_max_size=1G
      - NEO4J_dbms_memory_pagecache_size=512m
      - NEO4J_dbms_default_listen_address=0.0.0.0
      - NEO4J_dbms_default_advertised_address=$VM_HOST
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_import:/var/lib/neo4j/import
      - neo4j_plugins:/plugins
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -u neo4j -p ${NEO4J_PASSWORD:-vibeassistant} 'RETURN 1'"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - vibe-network

networks:
  vibe-network:
    driver: bridge

volumes:
  neo4j_data:
  neo4j_logs:
  neo4j_import:
  neo4j_plugins:
EOF
    
    log_success "Configured Docker Compose for cloud deployment"
}

# Function to ensure streaming functionality is preserved
preserve_streaming_functionality() {
    log_step "Ensuring streaming functionality is preserved..."
    
    # Check if the streaming fix is in place in ApiService.js
    API_SERVICE_FILE="$PROJECT_ROOT/frontend/src/services/ApiService.js"
    
    if [[ -f "$API_SERVICE_FILE" ]]; then
        # Check if the setTimeout fix is present
        if grep -q "setTimeout.*onChunk" "$API_SERVICE_FILE"; then
            log_success "Streaming fix is already in place in ApiService.js"
        else
            log_warning "Streaming fix not found in ApiService.js"
            log_info "Adding streaming fix to prevent batching issues..."
            
            # Backup the file
            cp "$API_SERVICE_FILE" "$API_SERVICE_FILE.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Apply the streaming fix
            sed -i.tmp 's/onChunk(data\.chunk);/setTimeout(() => { onChunk(data.chunk); }, 0);/g' "$API_SERVICE_FILE"
            rm -f "$API_SERVICE_FILE.tmp"
            
            log_success "Applied streaming fix to ApiService.js"
        fi
    else
        log_warning "ApiService.js not found - streaming may not work properly"
    fi
}

# Function to create cloud startup script
create_cloud_startup_script() {
    log_step "Creating cloud startup script..."
    
    STARTUP_SCRIPT="$PROJECT_ROOT/scripts/start-cloud.sh"
    
    cat > "$STARTUP_SCRIPT" << EOF
#!/bin/bash

# Vibe Assistant Cloud Startup Script
# Generated by cloud-setup-complete.sh on $(date)

set -e

# Load environment variables
if [[ -f "\$(dirname "\$0")/../.env" ]]; then
    source "\$(dirname "\$0")/../.env"
fi

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="\$(dirname "\$SCRIPT_DIR")"

echo "🚀 Starting Vibe Assistant (Cloud Mode)"
echo "======================================="
echo "VM Host: ${VM_HOST}"
echo "External IP: ${EXTERNAL_IP:-'Not detected'}"
echo "Internal IP: ${INTERNAL_IP:-'Not detected'}"
echo

# Function to check if a port is in use
check_port() {
    local port=\$1
    if lsof -Pi :\$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local service_name="\$1"
    local port="\$2"
    local max_retries="\$3"
    local retries=0
    
    echo "⏳ Waiting for \$service_name to start on port \$port..."
    while [[ \$retries -lt \$max_retries ]]; do
        if check_port \$port; then
            echo "✅ \$service_name is ready on port \$port"
            return 0
        fi
        echo "   Attempt \$((retries + 1))/\$max_retries..."
        sleep 3
        retries=\$((retries + 1))
    done
    
    echo "❌ \$service_name failed to start on port \$port"
    return 1
}

# Create logs directory
mkdir -p "\$PROJECT_ROOT/logs"

# Start Neo4j
echo "📊 Starting Neo4j database..."
cd "\$PROJECT_ROOT/database"
if ! docker-compose ps | grep -q "Up"; then
    docker-compose up -d
    if ! wait_for_service "Neo4j" 7474 20; then
        echo "❌ Failed to start Neo4j"
        exit 1
    fi
else
    echo "✅ Neo4j is already running"
fi

# Start Backend
echo "🔧 Starting backend server..."
cd "\$PROJECT_ROOT/backend"

# Kill existing backend processes
pkill -f "python.*app.py" 2>/dev/null || true
sleep 2

# Start backend with proper environment
export FLASK_ENV=production
export FLASK_DEBUG=False
export HOST=0.0.0.0
export PORT=5000
nohup python3 app.py > ../logs/backend.log 2>&1 &

if ! wait_for_service "Backend" 5000 15; then
    echo "❌ Failed to start backend"
    echo "Backend logs:"
    tail -20 "\$PROJECT_ROOT/logs/backend.log"
    exit 1
fi

# Start Frontend
echo "🌐 Starting frontend server..."
cd "\$PROJECT_ROOT/frontend"

# Kill existing frontend processes
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "node.*react-scripts" 2>/dev/null || true
sleep 2

# Clear npm cache to avoid issues
npm cache clean --force 2>/dev/null || true

# Set environment variables for cloud deployment
export NODE_ENV=production
export GENERATE_SOURCEMAP=false
export DISABLE_ESLINT_PLUGIN=true
export TSC_COMPILE_ON_ERROR=true
export SKIP_PREFLIGHT_CHECK=true
export BROWSER=none
export HOST=0.0.0.0
export PORT=3000

# Start frontend
nohup npm start > ../logs/frontend.log 2>&1 &

if ! wait_for_service "Frontend" 3000 30; then
    echo "❌ Failed to start frontend"
    echo "Frontend logs:"
    tail -20 "\$PROJECT_ROOT/logs/frontend.log"
    exit 1
fi

echo
echo "🎉 Vibe Assistant is now running in the cloud!"
echo "=============================================="
echo
echo "Access URLs:"
echo "  🌐 Application: http://${VM_HOST}:3000"
echo "  🔧 Backend API: http://${VM_HOST}:5000"
echo "  📊 Neo4j Browser: http://${VM_HOST}:7474"
echo
echo "Service Status:"
echo "  Backend Health: curl -s http://${VM_HOST}:5000/api/health"
echo "  Frontend: curl -s http://${VM_HOST}:3000"
echo
echo "Logs:"
echo "  Backend: tail -f \$PROJECT_ROOT/logs/backend.log"
echo "  Frontend: tail -f \$PROJECT_ROOT/logs/frontend.log"
echo "  Neo4j: docker-compose -f \$PROJECT_ROOT/database/docker-compose.yml logs -f"
echo
echo "To stop services:"
echo "  pkill -f 'python.*app.py'"
echo "  pkill -f 'react-scripts'"
echo "  docker-compose -f \$PROJECT_ROOT/database/docker-compose.yml down"
EOF
    
    chmod +x "$STARTUP_SCRIPT"
    log_success "Created cloud startup script: scripts/start-cloud.sh"
}

# Function to create firewall configuration script
create_firewall_script() {
    log_step "Creating firewall configuration script..."
    
    FIREWALL_SCRIPT="$PROJECT_ROOT/scripts/configure-firewall.sh"
    
    cat > "$FIREWALL_SCRIPT" << 'EOF'
#!/bin/bash

# Vibe Assistant Firewall Configuration
echo "🔥 Configuring firewall for Vibe Assistant"
echo "==========================================="

# Required ports
BACKEND_PORT=5000
FRONTEND_PORT=3000
NEO4J_HTTP_PORT=7474
NEO4J_BOLT_PORT=7687

# Check if ufw is available
if command -v ufw >/dev/null 2>&1; then
    echo "Using UFW (Ubuntu/Debian)..."
    
    # Enable UFW if not already enabled
    sudo ufw --force enable
    
    # Allow SSH (important!)
    sudo ufw allow ssh
    
    # Allow application ports
    sudo ufw allow $BACKEND_PORT/tcp comment "Vibe Assistant Backend"
    sudo ufw allow $FRONTEND_PORT/tcp comment "Vibe Assistant Frontend"
    sudo ufw allow $NEO4J_HTTP_PORT/tcp comment "Neo4j HTTP"
    sudo ufw allow $NEO4J_BOLT_PORT/tcp comment "Neo4j Bolt"
    
    # Show status
    sudo ufw status verbose
    
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "Using firewalld (CentOS/RHEL/Fedora)..."
    
    # Add ports to firewall
    sudo firewall-cmd --permanent --add-port=$BACKEND_PORT/tcp
    sudo firewall-cmd --permanent --add-port=$FRONTEND_PORT/tcp
    sudo firewall-cmd --permanent --add-port=$NEO4J_HTTP_PORT/tcp
    sudo firewall-cmd --permanent --add-port=$NEO4J_BOLT_PORT/tcp
    
    # Reload firewall
    sudo firewall-cmd --reload
    
    # Show status
    sudo firewall-cmd --list-all
    
else
    echo "⚠️  No supported firewall found (ufw or firewalld)"
    echo "Please manually open these ports:"
    echo "  - $BACKEND_PORT (Backend API)"
    echo "  - $FRONTEND_PORT (Frontend App)"
    echo "  - $NEO4J_HTTP_PORT (Neo4j HTTP)"
    echo "  - $NEO4J_BOLT_PORT (Neo4j Bolt)"
fi

echo
echo "✅ Firewall configuration complete!"
echo "Make sure your cloud provider's security groups also allow these ports."
EOF
    
    chmod +x "$FIREWALL_SCRIPT"
    log_success "Created firewall configuration script: scripts/configure-firewall.sh"
}

# Function to install dependencies
install_dependencies() {
    log_step "Installing dependencies..."
    
    # Install backend dependencies
    cd "$PROJECT_ROOT/backend"
    if [[ -f "requirements.txt" ]]; then
        log_info "Installing Python dependencies..."
        pip3 install -r requirements.txt
        log_success "Python dependencies installed"
    fi
    
    # Install root dependencies
    cd "$PROJECT_ROOT"
    if [[ -f "package.json" ]]; then
        log_info "Installing root npm dependencies..."
        npm install
        log_success "Root npm dependencies installed"
    fi
    
    # Install frontend dependencies
    cd "$PROJECT_ROOT/frontend"
    log_info "Installing frontend dependencies..."
    
    # Clear npm cache first
    npm cache clean --force 2>/dev/null || true
    
    # Remove node_modules and package-lock.json to ensure clean install
    rm -rf node_modules package-lock.json 2>/dev/null || true
    
    # Install dependencies
    npm install
    log_success "Frontend dependencies installed"
    
    cd "$PROJECT_ROOT"
}

# Function to test configuration
test_configuration() {
    log_step "Testing configuration..."
    
    # Test if required files exist
    local required_files=(
        "$PROJECT_ROOT/.env"
        "$PROJECT_ROOT/frontend/.env"
        "$PROJECT_ROOT/frontend/package.json"
        "$PROJECT_ROOT/database/docker-compose.yml"
        "$PROJECT_ROOT/scripts/start-cloud.sh"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            log_success "Found: $(basename "$file")"
        else
            log_error "Missing: $file"
            return 1
        fi
    done
    
    # Test environment variables
    source "$PROJECT_ROOT/.env"
    
    if [[ -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        log_success "AWS credentials configured"
    else
        log_warning "AWS credentials not configured - AI features will not work"
    fi
    
    # Test frontend .env
    if grep -q "REACT_APP_API_URL=http://$VM_HOST:5000" "$PROJECT_ROOT/frontend/.env"; then
        log_success "Frontend API URL correctly configured"
    else
        log_error "Frontend API URL not correctly configured"
        return 1
    fi
    
    log_success "Configuration test passed!"
}

# Main execution
main() {
    echo "Starting complete cloud setup..."
    echo
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. Consider using a non-root user for security."
    fi
    
    # Check prerequisites
    log_step "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command -v docker >/dev/null 2>&1; then
        missing_deps+=("docker")
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm")
    fi
    
    if ! command -v python3 >/dev/null 2>&1; then
        missing_deps+=("python3")
    fi
    
    if ! command -v pip3 >/dev/null 2>&1; then
        missing_deps+=("pip3")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        echo
        echo "Please install the missing dependencies first:"
        echo "Ubuntu/Debian:"
        echo "  sudo apt update"
        echo "  sudo apt install -y docker.io docker-compose nodejs npm python3 python3-pip"
        echo
        echo "CentOS/RHEL:"
        echo "  sudo yum install -y docker docker-compose nodejs npm python3 python3-pip"
        echo
        exit 1
    fi
    
    log_success "Prerequisites check passed"
    
    # Execute configuration steps
    validate_env_file
    detect_vm_ips
    fix_package_json
    create_frontend_env
    update_main_env
    configure_docker_compose
    preserve_streaming_functionality
    create_cloud_startup_script
    create_firewall_script
    install_dependencies
    test_configuration
    
    echo
    echo "🎉 Complete Cloud Setup Finished!"
    echo "================================="
    echo
    echo "📋 Summary:"
    echo "  VM Host: $VM_HOST"
    echo "  External IP: ${EXTERNAL_IP:-'Not detected'}"
    echo "  Internal IP: ${INTERNAL_IP:-'Not detected'}"
    echo "  Frontend API URL: http://$VM_HOST:5000"
    echo
    echo "🚀 Next Steps:"
    echo "1. Configure firewall: ./scripts/configure-firewall.sh"
    echo "2. Start the application: ./scripts/start-cloud.sh"
    echo
    echo "🌐 Access URLs (after starting):"
    echo "  Application: http://$VM_HOST:3000"
    echo "  Backend API: http://$VM_HOST:5000"
    echo "  Neo4j Browser: http://$VM_HOST:7474"
    echo
    echo "📁 Files created/updated:"
    echo "  ✅ .env (updated with cloud config)"
    echo "  ✅ frontend/.env (created with API URL)"
    echo "  ✅ frontend/package.json (fixed, no proxy)"
    echo "  ✅ database/docker-compose.yml (cloud optimized)"
    echo "  ✅ scripts/start-cloud.sh (startup script)"
    echo "  ✅ scripts/configure-firewall.sh (firewall script)"
    echo
    echo "🔧 Streaming functionality: PRESERVED"
    echo "🌐 Network configuration: ALL INTERFACES (0.0.0.0)"
    echo "📦 Dependencies: INSTALLED"
    echo
    log_success "Your cloud VM is ready! Run './scripts/start-cloud.sh' to start the application."
}

# Run main function
main "$@" 