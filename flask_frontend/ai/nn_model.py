import os
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neural_network import MLPClassifier
import numpy as np

class SimpleNNIntentModel:
    def __init__(self, data_path):
        self.data_path = data_path
        self.vectorizer = TfidfVectorizer()
        self.model = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=2000, early_stopping=True, n_iter_no_change=10, random_state=42)
        self.trained = False
        self.questions = []
        self.answers = []
        self._load_and_train()

    def _load_and_train(self):
        if not os.path.exists(self.data_path):
            return
        with open(self.data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        self.questions = [item['question'] for item in data]
        self.answers = [item['answer'] for item in data]
        if len(self.questions) < 2:
            return
        X = self.vectorizer.fit_transform(self.questions)
        y = np.arange(len(self.questions))
        self.model.fit(X, y)
        self.trained = True

    def predict(self, question):
        if not self.trained:
            return None
        X = self.vectorizer.transform([question])
        proba = self.model.predict_proba(X)[0]
        idx = int(np.argmax(proba))
        # Only return if confidence is reasonably high
        if proba[idx] > 0.3:
            return self.answers[idx]
        return None

    def add_training_example(self, question, answer):
        # Add new example and retrain
        self.questions.append(question)
        self.answers.append(answer)
        X = self.vectorizer.fit_transform(self.questions)
        y = np.arange(len(self.questions))
        self.model.fit(X, y)
        self.trained = True
        # Optionally, save to file
        with open(self.data_path, 'w', encoding='utf-8') as f:
            json.dump([
                {'question': q, 'answer': a} for q, a in zip(self.questions, self.answers)
            ], f, indent=2)
