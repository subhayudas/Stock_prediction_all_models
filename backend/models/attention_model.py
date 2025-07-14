import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.ensemble import GradientBoostingRegressor
import warnings
warnings.filterwarnings('ignore')

class AttentionModel:
    def __init__(self, sequence_length=60, num_features=1):
        self.sequence_length = sequence_length
        self.num_features = num_features
        # Use GradientBoostingRegressor as an alternative to attention mechanism
        self.model = GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        self.scaler = MinMaxScaler()
        self.is_trained = False
        self.training_history = None
        self.accuracy = 0
        
    def prepare_sequences(self, data):
        """Prepare sequences for training"""
        X, y = [], []
        for i in range(self.sequence_length, len(data)):
            # Create features that simulate attention mechanism
            sequence = data[i-self.sequence_length:i].flatten()
            # Add positional encoding-like features
            positions = np.arange(len(sequence)) / len(sequence)
            # Add weighted features (simulating attention weights)
            weights = np.exp(np.arange(len(sequence)) / len(sequence))
            weighted_sequence = sequence * weights
            
            features = np.concatenate([sequence, positions, weighted_sequence])
            X.append(features)
            y.append(data[i][0])
        return np.array(X), np.array(y)
    
    def train(self, data, epochs=100, batch_size=32, validation_split=0.2):
        """Train the attention model"""
        try:
            # Extract close prices
            if isinstance(data, pd.DataFrame):
                close_prices = data['Close'].values.reshape(-1, 1)
            else:
                close_prices = data.reshape(-1, 1)
            
            # Scale the data
            scaled_data = self.scaler.fit_transform(close_prices)
            
            # Prepare sequences
            X, y = self.prepare_sequences(scaled_data)
            
            # Split data
            train_size = int(len(X) * (1 - validation_split))
            X_train, X_val = X[:train_size], X[train_size:]
            y_train, y_val = y[:train_size], y[train_size:]
            
            # Train the model
            self.model.fit(X_train, y_train)
            
            # Calculate accuracy
            val_predictions = self.model.predict(X_val)
            val_predictions = self.scaler.inverse_transform(val_predictions.reshape(-1, 1))
            y_val_actual = self.scaler.inverse_transform(y_val.reshape(-1, 1))
            
            mse = mean_squared_error(y_val_actual, val_predictions)
            mae = mean_absolute_error(y_val_actual, val_predictions)
            
            # Calculate accuracy as percentage
            mape = np.mean(np.abs((y_val_actual - val_predictions) / y_val_actual)) * 100
            self.accuracy = max(0, 100 - mape)
            
            self.is_trained = True
            self.training_history = {
                'final_mse': float(mse),
                'final_mae': float(mae),
                'accuracy': float(self.accuracy)
            }
            
            return self.training_history
            
        except Exception as e:
            raise Exception(f"Error training attention model: {str(e)}")
    
    def predict(self, data, days_ahead=30):
        """Make predictions for future stock prices"""
        if not self.is_trained or self.model is None:
            raise Exception("Model must be trained before making predictions")
        
        try:
            # Extract close prices
            if isinstance(data, pd.DataFrame):
                close_prices = data['Close'].values.reshape(-1, 1)
            else:
                close_prices = data.reshape(-1, 1)
            
            # Scale the data
            scaled_data = self.scaler.transform(close_prices)
            
            # Get the last sequence
            last_sequence = scaled_data[-self.sequence_length:]
            
            predictions = []
            current_sequence = last_sequence.copy()
            
            # Predict future prices
            for _ in range(days_ahead):
                # Prepare features similar to training
                sequence = current_sequence.flatten()
                positions = np.arange(len(sequence)) / len(sequence)
                weights = np.exp(np.arange(len(sequence)) / len(sequence))
                weighted_sequence = sequence * weights
                
                features = np.concatenate([sequence, positions, weighted_sequence])
                current_input = features.reshape(1, -1)
                
                # Make prediction
                next_pred = self.model.predict(current_input)
                
                # Add prediction to results
                predictions.append(next_pred[0])
                
                # Update sequence for next prediction
                current_sequence = np.roll(current_sequence, -1)
                current_sequence[-1] = next_pred[0]
            
            # Inverse transform predictions
            predictions = np.array(predictions).reshape(-1, 1)
            predictions = self.scaler.inverse_transform(predictions)
            
            return predictions.flatten()
            
        except Exception as e:
            raise Exception(f"Error making predictions: {str(e)}")
    
    def get_accuracy(self):
        """Get model accuracy"""
        return self.accuracy if self.is_trained else 0 