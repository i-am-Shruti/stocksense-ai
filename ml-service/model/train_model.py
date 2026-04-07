import joblib
import numpy as np
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from utils.data_processor import DataProcessor
from model.lstm_model import LSTMStockModel

def train_for_symbol(symbol: str):
    print(f"\n{'='*50}")
    print(f"Training model for: {symbol}")
    print(f"{'='*50}\n")

    processor = DataProcessor()
    lstm_model = LSTMStockModel(sequence_length=60)

    df = processor.fetch_stock_data(symbol, period="2Y")
    print(f"Data: {df.index[0]} to {df.index[-1]}")

    X_train, y_train, X_test, y_test = processor.prepare_training_data(df)

    lstm_model.build_model()
    lstm_model.train(X_train, y_train, epochs=50)

    lstm_model.save(symbol)

    os.makedirs("saved_models", exist_ok=True)
    scaler_path = f"saved_models/{symbol}_scaler.pkl"
    joblib.dump(processor.scaler, scaler_path)

    predictions = lstm_model.model.predict(X_test)
    mse = np.mean((predictions.flatten() - y_test) ** 2)
    print(f"Test MSE: {mse:.6f}")

if __name__ == "__main__":
    symbols = ["AAPL", "GOOGL", "TSLA"]
    for symbol in symbols:
        train_for_symbol(symbol)
