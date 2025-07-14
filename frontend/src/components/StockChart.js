import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  Brain, 
  Target, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';
import { predictStock } from '../services/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const StockChart = ({ stockData }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('ensemble');
  const [timeRange, setTimeRange] = useState('3m');
  const [showPredictions, setShowPredictions] = useState(false);

  const models = [
    { value: 'lstm', label: 'LSTM Neural Network', color: '#3b82f6' },
    { value: 'attention', label: 'Attention Transformer', color: '#10b981' },
    { value: 'ensemble', label: 'Ensemble Model', color: '#f59e0b' }
  ];

  const timeRanges = [
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '2y', label: '2Y' }
  ];

  useEffect(() => {
    if (stockData && showPredictions) {
      generatePredictions();
    }
  }, [stockData, selectedModel, showPredictions]);

  const generatePredictions = async () => {
    if (!stockData?.symbol) return;

    setLoading(true);
    try {
      const predictionData = await predictStock(stockData.symbol, selectedModel, 30);
      setPredictions(predictionData);
      toast.success('Predictions generated successfully');
    } catch (error) {
      toast.error('Failed to generate predictions');
      console.error('Prediction error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (!stockData?.historical_data) return [];

    const now = new Date();
    const ranges = {
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      '2y': 730
    };

    const daysBack = ranges[timeRange] || 90;
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    return stockData.historical_data
      .filter(item => new Date(item.date) >= cutoffDate)
      .map(item => ({
        ...item,
        date: item.date,
        price: item.close
      }));
  };

  const getCombinedData = () => {
    const historicalData = getFilteredData();
    
    if (!showPredictions || !predictions?.predictions) {
      return historicalData;
    }

    const predictionData = predictions.predictions.map(pred => ({
      date: pred.date,
      price: null,
      predicted_price: pred.predicted_price,
      confidence: pred.confidence
    }));

    return [...historicalData, ...predictionData];
  };

  const formatTooltipValue = (value, name) => {
    if (name === 'price' || name === 'predicted_price') {
      return [`$${value?.toFixed(2) || 'N/A'}`, name === 'price' ? 'Actual Price' : 'Predicted Price'];
    }
    if (name === 'confidence') {
      return [`${(value * 100).toFixed(1)}%`, 'Confidence'];
    }
    return [value, name];
  };

  const formatXAxisLabel = (tickItem) => {
    try {
      return format(parseISO(tickItem), 'MMM dd');
    } catch {
      return tickItem;
    }
  };

  const chartData = getCombinedData();
  const currentPrice = stockData?.current_price || 0;
  const predictionChange = predictions ? 
    ((predictions.predicted_price_30d - currentPrice) / currentPrice * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Time Range Selector */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range.value
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model Selector and Prediction Controls */}
        <div className="flex items-center space-x-4">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="input w-auto min-w-[200px]"
          >
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className={`btn ${showPredictions ? 'btn-primary' : 'btn-secondary'} flex items-center space-x-2`}
          >
            <Brain className="w-4 h-4" />
            <span>{showPredictions ? 'Hide' : 'Show'} Predictions</span>
          </button>

          {showPredictions && (
            <button
              onClick={generatePredictions}
              disabled={loading}
              className="btn btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Prediction Summary */}
      {showPredictions && predictions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center space-x-3">
              <Target className="w-8 h-8 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600">30-Day Prediction</p>
                <p className="text-xl font-bold text-gray-900">
                  ${predictions.predicted_price_30d?.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <TrendingUp className={`w-8 h-8 ${
                predictionChange >= 0 ? 'text-success-600' : 'text-danger-600'
              }`} />
              <div>
                <p className="text-sm text-gray-600">Expected Change</p>
                <p className={`text-xl font-bold ${
                  predictionChange >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {predictionChange >= 0 ? '+' : ''}{predictionChange.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-8 h-8 text-warning-600" />
              <div>
                <p className="text-sm text-gray-600">Recommendation</p>
                <span className={`badge text-sm font-semibold ${
                  predictions.recommendation === 'BUY' ? 'badge-success' :
                  predictions.recommendation === 'SELL' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {predictions.recommendation}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxisLabel}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={(label) => {
                  try {
                    return format(parseISO(label), 'MMM dd, yyyy');
                  } catch {
                    return label;
                  }
                }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              
              {/* Historical Price Line */}
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Historical Price"
                connectNulls={false}
              />

              {/* Prediction Line */}
              {showPredictions && (
                <Line
                  type="monotone"
                  dataKey="predicted_price"
                  stroke={models.find(m => m.value === selectedModel)?.color || '#f59e0b'}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Predicted Price"
                  connectNulls={false}
                />
              )}

              {/* Current Price Reference Line */}
              {currentPrice > 0 && (
                <ReferenceLine 
                  y={currentPrice} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3"
                  label={{ value: "Current", position: "topRight" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
              <span className="text-gray-900 font-medium">Generating predictions...</span>
            </div>
          </div>
        )}
      </div>

      {/* Model Performance Info */}
      {showPredictions && predictions && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Model Accuracy</p>
              <p className="text-2xl font-bold text-gray-900">
                {predictions.model_accuracy?.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Model Type</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {selectedModel.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockChart; 