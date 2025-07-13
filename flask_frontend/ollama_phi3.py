# Ollama Phi-3 integration for Bank of Begonia
# All neural network code is removed. This file handles all AI assistant logic using Ollama Phi-3 and streams responses word-by-word to the frontend.

import requests
import os
import json
from flask import Blueprint, request, session, Response

ollama_bp = Blueprint('ollama_bp', __name__)
OLLAMA_API_URL = os.environ.get('OLLAMA_API_URL', 'http://localhost:11434')
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data'))
TRAINING_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'ai', 'training_data.json'))

def get_event_context(user=None):
    context = {}
    for fname in ['users.json', 'sellerNames.json', 'predeterminedCodes.json', 'tickets.json']:
        fpath = os.path.join(DATA_DIR, fname)
        if os.path.exists(fpath):
            with open(fpath, 'r', encoding='utf-8') as f:
                try:
                    context[fname.replace('.json','')] = json.load(f)
                except Exception:
                    context[fname.replace('.json','')] = None
    if os.path.exists(TRAINING_PATH):
        with open(TRAINING_PATH, 'r', encoding='utf-8') as f:
            try:
                context['training_data'] = json.load(f)
            except Exception:
                context['training_data'] = []
    context['ai_creator'] = 'This AI assistant was created by Harshan Kamesh.'
    if user:
        user_email = user.get('email')
        user_tickets = None
        user_transactions = []
        users = context.get('users', [])
        for u in users:
            if u.get('email') == user_email:
                user_tickets = u.get('tickets', 0)
                break
        logs_path = os.path.abspath(os.path.join(DATA_DIR, 'logs.json'))
        if os.path.exists(logs_path):
            with open(logs_path, 'r', encoding='utf-8') as f:
                try:
                    logs = json.load(f)
                    user_transactions = [l for l in logs if l.get('action') == 'spend-tickets' and (l.get('buyerEmail') == user_email or l.get('buyerId') == user_email)]
                except Exception:
                    user_transactions = []
        context['user_tickets'] = user_tickets
        context['user_transactions'] = user_transactions
    return context

@ollama_bp.route('/ask_ai', methods=['POST'])
@ollama_bp.route('/ask_ai', methods=['GET', 'POST'])
def ask_ai_ollama():
    user = session.get('user')
    if request.method == 'POST':
        data = request.get_json()
        question = data.get('question', '')
    else:
        question = request.args.get('question', '')
    user_email = user.get('email') if user else None
    context = get_event_context(user)
    prompt = f"""
You are the Bank of Begonia event assistant. Use the following event data to answer user questions accurately and step-by-step. Be community-focused and helpful. If the question is unclear, ask for clarification. Here is the event data:

{json.dumps(context, indent=2)}

User ({user_email}): {question}
"""
    with requests.post(f"{OLLAMA_API_URL}/api/generate", json={
        "model": "phi3",
        "prompt": prompt,
        "stream": True
    }, stream=True) as response:
        if not response.ok:
            return {"answer": 'Sorry, there was an error with the AI assistant.'}
        def generate():
            buffer = ''
            for chunk in response.iter_content(chunk_size=None):
                if chunk:
                    text = chunk.decode('utf-8')
                    for word in text.split():
                        buffer += word + ' '
                        yield f"data: {word}\n\n"
            if buffer:
                yield f"data: END\n\n"
        return Response(generate(), mimetype='text/event-stream')
