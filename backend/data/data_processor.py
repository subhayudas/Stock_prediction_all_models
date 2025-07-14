import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, StandardScaler
import warnings
warnings.filterwarnings('ignore')

class DataProcessor:
    def __init__(self):
        self.scaler = MinMaxScaler()
        self.feature_scaler = StandardScaler()
        
    def prepare_data(self, data):
        """Prepare stock data for model training"""
        if isinstance(data, pd.DataFrame):
            # Ensure we have the required columns
            required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
            if not all(col in data.columns for col in required_columns):
                raise ValueError(f"Data must contain columns: {required_columns}")
            
            # Sort by date if index is datetime
            if isinstance(data.index, pd.DatetimeIndex):
                data = data.sort_index()
            
            # Remove any rows with NaN values
            data = data.dropna()
            
            # Add technical indicators
            data = self.add_technical_indicators(data)
            
            return data
        else:
            raise ValueError("Data must be a pandas DataFrame")
    
    def add_technical_indicators(self, data):
        """Add technical indicators to the data"""
        df = data.copy()
        
        # Simple Moving Averages
        df['SMA_5'] = df['Close'].rolling(window=5).mean()
        df['SMA_10'] = df['Close'].rolling(window=10).mean()
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        
        # Exponential Moving Averages
        df['EMA_12'] = df['Close'].ewm(span=12).mean()
        df['EMA_26'] = df['Close'].ewm(span=26).mean()
        
        # MACD
        df['MACD'] = df['EMA_12'] - df['EMA_26']
        df['MACD_signal'] = df['MACD'].ewm(span=9).mean()
        df['MACD_histogram'] = df['MACD'] - df['MACD_signal']
        
        # RSI
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        df['BB_middle'] = df['Close'].rolling(window=20).mean()
        bb_std = df['Close'].rolling(window=20).std()
        df['BB_upper'] = df['BB_middle'] + (bb_std * 2)
        df['BB_lower'] = df['BB_middle'] - (bb_std * 2)
        df['BB_width'] = df['BB_upper'] - df['BB_lower']
        df['BB_position'] = (df['Close'] - df['BB_lower']) / df['BB_width']
        
        # Stochastic Oscillator
        lowest_low = df['Low'].rolling(window=14).min()
        highest_high = df['High'].rolling(window=14).max()
        df['Stoch_K'] = 100 * (df['Close'] - lowest_low) / (highest_high - lowest_low)
        df['Stoch_D'] = df['Stoch_K'].rolling(window=3).mean()
        
        # Average True Range (ATR)
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        true_range = np.maximum(high_low, np.maximum(high_close, low_close))
        df['ATR'] = true_range.rolling(window=14).mean()
        
        # Volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_ratio'] = df['Volume'] / df['Volume_SMA']
        
        # Price momentum
        df['Price_momentum_5'] = df['Close'].pct_change(5)
        df['Price_momentum_10'] = df['Close'].pct_change(10)
        df['Price_momentum_20'] = df['Close'].pct_change(20)
        
        # Volatility
        df['Volatility'] = df['Close'].rolling(window=20).std()
        
        # Price ratios
        df['High_Low_ratio'] = df['High'] / df['Low']
        df['Close_Open_ratio'] = df['Close'] / df['Open']
        
        # Williams %R
        df['Williams_R'] = -100 * (highest_high - df['Close']) / (highest_high - lowest_low)
        
        # Commodity Channel Index (CCI)
        tp = (df['High'] + df['Low'] + df['Close']) / 3
        sma_tp = tp.rolling(window=20).mean()
        mean_dev = tp.rolling(window=20).apply(lambda x: np.mean(np.abs(x - x.mean())))
        df['CCI'] = (tp - sma_tp) / (0.015 * mean_dev)
        
        # Rate of Change (ROC)
        df['ROC'] = ((df['Close'] - df['Close'].shift(12)) / df['Close'].shift(12)) * 100
        
        # On-Balance Volume (OBV)
        df['OBV'] = (np.sign(df['Close'].diff()) * df['Volume']).fillna(0).cumsum()
        
        # Money Flow Index (MFI)
        typical_price = (df['High'] + df['Low'] + df['Close']) / 3
        money_flow = typical_price * df['Volume']
        positive_flow = money_flow.where(typical_price > typical_price.shift(1), 0).rolling(window=14).sum()
        negative_flow = money_flow.where(typical_price < typical_price.shift(1), 0).rolling(window=14).sum()
        mfi_ratio = positive_flow / negative_flow
        df['MFI'] = 100 - (100 / (1 + mfi_ratio))
        
        # Fill NaN values with forward fill then backward fill
        df = df.fillna(method='ffill').fillna(method='bfill')
        
        return df
    
    def normalize_data(self, data, columns=None):
        """Normalize specified columns of the data"""
        if columns is None:
            columns = ['Close']
        
        df = data.copy()
        for col in columns:
            if col in df.columns:
                df[col] = self.scaler.fit_transform(df[col].values.reshape(-1, 1)).flatten()
        
        return df
    
    def denormalize_data(self, data, column='Close'):
        """Denormalize data back to original scale"""
        if hasattr(self.scaler, 'inverse_transform'):
            return self.scaler.inverse_transform(data.reshape(-1, 1)).flatten()
        else:
            return data
    
    def create_sequences(self, data, sequence_length=60, target_column='Close'):
        """Create sequences for time series prediction"""
        if isinstance(data, pd.DataFrame):
            values = data[target_column].values
        else:
            values = data
        
        X, y = [], []
        for i in range(sequence_length, len(values)):
            X.append(values[i-sequence_length:i])
            y.append(values[i])
        
        return np.array(X), np.array(y)
    
    def split_data(self, data, train_ratio=0.8, val_ratio=0.1):
        """Split data into train, validation, and test sets"""
        n = len(data)
        train_end = int(n * train_ratio)
        val_end = int(n * (train_ratio + val_ratio))
        
        train_data = data[:train_end]
        val_data = data[train_end:val_end]
        test_data = data[val_end:]
        
        return train_data, val_data, test_data
    
    def calculate_returns(self, data, column='Close'):
        """Calculate returns from price data"""
        if isinstance(data, pd.DataFrame):
            returns = data[column].pct_change().dropna()
        else:
            returns = pd.Series(data).pct_change().dropna()
        
        return returns
    
    def detect_outliers(self, data, column='Close', method='iqr'):
        """Detect outliers in the data"""
        if isinstance(data, pd.DataFrame):
            values = data[column]
        else:
            values = pd.Series(data)
        
        if method == 'iqr':
            Q1 = values.quantile(0.25)
            Q3 = values.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers = (values < lower_bound) | (values > upper_bound)
        elif method == 'zscore':
            z_scores = np.abs((values - values.mean()) / values.std())
            outliers = z_scores > 3
        else:
            raise ValueError("Method must be 'iqr' or 'zscore'")
        
        return outliers
    
    def remove_outliers(self, data, column='Close', method='iqr'):
        """Remove outliers from the data"""
        outliers = self.detect_outliers(data, column, method)
        
        if isinstance(data, pd.DataFrame):
            return data[~outliers]
        else:
            return data[~outliers.values]
    
    def get_feature_columns(self, data):
        """Get list of feature columns (excluding basic OHLCV)"""
        basic_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        if isinstance(data, pd.DataFrame):
            return [col for col in data.columns if col not in basic_columns]
        else:
            return [] 