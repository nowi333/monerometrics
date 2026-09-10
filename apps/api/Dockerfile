# syntax=docker/dockerfile:1.6
FROM python:3.13-alpine

LABEL org.opencontainers.image.source="https://github.com/nowi333/monerometrics"
LABEL org.opencontainers.image.description="monerometrics API REST"
LABEL org.opencontainers.image.licenses="MIT"

RUN addgroup -S api && adduser -S api -G api

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY db.py models.py pricing.py txinfo.py main.py discovery.py pool_proofs.json ./

RUN chown -R api:api /app
USER api

EXPOSE 8000

# Le module servi est pilote par APP_MODULE, et non par un `command` dans le
# manifeste : `kubectl apply` remplace un `command` de facon atomique alors
# qu'il fusionne les variables d'environnement par nom. Une surcharge posee sur
# le cluster survit donc a un apply, au lieu d'etre silencieusement effacee.
CMD ["sh", "-c", "exec uvicorn ${APP_MODULE:-main}:app --host 0.0.0.0 --port 8000"]
