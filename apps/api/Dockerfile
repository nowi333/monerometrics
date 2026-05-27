# syntax=docker/dockerfile:1.6
FROM python:3.13-alpine

# Metadata
LABEL org.opencontainers.image.source="https://github.com/nowi333/monerometrics"
LABEL org.opencontainers.image.description="monerometrics API REST"
LABEL org.opencontainers.image.licenses="MIT"

# Non-root user
RUN addgroup -S api && adduser -S api -G api

WORKDIR /app

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY db.py models.py main.py ./

# Permissions
RUN chown -R api:api /app
USER api

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
