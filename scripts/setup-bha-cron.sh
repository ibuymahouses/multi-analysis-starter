#!/bin/bash

# Setup BHA Data Pipeline Cron Job
# This script sets up a monthly cron job to update BHA Payment Standards data

set -e

echo "Setting up BHA data pipeline cron job..."

# Create the cron job entry
# Runs on the 1st of each month at 2 AM
CRON_JOB="0 2 1 * * cd /opt/rent-api && source venv/bin/activate && python3 bha-payment-standards-future.py >> /var/log/bha-data-pipeline.log 2>&1"

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ BHA data pipeline cron job set up successfully!"
echo "📅 Schedule: 1st of each month at 2:00 AM"
echo "📝 Logs: /var/log/bha-data-pipeline.log"

# Test the cron job setup
echo "Current crontab entries:"
crontab -l
