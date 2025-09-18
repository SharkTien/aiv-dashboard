#!/bin/bash

# Simple maintenance toggle script
MAINTENANCE_FLAG="maintenance.flag"

if [ -f "$MAINTENANCE_FLAG" ]; then
    # Maintenance is ON, turn it OFF
    rm "$MAINTENANCE_FLAG"
    echo "✅ Maintenance mode DISABLED"
    echo "🌐 Website is now accessible to all users"
else
    # Maintenance is OFF, turn it ON
    touch "$MAINTENANCE_FLAG"
    echo "🔧 Maintenance mode ENABLED"
    echo "🚫 Website is now in maintenance mode"
    echo "📝 To disable: run this script again"
fi

echo ""
echo "🔄 Restarting PM2 to apply changes..."
pm2 restart aiv-dashboard

echo ""
echo "📊 PM2 Status:"
pm2 status
