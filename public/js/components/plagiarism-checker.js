// components/plagiarism-checker.js - Main Plagiarism Checker Component

const PlagiarismCheckerComponent = {
    // Component state
    state: {
        selectedFile: null,
        isProcessing: false,
        results: null,
        textInput: '',
        uploadProgress: 0
    },

    // Render the component
    render: function() {
        const container = document.getElementById('plagiarism-checker');
        if (!container) {
            console.warn('Plagiarism checker container not found');
            return;
        }

        container.innerHTML = this.generateHTML();
        this.attachEventListeners();
        this.restoreState();
        
        console.log('✅ Plagiarism checker component rendered');
    },

    // Generate component HTML
    generateHTML: function() {
        return `
            <div class="plagiarism-checker-wrapper">
                <!-- Upload Section -->
                <div class="upload-section">
                    <h3>📄 Upload Dokumen atau Masukkan Teks</h3>
                    <p>Pilih file dokumen atau masukkan teks langsung untuk analisis plagiat dengan AI recommendations</p>
                    
                    <div class="file-input-wrapper">
                        <input type="file" id="targetFile" class="file-input" 
                               accept=".txt,.pdf,.doc,.docx,.odt,.rtf" 
                               onchange="PlagiarismCheckerComponent.handleFileSelect(event)">
                        <label for="targetFile" class="file-input-button">
                            📁 Pilih File Dokumen
                        </label>
                    </div>
                    
                    <div class="format-support-info">
                        <strong>📁 Format yang didukung:</strong>
                        <div class="format-grid">
                            <div class="format-item" title="Text Files">📝 Text (.txt)</div>
                            <div class="format-item" title="PDF Documents">📄 PDF (.pdf)</div>
                            <div class="format-item" title="Microsoft Word">📘 Word (.doc, .docx)</div>
                            <div class="format-item" title="OpenDocument Text">📄 OpenDoc (.odt)</div>
                            <div class="format-item" title="Rich Text Format">📄 RTF (.rtf)</div>
                        </div>
                        <small>Maksimal ukuran file: 10MB | ✨ Dengan AI Analysis untuk rekomendasi perbaikan</small>
                    </div>
                    
                    <div id="file-info" class="file-info"></div>
                </div>

                <!-- Text Input Section -->
                <div class="text-input-section">
                    <h4>💬 Atau masukkan teks langsung:</h4>
                    <div class="text-input-wrapper">
                        <textarea id="inputText" class="text-input" 
                                  placeholder="Masukkan teks yang ingin diperiksa plagiatnya di sini...

Tips: 
• Anda dapat menggunakan Ctrl+Enter untuk langsung cek plagiat
• Hasil akan disimpan di History untuk tracking
• AI akan memberikan rekomendasi perbaikan yang personal"
                                  oninput="PlagiarismCheckerComponent.handleTextInput(event)"></textarea>
                        <div class="text-stats">
                            <span id="char-count">0 karakter</span>
                            <span id="word-count">0 kata</span>
                            <span id="text-status" class="text-status"></span>
                        </div>
                    </div>
                    <small style="color: #7f8c8d;">
                        Minimal 10 karakter • Shortcut: Ctrl+Enter untuk cek • 🤖 AI-powered analysis
                    </small>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="PlagiarismCheckerComponent.checkPlagiarism()" 
                            id="check-btn" disabled>
                        🔍 Cek Plagiat + AI Analysis
                    </button>
                    <button class="btn btn-secondary" onclick="PlagiarismCheckerComponent.clearInput()">
                        🗑️ Bersihkan
                    </button>
                    <button class="btn btn-info" onclick="NavigationComponent.showTab('history')">
                        📊 Lihat History
                    </button>
                    <button class="btn btn-warning" onclick="PlagiarismCheckerComponent.showQuickHelp()">
                        ❓ Bantuan
                    </button>
                </div>

                <!-- Loading Section -->
                <div id="loading" class="loading" style="display: none;">
                    <div class="spinner"></div>
                    <p id="loading-text">Sedang menganalisis dokumen dengan AI...</p>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress"></div>
                    </div>
                    <div class="progress-details">
                        <small id="progress-details">🤖 Initializing analysis...</small>
                    </div>
                </div>

                <!-- Results Section -->
                <div id="results" class="results-section" style="display: none;"></div>

                <!-- Quick Help Modal -->
                <div id="quick-help-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>❓ Panduan Cepat</h3>
                            <button class="modal-close" onclick="PlagiarismCheckerComponent.closeQuickHelp()">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.generateQuickHelpContent()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Generate quick help content
    generateQuickHelpContent: function() {
        return `
            <div class="help-section">
                <h4>🚀 Cara Menggunakan:</h4>
                <ol>
                    <li><strong>Upload File:</strong> Pilih dokumen (.txt, .pdf, .doc, .docx, .odt, .rtf)</li>
                    <li><strong>Atau Input Teks:</strong> Ketik/paste teks langsung di area teks</li>
                    <li><strong>Klik Analisis:</strong> Tekan tombol "Cek Plagiat + AI Analysis"</li>
                    <li><strong>Review Hasil:</strong> Lihat similarity score dan AI recommendations</li>
                </ol>
            </div>
            
            <div class="help-section">
                <h4>🎯 Tips untuk Hasil Terbaik:</h4>
                <ul>
                    <li>Pastikan teks minimal 10 karakter</li>
                    <li>Upload dokumen referensi terlebih dahulu</li>
                    <li>Gunakan format file yang didukung</li>
                    <li>Perhatikan rekomendasi AI untuk perbaikan</li>
                </ul>
            </div>
            
            <div class="help-section">
                <h4>⌨️ Keyboard Shortcuts:</h4>
                <ul>
                    <li><strong>Ctrl+Enter:</strong> Mulai analisis plagiat</li>
                    <li><strong>Escape:</strong> Bersihkan input dan tutup modal</li>
                    <li><strong>Alt+1:</strong> Fokus ke tab Cek Plagiat</li>
                </ul>
            </div>
            
            <div class="help-section">
                <h4>🔍 Interpretasi Hasil:</h4>
                <div class="status-legend">
                    <div class="legend-item">
                        <span class="legend-color" style="background: #27ae60;"></span>
                        <span>0-24%: AMAN (Tidak ada plagiat)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #f39c12;"></span>
                        <span>25-49%: PLAGIAT RENDAH (Perlu review)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #e67e22;"></span>
                        <span>50-79%: PLAGIAT SEDANG (Perlu revisi)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #e74c3c;"></span>
                        <span>80-100%: PLAGIAT TINGGI (Perlu rewrite)</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Attach event listeners
    attachEventListeners: function() {
        // File input validation
        const fileInput = document.getElementById('targetFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

        // Text input enhancements
        const textInput = document.getElementById('inputText');
        if (textInput) {
            textInput.addEventListener('input', (e) => {
                this.handleTextInput(e);
            });

            textInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.checkPlagiarism();
                }
            });

            textInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.handleTextInput(e);
                    Utils.showAlert('📋 Teks berhasil di-paste! Siap untuk dianalisis.', 'info', 3000);
                }, 100);
            });
        }

        // Auto-save text input
        if (textInput) {
            const debouncedSave = Utils.debounce(() => {
                this.saveState();
            }, 1000);

            textInput.addEventListener('input', debouncedSave);
        }
    },

    // Handle file selection
    handleFileSelect: function(event) {
        const fileInput = event.target;
        const fileInfo = document.getElementById('file-info');
        
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            // Validate file
            if (!this.validateFile(file)) {
                fileInput.value = '';
                return;
            }

            this.state.selectedFile = file;
            const fileSize = (file.size / 1024).toFixed(2);
            const fileExt = file.name.split('.').pop().toLowerCase();
            
            const fileIcons = {
                'txt': '📝', 'pdf': '📄', 'doc': '📘',
                'docx': '📘', 'odt': '📄', 'rtf': '📄'
            };
            
            const icon = fileIcons[fileExt] || '📄';
            
            fileInfo.innerHTML = `
                <div class="file-selected">
                    <div class="file-icon">${icon}</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">
                            Ukuran: ${fileSize} KB • Format: ${fileExt.toUpperCase()} • 
                            <span class="ai-ready">🤖 AI Analysis Ready</span>
                        </div>
                    </div>
                    <button class="file-remove" onclick="PlagiarismCheckerComponent.removeFile()" title="Hapus file">
                        ❌
                    </button>
                </div>
            `;

            // Clear text input when file is selected
            const textInput = document.getElementById('inputText');
            if (textInput.value.trim()) {
                const confirmClear = confirm('File dipilih. Hapus teks yang sudah diketik?');
                if (confirmClear) {
                    textInput.value = '';
                    this.updateTextStats();
                }
            }

            this.updateCheckButton();
            this.saveState();
        } else {
            this.state.selectedFile = null;
            fileInfo.innerHTML = '';
            this.updateCheckButton();
        }
    },

    // Handle text input
    handleTextInput: function(event) {
        const textInput = event.target;
        this.state.textInput = textInput.value;
        
        this.updateTextStats();
        this.updateCheckButton();
        
        // Clear file selection when typing
        if (textInput.value.trim() && this.state.selectedFile) {
            const fileInput = document.getElementById('targetFile');
            const confirmClear = confirm('Teks diketik. Hapus file yang sudah dipilih?');
            if (confirmClear) {
                fileInput.value = '';
                this.state.selectedFile = null;
                document.getElementById('file-info').innerHTML = '';
            }
        }
    },

    // Update text statistics
    updateTextStats: function() {
        const textInput = document.getElementById('inputText');
        const charCount = document.getElementById('char-count');
        const wordCount = document.getElementById('word-count');
        const textStatus = document.getElementById('text-status');
        
        if (!textInput || !charCount || !wordCount || !textStatus) return;

        const text = textInput.value;
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;

        charCount.textContent = `${chars} karakter`;
        wordCount.textContent = `${words} kata`;

        // Update status
        if (chars === 0) {
            textStatus.textContent = '';
            textStatus.className = 'text-status';
            textInput.style.borderColor = '';
        } else if (chars < 10) {
            textStatus.textContent = 'Teks terlalu pendek';
            textStatus.className = 'text-status warning';
            textInput.style.borderColor = '#f39c12';
        } else if (chars >= 10 && chars < 100) {
            textStatus.textContent = 'Siap untuk analisis dasar';
            textStatus.className = 'text-status info';
            textInput.style.borderColor = '#3498db';
        } else {
            textStatus.textContent = 'Siap untuk analisis lengkap';
            textStatus.className = 'text-status success';
            textInput.style.borderColor = '#27ae60';
        }
    },

    // Update check button state
    updateCheckButton: function() {
        const checkBtn = document.getElementById('check-btn');
        const hasFile = this.state.selectedFile !== null;
        const hasText = this.state.textInput.trim().length >= 10;
        
        if (checkBtn) {
            checkBtn.disabled = !hasFile && !hasText;
            
            if (hasFile || hasText) {
                checkBtn.textContent = '🔍 Cek Plagiat + AI Analysis';
                checkBtn.classList.remove('btn-disabled');
            } else {
                checkBtn.textContent = '📝 Pilih file atau ketik teks minimal 10 karakter';
                checkBtn.classList.add('btn-disabled');
            }
        }
    },

    // Validate file
    validateFile: function(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
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

        // Check file size
        if (file.size > maxSize) {
            Utils.showAlert(`File terlalu besar! Maksimal ${Utils.formatFileSize(maxSize)}`, 'error');
            return false;
        }

        // Check file type
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            Utils.showAlert(`Format file tidak didukung! Gunakan: ${allowedExtensions.join(', ')}`, 'error');
            return false;
        }

        return true;
    },

    // Remove selected file
    removeFile: function() {
        this.state.selectedFile = null;
        document.getElementById('targetFile').value = '';
        document.getElementById('file-info').innerHTML = '';
        this.updateCheckButton();
        this.saveState();
        
        Utils.showAlert('📄 File dihapus', 'info', 2000);
    },

    // Clear all input
    clearInput: function() {
        // Clear text
        const textInput = document.getElementById('inputText');
        if (textInput) {
            textInput.value = '';
            this.state.textInput = '';
        }

        // Clear file
        this.removeFile();

        // Clear results
        const results = document.getElementById('results');
        if (results) {
            results.style.display = 'none';
        }

        // Update stats and button
        this.updateTextStats();
        this.updateCheckButton();
        this.saveState();

        Utils.showAlert('🗑️ Input dibersihkan', 'info', 2000);
    },

    // Main plagiarism check function
    async checkPlagiarism() {
        const textInput = document.getElementById('inputText').value.trim();
        const loading = document.getElementById('loading');
        const results = document.getElementById('results');
        const progress = document.getElementById('progress');
        const progressDetails = document.getElementById('progress-details');

        // Validation
        if (!this.state.selectedFile && !textInput) {
            Utils.showAlert('Silakan pilih file atau masukkan teks terlebih dahulu!', 'error');
            return;
        }

        if (textInput && textInput.length < 10) {
            Utils.showAlert('Teks terlalu pendek! Minimal 10 karakter.', 'error');
            return;
        }

        // Set processing state
        this.state.isProcessing = true;
        this.updateProcessingState(true);

        // Show loading with enhanced progress animation
        loading.style.display = 'block';
        results.style.display = 'none';
        
        const progressMessages = [
            '🔍 Memvalidasi input...',
            '📄 Mengekstrak teks dari dokumen...',
            '🔄 Memuat database referensi...',
            '🧠 Menjalankan algoritma AI...',
            '📊 Menganalisis similarity patterns...',
            '💡 Generating smart recommendations...',
            '✨ Finalizing analysis...'
        ];

        let progressValue = 0;
        let messageIndex = 0;
        
        const progressInterval = setInterval(() => {
            progressValue += Math.random() * 15;
            if (progressValue > 90) progressValue = 90;
            progress.style.width = progressValue + '%';
            
            if (messageIndex < progressMessages.length) {
                progressDetails.textContent = progressMessages[messageIndex];
                messageIndex++;
            }
        }, 800);

        try {
            const formData = new FormData();
            
            if (this.state.selectedFile) {
                formData.append('targetFile', this.state.selectedFile);
            } else {
                formData.append('text', textInput);
            }

            // Use API with progress tracking if available
            let response;
            if (this.state.selectedFile && window.API && API.uploadWithProgress) {
                response = await API.uploadWithProgress('/check-plagiarism', formData, (progress) => {
                    document.getElementById('progress').style.width = Math.min(progress, 90) + '%';
                });
            } else {
                response = await fetch('/check-plagiarism', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                response = await response.json();
            }

            // Complete progress
            clearInterval(progressInterval);
            progress.style.width = '100%';
            progressDetails.textContent = '✅ Analysis completed!';

            setTimeout(() => {
                if (response.success) {
                    this.displayResults(response);
                    this.saveResultToState(response);
                    
                    // Auto-refresh history after successful check
                    setTimeout(() => {
                        if (window.HistoryAnalyticsComponent) {
                            HistoryAnalyticsComponent.loadHistory();
                        }
                    }, 1000);
                    
                    // Highlight AI Analysis feature
                    if (window.HeaderComponent) {
                        HeaderComponent.highlightFeature('AI Analysis');
                    }
                } else {
                    Utils.showAlert(response.error || 'Terjadi kesalahan saat memeriksa plagiat', 'error');
                }
            }, 500);

        } catch (error) {
            clearInterval(progressInterval);
            console.error('Plagiarism check error:', error);
            Utils.showAlert('Error: ' + error.message, 'error');
        } finally {
            setTimeout(() => {
                loading.style.display = 'none';
                progress.style.width = '0%';
                progressDetails.textContent = '🤖 Initializing analysis...';
                this.state.isProcessing = false;
                this.updateProcessingState(false);
            }, 1000);
        }
    },

    // Display results
    displayResults: function(data) {
        const results = document.getElementById('results');
        
        // Determine status class
        let statusClass = 'status-safe';
        if (data.maxSimilarity >= 80) statusClass = 'status-high';
        else if (data.maxSimilarity >= 50) statusClass = 'status-medium';
        else if (data.maxSimilarity >= 25) statusClass = 'status-low';

        // Build AI Recommendations HTML
        let aiRecommendationsHtml = '';
        if (data.aiRecommendations && data.aiRecommendations.length > 0) {
            aiRecommendationsHtml = `
                <div class="ai-recommendations">
                    <div class="ai-header">
                        <h4>🤖 AI Smart Recommendations</h4>
                        <span class="ai-subtitle">Personalized insights untuk meningkatkan kualitas penulisan</span>
                    </div>
                    ${data.aiRecommendations.map((rec, index) => `
                        <div class="recommendation-item priority-${rec.priority.toLowerCase()}" data-index="${index}">
                            <div class="recommendation-header">
                                <h5>${rec.title}</h5>
                                <span class="priority-badge priority-${rec.priority.toLowerCase()}">${rec.priority}</span>
                            </div>
                            <p class="recommendation-description">${rec.description}</p>
                            ${rec.actions && rec.actions.length > 0 ? `
                                <div class="recommendation-actions">
                                    <strong>Action Items:</strong>
                                    <ul>
                                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    <div class="ai-tips">
                        <small>💡 Tips: Fokus pada rekomendasi dengan prioritas "WAJIB" terlebih dahulu</small>
                    </div>
                </div>
            `;
        }

        // AI Thinking Section
        let aiThinkingHtml = '';
        if (data.aiThinking && data.aiThinking.totalIssues > 0) {
            aiThinkingHtml = `
                <div class="ai-thinking-section">
                    <div class="ai-analysis-header">
                        <h4>🤖 AI Thinking Analysis</h4>
                        <button class="btn btn-info" onclick="AIThinkingComponent.showModal('${data.historyId}', ${JSON.stringify(data.aiThinking).replace(/"/g, '&quot;')})">
                            📋 Lihat Detail Analysis
                        </button>
                    </div>
                    <div class="thinking-summary">
                        <p>${data.aiThinking.analysis}</p>
                        <div class="thinking-stats">
                            <strong>📊 Summary:</strong>
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <span class="stat-value">${data.aiThinking.totalIssues}</span>
                                    <span class="stat-label">Total Issues</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${data.aiThinking.exactMatches.length}</span>
                                    <span class="stat-label">Exact Matches</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${data.aiThinking.nearMatches.length}</span>
                                    <span class="stat-label">Near Matches</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${data.aiThinking.severity.toUpperCase()}</span>
                                    <span class="stat-label">Severity</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        results.innerHTML = `
            <div class="results-header">
                <h3>📊 Hasil Analisis Plagiarisme</h3>
                <div class="results-meta">
                    Dianalisis pada: ${new Date().toLocaleString('id-ID')} • 
                    ${data.sourceFileName ? `File: ${data.sourceFileName}` : 'Input teks langsung'}
                </div>
            </div>

            <div class="status-card ${statusClass}">
                <div class="status-content">
                    <h3>Status: ${data.overallStatus}</h3>
                    <div class="similarity-score">${data.maxSimilarity}%</div>
                    <p>Tingkat Kesamaan Tertinggi</p>
                    ${data.sourceFileName ? `<small>📄 ${data.sourceFileName}</small>` : ''}
                    ${data.historyId ? `<small class="history-id">🔗 ID: ${data.historyId}</small>` : ''}
                </div>
                <div class="status-indicator">
                    <div class="similarity-meter">
                        <div class="meter-fill" style="width: ${data.maxSimilarity}%; background-color: ${this.getSimilarityColor(data.maxSimilarity)};"></div>
                    </div>
                </div>
            </div>

            <div class="dashboard-stats">
                <div class="stat-card">
                    <div class="stat-value">${data.totalDocumentsChecked}</div>
                    <div class="stat-label">Dokumen Diperiksa</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.detailedResults.length}</div>
                    <div class="stat-label">Hasil Ditemukan</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.textLength ? (data.textLength / 1000).toFixed(1) + 'K' : 'N/A'}</div>
                    <div class="stat-label">Karakter Teks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.aiRecommendations ? data.aiRecommendations.length : 0}</div>
                    <div class="stat-label">AI Recommendations</div>
                </div>
            </div>

            ${aiThinkingHtml}
            ${aiRecommendationsHtml}

            <div class="detailed-results">
                <h4>📋 Hasil Detail Pemeriksaan:</h4>
                <div class="results-grid">
                    ${data.detailedResults.map((result, index) => {
                        const fileIcons = {
                            '.txt': '📝', '.pdf': '📄', '.doc': '📘',
                            '.docx': '📘', '.odt': '📄', '.rtf': '📄'
                        };
                        const icon = fileIcons[result.fileType] || '📄';
                        
                        return `
                        <div class="result-item" data-index="${index}">
                            <div class="result-header">
                                <div class="filename">
                                    ${icon} ${result.filename}
                                    <span class="file-type-badge">${result.fileType.toUpperCase()}</span>
                                </div>
                                <span class="similarity-score" style="color: ${this.getSimilarityColor(result.overallSimilarity)};">
                                    ${result.overallSimilarity}%
                                </span>
                            </div>
                            
                            <div class="similarity-bar">
                                <div class="similarity-fill" 
                                     style="width: ${result.overallSimilarity}%; background-color: ${this.getSimilarityColor(result.overallSimilarity)};">
                                </div>
                            </div>
                            
                            <div class="algorithm-breakdown">
                                <div class="algorithm-item">
                                    <small>Cosine Similarity</small>
                                    <div class="algorithm-score">${result.cosineSimilarity}%</div>
                                </div>
                                <div class="algorithm-item">
                                    <small>N-gram Analysis</small>
                                    <div class="algorithm-score">${result.ngramSimilarity}%</div>
                                </div>
                                <div class="algorithm-item">
                                    <small>Fingerprint Match</small>
                                    <div class="algorithm-score">${result.fingerprintSimilarity}%</div>
                                </div>
                            </div>
                            
                            ${result.matchingPhrases && result.matchingPhrases.length > 0 ? `
                                <div class="matching-phrases">
                                    <small class="phrases-label">🔍 Contoh frasa yang cocok:</small>
                                    ${result.matchingPhrases.slice(0, 3).map(phrase => `
                                        <div class="phrase-item">"${phrase.substring(0, 150)}${phrase.length > 150 ? '...' : ''}"</div>
                                    `).join('')}
                                    ${result.matchingPhrases.length > 3 ? `<small class="more-phrases">+${result.matchingPhrases.length - 3} frasa lainnya</small>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `}).join('')}
                </div>
            </div>

            <div class="results-actions">
                <button class="btn btn-info" onclick="NavigationComponent.showTab('history')">
                    📊 Lihat di History & Analytics
                </button>
                ${data.historyId ? `
                    <button class="btn btn-warning" onclick="ModalsComponent.showDownloadModal('${data.historyId}')">
                        📥 Download Report
                    </button>
                ` : ''}
                ${data.aiThinking && data.aiThinking.totalIssues > 0 ? `
                    <button class="btn btn-primary" onclick="AIThinkingComponent.showModal('${data.historyId}', ${JSON.stringify(data.aiThinking).replace(/"/g, '&quot;')})">
                        🤖 AI Thinking Detail
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="PlagiarismCheckerComponent.shareResults('${data.historyId}')">
                    📤 Bagikan Hasil
                </button>
            </div>

            <div class="results-footer">
                <small>
                    ⚠️ Hasil ini hanya untuk referensi. Interpretasi akhir tetap menjadi tanggung jawab pengguna. |
                    💡 Gunakan rekomendasi AI untuk meningkatkan kualitas penulisan.
                </small>
            </div>
        `;

        results.style.display = 'block';
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Add animation to results
        this.animateResults(results);
    },

    // Animate results appearance
    animateResults: function(resultsElement) {
        resultsElement.style.opacity = '0';
        resultsElement.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            resultsElement.style.transition = 'all 0.6s ease-out';
            resultsElement.style.opacity = '1';
            resultsElement.style.transform = 'translateY(0)';
        }, 100);

        // Animate individual result items
        const resultItems = resultsElement.querySelectorAll('.result-item');
        resultItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.4s ease-out';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, 200 + (index * 100));
        });
    },

    // Get similarity color
    getSimilarityColor: function(percentage) {
        if (percentage >= 80) return '#e74c3c';
        if (percentage >= 50) return '#e67e22';
        if (percentage >= 25) return '#f39c12';
        return '#27ae60';
    },

    // Update processing state
    updateProcessingState: function(isProcessing) {
        const checkBtn = document.getElementById('check-btn');
        const fileInput = document.getElementById('targetFile');
        const textInput = document.getElementById('inputText');

        if (checkBtn) {
            checkBtn.disabled = isProcessing;
            checkBtn.innerHTML = isProcessing ? 
                '⏳ Menganalisis...' : 
                '🔍 Cek Plagiat + AI Analysis';
        }

        if (fileInput) {
            fileInput.disabled = isProcessing;
        }

        if (textInput) {
            textInput.disabled = isProcessing;
        }
    },

    // Share results
    shareResults: function(historyId) {
        if (!historyId) {
            Utils.showAlert('Tidak ada hasil untuk dibagikan', 'error');
            return;
        }

        const shareData = {
            title: 'Hasil Analisis Plagiarisme',
            text: 'Lihat hasil analisis plagiarisme dengan AI recommendations',
            url: `${window.location.origin}?historyId=${historyId}`
        };

        if (navigator.share && Utils.device.isMobile()) {
            navigator.share(shareData).then(() => {
                Utils.showAlert('✅ Hasil berhasil dibagikan!', 'success');
            }).catch((error) => {
                console.error('Error sharing:', error);
                this.fallbackShare(shareData.url);
            });
        } else {
            this.fallbackShare(shareData.url);
        }
    },

    // Fallback share method
    fallbackShare: function(url) {
        Utils.copyToClipboard(url).then(() => {
            Utils.showAlert('🔗 Link hasil disalin ke clipboard!', 'success');
        }).catch(() => {
            Utils.showAlert('Gagal menyalin link', 'error');
        });
    },

    // Show quick help
    showQuickHelp: function() {
        const modal = document.getElementById('quick-help-modal');
        if (modal) {
            modal.style.display = 'block';
            Utils.animate.fadeIn(modal, 200);
        }
    },

    // Close quick help
    closeQuickHelp: function() {
        const modal = document.getElementById('quick-help-modal');
        if (modal) {
            Utils.animate.fadeOut(modal, 200);
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        }
    },

    // Save component state
    saveState: function() {
        const state = {
            textInput: this.state.textInput,
            hasFile: this.state.selectedFile !== null,
            fileName: this.state.selectedFile ? this.state.selectedFile.name : null,
            timestamp: Date.now()
        };
        
        Utils.storage.set('plagiarismCheckerState', state);
    },

    // Restore component state
    restoreState: function() {
        const savedState = Utils.storage.get('plagiarismCheckerState');
        if (!savedState) return;

        // Only restore if saved recently (within 1 hour)
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - savedState.timestamp > oneHour) {
            Utils.storage.remove('plagiarismCheckerState');
            return;
        }

        // Restore text input
        if (savedState.textInput) {
            const textInput = document.getElementById('inputText');
            if (textInput) {
                textInput.value = savedState.textInput;
                this.state.textInput = savedState.textInput;
                this.updateTextStats();
            }
        }

        this.updateCheckButton();
    },

    // Save result to state
    saveResultToState: function(result) {
        this.state.results = result;
        
        // Save to storage for potential sharing/recovery
        const resultState = {
            result: result,
            timestamp: Date.now()
        };
        
        Utils.storage.set('lastPlagiarismResult', resultState);
    },

    // Load result from URL parameter
    loadResultFromUrl: function() {
        const urlParams = Utils.url.getParams();
        if (urlParams.historyId) {
            // Load specific history entry
            this.loadHistoryResult(urlParams.historyId);
        }
    },

    // Load history result
    loadHistoryResult: async function(historyId) {
        try {
            const response = await fetch(`/check-history/${historyId}`);
            const data = await response.json();

            if (data.success) {
                // Convert history entry back to result format for display
                const resultData = {
                    success: true,
                    sourceFileName: data.historyEntry.fileName,
                    overallStatus: data.historyEntry.status,
                    maxSimilarity: data.historyEntry.maxSimilarity,
                    totalDocumentsChecked: data.historyEntry.totalDocumentsChecked,
                    textLength: data.historyEntry.textLength,
                    detailedResults: data.historyEntry.detailedResults,
                    aiRecommendations: data.historyEntry.aiRecommendations,
                    historyId: data.historyEntry.id,
                    aiThinking: data.historyEntry.aiRecommendations[0]?.aiThinking
                };

                this.displayResults(resultData);
                Utils.showAlert('📊 Hasil dimuat dari history', 'info');
            }
        } catch (error) {
            console.error('Error loading history result:', error);
            Utils.showAlert('Gagal memuat hasil dari history', 'error');
        }
    },

    // Export component for testing
    exportForTesting: function() {
        return {
            state: this.state,
            validateFile: this.validateFile.bind(this),
            getSimilarityColor: this.getSimilarityColor.bind(this),
            updateTextStats: this.updateTextStats.bind(this)
        };
    },

    // Cleanup component
    cleanup: function() {
        // Clear any timers
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        // Clear file references
        this.state.selectedFile = null;

        // Clear DOM references
        const fileInput = document.getElementById('targetFile');
        if (fileInput) {
            fileInput.value = '';
        }

        console.log('🧹 Plagiarism checker component cleaned up');
    },

    // Initialize component
    init: function() {
        this.render();
        this.loadResultFromUrl();
        
        // Set up periodic auto-save
        setInterval(() => {
            this.saveState();
        }, 30000); // Save every 30 seconds

        console.log('✅ Plagiarism checker component initialized');
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('plagiarism-checker')) {
        PlagiarismCheckerComponent.init();
    }
});

// Export for global access
window.PlagiarismCheckerComponent = PlagiarismCheckerComponent;