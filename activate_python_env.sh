#!/bin/bash

# Activation script for the Python virtual environment
# Run this script to activate the virtual environment with all required packages

echo "Activating Python virtual environment..."
cd D:/Coding/React Projects/agentic-sims
source venv/bin/activate

echo "Python virtual environment activated!"
echo "You can now run Python scripts that use pygame, opencv, numpy, etc."
echo ""
echo "To test the environment, run: python test_python_env.py"
echo "To deactivate, run: deactivate"
echo ""

# Keep the shell open
exec bash
