import os
import json
from ai.nn_model import SimpleNNIntentModel

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data'))
TRAINING_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'training_data.json'))


import threading


# (Removed: BankAIAssistant and all chatbot logic. Replaced by Ollama Phi-3 integration.)
