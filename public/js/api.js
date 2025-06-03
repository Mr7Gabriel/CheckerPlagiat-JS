// api.js - API Communication for Advanced Plagiarism Checker

const API = {
    // Base configuration
    baseURL: '',
    timeout: 30000, // 30 seconds default timeout

    // Generic API request handler
    request: async function(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: this.timeout
        };

        const config = { ...defaultOptions, ...options };
        
        // Handle FormData (for file uploads)
        if (config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        try {
            Utils.performance.mark('api-request-start');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);
            
            const response = await fetch(this.baseURL + url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            Utils.performance.mark('api-request-end');
            Utils.performance.measure('api-request', 'api-request-start', 'api-request-end');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle different response types
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else if (contentType && contentType.includes('text/')) {
                return await response.text();
            } else {
                return await response.blob();
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            console.error('API request error:', error);
            throw error;
        }
    },

    // Plagiarism checking
    plagiarism: {
        check: async function(data) {
            const formData = new FormData();
            
            if (data.file) {
                formData.append('targetFile', data.file);
            } else if (data.text) {
                formData.append('text', data.text);
            }

            return await API.request('/check-plagiarism', {
                method: 'POST',
                body: formData
            });
        },

        downloadReport: async function(historyId, format = 'html') {
            const response = await fetch(`/api/download-result/${historyId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ format })
            });

            if (!response.ok) {
                throw new Error('Failed to download report');
            }

            return response;
        }
    },

    // Reference documents management
    reference: {
        upload: async function(file) {
            const formData = new FormData();
            formData.append('referenceFile', file);

            return await API.request('/upload-reference', {
                method: 'POST',
                body: formData
            });
        },

        getAll: async function() {
            return await API.request('/reference-documents');
        },

        delete: async function(id) {
            return await API.request(`/reference-documents/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // History management
    history: {
        getAll: async function(page = 1, limit = 10) {
            return await API.request(`/check-history?page=${page}&limit=${limit}`);
        },

        getById: async function(id) {
            return await API.request(`/check-history/${id}`);
        },

        delete: async function(id) {
            return await API.request(`/check-history/${id}`, {
                method: 'DELETE'
            });
        },

        clear: async function() {
            return await API.request('/check-history', {
                method: 'DELETE'
            });
        },

        export: async function(format = 'csv') {
            const response = await fetch(`/api/export-history?format=${format}`);
            
            if (!response.ok) {
                throw new Error('Failed to export history');
            }

            return response;
        }
    },

    // Dashboard and analytics
    dashboard: {
        getStats: async function() {
            return await API.request('/api/dashboard-stats');
        },

        getPatternRecommendations: async function() {
            return await API.request('/api/pattern-recommendations');
        },

        deepAnalysis: async function(historyIds) {
            return await API.request('/api/deep-analysis', {
                method: 'POST',
                body: JSON.stringify({ historyIds })
            });
        }
    },

    // Application info
    info: {
        get: async function() {
            return await API.request('/api/info');
        }
    },

    // Error handling utilities
    handleError: function(error, context = '') {
        console.error(`API Error${context ? ` (${context})` : ''}:`, error);
        
        let message = 'Terjadi kesalahan saat berkomunikasi dengan server.';
        
        if (error.message.includes('timeout')) {
            message = 'Request timeout. Silakan coba lagi.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            message = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
        } else if (error.message.includes('HTTP error! status: 400')) {
            message = 'Request tidak valid. Periksa data yang dikirim.';
        } else if (error.message.includes('HTTP error! status: 404')) {
            message = 'Resource tidak ditemukan.';
        } else if (error.message.includes('HTTP error! status: 500')) {
            message = 'Terjadi kesalahan server internal.';
        } else if (error.message) {
            message = error.message;
        }

        Utils.showAlert(`❌ ${message}`, 'error');
        return message;
    },

    // Retry mechanism
    retry: async function(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                console.warn(`API retry ${i + 1}/${maxRetries} failed:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    },

    // Progress tracking for large uploads
    uploadWithProgress: function(url, formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    if (onProgress) {
                        onProgress(percentComplete);
                    }
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`HTTP error! status: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });

            xhr.addEventListener('timeout', () => {
                reject(new Error('Request timeout'));
            });

            xhr.timeout = this.timeout;
            xhr.open('POST', this.baseURL + url);
            xhr.send(formData);
        });
    },

    // Batch operations
    batch: {
        deleteHistory: async function(ids) {
            const promises = ids.map(id => API.history.delete(id));
            const results = await Promise.allSettled(promises);
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            return {
                successful,
                failed,
                results
            };
        },

        deleteReferences: async function(ids) {
            const promises = ids.map(id => API.reference.delete(id));
            const results = await Promise.allSettled(promises);
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            return {
                successful,
                failed,
                results
            };
        }
    },

    // Cache management
    cache: {
        data: new Map(),
        ttl: new Map(),
        defaultTTL: 5 * 60 * 1000, // 5 minutes

        set: function(key, value, ttl = this.defaultTTL) {
            this.data.set(key, value);
            this.ttl.set(key, Date.now() + ttl);
        },

        get: function(key) {
            if (this.ttl.has(key) && Date.now() > this.ttl.get(key)) {
                this.data.delete(key);
                this.ttl.delete(key);
                return null;
            }
            return this.data.get(key) || null;
        },

        has: function(key) {
            return this.get(key) !== null;
        },

        clear: function() {
            this.data.clear();
            this.ttl.clear();
        },

        delete: function(key) {
            this.data.delete(key);
            this.ttl.delete(key);
        }
    },

    // Cached API calls
    cachedRequest: async function(url, options = {}, cacheKey = null, ttl = null) {
        const key = cacheKey || `${options.method || 'GET'}_${url}_${JSON.stringify(options.body || {})}`;
        
        // Return cached data if available
        if (this.cache.has(key)) {
            console.log('Returning cached data for:', key);
            return this.cache.get(key);
        }

        try {
            const result = await this.request(url, options);
            
            // Cache successful GET requests
            if (!options.method || options.method === 'GET') {
                this.cache.set(key, result, ttl);
            }
            
            return result;
        } catch (error) {
            throw error;
        }
    },

    // Health check
    healthCheck: async function() {
        try {
            const response = await this.request('/api/info');
            return {
                status: 'healthy',
                data: response
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    },

    // Initialize API module
    init: function() {
        console.log('🔌 API module initialized');
        
        // Set up periodic health checks
        setInterval(async () => {
            const health = await this.healthCheck();
            if (health.status === 'unhealthy') {
                console.warn('API health check failed:', health.error);
            }
        }, 60000); // Check every minute

        // Clear cache periodically
        setInterval(() => {
            const now = Date.now();
            for (const [key, expiry] of this.cache.ttl.entries()) {
                if (now > expiry) {
                    this.cache.delete(key);
                }
            }
        }, 30000); // Cleanup every 30 seconds
    }
};

// Initialize API when loaded
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        API.init();
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
} else {
    window.API = API;
}   