#!/bin/bash

# Vibe Assistant Startup Script
# This script starts the Neo4j database, Flask backend, and React frontend

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the absolute path of the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "🏠 Project root: $PROJECT_ROOT"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Function to check if a port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to check if a Docker container is running
check_container() {
    docker ps --format "table {{.Names}}" | grep -q "^$1$" 2>/dev/null
}

# Function to check if a Docker container exists (running or stopped)
container_exists() {
    docker ps -a --format "table {{.Names}}" | grep -q "^$1$" 2>/dev/null
}

# Cleanup function
cleanup() {
    echo ""
    print_info "Cleaning up..."
    
    # Kill background processes if they exist
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Stop Neo4j container
    cd "$PROJECT_ROOT/database"
    docker-compose down >/dev/null 2>&1 || true
    cd "$PROJECT_ROOT"
    
    print_info "Cleanup completed"
}

# Set up signal handlers
trap cleanup EXIT
trap cleanup INT
trap cleanup TERM

echo "🚀 Starting Vibe Assistant..."

# Check dependencies
echo "🔍 Checking dependencies..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    print_error "Docker Compose not found. Please install Docker Compose."
    exit 1
fi

print_status "Dependencies check passed"

# Neo4j Database Setup
echo "🐳 Setting up Neo4j database..."

# Navigate to database directory
cd "$PROJECT_ROOT/database"

# Check if Neo4j container is already running
if check_container "vibe-neo4j"; then
    print_status "Neo4j container is already running"
else
    # Check if container exists but is stopped
    if container_exists "vibe-neo4j"; then
        print_info "Starting existing Neo4j container..."
        docker-compose start neo4j
    else
        print_info "Creating and starting new Neo4j container..."
        # Stop any existing containers first
        docker-compose down >/dev/null 2>&1 || true
        # Start Neo4j with Docker Compose
        docker-compose up -d neo4j
    fi
    
    if [ $? -eq 0 ]; then
        print_status "Neo4j container started successfully"
    else
        print_error "Failed to start Neo4j container"
        print_info "Check Docker logs with: cd database && docker-compose logs neo4j"
        exit 1
    fi
fi

# Wait for Neo4j to be ready (up to 60 seconds)
print_info "Waiting for Neo4j to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:7474 >/dev/null 2>&1; then
        print_status "Neo4j is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        print_error "Neo4j failed to start within 60 seconds"
        print_info "Check logs with: cd database && docker-compose logs neo4j"
        exit 1
    fi
    printf "."
    sleep 1
done
echo ""

# Return to project root
cd "$PROJECT_ROOT"

# Check if ports are already in use and handle conflicts
if check_port 5000; then
    print_warning "Port 5000 is already in use (Backend)"
    read -p "Kill existing process? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:5000 | xargs kill -9 2>/dev/null || true
        print_info "Killed existing process on port 5000"
        sleep 2  # Give time for port to be released
    else
        print_error "Cannot start backend - port 5000 is in use"
        exit 1
    fi
fi

if check_port 3000; then
    print_warning "Port 3000 is already in use (Frontend)"
    read -p "Kill existing process? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        print_info "Killed existing process on port 3000"
        sleep 2  # Give time for port to be released
    else
        print_error "Cannot start frontend - port 3000 is in use"
        exit 1
    fi
fi

# Start Backend Server
echo "🐍 Starting Flask backend server..."
cd "$PROJECT_ROOT/backend"
python3 app.py &
BACKEND_PID=$!
cd "$PROJECT_ROOT"

# Wait for backend to start
print_info "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        print_status "Backend server started successfully on port 5000"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Backend server failed to start"
        exit 1
    fi
    printf "."
    sleep 1
done
echo ""

# Start Frontend Server
echo "⚛️  Starting React frontend server..."
cd "$PROJECT_ROOT/frontend"
npm start &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

# Wait for frontend to start
print_info "Waiting for frontend to start..."
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend server started successfully on port 3000"
        break
    fi
    if [ $i -eq 60 ]; then
        print_error "Frontend server failed to start"
        exit 1
    fi
    printf "."
    sleep 1
done
echo ""

echo ""
echo "🎉 Vibe Assistant is now running!"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000"
echo "   Neo4j:     http://localhost:7474 (user: neo4j, password: vibeassistant)"
echo ""
print_info "Press Ctrl+C to stop all servers"

# Keep script running and wait for signals
wait 