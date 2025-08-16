#!/bin/bash

# Setup script for AI Video Generation System

echo "Setting up AI Video Generation System..."

# Create Python virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up your environment variables in .env:"
echo "   - DATABASE_URL (PostgreSQL connection string)"
echo "   - OPENAI_API_KEY (for video analysis)"
echo "   - YOUTUBE_API_KEY (for YouTube uploads)"
echo "   - TIKTOK_API_KEY (for TikTok uploads)"
echo "   - INSTAGRAM_ACCESS_TOKEN (for Instagram uploads)"
echo ""
echo "2. Run database migrations:"
echo "   npm run prisma:migrate"
echo ""
echo "3. Seed the database (optional):"
echo "   npm run prisma:seed"
echo ""
echo "4. Start the development server:"
echo "   npm run dev"
