import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
);

// Stock-related API calls
export const searchStocks = async (query) => {
  try {
    const response = await api.get('/stock/search', {
      params: { q: query }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to search stocks');
  }
};

export const fetchStockData = async (symbol, period = '1y') => {
  try {
    const response = await api.get('/stock/data', {
      params: { symbol, period }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch stock data');
  }
};

// Alpha Vantage specific API calls
export const fetchIntradayData = async (symbol, interval = '5min') => {
  try {
    const response = await api.get('/stock/intraday', {
      params: { symbol, interval }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch intraday data');
  }
};

export const fetchDailyData = async (symbol, adjusted = true) => {
  try {
    const response = await api.get('/stock/daily', {
      params: { symbol, adjusted: adjusted.toString() }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch daily data');
  }
};

export const fetchQuote = async (symbol) => {
  try {
    const response = await api.get('/stock/quote', {
      params: { symbol }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch quote');
  }
};

export const fetchCompanyOverview = async (symbol) => {
  try {
    const response = await api.get('/stock/company-overview', {
      params: { symbol }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch company overview');
  }
};

export const fetchEarnings = async (symbol) => {
  try {
    const response = await api.get('/stock/earnings', {
      params: { symbol }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch earnings data');
  }
};

export const fetchTechnicalIndicators = async (symbol, indicator = 'SMA', interval = 'daily', timePeriod = '20', seriesType = 'close') => {
  try {
    const response = await api.get('/stock/technical-indicators', {
      params: { 
        symbol, 
        indicator, 
        interval, 
        time_period: timePeriod,
        series_type: seriesType
      }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch technical indicators');
  }
};

export const fetchNews = async (tickers = '', topics = '', timeFrom = '', timeTo = '', limit = '50') => {
  try {
    const response = await api.get('/market/news', {
      params: { 
        tickers, 
        topics, 
        time_from: timeFrom,
        time_to: timeTo,
        limit
      }
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch news');
  }
};

export const fetchTopGainersLosers = async () => {
  try {
    const response = await api.get('/market/top-gainers-losers');
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch top gainers/losers');
  }
};

export const fetchGlobalMarketStatus = async () => {
  try {
    const response = await api.get('/market/global-status');
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch global market status');
  }
};

export const predictStock = async (symbol, modelType = 'ensemble', daysAhead = 30) => {
  try {
    const response = await api.post('/stock/predict', {
      symbol,
      model_type: modelType,
      days_ahead: daysAhead
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to predict stock');
  }
};

// Market data API calls
export const fetchMarketOverview = async () => {
  try {
    const response = await api.get('/market/overview');
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to fetch market overview');
  }
};

// Model training API calls
export const trainModel = async (symbol, modelType = 'lstm', epochs = 100) => {
  try {
    const response = await api.post('/models/train', {
      symbol,
      model_type: modelType,
      epochs
    });
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to train model');
  }
};

export const getModelsStatus = async () => {
  try {
    const response = await api.get('/models/status');
    return response;
  } catch (error) {
    throw new Error(error.error || 'Failed to get models status');
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response;
  } catch (error) {
    throw new Error(error.error || 'Health check failed');
  }
};

export default api; 