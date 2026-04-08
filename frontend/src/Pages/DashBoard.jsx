import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { stockAPI, mlAPI } from '../services/api';
import { toast } from 'react-toastify';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const POPULAR_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
const TIMEFRAMES = [
    { label: '1D', value: '1d' },
    { label: '1W', value: '5d' },
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
];

const DashBoard = () => {
    const { user, logout } = useAuth();
    const [searchSymbol, setSearchSymbol] = useState('');
    const [stockData, setStockData] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [savedStocks, setSavedStocks] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    
    // New features
    const [chartData, setChartData] = useState([]);
    const [timeframe, setTimeframe] = useState('3mo');
    const [indicators, setIndicators] = useState(null);
    const [news, setNews] = useState([]);
    const [compareMode, setCompareMode] = useState(false);
    const [compareStocks, setCompareStocks] = useState([]);
    const [compareResults, setCompareResults] = useState(null);
    const [searchSuggestions, setSearchSuggestions] = useState({});
    const [showSearch, setShowSearch] = useState(false);
    const [trainingModal, setTrainingModal] = useState(false);
    const [activeBtn, setActiveBtn] = useState(null);

    useEffect(() => {
        fetchSavedStocks();
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        setSearchHistory(history);
    }, []);

    useEffect(() => {
        if (stockData?.symbol && !stockData.isComparison) {
            fetchChartData(stockData.symbol);
            fetchIndicators(stockData.symbol);
            fetchNews(stockData.symbol);
        }
    }, [stockData?.symbol, timeframe]);

    const fetchSavedStocks = async () => {
        try {
            const response = await stockAPI.getAll();
            setSavedStocks(response.data);
        } catch (error) {
            console.error('Failed to fetch stocks:', error);
        }
    };

    const fetchChartData = async (symbol) => {
        try {
            const response = await mlAPI.getHistory(symbol, timeframe);
            const formattedData = response.data.data.map(item => ({
                date: new Date(item.date).toLocaleDateString(),
                fullDate: item.date,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume
            }));
            setChartData(formattedData);
        } catch (error) {
            console.error('Failed to fetch chart data:', error);
        }
    };

    const fetchIndicators = async (symbol) => {
        try {
            const response = await mlAPI.getIndicators(symbol);
            setIndicators(response.data.indicators);
        } catch (error) {
            console.error('Failed to fetch indicators:', error);
        }
    };

    const fetchNews = async (symbol) => {
        try {
            const response = await mlAPI.getNews(symbol);
            setNews(response.data.news || []);
        } catch (error) {
            console.error('Failed to fetch news:', error);
            setNews([]);
        }
    };

    const searchStocks = async (query) => {
        if (query.length < 1) {
            setSearchSuggestions({});
            return;
        }
        try {
            const response = await mlAPI.search(query);
            setSearchSuggestions(response.data);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const addToHistory = (symbol) => {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        if (!history.includes(symbol)) {
            const newHistory = [symbol, ...history.slice(0, 9)];
            localStorage.setItem('searchHistory', JSON.stringify(newHistory));
            setSearchHistory(newHistory);
        }
    };

    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!searchSymbol.trim()) return;
        
        setLoading(true);
        setLoadingMessage('Fetching stock data...');
        setPrediction(null);
        setCompareResults(null);
        try {
            const symbol = searchSymbol.toUpperCase();
            const response = await mlAPI.getRealtime(symbol);
            setStockData({
                symbol: response.data.symbol,
                companyName: response.data.companyName,
                openPrice: response.data.openPrice,
                closePrice: response.data.currentPrice,
                highPrice: response.data.highPrice,
                lowPrice: response.data.lowPrice,
                volume: response.data.volume,
                marketCap: response.data.marketCap,
                previousClose: response.data.previousClose,
                fiftyTwoWeekHigh: response.data.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: response.data.fiftyTwoWeekLow,
                targetMeanPrice: response.data.targetMeanPrice,
                recommendation: response.data.recommendationKey
            });
            addToHistory(symbol);
            setShowSearch(false);
            toast.success(`Found ${symbol}`);
        } catch (error) {
            toast.error('Stock not found! Check symbol and try again.');
            setStockData(null);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handleQuickSearch = async (symbol) => {
        setSearchSymbol(symbol);
        setLoading(true);
        setLoadingMessage('Fetching stock data...');
        setPrediction(null);
        setCompareResults(null);
        try {
            const response = await mlAPI.getRealtime(symbol);
            setStockData({
                symbol: response.data.symbol,
                companyName: response.data.companyName,
                openPrice: response.data.openPrice,
                closePrice: response.data.currentPrice,
                highPrice: response.data.highPrice,
                lowPrice: response.data.lowPrice,
                volume: response.data.volume,
                marketCap: response.data.marketCap,
                previousClose: response.data.previousClose,
                fiftyTwoWeekHigh: response.data.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: response.data.fiftyTwoWeekLow
            });
            addToHistory(symbol);
        } catch (error) {
            toast.error(`${symbol} not found!`);
            setStockData(null);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handlePredict = async () => {
        if (!searchSymbol.trim() && !stockData?.symbol) {
            toast.error('Search for a stock first!');
            return;
        }
        
        const symbol = searchSymbol.trim().toUpperCase() || stockData?.symbol;
        setLoading(true);
        setLoadingMessage('Checking for model...');
        
        try {
            const statusRes = await mlAPI.getTrainStatus(symbol);
            if (statusRes.data.status === 'training') {
                setTrainingModal(true);
                setLoading(false);
                return;
            }
            
            setLoadingMessage('Generating prediction...');
            const response = await mlAPI.getPrediction(symbol, true);
            
            if (response.data.method === 'moving_average') {
                setLoadingMessage('Using simple prediction method');
                await new Promise(r => setTimeout(r, 1000));
            }
            
            setPrediction({
                price: response.data.predictedPrice,
                method: response.data.method
            });
            toast.success(`AI Prediction: $${response.data.predictedPrice}`);
        } catch (error) {
            if (error.response?.data?.message?.includes('training')) {
                setTrainingModal(true);
            } else {
                toast.error('Prediction failed!');
                setPrediction(null);
            }
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handleCompare = async () => {
        if (compareStocks.length < 2) {
            toast.error('Add at least 2 stocks to compare');
            return;
        }
        setLoading(true);
        setLoadingMessage('Comparing stocks...');
        setCompareResults(null);
        try {
            const response = await mlAPI.compare(compareStocks);
            setCompareResults(response.data.comparison);
            toast.success('Comparison loaded!');
        } catch (error) {
            toast.error('Comparison failed!');
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const addToCompare = (symbol) => {
        if (compareStocks.length >= 4) {
            toast.error('Maximum 4 stocks for comparison');
            return;
        }
        if (!compareStocks.includes(symbol)) {
            setCompareStocks([...compareStocks, symbol]);
        }
    };

    const removeFromCompare = (symbol) => {
        setCompareStocks(compareStocks.filter(s => s !== symbol));
    };

    const handleSaveStock = async () => {
        if (!stockData || stockData.isComparison) return;
        
        try {
            await stockAPI.save({
                symbol: stockData.symbol,
                companyName: stockData.companyName,
                openPrice: stockData.openPrice,
                closePrice: stockData.closePrice,
                highPrice: stockData.highPrice,
                lowPrice: stockData.lowPrice,
                volume: stockData.volume
            });
            toast.success('Stock saved to your portfolio!');
            fetchSavedStocks();
        } catch (error) {
            toast.error('Failed to save stock');
        }
    };

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully!');
    };

    const formatNumber = (num) => {
        if (!num) return 'N/A';
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return num.toLocaleString();
    };

    const getRSIColor = (rsi) => {
        if (rsi >= 70) return '#ff4757';
        if (rsi <= 30) return '#00ff88';
        return '#ffa502';
    };

    const getRSISignal = (rsi) => {
        if (rsi >= 70) return 'Overbought - SELL';
        if (rsi <= 30) return 'Oversold - BUY';
        return 'Neutral - HOLD';
    };

    return (
        <div style={{
            ...styles.container, 
            opacity: (loading || trainingModal) ? 0.7 : 1, 
            pointerEvents: (loading || trainingModal) ? 'none' : 'auto',
            position: 'relative'
        }}>
            {loading && (
                <div style={styles.loadingOverlay}>
                    <div style={styles.loadingBox}>
                        <div style={styles.spinner}></div>
                        <p style={styles.loadingText}>{loadingMessage || 'Loading...'}</p>
                    </div>
                </div>
            )}

            {trainingModal && (
                <div style={styles.trainingModalOverlay}>
                    <div style={styles.trainingModalBox}>
                        <div style={styles.trainingSpinner}></div>
                        <h2 style={styles.trainingTitle}>🤖 Model Training in Progress</h2>
                        <p style={styles.trainingText}>
                            The prediction model for this stock is currently being trained. 
                            This may take a few minutes. Please wait...
                        </p>
                        <p style={styles.trainingSubtext}>
                            You can continue using other features or logout.
                        </p>
                        <button 
                            onClick={() => setTrainingModal(false)}
                            style={styles.trainingCloseBtn}
                        >
                            OK, I'll Wait
                        </button>
                    </div>
                </div>
            )}

            <header style={styles.header}>
                <h1 style={styles.title}>📈 StockSense AI</h1>
                <div style={styles.headerActions}>
                    <button 
                        onClick={() => setCompareMode(!compareMode)} 
                        style={{
                            ...styles.compareModeBtn, 
                            backgroundColor: compareMode ? '#00d4ff' : '#1a1a2e', 
                            transform: compareMode ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: compareMode ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'none'
                        }}
                    >
                        {compareMode ? '🏠 Home' : '⚖️ Compare'}
                    </button>
                    <span style={styles.welcome}>Welcome, {user?.name || 'User'}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
                </div>
            </header>

            <main style={styles.main}>
                {!compareMode ? (
                    <>
                        <div style={styles.searchSection}>
                            <h2 style={styles.heading}>Stock Market Search</h2>
                            <form onSubmit={handleSearch} style={styles.searchForm}>
                                <div style={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        value={searchSymbol}
                                        onChange={(e) => {
                                            setSearchSymbol(e.target.value.toUpperCase());
                                            searchStocks(e.target.value);
                                            setShowSearch(true);
                                        }}
                                        placeholder="Enter stock symbol"
                                        style={styles.searchInput}
                                        onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                                    />
                                    {showSearch && Object.keys(searchSuggestions).length > 0 && (
                                        <div style={styles.suggestions}>
                                            {Object.entries(searchSuggestions).slice(0, 6).map(([sym, name]) => (
                                                <div 
                                                    key={sym} 
                                                    onClick={() => { setSearchSymbol(sym); handleQuickSearch(sym); }}
                                                    style={styles.suggestionItem}
                                                >
                                                    <strong>{sym}</strong> - {name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    type="submit" 
                                    style={{
                                        ...styles.searchBtn,
                                        transform: activeBtn === 'search' ? 'scale(0.95)' : 'scale(0.98)',
                                        boxShadow: activeBtn === 'search' ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,212,255,0.3)',
                                        backgroundColor: activeBtn === 'search' ? '#00a0cc' : '#00d4ff'
                                    }}
                                    disabled={loading}
                                    onMouseDown={() => setActiveBtn('search')}
                                    onMouseUp={() => setActiveBtn(null)}
                                    onMouseLeave={() => setActiveBtn(null)}
                                >
                                    {loading ? <span style={styles.btnSpinner}></span> : '🔍'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handlePredict} 
                                    style={{
                                        ...styles.predictBtn,
                                        transform: activeBtn === 'predict' ? 'scale(0.95)' : 'scale(0.98)',
                                        boxShadow: activeBtn === 'predict' ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,255,136,0.3)',
                                        backgroundColor: activeBtn === 'predict' ? '#00cc6a' : '#00ff88'
                                    }}
                                    disabled={loading}
                                    onMouseDown={() => setActiveBtn('predict')}
                                    onMouseUp={() => setActiveBtn(null)}
                                    onMouseLeave={() => setActiveBtn(null)}
                                >
                                    {loading ? <><span style={styles.btnSpinner}></span> Predict</> : '🤖 Predict'}
                                </button>
                            </form>
                        </div>

                        <div style={styles.quickSearch}>
                            <span style={styles.quickLabel}>Quick Search:</span>
                            <div style={styles.quickButtons}>
                                {POPULAR_STOCKS.map((stock) => (
                                    <button
                                        key={stock}
                                        onClick={() => handleQuickSearch(stock)}
                                        style={{
                                            ...styles.quickBtn,
                                            backgroundColor: stockData?.symbol === stock ? '#00d4ff' : '#1a1a2e',
                                            transform: activeBtn === stock ? 'scale(0.95)' : 'scale(1)',
                                            boxShadow: activeBtn === stock ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : '0 0 0',
                                            transition: 'all 0.15s'
                                        }}
                                        disabled={loading}
                                        onMouseDown={() => setActiveBtn(stock)}
                                        onMouseUp={() => setActiveBtn(null)}
                                        onMouseLeave={() => setActiveBtn(null)}
                                    >
                                        {loading && stockData?.symbol === stock ? <span style={styles.btnSpinnerSmall}></span> : stock}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {stockData && !stockData.isComparison && (
                            <>
                                <div style={styles.stockCard}>
                                    <div style={styles.stockHeader}>
                                        <div>
                                            <h3 style={styles.stockSymbol}>{stockData.symbol}</h3>
                                            <span style={styles.stockName}>{stockData.companyName}</span>
                                        </div>
                                        {stockData.recommendation && (
                                            <span style={styles.recommendation}>
                                                {stockData.recommendation === 'buy' && '🟢 BUY'}
                                                {stockData.recommendation === 'hold' && '🟡 HOLD'}
                                                {stockData.recommendation === 'sell' && '🔴 SELL'}
                                                {stockData.recommendation === 'strongBuy' && '🟢🟢 STRONG BUY'}
                                                {stockData.recommendation === 'strongSell' && '🔴🔴 STRONG SELL'}
                                                {stockData.recommendation === 'none' && '⚪ NEUTRAL'}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div style={styles.currentPrice}>
                                        <span style={styles.priceLabel}>Current Price</span>
                                        <span style={styles.mainPrice}>${stockData.closePrice?.toFixed(2) || 'N/A'}</span>
                                    </div>

                                    <div style={styles.priceGrid}>
                                        <div style={styles.priceBox}><span>Open</span><span>${stockData.openPrice?.toFixed(2)}</span></div>
                                        <div style={styles.priceBox}><span>High</span><span style={{color:'#00ff88'}}>${stockData.highPrice?.toFixed(2)}</span></div>
                                        <div style={styles.priceBox}><span>Low</span><span style={{color:'#ff4757'}}>${stockData.lowPrice?.toFixed(2)}</span></div>
                                        <div style={styles.priceBox}><span>Volume</span><span>{(stockData.volume/1e6)?.toFixed(2)}M</span></div>
                                    </div>

                                    <div style={styles.statsRow}>
                                        <div style={styles.stat}><span>52W High</span><span style={{color:'#00ff88'}}>${stockData.fiftyTwoWeekHigh?.toFixed(2)}</span></div>
                                        <div style={styles.stat}><span>52W Low</span><span style={{color:'#ff4757'}}>${stockData.fiftyTwoWeekLow?.toFixed(2)}</span></div>
                                        <div style={styles.stat}><span>Market Cap</span><span>{formatNumber(stockData.marketCap)}</span></div>
                                    </div>

                                    {prediction && (
                                        <div style={styles.predictionBox}>
                                            <span>🤖 AI Prediction: </span>
                                            <span style={styles.predictionValue}>${prediction.price}</span>
                                            <span style={styles.methodBadge}>{prediction.method === 'lstm' ? '🎯 LSTM Model' : '📊 Moving Avg'}</span>
                                        </div>
                                    )}

                                    <div style={styles.actionButtons}>
                                        <button 
                                            onClick={handleSaveStock} 
                                            style={{...styles.saveBtn, transform: 'scale(0.98)'}}
                                            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                                            onMouseUp={(e) => e.target.style.transform = 'scale(0.98)'}
                                        >
                                            💾 Save
                                        </button>
                                        <button 
                                            onClick={() => addToCompare(stockData.symbol)} 
                                            style={{...styles.compareBtn, transform: 'scale(0.98)'}}
                                            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                                            onMouseUp={(e) => e.target.style.transform = 'scale(0.98)'}
                                        >
                                            ⚖️ Compare
                                        </button>
                                        <button 
                                            onClick={handlePredict} 
                                            style={{...styles.predictActionBtn, transform: 'scale(0.98)'}}
                                            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                                            onMouseUp={(e) => e.target.style.transform = 'scale(0.98)'}
                                        >
                                            🔮 Predict
                                        </button>
                                    </div>
                                </div>

                                <div style={styles.timeframeSelector}>
                                    {TIMEFRAMES.map((tf) => (
                                        <button
                                            key={tf.value}
                                            onClick={() => setTimeframe(tf.value)}
                                            style={{
                                                ...styles.tfBtn,
                                                backgroundColor: timeframe === tf.value ? '#00d4ff' : '#1a1a2e',
                                                transform: timeframe === tf.value ? 'scale(1.1)' : 'scale(1)'
                                            }}
                                        >
                                            {tf.label}
                                        </button>
                                    ))}
                                </div>

                                {chartData.length > 0 && (
                                    <div style={styles.chartCard}>
                                        <h3 style={styles.chartTitle}>📊 Price History</h3>
                                        <div style={styles.chartContainer}>
                                            <ResponsiveContainer width="100%" height={350}>
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                                    <XAxis dataKey="date" stroke="#aaa" tick={{fontSize: 10}} />
                                                    <YAxis stroke="#aaa" domain={['auto', 'auto']} tick={{fontSize: 10}} />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #00d4ff' }}
                                                        labelStyle={{ color: '#00d4ff' }}
                                                    />
                                                    <Area type="monotone" dataKey="close" stroke="#00d4ff" fillOpacity={1} fill="url(#colorPrice)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {indicators && (
                                    <div style={styles.indicatorsCard}>
                                        <h3 style={styles.indicatorsTitle}>📈 Technical Indicators</h3>
                                        
                                        <div style={styles.indicatorExplain}>
                                            <p><strong>RSI:</strong> Measures if stock is overbought {'>'}70 or oversold {'<'}30</p>
                                            <p><strong>MACD:</strong> Shows trend direction - above 0 = bullish</p>
                                            <p><strong>Bollinger:</strong> Price channels - near edges = potential reversal</p>
                                        </div>

                                        <div style={styles.indicatorsGrid}>
                                            <div style={styles.indicatorBox}>
                                                <span style={styles.indicatorTitle}>RSI (14)</span>
                                                <span style={{color: getRSIColor(indicators.rsi), fontSize: '28px', fontWeight: 'bold'}}>
                                                    {indicators.rsi || 'N/A'}
                                                </span>
                                                <span style={{color: getRSIColor(indicators.rsi), fontSize: '12px'}}>
                                                    {getRSISignal(indicators.rsi)}
                                                </span>
                                            </div>
                                            <div style={styles.indicatorBox}>
                                                <span style={styles.indicatorTitle}>MACD</span>
                                                <span style={{color: indicators?.macd?.macd >= 0 ? '#00ff88' : '#ff4757', fontSize: '28px', fontWeight: 'bold'}}>
                                                    {indicators.macd?.macd || 'N/A'}
                                                </span>
                                                <span style={{color: '#aaa', fontSize: '12px'}}>
                                                    Signal: {indicators.macd?.signal}
                                                </span>
                                            </div>
                                            <div style={styles.indicatorBox}>
                                                <span style={styles.indicatorTitle}>Bollinger Bands</span>
                                                <span style={{color: '#00d4ff', fontSize: '20px', fontWeight: 'bold'}}>
                                                    Upper: ${indicators.bollinger?.upper}
                                                </span>
                                                <span style={{color: '#aaa', fontSize: '14px'}}>
                                                    Middle: ${indicators.bollinger?.middle}
                                                </span>
                                                <span style={{color: '#ff4757', fontSize: '20px', fontWeight: 'bold'}}>
                                                    Lower: ${indicators.bollinger?.lower}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {news.length > 0 && (
                                    <div style={styles.newsCard}>
                                        <h3 style={styles.newsTitle}>📰 Latest News</h3>
                                        <div style={styles.newsList}>
                                            {news.slice(0, 5).map((item, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={item.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={styles.newsItem}
                                                >
                                                    <span style={styles.newsPublisher}>{item.publisher}</span>
                                                    <p style={styles.newsHeadline}>{item.title}</p>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {compareResults && (
                            <div style={styles.compareResults}>
                                <h3 style={styles.compareTitle}>⚖️ Stock Comparison Results</h3>
                                <div style={styles.compareTable}>
                                    <div style={styles.compareRowHeader}>
                                        <span style={styles.compareCell}>Symbol</span>
                                        <span style={styles.compareCell}>Name</span>
                                        <span style={styles.compareCell}>Price</span>
                                        <span style={styles.compareCell}>Change</span>
                                        <span style={styles.compareCell}>Change %</span>
                                        <span style={styles.compareCell}>Volume</span>
                                    </div>
                                    {compareResults.map((stock, idx) => (
                                        <div key={idx} style={styles.compareRow}>
                                            <span style={{...styles.compareCell, color: '#00d4ff', fontWeight: 'bold'}}>{stock.symbol}</span>
                                            <span style={styles.compareCell}>{stock.name}</span>
                                            <span style={styles.compareCell}>${stock.price?.toFixed(2)}</span>
                                            <span style={{...styles.compareCell, color: stock.change >= 0 ? '#00ff88' : '#ff4757'}}>
                                                {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)}
                                            </span>
                                            <span style={{...styles.compareCell, color: stock.changePercent >= 0 ? '#00ff88' : '#ff4757'}}>
                                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                                            </span>
                                            <span style={styles.compareCell}>{(stock.volume / 1e6)?.toFixed(2)}M</span>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setCompareResults(null)} 
                                    style={styles.clearCompareBtn}
                                >
                                    Clear Results
                                </button>
                            </div>
                        )}

                        {savedStocks.length > 0 && (
                            <div style={styles.savedSection}>
                                <h3 style={styles.subHeading}>📊 Your Portfolio</h3>
                                <div style={styles.stocksGrid}>
                                    {savedStocks.map((stock) => (
                                        <div 
                                            key={stock.id} 
                                            style={styles.savedStockCard}
                                            onClick={() => handleQuickSearch(stock.symbol)}
                                        >
                                            <h4 style={styles.savedSymbol}>{stock.symbol}</h4>
                                            <p style={styles.savedName}>{stock.companyName || 'N/A'}</p>
                                            <p style={styles.savedPrice}>
                                                ${stock.closePrice?.toFixed(2) || stock.currentPrice?.toFixed(2) || 'N/A'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!stockData && !compareResults && savedStocks.length === 0 && (
                            <div style={styles.emptyState}>
                                <h3>🎯 Getting Started</h3>
                                <p>Search for any stock symbol to get real-time data, charts, predictions, and more!</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={styles.compareSection}>
                        <h3>⚖️ Stock Comparison</h3>
                        <div style={styles.compareInput}>
                            <input
                                type="text"
                                value={searchSymbol}
                                onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                                placeholder="Add stock to compare"
                                style={styles.searchInput}
                            />
                            <button 
                                onClick={() => { addToCompare(searchSymbol.toUpperCase()); setSearchSymbol(''); }} 
                                style={{...styles.addBtn, transform: 'scale(0.98)'}}
                            >
                                + Add
                            </button>
                        </div>
                        <div style={styles.compareTags}>
                            {compareStocks.map((sym) => (
                                <span key={sym} style={styles.compareTag}>
                                    {sym}
                                    <button onClick={() => removeFromCompare(sym)} style={styles.removeTag}>×</button>
                                </span>
                            ))}
                        </div>
                        {compareStocks.length >= 2 && (
                            <button 
                                onClick={handleCompare} 
                                style={{...styles.compareGoBtn, transform: 'scale(1)'}}
                                disabled={loading}
                            >
                                {loading ? '⏳ Comparing...' : '⚖️ Compare Now'}
                            </button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#0a0a1a', fontFamily: 'Arial, sans-serif', transition: 'all 0.3s' },
    loadingOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    loadingBox: { backgroundColor: '#1a1a2e', padding: '40px 60px', borderRadius: '16px', textAlign: 'center', border: '2px solid #00d4ff' },
    spinner: { width: '50px', height: '50px', border: '4px solid #333', borderTop: '4px solid #00d4ff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' },
    loadingText: { color: '#00d4ff', fontSize: '18px', fontWeight: 'bold' },
    btnSpinner: { display: 'inline-block', width: '16px', height: '16px', border: '2px solid #333', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '8px' },
    btnSpinnerSmall: { display: 'inline-block', width: '14px', height: '14px', border: '2px solid #333', borderTop: '2px solid #00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: '#1a1a2e', borderBottom: '1px solid #00d4ff33' },
    title: { color: '#00d4ff', margin: 0, fontSize: '24px' },
    headerActions: { display: 'flex', alignItems: 'center', gap: '20px' },
    compareModeBtn: { 
        padding: '8px 16px', 
        color: '#00d4ff', 
        border: '1px solid #00d4ff', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(0,212,255,0.2)'
    },
    compareModeBtnActive: {
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
    },
    welcome: { color: '#ffffff', fontSize: '16px' },
    logoutBtn: { padding: '10px 20px', backgroundColor: '#ff4757', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' },
    main: { padding: '30px', maxWidth: '1400px', margin: '0 auto' },
    searchSection: { marginBottom: '20px' },
    heading: { color: '#fff', fontSize: '28px', marginBottom: '10px', textAlign: 'center' },
    searchForm: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' },
    inputWrapper: { position: 'relative' },
    searchInput: { padding: '14px 20px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a2e', color: '#fff', fontSize: '16px', width: '300px', outline: 'none', transition: 'border-color 0.2s' },
    suggestions: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflow: 'auto' },
    suggestionItem: { padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #333', transition: 'background 0.2s' },
    searchBtn: { padding: '14px 24px', backgroundColor: '#00d4ff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' },
    predictBtn: { padding: '14px 24px', backgroundColor: '#00ff88', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' },
    quickSearch: { marginBottom: '30px', textAlign: 'center' },
    quickLabel: { color: '#aaa', marginRight: '15px' },
    quickButtons: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' },
    quickBtn: { padding: '8px 16px', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s' },
    stockCard: { backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '25px', marginBottom: '25px', border: '1px solid #00d4ff33' },
    stockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
    stockSymbol: { color: '#00d4ff', fontSize: '36px', margin: 0 },
    stockName: { color: '#aaa', fontSize: '18px' },
    recommendation: { padding: '6px 12px', backgroundColor: '#2a2a4e', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' },
    currentPrice: { textAlign: 'center', marginBottom: '20px', padding: '20px', backgroundColor: '#0f0f2e', borderRadius: '12px' },
    priceLabel: { display: 'block', color: '#aaa', fontSize: '14px' },
    mainPrice: { color: '#00d4ff', fontSize: '48px', fontWeight: 'bold' },
    priceGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '15px' },
    priceBox: { textAlign: 'center', padding: '15px', backgroundColor: '#0f0f2e', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '5px' },
    statsRow: { display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' },
    stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', fontSize: '14px', color: '#aaa' },
    predictionBox: { padding: '15px', backgroundColor: '#00ff8820', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' },
    predictionValue: { color: '#00ff88', fontSize: '28px', fontWeight: 'bold' },
    methodBadge: { padding: '4px 8px', backgroundColor: '#00ff88', color: '#000', borderRadius: '4px', fontSize: '12px' },
    actionButtons: { display: 'flex', gap: '15px', justifyContent: 'center' },
    saveBtn: { 
        padding: '12px 24px', 
        backgroundColor: '#00d4ff', 
        color: '#000', 
        border: 'none', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        transition: 'all 0.15s',
        boxShadow: '0 2px 8px rgba(0,212,255,0.3)'
    },
    compareBtn: { 
        padding: '12px 24px', 
        backgroundColor: '#ffa502', 
        color: '#000', 
        border: 'none', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        transition: 'all 0.15s',
        boxShadow: '0 2px 8px rgba(255,165,2,0.3)'
    },
    predictActionBtn: { 
        padding: '12px 24px', 
        backgroundColor: '#00ff88', 
        color: '#000', 
        border: 'none', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        transition: 'all 0.15s',
        boxShadow: '0 2px 8px rgba(0,255,136,0.3)'
    },
    timeframeSelector: { display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' },
    tfBtn: { padding: '8px 16px', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', color: '#00d4ff', transition: 'all 0.2s' },
    chartCard: { backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '25px', marginBottom: '25px', border: '1px solid #00d4ff33' },
    chartTitle: { color: '#fff', fontSize: '20px', marginBottom: '20px' },
    chartContainer: { width: '100%', height: '350px' },
    indicatorsCard: { backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '25px', marginBottom: '25px', border: '1px solid #00d4ff33' },
    indicatorsTitle: { color: '#fff', fontSize: '20px', marginBottom: '10px' },
    indicatorExplain: { backgroundColor: '#0f0f2e', padding: '15px', borderRadius: '8px', marginBottom: '20px' },
    indicatorsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
    indicatorBox: { padding: '20px', backgroundColor: '#0f0f2e', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '5px' },
    indicatorTitle: { color: '#aaa', fontSize: '14px', fontWeight: 'bold' },
    newsCard: { backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '25px', marginBottom: '25px', border: '1px solid #00d4ff33' },
    newsTitle: { color: '#fff', fontSize: '20px', marginBottom: '20px' },
    newsList: { display: 'flex', flexDirection: 'column', gap: '15px' },
    newsItem: { padding: '15px', backgroundColor: '#0f0f2e', borderRadius: '8px', textDecoration: 'none', display: 'block', transition: 'background 0.2s' },
    newsPublisher: { color: '#00d4ff', fontSize: '12px' },
    newsHeadline: { color: '#fff', margin: '5px 0 0 0', fontSize: '14px' },
    compareSection: { backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '30px', marginBottom: '25px', border: '1px solid #333' },
    compareInput: { display: 'flex', gap: '10px', marginBottom: '20px' },
    addBtn: { 
        padding: '12px 24px', 
        backgroundColor: '#00d4ff', 
        color: '#000', 
        border: 'none', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        transition: 'all 0.15s',
        boxShadow: '0 2px 8px rgba(0,212,255,0.3)'
    },
    compareTags: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' },
    compareTag: { padding: '8px 16px', backgroundColor: '#0f0f2e', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
    removeBtn: { background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: '18px' },
    compareGoBtn: { padding: '14px 28px', backgroundColor: '#ffa502', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'all 0.2s' },
    compareResults: { backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '25px', marginBottom: '25px', border: '1px solid #00d4ff' },
    compareTitle: { color: '#fff', fontSize: '22px', marginBottom: '20px' },
    compareTable: { overflowX: 'auto' },
    compareRowHeader: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', padding: '15px', backgroundColor: '#0f0f2e', borderRadius: '8px', fontWeight: 'bold', color: '#aaa' },
    compareRow: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', padding: '15px', borderBottom: '1px solid #333' },
    compareCell: { color: '#fff', fontSize: '14px' },
    clearCompareBtn: { marginTop: '15px', padding: '10px 20px', backgroundColor: '#ff4757', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    savedSection: { marginTop: '40px' },
    subHeading: { color: '#fff', fontSize: '22px', marginBottom: '20px' },
    stocksGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' },
    savedStockCard: { backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #333', cursor: 'pointer', transition: 'all 0.2s' },
    savedSymbol: { color: '#00d4ff', fontSize: '20px', margin: '0 0 5px 0' },
    savedName: { color: '#aaa', fontSize: '12px', margin: '0 0 10px 0' },
    savedPrice: { color: '#fff', fontSize: '18px', fontWeight: 'bold', margin: 0 },
    emptyState: { textAlign: 'center', padding: '60px', backgroundColor: '#1a1a2e', borderRadius: '16px', border: '1px solid #333' },
    trainingModalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
    trainingModalBox: { backgroundColor: '#1a1a2e', padding: '40px 50px', borderRadius: '16px', textAlign: 'center', border: '2px solid #ffa502', maxWidth: '450px' },
    trainingSpinner: { width: '60px', height: '60px', border: '5px solid #333', borderTop: '5px solid #ffa502', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 25px' },
    trainingTitle: { color: '#ffa502', fontSize: '24px', marginBottom: '15px' },
    trainingText: { color: '#fff', fontSize: '16px', lineHeight: '1.6', marginBottom: '10px' },
    trainingSubtext: { color: '#aaa', fontSize: '14px', marginBottom: '25px' },
    trainingCloseBtn: { padding: '12px 30px', backgroundColor: '#ffa502', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
    logoutBtn: { padding: '10px 20px', backgroundColor: '#ff4757', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(255,71,87,0.3)' }
};

export default DashBoard;
