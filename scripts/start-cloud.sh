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

# Create logs directory
mkdir -p logs

# Kill any existing processes
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "node.*react-scripts" 2>/dev/null || true

# Start Neo4j and wait for it
echo "📊 Starting Neo4j..."
cd database && docker-compose up -d && cd ..

# Wait for Neo4j to be ready
echo "⏳ Waiting for Neo4j to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:7474 >/dev/null 2>&1; then
        echo "✅ Neo4j is ready"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 2
done

# Start Backend with explicit host binding
echo "🔧 Starting backend..."
cd backend
export HOST=0.0.0.0
export PORT=5000
export FLASK_RUN_HOST=0.0.0.0
export FLASK_RUN_PORT=5000
nohup python3 app.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 2
done

# Start Frontend
echo "🌐 Starting frontend..."
cd frontend
export HOST=0.0.0.0
export PORT=3000
export BROWSER=none
export GENERATE_SOURCEMAP=false
nohup npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "✅ Frontend is ready"
        break
    fi
    echo "   Attempt $i/60..."
    sleep 3
done

echo ""
echo "✅ All services started successfully!"
echo "🌐 Frontend: http://3.235.20.192:3000"
echo "🔧 Backend: http://3.235.20.192:5000"
echo "📊 Neo4j: http://3.235.20.192:7474"
echo ""
echo "📋 Process IDs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📊 To check logs:"
echo "   Backend: tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo "   Neo4j: docker-compose -f database/docker-compose.yml logs -f" 