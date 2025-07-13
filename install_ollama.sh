#!/bin/bash
# Script to automatically install Ollama on Mac/Linux

set -e

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected macOS. Installing Ollama via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "Homebrew not found. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install ollama
else
    echo "Detected Linux. Installing Ollama..."
    curl -fsSL https://ollama.com/download/linux.sh | sh
fi

echo "Ollama installation complete."
echo "To start the Ollama server, run: ollama serve"
echo "To pull the Phi-3 model, run: ollama pull phi3"
