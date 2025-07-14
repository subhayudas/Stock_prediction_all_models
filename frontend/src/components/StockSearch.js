import React, { useState, useEffect } from 'react';
import { Search, Loader2, TrendingUp } from 'lucide-react';
import { searchStocks, fetchStockData } from '../services/api';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';

const StockSearch = ({ onStockSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);

  // Debounced search function
  const debouncedSearch = debounce(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchStocks(searchQuery);
      setResults(data.results || []);
    } catch (error) {
      toast.error('Failed to search stocks');
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      debouncedSearch.cancel();
    };
  }, [query]);

  const handleStockSelect = async (stock) => {
    setSelectedStock(stock);
    setLoadingStock(true);
    setQuery('');
    setResults([]);

    try {
      const stockData = await fetchStockData(stock.symbol, '1y');
      onStockSelect(stockData);
      toast.success(`Loaded data for ${stock.symbol}`);
    } catch (error) {
      toast.error(`Failed to load data for ${stock.symbol}`);
      console.error('Stock data error:', error);
    } finally {
      setLoadingStock(false);
    }
  };

  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
  ];

  const handlePopularStockSelect = async (stock) => {
    await handleStockSelect(stock);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for stocks (e.g., AAPL, Google, Tesla)..."
          className="input pl-10 pr-4"
          disabled={loadingStock}
        />
        {loadingStock && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((stock) => (
            <div
              key={stock.symbol}
              onClick={() => handleStockSelect(stock)}
              className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{stock.symbol}</span>
                    <span className="badge badge-secondary">{stock.type}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{stock.region}</p>
                  <p className="text-xs text-gray-400">{stock.currency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Popular Stocks */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Popular Stocks</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {popularStocks.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => handlePopularStockSelect(stock)}
              disabled={loadingStock}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-primary-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">{stock.symbol}</p>
                  <p className="text-xs text-gray-600 truncate">{stock.name}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Stock Info */}
      {selectedStock && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <div>
              <p className="font-semibold text-primary-900">
                Selected: {selectedStock.symbol}
              </p>
              <p className="text-sm text-primary-700">{selectedStock.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loadingStock && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            <div>
              <p className="font-medium text-gray-900">Loading stock data...</p>
              <p className="text-sm text-gray-600">
                Fetching historical data and preparing charts
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSearch; 