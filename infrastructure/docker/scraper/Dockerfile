# Scraper Dockerfile
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    gnupg \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome for Selenium
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver
RUN CHROMEDRIVER_VERSION=`curl -sS chromedriver.storage.googleapis.com/LATEST_RELEASE` && \
    wget -O /tmp/chromedriver.zip http://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip && \
    unzip /tmp/chromedriver.zip chromedriver -d /usr/local/bin/ && \
    rm /tmp/chromedriver.zip && \
    chmod +x /usr/local/bin/chromedriver

# Set working directory
WORKDIR /app

# Copy requirements
COPY apps/scraper/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base AS development

# Copy source code
COPY apps/scraper ./apps/scraper

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Start development server
CMD ["python", "-m", "uvicorn", "apps.scraper.src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base AS production

# Copy source code
COPY apps/scraper ./apps/scraper

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN useradd --create-home --shell /bin/bash scraper
USER scraper

# Expose port
EXPOSE 8000

# Start server
CMD ["python", "-m", "uvicorn", "apps.scraper.src.main:app", "--host", "0.0.0.0", "--port", "8000"]