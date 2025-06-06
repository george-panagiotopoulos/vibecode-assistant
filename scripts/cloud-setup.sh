#!/bin/bash

# Simple Cloud Setup for Vibe Assistant
# Run this ONCE after creating your .env file in the project root

set -e

echo "🌩️  Vibe Assistant Cloud Setup"
echo "=============================="

# Go to project root
cd "$(dirname "$0")/.."

# Check if .env exists in project root
if [[ ! -f ".env" ]]; then
    echo "❌ .env file not found in project root!"
    echo "Create a .env file in the project root with your AWS and GitHub credentials"
    exit 1
fi

# Clean .env file first
echo "🧹 Cleaning .env file..."
cp .env .env.backup
{
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip empty lines
        [[ -z "$line" ]] && continue
        # Keep comment lines
        [[ "$line" =~ ^[[:space:]]*# ]] && echo "$line" && continue
        # Keep valid environment variables only
        if [[ "$line" =~ ^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*= ]]; then
            echo "$line"
        fi
    done < .env.backup
} > .env
echo "✅ Cleaned .env file"

# Get VM IP
echo "🔍 Detecting VM IP..."
VM_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")
echo "✅ VM IP: $VM_IP"

# Add all cloud config to the single .env file
echo "⚙️  Adding cloud configuration to .env..."
echo "" >> .env
echo "# Cloud Configuration - Added by cloud-setup.sh" >> .env
echo "HOST=0.0.0.0" >> .env
echo "PORT=5000" >> .env
echo "REACT_APP_API_URL=http://$VM_IP:5000" >> .env
echo "GENERATE_SOURCEMAP=false" >> .env
echo "BROWSER=none" >> .env

# Fix frontend package.json (remove proxy)
echo "🔧 Fixing frontend package.json..."
cat > frontend/package.json << 'EOF'
{
  "name": "vibe-assistant-frontend",
  "version": "1.0.0",
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
    "extends": ["react-app", "react-app/jest"]
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
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

# Create Docker Compose for Neo4j
echo "📊 Setting up Neo4j..."
mkdir -p database
cat > database/docker-compose.yml << EOF
version: '3.8'
services:
  neo4j:
    image: neo4j:5.15-community
    ports:
      - "0.0.0.0:7474:7474"
      - "0.0.0.0:7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/vibeassistant
      - NEO4J_dbms_default_listen_address=0.0.0.0
    volumes:
      - neo4j_data:/data
    restart: unless-stopped
volumes:
  neo4j_data:
EOF

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && pip3 install -r requirements.txt && cd ..
cd frontend && npm install && cd ..

# Update the existing start script
echo "🚀 Updating start script..."
cat > scripts/start-cloud.sh << 'EOF'
#!/bin/bash
set -e

# Go to project root
cd "$(dirname "$0")/.."

# Clean .env file before loading (same as setup script)
if [[ -f ".env" ]]; then
    cp .env .env.backup.start
    {
        while IFS= read -r line || [[ -n "$line" ]]; do
            # Skip empty lines
            [[ -z "$line" ]] && continue
            # Keep comment lines
            [[ "$line" =~ ^[[:space:]]*# ]] && echo "$line" && continue
            # Keep valid environment variables only
            if [[ "$line" =~ ^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*= ]]; then
                echo "$line"
            fi
        done < .env.backup.start
    } > .env
fi

# Load environment variables
source .env

echo "🚀 Starting Vibe Assistant..."

# Start Neo4j
cd database && docker-compose up -d && cd ..
sleep 10

# Start Backend
cd backend
nohup python3 app.py > ../logs/backend.log 2>&1 &
cd ..
sleep 5

# Start Frontend
cd frontend
nohup npm start > ../logs/frontend.log 2>&1 &
cd ..

echo "✅ Services started!"
echo "🌐 Frontend: http://$VM_IP:3000"
echo "🔧 Backend: http://$VM_IP:5000"
echo "📊 Neo4j: http://$VM_IP:7474"
EOF

chmod +x scripts/start-cloud.sh

# Create logs directory
mkdir -p logs

echo ""
echo "✅ Cloud setup complete!"
echo "========================"
echo "VM IP: $VM_IP"
echo ""
echo "🚀 To start the application:"
echo "./scripts/start-cloud.sh"
echo ""
echo "🌐 Access URLs:"
echo "Frontend: http://$VM_IP:3000"
echo "Backend: http://$VM_IP:5000"
echo "Neo4j: http://$VM_IP:7474" 