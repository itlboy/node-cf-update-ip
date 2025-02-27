@echo off
cd /d %~dp0
echo Stop if running
docker compose down -t0
echo Pulling latest code
git pull
echo Building images...
docker compose build
echo Starting containers...
docker compose up -d
echo Done.
