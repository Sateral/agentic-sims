#!/bin/bash

# Script to update the database schema and regenerate Prisma client

echo "🚀 Updating database schema for hourly metrics tracking..."

# Generate and apply migration
echo "📊 Creating migration for MetricSnapshot table..."
npx prisma migrate dev --name add-metric-snapshots

# Generate Prisma client
echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo "✅ Database schema updated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. The new MetricSnapshot table will track metrics hourly"
echo "2. Old snapshots are automatically cleaned up after 30 days"
echo "3. You can now call:"
echo "   - uploadAgent.syncMetrics() - to collect hourly snapshots"
echo "   - uploadAgent.getMetricsForTimeRange(uploadId, 'today'|'week'|'month')"
echo "   - uploadAgent.getAggregatedMetrics(uploadId, range) - for dashboard data"
echo ""
echo "⏰ Consider setting up a cron job to run hourly metrics collection:"
echo "   uploadAgent.scheduleHourlyMetricsCollection()"
