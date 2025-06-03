// components/navigation.js - Navigation Component

const NavigationComponent = {
    // Component configuration
    config: {
        tabs: [
            { 
                id: 'check', 
                icon: '🔍', 
                label: 'Cek Plagiat', 
                description: 'Periksa dokumen dengan AI analysis',
                shortcut: 'Alt+1'
            },
            { 
                id: 'history', 
                icon: '📊', 
                label: 'History & Analytics', 
                description: 'Riwayat dan analisis pattern',
                shortcut: 'Alt+2'
            },
            { 
                id: 'reference', 
                icon: '📚', 
                label: 'Dokumen Referensi', 
                description: 'Database pembanding dokumen',
                shortcut: 'Alt+3'
            },
            { 
                id: 'dashboard', 
                icon: '📈', 
                label: 'Dashboard', 
                description: 'Overview statistik lengkap',
                shortcut: 'Alt+4'
            },
            { 
                id: 'about', 
                icon: 'ℹ️', 
                label: 'Tentang', 
                description: 'Informasi aplikasi dan fitur',
                shortcut: 'Alt+5'
            }
        ],
        animations: {
            tabSwitch: 300,
            indicator: 200,
            badge: 400
        }
    },

    // Component state
    state: {
        activeTab: 'check',
        previousTab: null,
        tabHistory: ['check'],
        badges: {}, // For notification badges
        isAnimating: false,
        isMobile: false
    },

    // Render navigation component
    render: function() {
        const container = document.getElementById('tab-navigation');
        if (!container) {
            console.warn('Navigation container not found');
            return;
        }

        const navigationHtml = this.generateNavigationHTML();
        container.innerHTML = navigationHtml;
        
        this.attachEventListeners();
        this.initializeIndicator();
        this.updateResponsiveLayout();
        
        console.log('✅ Navigation component rendered');
    },

    // Generate navigation HTML
    generateNavigationHTML: function() {
        const tabsHtml = this.config.tabs.map((tab, index) => {
            const isActive = tab.id === this.state.activeTab;
            const badge = this.state.badges[tab.id];
            const badgeHtml = badge && badge > 0 ? `<span class="tab-badge">${badge}</span>` : '';
            
            return `
                <button 
                    class="tab ${isActive ? 'active' : ''}" 
                    data-tab="${tab.id}"
                    data-index="${index}"
                    onclick="NavigationComponent.showTab('${tab.id}')"
                    title="${tab.description} (${tab.shortcut})"
                    aria-label="${tab.label}"
                    ${isActive ? 'aria-selected="true"' : ''}
                >
                    <span class="tab-icon">${tab.icon}</span>
                    <span class="tab-label">${tab.label}</span>
                    ${badgeHtml}
                </button>
            `;
        }).join('');

        return `
            <div class="tabs-container">
                <div class="tabs" role="tablist" aria-label="Main Navigation">
                    ${tabsHtml}
                    <div class="tab-indicator" id="tab-indicator"></div>
                </div>
                
                <div class="tabs-controls">
                    <button class="tab-control" onclick="NavigationComponent.goToPreviousTab()" title="Previous Tab (Ctrl+Shift+Tab)">
                        ⬅️
                    </button>
                    <button class="tab-control" onclick="NavigationComponent.showTabMenu()" title="Tab Menu">
                        ☰
                    </button>
                    <button class="tab-control" onclick="NavigationComponent.toggleCompactMode()" title="Toggle Compact Mode">
                        📏
                    </button>
                </div>
            </div>
            
            <div class="tab-menu" id="tab-menu" style="display: none;">
                <div class="tab-menu-content">
                    <h4>Quick Navigation</h4>
                    ${this.config.tabs.map(tab => `
                        <div class="tab-menu-item" onclick="NavigationComponent.showTab('${tab.id}')">
                            <span class="menu-icon">${tab.icon}</span>
                            <div class="menu-text">
                                <span class="menu-label">${tab.label}</span>
                                <span class="menu-description">${tab.description}</span>
                                <span class="menu-shortcut">${tab.shortcut}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Attach event listeners
    attachEventListeners: function() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Touch/swipe navigation for mobile
        if (Utils.device.hasTouch()) {
            this.setupTouchNavigation();
        }

        // Tab visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshActiveTab();
            }
        });

        // Resize handler
        window.addEventListener('resize', Utils.debounce(() => {
            this.updateResponsiveLayout();
        }, 250));

        // Click outside tab menu to close
        document.addEventListener('click', (e) => {
            const tabMenu = document.getElementById('tab-menu');
            const menuButton = e.target.closest('[onclick*="showTabMenu"]');
            
            if (tabMenu && !tabMenu.contains(e.target) && !menuButton) {
                this.hideTabMenu();
            }
        });
    },

    // Initialize tab indicator
    initializeIndicator: function() {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            this.moveIndicator(activeTab);
        }
    },

    // Handle keyboard navigation
    handleKeyboardNavigation: function(e) {
        // Tab switching with Ctrl+Tab / Ctrl+Shift+Tab
        if (e.ctrlKey && e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                this.goToPreviousTab();
            } else {
                this.goToNextTab();
            }
        }

        // Tab switching with arrow keys (when tabs have focus)
        if (document.activeElement && document.activeElement.classList.contains('tab')) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateToRelativeTab(-1);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateToRelativeTab(1);
            }
        }

        // Home/End navigation
        if (e.key === 'Home' && e.ctrlKey) {
            e.preventDefault();
            this.showTab(this.config.tabs[0].id);
        } else if (e.key === 'End' && e.ctrlKey) {
            e.preventDefault();
            this.showTab(this.config.tabs[this.config.tabs.length - 1].id);
        }
    },

    // Setup touch navigation
    setupTouchNavigation: function() {
        const tabsContainer = document.querySelector('.tabs-container');
        let startX = 0;
        let startY = 0;
        let threshold = 100; // Minimum swipe distance

        tabsContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        tabsContainer.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;

            // Check if horizontal swipe is more significant than vertical
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
                if (deltaX > 0) {
                    // Swipe right - previous tab
                    this.goToPreviousTab();
                } else {
                    // Swipe left - next tab
                    this.goToNextTab();
                }
            }

            startX = 0;
            startY = 0;
        });
    },

    // Show specific tab
    showTab: function(tabId) {
        if (this.state.isAnimating) return;
        if (tabId === this.state.activeTab) return;

        Utils.performance.mark('tab-switch-start');
        this.state.isAnimating = true;

        // Update state
        this.state.previousTab = this.state.activeTab;
        this.state.activeTab = tabId;
        
        // Update tab history
        this.updateTabHistory(tabId);

        // Update UI
        this.updateActiveTab(tabId);
        this.updateTabContent(tabId);
        
        // Update App state
        if (window.App) {
            window.App.state.currentTab = tabId;
        }

        // Load tab-specific data
        this.loadTabData(tabId);

        // Save preference
        Utils.storage.set('lastActiveTab', tabId);

        // Analytics
        this.trackTabSwitch(tabId);

        Utils.performance.mark('tab-switch-end');
        Utils.performance.measure('tab-switch', 'tab-switch-start', 'tab-switch-end');

        setTimeout(() => {
            this.state.isAnimating = false;
        }, this.config.animations.tabSwitch);
    },

    // Update active tab UI
    updateActiveTab: function(tabId) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });

        // Add active class to selected tab
        const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
            this.moveIndicator(activeTab);
        }
    },

    // Update tab content
    updateTabContent: function(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show selected tab content
        const targetContent = document.getElementById(`${tabId}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
            
            // Focus management for accessibility
            const focusableElement = targetContent.querySelector('input, button, [tabindex]');
            if (focusableElement && !Utils.device.isMobile()) {
                focusableElement.focus();
            }
        }
    },

    // Move tab indicator
    moveIndicator: function(tabElement) {
        const indicator = document.getElementById('tab-indicator');
        if (!indicator || !tabElement) return;

        const tabRect = tabElement.getBoundingClientRect();
        const tabsRect = tabElement.closest('.tabs').getBoundingClientRect();
        
        const left = tabRect.left - tabsRect.left;
        const width = tabRect.width;

        indicator.style.transform = `translateX(${left}px)`;
        indicator.style.width = `${width}px`;
    },

    // Load tab-specific data
    loadTabData: function(tabId) {
        switch(tabId) {
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

    // Navigate to relative tab
    navigateToRelativeTab: function(direction) {
        const currentIndex = this.config.tabs.findIndex(tab => tab.id === this.state.activeTab);
        const newIndex = (currentIndex + direction + this.config.tabs.length) % this.config.tabs.length;
        const newTab = this.config.tabs[newIndex];
        
        this.showTab(newTab.id);
    },

    // Go to next tab
    goToNextTab: function() {
        this.navigateToRelativeTab(1);
    },

    // Go to previous tab
    goToPreviousTab: function() {
        if (this.state.tabHistory.length > 1) {
            // Go to previous tab in history
            const previousTab = this.state.tabHistory[this.state.tabHistory.length - 2];
            this.showTab(previousTab);
        } else {
            // Go to previous tab in sequence
            this.navigateToRelativeTab(-1);
        }
    },

    // Update tab history
    updateTabHistory: function(tabId) {
        // Remove duplicate entries
        this.state.tabHistory = this.state.tabHistory.filter(id => id !== tabId);
        
        // Add new tab to history
        this.state.tabHistory.push(tabId);
        
        // Keep only last 10 tabs
        if (this.state.tabHistory.length > 10) {
            this.state.tabHistory = this.state.tabHistory.slice(-10);
        }
    },

    // Show tab menu
    showTabMenu: function() {
        const tabMenu = document.getElementById('tab-menu');
        if (tabMenu) {
            tabMenu.style.display = 'block';
            Utils.animate.fadeIn(tabMenu, 200);
            
            // Update active state in menu
            this.updateTabMenuState();
        }
    },

    // Hide tab menu
    hideTabMenu: function() {
        const tabMenu = document.getElementById('tab-menu');
        if (tabMenu) {
            Utils.animate.fadeOut(tabMenu, 200);
            setTimeout(() => {
                tabMenu.style.display = 'none';
            }, 200);
        }
    },

    // Update tab menu state
    updateTabMenuState: function() {
        document.querySelectorAll('.tab-menu-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeMenuItem = document.querySelector(`[onclick*="showTab('${this.state.activeTab}')"]`);
        if (activeMenuItem && activeMenuItem.classList.contains('tab-menu-item')) {
            activeMenuItem.classList.add('active');
        }
    },

    // Toggle compact mode
    toggleCompactMode: function() {
        const tabsContainer = document.querySelector('.tabs-container');
        tabsContainer.classList.toggle('compact');
        
        const isCompact = tabsContainer.classList.contains('compact');
        Utils.storage.set('compactNavigation', isCompact);
        
        Utils.showAlert(`Navigation mode: ${isCompact ? 'Compact' : 'Normal'}`, 'info', 2000);
    },

    // Update responsive layout
    updateResponsiveLayout: function() {
        const isMobile = Utils.device.isMobile();
        this.state.isMobile = isMobile;
        
        const tabsContainer = document.querySelector('.tabs-container');
        if (tabsContainer) {
            tabsContainer.classList.toggle('mobile', isMobile);
        }

        if (isMobile) {
            this.enableMobileLayout();
        } else {
            this.enableDesktopLayout();
        }
    },

    // Enable mobile layout
    enableMobileLayout: function() {
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            tabs.style.overflowX = 'auto';
            tabs.style.scrollBehavior = 'smooth';
        }
    },

    // Enable desktop layout
    enableDesktopLayout: function() {
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            tabs.style.overflowX = '';
            tabs.style.scrollBehavior = '';
        }
    },

    // Add badge to tab
    addBadge: function(tabId, count = 1) {
        this.state.badges[tabId] = (this.state.badges[tabId] || 0) + count;
        this.updateBadgeDisplay(tabId);
    },

    // Remove badge from tab
    removeBadge: function(tabId) {
        delete this.state.badges[tabId];
        this.updateBadgeDisplay(tabId);
    },

    // Update badge display
    updateBadgeDisplay: function(tabId) {
        const tab = document.querySelector(`[data-tab="${tabId}"]`);
        if (!tab) return;

        let badge = tab.querySelector('.tab-badge');
        const count = this.state.badges[tabId];

        if (count && count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'tab-badge';
                tab.appendChild(badge);
            }
            badge.textContent = count;
            badge.style.display = 'block';
            
            // Animate badge
            badge.style.animation = 'badge-bounce 0.4s ease-out';
            setTimeout(() => {
                badge.style.animation = '';
            }, 400);
        } else if (badge) {
            badge.style.display = 'none';
        }
    },

    // Track tab switch for analytics
    trackTabSwitch: function(tabId) {
        const tabInfo = this.config.tabs.find(tab => tab.id === tabId);
        if (tabInfo) {
            console.log(`📊 Tab switched to: ${tabInfo.label}`);
            
            // Could send to analytics service here
            // Analytics.track('tab_switch', { tab: tabId, label: tabInfo.label });
        }
    },

    // Refresh active tab
    refreshActiveTab: function() {
        this.loadTabData(this.state.activeTab);
    },

    // Get navigation state
    getState: function() {
        return { ...this.state };
    },

    // Restore navigation state
    restoreState: function() {
        const lastTab = Utils.storage.get('lastActiveTab');
        const compactMode = Utils.storage.get('compactNavigation');
        
        if (lastTab && this.config.tabs.some(tab => tab.id === lastTab)) {
            this.showTab(lastTab);
        }
        
        if (compactMode) {
            const tabsContainer = document.querySelector('.tabs-container');
            if (tabsContainer) {
                tabsContainer.classList.add('compact');
            }
        }
    },

    // Cleanup component
    cleanup: function() {
        // Clear any timeouts or intervals
        clearTimeout(this.indicatorTimeout);
        clearInterval(this.badgeInterval);
        
        // Remove event listeners if needed
        document.removeEventListener('keydown', this.handleKeyboardNavigation);
    }
};

// Initialize navigation when component is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        NavigationComponent.restoreState();
    }, 100);
});

// Export component
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationComponent;
} else {
    window.NavigationComponent = NavigationComponent;
}