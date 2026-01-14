import { useState, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useSpring, useMotionValue, animate } from 'framer-motion';
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

    // Controlled motion values for drag offset
    // These track the distance from the bubble's "home" position
    // Framer Motion's 'drag' prop will automatically update these values
    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);

    // Spring-animated repulsion offsets for smooth, physical movement
    const repulsionSpringConfig = { stiffness: 100, damping: 20 };
    const springRepulsionX = useSpring(0, repulsionSpringConfig);
    const springRepulsionY = useSpring(0, repulsionSpringConfig);

    // Update repulsion spring targets
    useEffect(() => {
        // While dragging, we "lock" the repulsion to whatever it was at the start
        // of the drag. This prevents the bubble from snapping to its home 
        // position (0 repulsion) while the user is still holding it.
        if (!isDragging) {
            springRepulsionX.set(repulsionX);
            springRepulsionY.set(repulsionY);
        }
    }, [repulsionX, repulsionY, isDragging, springRepulsionX, springRepulsionY]);

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
        // Important: Stop the return animation immediately when grabbed.
        // Framer Motion's drag gesture will automatically capture the 
        // current value of dragX/dragY and continue from there.
        dragX.stop();
        dragY.stop();
    };

    const handleDrag = () => {
        if (onDrag) {
            // Report the actual displacement from home to the parent 
            // so other bubbles can react (repulsion).
            const absoluteX = x + dragX.get();
            const absoluteY = y + dragY.get();
            onDrag(symbol, absoluteX, absoluteY);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);

        // Very slow, gentle return to origin (10 seconds)
        // We use tween + easeOut for a weightless, floaty feel.
        // This animates our motion values back to 0.
        animate(dragX, 0, {
            type: "tween",
            duration: 10,
            ease: "easeOut"
        });

        animate(dragY, 0, {
            type: "tween",
            duration: 10,
            ease: "easeOut"
        });

        if (onDragEnd) {
            onDragEnd(symbol);
        }
    };

    // Base position and floating animations
    const wrapperStyle = {
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        zIndex: isDragging ? 2000 : Math.round(size),
        ...animationStyle
    };

    if (loading) {
        return (
            <div className="bubble-wrapper" style={wrapperStyle}>
                <div className="bubble-scale-wrapper">
                    <div className="bubble-jitter-wrapper">
                        <div
                            className="stock-bubble loading"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                fontSize: Math.max(10, size / 5) + 'px'
                            }}
                        >
                            <Loader className="spin-animation" size={Math.max(16, size / 4)} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="bubble-wrapper" style={wrapperStyle}>
                <div className="bubble-scale-wrapper">
                    <div className="bubble-jitter-wrapper">
                        <div className="stock-bubble error" style={{ fontSize: Math.max(14, size / 3) + 'px' }}>
                            <span>?</span>
                        </div>
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

    const absChange = Math.abs(dayChange);
    let animationName = 'none';
    let animationDuration = '0s';
    let breatheScale = 1.05;

    if (absChange > 0.05) {
        if (isPositive) {
            animationName = 'positive-breathe';
            // Slower, more majestic breathing for green
            animationDuration = `${Math.max(2, 8 / (absChange * 0.5))}s`;
            // Max 20% increase (1.2 scale)
            breatheScale = 1 + (Math.min(absChange, 10) / 10 * 0.2);
        } else {
            animationName = 'jitter';
            // Fast, chaotic jitter for red
            animationDuration = `${Math.max(0.05, 1.5 / (absChange * 1.5))}s`;
        }
    }

    const glowSpread = 15 + intensity * 25;
    const glowAlpha = 0.3 + intensity * 0.5;

    const bubbleStyle = {
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
        border: `2px solid rgba(${r}, ${g}, ${b}, 1)`,
        fontSize: Math.max(10, size / 5) + 'px',
        '--pulse-rgb': `${r}, ${g}, ${b}`,
        '--bubble-animation': animationName,
        '--animation-duration': animationDuration,
        '--breathe-scale': breatheScale,
        '--glow-spread': `${glowSpread}px`,
        '--glow-alpha': glowAlpha,
        boxShadow: `inset 0 0 20px rgba(255, 255, 255, 0.2), 0 4px 10px rgba(0, 0, 0, 0.3), 0 0 var(--glow-spread) rgba(var(--pulse-rgb), var(--glow-alpha))`
    };

    const shouldPulse = Math.abs(dayChange) >= 5;

    return (
        <motion.div
            className="bubble-wrapper"
            style={{
                ...wrapperStyle,
                // Outer Layer: Repulsion Displacement
                x: springRepulsionX,
                y: springRepulsionY
            }}
            title={`${symbol}: ${dayChange.toFixed(2)}%`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8, delay: parseFloat(animationStyle['--pop-delay']) }}
        >
            <motion.div
                className="drag-layer"
                style={{
                    width: '100%',
                    height: '100%',
                    // Inner Layer: Drag & Return Displacement
                    x: dragX,
                    y: dragY
                }}
                drag
                dragMomentum={false}
                dragElastic={0.05}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                whileHover={{ scale: 1.1 }}
                whileDrag={{ scale: 1.2 }}
            >
                <div className="bubble-scale-wrapper">
                    <div className="bubble-jitter-wrapper" style={{
                        '--bubble-animation': animationName,
                        '--animation-duration': animationDuration,
                        '--breathe-scale': breatheScale
                    }}>
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
            </motion.div>
        </motion.div>
    );
}
