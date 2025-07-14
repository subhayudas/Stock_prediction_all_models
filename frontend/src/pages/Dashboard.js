import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Search,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import StockChart from '../components/StockChart';
import StockSearch from '../components/StockSearch';
import { fetchMarketOverview } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMarketData();
  }, []);

  const loadMarketData = async () => {
    try {
      const data = await fetchMarketOverview();
      setMarketData(data);
    } catch (error) {
      toast.error('Failed to load market data');
      console.error('Error loading market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMarketData();
    setRefreshing(false);
    toast.success('Market data refreshed');
  };

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
  };

  const MarketCard = ({ title, value, change, changePercent, icon: Icon, trend }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className="flex items-center mt-1">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-danger-600 mr-1" />
            )}
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-success-600' : 'text-danger-600'
            }`}>
              {change} ({changePercent}%)
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${
          trend === 'up' ? 'bg-success-100' : 'bg-danger-100'
        }`}>
          <Icon className={`w-6 h-6 ${
            trend === 'up' ? 'text-success-600' : 'text-danger-600'
          }`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="loading-spinner"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome to your stock prediction dashboard
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Market Overview Cards */}
      {marketData && marketData.indices && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {marketData.indices.map((index, i) => (
            <MarketCard
              key={index.symbol}
              title={index.name}
              value={index.price.toLocaleString()}
              change={index.change > 0 ? `+${index.change}` : index.change}
              changePercent={index.change_percent > 0 ? `+${index.change_percent}` : index.change_percent}
              icon={[DollarSign, TrendingUp, Activity, TrendingDown][i] || DollarSign}
              trend={index.change > 0 ? 'up' : 'down'}
            />
          ))}
        </div>
      )}

      {/* Stock Search */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Stock Analysis</h2>
          </div>
        </div>
        <StockSearch onStockSelect={handleStockSelect} />
      </div>

      {/* Stock Chart */}
      {selectedStock && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedStock.name} ({selectedStock.symbol})
                </h2>
                <p className="text-gray-600">
                  Current Price: ${selectedStock.current_price?.toLocaleString() || 'N/A'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="badge badge-primary">
                  {selectedStock.currency || 'USD'}
                </span>
                {selectedStock.market_cap && (
                  <span className="badge badge-secondary">
                    Market Cap: ${(selectedStock.market_cap / 1e9).toFixed(1)}B
                  </span>
                )}
              </div>
            </div>
          </div>
          <StockChart stockData={selectedStock} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Predict Stock</h3>
              <p className="text-gray-600">Get AI-powered stock predictions</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-success-100 rounded-full">
              <Activity className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Market Analysis</h3>
              <p className="text-gray-600">Comprehensive market insights</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-warning-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
              <p className="text-gray-600">Evaluate investment risks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-success-500 rounded-full"></div>
              <span className="text-gray-900">Model trained successfully</span>
            </div>
            <span className="text-sm text-gray-500">2 hours ago</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-gray-900">Stock prediction generated</span>
            </div>
            <span className="text-sm text-gray-500">5 hours ago</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-warning-500 rounded-full"></div>
              <span className="text-gray-900">Market data updated</span>
            </div>
            <span className="text-sm text-gray-500">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 