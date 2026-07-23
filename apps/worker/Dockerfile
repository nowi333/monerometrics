FROM python:3.13-alpine

RUN apk add --no-cache libpq

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY indexer.py retro_pools.py pools.py pool_proofs.py pool_proofs.json .

EXPOSE 9100

RUN adduser -D -u 1000 worker
USER worker

CMD ["python", "-u", "indexer.py"]
