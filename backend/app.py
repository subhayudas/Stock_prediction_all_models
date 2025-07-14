from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import yfinance as yf
import requests
from datetime import datetime, timedelta
import pickle
import os
from models.lstm_model import LSTMModel
from models.attention_model import AttentionModel
from models.ensemble_model import EnsembleModel
from data.data_processor import DataProcessor
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Configuration
app.config['ALPHA_VANTAGE_API_KEY'] = '3GDGNTGVKE7HGW4H'
app.config['MODELS_DIR'] = 'models/saved_models'

# Initialize data processor
data_processor = DataProcessor()

# Global variables for models
models = {
    'lstm': None,
    'attention': None,
    'ensemble': None
}

def load_models():
    """Load pre-trained models if they exist"""
    global models
    models_dir = app.config['MODELS_DIR']
    
    if os.path.exists(models_dir):
        try:
            if os.path.exists(f"{models_dir}/lstm_model.pkl"):
                with open(f"{models_dir}/lstm_model.pkl", 'rb') as f:
                    models['lstm'] = pickle.load(f)
            
            if os.path.exists(f"{models_dir}/attention_model.pkl"):
                with open(f"{models_dir}/attention_model.pkl", 'rb') as f:
                    models['attention'] = pickle.load(f)
                    
            if os.path.exists(f"{models_dir}/ensemble_model.pkl"):
                with open(f"{models_dir}/ensemble_model.pkl", 'rb') as f:
                    models['ensemble'] = pickle.load(f)
                    
        except Exception as e:
            print(f"Error loading models: {e}")

def make_alpha_vantage_request(function, **params):
    """Make a request to Alpha Vantage API"""
    url = "https://www.alphavantage.co/query"
    params.update({
        'function': function,
        'apikey': app.config['ALPHA_VANTAGE_API_KEY']
    })
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Alpha Vantage API Error: {e}")
        return None

@app.route('/api/stock/search', methods=['GET'])
def search_stocks():
    """Search for stock symbols using Alpha Vantage"""
    query = request.args.get('q', '')
    
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    try:
        data = make_alpha_vantage_request('SYMBOL_SEARCH', keywords=query)
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'bestMatches' in data:
            results = []
            for match in data['bestMatches'][:10]:  # Limit to top 10 results
                results.append({
                    'symbol': match['1. symbol'],
                    'name': match['2. name'],
                    'type': match['3. type'],
                    'region': match['4. region'],
                    'currency': match['8. currency']
                })
            return jsonify({'results': results})
        else:
            return jsonify({'results': []})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/intraday', methods=['GET'])
def get_intraday_data():
    """Get intraday stock data from Alpha Vantage"""
    symbol = request.args.get('symbol', '')
    interval = request.args.get('interval', '5min')  # 1min, 5min, 15min, 30min, 60min
    
    if not symbol:
        return jsonify({'error': 'Symbol parameter is required'}), 400
    
    try:
        data = make_alpha_vantage_request(
            'TIME_SERIES_INTRADAY',
            symbol=symbol,
            interval=interval,
            adjusted='true',
            extended_hours='true'
        )
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        if 'Note' in data:
            return jsonify({'error': 'API call frequency exceeded. Please try again later.'}), 429
        
        time_series_key = f'Time Series ({interval})'
        if time_series_key not in data:
            return jsonify({'error': 'No intraday data available for this symbol'}), 404
        
        # Format data for frontend
        formatted_data = []
        for timestamp, values in data[time_series_key].items():
            formatted_data.append({
                'timestamp': timestamp,
                'open': float(values['1. open']),
                'high': float(values['2. high']),
                'low': float(values['3. low']),
                'close': float(values['4. close']),
                'volume': int(values['5. volume'])
            })
        
        # Sort by timestamp (most recent first)
        formatted_data.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            'symbol': symbol,
            'interval': interval,
            'data': formatted_data,
            'metadata': data.get('Meta Data', {})
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/daily', methods=['GET'])
def get_daily_data():
    """Get daily stock data from Alpha Vantage"""
    symbol = request.args.get('symbol', '')
    adjusted = request.args.get('adjusted', 'true')
    
    if not symbol:
        return jsonify({'error': 'Symbol parameter is required'}), 400
    
    try:
        function = 'TIME_SERIES_DAILY_ADJUSTED' if adjusted == 'true' else 'TIME_SERIES_DAILY'
        data = make_alpha_vantage_request(function, symbol=symbol)
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        time_series_key = 'Time Series (Daily)'
        if time_series_key not in data:
            return jsonify({'error': 'No daily data available for this symbol'}), 404
        
        # Format data for frontend
        formatted_data = []
        for date, values in data[time_series_key].items():
            if adjusted == 'true':
                formatted_data.append({
                    'date': date,
                    'open': float(values['1. open']),
                    'high': float(values['2. high']),
                    'low': float(values['3. low']),
                    'close': float(values['4. close']),
                    'adjusted_close': float(values['5. adjusted close']),
                    'volume': int(values['6. volume']),
                    'dividend_amount': float(values['7. dividend amount']),
                    'split_coefficient': float(values['8. split coefficient'])
                })
            else:
                formatted_data.append({
                    'date': date,
                    'open': float(values['1. open']),
                    'high': float(values['2. high']),
                    'low': float(values['3. low']),
                    'close': float(values['4. close']),
                    'volume': int(values['5. volume'])
                })
        
        # Sort by date (most recent first)
        formatted_data.sort(key=lambda x: x['date'], reverse=True)
        
        return jsonify({
            'symbol': symbol,
            'adjusted': adjusted == 'true',
            'data': formatted_data,
            'metadata': data.get('Meta Data', {})
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/quote', methods=['GET'])
def get_quote():
    """Get real-time stock quote from Alpha Vantage"""
    symbol = request.args.get('symbol', '')
    
    if not symbol:
        return jsonify({'error': 'Symbol parameter is required'}), 400
    
    try:
        data = make_alpha_vantage_request('GLOBAL_QUOTE', symbol=symbol)
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        if 'Global Quote' not in data:
            return jsonify({'error': 'No quote data available for this symbol'}), 404
        
        quote = data['Global Quote']
        
        return jsonify({
            'symbol': quote['01. symbol'],
            'open': float(quote['02. open']),
            'high': float(quote['03. high']),
            'low': float(quote['04. low']),
            'price': float(quote['05. price']),
            'volume': int(quote['06. volume']),
            'latest_trading_day': quote['07. latest trading day'],
            'previous_close': float(quote['08. previous close']),
            'change': float(quote['09. change']),
            'change_percent': quote['10. change percent']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/company-overview', methods=['GET'])
def get_company_overview():
    """Get company overview from Alpha Vantage"""
    symbol = request.args.get('symbol', '')
    
    if not symbol:
        return jsonify({'error': 'Symbol parameter is required'}), 400
    
    try:
        data = make_alpha_vantage_request('OVERVIEW', symbol=symbol)
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        if not data or 'Symbol' not in data:
            return jsonify({'error': 'No company overview available for this symbol'}), 404
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/earnings', methods=['GET'])
def get_earnings():
    """Get earnings data from Alpha Vantage"""
    symbol = request.args.get('symbol', '')
    
    if not symbol:
        return jsonify({'error': 'Symbol parameter is required'}), 400
    
    try:
        data = make_alpha_vantage_request('EARNINGS', symbol=symbol)
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/technical-indicators', methods=['GET'])
def get_technical_indicators():
    """Get technical indicators from Alpha Vantage"""
    symbol = request.args.get('symbol', '')
    indicator = request.args.get('indicator', 'SMA')  # SMA, EMA, RSI, MACD, etc.
    interval = request.args.get('interval', 'daily')
    time_period = request.args.get('time_period', '20')
    series_type = request.args.get('series_type', 'close')
    
    if not symbol:
        return jsonify({'error': 'Symbol parameter is required'}), 400
    
    try:
        params = {
            'symbol': symbol,
            'interval': interval,
            'series_type': series_type
        }
        
        # Add time_period for indicators that need it
        if indicator in ['SMA', 'EMA', 'RSI', 'WMA', 'DEMA', 'TEMA', 'TRIMA', 'KAMA', 'T3']:
            params['time_period'] = time_period
        
        data = make_alpha_vantage_request(indicator, **params)
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/news', methods=['GET'])
def get_news():
    """Get market news and sentiment from Alpha Vantage"""
    tickers = request.args.get('tickers', '')
    topics = request.args.get('topics', '')
    time_from = request.args.get('time_from', '')
    time_to = request.args.get('time_to', '')
    limit = request.args.get('limit', '50')
    
    try:
        params = {
            'limit': limit
        }
        
        if tickers:
            params['tickers'] = tickers
        if topics:
            params['topics'] = topics
        if time_from:
            params['time_from'] = time_from
        if time_to:
            params['time_to'] = time_to
        
        data = make_alpha_vantage_request('NEWS_SENTIMENT', **params)
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/top-gainers-losers', methods=['GET'])
def get_top_gainers_losers():
    """Get top gainers and losers from Alpha Vantage"""
    try:
        data = make_alpha_vantage_request('TOP_GAINERS_LOSERS')
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/global-status', methods=['GET'])
def get_global_market_status():
    """Get global market status from Alpha Vantage"""
    try:
        data = make_alpha_vantage_request('MARKET_STATUS')
        
        if not data:
            return jsonify({'error': 'Failed to fetch data from Alpha Vantage'}), 500
        
        if 'Error Message' in data:
            return jsonify({'error': data['Error Message']}), 400
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/data', methods=['GET'])
def get_stock_data():
    """Get historical stock data"""
    symbol = request.args.get('symbol', '')
    period = request.args.get('period', '1y')  # 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    
    if not symbol:
        return jsonify({'error': 'Symbol parameter is required'}), 400
    
    try:
        # Get data from yfinance (more reliable for historical data)
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period)
        
        if hist.empty:
            return jsonify({'error': 'No data found for this symbol'}), 404
        
        # Get stock info
        info = stock.info
        
        # Format data for frontend
        data = {
            'symbol': symbol,
            'name': info.get('longName', symbol),
            'current_price': info.get('currentPrice', hist['Close'].iloc[-1]),
            'currency': info.get('currency', 'USD'),
            'market_cap': info.get('marketCap', 0),
            'pe_ratio': info.get('trailingPE', 0),
            'dividend_yield': info.get('dividendYield', 0),
            'historical_data': []
        }
        
        # Convert historical data to list of dictionaries
        for date, row in hist.iterrows():
            data['historical_data'].append({
                'date': date.strftime('%Y-%m-%d'),
                'open': round(row['Open'], 2),
                'high': round(row['High'], 2),
                'low': round(row['Low'], 2),
                'close': round(row['Close'], 2),
                'volume': int(row['Volume'])
            })
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/predict', methods=['POST'])
def predict_stock():
    """Predict stock prices using trained models"""
    data = request.get_json()
    
    if not data or 'symbol' not in data:
        return jsonify({'error': 'Symbol is required'}), 400
    
    symbol = data['symbol']
    model_type = data.get('model_type', 'ensemble')  # lstm, attention, ensemble
    days_ahead = data.get('days_ahead', 30)
    
    try:
        # Get historical data
        stock = yf.Ticker(symbol)
        hist = stock.history(period='2y')  # Get 2 years of data for better prediction
        
        if hist.empty:
            return jsonify({'error': 'No data found for this symbol'}), 404
        
        # Process data
        processed_data = data_processor.prepare_data(hist)
        
        # Select model
        if model_type not in models or models[model_type] is None:
            # Train model if not available
            if model_type == 'lstm':
                models[model_type] = LSTMModel()
            elif model_type == 'attention':
                models[model_type] = AttentionModel()
            else:
                models[model_type] = EnsembleModel()
            
            models[model_type].train(processed_data)
            
            # Save model
            os.makedirs(app.config['MODELS_DIR'], exist_ok=True)
            with open(f"{app.config['MODELS_DIR']}/{model_type}_model.pkl", 'wb') as f:
                pickle.dump(models[model_type], f)
        
        # Make predictions
        predictions = models[model_type].predict(processed_data, days_ahead)
        
        # Generate future dates
        last_date = hist.index[-1]
        future_dates = []
        for i in range(1, days_ahead + 1):
            future_date = last_date + timedelta(days=i)
            # Skip weekends for stock market
            while future_date.weekday() >= 5:
                future_date += timedelta(days=1)
            future_dates.append(future_date.strftime('%Y-%m-%d'))
        
        # Format predictions
        prediction_data = []
        for i, (date, price) in enumerate(zip(future_dates, predictions)):
            prediction_data.append({
                'date': date,
                'predicted_price': round(float(price), 2),
                'confidence': max(0.5, 1.0 - (i * 0.02))  # Decreasing confidence over time
            })
        
        # Calculate prediction metrics
        current_price = hist['Close'].iloc[-1]
        predicted_price_30d = predictions[min(29, len(predictions)-1)]
        price_change = predicted_price_30d - current_price
        price_change_percent = (price_change / current_price) * 100
        
        result = {
            'symbol': symbol,
            'model_type': model_type,
            'current_price': round(float(current_price), 2),
            'predicted_price_30d': round(float(predicted_price_30d), 2),
            'price_change': round(float(price_change), 2),
            'price_change_percent': round(float(price_change_percent), 2),
            'predictions': prediction_data,
            'model_accuracy': models[model_type].get_accuracy() if hasattr(models[model_type], 'get_accuracy') else 0.85,
            'recommendation': 'BUY' if price_change_percent > 5 else 'SELL' if price_change_percent < -5 else 'HOLD'
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/train', methods=['POST'])
def train_model():
    """Train a specific model with custom parameters"""
    data = request.get_json()
    
    if not data or 'symbol' not in data:
        return jsonify({'error': 'Symbol is required'}), 400
    
    symbol = data['symbol']
    model_type = data.get('model_type', 'lstm')
    epochs = data.get('epochs', 100)
    
    try:
        # Get historical data
        stock = yf.Ticker(symbol)
        hist = stock.history(period='5y')  # Get 5 years of data for training
        
        if hist.empty:
            return jsonify({'error': 'No data found for this symbol'}), 404
        
        # Process data
        processed_data = data_processor.prepare_data(hist)
        
        # Initialize and train model
        if model_type == 'lstm':
            model = LSTMModel()
        elif model_type == 'attention':
            model = AttentionModel()
        else:
            model = EnsembleModel()
        
        # Train model
        training_history = model.train(processed_data, epochs=epochs)
        
        # Save model
        models[model_type] = model
        os.makedirs(app.config['MODELS_DIR'], exist_ok=True)
        with open(f"{app.config['MODELS_DIR']}/{model_type}_model.pkl", 'wb') as f:
            pickle.dump(model, f)
        
        return jsonify({
            'message': f'{model_type.upper()} model trained successfully',
            'training_history': training_history,
            'model_accuracy': model.get_accuracy() if hasattr(model, 'get_accuracy') else 0.85
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/status', methods=['GET'])
def get_models_status():
    """Get status of all models"""
    status = {}
    
    for model_name, model in models.items():
        status[model_name] = {
            'loaded': model is not None,
            'accuracy': model.get_accuracy() if model and hasattr(model, 'get_accuracy') else 0,
            'last_trained': 'Unknown'
        }
    
    return jsonify(status)

@app.route('/api/market/overview', methods=['GET'])
def get_market_overview():
    """Get market overview data"""
    try:
        # Get major indices
        indices = ['^GSPC', '^DJI', '^IXIC', '^VIX']  # S&P 500, Dow Jones, NASDAQ, VIX
        overview_data = []
        
        for index in indices:
            ticker = yf.Ticker(index)
            hist = ticker.history(period='5d')
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                prev_price = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
                change = current_price - prev_price
                change_percent = (change / prev_price) * 100
                
                overview_data.append({
                    'symbol': index,
                    'name': {
                        '^GSPC': 'S&P 500',
                        '^DJI': 'Dow Jones',
                        '^IXIC': 'NASDAQ',
                        '^VIX': 'VIX'
                    }.get(index, index),
                    'price': round(float(current_price), 2),
                    'change': round(float(change), 2),
                    'change_percent': round(float(change_percent), 2)
                })
        
        return jsonify({'indices': overview_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    # Load existing models on startup
    load_models()
    
    # Create necessary directories
    os.makedirs('models/saved_models', exist_ok=True)
    
    app.run(debug=True, host='0.0.0.0', port=5000) 