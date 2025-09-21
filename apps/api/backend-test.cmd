@echo off
echo === Running classify transaction test ===

REM --- Backend URL (change to AWS public IP if not localhost) ---
set URL=http://localhost:3000/v1/classify/transaction

REM --- JWT token (replace with your latest valid one) ---
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWY4YWZ5NjkwMDAyeGV0cjl1NHV6OWNiIiwidGVuYW50SWQiOiJjbWY4YWZ4dTEwMDAweGV0cmtmZXl0OXNoIiwicm9sZSI6Ik9XTkVSIiwiaWF0IjoxNzU3MTY0NjE1LCJleHAiOjE3NTcxNzU0MTV9.8PdI-Gdx4C79zOVtxsAxnB1SsTBQPKnIZ5o05-A1S7k

REM --- Run the request using payload.json ---
curl -X POST %URL% ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d @payload.json

echo.
echo === Done ===
pause
