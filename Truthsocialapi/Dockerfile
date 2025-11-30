FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for curl_cffi
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    libcurl4-openssl-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install build tools
RUN pip install --no-cache-dir poetry-core

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy and install truthbrush as a package
COPY truthbrush/ ./truthbrush-pkg/
RUN pip install --no-cache-dir ./truthbrush-pkg/

# Copy application code
COPY server.py .

# Expose port
EXPOSE 8000

# Run the server
CMD ["python", "server.py"]
