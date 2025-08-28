#!/bin/bash

# Campaign Manager - Force Restart Script
# Kills processes on ports 3333, 5555, 9999 and restarts services

echo "🔄 Campaign Manager Force Restart"
echo "=================================="

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local process=$(lsof -ti:$port)
    
    if [ ! -z "$process" ]; then
        echo "⚡ Killing process on port $port (PID: $process)"
        kill -9 $process 2>/dev/null || true
        sleep 1
        
        # Verify process is killed
        local check=$(lsof -ti:$port)
        if [ -z "$check" ]; then
            echo "✅ Port $port is now free"
        else
            echo "⚠️  Warning: Process may still be running on port $port"
        fi
    else
        echo "ℹ️  No process found on port $port"
    fi
}

echo ""
echo "🔍 Checking and killing processes on ports..."

# Kill processes on our target ports
kill_port 3333  # Frontend
kill_port 4444  # Backend
kill_port 9999  # Python Scraper

echo ""
echo "🚀 Starting services with pnpm..."
echo ""

# Start the services
pnpm dev

echo ""
echo "✅ Force restart complete!"