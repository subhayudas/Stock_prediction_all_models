import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  RefreshCw,
  Globe,
  Newspaper,
  Clock,
  ExternalLink
} from 'lucide-react';
import { 
  fetchMarketOverview, 
  fetchTopGainersLosers, 
  fetchGlobalMarketStatus,
  fetchNews 
} from '../services/api';
import toast from 'react-hot-toast';

const MarketOverview = () => {
  const [marketData, setMarketData] = useState(null);
  const [topGainersLosers, setTopGainersLosers] = useState(null);
  const [globalStatus, setGlobalStatus] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load data in parallel
      const [marketRes, gainersLosersRes, statusRes, newsRes] = await Promise.allSettled([
        fetchMarketOverview(),
        fetchTopGainersLosers(),
        fetchGlobalMarketStatus(),
        fetchNews('', '', '', '', '10')
      ]);

      if (marketRes.status === 'fulfilled') {
        setMarketData(marketRes.value);
      }
      
      if (gainersLosersRes.status === 'fulfilled') {
        setTopGainersLosers(gainersLosersRes.value);
      }
      
      if (statusRes.status === 'fulfilled') {
        setGlobalStatus(statusRes.value);
      }
      
      if (newsRes.status === 'fulfilled') {
        setNews(newsRes.value.feed || []);
      }
      
    } catch (error) {
      toast.error('Failed to load market data');
      console.error('Error loading market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast.success('Market data refreshed');
  };

  const MarketIndexCard = ({ index }) => (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">{index.name}</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {index.price.toLocaleString()}
          </p>
          <div className="flex items-center mt-2">
            {index.change > 0 ? (
              <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-danger-600 mr-1" />
            )}
            <span className={`text-sm font-medium ${
              index.change > 0 ? 'text-success-600' : 'text-danger-600'
            }`}>
              {index.change > 0 ? '+' : ''}{index.change} ({index.change_percent > 0 ? '+' : ''}{index.change_percent}%)
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${
          index.change > 0 ? 'bg-success-100' : 'bg-danger-100'
        }`}>
          <DollarSign className={`w-6 h-6 ${
            index.change > 0 ? 'text-success-600' : 'text-danger-600'
          }`} />
        </div>
      </div>
    </div>
  );

  const StockCard = ({ stock, type }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">{stock.ticker}</h4>
        <p className="text-sm text-gray-600">${parseFloat(stock.price).toFixed(2)}</p>
      </div>
      <div className="text-right">
        <div className={`flex items-center ${
          type === 'gainers' ? 'text-success-600' : 'text-danger-600'
        }`}>
          {type === 'gainers' ? (
            <TrendingUp className="w-4 h-4 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 mr-1" />
          )}
          <span className="text-sm font-medium">
            {stock.change_percentage}
          </span>
        </div>
      </div>
    </div>
  );

  const NewsCard = ({ article }) => (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <Newspaper className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
            {article.title}
          </h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
            {article.summary}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{new Date(article.time_published).toLocaleDateString()}</span>
              <span>•</span>
              <span>{article.source}</span>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 text-sm flex items-center space-x-1"
            >
              <span>Read</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Market Overview</h1>
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
          <h1 className="text-3xl font-bold text-gray-900">Market Overview</h1>
          <p className="text-gray-600 mt-1">
            Real-time market indices and global financial data
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

      {/* Global Market Status */}
      {globalStatus && globalStatus.markets && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Global Market Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {globalStatus.markets.slice(0, 4).map((market, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900">{market.region}</p>
                <p className="text-sm text-gray-600">{market.primary_exchanges}</p>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  market.current_status === 'open' 
                    ? 'bg-success-100 text-success-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-1 ${
                    market.current_status === 'open' ? 'bg-success-400' : 'bg-gray-400'
                  }`}></div>
                  {market.current_status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Indices */}
      {marketData && marketData.indices && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {marketData.indices.map((index) => (
            <MarketIndexCard key={index.symbol} index={index} />
          ))}
        </div>
      )}

      {/* Top Gainers and Losers */}
      {topGainersLosers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-success-600 mr-2" />
              Top Gainers
            </h2>
            <div className="space-y-3">
              {topGainersLosers.top_gainers?.slice(0, 5).map((stock, index) => (
                <StockCard key={index} stock={stock} type="gainers" />
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingDown className="w-5 h-5 text-danger-600 mr-2" />
              Top Losers
            </h2>
            <div className="space-y-3">
              {topGainersLosers.top_losers?.slice(0, 5).map((stock, index) => (
                <StockCard key={index} stock={stock} type="losers" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Market Summary */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <Activity className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Market Status</p>
            <p className="text-lg font-semibold text-gray-900">Active</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-8 h-8 text-success-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Gainers</p>
            <p className="text-lg font-semibold text-gray-900">
              {marketData?.indices?.filter(i => i.change > 0).length || 0}
            </p>
          </div>
          <div className="text-center">
            <TrendingDown className="w-8 h-8 text-danger-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Decliners</p>
            <p className="text-lg font-semibold text-gray-900">
              {marketData?.indices?.filter(i => i.change < 0).length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Market News */}
      {news.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Newspaper className="w-5 h-5 text-primary-600 mr-2" />
            Latest Market News
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.slice(0, 6).map((article, index) => (
              <NewsCard key={index} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketOverview; 