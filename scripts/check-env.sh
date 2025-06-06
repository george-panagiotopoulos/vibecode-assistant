#!/bin/bash

# Simple .env file checker and fixer
# Run this first if you're having .env issues

echo "🔍 Checking .env file..."
echo "========================"

ENV_FILE=".env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file first."
    exit 1
fi

echo "📄 Current .env file contents:"
echo "------------------------------"
cat -n "$ENV_FILE"
echo "------------------------------"
echo

echo "🧹 Checking for problematic lines..."

# Check each line
line_num=0
problematic_lines=()

while IFS= read -r line || [[ -n "$line" ]]; do
    ((line_num++))
    
    # Skip empty lines
    [[ -z "$line" ]] && continue
    
    # Skip comment lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    
    # Check if line looks like a valid environment variable
    if [[ ! "$line" =~ ^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*= ]]; then
        echo "⚠️  Line $line_num looks problematic: $line"
        problematic_lines+=("$line_num")
    fi
done < "$ENV_FILE"

if [[ ${#problematic_lines[@]} -eq 0 ]]; then
    echo "✅ .env file looks good!"
    echo
    echo "Testing if it can be loaded..."
    if source "$ENV_FILE" 2>/dev/null; then
        echo "✅ .env file loads successfully!"
    else
        echo "❌ .env file has syntax errors"
        echo "Try running: bash -n .env"
    fi
else
    echo
    echo "❌ Found ${#problematic_lines[@]} problematic line(s)"
    echo
    echo "🔧 Would you like me to create a clean .env file? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy] ]]; then
        # Backup original
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        echo "📦 Backed up original .env file"
        
        # Create clean version
        {
            while IFS= read -r line || [[ -n "$line" ]]; do
                # Skip empty lines
                [[ -z "$line" ]] && continue
                
                # Keep comment lines
                [[ "$line" =~ ^[[:space:]]*# ]] && echo "$line" && continue
                
                # Keep valid environment variables
                if [[ "$line" =~ ^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*= ]]; then
                    # Clean up whitespace
                    cleaned_line=$(echo "$line" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
                    echo "$cleaned_line"
                fi
            done < "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S | tail -1)"
        } > "$ENV_FILE"
        
        echo "✅ Created clean .env file"
        echo
        echo "📄 New .env file contents:"
        echo "-------------------------"
        cat -n "$ENV_FILE"
        echo "-------------------------"
        
        # Test the new file
        if source "$ENV_FILE" 2>/dev/null; then
            echo "✅ Clean .env file loads successfully!"
            echo "🚀 You can now run: ./scripts/cloud-setup-complete.sh"
        else
            echo "❌ Clean .env file still has issues"
            echo "Please check the format manually"
        fi
    else
        echo "Please fix the problematic lines manually:"
        echo "Each line should be in format: VARIABLE_NAME=value"
        echo "No spaces around the = sign"
        echo "No special characters that could be interpreted by shell"
    fi
fi 