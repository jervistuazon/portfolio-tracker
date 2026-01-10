const BASE_URL = 'https://finnhub.io/api/v1';

export const getApiKey = () => localStorage.getItem('finnhub_api_key');
export const setApiKey = (key) => localStorage.setItem('finnhub_api_key', key);

// Rate limiting queue
const queue = [];
let processing = false;

const processQueue = async () => {
    if (processing) return;
    if (queue.length === 0) return;

    processing = true;
    const { resolve, reject, endpoint, attempt } = queue.shift();

    try {
        const key = getApiKey();
        if (!key) throw new Error('API_KEY_MISSING');

        const symbol = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${symbol}token=${key}`;

        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 429) {
                // Too many requests - retry
                if (attempt < 3) {
                    // Put back at front of queue with incremented attempt
                    console.warn(`Rate limited for ${endpoint}. Retrying... (${attempt + 1}/3)`);
                    queue.unshift({ resolve, reject, endpoint, attempt: attempt + 1 });
                    // Wait longer before processing next
                    setTimeout(() => {
                        processing = false;
                        processQueue();
                    }, 2000);
                    return;
                } else {
                    throw new Error('RATE_LIMIT_EXCEEDED');
                }
            }
            if (response.status === 401 || response.status === 403) {
                throw new Error('INVALID_API_KEY');
            }
            throw new Error(`NETWORK_ERROR: ${response.status}`);
        }

        const data = await response.json();
        resolve(data);

    } catch (error) {
        reject(error);
    }

    // Delay before next request to respect rate limit (60 req/min = 1 req/sec)
    setTimeout(() => {
        processing = false;
        processQueue();
    }, 1000);
};

const fetchWithKey = (endpoint) => new Promise((resolve, reject) => {
    queue.push({ resolve, reject, endpoint, attempt: 1 });
    processQueue();
});

export const searchStocks = async (query) => {
    if (!query) return [];
    const data = await fetchWithKey(`/search?q=${query}`);
    return data.result || [];
};

export const getStockQuote = async (symbol) => {
    return await fetchWithKey(`/quote?symbol=${symbol}`);
};

export const getCompanyProfile = async (symbol) => {
    return await fetchWithKey(`/stock/profile2?symbol=${symbol}`);
}

export const getStockCandles = async (symbol, resolution, from, to) => {
    return await fetchWithKey(`/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`);
};
