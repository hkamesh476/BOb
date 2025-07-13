# PowerShell script to automatically install Ollama on Windows
# Run this script after cloning the repo

Write-Host "Downloading Ollama installer..."
Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile "OllamaSetup.exe"
Write-Host "Running Ollama installer..."
Start-Process -FilePath "OllamaSetup.exe" -Wait
Write-Host "Ollama installation complete."
Write-Host "To start the Ollama server, run: ollama serve"
Write-Host "To pull the Phi-3 model, run: ollama pull phi3"
