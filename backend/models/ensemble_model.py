import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, AdaBoostRegressor
from sklearn.ensemble import BaggingRegressor, ExtraTreesRegressor
import xgboost as xgb
from .lstm_model import LSTMModel
from .attention_model import AttentionModel
import warnings
warnings.filterwarnings('ignore')

class EnsembleModel:
    def __init__(self, sequence_length=60):
        self.sequence_length = sequence_length
        self.scaler = MinMaxScaler()
        self.is_trained = False
        self.accuracy = 0
        
        # Initialize base models
        self.lstm_model = LSTMModel(sequence_length=sequence_length)
        self.attention_model = AttentionModel(sequence_length=sequence_length)
        
        # Initialize ensemble models
        self.rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.gb_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.ada_model = AdaBoostRegressor(n_estimators=100, random_state=42)
        self.bag_model = BaggingRegressor(n_estimators=100, random_state=42)
        self.et_model = ExtraTreesRegressor(n_estimators=100, random_state=42)
        
        # XGBoost meta-learner
        self.xgb_model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        self.base_models = [self.rf_model, self.gb_model, self.ada_model, self.bag_model, self.et_model]
        self.training_history = None
        
    def create_features(self, data):
        """Create technical indicators and features"""
        df = data.copy()
        
        # Moving averages
        df['MA_5'] = df['Close'].rolling(window=5).mean()
        df['MA_10'] = df['Close'].rolling(window=10).mean()
        df['MA_20'] = df['Close'].rolling(window=20).mean()
        df['MA_50'] = df['Close'].rolling(window=50).mean()
        
        # Exponential moving averages
        df['EMA_12'] = df['Close'].ewm(span=12).mean()
        df['EMA_26'] = df['Close'].ewm(span=26).mean()
        
        # MACD
        df['MACD'] = df['EMA_12'] - df['EMA_26']
        df['MACD_signal'] = df['MACD'].ewm(span=9).mean()
        
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
        
        # Volatility
        df['Volatility'] = df['Close'].rolling(window=20).std()
        
        # Price ratios
        df['High_Low_Ratio'] = df['High'] / df['Low']
        df['Close_Open_Ratio'] = df['Close'] / df['Open']
        
        # Volume indicators
        df['Volume_MA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_MA']
        
        # Price momentum
        df['Price_Change'] = df['Close'].pct_change()
        df['Price_Change_5'] = df['Close'].pct_change(5)
        df['Price_Change_10'] = df['Close'].pct_change(10)
        
        # Drop rows with NaN values
        df = df.dropna()
        
        return df
    
    def prepare_ensemble_data(self, data):
        """Prepare data for ensemble training"""
        # Create features
        df_features = self.create_features(data)
        
        # Select feature columns (excluding OHLCV)
        feature_columns = [col for col in df_features.columns if col not in ['Open', 'High', 'Low', 'Close', 'Volume']]
        
        X = df_features[feature_columns].values
        y = df_features['Close'].values
        
        return X, y
    
    def train(self, data, epochs=100, batch_size=32, validation_split=0.2):
        """Train the ensemble model"""
        try:
            # Prepare data
            X, y = self.prepare_ensemble_data(data)
            
            # Split data
            train_size = int(len(X) * (1 - validation_split))
            X_train, X_val = X[:train_size], X[train_size:]
            y_train, y_val = y[:train_size], y[train_size:]
            
            # Train base models
            base_predictions_train = []
            base_predictions_val = []
            
            for model in self.base_models:
                # Train model
                model.fit(X_train, y_train)
                
                # Get predictions
                train_pred = model.predict(X_train)
                val_pred = model.predict(X_val)
                
                base_predictions_train.append(train_pred)
                base_predictions_val.append(val_pred)
            
            # Train deep learning models
            try:
                # Train LSTM
                lstm_history = self.lstm_model.train(
                    data.iloc[:train_size + self.sequence_length], 
                    epochs=epochs//2, 
                    batch_size=batch_size
                )
                
                # Get LSTM predictions
                lstm_train_pred = self.lstm_model.predict(
                    data.iloc[:train_size + self.sequence_length], 
                    days_ahead=len(y_train)
                )
                lstm_val_pred = self.lstm_model.predict(
                    data.iloc[:train_size + self.sequence_length + len(y_val)], 
                    days_ahead=len(y_val)
                )
                
                # Align predictions
                lstm_train_pred = lstm_train_pred[-len(y_train):]
                lstm_val_pred = lstm_val_pred[-len(y_val):]
                
                base_predictions_train.append(lstm_train_pred)
                base_predictions_val.append(lstm_val_pred)
                
            except Exception as e:
                print(f"LSTM training failed: {e}")
                # Add dummy predictions if LSTM fails
                base_predictions_train.append(np.full(len(y_train), np.mean(y_train)))
                base_predictions_val.append(np.full(len(y_val), np.mean(y_val)))
            
            # Stack predictions
            stacked_train = np.column_stack(base_predictions_train)
            stacked_val = np.column_stack(base_predictions_val)
            
            # Add original features
            stacked_train = np.column_stack([stacked_train, X_train])
            stacked_val = np.column_stack([stacked_val, X_val])
            
            # Train meta-learner (XGBoost)
            self.xgb_model.fit(
                stacked_train, y_train,
                eval_set=[(stacked_val, y_val)],
                early_stopping_rounds=20,
                verbose=False
            )
            
            # Calculate accuracy
            val_predictions = self.xgb_model.predict(stacked_val)
            mse = mean_squared_error(y_val, val_predictions)
            mae = mean_absolute_error(y_val, val_predictions)
            
            # Calculate accuracy as percentage
            mape = np.mean(np.abs((y_val - val_predictions) / y_val)) * 100
            self.accuracy = max(0, 100 - mape)
            
            self.is_trained = True
            self.training_history = {
                'final_mse': float(mse),
                'final_mae': float(mae),
                'accuracy': float(self.accuracy),
                'num_base_models': len(self.base_models) + 1  # +1 for LSTM
            }
            
            return self.training_history
            
        except Exception as e:
            raise Exception(f"Error training ensemble model: {str(e)}")
    
    def predict(self, data, days_ahead=30):
        """Make predictions using the ensemble model"""
        if not self.is_trained:
            raise Exception("Model must be trained before making predictions")
        
        try:
            # Prepare current data
            X, y = self.prepare_ensemble_data(data)
            
            # Get predictions from base models
            base_predictions = []
            
            for model in self.base_models:
                # Use the last available features for prediction
                last_features = X[-1:].reshape(1, -1)
                pred = model.predict(last_features)
                base_predictions.append(pred[0])
            
            # Get LSTM predictions
            try:
                lstm_predictions = self.lstm_model.predict(data, days_ahead=days_ahead)
                
                # Use LSTM predictions for ensemble
                predictions = []
                for i in range(days_ahead):
                    # Create prediction vector
                    pred_vector = base_predictions.copy()
                    pred_vector.append(lstm_predictions[i])
                    
                    # Add last features
                    pred_vector.extend(X[-1])
                    
                    # Reshape for XGBoost
                    pred_vector = np.array(pred_vector).reshape(1, -1)
                    
                    # Get ensemble prediction
                    ensemble_pred = self.xgb_model.predict(pred_vector)
                    predictions.append(ensemble_pred[0])
                
                return np.array(predictions)
                
            except Exception as e:
                print(f"LSTM prediction failed: {e}")
                # Fallback to simple ensemble
                predictions = []
                current_price = y[-1]
                
                for i in range(days_ahead):
                    # Simple trend continuation
                    trend = np.mean(np.diff(y[-10:]))  # Last 10 days trend
                    pred_price = current_price + (trend * (i + 1))
                    predictions.append(pred_price)
                
                return np.array(predictions)
            
        except Exception as e:
            raise Exception(f"Error making predictions: {str(e)}")
    
    def get_accuracy(self):
        """Get model accuracy"""
        return self.accuracy if self.is_trained else 0
    
    def get_feature_importance(self):
        """Get feature importance from XGBoost"""
        if self.is_trained and hasattr(self.xgb_model, 'feature_importances_'):
            return self.xgb_model.feature_importances_
        return None 