FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY . .
RUN pip install --no-cache-dir .
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
