import { useMemo, useState, useEffect, useCallback } from 'react';
import StockBubble from './StockBubble';
import './Portfolio.css';

export default function BubblePortfolio({ stocks, onQuoteUpdate, onRemove, hideTicker }) {
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight - 80 });
    const [draggedBubble, setDraggedBubble] = useState(null); // { symbol, x, y }
    const [bubblesData, setBubblesData] = useState([]); // Store bubble data for collision calculation

    useEffect(() => {
        const updateDim = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight - 80
            });
        };

        window.addEventListener('resize', updateDim);
        return () => window.removeEventListener('resize', updateDim);
    }, []);

    const bubbles = useMemo(() => {
        if (!stocks.length || dimensions.width === 0) return [];

        const data = stocks.map(s => {
            const price = s.latestQuote ? s.latestQuote.c : 0;
            const effPrice = price || s.avgCost || 1;
            return {
                ...s,
                marketValue: effPrice * s.quantity
            };
        });

        data.sort((a, b) => b.marketValue - a.marketValue);

        // Aspect Ratio logic for Skewing
        const aspectRatio = dimensions.width / dimensions.height;
        const minDim = Math.min(dimensions.width, dimensions.height);

        // Aggressive Sizing
        const maxBubbleSize = minDim * 0.70; // 70% of screen width max
        const minBubbleSize = 120;

        const maxRoot = Math.sqrt(data[0].marketValue);

        const mapped = data.map(s => {
            const root = Math.sqrt(s.marketValue);
            const scale = root / maxRoot;
            const size = Math.max(minBubbleSize, maxBubbleSize * scale);
            return {
                ...s,
                r: size / 2,
                size: size,
                x: 0,
                y: 0
            };
        });

        const placedBubbles = [];
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        const checkCollision = (b1, x, y) => {
            for (let b2 of placedBubbles) {
                const dx = x - b2.x;
                const dy = y - b2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (b1.r + b2.r + 2)) {
                    return true;
                }
            }
            return false;
        };

        if (mapped.length > 0) {
            mapped[0].x = centerX;
            mapped[0].y = centerY;
            placedBubbles.push(mapped[0]);
        }

        for (let i = 1; i < mapped.length; i++) {
            const bubble = mapped[i];

            let angle = 0;
            let distance = placedBubbles[0].r + bubble.r + 2;
            let found = false;

            const maxIter = 5000;
            let iter = 0;

            // Vertical Skew: 
            // We want the spiral to be "narrower" (smaller X) so that the scaler zooms in more.
            // Reduced multiplier (0.75 * AR) compresses width, forcing height to grow relative to width container.
            const verticalSkew = aspectRatio * 0.75;

            while (!found && iter < maxIter) {
                const x = centerX + (Math.cos(angle) * distance * verticalSkew);
                const y = centerY + (Math.sin(angle) * distance);

                if (!checkCollision(bubble, x, y)) {
                    bubble.x = x;
                    bubble.y = y;
                    placedBubbles.push(bubble);
                    found = true;
                } else {
                    angle += 0.1;
                    distance += 0.5;
                }
                iter++;
            }

            if (!found) {
                const x = centerX + (Math.cos(angle) * distance * verticalSkew);
                const y = centerY + (Math.sin(angle) * distance);
                bubble.x = x;
                bubble.y = y;
                placedBubbles.push(bubble);
            }
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        placedBubbles.forEach(b => {
            minX = Math.min(minX, b.x - b.r);
            maxX = Math.max(maxX, b.x + b.r);
            minY = Math.min(minY, b.y - b.r);
            maxY = Math.max(maxY, b.y + b.r);
        });

        const layoutWidth = maxX - minX;
        const layoutHeight = maxY - minY;

        const padding = 10;
        const availableWidth = dimensions.width - padding;
        const availableHeight = dimensions.height - padding;

        const scaleX = availableWidth / layoutWidth;
        const scaleY = availableHeight / layoutHeight;

        const finalScale = Math.min(scaleX, scaleY);

        const layoutCenterX = (minX + maxX) / 2;
        const layoutCenterY = (minY + maxY) / 2;

        const result = placedBubbles.map(b => {
            const dx = b.x - layoutCenterX;
            const dy = b.y - layoutCenterY;

            return {
                ...b,
                x: centerX + (dx * finalScale),
                y: centerY + (dy * finalScale),
                size: b.size * finalScale,
                r: b.r * finalScale
            };
        });

        return result;

    }, [stocks, dimensions]);

    // Update bubbles data when bubbles change (safe effect instead of ref during render)
    useEffect(() => {
        setBubblesData(bubbles);
    }, [bubbles]);

    // Handle drag updates from child bubbles
    const handleDrag = useCallback((symbol, dragX, dragY) => {
        setDraggedBubble({ symbol, x: dragX, y: dragY });
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedBubble(null);
    }, []);

    // Calculate repulsion offset for each bubble based on dragged bubble position
    const getRepulsionOffset = useCallback((bubble) => {
        if (!draggedBubble || draggedBubble.symbol === bubble.symbol) {
            return { x: 0, y: 0 };
        }

        // Calculate distance from dragged bubble's current position to this bubble's home position
        const dx = bubble.x - draggedBubble.x;
        const dy = bubble.y - draggedBubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Find the dragged bubble's radius
        const draggedBubbleData = bubblesData.find(b => b.symbol === draggedBubble.symbol);
        const draggedRadius = draggedBubbleData ? draggedBubbleData.r : 50;

        const minDistance = bubble.r + draggedRadius;
        const repulsionRange = minDistance * 1.2; // Reduced range for softer effect

        if (distance < repulsionRange && distance > 0) {
            // Calculate repulsion strength (weaker, more subtle push)
            const overlap = repulsionRange - distance;
            const strength = Math.min(overlap * 0.15, 12); // Much softer: 0.15 multiplier, max 12px push

            // Normalize direction and apply strength
            const nx = dx / distance;
            const ny = dy / distance;

            return {
                x: nx * strength,
                y: ny * strength
            };
        }

        return { x: 0, y: 0 };
    }, [draggedBubble, bubblesData]);

    return (
        <div
            className="portfolio-bubble-container"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: 'calc(100vh - 80px)',
                overflow: 'visible', // Allow tentacles to peek out if needed
                zIndex: 0
            }}
        >
            {bubbles.map(b => {
                const repulsion = getRepulsionOffset(b);
                return (
                    <StockBubble
                        key={b.symbol}
                        holding={b}
                        size={b.size}
                        x={b.x}
                        y={b.y}
                        repulsionX={repulsion.x}
                        repulsionY={repulsion.y}
                        onQuoteUpdate={onQuoteUpdate}
                        onRemove={onRemove}
                        hideTicker={hideTicker}
                        onDrag={handleDrag}
                        onDragEnd={handleDragEnd}
                    />
                );
            })}
        </div>
    );
}
