import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Play, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Clock
} from 'lucide-react';
import { trainModel, getModelsStatus } from '../services/api';
import toast from 'react-hot-toast';

const ModelTraining = () => {
  const [modelsStatus, setModelsStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState({});
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [trainingParams, setTrainingParams] = useState({
    epochs: 100,
    model_type: 'lstm'
  });

  const models = [
    {
      key: 'lstm',
      name: 'LSTM Neural Network',
      description: 'Long Short-Term Memory network for sequential data',
      icon: Brain,
      color: 'blue'
    },
    {
      key: 'attention',
      name: 'Attention Transformer',
      description: 'Transformer model with self-attention mechanism',
      icon: Settings,
      color: 'green'
    },
    {
      key: 'ensemble',
      name: 'Ensemble Model',
      description: 'Combination of multiple ML algorithms',
      icon: BarChart3,
      color: 'yellow'
    }
  ];

  useEffect(() => {
    loadModelsStatus();
  }, []);

  const loadModelsStatus = async () => {
    try {
      const status = await getModelsStatus();
      setModelsStatus(status);
    } catch (error) {
      toast.error('Failed to load models status');
      console.error('Error loading models status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModel = async (modelType) => {
    setTraining(prev => ({ ...prev, [modelType]: true }));
    
    try {
      const result = await trainModel(selectedStock, modelType, trainingParams.epochs);
      toast.success(`${modelType.toUpperCase()} model trained successfully`);
      
      // Update models status
      await loadModelsStatus();
    } catch (error) {
      toast.error(`Failed to train ${modelType} model`);
      console.error('Training error:', error);
    } finally {
      setTraining(prev => ({ ...prev, [modelType]: false }));
    }
  };

  const ModelCard = ({ model }) => {
    const status = modelsStatus[model.key] || {};
    const isTraining = training[model.key];
    const Icon = model.icon;

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${model.color}-100`}>
              <Icon className={`w-6 h-6 text-${model.color}-600`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
              <p className="text-sm text-gray-600">{model.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {status.loaded ? (
              <CheckCircle className="w-5 h-5 text-success-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Status</span>
            <span className={`badge ${
              status.loaded ? 'badge-success' : 'badge-warning'
            }`}>
              {status.loaded ? 'Trained' : 'Not Trained'}
            </span>
          </div>

          {status.accuracy > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Accuracy</span>
              <span className="font-semibold text-gray-900">
                {status.accuracy.toFixed(1)}%
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Last Trained</span>
            <span className="text-sm text-gray-500">
              {status.last_trained || 'Never'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => handleTrainModel(model.key)}
            disabled={isTraining}
            className={`btn w-full flex items-center justify-center space-x-2 ${
              isTraining ? 'btn-secondary' : 'btn-primary'
            }`}
          >
            {isTraining ? (
              <>
                <div className="loading-spinner w-4 h-4"></div>
                <span>Training...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Train Model</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Model Training</h1>
          <div className="loading-spinner"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Model Training</h1>
          <p className="text-gray-600 mt-1">
            Train and manage AI models for stock prediction
          </p>
        </div>
      </div>

      {/* Training Configuration */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Training Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Symbol
            </label>
            <input
              type="text"
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value.toUpperCase())}
              className="input"
              placeholder="e.g., AAPL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Training Epochs
            </label>
            <select
              value={trainingParams.epochs}
              onChange={(e) => setTrainingParams(prev => ({ 
                ...prev, 
                epochs: parseInt(e.target.value) 
              }))}
              className="input"
            >
              <option value={50}>50 (Fast)</option>
              <option value={100}>100 (Balanced)</option>
              <option value={200}>200 (Thorough)</option>
              <option value={500}>500 (Comprehensive)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                models.forEach(model => {
                  if (!training[model.key]) {
                    handleTrainModel(model.key);
                  }
                });
              }}
              disabled={Object.values(training).some(Boolean)}
              className="btn btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Brain className="w-4 h-4" />
              <span>Train All Models</span>
            </button>
          </div>
        </div>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {models.map((model) => (
          <ModelCard key={model.key} model={model} />
        ))}
      </div>

      {/* Training Tips */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Training Tips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Model Selection</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <strong>LSTM:</strong> Best for trend following and sequential patterns</li>
              <li>• <strong>Attention:</strong> Excellent for complex pattern recognition</li>
              <li>• <strong>Ensemble:</strong> Most robust, combines multiple approaches</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Training Parameters</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <strong>50 epochs:</strong> Quick training, basic accuracy</li>
              <li>• <strong>100 epochs:</strong> Balanced performance and time</li>
              <li>• <strong>200+ epochs:</strong> Maximum accuracy, longer training</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Training Progress */}
      {Object.values(training).some(Boolean) && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Training Progress</h2>
          <div className="space-y-4">
            {models.map((model) => (
              training[model.key] && (
                <div key={model.key} className="flex items-center space-x-3">
                  <div className="loading-spinner w-5 h-5"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Training {model.name}...
                    </p>
                    <p className="text-sm text-gray-600">
                      Using {selectedStock} data with {trainingParams.epochs} epochs
                    </p>
                  </div>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelTraining; 