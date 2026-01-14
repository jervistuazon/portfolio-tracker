import { useState, useEffect, useMemo, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import Portfolio from './components/Portfolio';
import ApiKeyInput from './components/ApiKeyInput';
import AddPositionModal from './components/AddPositionModal';
import SyncModal from './components/SyncModal';
import { getApiKey } from './services/api';
import { Eye, EyeOff, LayoutGrid, List, ArrowUpDown, Search, ArrowDownAZ, ArrowUpAZ, TrendingUp, TrendingDown, Cloud, Sun, Moon } from 'lucide-react';
import VersionCheck from './components/VersionCheck';
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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [hideTicker, setHideTicker] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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


  // Callback for StockCard to report back the latest price data
  // Callback for StockCard to report back the latest price data
  const handleQuoteUpdate = useCallback((symbol, quote) => {
    setPortfolio(prevPortfolio => {
      // Only update if the specific stock needs updating to avoid unnecessary writes
      // Actually, we need to update state to trigger re-sort if keeping track of live sort
      return prevPortfolio.map(p =>
        p.symbol === symbol
          ? { ...p, latestQuote: quote }
          : p
      );
    });
  }, []);

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


  return (
    <div className={`app-container ${viewMode === 'bubble' ? 'bubble-mode' : ''}`}>
      <VersionCheck />
      <div className="mesh-container">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
      </div>
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
          hideTicker={hideTicker}
        />
      </main>

      <div className="bottom-controls-bar">
        <button
          onClick={() => setSyncModalOpen(true)}
          className="icon-btn"
          style={{ background: 'transparent', color: 'var(--text-secondary)' }}
          title="Sync Data"
        >
          <Cloud size={24} />
        </button>

        <button
          onClick={handleSortSymbol}
          className="icon-btn"
          style={{
            background: sortConfig.key === 'symbol' ? 'var(--accent-blue)' : 'var(--icon-btn-hover)',
            color: sortConfig.key === 'symbol' ? 'white' : 'var(--text-secondary)'
          }}
          title={`Sort by Symbol (${sortConfig.key === 'symbol' && sortConfig.direction === 'desc' ? 'Z-A' : 'A-Z'})`}
        >
          {sortConfig.key === 'symbol' && sortConfig.direction === 'desc' ? <ArrowUpAZ size={24} /> : <ArrowDownAZ size={24} />}
        </button>

        <button
          onClick={handleSortChange}
          className="icon-btn"
          style={{
            background: sortConfig.key === 'dayChange' ? 'var(--accent-blue)' : 'var(--icon-btn-hover)',
            color: sortConfig.key === 'dayChange' ? 'white' : 'var(--text-secondary)'
          }}
          title={`Sort by Daily Change (${sortConfig.key === 'dayChange' && sortConfig.direction === 'asc' ? 'Low %' : 'High %'})`}
        >
          {sortConfig.key === 'dayChange' && sortConfig.direction === 'asc' ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
        </button>

        <button
          onClick={() => setViewMode(prev => {
            if (prev === 'detailed') return 'simple';
            if (prev === 'simple') return 'bubble';
            return 'detailed';
          })}
          className="icon-btn"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title={`Current View: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`}
        >
          {viewMode === 'detailed' && <List size={24} />}
          {viewMode === 'simple' && <LayoutGrid size={24} />}
          {viewMode === 'bubble' && <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid currentColor' }}></div>}
        </button>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="icon-btn"
          style={{ background: 'transparent', border: 'none', color: showSearch ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Search Stocks"
        >
          <Search size={24} />
        </button>

        <button
          onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          className="icon-btn"
          style={{ background: 'transparent', border: 'none', color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
        </button>

        <button
          onClick={() => setHideTicker(!hideTicker)}
          className="icon-btn"
          style={{ background: 'transparent', border: 'none', color: hideTicker ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title={hideTicker ? "Show Tickers" : "Hide Tickers"}
        >
          {hideTicker ? <EyeOff size={24} /> : <Eye size={24} />}
        </button>
      </div>
    </div>
  );
}

export default App;
