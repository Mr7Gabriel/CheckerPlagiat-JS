// utils.js - Utility Functions for Advanced Plagiarism Checker

const Utils = {
    // Show alert messages
    showAlert: function(message, type = 'info', duration = 8000) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <div>${message}</div>
            <button class="alert-close" onclick="this.parentElement.remove()">×</button>
        `;

        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(alert, mainContent.firstChild);

        setTimeout(() => {
            if (alert.parentElement) {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            }
        }, duration);
    },

    // Get file icon based on extension
    getFileIcon: function(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'txt': '📝', 'pdf': '📄', 'doc': '📘',
            'docx': '📘', 'odt': '📄', 'rtf': '📄'
        };
        return icons[ext] || '📄';
    },

    // Get similarity color based on percentage
    getSimilarityColor: function(percentage) {
        if (percentage >= 80) return '#e74c3c';
        if (percentage >= 50) return '#e67e22';
        if (percentage >= 25) return '#f39c12';
        return '#27ae60';
    },

    // Get status color
    getStatusColor: function(status) {
        switch (status) {
            case 'AMAN': return '#27ae60';
            case 'PLAGIAT RENDAH': return '#f39c12';
            case 'PLAGIAT SEDANG': return '#e67e22';
            case 'PLAGIAT TINGGI': return '#e74c3c';
            default: return '#7f8c8d';
        }
    },

    // Get priority color for recommendations
    getPriorityColor: function(priority) {
        switch (priority.toUpperCase()) {
            case 'WAJIB': case 'KRITIS': case 'TINGGI': return '#e74c3c';
            case 'SEDANG': case 'MEDIUM': return '#f39c12';
            case 'RENDAH': case 'LOW': return '#27ae60';
            default: return '#3498db';
        }
    },

    // Format file size
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Format date
    formatDate: function(dateString) {
        return new Date(dateString).toLocaleString('id-ID');
    },

    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    // Deep clone object
    deepClone: function(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === "object") {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
    },

    // Generate unique ID
    generateId: function() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    },

    // Validate file type
    validateFileType: function(file) {
        const allowedTypes = [
            'text/plain',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.oasis.opendocument.text',
            'application/rtf',
            'text/rtf'
        ];
        
        const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.odt', '.rtf'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    },

    // Validate file size
    validateFileSize: function(file, maxSize = 10 * 1024 * 1024) { // 10MB default
        return file.size <= maxSize;
    },

    // Escape HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Truncate text
    truncateText: function(text, length = 100) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    // Copy to clipboard
    copyToClipboard: function(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text).then(() => {
                this.showAlert('✅ Teks berhasil disalin ke clipboard!', 'success', 3000);
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showAlert('✅ Teks berhasil disalin ke clipboard!', 'success', 3000);
            } catch (err) {
                this.showAlert('❌ Gagal menyalin teks ke clipboard', 'error');
            }
            document.body.removeChild(textArea);
        }
    },

    // Local storage helpers
    storage: {
        set: function(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Failed to save to localStorage:', e);
                return false;
            }
        },

        get: function(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Failed to read from localStorage:', e);
                return defaultValue;
            }
        },

        remove: function(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Failed to remove from localStorage:', e);
                return false;
            }
        },

        clear: function() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.error('Failed to clear localStorage:', e);
                return false;
            }
        }
    },

    // Animation helpers
    animate: {
        fadeIn: function(element, duration = 300) {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            let start = null;
            function step(timestamp) {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                element.style.opacity = Math.min(progress / duration, 1);
                if (progress < duration) {
                    requestAnimationFrame(step);
                }
            }
            requestAnimationFrame(step);
        },

        fadeOut: function(element, duration = 300) {
            let start = null;
            function step(timestamp) {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                element.style.opacity = Math.max(1 - progress / duration, 0);
                if (progress < duration) {
                    requestAnimationFrame(step);
                } else {
                    element.style.display = 'none';
                }
            }
            requestAnimationFrame(step);
        },

        slideDown: function(element, duration = 300) {
            element.style.maxHeight = '0';
            element.style.overflow = 'hidden';
            element.style.display = 'block';
            
            const targetHeight = element.scrollHeight;
            let start = null;
            
            function step(timestamp) {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const currentHeight = Math.min((progress / duration) * targetHeight, targetHeight);
                element.style.maxHeight = currentHeight + 'px';
                
                if (progress < duration) {
                    requestAnimationFrame(step);
                } else {
                    element.style.maxHeight = '';
                    element.style.overflow = '';
                }
            }
            requestAnimationFrame(step);
        }
    },

    // Performance monitoring
    performance: {
        mark: function(name) {
            if (window.performance && window.performance.mark) {
                window.performance.mark(name);
            }
        },

        measure: function(name, startMark, endMark) {
            if (window.performance && window.performance.measure) {
                window.performance.measure(name, startMark, endMark);
                const measures = window.performance.getEntriesByName(name);
                if (measures.length > 0) {
                    console.log(`${name}: ${measures[0].duration.toFixed(2)}ms`);
                    return measures[0].duration;
                }
            }
            return 0;
        },

        now: function() {
            return window.performance && window.performance.now ? window.performance.now() : Date.now();
        }
    },

    // Device detection
    device: {
        isMobile: function() {
            return window.innerWidth <= 768;
        },

        isTablet: function() {
            return window.innerWidth > 768 && window.innerWidth <= 1024;
        },

        isDesktop: function() {
            return window.innerWidth > 1024;
        },

        hasTouch: function() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
    },

    // URL helpers
    url: {
        getParams: function() {
            const params = {};
            const urlParams = new URLSearchParams(window.location.search);
            for (const [key, value] of urlParams) {
                params[key] = value;
            }
            return params;
        },

        setParam: function(key, value) {
            const url = new URL(window.location);
            url.searchParams.set(key, value);
            window.history.pushState({}, '', url);
        },

        removeParam: function(key) {
            const url = new URL(window.location);
            url.searchParams.delete(key);
            window.history.pushState({}, '', url);
        }
    },

    // Text processing helpers
    text: {
        removeAccents: function(str) {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        },

        slugify: function(str) {
            return str
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        },

        capitalize: function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        camelCase: function(str) {
            return str.replace(/-([a-z])/g, function(g) {
                return g[1].toUpperCase();
            });
        },

        wordCount: function(str) {
            return str.trim().split(/\s+/).length;
        },

        charCount: function(str, includeSpaces = true) {
            return includeSpaces ? str.length : str.replace(/\s/g, '').length;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.Utils = Utils;
}