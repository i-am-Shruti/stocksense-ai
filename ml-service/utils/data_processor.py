import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler

class DataProcessor:

    def __init__(self):
        self.scaler = MinMaxScaler(feature_range=(0, 1))

    def fetch_stock_data(self, symbol: str, period: str = "2Y"):
        print(f"Fetching data for {symbol}...")
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        if df.empty:
            raise ValueError(f"No data for: {symbol}")
        print(f"Fetched {len(df)} records")
        return df

    def prepare_training_data(self, df, sequence_length=60):
        close_prices = df['Close'].values.reshape(-1, 1)
        scaled_data = self.scaler.fit_transform(close_prices)

        X, y = [], []
        for i in range(sequence_length, len(scaled_data)):
            X.append(scaled_data[i-sequence_length:i, 0])
            y.append(scaled_data[i, 0])

        X = np.array(X)
        y = np.array(y)
        X = np.reshape(X, (X.shape[0], X.shape[1], 1))

        split = int(len(X) * 0.8)
        return X[:split], y[:split], X[split:], y[split:]

    def prepare_prediction_data(self, df, sequence_length=60):
        close_prices = df["Close"].values.reshape(-1, 1)
        last_sequence = close_prices[-sequence_length:]
        scaled = self.scaler.transform(last_sequence)
        return np.reshape(scaled, (1, sequence_length, 1))
