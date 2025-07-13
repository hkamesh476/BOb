# PowerShell script to start Ollama server and Flask backend together
# Usage: Run this script from the project root

Start-Process -NoNewWindow -FilePath "ollama" -ArgumentList "serve"
Start-Sleep -Seconds 3
python app.py
