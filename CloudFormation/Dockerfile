FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY app.py index.html ./

RUN addgroup --system --gid 10001 app \
    && adduser --system --uid 10001 --ingroup app app

USER 10001:10001
EXPOSE 5000

CMD ["python", "app.py"]
