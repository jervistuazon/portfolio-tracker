import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import '../styles/VersionCheck.css'; // We'll create this CSS file

const VersionCheck = () => {
    const [hasUpdate, setHasUpdate] = useState(false);
    const [currentVersion, setCurrentVersion] = useState(null);

    useEffect(() => {
        // 1. Get the initial version when the app loads
        const checkInitialVersion = async () => {
            try {
                const response = await fetch('/portfolio-tracker/version.json?t=' + new Date().getTime());
                if (response.ok) {
                    const data = await response.json();
                    setCurrentVersion(data.version);
                }
            } catch (error) {
                console.error("Failed to fetch initial version", error);
            }
        };

        checkInitialVersion();
    }, []);

    useEffect(() => {
        // 2. Poll for updates every minute
        const interval = setInterval(async () => {
            if (!currentVersion) return; // Don't check if we don't have a base version

            try {
                const response = await fetch('/portfolio-tracker/version.json?t=' + new Date().getTime());
                if (response.ok) {
                    const data = await response.json();
                    // If the fetched version is DIFFERENT from our initial version, an update is available
                    if (data.version && data.version !== currentVersion) {
                        setHasUpdate(true);
                    }
                }
            } catch (error) {
                // Silently fail on network errors during polling
            }
        }, 60000); // Check every 60 seconds

        return () => clearInterval(interval);
    }, [currentVersion]);

    const handleUpdate = () => {
        // Force reload ignoring cache
        window.location.reload(true);
    };

    if (!hasUpdate) return null;

    return (
        <div className="version-update-toast">
            <div className="version-update-content">
                <RefreshCw className="spin-icon" size={20} />
                <span>New update available!</span>
            </div>
            <button onClick={handleUpdate} className="update-button">
                Refresh
            </button>
        </div>
    );
};

export default VersionCheck;
