#!/usr/bin/env python
"""
Startup script for the quiz app backend with Waitress
Optimized for handling 30-35 concurrent users

Usage:
python start_server.py
"""
import multiprocessing
import os
import sys

print("Starting server with Waitress (Windows compatible WSGI server)")
print("This configuration is optimized for handling 30-35 concurrent users")

try:
    # First try to import waitress
    try:
        from waitress import serve
        from app import app
        
        # Calculate a reasonable number of threads for the server
        cpu_count = multiprocessing.cpu_count()
        threads = (2 * cpu_count) + 1
        
        print(f"Running server with {threads} threads (based on {cpu_count} CPU cores)")
        print("Server will be available at http://localhost:5000")
        
        # Start the server
        serve(app, host="0.0.0.0", port=5000, threads=threads)
    except ImportError:
        print("Waitress is not installed. Please install it using:")
        print("pip install waitress")
        print("Then run this script again.")
        sys.exit(1)
except KeyboardInterrupt:
    print("\nShutting down gracefully...")
    sys.exit(0)
except Exception as e:
    print(f"Error starting server: {e}")
    sys.exit(1) 