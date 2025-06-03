// app.js - Main Application Logic for Advanced Plagiarism Checker

// Global application state and configuration
const App = {
    // Application state
    state: {
        currentTab: 'check',
        selectedFile: null,
        currentHistoryPage: 1,
        selectedHistoryIds: [],
        downloadHistoryId: null,
        isLoading: false,
        user: {
            preferences: Utils.storage.get('userPreferences', {
                theme: 'light',
                language: 'id',
                autoSave: true,
                notifications: true
            })
        }
    },

    // Configuration
    config: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['.txt', '.pdf', '.doc', '.docx', '.odt', '.rtf'],
        autoSaveInterval: 30000, // 30 seconds
        healthCheckInterval: 60000, // 1 minute
        cacheExpiry: 5 * 60 * 1000 // 5 minutes
    },

    // Initialize application
    init: function() {
        console.log('🚀 Initializing Advanced Plagiarism Checker v2.1...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            // Performance monitoring
            Utils.performance.mark('app-init-start');

            // Load user preferences
            this.loadUserPreferences();

            // Initialize components
            this.initializeComponents();

            // Set up event listeners
            this.setupEventListeners();

            // Load initial data
            this.loadInitialData();

            // Start background tasks
            this.startBackgroundTasks();

            // Performance monitoring
            Utils.performance.mark('app-init-end');
            Utils.performance.measure('app-init', 'app-init-start', 'app-init-end');

            console.log('✅ Application initialized successfully!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Show welcome message for first-time users
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            Utils.showAlert('Gagal menginisialisasi aplikasi. Silakan refresh halaman.', 'error');
        }
    },

    // Load user preferences
    loadUserPreferences: function() {
        const preferences = this.state.user.preferences;
        
        // Apply theme
        if (preferences.theme === 'dark') {
            document.body.classList.add('dark-mode');
        }

        // Apply language
        if (preferences.language !== 'id') {
            // Language switching logic can be added here
            console.log(`Language preference: ${preferences.language}`);
        }

        console.log('✅ User preferences loaded');
    },

    // Initialize all components
    initializeComponents: function() {
        console.log('🧩 Loading components...');

        // Load each component
        const components = [
            'Header',
            'Navigation', 
            'PlagiarismChecker',
            'HistoryAnalytics',
            'ReferenceManager',
            'Dashboard',
            'About',
            'Modals',
            'AIThinking'
        ];

        components.forEach(componentName => {
            try {
                const component = window[`${componentName}Component`];
                if (component && typeof component.render === 'function') {
                    component.render();
                    console.log(`   ✅ ${componentName} component loaded`);
                } else {
                    console.warn(`   ⚠️ ${componentName} component not found or invalid`);
                }
            } catch (error) {
                console.error(`   ❌ Failed to load ${componentName} component:`, error);
            }
        });

        // Initialize modals
        if (window.ModalsComponent) {
            window.ModalsComponent.init();
        }

        console.log('✅ Components initialized');
    },

    // Set up global event listeners
    setupEventListeners: function() {
        console.log('🎧 Setting up event listeners...');

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Window events
        window.addEventListener('resize', Utils.debounce(this.handleResize.bind(this), 250));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));

        // Modal click outside to close
        window.addEventListener('click', this.handleModalClick.bind(this));

        // Drag and drop support
        this.setupDragAndDrop();

        // Visibility change (tab switching)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Error handling
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

        console.log('✅ Event listeners configured');
    },

    // Handle keyboard shortcuts
    handleKeyboardShortcuts: function(e) {
        // Ctrl+Enter to check plagiarism
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (window.PlagiarismCheckerComponent) {
                window.PlagiarismCheckerComponent.checkPlagiarism();
            }
        }
        
        // Escape to close modals and clear input
        if (e.key === 'Escape') {
            this.closeAllModals();
            if (window.PlagiarismCheckerComponent) {
                window.PlagiarismCheckerComponent.clearInput();
            }
        }

        // Alt+Number for tab navigation
        if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            const tabMap = {
                '1': 'check',
                '2': 'history', 
                '3': 'reference',
                '4': 'dashboard',
                '5': 'about'
            };
            
            if (tabMap[e.key]) {
                e.preventDefault();
                this.showTab(tabMap[e.key]);
            }
        }

        // Ctrl+R to refresh current tab data
        if (e.ctrlKey && e.key === 'r' && !e.shiftKey) {
            e.preventDefault();
            this.refreshCurrentTab();
        }

        // Ctrl+S to save (prevent default, implement auto-save)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.saveUserPreferences();
            Utils.showAlert('💾 Pengaturan tersimpan otomatis', 'info', 2000);
        }
    },

    // Handle window resize
    handleResize: function() {
        const isMobile = Utils.device.isMobile();
        document.body.classList.toggle('mobile-view', isMobile);
        
        // Adjust layout for mobile
        if (isMobile) {
            this.adjustMobileLayout();
        } else {
            this.adjustDesktopLayout();
        }

        // Update charts/visualizations if needed
        this.updateResponsiveElements();
    },

    // Handle before unload (save state)
    handleBeforeUnload: function(e) {
        if (this.state.isLoading) {
            e.preventDefault();
            e.returnValue = 'Ada proses yang sedang berjalan. Yakin ingin meninggalkan halaman?';
            return e.returnValue;
        }

        // Save user state
        this.saveUserState();
    },

    // Handle online/offline status
    handleOnline: function() {
        Utils.showAlert('🌐 Koneksi internet tersambung kembali!', 'success', 3000);
        document.body.classList.remove('offline');
        
        // Retry failed requests
        this.retryFailedRequests();
    },

    handleOffline: function() {
        Utils.showAlert('⚠️ Koneksi internet terputus. Beberapa fitur mungkin tidak tersedia.', 'warning');
        document.body.classList.add('offline');
    },

    // Handle modal clicks
    handleModalClick: function(e) {
        if (e.target.classList.contains('modal')) {
            this.closeAllModals();
        }
    },

    // Handle visibility change
    handleVisibilityChange: function() {
        if (document.hidden) {
            // Page is hidden - pause non-essential operations
            this.pauseBackgroundTasks();
        } else {
            // Page is visible - resume operations
            this.resumeBackgroundTasks();
            this.refreshCurrentTab();
        }
    },

    // Global error handler
    handleGlobalError: function(e) {
        console.error('Global error:', e.error);
        Utils.showAlert('⚠️ Terjadi kesalahan aplikasi. Silakan refresh halaman jika masalah berlanjut.', 'error');
        
        // Send error report (if analytics enabled)
        this.reportError('javascript-error', e.error);
    },

    // Unhandled promise rejection handler
    handleUnhandledRejection: function(e) {
        console.error('Unhandled promise rejection:', e.reason);
        Utils.showAlert('⚠️ Terjadi kesalahan dalam pemrosesan. Silakan coba lagi.', 'error');
        
        // Send error report
        this.reportError('promise-rejection', e.reason);
    },

    // Setup drag and drop functionality
    setupDragAndDrop: function() {
        const uploadSections = document.querySelectorAll('.upload-section');
        
        uploadSections.forEach(section => {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                section.addEventListener(eventName, this.preventDefaults, false);
            });

            // Highlight drop area
            ['dragenter', 'dragover'].forEach(eventName => {
                section.addEventListener(eventName, () => this.highlight(section), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                section.addEventListener(eventName, () => this.unhighlight(section), false);
            });

            // Handle dropped files
            section.addEventListener('drop', (e) => this.handleDrop(e, section), false);
        });
    },

    // Drag and drop helpers
    preventDefaults: function(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    highlight: function(section) {
        section.style.borderColor = '#3498db';
        section.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
        section.style.transform = 'scale(1.02)';
    },

    unhighlight: function(section) {
        section.style.borderColor = '#3498db';
        section.style.backgroundColor = '#f8f9fa';
        section.style.transform = 'scale(1)';
    },

    handleDrop: function(e, section) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const targetInput = section.querySelector('input[type="file"]');
            if (targetInput) {
                // Validate file
                const file = files[0];
                if (this.validateFile(file)) {
                    targetInput.files = files;
                    const event = new Event('change', { bubbles: true });
                    targetInput.dispatchEvent(event);
                    
                    Utils.showAlert(`📁 File "${file.name}" siap untuk diproses!`, 'success');
                } else {
                    Utils.showAlert('❌ File tidak valid atau terlalu besar!', 'error');
                }
            }
        }
    },

    // Load initial data
    loadInitialData: function() {
        console.log('📊 Loading initial data...');

        // Load data for each component
        const loadPromises = [];

        // Load reference documents
        if (window.ReferenceManagerComponent) {
            loadPromises.push(
                window.ReferenceManagerComponent.loadDocuments().catch(e => 
                    console.warn('Failed to load reference documents:', e)
                )
            );
        }

        // Load history
        if (window.HistoryAnalyticsComponent) {
            loadPromises.push(
                window.HistoryAnalyticsComponent.loadHistory().catch(e => 
                    console.warn('Failed to load history:', e)
                )
            );
        }

        // Load dashboard stats
        if (window.DashboardComponent) {
            loadPromises.push(
                window.DashboardComponent.loadStats().catch(e => 
                    console.warn('Failed to load dashboard stats:', e)
                )
            );
        }

        Promise.allSettled(loadPromises).then(results => {
            const successful = results.filter(r => r.status === 'fulfilled').length;
            console.log(`✅ Initial data loaded (${successful}/${results.length} successful)`);
        });
    },

    // Start background tasks
    startBackgroundTasks: function() {
        console.log('⚙️ Starting background tasks...');

        // Auto-save user preferences
        this.autoSaveInterval = setInterval(() => {
            if (this.state.user.preferences.autoSave) {
                this.saveUserPreferences();
            }
        }, this.config.autoSaveInterval);

        // Health check
        this.healthCheckInterval = setInterval(async () => {
            const health = await API.healthCheck();
            if (health.status === 'unhealthy') {
                console.warn('Health check failed:', health.error);
            }
        }, this.config.healthCheckInterval);

        // Cache cleanup
        this.cacheCleanupInterval = setInterval(() => {
            API.cache.clear();
        }, this.config.cacheExpiry);

        console.log('✅ Background tasks started');
    },

    // Pause background tasks
    pauseBackgroundTasks: function() {
        clearInterval(this.autoSaveInterval);
        clearInterval(this.healthCheckInterval);
        clearInterval(this.cacheCleanupInterval);
    },

    // Resume background tasks
    resumeBackgroundTasks: function() {
        this.startBackgroundTasks();
    },

    // Show tab
    showTab: function(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        const tabContent = document.getElementById(tabName + '-tab');
        const tabButton = document.querySelector(`[onclick*="showTab('${tabName}')"]`);
        
        if (tabContent) {
            tabContent.classList.add('active');
        }
        if (tabButton) {
            tabButton.classList.add('active');
        }
        
        // Update current tab
        this.state.currentTab = tabName;

        // Load data when specific tabs are opened
        this.handleTabLoad(tabName);

        // Save state
        Utils.storage.set('lastActiveTab', tabName);
    },

    // Handle tab-specific loading
    handleTabLoad: function(tabName) {
        switch(tabName) {
            case 'reference':
                if (window.ReferenceManagerComponent) {
                    window.ReferenceManagerComponent.loadDocuments();
                }
                break;
            case 'history':
                if (window.HistoryAnalyticsComponent) {
                    window.HistoryAnalyticsComponent.loadHistory();
                }
                break;
            case 'dashboard':
                if (window.DashboardComponent) {
                    window.DashboardComponent.loadStats();
                }
                break;
        }
    },

    // Refresh current tab data
    refreshCurrentTab: function() {
        this.handleTabLoad(this.state.currentTab);
        Utils.showAlert('🔄 Data refreshed!', 'success', 2000);
    },

    // Close all modals
    closeAllModals: function() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    },

    // Validate file
    validateFile: function(file) {
        // Check file size
        if (!Utils.validateFileSize(file, this.config.maxFileSize)) {
            Utils.showAlert(`File terlalu besar! Maksimal ${Utils.formatFileSize(this.config.maxFileSize)}`, 'error');
            return false;
        }

        // Check file type
        if (!Utils.validateFileType(file)) {
            Utils.showAlert(`Format file tidak didukung! Gunakan: ${this.config.allowedFileTypes.join(', ')}`, 'error');
            return false;
        }

        return true;
    },

    // Save user preferences
    saveUserPreferences: function() {
        Utils.storage.set('userPreferences', this.state.user.preferences);
    },

    // Save user state
    saveUserState: function() {
        const state = {
            currentTab: this.state.currentTab,
            timestamp: Date.now()
        };
        Utils.storage.set('userState', state);
    },

    // Load user state
    loadUserState: function() {
        const state = Utils.storage.get('userState');
        if (state && state.timestamp > Date.now() - 24 * 60 * 60 * 1000) { // 24 hours
            this.showTab(state.currentTab);
        }
    },

    // Show welcome message
    showWelcomeMessage: function() {
        if (!Utils.storage.get('hasVisited')) {
            setTimeout(() => {
                Utils.showAlert('🎉 Selamat datang di Advanced Plagiarism Checker v2.1! Gunakan Alt+1-5 untuk navigasi cepat, dan Ctrl+Enter untuk cek plagiat.', 'info', 10000);
                Utils.storage.set('hasVisited', true);
            }, 2000);
        }
    },

    // Adjust layout for mobile
    adjustMobileLayout: function() {
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            tabs.style.flexDirection = 'column';
        }

        // Adjust modal sizes
        document.querySelectorAll('.modal-content').forEach(modal => {
            modal.style.width = '95%';
            modal.style.margin = '2% auto';
        });
    },

    // Adjust layout for desktop
    adjustDesktopLayout: function() {
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            tabs.style.flexDirection = 'row';
        }

        // Reset modal sizes
        document.querySelectorAll('.modal-content').forEach(modal => {
            modal.style.width = '';
            modal.style.margin = '';
        });
    },

    // Update responsive elements
    updateResponsiveElements: function() {
        // Update any charts or visualizations that need to be redrawn
        const event = new Event('resize');
        document.dispatchEvent(event);
    },

    // Retry failed requests
    retryFailedRequests: function() {
        // Implementation for retrying failed API calls
        console.log('🔄 Retrying failed requests...');
    },

    // Report error for analytics
    reportError: function(type, error) {
        if (this.state.user.preferences.analytics) {
            console.log(`📊 Error reported: ${type}`, error);
            // Send to analytics service if configured
        }
    },

    // Utility functions
    utils: {
        // Show loading state
        showLoading: function(message = 'Loading...') {
            App.state.isLoading = true;
            // Implementation for global loading indicator
        },

        // Hide loading state
        hideLoading: function() {
            App.state.isLoading = false;
            // Implementation for hiding global loading indicator
        },

        // Get current user
        getCurrentUser: function() {
            return App.state.user;
        },

        // Update user preferences
        updatePreferences: function(newPreferences) {
            App.state.user.preferences = { ...App.state.user.preferences, ...newPreferences };
            App.saveUserPreferences();
        }
    },

    // Cleanup function
    destroy: function() {
        console.log('🧹 Cleaning up application...');
        
        // Clear intervals
        clearInterval(this.autoSaveInterval);
        clearInterval(this.healthCheckInterval);
        clearInterval(this.cacheCleanupInterval);

        // Save final state
        this.saveUserState();
        this.saveUserPreferences();

        // Clear cache
        API.cache.clear();

        console.log('✅ Application cleanup completed');
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    App.destroy();
});

// Export for global access
window.App = App;

// Development helpers (only in development mode)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.DevTools = {
        // Get application state
        getState: () => App.state,
        
        // Get configuration
        getConfig: () => App.config,
        
        // Force refresh all data
        refreshAll: () => {
            App.loadInitialData();
            Utils.showAlert('🔄 All data refreshed!', 'info');
        },
        
        // Clear all storage
        clearStorage: () => {
            Utils.storage.clear();
            Utils.showAlert('🗑️ Storage cleared!', 'info');
        },
        
        // Simulate offline
        goOffline: () => {
            App.handleOffline();
        },
        
        // Simulate online
        goOnline: () => {
            App.handleOnline();
        }
    };
    
    console.log('🛠️ Development tools available: window.DevTools');
}