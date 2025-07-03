import os
import json
from ai.nn_model import SimpleNNIntentModel

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data'))
TRAINING_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'training_data.json'))


import threading

class BankAIAssistant:
    _data_cache = {}
    _cache_lock = threading.Lock()

    def __init__(self):
        # Use cached data if available, else load and cache
        with self._cache_lock:
            if not self._data_cache:
                self._data_cache['users'] = self._load_json('users.json')
                self._data_cache['seller_names'] = self._load_json('sellerNames.json')
                self._data_cache['predetermined_codes'] = self._load_json('predeterminedCodes.json')
                self._data_cache['tickets'] = self._load_json('tickets.json')
                self._data_cache['training_data'] = self._load_json('training_data.json') or []
                # Preprocess for fast lookup
                self._data_cache['seller_names_lc'] = {code.lower(): name.lower() for code, name in (self._data_cache['seller_names'] or {}).items()}
                self._data_cache['seller_names_rev'] = {name.lower(): code.lower() for code, name in (self._data_cache['seller_names'] or {}).items()}
                self._data_cache['training_data_lc'] = [
                    {'question': item['question'].lower(), 'answer': item['answer']} for item in self._data_cache['training_data']
                ]
        self.users = self._data_cache['users']
        self.seller_names = self._data_cache['seller_names']
        self.seller_names_lc = self._data_cache['seller_names_lc']
        self.seller_names_rev = self._data_cache['seller_names_rev']
        self.predetermined_codes = self._data_cache['predetermined_codes']
        self.tickets = self._data_cache['tickets']
        self.training_data = self._data_cache['training_data']
        self.training_data_lc = self._data_cache['training_data_lc']
        self.nn_model = SimpleNNIntentModel(TRAINING_PATH)

    def _load_json(self, filename):
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            return None
        with open(path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return None

    def answer(self, question, user_email=None):
        q = question.lower().strip()
        # Special greeting for "hey" or "hello" or "hi"
        if q in {"hey", "hello", "hi"}:
            return "Hi, how can I help you?"
        # Use sets for fast keyword checks
        token_keywords = {"how many tokens", "my tokens", "my balance", "how many tickets", "my tickets", "token balance", "ticket balance"}
        map_keywords = {"map", "event map", "where is the map", "show me the map", "location of stalls", "where is the event", "where is the entrance", "where is the food court", "where is the restroom", "where is the parking"}
        if any(word in q for word in token_keywords):
            return self._answer_tokens(user_email)
        if any(word in q for word in map_keywords):
            return "You can view the event map by clicking the 'Map' button on your dashboard or visiting the /map page."
        # Use neural network for intent/answer
        nn_answer = self.nn_model.predict(question)
        if nn_answer:
            return nn_answer
        # Fallbacks: use pre-lowercased training data
        for item in self.training_data_lc:
            if item['question'] in q or q in item['question']:
                return item['answer']
        if 'token' in q or 'ticket' in q:
            return self._answer_tokens(user_email)
        if 'stall' in q and 'where' in q:
            return self._answer_stall_location(q)
        if 'donat' in q and 'stall' in q:
            return self._answer_stall_donation(q)
        if 'help' in q or 'how' in q:
            return 'You can ask me about your tokens, where each stall is, or where stalls are donating to.'
        return "Sorry, I couldn't understand your question. Try asking about tokens, stalls, or donations."

    def _answer_tokens(self, user_email):
        if not user_email or not self.users:
            return 'Please log in to see your token balance.'
        for user in self.users:
            if user.get('email') == user_email:
                tickets = user.get('tickets', 0)
                return f'You have {tickets} tokens.'
        return 'User not found.'

    def _answer_stall_location(self, q):
        # Fast lookup using pre-lowercased dicts
        for code_lc, name_lc in (self.seller_names_lc or {}).items():
            if code_lc in q or name_lc in q:
                code = code_lc.upper()
                name = self.seller_names.get(code, code)
                return f'Stall {code} is run by {name}.'
        for name_lc, code_lc in (self.seller_names_rev or {}).items():
            if name_lc in q:
                code = code_lc.upper()
                name = self.seller_names.get(code, code)
                return f'Stall {code} is run by {name}.'
        return 'I could not find that stall. Please check the code or name.'

    def _answer_stall_donation(self, q):
        # Placeholder: You can add donation info per stall here
        for code_lc, name_lc in (self.seller_names_lc or {}).items():
            if code_lc in q or name_lc in q:
                code = code_lc.upper()
                name = self.seller_names.get(code, code)
                return f'Stall {code} ({name}) is donating to a local charity.'
        for name_lc, code_lc in (self.seller_names_rev or {}).items():
            if name_lc in q:
                code = code_lc.upper()
                name = self.seller_names.get(code, code)
                return f'Stall {code} ({name}) is donating to a local charity.'
        return 'I do not have donation info for that stall yet.'

# Example usage:
# ai = BankAIAssistant()
# print(ai.answer('How many tokens do I have?', user_email='hkamesh8@gmail.com'))
