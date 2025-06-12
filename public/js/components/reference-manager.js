// components/reference-manager.js - Reference Document Manager Component

const ReferenceManagerComponent = {
    // Component state
    state: {
        documents: [],
        isUploading: false,
        uploadProgress: 0,
        selectedDocuments: [],
        sortBy: 'date',
        sortOrder: 'desc',
        searchQuery: '',
        stats: {
            totalDocs: 0,
            totalSize: 0,
            totalChars: 0,
            formatCount: 0
        }
    },

    // Render the component
    render: function() {
        const container = document.getElementById('reference-manager');
        if (!container) {
            console.warn('Reference manager container not found');
            return;
        }

        container.innerHTML = this.generateHTML();
        this.attachEventListeners();
        this.loadDocuments();
        
        console.log('✅ Reference manager component rendered');
    },

    // Generate component HTML
    generateHTML: function() {
        return `
            <div class="reference-manager-wrapper">
                <!-- Upload Section -->
                <div class="upload-section">
                    <div class="upload-header">
                        <h3>📚 Upload Dokumen Referensi</h3>
                        <p>Upload dokumen yang akan digunakan sebagai database pembanding untuk deteksi plagiat</p>
                    </div>
                    
                    <div class="upload-area" id="upload-area">
                        <div class="upload-content">
                            <div class="upload-icon">📤</div>
                            <h4>Drop files here or click to browse</h4>
                            <p>Drag and drop dokumen referensi atau klik untuk memilih file</p>
                            
                            <div class="file-input-wrapper">
                                <input type="file" id="referenceFile" class="file-input" 
                                       accept=".txt,.pdf,.doc,.docx,.odt,.rtf" 
                                       onchange="ReferenceManagerComponent.handleFileSelect(event)">
                                <label for="referenceFile" class="file-input-button">
                                    📁 Pilih Dokumen Referensi
                                </label>
                            </div>
                        </div>
                        
                        <div class="format-support-info">
                            <strong>📁 Format yang didukung:</strong>
                            <div class="format-grid">
                                <div class="format-item" title="Plain Text Files">📝 Text (.txt)</div>
                                <div class="format-item" title="PDF Documents">📄 PDF (.pdf)</div>
                                <div class="format-item" title="Microsoft Word">📘 Word (.doc, .docx)</div>
                                <div class="format-item" title="OpenDocument Text">📄 OpenDoc (.odt)</div>
                                <div class="format-item" title="Rich Text Format">📄 RTF (.rtf)</div>
                            </div>
                            <small>
                                Tip: Upload berbagai jenis dokumen untuk database referensi yang komprehensif •
                                Max size: 10MB per file
                            </small>
                        </div>
                    </div>

                    <!-- Upload Progress -->
                    <div id="upload-progress" class="upload-progress" style="display: none;">
                        <div class="progress-header">
                            <span id="upload-filename">Uploading...</span>
                            <span id="upload-percentage">0%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="upload-progress-fill"></div>
                        </div>
                        <div class="progress-details">
                            <small id="upload-details">Extracting text content...</small>
                        </div>
                    </div>

                    <!-- Upload Status -->
                    <div id="upload-status" class="upload-status"></div>
                </div>

                <!-- Statistics Section -->
                <div class="reference-stats-section">
                    <h4>📊 Statistik Database Referensi</h4>
                    <div id="reference-stats" class="dashboard-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="total-docs">0</div>
                            <div class="stat-label">Total Dokumen</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-size">0 KB</div>
                            <div class="stat-label">Total Ukuran</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-chars">0</div>
                            <div class="stat-label">Total Karakter</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="format-count">0</div>
                            <div class="stat-label">Format Berbeda</div>
                        </div>
                    </div>
                </div>

                <!-- Document Management Section -->
                <div class="document-management-section">
                    <div class="management-header">
                        <h4>📋 Daftar Dokumen Referensi</h4>
                        <div class="management-controls">
                            <div class="search-box">
                                <input type="text" id="doc-search" placeholder="🔍 Cari dokumen..." 
                                       onkeyup="ReferenceManagerComponent.handleSearch(event)">
                                <button class="search-clear" onclick="ReferenceManagerComponent.clearSearch()" title="Clear Search">×</button>
                            </div>
                            
                            <div class="sort-controls">
                                <select id="doc-sort" onchange="ReferenceManagerComponent.handleSort()" title="Sort by">
                                    <option value="date">📅 Tanggal Upload</option>
                                    <option value="name">📄 Nama File</option>
                                    <option value="size">💾 Ukuran</option>
                                    <option value="type">📁 Tipe File</option>
                                </select>
                                
                                <button class="sort-order" onclick="ReferenceManagerComponent.toggleSortOrder()" title="Toggle Sort Order">
                                    <span id="doc-sort-order-icon">⬇️</span>
                                </button>
                            </div>
                            
                            <div class="action-buttons">
                                <button class="btn btn-info" onclick="ReferenceManagerComponent.refreshDocuments()" title="Refresh">
                                    🔄 Refresh
                                </button>
                                <button class="btn btn-warning" onclick="ReferenceManagerComponent.exportDocumentList()" title="Export List">
                                    📥 Export List
                                </button>
                                <button class="btn btn-danger" onclick="ReferenceManagerComponent.bulkDeleteSelected()" title="Delete Selected">
                                    🗑️ Delete Selected
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Bulk Actions -->
                    <div id="bulk-actions" class="bulk-actions" style="display: none;">
                        <div class="bulk-info">
                            <span id="selected-count">0</span> dokumen dipilih
                        </div>
                        <div class="bulk-buttons">
                            <button class="btn btn-info" onclick="ReferenceManagerComponent.analyzeSelected()">
                                🔍 Analyze Selected
                            </button>
                            <button class="btn btn-warning" onclick="ReferenceManagerComponent.downloadSelected()">
                                📥 Download Info
                            </button>
                            <button class="btn btn-danger" onclick="ReferenceManagerComponent.deleteSelected()">
                                🗑️ Delete Selected
                            </button>
                            <button class="btn btn-secondary" onclick="ReferenceManagerComponent.clearSelection()">
                                ❌ Clear Selection
                            </button>
                        </div>
                    </div>

                    <!-- Documents List -->
                    <div id="documents-container" class="documents-container">
                        <div class="empty-state">
                            <div class="empty-icon">📭</div>
                            <h4>Belum ada dokumen referensi</h4>
                            <p>Silakan upload dokumen untuk memulai analisis plagiat.</p>
                            <button class="btn btn-primary" onclick="document.getElementById('referenceFile').click()">
                                📤 Upload Dokumen Pertama
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Document Preview Modal -->
                <div id="document-preview-modal" class="modal" style="display: none;">
                    <div class="modal-content large-modal">
                        <div class="modal-header">
                            <h3 id="preview-title">📄 Preview Dokumen</h3>
                            <button class="modal-close" onclick="ReferenceManagerComponent.closePreview()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="document-preview-content">
                                <!-- Preview content will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Attach event listeners
    attachEventListeners: function() {
        // Drag and drop functionality
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            this.setupDragAndDrop(uploadArea);
        }

        // Search debounce
        const searchInput = document.getElementById('doc-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e);
                }, 300);
            });
        }

        // File input change
        const fileInput = document.getElementById('referenceFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }
    },

    // Setup drag and drop
    setupDragAndDrop: function(uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.highlight(uploadArea), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.unhighlight(uploadArea), false);
        });

        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    },

    // Prevent default drag behaviors
    preventDefaults: function(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    // Highlight drop area
    highlight: function(uploadArea) {
        uploadArea.classList.add('drag-over');
    },

    // Unhighlight drop area
    unhighlight: function(uploadArea) {
        uploadArea.classList.remove('drag-over');
    },

    // Handle file drop
    handleDrop: function(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFiles(files);
        }
    },

    // Handle file selection
    handleFileSelect: function(event) {
        const files = event.target.files;
        if (files.length > 0) {
            this.processFiles(files);
        }
    },

    // Process selected files
    processFiles: function(files) {
        // Process multiple files if selected
        for (let i = 0; i < files.length; i++) {
            this.uploadFile(files[i]);
        }
    },

    // Upload individual file
    async uploadFile(file) {
        if (!this.validateFile(file)) {
            return;
        }

        this.state.isUploading = true;
        this.showUploadProgress(true);
        this.updateUploadProgress(0, file.name, 'Validating file...');

        try {
            const formData = new FormData();
            formData.append('referenceFile', file);

            // Use API with progress tracking if available
            let response;
            if (window.API && API.uploadWithProgress) {
                response = await API.uploadWithProgress('/upload-reference', formData, (progress) => {
                    this.updateUploadProgress(progress, file.name, 'Uploading and extracting text...');
                });
            } else {
                // Fallback to regular fetch with simulated progress
                this.simulateUploadProgress(file.name);
                
                response = await fetch('/upload-reference', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                response = await response.json();
            }

            this.updateUploadProgress(100, file.name, 'Processing completed!');

            if (response.success) {
                this.showUploadStatus(`✅ ${response.message}`, 'success');
                
                // Add document to local state
                const newDoc = {
                    id: response.documentId,
                    filename: file.name,
                    fileType: response.fileType,
                    uploadDate: new Date().toISOString(),
                    fileSize: file.size,
                    contentLength: response.extractedLength
                };
                
                this.state.documents.unshift(newDoc);
                this.updateDocumentDisplay();
                this.updateStats();

                // Update navigation badge
                if (window.NavigationComponent) {
                    NavigationComponent.addBadge('reference', 1);
                }
            } else {
                throw new Error(response.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadStatus(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.state.isUploading = false;
            setTimeout(() => {
                this.showUploadProgress(false);
                this.clearUploadStatus();
            }, 2000);
        }
    },

    // Validate file before upload
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
            Utils.showAlert(`File "${file.name}" terlalu besar! Maksimal ${Utils.formatFileSize(maxSize)}`, 'error');
            return false;
        }

        // Check file type
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            Utils.showAlert(`Format file "${file.name}" tidak didukung! Gunakan: ${allowedExtensions.join(', ')}`, 'error');
            return false;
        }

        // Check for duplicate names
        if (this.state.documents.some(doc => doc.filename === file.name)) {
            const confirmUpload = confirm(`File "${file.name}" sudah ada. Tetap upload sebagai duplikat?`);
            if (!confirmUpload) {
                return false;
            }
        }

        return true;
    },

    // Show/hide upload progress
    showUploadProgress: function(show) {
        const progressDiv = document.getElementById('upload-progress');
        if (progressDiv) {
            progressDiv.style.display = show ? 'block' : 'none';
        }
    },

    // Update upload progress
    updateUploadProgress: function(percentage, filename, details) {
        const elements = {
            filename: document.getElementById('upload-filename'),
            percentage: document.getElementById('upload-percentage'),
            fill: document.getElementById('upload-progress-fill'),
            details: document.getElementById('upload-details')
        };

        if (elements.filename) {
            elements.filename.textContent = filename;
        }
        if (elements.percentage) {
            elements.percentage.textContent = Math.round(percentage) + '%';
        }
        if (elements.fill) {
            elements.fill.style.width = percentage + '%';
        }
        if (elements.details) {
            elements.details.textContent = details;
        }
    },

    // Simulate upload progress for regular fetch
    simulateUploadProgress: function(filename) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 90) {
                progress = 90;
                clearInterval(interval);
            }
            this.updateUploadProgress(progress, filename, 'Uploading and extracting text...');
        }, 200);
    },

    // Show upload status
    showUploadStatus: function(message, type) {
        const statusDiv = document.getElementById('upload-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="upload-message ${type}">
                    ${message}
                </div>
            `;
        }
    },

    // Clear upload status
    clearUploadStatus: function() {
        const statusDiv = document.getElementById('upload-status');
        if (statusDiv) {
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 3000);
        }
    },

    // Load documents from server
    async loadDocuments() {
        try {
            const response = await fetch('/reference-documents');
            const data = await response.json();

            if (data.success) {
                this.state.documents = data.documents;
                this.updateDocumentDisplay();
                this.updateStats();
            } else {
                throw new Error(data.error || 'Failed to load documents');
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            Utils.showAlert('Error loading documents: ' + error.message, 'error');
            this.displayEmptyState();
        }
    },

    // Update document display
    updateDocumentDisplay: function() {
        const container = document.getElementById('documents-container');
        
        if (this.state.documents.length === 0) {
            this.displayEmptyState();
            return;
        }

        // Apply current filters and sorting
        const filteredDocs = this.getFilteredAndSortedDocuments();

        container.innerHTML = `
            <div class="documents-header">
                <div class="select-all-wrapper">
                    <input type="checkbox" id="select-all-docs" onchange="ReferenceManagerComponent.toggleSelectAll()">
                    <label for="select-all-docs">Pilih Semua</label>
                </div>
                <div class="docs-info">
                    Menampilkan ${filteredDocs.length} dari ${this.state.documents.length} dokumen
                </div>
            </div>
            <div class="documents-grid">
                ${filteredDocs.map(doc => this.generateDocumentHTML(doc)).join('')}
            </div>
        `;

        this.animateDocuments();
    },

    // Generate individual document HTML
    generateDocumentHTML: function(doc) {
        const fileIcon = Utils.getFileIcon(doc.filename);
        const fileSize = Utils.formatFileSize(doc.fileSize || doc.contentLength);
        const uploadDate = new Date(doc.uploadDate).toLocaleDateString('id-ID');
        const contentPreview = `${(doc.contentLength / 1000).toFixed(1)}K chars`;

        return `
            <div class="document-item" data-id="${doc.id}">
                <div class="doc-checkbox">
                    <input type="checkbox" id="doc-check-${doc.id}" 
                           onchange="ReferenceManagerComponent.toggleDocumentSelection('${doc.id}')">
                </div>
                
                <div class="doc-content" onclick="ReferenceManagerComponent.previewDocument('${doc.id}')">
                    <div class="doc-header">
                        <div class="doc-icon">${fileIcon}</div>
                        <div class="doc-info">
                            <div class="doc-filename" title="${doc.filename}">${doc.filename}</div>
                            <div class="doc-type-badge">${doc.fileType.toUpperCase()}</div>
                        </div>
                    </div>
                    
                    <div class="doc-meta">
                        <div class="meta-item">
                            <span class="meta-label">📅 Upload:</span>
                            <span class="meta-value">${uploadDate}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">💾 Size:</span>
                            <span class="meta-value">${fileSize}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">📝 Content:</span>
                            <span class="meta-value">${contentPreview}</span>
                        </div>
                    </div>
                </div>
                
                <div class="doc-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); ReferenceManagerComponent.previewDocument('${doc.id}')" 
                            title="Preview">
                        👁️
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); ReferenceManagerComponent.downloadDocumentInfo('${doc.id}')" 
                            title="Download Info">
                        📥
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); ReferenceManagerComponent.analyzeDocument('${doc.id}')" 
                            title="Analyze">
                        🔍
                    </button>
                    <button class="action-btn delete-btn" onclick="event.stopPropagation(); ReferenceManagerComponent.deleteDocument('${doc.id}')" 
                            title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },

    // Animate documents
    animateDocuments: function() {
        const items = document.querySelectorAll('.document-item');
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
        const container = document.getElementById('documents-container');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h4>Belum ada dokumen referensi</h4>
                <p>Silakan upload dokumen untuk memulai analisis plagiat.</p>
                <button class="btn btn-primary" onclick="document.getElementById('referenceFile').click()">
                    📤 Upload Dokumen Pertama
                </button>
            </div>
        `;
    },

    // Update statistics
    updateStats: function() {
        const docs = this.state.documents;
        const stats = {
            totalDocs: docs.length,
            totalSize: docs.reduce((sum, doc) => sum + (doc.fileSize || doc.contentLength), 0),
            totalChars: docs.reduce((sum, doc) => sum + doc.contentLength, 0),
            formatCount: [...new Set(docs.map(doc => doc.fileType))].length
        };

        this.state.stats = stats;

        // Update display
        const elements = {
            totalDocs: document.getElementById('total-docs'),
            totalSize: document.getElementById('total-size'),
            totalChars: document.getElementById('total-chars'),
            formatCount: document.getElementById('format-count')
        };

        if (elements.totalDocs) {
            elements.totalDocs.textContent = stats.totalDocs;
        }
        if (elements.totalSize) {
            elements.totalSize.textContent = Utils.formatFileSize(stats.totalSize);
        }
        if (elements.totalChars) {
            elements.totalChars.textContent = `${(stats.totalChars / 1000).toFixed(1)}K`;
        }
        if (elements.formatCount) {
            elements.formatCount.textContent = stats.formatCount;
        }
    },

    // Handle search
    handleSearch: function(event) {
        this.state.searchQuery = event.target.value.toLowerCase();
        this.updateDocumentDisplay();
    },

    // Clear search
    clearSearch: function() {
        const searchInput = document.getElementById('doc-search');
        if (searchInput) {
            searchInput.value = '';
            this.state.searchQuery = '';
            this.updateDocumentDisplay();
        }
    },

    // Handle sort
    handleSort: function() {
        const sortSelect = document.getElementById('doc-sort');
        if (sortSelect) {
            this.state.sortBy = sortSelect.value;
            this.updateDocumentDisplay();
        }
    },

    // Toggle sort order
    toggleSortOrder: function() {
        this.state.sortOrder = this.state.sortOrder === 'desc' ? 'asc' : 'desc';
        const sortIcon = document.getElementById('doc-sort-order-icon');
        if (sortIcon) {
            sortIcon.textContent = this.state.sortOrder === 'desc' ? '⬇️' : '⬆️';
        }
        this.updateDocumentDisplay();
    },

    // Get filtered and sorted documents
    getFilteredAndSortedDocuments: function() {
        let docs = [...this.state.documents];

        // Apply search filter
        if (this.state.searchQuery) {
            docs = docs.filter(doc => 
                doc.filename.toLowerCase().includes(this.state.searchQuery)
            );
        }

        // Apply sorting
        docs.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.state.sortBy) {
                case 'name':
                    aValue = a.filename.toLowerCase();
                    bValue = b.filename.toLowerCase();
                    break;
                case 'size':
                    aValue = a.fileSize || a.contentLength;
                    bValue = b.fileSize || b.contentLength;
                    break;
                case 'type':
                    aValue = a.fileType;
                    bValue = b.fileType;
                    break;
                default: // date
                    aValue = new Date(a.uploadDate);
                    bValue = new Date(b.uploadDate);
            }

            if (this.state.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return docs;
    },

    // Toggle document selection
    toggleDocumentSelection: function(docId) {
        const checkbox = document.getElementById(`doc-check-${docId}`);
        if (checkbox) {
            if (checkbox.checked) {
                if (!this.state.selectedDocuments.includes(docId)) {
                    this.state.selectedDocuments.push(docId);
                }
            } else {
                this.state.selectedDocuments = this.state.selectedDocuments.filter(id => id !== docId);
            }
            this.updateBulkActions();
        }
    },

    // Toggle select all documents
    toggleSelectAll: function() {
        const selectAllCheckbox = document.getElementById('select-all-docs');
        const itemCheckboxes = document.querySelectorAll('[id^="doc-check-"]');
        
        if (selectAllCheckbox && selectAllCheckbox.checked) {
            // Select all
            this.state.selectedDocuments = [];
            itemCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
                const id = checkbox.id.replace('doc-check-', '');
                this.state.selectedDocuments.push(id);
            });
        } else {
            // Deselect all
            this.state.selectedDocuments = [];
            itemCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
        
        this.updateBulkActions();
    },

    // Clear selection
    clearSelection: function() {
        this.state.selectedDocuments = [];
        const checkboxes = document.querySelectorAll('[id^="doc-check-"]');
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
            if (this.state.selectedDocuments.length > 0) {
                bulkActions.style.display = 'flex';
                selectedCount.textContent = this.state.selectedDocuments.length;
            } else {
                bulkActions.style.display = 'none';
            }
        }
    },

    // Preview document
    async previewDocument(docId) {
        const doc = this.state.documents.find(d => d.id === docId);
        if (!doc) {
            Utils.showAlert('Document not found', 'error');
            return;
        }

        const modal = document.getElementById('document-preview-modal');
        const title = document.getElementById('preview-title');
        const content = document.getElementById('document-preview-content');

        if (modal && title && content) {
            title.textContent = `📄 Preview: ${doc.filename}`;
            
            // Show loading state
            content.innerHTML = `
                <div class="preview-loading">
                    <div class="spinner"></div>
                    <p>Loading document preview...</p>
                </div>
            `;

            modal.style.display = 'block';
            Utils.animate.fadeIn(modal, 200);

            try {
                // For now, show document metadata and stats
                // In a real implementation, you might fetch the actual content
                const previewHtml = `
                    <div class="document-preview">
                        <div class="preview-header">
                            <div class="preview-icon">${Utils.getFileIcon(doc.filename)}</div>
                            <div class="preview-info">
                                <h3>${doc.filename}</h3>
                                <p class="preview-meta">
                                    ${doc.fileType.toUpperCase()} • 
                                    ${Utils.formatFileSize(doc.fileSize || doc.contentLength)} • 
                                    ${(doc.contentLength / 1000).toFixed(1)}K characters
                                </p>
                            </div>
                        </div>
                        
                        <div class="preview-details">
                            <div class="detail-section">
                                <h4>📋 Document Information</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <strong>File Name:</strong> ${doc.filename}
                                    </div>
                                    <div class="detail-item">
                                        <strong>File Type:</strong> ${doc.fileType}
                                    </div>
                                    <div class="detail-item">
                                        <strong>Upload Date:</strong> ${new Date(doc.uploadDate).toLocaleString('id-ID')}
                                    </div>
                                    <div class="detail-item">
                                        <strong>File Size:</strong> ${Utils.formatFileSize(doc.fileSize || doc.contentLength)}
                                    </div>
                                    <div class="detail-item">
                                        <strong>Content Length:</strong> ${doc.contentLength.toLocaleString()} characters
                                    </div>
                                    <div class="detail-item">
                                        <strong>Estimated Words:</strong> ${Math.round(doc.contentLength / 5).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4>📊 Usage Statistics</h4>
                                <div class="usage-stats">
                                    <div class="stat-item">
                                        <div class="stat-value">Active</div>
                                        <div class="stat-label">Status</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">Reference</div>
                                        <div class="stat-label">Type</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${Math.round((doc.contentLength / 1000) * 0.8)}K</div>
                                        <div class="stat-label">Indexed Terms</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4>🔧 Actions</h4>
                                <div class="preview-actions">
                                    <button class="btn btn-info" onclick="ReferenceManagerComponent.downloadDocumentInfo('${doc.id}')">
                                        📥 Download Info
                                    </button>
                                    <button class="btn btn-warning" onclick="ReferenceManagerComponent.analyzeDocument('${doc.id}')">
                                        🔍 Analyze Content
                                    </button>
                                    <button class="btn btn-danger" onclick="ReferenceManagerComponent.deleteDocument('${doc.id}')">
                                        🗑️ Delete Document
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                content.innerHTML = previewHtml;
                
            } catch (error) {
                console.error('Error loading document preview:', error);
                content.innerHTML = `
                    <div class="preview-error">
                        <p>❌ Error loading document preview</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
    },

    // Close preview modal
    closePreview: function() {
        const modal = document.getElementById('document-preview-modal');
        if (modal) {
            Utils.animate.fadeOut(modal, 200);
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        }
    },

    // Download document info
    downloadDocumentInfo: function(docId) {
        const doc = this.state.documents.find(d => d.id === docId);
        if (!doc) {
            Utils.showAlert('Document not found', 'error');
            return;
        }

        const docInfo = {
            id: doc.id,
            filename: doc.filename,
            fileType: doc.fileType,
            uploadDate: doc.uploadDate,
            fileSize: doc.fileSize || doc.contentLength,
            contentLength: doc.contentLength,
            estimatedWords: Math.round(doc.contentLength / 5),
            status: 'Active',
            type: 'Reference Document'
        };

        const jsonContent = JSON.stringify(docInfo, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `document_info_${doc.filename.replace(/\.[^/.]+$/, '')}.json`;
        document.body.appendChild(a);
        a.click();
        
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        Utils.showAlert('📥 Document info downloaded!', 'success');
    },

    // Analyze document (placeholder for future analysis features)
    analyzeDocument: function(docId) {
        const doc = this.state.documents.find(d => d.id === docId);
        if (!doc) {
            Utils.showAlert('Document not found', 'error');
            return;
        }

        // Placeholder for document analysis functionality
        const analysisHtml = `
            <div class="document-analysis">
                <h3>📊 Document Analysis: ${doc.filename}</h3>
                <div class="analysis-results">
                    <div class="analysis-item">
                        <strong>Content Quality:</strong> High
                    </div>
                    <div class="analysis-item">
                        <strong>Language:</strong> Indonesian
                    </div>
                    <div class="analysis-item">
                        <strong>Readability:</strong> Good
                    </div>
                    <div class="analysis-item">
                        <strong>Unique Terms:</strong> ${Math.round(doc.contentLength / 10)}
                    </div>
                </div>
                <p><em>Advanced analysis features coming soon...</em></p>
            </div>
        `;

        Utils.showAlert(analysisHtml, 'info', 5000);
    },

    // Delete single document
    async deleteDocument(docId) {
        const doc = this.state.documents.find(d => d.id === docId);
        const docName = doc ? doc.filename : 'document';
        
        if (!confirm(`❓ Yakin ingin menghapus dokumen "${docName}" dari database referensi?`)) {
            return;
        }

        try {
            const response = await fetch(`/reference-documents/${docId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                Utils.showAlert('✅ Dokumen berhasil dihapus dari database referensi!', 'success');
                
                // Remove from local state
                this.state.documents = this.state.documents.filter(d => d.id !== docId);
                this.state.selectedDocuments = this.state.selectedDocuments.filter(id => id !== docId);
                
                this.updateDocumentDisplay();
                this.updateStats();
                this.updateBulkActions();
                
                // Close preview if it's open for this document
                this.closePreview();
                
            } else {
                throw new Error(data.error || 'Gagal menghapus dokumen');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            Utils.showAlert('Error: ' + error.message, 'error');
        }
    },

    // Analyze selected documents
    analyzeSelected: function() {
        if (this.state.selectedDocuments.length === 0) {
            Utils.showAlert('Pilih dokumen untuk dianalisis', 'warning');
            return;
        }

        const selectedDocs = this.state.documents.filter(doc => 
            this.state.selectedDocuments.includes(doc.id)
        );

        const totalSize = selectedDocs.reduce((sum, doc) => sum + (doc.fileSize || doc.contentLength), 0);
        const totalChars = selectedDocs.reduce((sum, doc) => sum + doc.contentLength, 0);
        const formats = [...new Set(selectedDocs.map(doc => doc.fileType))];

        const analysisReport = `
            <div class="bulk-analysis-report">
                <h3>📊 Bulk Analysis Report</h3>
                <div class="analysis-grid">
                    <div class="analysis-stat">
                        <div class="stat-value">${selectedDocs.length}</div>
                        <div class="stat-label">Documents</div>
                    </div>
                    <div class="analysis-stat">
                        <div class="stat-value">${Utils.formatFileSize(totalSize)}</div>
                        <div class="stat-label">Total Size</div>
                    </div>
                    <div class="analysis-stat">
                        <div class="stat-value">${(totalChars / 1000).toFixed(1)}K</div>
                        <div class="stat-label">Total Characters</div>
                    </div>
                    <div class="analysis-stat">
                        <div class="stat-value">${formats.length}</div>
                        <div class="stat-label">File Formats</div>
                    </div>
                </div>
                <div class="analysis-details">
                    <p><strong>Formats:</strong> ${formats.join(', ')}</p>
                    <p><strong>Average Size:</strong> ${Utils.formatFileSize(totalSize / selectedDocs.length)}</p>
                    <p><strong>Coverage:</strong> ${((selectedDocs.length / this.state.documents.length) * 100).toFixed(1)}% of total documents</p>
                </div>
            </div>
        `;

        Utils.showAlert(analysisReport, 'info', 8000);
    },

    // Download selected documents info
    downloadSelected: function() {
        if (this.state.selectedDocuments.length === 0) {
            Utils.showAlert('Pilih dokumen untuk didownload', 'warning');
            return;
        }

        const selectedDocs = this.state.documents.filter(doc => 
            this.state.selectedDocuments.includes(doc.id)
        );

        const exportData = {
            exportDate: new Date().toISOString(),
            totalDocuments: selectedDocs.length,
            documents: selectedDocs.map(doc => ({
                id: doc.id,
                filename: doc.filename,
                fileType: doc.fileType,
                uploadDate: doc.uploadDate,
                fileSize: doc.fileSize || doc.contentLength,
                contentLength: doc.contentLength
            }))
        };

        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `reference_documents_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        Utils.showAlert(`📥 Info ${selectedDocs.length} dokumen berhasil didownload!`, 'success');
    },

    // Delete selected documents
    async deleteSelected() {
        if (this.state.selectedDocuments.length === 0) {
            Utils.showAlert('Pilih dokumen untuk dihapus', 'warning');
            return;
        }

        const confirmMessage = `Yakin ingin menghapus ${this.state.selectedDocuments.length} dokumen dari database referensi? Tindakan ini tidak dapat dibatalkan.`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const deletePromises = this.state.selectedDocuments.map(id => 
                fetch(`/reference-documents/${id}`, { method: 'DELETE' })
            );

            const results = await Promise.allSettled(deletePromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.length - successful;

            if (successful > 0) {
                // Remove deleted documents from local state
                this.state.documents = this.state.documents.filter(doc => 
                    !this.state.selectedDocuments.includes(doc.id)
                );
                
                this.clearSelection();
                this.updateDocumentDisplay();
                this.updateStats();
                
                Utils.showAlert(`✅ ${successful} dokumen berhasil dihapus`, 'success');
            }

            if (failed > 0) {
                Utils.showAlert(`⚠️ ${failed} dokumen gagal dihapus`, 'warning');
            }
        } catch (error) {
            console.error('Error bulk deleting documents:', error);
            Utils.showAlert('Error deleting documents: ' + error.message, 'error');
        }
    },

    // Bulk delete selected (alias for deleteSelected)
    bulkDeleteSelected: function() {
        this.deleteSelected();
    },

    // Refresh documents
    refreshDocuments: function() {
        this.loadDocuments();
        Utils.showAlert('🔄 Documents refreshed!', 'success', 2000);
    },

    // Export document list
    exportDocumentList: function() {
        if (this.state.documents.length === 0) {
            Utils.showAlert('Tidak ada dokumen untuk diexport', 'warning');
            return;
        }

        // Create CSV content
        const csvHeaders = ['ID', 'Filename', 'File Type', 'Upload Date', 'File Size (bytes)', 'Content Length', 'Estimated Words'];
        const csvRows = this.state.documents.map(doc => [
            doc.id,
            `"${doc.filename}"`,
            doc.fileType,
            doc.uploadDate,
            doc.fileSize || doc.contentLength,
            doc.contentLength,
            Math.round(doc.contentLength / 5)
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `reference_documents_list_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        Utils.showAlert('📥 Document list exported to CSV!', 'success');
    },

    // Get component state
    getState: function() {
        return { ...this.state };
    },

    // Export component for testing
    exportForTesting: function() {
        return {
            state: this.state,
            validateFile: this.validateFile.bind(this),
            generateDocumentHTML: this.generateDocumentHTML.bind(this),
            updateStats: this.updateStats.bind(this)
        };
    },

    // Cleanup component
    cleanup: function() {
        // Clear any pending uploads
        this.state.isUploading = false;
        
        // Clear selections
        this.clearSelection();
        
        // Clear file input
        const fileInput = document.getElementById('referenceFile');
        if (fileInput) {
            fileInput.value = '';
        }

        console.log('🧹 Reference manager component cleaned up');
    },

    // Initialize component
    init: function() {
        this.render();
        
        console.log('✅ Reference manager component initialized');
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('reference-manager')) {
        ReferenceManagerComponent.init();
    }
});

// Export for global access
window.ReferenceManagerComponent = ReferenceManagerComponent;