import { useState, useEffect } from 'react';
import { getStockQuote, getStockCandles } from '../services/api';
import { TrendingUp, TrendingDown, X, Pencil } from 'lucide-react';
import './StockCard.css';

export default function StockCard({ holding, onRemove, onEdit, viewMode = 'detailed', onQuoteUpdate }) {
    const { symbol, quantity, avgCost } = holding;
    // Initialize with latestQuote if available to avoid flicker on re-sort
    const [quote, setQuote] = useState(holding.latestQuote || null);
    const [candles, setCandles] = useState([]);
    // If we have initial data, we are not loading
    const [loading, setLoading] = useState(!holding.latestQuote);
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            try {
                // 1. Fetch Quote (Critical)
                const quoteData = await getStockQuote(symbol);

                if (!mounted) return;

                if (quoteData.c === 0 && quoteData.d === null) {
                    setError(true);
                    return; // Stop if quote fails
                } else {
                    setQuote(quoteData);
                    setError(false); // Clear error if successful
                    // Report back to parent for sorting
                    if (onQuoteUpdate) {
                        onQuoteUpdate(symbol, quoteData);
                    }
                }

                // 2. Fetch Candles (Optional - Graph)
                if (viewMode === 'simple') {
                    const now = Math.floor(Date.now() / 1000);
                    let candleData = null;

                    try {
                        // Try 5-minute resolution (Last 24h)
                        const from24h = now - (24 * 3600);
                        candleData = await getStockCandles(symbol, '5', from24h, now);

                        // Check if 403 or no data
                        if (candleData && candleData.s === 'no_data') throw new Error('No 5min data');

                        // If it failed (implicit in api wrapper? assuming it throws or returns error obj)
                        // API wrapper usually returns json. If 403, standard fetch might throw if not handled.
                        // Assuming fetchWithKey handles it or returns error struct.
                    } catch (e) {
                        console.warn(`Failed 5m candles for ${symbol}, trying Daily fallback.`, e);
                        candleData = null;
                    }

                    // Fallback to Daily (Last 30 days) if 5min failed or empty
                    if (!candleData || candleData.s !== 'ok' || !candleData.c) {
                        try {
                            const from30d = now - (30 * 24 * 3600);
                            candleData = await getStockCandles(symbol, 'D', from30d, now);
                        } catch (e) {
                            console.warn(`Failed Daily candles for ${symbol}`, e);
                        }
                    }

                    if (mounted && candleData && candleData.s === 'ok' && candleData.c) {
                        setCandles(candleData.c);
                    }
                }

            } catch (err) {
                console.error("Critical error fetching stock:", err);
                if (mounted) setError(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchData();

        const interval = setInterval(fetchData, 60000); // 60 seconds
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [symbol, viewMode]);

    if (loading) return <div className="stock-card loading" style={{ minHeight: viewMode === 'simple' ? '60px' : 'auto' }}><span>Loading...</span></div>;

    if (error) {
        if (viewMode === 'simple') {
            return (
                <div className="stock-card simple-view error-simple">
                    <span className="error-symbol">{symbol}</span>
                    <span className="error-icon"><X size={16} /></span>
                    <button className="remove-btn-simple" onClick={() => onRemove(symbol)}>
                        <X size={14} />
                    </button>
                </div>
            );
        }
        return <div className="stock-card error"><span>Error loading {symbol}</span><button onClick={() => onRemove(symbol)}><X size={16} /></button></div>;
    }

    // Portfolio Calculations
    const currentPrice = quote.c;
    const marketValue = currentPrice * quantity;
    const totalCost = avgCost * quantity;
    const totalReturn = marketValue - totalCost;
    const returnPercent = (totalReturn / totalCost) * 100;

    const isPositive = totalReturn >= 0;

    // Gradient Calculation
    const intensity = Math.min(Math.abs(returnPercent), 10) / 10;
    const baseGrey = '40, 40, 45'; // Dark grey
    const targetColor = isPositive ? '34, 197, 94' : '239, 68, 68';
    const trendColor = `rgb(${targetColor})`;

    const backgroundStyle = {
        background: `
                rgba(${targetColor}, ${0.1 + (intensity * 0.2)}) 0%, 
                rgba(${baseGrey}, 0.9) 60%,
                rgba(${baseGrey}, 1) 100%
            )
        `,
        borderColor: `rgba(${targetColor}, ${0.2 + (intensity * 0.5)})`,
        boxShadow: `0 4px 20px rgba(${targetColor}, ${intensity * 0.15})`
    };

    const dayChangePositive = quote.d >= 0;

    const renderSparkline = () => {
        // Use Real Candle Data if available
        if (candles.length > 1) {
            const prices = candles;
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const range = max - min || 1;

            const points = prices.map((price, i) => {
                const x = (i / (prices.length - 1)) * 100;
                const y = 40 - ((price - min) / range) * 40;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

            return (
                <svg viewBox="0 0 100 40" width="100%" height="40" className="sparkline" preserveAspectRatio="none">
                    <polyline
                        points={points}
                        fill="none"
                        stroke={dayChangePositive ? '#4ade80' : '#f87171'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }

        return null;
    };

    // Simple View specific background
    // Simple View specific background
    // Base colors: Green (20, 83, 45) / Red (127, 29, 29) are physically dark. 
    // User wants "Solid Green" when +10%. Let's mix from Black/Grey to Target Green.

    // Opacity Approach (Reverted)
    // Dark/Transparent (0% change) -> Bright/Solid (10% change)

    const simpleIntensity = Math.min(Math.abs(quote.dp), 10) / 10; // 0 to 1
    const targetRGB = dayChangePositive ? '34, 197, 94' : '239, 68, 68'; // Bright Green/Red

    const simpleBackgroundStyle = {
        background: `linear-gradient(135deg, rgba(${targetRGB}, ${0.2 + (simpleIntensity * 0.8)}), rgba(${targetRGB}, ${0.1 + (simpleIntensity * 0.5)}))`,
        backgroundColor: '#18181b', // Fallback dark background
        color: 'white',
        border: 'none'
    };

    if (viewMode === 'simple') {
        return (
            <div className="stock-card simple-view" style={simpleBackgroundStyle}>
                <div className="simple-card-content">
                    <div className="simple-header">
                        <h3 style={{ color: 'white' }}>{symbol}</h3>
                    </div>

                    <div className="simple-metrics">
                        <span className="percent-main" style={{ color: 'white', fontSize: '1.2rem' }}>
                            {quote.d > 0 ? '+' : ''}{quote.dp.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="stock-card" style={backgroundStyle}>
            <div className="card-header">
                <div className="header-left">
                    <h3>{symbol}</h3>
                    <span className="shares-badge">{quantity} shares @ ${avgCost.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="remove-btn" onClick={() => onEdit(holding)} title="Edit Position">
                        <Pencil size={16} />
                    </button>
                    <button className="remove-btn" onClick={() => onRemove(symbol)} title="Remove Position">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="price-info">
                <div className="main-value">
                    <span className="label">Market Value</span>
                    <span className="value">${marketValue.toFixed(2)}</span>
                </div>

                <div className="return-info" style={{ color: trendColor }}>
                    {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    <span className="return-value">{totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(2)}</span>
                    <span className="return-percent">({returnPercent.toFixed(2)}%)</span>
                </div>

                <div className="price-row">
                    <span className="price-label">Price: ${currentPrice.toFixed(2)}</span>
                    <span className={`day-change ${quote.d >= 0 ? 'up' : 'down'}`}>
                        {quote.d > 0 ? '+' : ''}{quote.dp.toFixed(2)}%
                    </span>
                </div>
            </div>
        </div>
    );
}
