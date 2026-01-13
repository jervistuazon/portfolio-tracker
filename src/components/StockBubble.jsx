import { useState, useEffect, useMemo } from 'react';
import { getStockQuote } from '../services/api';
import { Loader } from 'lucide-react';
import './StockBubble.css';

export default function StockBubble({ holding, size, x, y, onQuoteUpdate, hideTicker }) {
    const { symbol } = holding;
    // Initialize with latestQuote if available
    const [quote, setQuote] = useState(holding.latestQuote || null);
    const [loading, setLoading] = useState(!holding.latestQuote);
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            try {
                const quoteData = await getStockQuote(symbol);
                if (!mounted) return;

                if (quoteData.c === 0 && quoteData.d === null) {
                    setError(true);
                } else {
                    setQuote(quoteData);
                    setError(false);
                    if (onQuoteUpdate) {
                        onQuoteUpdate(symbol, quoteData);
                    }
                }
            } catch (err) {
                console.error(`Error fetching bubble data for ${symbol}:`, err);
                if (mounted) setError(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // If we don't have data, fetch immediately.
        // Even if we do, we might want to refresh, but `StockCard` logic fetches immediately too.
        fetchData();

        const interval = setInterval(fetchData, 60000); // 60s update
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [symbol, onQuoteUpdate]);

    // Randomize animation duration and delay for "organic" feel
    // Randomize animation duration and delay for "organic" feel
    // We use independent X and Y animations to create complex loops (Lissajous-like)
    const animationStyle = useMemo(() => {
        // Vertical Float
        const floatDuration = 4 + Math.random() * 4; // 4s - 8s
        const floatDelay = Math.random() * -5;

        // Horizontal Sway
        const swayDuration = 5 + Math.random() * 5; // 5s - 10s (mismatch with float to avoid loops syncing up too fast)
        const swayDelay = Math.random() * -5;

        // Breathing (Scale)
        const breathDuration = 3 + Math.random() * 3; // 3s - 6s, faster than float
        const breathDelay = Math.random() * -5;

        // Blob (Wobble)
        const blobDuration = 7 + Math.random() * 6; // 7s - 13s
        const blobDelay = Math.random() * -5;

        // Pop Entrance
        const popDelay = Math.random() * 0.5; // 0s - 0.5s stagger entrance

        // Randomize sway direction and magnitude
        const swayAmount = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 10); // +/- 5px to 15px

        return {
            '--float-duration': `${floatDuration}s`,
            '--float-delay': `${floatDelay}s`,
            '--sway-duration': `${swayDuration}s`,
            '--sway-delay': `${swayDelay}s`,
            '--sway-amount': `${swayAmount}px`,
            '--breath-duration': `${breathDuration}s`,
            '--breath-delay': `${breathDelay}s`,
            '--blob-duration': `${blobDuration}s`,
            '--blob-delay': `${blobDelay}s`,
            '--pop-delay': `${popDelay}s`
        };
    }, []);

    // Style for the positioning/floating wrapper
    const wrapperStyle = {
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        zIndex: Math.round(size),
        ...animationStyle // contains --float-*, --sway-*, and --breath-* vars
    };

    if (loading) {
        return (
            <div className="bubble-wrapper" style={wrapperStyle}>
                <div className="bubble-scale-wrapper">
                    <div
                        className="stock-bubble loading"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <Loader className="spin-animation" size={Math.max(16, size / 4)} />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="bubble-wrapper" style={wrapperStyle}>
                <div className="bubble-scale-wrapper">
                    <div
                        className="stock-bubble error"
                        style={{}} // no extra style needed
                    >
                        <span>?</span>
                    </div>
                </div>
            </div>
        );
    }

    // Color Calculation
    const dayChange = quote.dp; // Percentage
    const isPositive = dayChange >= 0;
    const intensity = Math.min(Math.abs(dayChange), 10) / 10; // Cap at 10%
    const r = isPositive ? 34 : 239;
    const g = isPositive ? 197 : 68;
    const b = isPositive ? 94 : 68;
    const opacity = 0.3 + (intensity * 0.7);

    // Style for the inner visual bubble
    const bubbleStyle = {
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
        border: `2px solid rgba(${r}, ${g}, ${b}, 1)`,
        fontSize: Math.max(10, size / 5) + 'px',
        // animationStyle is inherited via CSS vars on wrapper
        '--pulse-rgb': `${r}, ${g}, ${b}` // Pass RGB for pulse animation opacity control
    };

    // Pulsing effect for significant changes
    const shouldPulse = Math.abs(dayChange) >= 5;

    return (
        <div className="bubble-wrapper" style={wrapperStyle} title={`${symbol}: ${dayChange.toFixed(2)}%`}>
            <div className="bubble-scale-wrapper">
                <div
                    className={`stock-bubble ${shouldPulse ? 'pulse' : ''}`}
                    style={bubbleStyle}
                >
                    <div className="bubble-content">
                        {!hideTicker && <span className="bubble-symbol">{symbol}</span>}
                        <span className="bubble-change">
                            {dayChange > 0 ? '+' : ''}{dayChange.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
