import { useState } from 'react';
import { setApiKey } from '../services/api';
import './ApiKeyInput.css';

export default function ApiKeyInput({ onSave }) {
    const [key, setKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (key.length < 10) {
            setError('That looks too short to be a valid key.');
            return;
        }
        setApiKey(key);
        onSave();
    };

    return (
        <div className="api-key-overlay">
            <div className="api-key-card">
                <h2>Welcome to Stock Tracker</h2>
                <p>To get free stock data, we need a key from Finnhub.</p>
                <ol>
                    <li>Go to <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">finnhub.io</a></li>
                    <li>Copy your free API Key</li>
                    <li>Paste it below</li>
                </ol>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Paste your API Key here"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                    />
                    {error && <div className="error">{error}</div>}
                    <button type="submit">Start Tracking</button>
                </form>
            </div>
        </div>
    );
}
