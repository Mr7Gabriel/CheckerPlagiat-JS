const DashboardComponent = {
    state: {
        stats: {},
        isLoading: false,
        chartsInitialized: false
    },

    render: function() {
        const container = document.getElementById('dashboard-overview');
        if (!container) return;

        container.innerHTML = `
            <div class="feature-highlight">
                <h3>📈 Dashboard Analytics</h3>
                <p>Overview komprehensif dari semua aktivitas plagiarism checking dengan insights AI-powered</p>
            </div>

            <div id="dashboard-overview-stats" class="dashboard-stats">
                <div class="stat-card">
                    <div class="stat-value" id="dash-total-checks">0</div>
                    <div class="stat-label">Total Checks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="dash-avg-similarity">0%</div>
                    <div class="stat-label">Avg Similarity</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="dash-critical-recs">0</div>
                    <div class="stat-label">Critical Recommendations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="dash-safe-docs">0</div>
                    <div class="stat-label">Safe Documents</div>
                </div>
            </div>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <div class="feature-title">Status Distribution</div>
                    <div id="status-distribution">
                        <div class="status-item">
                            <span class="status-safe">🟢 Safe: <span id="safe-count">0</span></span>
                        </div>
                        <div class="status-item">
                            <span class="status-low">🟡 Low Risk: <span id="low-count">0</span></span>
                        </div>
                        <div class="status-item">
                            <span class="status-medium">🟠 Medium Risk: <span id="medium-count">0</span></span>
                        </div>
                        <div class="status-item">
                            <span class="status-high">🔴 High Risk: <span id="high-count">0</span></span>
                        </div>
                    </div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📁</div>
                    <div class="feature-title">File Type Analysis</div>
                    <div id="file-type-stats">
                        <p class="no-data">No data available</p>
                    </div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">⏰</div>
                    <div class="feature-title">Recent Activity</div>
                    <div id="recent-activity">
                        <p class="no-data">No recent activity</p>
                    </div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <div class="feature-title">Quick Actions</div>
                    <div class="quick-actions">
                        <button class="btn btn-primary" onclick="NavigationComponent.showTab('check')">
                            🔍 New Check
                        </button>
                        <button class="btn btn-info" onclick="HistoryAnalyticsComponent.exportHistory()">
                            📥 Export Data
                        </button>
                        <button class="btn btn-warning" onclick="HistoryAnalyticsComponent.generatePatternRecommendations()">
                            🧠 AI Analysis
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.loadStats();
    },

    async loadStats() {
        this.state.isLoading = true;
        try {
            const response = await fetch('/api/dashboard-stats');
            const data = await response.json();

            if (data.success) {
                this.updateDashboardDisplay(data.stats);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        } finally {
            this.state.isLoading = false;
        }
    },

    updateDashboardDisplay: function(stats) {
        // Update main dashboard stats
        document.getElementById('dash-total-checks').textContent = stats.totalChecks;
        document.getElementById('dash-avg-similarity').textContent = stats.avgSimilarity + '%';
        document.getElementById('dash-critical-recs').textContent = stats.criticalRecommendations;
        document.getElementById('dash-safe-docs').textContent = stats.statusDistribution.safe;

        // Update status distribution
        document.getElementById('safe-count').textContent = stats.statusDistribution.safe;
        document.getElementById('low-count').textContent = stats.statusDistribution.low;
        document.getElementById('medium-count').textContent = stats.statusDistribution.medium;
        document.getElementById('high-count').textContent = stats.statusDistribution.high;

        // Update file type stats
        this.updateFileTypeStats(stats.fileTypeStats);
        this.updateRecentActivity(stats.recentActivity);
    },

    updateFileTypeStats: function(fileTypeStats) {
        const container = document.getElementById('file-type-stats');
        if (Object.keys(fileTypeStats).length > 0) {
            container.innerHTML = Object.entries(fileTypeStats)
                .map(([type, count]) => `
                    <div class="file-type-item">
                        <span>${Utils.getFileIcon('file' + type)} ${type.toUpperCase()}</span>
                        <span class="file-count">${count}</span>
                    </div>
                `).join('');
        } else {
            container.innerHTML = '<p class="no-data">No data available</p>';
        }
    },

    updateRecentActivity: function(recentActivity) {
        const container = document.getElementById('recent-activity');
        if (recentActivity.length > 0) {
            container.innerHTML = recentActivity.slice(0, 5)
                .map(activity => `
                    <div class="activity-item">
                        <div class="activity-filename">
                            ${Utils.getFileIcon(activity.fileName)} 
                            ${activity.fileName.substring(0, 20)}${activity.fileName.length > 20 ? '...' : ''}
                        </div>
                        <div class="activity-meta">
                            ${activity.similarity}% • ${new Date(activity.date).toLocaleDateString('id-ID')}
                        </div>
                    </div>
                `).join('');
        } else {
            container.innerHTML = '<p class="no-data">No recent activity</p>';
        }
    }
};