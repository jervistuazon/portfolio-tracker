import { useState, useEffect } from 'react';
import { getStockQuote } from '../services/api';
import { TrendingUp, TrendingDown, X, Pencil, Loader } from 'lucide-react';
import './StockCard.css';

export default function StockCard({ holding, onRemove, onEdit, viewMode = 'detailed', onQuoteUpdate, hideTicker }) {
    const { symbol, quantity, avgCost } = holding;
    // Initialize with latestQuote if available to avoid flicker on re-sort
    const [quote, setQuote] = useState(holding.latestQuote || null);
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
    }, [symbol, viewMode, onQuoteUpdate]);

    if (loading) {
        if (viewMode === 'bubble') {
            // Bubble loading state - circle
            return (
                <div
                    className="stock-card loading bubble-loading"
                    style={{
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '1',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    <Loader className="spin-animation" size={24} />
                </div>
            );
        }

        // Detailed & Simple loading states
        return (
            <div
                className={`stock-card loading ${viewMode === 'simple' ? 'simple-view' : ''}`}
                style={{
                    minHeight: viewMode === 'simple' ? '60px' : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Loader className="spin-animation" size={24} />
            </div>
        );
    }

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
    const dayIntensity = Math.min(Math.abs(quote.dp), 10) / 10;
    const targetColor = isPositive ? '34, 197, 94' : '239, 68, 68';
    const trendColor = `rgb(${targetColor})`;

    const backgroundStyle = {
        backgroundColor: `rgba(${targetColor}, ${0.1 + (intensity * 0.2)})`,
        borderColor: `rgba(${targetColor}, ${0.2 + (intensity * 0.5)})`,
        boxShadow: `0 4px 20px rgba(${targetColor}, ${intensity * 0.15}), 0 0 ${10 + dayIntensity * 15}px rgba(${targetColor}, ${0.1 + dayIntensity * 0.5})`
    };

    const dayChangePositive = quote.d >= 0;


    // Simple View specific background
    // Simple View specific background
    // Base colors: Green (20, 83, 45) / Red (127, 29, 29) are physically dark. 
    // User wants "Solid Green" when +10%. Let's mix from Black/Grey to Target Green.

    // Opacity Approach (Reverted)
    // Dark/Transparent (0% change) -> Bright/Solid (10% change)

    const simpleIntensity = Math.min(Math.abs(quote.dp), 10) / 10; // 0 to 1
    // Use CSS Variables instead of hardcoded strings to allow theme switching
    const targetRGB = dayChangePositive ? 'var(--color-positive-rgb)' : 'var(--color-negative-rgb)';

    const simpleBackgroundStyle = {
        '--card-rgb': targetRGB,
        '--card-intensity': simpleIntensity,
        color: 'white',
        border: 'none'
    };

    if (viewMode === 'simple') {
        return (
            <div className="stock-card simple-view" style={simpleBackgroundStyle}>
                <div className="simple-card-content">
                    <div className="simple-header">
                        {!hideTicker && <h3 style={{ color: 'white' }}>{symbol}</h3>}
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
                    {!hideTicker && <h3>{symbol}</h3>}
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
