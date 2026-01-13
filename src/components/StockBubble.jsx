import { useState, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useSpring, useAnimate } from 'framer-motion';
import { getStockQuote } from '../services/api';
import { Loader } from 'lucide-react';
import './StockBubble.css';

export default function StockBubble({
    holding,
    size,
    x,
    y,
    repulsionX = 0,
    repulsionY = 0,
    onQuoteUpdate,
    hideTicker,
    onDrag,
    onDragEnd
}) {
    const { symbol } = holding;
    const [quote, setQuote] = useState(holding.latestQuote || null);
    const [loading, setLoading] = useState(!holding.latestQuote);
    const [error, setError] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // useAnimate hook for manual animation control
    const [scope, animate] = useAnimate();

    // Spring-animated repulsion offsets
    const repulsionSpringConfig = { stiffness: 150, damping: 25 };
    const springRepulsionX = useSpring(repulsionX, repulsionSpringConfig);
    const springRepulsionY = useSpring(repulsionY, repulsionSpringConfig);

    useEffect(() => {
        springRepulsionX.set(repulsionX);
        springRepulsionY.set(repulsionY);
    }, [repulsionX, repulsionY, springRepulsionX, springRepulsionY]);

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

        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [symbol, onQuoteUpdate]);

    const animationStyle = useMemo(() => {
        const floatDuration = 4 + Math.random() * 4;
        const floatDelay = Math.random() * -5;
        const swayDuration = 5 + Math.random() * 5;
        const swayDelay = Math.random() * -5;
        const breathDuration = 3 + Math.random() * 3;
        const breathDelay = Math.random() * -5;
        const blobDuration = 7 + Math.random() * 6;
        const blobDelay = Math.random() * -5;
        const popDelay = Math.random() * 0.5;
        const swayAmount = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 10);

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

    const handleDragStart = () => {
        setIsDragging(true);
    };

    const handleDrag = (event, info) => {
        if (onDrag) {
            const absoluteX = x + info.offset.x;
            const absoluteY = y + info.offset.y;
            onDrag(symbol, absoluteX, absoluteY);
        }
    };

    const handleDragEnd = async () => {
        setIsDragging(false);

        // Animate back to origin SLOWLY (10 seconds)
        await animate(scope.current,
            { x: 0, y: 0 },
            {
                type: "tween",
                duration: 10,
                ease: [0.25, 0.1, 0.25, 1] // ease-out
            }
        );

        if (onDragEnd) {
            onDragEnd(symbol);
        }
    };

    const wrapperStyle = {
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        zIndex: Math.round(size),
        ...animationStyle
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
                    <div className="stock-bubble error" style={{}}>
                        <span>?</span>
                    </div>
                </div>
            </div>
        );
    }

    const dayChange = quote.dp;
    const isPositive = dayChange >= 0;
    const intensity = Math.min(Math.abs(dayChange), 10) / 10;
    const r = isPositive ? 34 : 239;
    const g = isPositive ? 197 : 68;
    const b = isPositive ? 94 : 68;
    const opacity = 0.3 + (intensity * 0.7);

    const bubbleStyle = {
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
        border: `2px solid rgba(${r}, ${g}, ${b}, 1)`,
        fontSize: Math.max(10, size / 5) + 'px',
        '--pulse-rgb': `${r}, ${g}, ${b}`
    };

    const shouldPulse = Math.abs(dayChange) >= 5;

    return (
        <motion.div
            ref={scope}
            className="bubble-wrapper"
            style={{
                ...wrapperStyle,
                // Add repulsion offset (only when not dragging)
                marginLeft: isDragging ? 0 : springRepulsionX.get(),
                marginTop: isDragging ? 0 : springRepulsionY.get()
            }}
            title={`${symbol}: ${dayChange.toFixed(2)}%`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8, delay: parseFloat(animationStyle['--pop-delay']) }}
            drag
            dragElastic={0.1}
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            whileHover={{ scale: 1.1, zIndex: 1000 }}
            whileDrag={{ scale: 1.2, zIndex: 1001 }}
        >
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
        </motion.div>
    );
}
