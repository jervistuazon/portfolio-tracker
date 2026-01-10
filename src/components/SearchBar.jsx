import { useState, useEffect, useRef } from 'react';
import { searchStocks } from '../services/api';
import { Search, Plus } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ onAdd }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 1) {
                setLoading(true);
                try {
                    const data = await searchStocks(query);
                    // Filter to only common stock types to avoid noise
                    const filtered = data.filter(item => !item.symbol.includes('.'));
                    setResults(filtered.slice(0, 5));
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setResults([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (symbol) => {
        onAdd(symbol);
        setQuery('');
        setResults([]);
    };

    return (
        <div className="search-wrapper" ref={wrapperRef}>
            <div className="search-input-container">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    autoFocus
                    placeholder="Search stocks (e.g., AAPL, TSLA)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {(results.length > 0 || loading) && (
                <div className="search-dropdown">
                    {loading && <div className="search-item loading">Searching...</div>}
                    {results.map((item) => (
                        <div key={item.symbol} className="search-item" onClick={() => handleSelect(item.symbol)}>
                            <div className="item-info">
                                <span className="item-symbol">{item.symbol}</span>
                                <span className="item-name">{item.description}</span>
                            </div>
                            <Plus size={16} className="add-icon" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
