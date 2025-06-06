#!/bin/bash

# Cloud Deployment Diagnostic Script
# This script helps diagnose issues with graph data on cloud VMs

set -e

echo "🔍 Vibe Assistant Cloud Diagnostics"
echo "===================================="

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to check if a service is running
check_service() {
    local service_name="$1"
    local port="$2"
    
    echo "🔍 Checking $service_name on port $port..."
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ $service_name is running on port $port"
        return 0
    else
        echo "❌ $service_name is NOT running on port $port"
        return 1
    fi
}

# Function to test API endpoint
test_api() {
    local endpoint="$1"
    local description="$2"
    
    echo "🌐 Testing $description..."
    
    local response=$(curl -s -w "\n%{http_code}" "http://localhost:5000$endpoint" 2>/dev/null || echo "ERROR\n000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ $description: SUCCESS"
        if [ "$endpoint" = "/api/graph/nodes" ]; then
            # Check if we have actual graph data
            local node_count=$(echo "$body" | grep -o '"nodes":\[' | wc -l)
            local edge_count=$(echo "$body" | grep -o '"edges":\[' | wc -l)
            echo "   📊 Response contains nodes array: $node_count, edges array: $edge_count"
            
            # Try to count actual nodes and edges
            if command -v jq >/dev/null 2>&1; then
                local actual_nodes=$(echo "$body" | jq '.data.nodes | length' 2>/dev/null || echo "unknown")
                local actual_edges=$(echo "$body" | jq '.data.edges | length' 2>/dev/null || echo "unknown")
                echo "   📈 Actual nodes: $actual_nodes, edges: $actual_edges"
            fi
        fi
        return 0
    else
        echo "❌ $description: FAILED (HTTP $http_code)"
        echo "   Response: $body"
        return 1
    fi
}

# Function to test Neo4j directly
test_neo4j_direct() {
    echo "🗄️  Testing Neo4j database directly..."
    
    # Check if Neo4j container is running
    if docker ps | grep -q "vibe-neo4j"; then
        echo "✅ Neo4j container is running"
        
        # Test Neo4j connection
        echo "🔐 Testing Neo4j authentication..."
        if docker exec -it vibe-neo4j cypher-shell -u neo4j -p vibeassistant "RETURN 'Connected' as status" >/dev/null 2>&1; then
            echo "✅ Neo4j authentication successful"
            
            # Count nodes and relationships
            echo "📊 Checking database content..."
            local node_count=$(docker exec -it vibe-neo4j cypher-shell -u neo4j -p vibeassistant "MATCH (n) RETURN count(n) as count" 2>/dev/null | grep -o '[0-9]\+' | head -1 || echo "0")
            local rel_count=$(docker exec -it vibe-neo4j cypher-shell -u neo4j -p vibeassistant "MATCH ()-[r]->() RETURN count(r) as count" 2>/dev/null | grep -o '[0-9]\+' | head -1 || echo "0")
            
            echo "   📈 Total nodes in database: $node_count"
            echo "   🔗 Total relationships in database: $rel_count"
            
            if [ "$node_count" = "0" ]; then
                echo "⚠️  Database is empty - this explains why graphs are missing!"
                return 1
            else
                echo "✅ Database contains data"
                return 0
            fi
        else
            echo "❌ Neo4j authentication failed"
            return 1
        fi
    else
        echo "❌ Neo4j container is not running"
        return 1
    fi
}

# Function to check environment variables
check_environment() {
    echo "🔧 Checking environment configuration..."
    
    # Check .env file
    if [ -f "$PROJECT_ROOT/.env" ]; then
        echo "✅ .env file exists"
        
        local neo4j_uri=$(grep "NEO4J_URI" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
        local neo4j_user=$(grep "NEO4J_USER" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
        local neo4j_pass=$(grep "NEO4J_PASSWORD" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
        
        echo "   🔗 NEO4J_URI: $neo4j_uri"
        echo "   👤 NEO4J_USER: $neo4j_user"
        echo "   🔑 NEO4J_PASSWORD: [${#neo4j_pass} characters]"
        
        # Check if URI points to localhost vs external IP
        if echo "$neo4j_uri" | grep -q "localhost"; then
            echo "   ℹ️  Using localhost URI (good for local connections)"
        else
            echo "   ℹ️  Using external URI (check if this IP is accessible)"
        fi
    else
        echo "❌ .env file not found"
        return 1
    fi
    
    # Check frontend .env
    if [ -f "$PROJECT_ROOT/frontend/.env" ]; then
        echo "✅ Frontend .env file exists"
        local api_url=$(grep "REACT_APP_API_URL" "$PROJECT_ROOT/frontend/.env" | cut -d'=' -f2)
        echo "   🌐 REACT_APP_API_URL: $api_url"
    else
        echo "⚠️  Frontend .env file not found"
    fi
}

# Function to suggest fixes
suggest_fixes() {
    echo
    echo "🔧 Suggested Fixes"
    echo "=================="
    
    if ! check_service "Neo4j" "7687" >/dev/null 2>&1; then
        echo "1. Start Neo4j:"
        echo "   cd $PROJECT_ROOT/database && docker-compose up -d"
        echo
    fi
    
    if ! check_service "Backend" "5000" >/dev/null 2>&1; then
        echo "2. Start Backend:"
        echo "   cd $PROJECT_ROOT/backend && python app.py &"
        echo
    fi
    
    if ! test_neo4j_direct >/dev/null 2>&1; then
        echo "3. Import graph data (if database is empty):"
        echo "   # You need to re-import your graph data"
        echo "   # Use the import functionality in the application"
        echo "   # Or restore from a backup if available"
        echo
    fi
    
    echo "4. Check logs for detailed errors:"
    echo "   # Backend logs"
    echo "   tail -f $PROJECT_ROOT/logs/backend.log"
    echo
    echo "   # Neo4j logs"
    echo "   docker-compose -f $PROJECT_ROOT/database/docker-compose.yml logs -f"
    echo
    echo "   # Frontend logs"
    echo "   tail -f $PROJECT_ROOT/logs/frontend.log"
}

# Main diagnostic flow
echo "Starting comprehensive diagnostics..."
echo

# Check services
echo "📋 Service Status Check"
echo "======================="
check_service "Neo4j HTTP" "7474"
check_service "Neo4j Bolt" "7687"
check_service "Backend API" "5000"
check_service "Frontend" "3000"
echo

# Check environment
echo "🔧 Environment Check"
echo "===================="
check_environment
echo

# Test Neo4j directly
echo "🗄️  Database Check"
echo "=================="
test_neo4j_direct
echo

# Test API endpoints
echo "🌐 API Endpoint Tests"
echo "===================="
test_api "/api/health" "Backend Health Check"
test_api "/api/config" "Backend Config Check"
test_api "/api/graph/nodes" "Graph Nodes API"
echo

# Provide suggestions
suggest_fixes

echo
echo "🎯 Quick Commands for Common Issues"
echo "==================================="
echo "# Restart all services:"
echo "cd $PROJECT_ROOT && ./scripts/start.sh"
echo
echo "# Check if data import is needed:"
echo "curl -s http://localhost:5000/api/graph/nodes | grep -o '\"nodes\":\\[.*\\]' | wc -c"
echo
echo "# Access Neo4j browser:"
echo "echo 'Open http://$(hostname -I | awk '{print $1}'):7474 in your browser'"
echo
echo "Diagnostics complete! 🏁" 