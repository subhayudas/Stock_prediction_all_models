import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Brain, 
  Target, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building,
  DollarSign,
  Calendar,
  TrendingDown,
  Activity
} from 'lucide-react';
import StockSearch from '../components/StockSearch';
import StockChart from '../components/StockChart';
import { 
  predictStock, 
  fetchCompanyOverview, 
  fetchEarnings, 
  fetchTechnicalIndicators,
  fetchQuote
} from '../services/api';
import toast from 'react-hot-toast';

const StockAnalysis = () => {
  const [selectedStock, setSelectedStock] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [companyOverview, setCompanyOverview] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [technicalIndicators, setTechnicalIndicators] = useState({});
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const handleStockSelect = async (stock) => {
    setSelectedStock(stock);
    setPredictions({});
    setCompanyOverview(null);
    setEarnings(null);
    setTechnicalIndicators({});
    setQuote(null);
    
    if (stock?.symbol) {
      await loadStockData(stock.symbol);
    }
  };

  const loadStockData = async (symbol) => {
    setLoadingData(true);
    try {
      // Load data in parallel
      const [overviewRes, earningsRes, quoteRes, smaRes, rsiRes] = await Promise.allSettled([
        fetchCompanyOverview(symbol),
        fetchEarnings(symbol),
        fetchQuote(symbol),
        fetchTechnicalIndicators(symbol, 'SMA', 'daily', '20'),
        fetchTechnicalIndicators(symbol, 'RSI', 'daily', '14')
      ]);

      if (overviewRes.status === 'fulfilled') {
        setCompanyOverview(overviewRes.value);
      }
      
      if (earningsRes.status === 'fulfilled') {
        setEarnings(earningsRes.value);
      }
      
      if (quoteRes.status === 'fulfilled') {
        setQuote(quoteRes.value);
      }
      
      if (smaRes.status === 'fulfilled') {
        setTechnicalIndicators(prev => ({ ...prev, SMA: smaRes.value }));
      }
      
      if (rsiRes.status === 'fulfilled') {
        setTechnicalIndicators(prev => ({ ...prev, RSI: rsiRes.value }));
      }
      
    } catch (error) {
      console.error('Error loading stock data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const generateAllPredictions = async () => {
    if (!selectedStock?.symbol) return;

    setLoading(true);
    const models = ['lstm', 'attention', 'ensemble'];
    const newPredictions = {};

    try {
      for (const model of models) {
        try {
          const prediction = await predictStock(selectedStock.symbol, model, 30);
          newPredictions[model] = prediction;
        } catch (error) {
          console.error(`Failed to get ${model} prediction:`, error);
          newPredictions[model] = { error: error.message };
        }
      }
      setPredictions(newPredictions);
      toast.success('All predictions generated successfully');
    } catch (error) {
      toast.error('Failed to generate some predictions');
    } finally {
      setLoading(false);
    }
  };

  const CompanyOverviewCard = () => {
    if (!companyOverview) return null;

    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Building className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Company Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-semibold text-gray-900">{companyOverview.Name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sector</p>
            <p className="font-semibold text-gray-900">{companyOverview.Sector}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Industry</p>
            <p className="font-semibold text-gray-900">{companyOverview.Industry}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Market Cap</p>
            <p className="font-semibold text-gray-900">
              ${companyOverview.MarketCapitalization ? (parseInt(companyOverview.MarketCapitalization) / 1000000000).toFixed(2) + 'B' : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">P/E Ratio</p>
            <p className="font-semibold text-gray-900">{companyOverview.PERatio || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Dividend Yield</p>
            <p className="font-semibold text-gray-900">{companyOverview.DividendYield ? (parseFloat(companyOverview.DividendYield) * 100).toFixed(2) + '%' : 'N/A'}</p>
          </div>
        </div>
        {companyOverview.Description && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Description</p>
            <p className="text-gray-900 text-sm leading-relaxed">{companyOverview.Description}</p>
          </div>
        )}
      </div>
    );
  };

  const EarningsCard = () => {
    if (!earnings?.quarterlyEarnings) return null;

    const recentEarnings = earnings.quarterlyEarnings.slice(0, 4);

    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <DollarSign className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Earnings</h3>
        </div>
        <div className="space-y-3">
          {recentEarnings.map((earning, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-semibold text-gray-900">{earning.fiscalDateEnding}</p>
                  <p className="text-sm text-gray-600">Q{earning.fiscalDateEnding.split('-')[1]}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">EPS</p>
                <p className="font-semibold text-gray-900">${earning.reportedEPS}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const TechnicalIndicatorsCard = () => {
    if (!technicalIndicators.SMA && !technicalIndicators.RSI) return null;

    const getSMASignal = (smaData) => {
      if (!smaData || !quote) return 'NEUTRAL';
      const smaValues = Object.values(smaData['Technical Analysis: SMA'] || {});
      if (smaValues.length === 0) return 'NEUTRAL';
      
      const latestSMA = parseFloat(smaValues[0]['SMA']);
      const currentPrice = quote.price;
      
      if (currentPrice > latestSMA * 1.02) return 'BUY';
      if (currentPrice < latestSMA * 0.98) return 'SELL';
      return 'NEUTRAL';
    };

    const getRSISignal = (rsiData) => {
      if (!rsiData) return 'NEUTRAL';
      const rsiValues = Object.values(rsiData['Technical Analysis: RSI'] || {});
      if (rsiValues.length === 0) return 'NEUTRAL';
      
      const latestRSI = parseFloat(rsiValues[0]['RSI']);
      
      if (latestRSI > 70) return 'SELL';
      if (latestRSI < 30) return 'BUY';
      return 'NEUTRAL';
    };

    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Technical Indicators</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {technicalIndicators.SMA && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">SMA (20)</p>
                <span className={`badge ${
                  getSMASignal(technicalIndicators.SMA) === 'BUY' ? 'badge-success' :
                  getSMASignal(technicalIndicators.SMA) === 'SELL' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {getSMASignal(technicalIndicators.SMA)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Moving average trend analysis
              </p>
            </div>
          )}
          {technicalIndicators.RSI && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">RSI (14)</p>
                <span className={`badge ${
                  getRSISignal(technicalIndicators.RSI) === 'BUY' ? 'badge-success' :
                  getRSISignal(technicalIndicators.RSI) === 'SELL' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {getRSISignal(technicalIndicators.RSI)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Relative strength indicator
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ModelPredictionCard = ({ modelName, prediction, color }) => {
    const hasError = prediction?.error;
    const currentPrice = quote?.price || selectedStock?.current_price || 0;
    const predictedPrice = prediction?.predicted_price_30d || 0;
    const change = predictedPrice - currentPrice;
    const changePercent = currentPrice > 0 ? (change / currentPrice) * 100 : 0;

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }}></div>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {modelName.replace('_', ' ')} Model
            </h3>
          </div>
          {hasError ? (
            <XCircle className="w-5 h-5 text-danger-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-success-600" />
          )}
        </div>

        {hasError ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-warning-600 mx-auto mb-2" />
            <p className="text-gray-600">Failed to generate prediction</p>
            <p className="text-sm text-gray-500 mt-1">{prediction.error}</p>
          </div>
        ) : prediction?.predicted_price_30d ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">30-Day Prediction</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${predictedPrice.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Change</p>
                <p className={`text-2xl font-bold ${
                  changePercent >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-lg font-semibold text-gray-900">
                  {prediction.model_accuracy?.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Recommendation</p>
                <span className={`badge ${
                  prediction.recommendation === 'BUY' ? 'badge-success' :
                  prediction.recommendation === 'SELL' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {prediction.recommendation}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No prediction available</p>
          </div>
        )}
      </div>
    );
  };

  const ComparisonChart = () => {
    const models = Object.keys(predictions).filter(model => !predictions[model]?.error);
    
    if (models.length === 0) return null;

    const currentPrice = quote?.price || selectedStock?.current_price || 0;
    const chartData = models.map(model => ({
      model: model.replace('_', ' ').toUpperCase(),
      prediction: predictions[model]?.predicted_price_30d || 0,
      change: predictions[model]?.predicted_price_30d 
        ? ((predictions[model].predicted_price_30d - currentPrice) / currentPrice) * 100 
        : 0,
      accuracy: predictions[model]?.model_accuracy || 0
    }));

    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Comparison</h3>
        <div className="space-y-4">
          {chartData.map((data, index) => (
            <div key={data.model} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  index === 0 ? 'bg-blue-500' : 
                  index === 1 ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="font-medium text-gray-900">{data.model}</span>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Prediction</p>
                  <p className="font-semibold text-gray-900">${data.prediction.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Change</p>
                  <p className={`font-semibold ${
                    data.change >= 0 ? 'text-success-600' : 'text-danger-600'
                  }`}>
                    {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Accuracy</p>
                  <p className="font-semibold text-gray-900">{data.accuracy.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Analysis</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive AI-powered stock predictions and analysis
          </p>
        </div>
        {selectedStock && (
          <button
            onClick={generateAllPredictions}
            disabled={loading}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Brain className="w-4 h-4" />
            <span>{loading ? 'Generating...' : 'Generate All Predictions'}</span>
          </button>
        )}
      </div>

      {/* Stock Search */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Stock</h2>
        <StockSearch onStockSelect={handleStockSelect} />
      </div>

      {/* Loading State */}
      {loadingData && (
        <div className="text-center py-8">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock data...</p>
        </div>
      )}

      {/* Stock Overview */}
      {selectedStock && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Quote */}
          {quote && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Current Quote</h3>
                <span className="text-sm text-gray-500">{quote.latest_trading_day}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current Price</p>
                  <p className="text-2xl font-bold text-gray-900">${quote.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Change</p>
                  <div className="flex items-center space-x-1">
                    {quote.change >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-success-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-danger-600" />
                    )}
                    <p className={`text-xl font-bold ${
                      quote.change >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_percent})
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Volume</p>
                  <p className="text-lg font-semibold text-gray-900">{quote.volume.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Previous Close</p>
                  <p className="text-lg font-semibold text-gray-900">${quote.previous_close.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Technical Indicators */}
          <TechnicalIndicatorsCard />
        </div>
      )}

      {/* Company Overview */}
      <CompanyOverviewCard />

      {/* Earnings */}
      <EarningsCard />

      {/* Stock Chart */}
      {selectedStock && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Chart</h3>
          <StockChart symbol={selectedStock.symbol} />
        </div>
      )}

      {/* Model Predictions */}
      {Object.keys(predictions).length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(predictions).map(([model, prediction], index) => (
              <ModelPredictionCard
                key={model}
                modelName={model}
                prediction={prediction}
                color={['#3B82F6', '#10B981', '#F59E0B'][index]}
              />
            ))}
          </div>
          <ComparisonChart />
        </>
      )}
    </div>
  );
};

export default StockAnalysis; 