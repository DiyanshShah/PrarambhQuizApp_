#!/usr/bin/env python
"""
Startup script for the quiz app backend with Gunicorn
Optimized for handling 30-35 concurrent users

Usage:
python start_server.py
"""
import multiprocessing
import subprocess
import os
import sys

# Calculate the optimal number of workers
# A common formula is (2 * cpu_count) + 1
# This provides a good balance for handling concurrent requests
cpu_count = multiprocessing.cpu_count()
workers = (2 * cpu_count) + 1

print(f"Starting server with {workers} workers (based on {cpu_count} CPU cores)")
print("This configuration is optimized for handling 30-35 concurrent users")

# Command to start Gunicorn
# - workers: number of worker processes
# - threads: threads per worker (increasing concurrency)
# - timeout: timeout for worker processes (increased for long requests)
# - bind: IP and port to bind to
# - worker-class: sync for simplicity, gevent for more concurrent connections
cmd = [
    "gunicorn",
    "--workers", str(workers),
    "--threads", "2",
    "--timeout", "120",
    "--bind", "0.0.0.0:5000",
    "--worker-class", "sync",
    "app:app"
]

# Run the command
try:
    print(f"Running command: {' '.join(cmd)}")
    process = subprocess.run(cmd)
    sys.exit(process.returncode)
except KeyboardInterrupt:
    print("\nShutting down gracefully...")
    sys.exit(0)
except Exception as e:
    print(f"Error starting server: {e}")
    sys.exit(1) 