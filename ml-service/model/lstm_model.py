import numpy as np
import os
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

class LSTMStockModel:

    def __init__(self, sequence_length=60):
        self.sequence_length = sequence_length
        self.model = None
        self.model_dir = "saved_models"
        os.makedirs(self.model_dir, exist_ok=True)

    def build_model(self):
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(self.sequence_length, 1)),
            Dropout(0.2),
            LSTM(50, return_sequences=False),
            Dropout(0.2),
            Dense(25),
            Dense(1)  # Output layer for price prediction
        ])
        model.compile(optimizer='adam', loss='mse')
        self.model = model
        return model

    def train(self, X_train, y_train, epochs=50, batch_size=32):
        if self.model is None:
            self.build_model()

        early_stop = EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )

        print("Training LSTM model...")
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.1,
            callbacks=[early_stop],
            verbose=1
        )
        print("Training complete!")
        return history

    def predict(self, X):
        if self.model is None:
            raise ValueError("Model not trained!")
        prediction = self.model.predict(X, verbose=0)
        return prediction[0][0]

    def load(self, symbol):
        path = f"{self.model_dir}/{symbol}_model.keras"
        if os.path.exists(path):
            self.model = load_model(path)
            self.model.compile(optimizer='adam', loss='mse')
            print(f"Model loaded and compiled: {path}")
            return True
        return False

    def save(self, symbol):
        path = f"{self.model_dir}/{symbol}_model.keras"
        self.model.save(path)
        print(f"Model saved: {path}")
