import StockCard from './StockCard';
import './Portfolio.css';

export default function Portfolio({ stocks, onRemove, onEdit, viewMode, onQuoteUpdate }) {
    if (stocks.length === 0) {
        return (
            <div className="empty-portfolio">
                <p>Your portfolio is empty.</p>
                <p className="sub-text">Search for a stock to start tracking.</p>
            </div>
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
                />
            ))}
        </div>
    );
}
