// components/history-analytics.js - History & Analytics Component

const HistoryAnalyticsComponent = {
    // Component state
    state: {
        currentPage: 1,
        totalPages: 1,
        selectedIds: [],
        sortBy: 'date',
        sortOrder: 'desc',
        filterStatus: 'all',
        searchQuery: '',
        isLoading: false,
        historyData: [],
        analytics: null
    },

    // Render the component
    render: function() {
        const container = document.getElementById('history-analytics');
        if (!container) {
            console.warn('History analytics container not found');
            return;
        }

        container.innerHTML = this.generateHTML();
        this.attachEventListeners();
        this.loadHistory();
        
        console.log('✅ History analytics component rendered');
    },

    // Generate component HTML
    generateHTML: function() {
        return `
            <div class="history-analytics-wrapper">
                <!-- Controls Section -->
                <div class="history-controls">
                    <div class="controls-header">
                        <h3>📊 History Pemeriksaan Plagiat</h3>
                        <div class="controls-actions">
                            <button class="btn btn-info" onclick="HistoryAnalyticsComponent.refreshHistory()" title="Refresh Data">
                                🔄 Refresh
                            </button>
                            <button class="btn btn-warning" onclick="HistoryAnalyticsComponent.exportHistory()" title="Export ke CSV">
                                📥 Export CSV
                            </button>
                            <button class="btn btn-secondary" onclick="HistoryAnalyticsComponent.clearAllHistory()" title="Hapus Semua">
                                🗑️ Clear All
                            </button>
                        </div>
                    </div>

                    <!-- Search and Filter Controls -->
                    <div class="controls-filters">
                        <div class="search-box">
                            <input type="text" id="history-search" placeholder="🔍 Cari berdasarkan nama file..." 
                                   onkeyup="HistoryAnalyticsComponent.handleSearch(event)">
                            <button class="search-clear" onclick="HistoryAnalyticsComponent.clearSearch()" title="Clear Search">×</button>
                        </div>
                        
                        <div class="filter-controls">
                            <select id="status-filter" onchange="HistoryAnalyticsComponent.handleFilter()" title="Filter by Status">
                                <option value="all">Semua Status</option>
                                <option value="AMAN">✅ Aman</option>
                                <option value="PLAGIAT RENDAH">🟡 Plagiat Rendah</option>
                                <option value="PLAGIAT SEDANG">🟠 Plagiat Sedang</option>
                                <option value="PLAGIAT TINGGI">🔴 Plagiat Tinggi</option>
                            </select>
                            
                            <select id="sort-by" onchange="HistoryAnalyticsComponent.handleSort()" title="Sort by">
                                <option value="date">📅 Tanggal</option>
                                <option value="similarity">📊 Similarity</option>
                                <option value="filename">📄 Nama File</option>
                                <option value="status">🚦 Status</option>
                            </select>
                            
                            <button class="sort-order" onclick="HistoryAnalyticsComponent.toggleSortOrder()" title="Toggle Sort Order">
                                <span id="sort-order-icon">⬇️</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Statistics Overview -->
                <div id="history-stats" class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="total-checks">0</div>
                        <div class="stat-label">Total Pemeriksaan</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="avg-similarity">0%</div>
                        <div class="stat-label">Rata-rata Similarity</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="critical-issues">0</div>
                        <div class="stat-label">Isu Kritis</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="last-check">-</div>
                        <div class="stat-label">Pemeriksaan Terakhir</div>
                    </div>
                </div>

                <!-- Bulk Actions -->
                <div id="bulk-actions" class="bulk-actions" style="display: none;">
                    <div class="bulk-info">
                        <span id="selected-count">0</span> item(s) dipilih
                    </div>
                    <div class="bulk-buttons">
                        <button class="btn btn-warning" onclick="HistoryAnalyticsComponent.bulkDownload()">
                            📥 Download Selected
                        </button>
                        <button class="btn btn-info" onclick="HistoryAnalyticsComponent.bulkAnalysis()">
                            🧬 Deep Analysis
                        </button>
                        <button class="btn btn-danger" onclick="HistoryAnalyticsComponent.bulkDelete()">
                            🗑️ Delete Selected
                        </button>
                        <button class="btn btn-secondary" onclick="HistoryAnalyticsComponent.clearSelection()">
                            ❌ Clear Selection
                        </button>
                    </div>
                </div>

                <!-- Loading Indicator -->
                <div id="history-loading" class="loading" style="display: none;">
                    <div class="spinner"></div>
                    <p>Memuat history...</p>
                </div>

                <!-- History List -->
                <div id="history-list" class="history-list">
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h4>Belum ada history pemeriksaan</h4>
                        <p>Lakukan pemeriksaan plagiat untuk melihat riwayat dan analytics.</p>
                        <button class="btn btn-primary" onclick="NavigationComponent.showTab('check')">
                            🔍 Mulai Pemeriksaan
                        </button>
                    </div>
                </div>

                <!-- Pagination -->
                <div id="history-pagination" class="pagination" style="display: none;">
                    <button class="page-btn" id="prev-page" onclick="HistoryAnalyticsComponent.previousPage()" disabled>
                        ← Previous
                    </button>
                    <div class="page-numbers" id="page-numbers"></div>
                    <button class="page-btn" id="next-page" onclick="HistoryAnalyticsComponent.nextPage()" disabled>
                        Next →
                    </button>
                </div>

                <!-- Pattern Analysis Section -->
                <div class="pattern-analysis-section">
                    <div class="section-header">
                        <h4>🧠 Pattern Analysis & AI Insights</h4>
                        <div class="section-actions">
                            <button class="btn btn-info" onclick="HistoryAnalyticsComponent.generatePatternRecommendations()">
                                🔍 Analyze Patterns
                            </button>
                            <button class="btn btn-warning" onclick="HistoryAnalyticsComponent.deepAnalysisSelected()">
                                🧬 Deep Analysis
                            </button>
                            <button class="btn btn-secondary" onclick="HistoryAnalyticsComponent.showTrendChart()">
                                📈 Show Trends
                            </button>
                        </div>
                    </div>
                    <div id="pattern-recommendations" class="pattern-content"></div>
                </div>

                <!-- Trend Chart Modal -->
                <div id="trend-chart-modal" class="modal" style="display: none;">
                    <div class="modal-content large-modal">
                        <div class="modal-header">
                            <h3>📈 Trend Analysis</h3>
                            <button class="modal-close" onclick="HistoryAnalyticsComponent.closeTrendChart()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="trend-chart-container">
                                <canvas id="trend-chart" width="800" height="400"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Attach event listeners
    attachEventListeners: function() {
        // Search input debounce
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e);
                }, 300);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === '2') {
                // Alt+2 focuses on history search
                e.preventDefault();
                const searchInput = document.getElementById('history-search');
                if (searchInput) {
                    searchInput.focus();
                }
            }
        });
    },

    // Load history data
    async loadHistory(page = 1) {
        this.state.currentPage = page;
        this.state.isLoading = true;
        this.showLoading(true);

        try {
            const limit = 10;
            const response = await fetch(`/check-history?page=${page}&limit=${limit}`);
            const data = await response.json();

            if (data.success) {
                this.state.historyData = data.history;
                this.updateHistoryStats(data.history);
                this.displayHistoryList(data.history);
                this.updatePagination(data.pagination);
                
                // Update navigation badge
                if (window.NavigationComponent && data.history.length > 0) {
                    NavigationComponent.addBadge('history', data.history.length);
                }
            } else {
                throw new Error(data.error || 'Failed to load history');
            }
        } catch (error) {
            console.error('Error loading history:', error);
            Utils.showAlert('Error loading history: ' + error.message, 'error');
            this.displayEmptyState();
        } finally {
            this.state.isLoading = false;
            this.showLoading(false);
        }
    },

    // Show/hide loading indicator
    showLoading: function(show) {
        const loading = document.getElementById('history-loading');
        const historyList = document.getElementById('history-list');
        
        if (loading && historyList) {
            if (show) {
                loading.style.display = 'block';
                historyList.style.opacity = '0.5';
            } else {
                loading.style.display = 'none';
                historyList.style.opacity = '1';
            }
        }
    },

    // Update history statistics
    updateHistoryStats: function(historyEntries) {
        const totalChecks = historyEntries.length;
        const avgSimilarity = totalChecks > 0 
            ? Math.round(historyEntries.reduce((sum, entry) => sum + entry.maxSimilarity, 0) / totalChecks)
            : 0;
        const criticalIssues = historyEntries.reduce((sum, entry) => sum + (entry.criticalIssues || 0), 0);
        const lastCheck = totalChecks > 0 
            ? new Date(historyEntries[0].checkDate).toLocaleDateString('id-ID')
            : '-';

        // Update display
        const elements = {
            totalChecks: document.getElementById('total-checks'),
            avgSimilarity: document.getElementById('avg-similarity'),
            criticalIssues: document.getElementById('critical-issues'),
            lastCheck: document.getElementById('last-check')
        };

        if (elements.totalChecks) {
            this.animateNumber(elements.totalChecks, totalChecks);
        }
        if (elements.avgSimilarity) {
            this.animateNumber(elements.avgSimilarity, avgSimilarity, '%');
        }
        if (elements.criticalIssues) {
            this.animateNumber(elements.criticalIssues, criticalIssues);
        }
        if (elements.lastCheck) {
            elements.lastCheck.textContent = lastCheck;
        }
    },

    // Animate number changes
    animateNumber: function(element, targetValue, suffix = '') {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const increment = (targetValue - startValue) / (duration / 16);
        let currentValue = startValue;

        const updateNumber = () => {
            currentValue += increment;
            
            if ((increment > 0 && currentValue >= targetValue) || 
                (increment < 0 && currentValue <= targetValue)) {
                element.textContent = targetValue + suffix;
                return;
            }
            
            element.textContent = Math.round(currentValue) + suffix;
            requestAnimationFrame(updateNumber);
        };

        if (startValue !== targetValue) {
            updateNumber();
        }
    },

    // Display history list
    displayHistoryList: function(historyEntries) {
        const historyList = document.getElementById('history-list');
        
        if (historyEntries.length === 0) {
            this.displayEmptyState();
            return;
        }

        historyList.innerHTML = `
            <div class="history-header">
                <div class="select-all-wrapper">
                    <input type="checkbox" id="select-all" onchange="HistoryAnalyticsComponent.toggleSelectAll()">
                    <label for="select-all">Pilih Semua</label>
                </div>
                <div class="list-info">
                    Menampilkan ${historyEntries.length} dari ${historyEntries.length} entries
                </div>
            </div>
            <div class="history-items">
                ${historyEntries.map(entry => this.generateHistoryItemHTML(entry)).join('')}
            </div>
        `;

        // Add animation
        this.animateHistoryItems();
    },

    // Generate individual history item HTML
    generateHistoryItemHTML: function(entry) {
        const statusColors = {
            'AMAN': '#27ae60',
            'PLAGIAT RENDAH': '#f39c12', 
            'PLAGIAT SEDANG': '#e67e22',
            'PLAGIAT TINGGI': '#e74c3c'
        };
        
        const statusColor = statusColors[entry.status] || '#7f8c8d';
        const fileIcon = Utils.getFileIcon(entry.fileName);
        const criticalIssuesDisplay = entry.criticalIssues > 0 ? 
            `<span class="critical-badge">🚨 ${entry.criticalIssues} critical</span>` : '';
        
        return `
            <div class="history-item" data-id="${entry.id}">
                <div class="item-checkbox">
                    <input type="checkbox" id="check-${entry.id}" 
                           onchange="HistoryAnalyticsComponent.toggleItemSelection('${entry.id}')">
                </div>
                
                <div class="item-content" onclick="HistoryAnalyticsComponent.showHistoryDetails('${entry.id}')">
                    <div class="item-header">
                        <div class="item-filename">
                            ${fileIcon} ${entry.fileName}
                            <span class="item-status-badge" style="background-color: ${statusColor};">
                                ${entry.status}
                            </span>
                        </div>
                        <div class="item-date">
                            ${new Date(entry.checkDate).toLocaleString('id-ID')}
                        </div>
                    </div>
                    
                    <div class="item-metrics">
                        <div class="metric-item">
                            <span class="metric-value" style="color: ${statusColor}; font-weight: bold; font-size: 1.2em;">
                                ${entry.maxSimilarity}%
                            </span>
                            <span class="metric-label">Similarity</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-value">${entry.totalDocumentsChecked}</span>
                            <span class="metric-label">Docs Checked</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-value">${entry.recommendationCount || 0}</span>
                            <span class="metric-label">AI Recs</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-value">${(entry.textLength / 1000).toFixed(1)}K</span>
                            <span class="metric-label">Characters</span>
                        </div>
                    </div>
                    
                    ${entry.summary ? `
                        <div class="item-summary">
                            <div class="summary-item">
                                <small>Cosine: ${entry.summary.avgCosine || 0}%</small>
                            </div>
                            <div class="summary-item">
                                <small>N-gram: ${entry.summary.avgNgram || 0}%</small>
                            </div>
                            <div class="summary-item">
                                <small>Fingerprint: ${entry.summary.avgFingerprint || 0}%</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${criticalIssuesDisplay}
                </div>
                
                <div class="item-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); HistoryAnalyticsComponent.quickView('${entry.id}')" 
                            title="Quick View">
                        👁️
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); ModalsComponent.showDownloadModal('${entry.id}')" 
                            title="Download">
                        📥
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); HistoryAnalyticsComponent.shareEntry('${entry.id}')" 
                            title="Share">
                        📤
                    </button>
                    <button class="action-btn delete-btn" onclick="event.stopPropagation(); HistoryAnalyticsComponent.deleteHistoryEntry('${entry.id}')" 
                            title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },

    // Animate history items
    animateHistoryItems: function() {
        const items = document.querySelectorAll('.history-item');
        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.4s ease-out';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        });
    },

    // Display empty state
    displayEmptyState: function() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h4>Belum ada history pemeriksaan</h4>
                <p>Lakukan pemeriksaan plagiat untuk melihat riwayat dan analytics.</p>
                <button class="btn btn-primary" onclick="NavigationComponent.showTab('check')">
                    🔍 Mulai Pemeriksaan
                </button>
            </div>
        `;
    },

    // Handle search
    handleSearch: function(event) {
        this.state.searchQuery = event.target.value.toLowerCase();
        this.filterAndDisplayHistory();
    },

    // Clear search
    clearSearch: function() {
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            searchInput.value = '';
            this.state.searchQuery = '';
            this.filterAndDisplayHistory();
        }
    },

    // Handle filter
    handleFilter: function() {
        const filterSelect = document.getElementById('status-filter');
        if (filterSelect) {
            this.state.filterStatus = filterSelect.value;
            this.filterAndDisplayHistory();
        }
    },

    // Handle sort
    handleSort: function() {
        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) {
            this.state.sortBy = sortSelect.value;
            this.filterAndDisplayHistory();
        }
    },

    // Toggle sort order
    toggleSortOrder: function() {
        this.state.sortOrder = this.state.sortOrder === 'desc' ? 'asc' : 'desc';
        const sortIcon = document.getElementById('sort-order-icon');
        if (sortIcon) {
            sortIcon.textContent = this.state.sortOrder === 'desc' ? '⬇️' : '⬆️';
        }
        this.filterAndDisplayHistory();
    },

    // Filter and display history
    filterAndDisplayHistory: function() {
        let filteredData = [...this.state.historyData];

        // Apply search filter
        if (this.state.searchQuery) {
            filteredData = filteredData.filter(entry => 
                entry.fileName.toLowerCase().includes(this.state.searchQuery)
            );
        }

        // Apply status filter
        if (this.state.filterStatus !== 'all') {
            filteredData = filteredData.filter(entry => 
                entry.status === this.state.filterStatus
            );
        }

        // Apply sorting
        filteredData.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.state.sortBy) {
                case 'similarity':
                    aValue = a.maxSimilarity;
                    bValue = b.maxSimilarity;
                    break;
                case 'filename':
                    aValue = a.fileName.toLowerCase();
                    bValue = b.fileName.toLowerCase();
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                default: // date
                    aValue = new Date(a.checkDate);
                    bValue = new Date(b.checkDate);
            }

            if (this.state.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        this.displayHistoryList(filteredData);
    },

    // Show history details
    async showHistoryDetails(historyId) {
        try {
            const response = await fetch(`/check-history/${historyId}`);
            const data = await response.json();

            if (data.success) {
                const entry = data.historyEntry;
                const modal = document.getElementById('history-modal');
                const modalTitle = document.getElementById('modal-title');
                const modalBody = document.getElementById('modal-body');

                if (modal && modalTitle && modalBody) {
                    modalTitle.textContent = `📊 Detail: ${entry.fileName}`;
                    modalBody.innerHTML = this.generateDetailModalHTML(entry);
                    modal.style.display = 'block';
                    Utils.animate.fadeIn(modal, 200);
                }
            } else {
                throw new Error(data.error || 'Failed to load history details');
            }
        } catch (error) {
            console.error('Error loading history details:', error);
            Utils.showAlert('Error loading history details: ' + error.message, 'error');
        }
    },

    // Generate detail modal HTML
    generateDetailModalHTML: function(entry) {
        return `
            <div class="detail-modal-content">
                <div class="detail-section">
                    <h4>📋 Informasi Umum</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>File:</strong> ${entry.fileName}
                        </div>
                        <div class="info-item">
                            <strong>Tanggal:</strong> ${new Date(entry.checkDate).toLocaleString('id-ID')}
                        </div>
                        <div class="info-item">
                            <strong>Status:</strong> 
                            <span style="color: ${Utils.getStatusColor(entry.status)}; font-weight: bold;">
                                ${entry.status}
                            </span>
                        </div>
                        <div class="info-item">
                            <strong>Similarity:</strong> ${entry.maxSimilarity}%
                        </div>
                        <div class="info-item">
                            <strong>Dokumen Dicek:</strong> ${entry.totalDocumentsChecked}
                        </div>
                        <div class="info-item">
                            <strong>Panjang Teks:</strong> ${(entry.textLength / 1000).toFixed(1)}K karakter
                        </div>
                    </div>
                </div>

                ${entry.aiRecommendations && entry.aiRecommendations.length > 0 ? `
                    <div class="detail-section">
                        <h4>🤖 AI Recommendations</h4>
                        <div class="recommendations-list">
                            ${entry.aiRecommendations.map(rec => `
                                <div class="recommendation-detail">
                                    <div class="rec-header">
                                        <h5>${rec.title}</h5>
                                        <span class="priority-badge priority-${rec.priority.toLowerCase()}">
                                            ${rec.priority}
                                        </span>
                                    </div>
                                    <p>${rec.description}</p>
                                    ${rec.actions && rec.actions.length > 0 ? `
                                        <div class="rec-actions">
                                            <strong>Action Items:</strong>
                                            <ul>
                                                ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                                            </ul>
                                        </div>
                                    ` : ''}
                                    ${rec.aiThinking ? `
                                        <div class="ai-thinking-preview">
                                            <button class="btn btn-info btn-sm" onclick="AIThinkingComponent.showModal('${entry.id}', ${JSON.stringify(rec.aiThinking).replace(/"/g, '&quot;')})">
                                                🤖 View AI Thinking Details
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="detail-section">
                    <h4>📊 Detailed Results</h4>
                    <div class="results-list">
                        ${entry.detailedResults.slice(0, 5).map(result => `
                            <div class="result-detail">
                                <div class="result-header">
                                    <span class="result-filename">
                                        ${Utils.getFileIcon(result.filename)} ${result.filename}
                                    </span>
                                    <span class="result-similarity" style="color: ${Utils.getSimilarityColor(result.overallSimilarity)};">
                                        ${result.overallSimilarity}%
                                    </span>
                                </div>
                                <div class="result-breakdown">
                                    <div class="breakdown-item">
                                        <span class="breakdown-label">Cosine:</span>
                                        <span class="breakdown-value">${result.cosineSimilarity}%</span>
                                    </div>
                                    <div class="breakdown-item">
                                        <span class="breakdown-label">N-gram:</span>
                                        <span class="breakdown-value">${result.ngramSimilarity}%</span>
                                    </div>
                                    <div class="breakdown-item">
                                        <span class="breakdown-label">Fingerprint:</span>
                                        <span class="breakdown-value">${result.fingerprintSimilarity}%</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        ${entry.detailedResults.length > 5 ? `
                            <p class="more-results">
                                <em>... dan ${entry.detailedResults.length - 5} hasil lainnya</em>
                            </p>
                        ` : ''}
                    </div>
                </div>

                <div class="detail-actions">
                    <button class="btn btn-warning" onclick="ModalsComponent.showDownloadModal('${entry.id}')">
                        📥 Download Report
                    </button>
                    <button class="btn btn-info" onclick="HistoryAnalyticsComponent.shareEntry('${entry.id}')">
                        📤 Share
                    </button>
                    <button class="btn btn-secondary" onclick="ModalsComponent.closeModal()">
                        Close
                    </button>
                </div>
            </div>
        `;
    },

    // Quick view
    quickView: function(historyId) {
        // Implementation for quick preview without full modal
        const entry = this.state.historyData.find(e => e.id === historyId);
        if (entry) {
            const quickViewHtml = `
                <div class="quick-view-tooltip">
                    <div class="quick-view-header">
                        <strong>${entry.fileName}</strong>
                        <span class="quick-view-similarity">${entry.maxSimilarity}%</span>
                    </div>
                    <div class="quick-view-body">
                        <p>Status: ${entry.status}</p>
                        <p>Date: ${new Date(entry.checkDate).toLocaleDateString('id-ID')}</p>
                        <p>Docs: ${entry.totalDocumentsChecked}</p>
                    </div>
                </div>
            `;
            
            // Show as tooltip or mini modal
            Utils.showAlert(quickViewHtml, 'info', 3000);
        }
    },

    // Toggle item selection
    toggleItemSelection: function(historyId) {
        const checkbox = document.getElementById(`check-${historyId}`);
        if (checkbox) {
            if (checkbox.checked) {
                if (!this.state.selectedIds.includes(historyId)) {
                    this.state.selectedIds.push(historyId);
                }
            } else {
                this.state.selectedIds = this.state.selectedIds.filter(id => id !== historyId);
            }
            this.updateBulkActions();
        }
    },

    // Toggle select all
    toggleSelectAll: function() {
        const selectAllCheckbox = document.getElementById('select-all');
        const itemCheckboxes = document.querySelectorAll('[id^="check-"]');
        
        if (selectAllCheckbox && selectAllCheckbox.checked) {
            // Select all
            this.state.selectedIds = [];
            itemCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
                const id = checkbox.id.replace('check-', '');
                this.state.selectedIds.push(id);
            });
        } else {
            // Deselect all
            this.state.selectedIds = [];
            itemCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
        
        this.updateBulkActions();
    },

    // Clear selection
    clearSelection: function() {
        this.state.selectedIds = [];
        const checkboxes = document.querySelectorAll('[id^="check-"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateBulkActions();
    },

    // Update bulk actions visibility
    updateBulkActions: function() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (bulkActions && selectedCount) {
            if (this.state.selectedIds.length > 0) {
                bulkActions.style.display = 'flex';
                selectedCount.textContent = this.state.selectedIds.length;
            } else {
                bulkActions.style.display = 'none';
            }
        }
    },

    // Bulk download
    bulkDownload: function() {
        if (this.state.selectedIds.length === 0) {
            Utils.showAlert('Pilih items untuk di-download', 'warning');
            return;
        }

        // Create a ZIP download with all selected reports
        const downloadPromises = this.state.selectedIds.map(async (id) => {
            try {
                const response = await fetch(`/api/download-result/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ format: 'html' })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const entry = this.state.historyData.find(e => e.id === id);
                    const filename = `report_${entry ? entry.fileName.replace(/[^a-zA-Z0-9]/g, '_') : id}.html`;
                    return { blob, filename };
                }
            } catch (error) {
                console.error(`Error downloading ${id}:`, error);
                return null;
            }
        });

        Promise.all(downloadPromises).then(results => {
            const validResults = results.filter(r => r !== null);
            if (validResults.length > 0) {
                // Download each file individually (browser limitation for ZIP)
                validResults.forEach(({ blob, filename }) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                });
                
                Utils.showAlert(`✅ ${validResults.length} reports downloaded!`, 'success');
            } else {
                Utils.showAlert('Gagal mendownload reports', 'error');
            }
        });
    },

    // Bulk analysis
    async bulkAnalysis() {
        if (this.state.selectedIds.length < 2) {
            Utils.showAlert('Pilih minimal 2 items untuk deep analysis', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/deep-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ historyIds: this.state.selectedIds })
            });

            const data = await response.json();
            if (data.success) {
                this.displayDeepAnalysis(data.analysis, data.metadata);
            } else {
                throw new Error(data.error || 'Deep analysis failed');
            }
        } catch (error) {
            console.error('Error performing bulk analysis:', error);
            Utils.showAlert('Error: ' + error.message, 'error');
        }
    },

    // Bulk delete
    async bulkDelete() {
        if (this.state.selectedIds.length === 0) {
            Utils.showAlert('Pilih items untuk dihapus', 'warning');
            return;
        }

        const confirmMessage = `Yakin ingin menghapus ${this.state.selectedIds.length} history entries? Tindakan ini tidak dapat dibatalkan.`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const deletePromises = this.state.selectedIds.map(id => 
                fetch(`/check-history/${id}`, { method: 'DELETE' })
            );

            const results = await Promise.allSettled(deletePromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.length - successful;

            if (successful > 0) {
                Utils.showAlert(`✅ ${successful} entries deleted successfully`, 'success');
                this.clearSelection();
                this.refreshHistory();
            }

            if (failed > 0) {
                Utils.showAlert(`⚠️ ${failed} entries failed to delete`, 'warning');
            }
        } catch (error) {
            console.error('Error bulk deleting:', error);
            Utils.showAlert('Error deleting entries: ' + error.message, 'error');
        }
    },

    // Share entry
    shareEntry: function(historyId) {
        const entry = this.state.historyData.find(e => e.id === historyId);
        if (!entry) {
            Utils.showAlert('Entry not found', 'error');
            return;
        }

        const shareData = {
            title: `Hasil Analisis Plagiarisme - ${entry.fileName}`,
            text: `Similarity: ${entry.maxSimilarity}% | Status: ${entry.status}`,
            url: `${window.location.origin}?historyId=${historyId}`
        };

        if (navigator.share && Utils.device.isMobile()) {
            navigator.share(shareData).then(() => {
                Utils.showAlert('✅ Entry shared successfully!', 'success');
            }).catch((error) => {
                console.error('Error sharing:', error);
                Utils.copyToClipboard(shareData.url);
            });
        } else {
            Utils.copyToClipboard(shareData.url);
        }
    },

    // Delete history entry
    async deleteHistoryEntry(historyId) {
        const entry = this.state.historyData.find(e => e.id === historyId);
        const fileName = entry ? entry.fileName : 'entry';
        
        if (!confirm(`❓ Yakin ingin menghapus history "${fileName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/check-history/${historyId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                Utils.showAlert('✅ History entry berhasil dihapus!', 'success');
                this.refreshHistory();
            } else {
                throw new Error(data.error || 'Gagal menghapus history entry');
            }
        } catch (error) {
            console.error('Error deleting history entry:', error);
            Utils.showAlert('Error: ' + error.message, 'error');
        }
    },

    // Clear all history
    async clearAllHistory() {
        if (!confirm('❓ Yakin ingin menghapus SEMUA history? Tindakan ini tidak dapat dibatalkan!')) {
            return;
        }

        try {
            const response = await fetch('/check-history', {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                Utils.showAlert('✅ Semua history berhasil dihapus!', 'success');
                this.clearSelection();
                this.loadHistory(1);
            } else {
                throw new Error(data.error || 'Gagal menghapus history');
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            Utils.showAlert('Error: ' + error.message, 'error');
        }
    },

    // Export history to CSV
    async exportHistory() {
        try {
            const response = await fetch('/api/export-history?format=csv');
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `plagiarism_history_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                Utils.showAlert('✅ History berhasil diexport ke CSV!', 'success');
            } else {
                throw new Error('Failed to export history');
            }
        } catch (error) {
            console.error('Error exporting history:', error);
            Utils.showAlert('Error exporting history: ' + error.message, 'error');
        }
    },

    // Generate pattern recommendations
    async generatePatternRecommendations() {
        try {
            const response = await fetch('/api/pattern-recommendations');
            const data = await response.json();

            if (data.success) {
                this.displayPatternRecommendations(data.recommendations, data.analytics);
            } else {
                throw new Error('Error generating pattern recommendations');
            }
        } catch (error) {
            console.error('Error generating pattern recommendations:', error);
            Utils.showAlert('Error: ' + error.message, 'error');
        }
    },

    // Display pattern recommendations
    displayPatternRecommendations: function(recommendations, analytics) {
        const container = document.getElementById('pattern-recommendations');
        
        let analyticsHtml = '';
        if (analytics) {
            analyticsHtml = `
                <div class="analytics-overview">
                    <h5>📊 Analytics Overview</h5>
                    <div class="analytics-grid">
                        <div class="analytics-item">
                            <div class="analytics-value">${analytics.avgSimilarity}%</div>
                            <div class="analytics-label">Avg Similarity</div>
                        </div>
                        <div class="analytics-item">
                            <div class="analytics-value">${analytics.recentAvg}%</div>
                            <div class="analytics-label">Recent Avg</div>
                        </div>
                        <div class="analytics-item">
                            <div class="analytics-value">${analytics.totalChecks}</div>
                            <div class="analytics-label">Total Checks</div>
                        </div>
                    </div>
                </div>
            `;
        }

        const recommendationsHtml = recommendations.map(rec => `
            <div class="pattern-recommendation priority-${rec.priority.toLowerCase()}">
                <div class="rec-header">
                    <h5>${rec.title}</h5>
                    <span class="priority-badge priority-${rec.priority.toLowerCase()}">
                        ${rec.priority}
                    </span>
                </div>
                <p>${rec.description}</p>
                ${rec.actions && rec.actions.length > 0 ? `
                    <div class="rec-actions">
                        <strong>Recommended Actions:</strong>
                        <ul>
                            ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('');

        container.innerHTML = `
            <div class="pattern-results">
                <h4>🧠 AI Pattern Analysis Results</h4>
                ${analyticsHtml}
                ${recommendations.length > 0 ? recommendationsHtml : 
                  '<p class="no-patterns">No specific patterns detected. Continue monitoring.</p>'}
            </div>
        `;
    },

    // Display deep analysis
    displayDeepAnalysis: function(analysis, metadata) {
        const container = document.getElementById('pattern-recommendations');
        
        container.innerHTML = `
            <div class="deep-analysis-results">
                <h4>🧬 Deep Analysis Results</h4>
                
                <div class="analysis-metadata">
                    <h5>📊 Analysis Metadata</h5>
                    <div class="metadata-grid">
                        <div class="metadata-item">
                            <strong>Documents Analyzed:</strong> ${metadata.analyzedDocuments}
                        </div>
                        <div class="metadata-item">
                            <strong>Analysis Date:</strong> ${new Date(metadata.analysisDate).toLocaleString('id-ID')}
                        </div>
                        <div class="metadata-item">
                            <strong>Average Similarity:</strong> ${metadata.avgSimilarity}%
                        </div>
                    </div>
                </div>

                <div class="analysis-assessment">
                    <h5>🎯 Overall Assessment</h5>
                    <div class="assessment-content">
                        ${analysis.overallAssessment}
                    </div>
                </div>

                <div class="analysis-findings">
                    <h5>🔍 Key Findings</h5>
                    <ul class="findings-list">
                        ${analysis.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
                    </ul>
                </div>

                <div class="analysis-risk">
                    <h5>⚠️ Risk Assessment</h5>
                    <div class="risk-content">
                        ${analysis.riskAssessment}
                    </div>
                </div>
            </div>
        `;
    },

    // Deep analysis for selected items
    deepAnalysisSelected: function() {
        if (this.state.selectedIds.length === 0) {
            Utils.showAlert('Pilih minimal satu history entry untuk deep analysis', 'error');
            return;
        }
        this.bulkAnalysis();
    },

    // Show trend chart
    showTrendChart: function() {
        const modal = document.getElementById('trend-chart-modal');
        if (modal) {
            modal.style.display = 'block';
            this.generateTrendChart();
        }
    },

    // Close trend chart
    closeTrendChart: function() {
        const modal = document.getElementById('trend-chart-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Generate trend chart
    generateTrendChart: function() {
        // Simple trend chart implementation using Canvas
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.state.historyData.slice(0, 10).reverse(); // Last 10 entries

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (data.length === 0) {
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available for trend analysis', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Chart settings
        const padding = 60;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        const stepX = chartWidth / (data.length - 1);

        // Draw axes
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // Draw similarity trend line
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.beginPath();

        data.forEach((entry, index) => {
            const x = padding + index * stepX;
            const y = canvas.height - padding - (entry.maxSimilarity / 100) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw data points
        data.forEach((entry, index) => {
            const x = padding + index * stepX;
            const y = canvas.height - padding - (entry.maxSimilarity / 100) * chartHeight;
            
            ctx.fillStyle = Utils.getSimilarityColor(entry.maxSimilarity);
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw labels
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // Y-axis labels
        for (let i = 0; i <= 5; i++) {
            const y = canvas.height - padding - (i * 20 / 100) * chartHeight;
            const label = (i * 20) + '%';
            ctx.fillText(label, padding - 20, y + 4);
        }

        // X-axis labels (dates)
        data.forEach((entry, index) => {
            if (index % 2 === 0) { // Show every other label to avoid crowding
                const x = padding + index * stepX;
                const date = new Date(entry.checkDate).toLocaleDateString('id-ID', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                ctx.save();
                ctx.translate(x, canvas.height - padding + 20);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'right';
                ctx.fillText(date, 0, 0);
                ctx.restore();
            }
        });

        // Chart title
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Similarity Trend Over Time', canvas.width / 2, 30);
    },

    // Update pagination
    updatePagination: function(pagination) {
        const paginationDiv = document.getElementById('history-pagination');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageNumbers = document.getElementById('page-numbers');
        
        if (!paginationDiv || !pagination) return;

        this.state.totalPages = pagination.totalPages;

        if (pagination.totalPages <= 1) {
            paginationDiv.style.display = 'none';
            return;
        }
        
        paginationDiv.style.display = 'flex';
        
        // Update prev/next buttons
        if (prevBtn) {
            prevBtn.disabled = !pagination.hasPrev;
        }
        if (nextBtn) {
            nextBtn.disabled = !pagination.hasNext;
        }

        // Update page numbers
        if (pageNumbers) {
            let paginationHtml = '';
            
            const currentPage = pagination.currentPage;
            const totalPages = pagination.totalPages;
            
            // Show max 5 page numbers
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }

            for (let i = startPage; i <= endPage; i++) {
                paginationHtml += `
                    <button class="page-number ${i === currentPage ? 'active' : ''}" 
                            onclick="HistoryAnalyticsComponent.goToPage(${i})">
                        ${i}
                    </button>
                `;
            }
            
            pageNumbers.innerHTML = paginationHtml;
        }
    },

    // Go to specific page
    goToPage: function(page) {
        if (page >= 1 && page <= this.state.totalPages && page !== this.state.currentPage) {
            this.loadHistory(page);
        }
    },

    // Go to previous page
    previousPage: function() {
        if (this.state.currentPage > 1) {
            this.loadHistory(this.state.currentPage - 1);
        }
    },

    // Go to next page
    nextPage: function() {
        if (this.state.currentPage < this.state.totalPages) {
            this.loadHistory(this.state.currentPage + 1);
        }
    },

    // Refresh history
    refreshHistory: function() {
        this.loadHistory(this.state.currentPage);
        Utils.showAlert('🔄 History refreshed!', 'success', 2000);
    },

    // Get component state
    getState: function() {
        return { ...this.state };
    },

    // Export component for testing
    exportForTesting: function() {
        return {
            state: this.state,
            generateHistoryItemHTML: this.generateHistoryItemHTML.bind(this),
            updateHistoryStats: this.updateHistoryStats.bind(this),
            filterAndDisplayHistory: this.filterAndDisplayHistory.bind(this)
        };
    },

    // Cleanup component
    cleanup: function() {
        // Clear any intervals/timeouts
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Clear selections
        this.clearSelection();

        console.log('🧹 History analytics component cleaned up');
    },

    // Initialize component
    init: function() {
        this.render();
        
        // Set up auto-refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (!this.state.isLoading && document.visibilityState === 'visible') {
                this.refreshHistory();
            }
        }, 30000);

        console.log('✅ History analytics component initialized');
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('history-analytics')) {
        HistoryAnalyticsComponent.init();
    }
});

// Export for global access
window.HistoryAnalyticsComponent = HistoryAnalyticsComponent;