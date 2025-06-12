const ModalsComponent = {
    init: function() {
        // Set up global modal functions
        window.closeModal = () => this.closeModal();
        window.closeAIThinkingModal = () => this.closeAIThinkingModal();
        window.closeDownloadModal = () => this.closeDownloadModal();
        window.downloadReport = (format) => this.downloadReport(format);
    },

    closeAll: function() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    },

    closeModal: function() {
        const modal = document.getElementById('history-modal');
        if (modal) modal.style.display = 'none';
    },

    closeAIThinkingModal: function() {
        const modal = document.getElementById('ai-thinking-modal');
        if (modal) modal.style.display = 'none';
    },

    closeDownloadModal: function() {
        const modal = document.getElementById('download-modal');
        if (modal) modal.style.display = 'none';
    },

    showDownloadModal: function(historyId) {
        window.PlagiarismChecker.downloadHistoryId = historyId;
        const modal = document.getElementById('download-modal');
        if (modal) modal.style.display = 'block';
    },

    async downloadReport(format) {
        if (!window.PlagiarismChecker.downloadHistoryId) {
            Utils.showAlert('History ID tidak ditemukan', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/download-result/${window.PlagiarismChecker.downloadHistoryId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format: format })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `plagiarism_report_${Date.now()}.${format}`;
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                    if (filenameMatch) filename = filenameMatch[1];
                }
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.closeDownloadModal();
                Utils.showAlert(`✅ Report berhasil didownload dalam format ${format.toUpperCase()}!`, 'success');
            } else {
                throw new Error('Failed to download report');
            }
        } catch (error) {
            Utils.showAlert('Error downloading report: ' + error.message, 'error');
        }
    }
};