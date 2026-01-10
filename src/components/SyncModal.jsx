import { useState } from 'react';
import { X, Download, Upload, FileText } from 'lucide-react';
import './SyncModal.css';

export default function SyncModal({ portfolio, onClose, onImport }) {
    const [mode, setMode] = useState('export'); // 'export' | 'import'

    // CSV Download Logic
    const handleDownloadCSV = () => {
        if (!portfolio || portfolio.length === 0) {
            alert("No data to export!");
            return;
        }

        // 1. Define Headers
        const headers = ["Symbol", "Quantity", "AvgCost"];

        // 2. Map Data
        const rows = portfolio.map(p => [
            p.symbol,
            p.quantity,
            p.avgCost
        ]);

        // 3. Combine to CSV String
        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        // 4. Create Blob and Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "portfolio_backup.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CSV Import Logic
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n');

                // Expect header: Symbol,Quantity,AvgCost
                // We'll skip the first line (header)
                const data = [];

                // Start from index 1 to skip header
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const [symbol, quantity, avgCost] = line.split(',');

                    if (symbol && quantity && avgCost) {
                        data.push({
                            symbol: symbol.trim(),
                            quantity: parseFloat(quantity),
                            avgCost: parseFloat(avgCost)
                        });
                    }
                }

                if (data.length === 0) {
                    throw new Error("No valid data found in CSV.");
                }

                onImport(data);
                onClose();
                alert(`Successfully imported ${data.length} positions.`);

            } catch (err) {
                alert("Error parsing CSV: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target.className === 'modal-overlay') onClose();
        }}>
            <div className="modal-card sync-modal">
                <div className="modal-header">
                    <h2>CSV Sync</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="sync-tabs">
                    <button
                        className={`tab-btn ${mode === 'export' ? 'active' : ''}`}
                        onClick={() => setMode('export')}
                    >
                        Export CSV
                    </button>
                    <button
                        className={`tab-btn ${mode === 'import' ? 'active' : ''}`}
                        onClick={() => setMode('import')}
                    >
                        Import CSV
                    </button>
                </div>

                {mode === 'export' ? (
                    <div className="sync-content" style={{ textAlign: 'center', padding: '20px 0' }}>
                        <FileText size={48} color="#555" style={{ margin: '0 auto 20px', display: 'block' }} />
                        <p className="info-text" style={{ marginBottom: '20px' }}>
                            Download your portfolio as a <code>.csv</code> file. <br />
                            You can save this as a backup or open it in Excel.
                        </p>
                        <button className="action-btn primary" onClick={handleDownloadCSV}>
                            <Download size={18} />
                            Download CSV
                        </button>
                    </div>
                ) : (
                    <div className="sync-content" style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Upload size={48} color="#555" style={{ margin: '0 auto 20px', display: 'block' }} />
                        <p className="info-text" style={{ marginBottom: '20px' }}>
                            Select a <code>.csv</code> file to load your portfolio.
                        </p>

                        <input
                            type="file"
                            accept=".csv"
                            id="csv-upload"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <button
                            className="action-btn secondary"
                            onClick={() => document.getElementById('csv-upload').click()}
                        >
                            <Upload size={18} />
                            Select File
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
