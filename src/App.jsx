import { useState, useEffect, useMemo } from 'react';
import SearchBar from './components/SearchBar';
import Portfolio from './components/Portfolio';
import ApiKeyInput from './components/ApiKeyInput';
import AddPositionModal from './components/AddPositionModal';
import SyncModal from './components/SyncModal';
import { getApiKey } from './services/api';
import { initialPortfolio } from './data/initialPortfolio';
import { Eye, EyeOff, LayoutGrid, List, ArrowUpDown, Search, ArrowDownAZ, ArrowUpAZ, TrendingUp, TrendingDown, Cloud } from 'lucide-react';
import './styles/App.css';

function App() {
  const [apiKey, setApiKeyState] = useState(getApiKey());
  // State is now an array of objects: { symbol, quantity, avgCost, latestQuote? }
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('stock_portfolio_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('portfolio_view_mode') || 'detailed';
  });

  const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });
  const [showSearch, setShowSearch] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('stock_portfolio_v2', JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem('portfolio_view_mode', viewMode);
  }, [viewMode]);

  const handleApiKeySaved = () => {
    setApiKeyState(getApiKey());
  };

  const handleSearchSelect = (symbol) => {
    // Check if already exists
    if (portfolio.find(p => p.symbol === symbol)) {
      alert("You already have this stock in your portfolio!");
      return;
    }
    setSelectedSymbol(symbol);
    setEditingPosition(null);
    setModalOpen(true);
    setShowSearch(false); // Close search after selection
  };

  const handleEditPosition = (position) => {
    setSelectedSymbol(position.symbol);
    setEditingPosition(position);
    setModalOpen(true);
  };

  const savePosition = (position) => {
    if (editingPosition) {
      // Update existing
      setPortfolio(portfolio.map(p => p.symbol === position.symbol ? { ...p, ...position } : p));
    } else {
      // Add new
      setPortfolio([...portfolio, position]);
    }
    setEditingPosition(null);
  };

  const removeStock = (symbol) => {
    setPortfolio(portfolio.filter(p => p.symbol !== symbol));
  };

  const loadInitialPortfolio = () => {
    if (confirm("This will replace your current portfolio with the initial dataset. Are you sure?")) {
      setPortfolio(initialPortfolio);
    }
  };

  // Callback for StockCard to report back the latest price data
  const handleQuoteUpdate = (symbol, quote) => {
    setPortfolio(prevPortfolio => {
      // Only update if the specific stock needs updating to avoid unnecessary writes
      // Actually, we need to update state to trigger re-sort if keeping track of live sort
      return prevPortfolio.map(p =>
        p.symbol === symbol
          ? { ...p, latestQuote: quote }
          : p
      );
    });
  };

  // Sorting Logic
  const sortedPortfolio = useMemo(() => {
    const sorted = [...portfolio];
    sorted.sort((a, b) => {
      if (sortConfig.key === 'symbol') {
        return sortConfig.direction === 'asc'
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol);
      }
      if (sortConfig.key === 'dayChange') {
        // Use -9999 as sentinel for missing data so it goes to bottom
        const valA = a.latestQuote ? a.latestQuote.dp : -9999;
        const valB = b.latestQuote ? b.latestQuote.dp : -9999;
        return sortConfig.direction === 'desc'
          ? valB - valA
          : valA - valB;
      }
      return 0;
    });
    return sorted;
  }, [portfolio, sortConfig]);

  const handleSortSymbol = () => {
    if (sortConfig.key === 'symbol') {
      setSortConfig({ key: 'symbol', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ key: 'symbol', direction: 'asc' });
    }
  };

  const handleSortChange = () => {
    if (sortConfig.key === 'dayChange') {
      setSortConfig({ key: 'dayChange', direction: sortConfig.direction === 'desc' ? 'asc' : 'desc' });
    } else {
      setSortConfig({ key: 'dayChange', direction: 'desc' });
    }
  };

  const getSortSymbolLabel = () => {
    if (sortConfig.key !== 'symbol') return 'A-Z';
    return sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A';
  };

  const getSortChangeLabel = () => {
    if (sortConfig.key !== 'dayChange') return 'Change';
    return sortConfig.direction === 'desc' ? 'High %' : 'Low %';
  };

  return (
    <div className="app-container">
      {!apiKey && <ApiKeyInput onSave={handleApiKeySaved} />}

      {syncModalOpen && (
        <SyncModal
          portfolio={portfolio}
          onClose={() => setSyncModalOpen(false)}
          onImport={(data) => setPortfolio(data)}
        />
      )}

      {modalOpen && (
        <AddPositionModal
          symbol={selectedSymbol}
          initialData={editingPosition}
          onClose={() => { setModalOpen(false); setEditingPosition(null); }}
          onSave={savePosition}
        />
      )}

      <header className="app-header">
      </header>

      <main>
        {showSearch && <SearchBar onAdd={handleSearchSelect} />}
        <Portfolio
          stocks={sortedPortfolio}
          onRemove={removeStock}
          onEdit={handleEditPosition}
          viewMode={viewMode}
          onQuoteUpdate={handleQuoteUpdate}
        />
      </main>

      <div className="bottom-controls-bar">
        <button
          onClick={() => setSyncModalOpen(true)}
          className="icon-btn"
          style={{ background: 'none', color: '#a1a1aa' }}
          title="Sync Data"
        >
          <Cloud size={24} />
        </button>

        <button
          onClick={handleSortSymbol}
          className="icon-btn sort-btn"
          style={{
            // Logic: If active, maybe blue? Or just specific colors per button?
            // The image shows A-Z is grey (maybe because not primary sort?) and High% is Blue (Active).
            // Let's stick to: Active = Blue, Inactive = Dark Grey.
            background: sortConfig.key === 'symbol' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255,255,255,0.1)',
          }}
          title="Sort by Symbol"
        >
          <ArrowUpDown size={14} />
          <span className="btn-label">
            {sortConfig.key === 'symbol' && sortConfig.direction === 'desc' ? 'Z-A' : 'A-Z'}
          </span>
        </button>

        <button
          onClick={handleSortChange}
          className="icon-btn sort-btn"
          style={{
            background: sortConfig.key === 'dayChange' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255,255,255,0.1)',
          }}
          title="Sort by Daily Change"
        >
          <ArrowUpDown size={14} />
          <span className="btn-label">
            {/* Show High/% or Low/% */}
            {sortConfig.key === 'dayChange' && sortConfig.direction === 'asc'
              ? 'Low %'
              : 'High %'
            }
          </span>
        </button>

        <button
          onClick={() => setViewMode(prev => prev === 'detailed' ? 'simple' : 'detailed')}
          className="icon-btn"
          style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title={viewMode === 'detailed' ? "Switch to Simple View" : "Switch to Detailed View"}
        >
          {viewMode === 'detailed' ? <List size={24} /> : <LayoutGrid size={24} />}
        </button>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="icon-btn"
          style={{ background: 'none', border: 'none', color: showSearch ? '#3b82f6' : '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Search Stocks"
        >
          <Search size={24} />
        </button>
      </div>
    </div>
  );
}

export default App;
