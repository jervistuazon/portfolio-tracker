import { useState } from 'react';
import { X, Save } from 'lucide-react';
import './AddPositionModal.css';

export default function AddPositionModal({ symbol, onClose, onSave, initialData = null }) {
    const [quantity, setQuantity] = useState(initialData ? initialData.quantity : '');
    const [avgCost, setAvgCost] = useState(initialData ? initialData.avgCost : '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!quantity || !avgCost) return;

        onSave({
            symbol,
            quantity: parseFloat(quantity),
            avgCost: parseFloat(avgCost)
        });
        onClose();
    };

    const isEditing = !!initialData;

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit' : 'Add'} {symbol}</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Number of Shares</label>
                        <input
                            type="number"
                            step="any"
                            placeholder="e.g. 10.5"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Average Cost per Share ($)</label>
                        <input
                            type="number"
                            step="any"
                            placeholder="e.g. 150.25"
                            value={avgCost}
                            onChange={e => setAvgCost(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="save-btn">
                        <Save size={18} />
                        <span>{isEditing ? 'Update Position' : 'Start Tracking'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
