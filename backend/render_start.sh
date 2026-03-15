#!/bin/bash
# Run Alembic migrations, then start the server
cd /opt/render/project/src/backend
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port $PORT
