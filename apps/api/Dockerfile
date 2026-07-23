# syntax=docker/dockerfile:1.6
FROM python:3.13-alpine

LABEL org.opencontainers.image.source="https://github.com/nowi333/monerometrics"
LABEL org.opencontainers.image.description="monerometrics API REST"
LABEL org.opencontainers.image.licenses="MIT"

RUN addgroup -S api && adduser -S api -G api

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY db.py models.py main.py pool_proofs.json ./

RUN chown -R api:api /app
USER api

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
