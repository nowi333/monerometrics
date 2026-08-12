FROM python:3.13-alpine

RUN addgroup -S mcp && adduser -S mcp -G mcp

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

RUN chown -R mcp:mcp /app
USER mcp

EXPOSE 8080

CMD ["python", "server.py"]
