from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import joblib
import os
import yfinance as yf
import sys
import json
from datetime import datetime, timedelta
from functools import lru_cache
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import redis

sys.path.append(os.path.dirname(__file__))
from model.lstm_model import LSTMStockModel
from utils.data_processor import DataProcessor

app = Flask(__name__)
CORS(app, resources={
    r"/*": {"origins": [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://stocksense-ai-frontend.vercel.app"
    ], "supports_credentials": True}
})

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    print(f"✅ Connected to Redis: {REDIS_URL}")
except Exception as e:
    print(f"❌ Redis connection failed: {e}")
    redis_client = None

# AWS S3 Setup
import boto3
from botocore.exceptions import ClientError

S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'stocksense-models')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

s3_client = None
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
        region_name=AWS_REGION
    )
    # Test connection
    s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
    print(f"✅ Connected to S3 bucket: {S3_BUCKET_NAME}")
except Exception as e:
    print(f"❌ S3 connection failed: {e}")
    s3_client = None

def upload_model_to_s3(symbol):
    """Upload trained model and scaler to S3"""
    if not s3_client:
        print("⚠️ S3 not available, skipping upload")
        return False
    try:
        # Upload model
        model_path = f"saved_models/{symbol}_model.keras"
        if os.path.exists(model_path):
            s3_client.upload_file(model_path, S3_BUCKET_NAME, f"models/{symbol}_model.keras")
            print(f"☁️ Uploaded model to S3: {symbol}_model.keras")
        
        # Upload scaler
        scaler_path = f"saved_models/{symbol}_scaler.pkl"
        if os.path.exists(scaler_path):
            s3_client.upload_file(scaler_path, S3_BUCKET_NAME, f"models/{symbol}_scaler.pkl")
            print(f"☁️ Uploaded scaler to S3: {symbol}_scaler.pkl")
        
        return True
    except Exception as e:
        print(f"❌ S3 upload failed: {e}")
        return False

def download_model_from_s3(symbol):
    """Download model and scaler from S3"""
    if not s3_client:
        print("⚠️ S3 not available")
        return False
    try:
        # Create directory if not exists
        os.makedirs("saved_models", exist_ok=True)
        
        # Download model
        model_key = f"models/{symbol}_model.keras"
        model_path = f"saved_models/{symbol}_model.keras"
        try:
            s3_client.download_file(S3_BUCKET_NAME, model_key, model_path)
            print(f"☁️ Downloaded model from S3: {symbol}_model.keras")
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                print(f"📭 Model not found in S3: {symbol}")
            else:
                print(f"❌ S3 model download error: {e}")
            return False
        
        # Download scaler
        scaler_key = f"models/{symbol}_scaler.pkl"
        scaler_path = f"saved_models/{symbol}_scaler.pkl"
        try:
            s3_client.download_file(S3_BUCKET_NAME, scaler_key, scaler_path)
            print(f"☁️ Downloaded scaler from S3: {symbol}_scaler.pkl")
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                print(f"📭 Scaler not found in S3: {symbol}")
                # Delete model if scaler not found
                if os.path.exists(model_path):
                    os.remove(model_path)
            return False
        
        return True
    except Exception as e:
        print(f"❌ S3 download failed: {e}")
        return False

loaded_models = {}
loaded_scalers = {}
training_status = {}

executor = ThreadPoolExecutor(max_workers=4)

STOCK_CACHE_TTL = 60
PREDICTION_CACHE_TTL = 300

def get_cached_stock(symbol):
    if redis_client:
        try:
            cached = redis_client.get(f"stock:{symbol}")
            if cached:
                print(f"📦 Redis HIT: stock:{symbol}")
                return json.loads(cached)
            print(f"📭 Redis MISS: stock:{symbol}")
        except Exception as e:
            print(f"❌ Redis get error: {e}")
    return None

def set_cached_stock(symbol, data):
    if redis_client:
        try:
            redis_client.setex(f"stock:{symbol}", STOCK_CACHE_TTL, json.dumps(data))
            print(f"💾 Redis CACHED: stock:{symbol} (TTL: {STOCK_CACHE_TTL}s)")
        except Exception as e:
            print(f"❌ Redis set error: {e}")

def get_cached_history(symbol, period):
    if redis_client:
        try:
            cached = redis_client.get(f"history:{symbol}:{period}")
            if cached:
                print(f"📦 Redis HIT: history:{symbol}:{period}")
                return json.loads(cached)
            print(f"📭 Redis MISS: history:{symbol}:{period}")
        except Exception as e:
            print(f"❌ Redis get error: {e}")
    return None

def set_cached_history(symbol, period, data):
    if redis_client:
        try:
            redis_client.setex(f"history:{symbol}:{period}", STOCK_CACHE_TTL, json.dumps(data))
            print(f"💾 Redis CACHED: history:{symbol}:{period} (TTL: {STOCK_CACHE_TTL}s)")
        except Exception as e:
            print(f"❌ Redis set error: {e}")

def get_cached_prediction(symbol):
    if redis_client:
        try:
            cached = redis_client.get(f"prediction:{symbol}")
            if cached:
                print(f"📦 Redis HIT: prediction:{symbol}")
                return json.loads(cached)
            print(f"📭 Redis MISS: prediction:{symbol}")
        except Exception as e:
            print(f"❌ Redis get error: {e}")
    return None

def set_cached_prediction(symbol, data):
    if redis_client:
        try:
            redis_client.setex(f"prediction:{symbol}", PREDICTION_CACHE_TTL, json.dumps(data))
            print(f"💾 Redis CACHED: prediction:{symbol} (TTL: {PREDICTION_CACHE_TTL}s)")
        except Exception as e:
            print(f"❌ Redis set error: {e}")

def get_model_and_scaler(symbol):
    # Check in-memory cache first
    if symbol in loaded_models and symbol in loaded_scalers:
        return loaded_models[symbol], loaded_scalers[symbol]
    
    # Try to load from local disk
    model_path = f"saved_models/{symbol}_model.keras"
    scaler_path = f"saved_models/{symbol}_scaler.pkl"
    
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        # Try downloading from S3
        print(f"📥 Trying to download model from S3 for {symbol}...")
        if download_model_from_s3(symbol):
            print(f"✅ Successfully loaded {symbol} from S3")
        else:
            # Model not found anywhere
            return None, None
    
    # Load model
    if symbol not in loaded_models:
        try:
            model = LSTMStockModel()
            if not model.load(symbol):
                return None, None
            loaded_models[symbol] = model
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            return None, None
    
    # Load scaler
    if symbol not in loaded_scalers:
        try:
            loaded_scalers[symbol] = joblib.load(scaler_path)
        except Exception as e:
            print(f"❌ Failed to load scaler: {e}")
            return None, None
    
    return loaded_models[symbol], loaded_scalers[symbol]


@lru_cache(maxsize=100)
def get_popular_stocks():
    return {
        "AAPL": "Apple Inc.",
        "GOOGL": "Alphabet Inc.",
        "GOOG": "Alphabet Inc.",
        "MSFT": "Microsoft Corporation",
        "AMZN": "Amazon.com Inc.",
        "TSLA": "Tesla Inc.",
        "META": "Meta Platforms Inc.",
        "NVDA": "NVIDIA Corporation",
        "NFLX": "Netflix Inc.",
        "AMD": "Advanced Micro Devices",
        "INTC": "Intel Corporation",
        "DIS": "The Walt Disney Company",
        "PYPL": "PayPal Holdings Inc.",
        "ADBE": "Adobe Inc.",
        "CRM": "Salesforce Inc.",
        "V": "Visa Inc.",
        "JPM": "JPMorgan Chase & Co.",
        "JNJ": "Johnson & Johnson",
        "WMT": "Walmart Inc.",
        "PG": "Procter & Gamble Co.",
        "KO": "The Coca-Cola Company",
        "PEP": "PepsiCo Inc.",
        "MRK": "Merck & Co. Inc.",
        "ABBV": "AbbVie Inc.",
        "T": "AT&T Inc.",
        "VZ": "Verizon Communications",
        "XOM": "Exxon Mobil Corporation",
        "CVX": "Chevron Corporation"
    }


def simple_prediction(df):
    """Fallback prediction using Moving Average"""
    if len(df) < 20:
        return None
    
    prices = df['Close'].values
    
    # Simple Moving Averages
    sma_5 = np.mean(prices[-5:])
    sma_10 = np.mean(prices[-10:])
    sma_20 = np.mean(prices[-20:])
    
    # Weighted prediction (recent days get more weight)
    weights = np.array([0.5, 0.3, 0.2])
    prediction = (sma_5 * 0.5) + (sma_10 * 0.3) + (sma_20 * 0.2)
    
    # Trend adjustment
    if sma_5 > sma_10:
        prediction *= 1.005  # Slight bullish adjustment
    elif sma_5 < sma_10:
        prediction *= 0.995  # Slight bearish adjustment
    
    return round(float(prediction), 2)


def calculate_rsi(prices, period=14):
    """Calculate Relative Strength Index"""
    if len(prices) < period + 1:
        return None
    
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])
    
    if avg_loss == 0:
        return 100
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return round(rsi, 2)


def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Calculate MACD (Moving Average Convergence Divergence)"""
    if len(prices) < slow + signal:
        return None
    
    # Calculate EMAs
    ema_fast = prices[-fast:] if len(prices) >= fast else prices
    ema_slow = prices[-slow:] if len(prices) >= slow else prices
    
    # Simple EMA approximation
    fast_ema = np.mean(ema_fast)
    slow_ema = np.mean(ema_slow)
    
    macd_line = fast_ema - slow_ema
    signal_line = macd_line * 0.9  # Simplified
    
    histogram = macd_line - signal_line
    
    return {
        "macd": round(macd_line, 2),
        "signal": round(signal_line, 2),
        "histogram": round(histogram, 2)
    }


def calculate_bollinger_bands(prices, period=20):
    """Calculate Bollinger Bands"""
    if len(prices) < period:
        return None
    
    sma = np.mean(prices[-period:])
    std = np.std(prices[-period:])
    
    upper = sma + (2 * std)
    lower = sma - (2 * std)
    
    return {
        "upper": round(upper, 2),
        "middle": round(sma, 2),
        "lower": round(lower, 2)
    }


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "UP",
        "service": "StockSense ML Service"
    })


@app.route('/train', methods=['POST'])
def train():
    try:
        data = request.get_json()
        if not data or 'symbol' not in data:
            return jsonify({"error": "symbol required"}), 400
            
        symbol = data['symbol'].upper()

        # Check if already training
        if symbol in training_status and training_status[symbol].get('status') == 'training':
            return jsonify({
                "message": f"Training already in progress for {symbol}",
                "symbol": symbol
            })

        training_status[symbol] = {"status": "training", "start_time": datetime.now().isoformat()}

        def train_async():
            try:
                from model.train_model import train_for_symbol
                train_for_symbol(symbol)
                loaded_models.pop(symbol, None)
                loaded_scalers.pop(symbol, None)
                training_status[symbol] = {"status": "completed", "start_time": training_status[symbol].get('start_time')}
            except Exception as e:
                training_status[symbol] = {"status": "failed", "error": str(e)}

        executor.submit(train_async)
        
        return jsonify({
            "message": f"Training started for {symbol}!",
            "symbol": symbol,
            "status": "training"
        })

    except Exception as e:
        print(f"Training error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/train/status/<symbol>', methods=['GET'])
def train_status(symbol):
    symbol = symbol.upper()
    if symbol in training_status:
        return jsonify(training_status[symbol])
    return jsonify({"status": "not_training"})


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data or 'symbol' not in data:
            return jsonify({"error": "symbol required"}), 400

        symbol = data['symbol'].upper()
        auto_train = data.get('auto_train', False)
        
        cached = get_cached_prediction(symbol)
        if cached:
            print(f"Cache hit for {symbol}")
            return jsonify(cached)
        
        print(f"Prediction for: {symbol}")

        # Check if model exists
        model, scaler = get_model_and_scaler(symbol)
        is_training = False
        
        if model is None and auto_train:
            # Check if already training
            if symbol in training_status and training_status[symbol].get('status') == 'training':
                is_training = True
                print(f"⏳ Model training in progress for {symbol}")
            else:
                # Start training in background
                print(f"🚀 Starting background training for {symbol}...")
                training_status[symbol] = {"status": "training", "start_time": datetime.now().isoformat()}
                
                def train_async():
                    try:
                        from model.train_model import train_for_symbol
                        train_for_symbol(symbol)
                        loaded_models.pop(symbol, None)
                        loaded_scalers.pop(symbol, None)
                        
                        # Upload to S3 for persistence
                        upload_model_to_s3(symbol)
                        
                        training_status[symbol] = {"status": "completed", "start_time": training_status[symbol].get('start_time')}
                        print(f"✅ Training completed for {symbol}")
                        # Clear prediction cache so next request gets fresh prediction
                        if redis_client:
                            redis_client.delete(f"prediction:{symbol}")
                    except Exception as e:
                        training_status[symbol] = {"status": "failed", "error": str(e)}
                        print(f"❌ Training failed for {symbol}: {e}")
                
                executor.submit(train_async)
                is_training = True

        processor = DataProcessor()
        
        # Try ML prediction first
        ml_prediction = None
        prediction_method = "moving_average"
        
        if model is not None and scaler is not None:
            try:
                processor.scaler = scaler
                df = processor.fetch_stock_data(symbol, period="3mo")
                X = processor.prepare_prediction_data(df)
                normalized = model.predict(X)
                ml_prediction = float(scaler.inverse_transform([[normalized]])[0][0])
                ml_prediction = round(ml_prediction, 2)
                prediction_method = "lstm"
            except Exception as e:
                print(f"ML prediction failed: {str(e)}")

        # Fallback to simple prediction if ML fails or is training
        if ml_prediction is None:
            processor = DataProcessor()
            df = processor.fetch_stock_data(symbol, period="3mo")
            ml_prediction = simple_prediction(df)
            prediction_method = "moving_average"

        if ml_prediction is None:
            return jsonify({"error": "Could not generate prediction"}), 500

        print(f"Predicted: ${ml_prediction} (method: {prediction_method})")
        result = {
            "symbol": symbol,
            "predictedPrice": ml_prediction,
            "method": prediction_method,
            "currency": "USD",
            "training": is_training,
            "trainingMessage": "AI model training in progress. Showing moving average prediction." if is_training else None
        }
        set_cached_prediction(symbol, result)
        return jsonify(result)

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/stock/realtime/<symbol>', methods=['GET'])
def realtime(symbol):
    try:
        symbol_upper = symbol.upper()
        
        cached = get_cached_stock(symbol_upper)
        if cached:
            return jsonify(cached)
        
        ticker = yf.Ticker(symbol_upper)
        info = ticker.info
        
        if not info or len(info) == 0:
            return jsonify({"error": f"Stock not found: {symbol_upper}"}), 404
        
        result = {
            "symbol": symbol_upper,
            "companyName": info.get('longName', info.get('shortName', 'Unknown')),
            "currentPrice": info.get('currentPrice', 0),
            "openPrice": info.get('open', 0),
            "highPrice": info.get('dayHigh', 0),
            "lowPrice": info.get('dayLow', 0),
            "volume": info.get('volume', 0),
            "marketCap": info.get('marketCap', 0),
            "currency": info.get('currency', 'USD'),
            "previousClose": info.get('previousClose', 0),
            "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh', 0),
            "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow', 0),
            "targetMeanPrice": info.get('targetMeanPrice', 0),
            "recommendationKey": info.get('recommendationKey', 'none')
        }
        
        set_cached_stock(symbol_upper, result)
        
        return jsonify(result)

    except Exception as e:
        error_msg = str(e)
        print(f"Error in realtime: {error_msg}")
        
        if "rate" in error_msg.lower() or "429" in error_msg:
            return jsonify({"error": "Too many requests. Please wait a moment and try again."}), 429
        
        return jsonify({"error": f"Failed to fetch stock data: {error_msg}"}), 500


@app.route('/stock/history/<symbol>', methods=['GET'])
def history(symbol):
    try:
        symbol_upper = symbol.upper()
        period = request.args.get('period', '3mo')
        
        cached = get_cached_history(symbol_upper, period)
        if cached:
            return jsonify(cached)
        
        ticker = yf.Ticker(symbol_upper)
        
        valid_periods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']
        if period not in valid_periods:
            period = '3mo'
        
        hist = ticker.history(period=period)
        
        if hist.empty:
            return jsonify({"error": "No historical data available"}), 404
        
        # Convert to list of dicts
        data = []
        for idx, row in hist.iterrows():
            data.append({
                "date": str(idx),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })
        
        result = {
            "symbol": symbol_upper,
            "period": period,
            "data": data
        }
        
        set_cached_history(symbol_upper, period, result)
        
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/stock/indicators/<symbol>', methods=['GET'])
def indicators(symbol):
    try:
        ticker = yf.Ticker(symbol.upper())
        hist = ticker.history(period="3mo")
        
        if hist.empty:
            return jsonify({"error": "No data available"}), 404
        
        close_prices = hist['Close'].values
        
        rsi = calculate_rsi(close_prices)
        macd = calculate_macd(close_prices)
        bollinger = calculate_bollinger_bands(close_prices)
        
        # Calculate price changes
        if len(close_prices) >= 2:
            day_change = close_prices[-1] - close_prices[-2]
            day_change_pct = (day_change / close_prices[-2]) * 100
        else:
            day_change = 0
            day_change_pct = 0
        
        if len(close_prices) >= 30:
            month_change = close_prices[-1] - close_prices[-30]
            month_change_pct = (month_change / close_prices[-30]) * 100
        else:
            month_change = 0
            month_change_pct = 0
        
        return jsonify({
            "symbol": symbol.upper(),
            "indicators": {
                "rsi": rsi,
                "macd": macd,
                "bollinger": bollinger
            },
            "priceChanges": {
                "day": {
                    "value": round(day_change, 2),
                    "percentage": round(day_change_pct, 2)
                },
                "month": {
                    "value": round(month_change, 2),
                    "percentage": round(month_change_pct, 2)
                }
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/stock/compare', methods=['POST'])
def compare():
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])
        
        if not symbols or len(symbols) < 2:
            return jsonify({"error": "At least 2 symbols required"}), 400
        
        if len(symbols) > 4:
            return jsonify({"error": "Maximum 4 symbols allowed"}), 400
        
        def fetch_stock(symbol):
            try:
                ticker = yf.Ticker(symbol.upper())
                info = ticker.info
                return {
                    "symbol": symbol.upper(),
                    "name": info.get('longName', 'Unknown'),
                    "price": info.get('currentPrice', 0),
                    "change": info.get('regularMarketChange', 0),
                    "changePercent": info.get('regularMarketChangePercent', 0),
                    "volume": info.get('volume', 0),
                    "marketCap": info.get('marketCap', 0)
                }
            except:
                return None
        
        comparison = []
        futures = {executor.submit(fetch_stock, s): s for s in symbols}
        for future in as_completed(futures):
            result = future.result()
            if result:
                comparison.append(result)
        
        return jsonify({
            "comparison": comparison
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/stock/search', methods=['GET'])
def search():
    try:
        query = request.args.get('q', '').upper()
        
        popular_stocks = get_popular_stocks()
        
        if query:
            results = {k: v for k, v in popular_stocks.items() if query in k or query in v}
        else:
            results = popular_stocks
        
        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/market/news/<symbol>', methods=['GET'])
def market_news(symbol):
    try:
        import requests
        
        # Try Yahoo Finance news API
        symbol_upper = symbol.upper()
        url = f"https://query1.finance.yahoo.com/v1/finance/search?q={symbol_upper}&quotesCount=1&newsCount=5"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            news_items = data.get('news', [])
            
            if not news_items:
                # Fallback: return sample news
                return jsonify({
                    "symbol": symbol_upper,
                    "news": [
                        {
                            "title": f"{symbol_upper} Stock Analysis",
                            "link": f"https://finance.yahoo.com/quote/{symbol_upper}",
                            "publisher": "Yahoo Finance",
                            "published": "Today"
                        },
                        {
                            "title": f"Market update for {symbol_upper}",
                            "link": f"https://finance.yahoo.com/quote/{symbol_upper}",
                            "publisher": "Market Watch",
                            "published": "Today"
                        }
                    ]
                })
            
            news_list = []
            for item in news_items[:5]:
                news_list.append({
                    "title": item.get('title', ''),
                    "link": item.get('link', ''),
                    "publisher": item.get('publisher', 'Yahoo Finance'),
                    "published": item.get('providerPublishTime', 'Today'),
                    "thumbnail": item.get('thumbnail', {}).get('originalUrl', '')
                })
            
            return jsonify({
                "symbol": symbol_upper,
                "news": news_list
            })
        else:
            return jsonify({
                "symbol": symbol.upper(),
                "news": [
                    {
                        "title": f"{symbol.upper()} market data available",
                        "link": f"https://finance.yahoo.com/quote/{symbol.upper()}",
                        "publisher": "StockSense AI",
                        "published": "Today"
                    }
                ]
            })

    except Exception as e:
        print(f"News error: {str(e)}")
        return jsonify({
            "symbol": symbol.upper(),
            "news": []
        }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting ML Service on port {port}...")
    print("Available endpoints:")
    print("  GET  /health                    - Service health check")
    print("  POST /predict                   - Get price prediction")
    print("  POST /train                     - Train model for stock")
    print("  GET  /stock/realtime/<symbol>   - Get real-time data")
    print("  GET  /stock/history/<symbol>    - Get historical data")
    print("  GET  /stock/indicators/<symbol> - Get technical indicators")
    print("  POST /stock/compare             - Compare multiple stocks")
    print("  GET  /stock/search              - Search stocks")
    print("  GET  /market/news/<symbol>     - Get market news")
    app.run(host='0.0.0.0', port=port, debug=False)
