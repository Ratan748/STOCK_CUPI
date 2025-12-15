import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, LogOut, Plus, X, Eye, EyeOff } from 'lucide-react';

const SUPPORTED_STOCKS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'];

const INITIAL_PRICES = {
  GOOG: 140.50,
  TSLA: 242.80,
  AMZN: 178.30,
  META: 485.20,
  NVDA: 495.60
};

// Global state to simulate shared storage across multiple users
const globalState = {
  prices: { ...INITIAL_PRICES },
  users: {},
  listeners: []
};

const StockDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [stockPrices, setStockPrices] = useState(INITIAL_PRICES);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [priceHistory, setPriceHistory] = useState({});
  const [selectedStock, setSelectedStock] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedStock, setExpandedStock] = useState(null);
  const priceUpdateInterval = useRef(null);
  const priceListenInterval = useRef(null);

  // Initialize user data and load from localStorage
  useEffect(() => {
    if (currentUser) {
      try {
        const savedData = localStorage.getItem(`user_${currentUser}`);
        
        if (savedData) {
          const userData = JSON.parse(savedData);
          globalState.users[currentUser] = userData;
          setUserSubscriptions(userData.subscriptions || []);
        } else {
          globalState.users[currentUser] = { email: currentUser, subscriptions: [] };
          setUserSubscriptions([]);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load your saved data. Starting fresh.');
        globalState.users[currentUser] = { email: currentUser, subscriptions: [] };
        setUserSubscriptions([]);
      }
    }
  }, [currentUser]);

  // Update stock prices globally (simulating server updates) - changed to 2 seconds
  useEffect(() => {
    if (!currentUser) return;

    if (priceUpdateInterval.current) {
      clearInterval(priceUpdateInterval.current);
    }

    const shouldUpdate = Object.keys(globalState.users)[0] === currentUser;
    
    if (shouldUpdate) {
      priceUpdateInterval.current = setInterval(() => {
        const newPrices = { ...globalState.prices };
        
        Object.keys(newPrices).forEach(stock => {
          const change = (Math.random() - 0.5) * 5;
          newPrices[stock] = Math.max(10, newPrices[stock] + change);
        });

        globalState.prices = newPrices;
        globalState.listeners.forEach(listener => listener(newPrices));
      }, 2000); // Changed from 1000ms to 2000ms
    }

    return () => {
      if (priceUpdateInterval.current) {
        clearInterval(priceUpdateInterval.current);
      }
    };
  }, [currentUser]);

  // Listen for price updates - changed to 2 seconds
  useEffect(() => {
    if (!currentUser) return;

    const updateLocalPrices = (newPrices) => {
      setStockPrices({ ...newPrices });
      
      setPriceHistory(prev => {
        const newHistory = { ...prev };
        Object.keys(newPrices).forEach(stock => {
          if (!newHistory[stock]) {
            newHistory[stock] = [];
          }
          newHistory[stock] = [
            ...newHistory[stock].slice(-19),
            { time: new Date().toLocaleTimeString(), price: newPrices[stock] }
          ];
        });
        return newHistory;
      });
    };

    globalState.listeners.push(updateLocalPrices);
    updateLocalPrices(globalState.prices);

    priceListenInterval.current = setInterval(() => {
      updateLocalPrices(globalState.prices);
    }, 2000); // Changed from 1000ms to 2000ms

    return () => {
      const index = globalState.listeners.indexOf(updateLocalPrices);
      if (index > -1) {
        globalState.listeners.splice(index, 1);
      }
      if (priceListenInterval.current) {
        clearInterval(priceListenInterval.current);
      }
    };
  }, [currentUser]);

  const handleRegister = () => {
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      const userEmail = email.toLowerCase();
      const existingUser = localStorage.getItem(`auth_${userEmail}`);
      
      if (existingUser) {
        setError('An account with this email already exists. Please login.');
        return;
      }
      
      // Store user credentials
      localStorage.setItem(`auth_${userEmail}`, JSON.stringify({ email: userEmail, password }));
      
      setSuccess('Account created successfully! Please login.');
      setTimeout(() => {
        setIsRegistering(false);
        setSuccess('');
        setPassword('');
      }, 2000);
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', err);
    }
  };

  const handleLogin = () => {
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    try {
      const userEmail = email.toLowerCase();
      const savedAuth = localStorage.getItem(`auth_${userEmail}`);
      
      if (!savedAuth) {
        setError('No account found with this email. Please register first.');
        return;
      }
      
      const authData = JSON.parse(savedAuth);
      
      if (authData.password !== password) {
        setError('Incorrect password. Please try again.');
        return;
      }
      
      setCurrentUser(userEmail);
      setSuccess('Login successful!');
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    }
  };

  const handleLogout = () => {
    if (currentUser && globalState.users[currentUser]) {
      delete globalState.users[currentUser];
    }
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setUserSubscriptions([]);
    setPriceHistory({});
  };

  const handleSubscribe = () => {
    setError('');
    setSuccess('');
    
    if (!selectedStock) {
      setError('Please select a stock to subscribe');
      return;
    }
    
    if (userSubscriptions.includes(selectedStock)) {
      setError('You are already subscribed to this stock');
      return;
    }
    
    try {
      const newSubscriptions = [...userSubscriptions, selectedStock];
      setUserSubscriptions(newSubscriptions);
      
      if (globalState.users[currentUser]) {
        globalState.users[currentUser].subscriptions = newSubscriptions;
        localStorage.setItem(`user_${currentUser}`, JSON.stringify(globalState.users[currentUser]));
      }
      
      setSelectedStock('');
      setSuccess(`Successfully subscribed to ${selectedStock}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
      console.error('Subscribe error:', err);
    }
  };

  const handleUnsubscribe = (stock) => {
    setError('');
    setSuccess('');
    
    try {
      const newSubscriptions = userSubscriptions.filter(s => s !== stock);
      setUserSubscriptions(newSubscriptions);
      
      if (globalState.users[currentUser]) {
        globalState.users[currentUser].subscriptions = newSubscriptions;
        localStorage.setItem(`user_${currentUser}`, JSON.stringify(globalState.users[currentUser]));
      }
      
      setSuccess(`Unsubscribed from ${stock}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to unsubscribe. Please try again.');
      console.error('Unsubscribe error:', err);
    }
  };

  const getPriceChange = (stock) => {
    const history = priceHistory[stock] || [];
    if (history.length < 2) return 0;
    return stockPrices[stock] - history[0].price;
  };

  const getPercentChange = (stock) => {
    const history = priceHistory[stock] || [];
    if (history.length < 2) return 0;
    return ((stockPrices[stock] - history[0].price) / history[0].price) * 100;
  };

  // Login/Register Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block bg-emerald-600 rounded-full p-4 mb-4">
              <TrendingUp className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">StockBroker Pro</h1>
            <p className="text-gray-600">Real-time stock tracking dashboard</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && (isRegistering ? handleRegister() : handleLogin())}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && (isRegistering ? handleRegister() : handleLogin())}
                  placeholder={isRegistering ? "At least 6 characters" : "Enter your password"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}
            
            <button
              onClick={isRegistering ? handleRegister : handleLogin}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              {isRegistering ? 'Register' : 'Login'}
            </button>
            
            <div className="text-center">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setSuccess('');
                }}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-600 rounded-lg p-2">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">StockBroker Pro</h1>
                <p className="text-sm text-gray-600">{currentUser}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Subscribe Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscribe to Stocks</h2>
          <div className="flex gap-3">
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select a stock...</option>
              {SUPPORTED_STOCKS.filter(s => !userSubscriptions.includes(s)).map(stock => (
                <option key={stock} value={stock}>{stock}</option>
              ))}
            </select>
            <button
              onClick={handleSubscribe}
              disabled={!selectedStock}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Subscribe</span>
            </button>
          </div>
        </div>

        {/* Stock Cards */}
        {userSubscriptions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Subscriptions Yet</h3>
            <p className="text-gray-600">Subscribe to stocks above to start tracking prices</p>
          </div>
        ) : expandedStock ? (
          // Expanded View
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900">{expandedStock}</h2>
                  <p className="text-5xl font-bold text-gray-900 mt-4">
                    ₹{stockPrices[expandedStock].toFixed(2)}
                  </p>
                  <div className={`flex items-center mt-3 ${getPriceChange(expandedStock) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {getPriceChange(expandedStock) >= 0 ? <TrendingUp className="w-6 h-6 mr-2" /> : <TrendingDown className="w-6 h-6 mr-2" />}
                    <span className="font-semibold text-2xl">
                      {getPriceChange(expandedStock) >= 0 ? '+' : ''}{getPriceChange(expandedStock).toFixed(2)} ({getPercentChange(expandedStock).toFixed(2)}%)
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => setExpandedStock(null)}
                  className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {priceHistory[expandedStock] && priceHistory[expandedStock].length > 1 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Price History</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={priceHistory[expandedStock]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        domain={['dataMin - 5', 'dataMax + 5']}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke={getPriceChange(expandedStock) >= 0 ? "#10b981" : "#ef4444"}
                        strokeWidth={4}
                        dot={{ fill: getPriceChange(expandedStock) >= 0 ? "#10b981" : "#ef4444", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Current Price</p>
                      <p className="text-2xl font-bold text-gray-900">₹{stockPrices[expandedStock].toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Starting Price</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{priceHistory[expandedStock][0]?.price.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Change</p>
                      <p className={`text-2xl font-bold ${getPriceChange(expandedStock) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {getPriceChange(expandedStock) >= 0 ? '+' : ''}₹{getPriceChange(expandedStock).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setExpandedStock(null)}
                className="mt-8 w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {userSubscriptions.map(stock => {
              const price = stockPrices[stock];
              const change = getPriceChange(stock);
              const percentChange = getPercentChange(stock);
              const isPositive = change >= 0;
              const history = priceHistory[stock] || [];

              return (
                <div key={stock} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow">
                  <div className="p-6" onClick={() => setExpandedStock(stock)}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{stock}</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          ₹{price.toFixed(2)}
                        </p>
                        <div className={`flex items-center mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                          <span className="font-semibold">
                            {isPositive ? '+' : ''}₹{change.toFixed(2)} ({percentChange.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsubscribe(stock);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {history.length > 1 && (
                      <div className="mt-4">
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="time" 
                              tick={{ fontSize: 10, fill: '#6b7280' }}
                              interval="preserveStartEnd"
                            />
                            <YAxis 
                              domain={['dataMin - 5', 'dataMax + 5']}
                              tick={{ fontSize: 10, fill: '#6b7280' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#ffffff', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                              }}
                              formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="price" 
                              stroke={isPositive ? "#10b981" : "#ef4444"}
                              strokeWidth={3}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    
                    <div className="mt-4 text-center">
                      <span className="text-sm text-emerald-600 font-medium">Click to expand →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StockDashboard;