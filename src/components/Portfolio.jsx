import StockCard from './StockCard';
import BubblePortfolio from './BubblePortfolio';
import './Portfolio.css';

export default function Portfolio({ stocks, onRemove, onEdit, viewMode, onQuoteUpdate, hideTicker }) {
    if (stocks.length === 0) {
        return (
            <div className="empty-portfolio">
                <p>Your portfolio is empty.</p>
                <p className="sub-text">Search for a stock to start tracking.</p>
            </div>
        );
    }

    if (viewMode === 'bubble') {
        return (
            <BubblePortfolio
                stocks={stocks}
                onQuoteUpdate={onQuoteUpdate}
                onRemove={onRemove}
                hideTicker={hideTicker}
            />
        );
    }

    return (
        <div className={`portfolio-grid ${viewMode === 'simple' ? 'simple-mode' : ''}`}>
            {stocks.map((holding) => (
                <StockCard
                    key={holding.symbol}
                    holding={holding}
                    onRemove={onRemove}
                    onEdit={onEdit}
                    viewMode={viewMode}
                    onQuoteUpdate={onQuoteUpdate}
                    hideTicker={hideTicker}
                />
            ))}
        </div>
    );
}

