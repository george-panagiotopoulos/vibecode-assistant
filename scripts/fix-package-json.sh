#!/bin/bash

# Fix malformed package.json file
# This script recreates a clean package.json without proxy for cloud deployment

set -e

echo "🔧 Fixing frontend package.json for cloud deployment..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
PACKAGE_JSON="$FRONTEND_DIR/package.json"

# Backup the current (possibly corrupted) package.json
if [ -f "$PACKAGE_JSON" ]; then
    echo "📦 Backing up current package.json..."
    cp "$PACKAGE_JSON" "$PACKAGE_JSON.corrupted.backup"
fi

# Create a clean package.json without proxy
echo "✨ Creating clean package.json..."
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
    "start": "BROWSER=none react-scripts start",
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

echo "✅ Fixed package.json - removed proxy configuration"

# Validate the JSON
if command -v node >/dev/null 2>&1; then
    echo "🔍 Validating JSON syntax..."
    if node -e "JSON.parse(require('fs').readFileSync('$PACKAGE_JSON', 'utf8'))" 2>/dev/null; then
        echo "✅ JSON syntax is valid"
    else
        echo "❌ JSON syntax is still invalid"
        exit 1
    fi
elif command -v python3 >/dev/null 2>&1; then
    echo "🔍 Validating JSON syntax with Python..."
    if python3 -c "import json; json.load(open('$PACKAGE_JSON'))" 2>/dev/null; then
        echo "✅ JSON syntax is valid"
    else
        echo "❌ JSON syntax is still invalid"
        exit 1
    fi
else
    echo "⚠️  Cannot validate JSON syntax (no node or python3 available)"
fi

# Clear npm cache to avoid any cached issues
echo "🧹 Clearing npm cache..."
cd "$FRONTEND_DIR"
npm cache clean --force 2>/dev/null || true

echo
echo "🎉 Package.json has been fixed!"
echo "📍 Location: $PACKAGE_JSON"
echo
echo "Next steps:"
echo "1. Stop the current service: sudo systemctl stop vibecode-assistant.service"
echo "2. Restart the service: sudo systemctl start vibecode-assistant.service"
echo "3. Monitor logs: journalctl -u vibecode-assistant.service -f" 