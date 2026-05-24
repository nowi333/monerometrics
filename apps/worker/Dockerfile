# Worker monerometrics : indexe les blocs monerod dans Postgres + detecte les reorgs
FROM python:3.13-alpine

# Dependances build pour psycopg (binary nous evite la compilation, mais on garde au cas ou)
RUN apk add --no-cache libpq

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY indexer.py .

# noe user (UID 1000) pour ne pas tourner en root dans le pod
RUN adduser -D -u 1000 worker
USER worker

CMD ["python", "-u", "indexer.py"]
