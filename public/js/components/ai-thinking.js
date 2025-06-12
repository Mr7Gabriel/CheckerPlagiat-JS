const AIThinkingComponent = {
    init: function() {
        // Component initialization
    },
    
    showModal: function(historyId, aiThinkingData) {
        const modal = document.getElementById('ai-thinking-modal');
        const body = document.getElementById('ai-thinking-body');
        
        if (!modal || !body) {
            console.error('AI Thinking modal elements not found');
            return;
        }
        
        // Parse aiThinkingData if it's a string
        let thinking;
        if (typeof aiThinkingData === 'string') {
            try {
                thinking = JSON.parse(aiThinkingData);
            } catch (e) {
                console.error('Error parsing AI thinking data:', e);
                Utils.showAlert('Error loading AI thinking data', 'error');
                return;
            }
        } else {
            thinking = aiThinkingData;
        }
        
        body.innerHTML = this.generateThinkingContent(thinking, historyId);
        modal.style.display = 'block';
    },

    generateThinkingContent: function(thinking, historyId) {
        let content = `
            <div class="ai-thinking-content">
                <div class="thinking-overview">
                    <h4>📊 Analysis Overview</h4>
                    <p><strong>Status:</strong> ${thinking.analysis}</p>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${thinking.totalIssues}</div>
                            <div class="stat-label">Total Issues</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${thinking.exactMatches.length}</div>
                            <div class="stat-label">Exact Matches</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${thinking.nearMatches.length}</div>
                            <div class="stat-label">Near Matches</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${thinking.severity.toUpperCase()}</div>
                            <div class="stat-label">Severity</div>
                        </div>
                    </div>
                </div>
        `;
        
        // Exact Matches Section
        if (thinking.exactMatches.length > 0) {
            content += `
                <div class="exact-matches-section">
                    <h4>🚨 Exact Matches (${thinking.exactMatches.length})</h4>
                    <p class="section-description">Kalimat-kalimat ini hampir identik dengan sumber referensi dan memerlukan penulisan ulang segera.</p>
                    ${thinking.exactMatches.map((match, index) => `
                        <div class="exact-match-item">
                            <div class="match-header">
                                <strong>Match #${index + 1}</strong>
                                <span class="similarity-badge">${match.similarity}% similar</span>
                            </div>
                            <div class="match-content">
                                <div class="original-text">
                                    <strong>Kalimat Anda:</strong><br>
                                    "${match.original}"
                                </div>
                                <div class="source-text">
                                    <strong>Sumber Referensi:</strong><br>
                                    "${match.source}"
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Near Matches Section
        if (thinking.nearMatches.length > 0) {
            content += `
                <div class="near-matches-section">
                    <h4>⚠️ Near Matches (${thinking.nearMatches.length})</h4>
                    <p class="section-description">Kalimat-kalimat ini mirip dengan sumber dan perlu di-parafrase lebih baik.</p>
                    ${thinking.nearMatches.slice(0, 5).map((match, index) => `
                        <div class="near-match-item">
                            <div class="match-header">
                                <strong>Near Match #${index + 1}</strong>
                                <span class="similarity-badge">${match.similarity}% similar</span>
                            </div>
                            <div class="match-content">
                                <div class="original-text">
                                    <strong>Kalimat Anda:</strong><br>
                                    "${match.original}"
                                </div>
                                <div class="source-text">
                                    <strong>Sumber Referensi:</strong><br>
                                    "${match.source}"
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    ${thinking.nearMatches.length > 5 ? `<p class="more-matches"><em>... dan ${thinking.nearMatches.length - 5} near matches lainnya</em></p>` : ''}
                </div>
            `;
        }
        
        // Suggestions Section
        if (thinking.suggestions.length > 0) {
            content += `
                <div class="suggestions-section">
                    <h4>💡 AI Suggestions for Improvement</h4>
                    <p class="section-description">Berikut adalah saran perbaikan spesifik dari AI untuk setiap bagian yang bermasalah:</p>
                    ${thinking.suggestions.map((suggestion, index) => `
                        <div class="suggestion-item">
                            <div class="suggestion-header">
                                <strong>Suggestion #${index + 1}</strong>
                                <span class="similarity-badge ${suggestion.similarity >= 90 ? 'high' : suggestion.similarity >= 70 ? 'medium' : 'low'}">
                                    ${suggestion.similarity}% similarity
                                </span>
                            </div>
                            <div class="suggestion-content">
                                <div class="original-text">
                                    <strong>Original Text:</strong><br>
                                    "${suggestion.originalText}"
                                </div>
                                <div class="suggestion-text">
                                    <strong>🤖 AI Suggestion:</strong><br>
                                    ${suggestion.suggestion.split('\\n').map(line => `<p>${line}</p>`).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Action Plan Section
        content += `
                <div class="action-plan-section">
                    <h4>📋 Recommended Action Plan</h4>
                    <div class="action-plan-content">
                        <h5>🎯 Priority Actions:</h5>
                        <ol class="priority-list">
                            ${thinking.exactMatches.length > 0 ? `
                                <li class="priority-urgent"><strong>URGENT:</strong> Rewrite all ${thinking.exactMatches.length} exact match(es) completely using your own words</li>
                            ` : ''}
                            ${thinking.nearMatches.length > 0 ? `
                                <li class="priority-high"><strong>HIGH:</strong> Improve paraphrasing for ${thinking.nearMatches.length} near match(es)</li>
                            ` : ''}
                            <li class="priority-medium"><strong>MEDIUM:</strong> Review and enhance overall writing style</li>
                            <li class="priority-low"><strong>LOW:</strong> Add proper citations and references</li>
                        </ol>
                        
                        <h5>📝 Writing Techniques to Apply:</h5>
                        <ul class="techniques-list">
                            <li>Change sentence structure (active ↔ passive voice)</li>
                            <li>Use synonyms and alternative expressions</li>
                            <li>Break long sentences into shorter ones</li>
                            <li>Add transitional phrases and connectors</li>
                            <li>Include your own analysis and interpretation</li>
                            <li>Reorganize information flow and sequence</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        return content;
    },
    
    closeModal: function() {
        const modal = document.getElementById('ai-thinking-modal');
        if (modal) modal.style.display = 'none';
    }
};