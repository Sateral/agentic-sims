# PowerShell script to update the database schema and regenerate Prisma client

Write-Host "🚀 Updating database schema for hourly metrics tracking..." -ForegroundColor Green

# Generate and apply migration
Write-Host "📊 Creating migration for MetricSnapshot table..." -ForegroundColor Blue
npm run prisma:migrate:dev

# Generate Prisma client
Write-Host "🔄 Regenerating Prisma client..." -ForegroundColor Blue
npm run prisma:generate

Write-Host "✅ Database schema updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. The new MetricSnapshot table will track metrics hourly"
Write-Host "2. Old snapshots are automatically cleaned up after 30 days"
Write-Host "3. You can now call:"
Write-Host "   - uploadAgent.syncMetrics() - to collect hourly snapshots"
Write-Host "   - uploadAgent.getMetricsForTimeRange(uploadId, 'today'|'week'|'month')"
Write-Host "   - uploadAgent.getAggregatedMetrics(uploadId, range) - for dashboard data"
Write-Host ""
Write-Host "⏰ Consider setting up a cron job to run hourly metrics collection:" -ForegroundColor Cyan
Write-Host "   uploadAgent.scheduleHourlyMetricsCollection()"
