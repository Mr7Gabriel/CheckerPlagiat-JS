const AboutComponent = {
    render: function() {
        const container = document.getElementById('about-section');
        if (!container) return;

        container.innerHTML = `
            <div class="feature-highlight">
                <h3>🎯 Advanced Plagiarism Checker v2.1</h3>
                <p>Sistem deteksi plagiarisme canggih dengan AI-powered recommendations, history tracking, dan deep analytics untuk meningkatkan kualitas penulisan Anda.</p>
            </div>
            
            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">🧠</div>
                    <div class="feature-title">AI-Powered Analysis</div>
                    <div class="feature-description">
                        Kombinasi 3 algoritma canggih dengan AI recommendations dan AI Thinking untuk memberikan insights yang actionable dan personal
                    </div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <div class="feature-title">History & Analytics</div>
                    <div class="feature-description">
                        Track semua pemeriksaan, analisis pattern, dan monitor progress improvement dari waktu ke waktu dengan SQLite database
                    </div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📁</div>
                    <div class="feature-title">Multi-Format Support</div>
                    <div class="feature-description">
                        Mendukung berbagai format: TXT, PDF, DOC, DOCX, ODT, RTF dengan ekstraksi teks otomatis yang akurat
                    </div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🤖</div>
                    <div class="feature-title">AI Thinking Analysis</div>
                    <div class="feature-description">
                        AI mendeteksi exact matches dan memberikan saran perbaikan spesifik dengan kalimat yang manusiawi dan mudah dipahami
                    </div>
                </div>
            </div>
        `;
    }
};