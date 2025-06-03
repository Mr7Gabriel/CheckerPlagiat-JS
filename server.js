const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Initialize SQLite database
const db = new sqlite3.Database('plagiarism_checker.db');

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Table for reference documents
        db.run(`CREATE TABLE IF NOT EXISTS reference_documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            file_type TEXT NOT NULL,
            upload_date TEXT NOT NULL,
            file_size INTEGER,
            content_length INTEGER
        )`);

        // Table for history
        db.run(`CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            file_name TEXT NOT NULL,
            check_date TEXT NOT NULL,
            max_similarity REAL NOT NULL,
            status TEXT NOT NULL,
            total_documents_checked INTEGER,
            text_length INTEGER,
            detailed_results TEXT,
            ai_recommendations TEXT,
            summary TEXT
        )`);

        console.log('✅ Database tables initialized');
    });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Storage configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer with support for multiple document formats
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'text/plain',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.oasis.opendocument.text',
            'application/rtf',
            'text/rtf'
        ];
        
        const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.odt', '.rtf'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak didukung! Gunakan: .txt, .pdf, .doc, .docx, .odt, .rtf'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// File extraction functions (keeping existing logic)
async function extractTextFromFile(filePath, originalName) {
    const fileExtension = path.extname(originalName).toLowerCase();
    
    try {
        console.log(`Extracting text from ${originalName} (${fileExtension})`);
        
        switch (fileExtension) {
            case '.txt':
                return fs.readFileSync(filePath, 'utf8');
                
            case '.pdf':
                console.log('Processing PDF file...');
                const pdfBuffer = fs.readFileSync(filePath);
                const pdfData = await pdfParse(pdfBuffer);
                if (!pdfData.text || pdfData.text.trim().length === 0) {
                    throw new Error('PDF tidak mengandung teks yang dapat diekstrak');
                }
                return pdfData.text;
                
            case '.docx':
                console.log('Processing DOCX file...');
                const docxBuffer = fs.readFileSync(filePath);
                const docxResult = await mammoth.extractRawText({ buffer: docxBuffer });
                if (!docxResult.value || docxResult.value.trim().length === 0) {
                    throw new Error('File DOCX kosong atau tidak dapat dibaca');
                }
                return docxResult.value;
                
            case '.doc':
                console.log('Processing DOC file...');
                try {
                    const docBuffer = fs.readFileSync(filePath);
                    const docResult = await mammoth.extractRawText({ buffer: docBuffer });
                    if (!docResult.value || docResult.value.trim().length === 0) {
                        throw new Error('File DOC kosong');
                    }
                    return docResult.value;
                } catch (error) {
                    throw new Error('Format .doc tidak dapat diproses. Silakan convert ke .docx atau .txt');
                }
                
            case '.odt':
                console.log('Processing ODT file...');
                const odtContent = fs.readFileSync(filePath, 'utf8');
                const cleanedOdt = odtContent
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                if (!cleanedOdt || cleanedOdt.length < 10) {
                    throw new Error('File ODT tidak dapat dibaca atau kosong');
                }
                return cleanedOdt;
                
            case '.rtf':
                console.log('Processing RTF file...');
                const rtfContent = fs.readFileSync(filePath, 'utf8');
                const cleanedRtf = cleanRTF(rtfContent);
                if (!cleanedRtf || cleanedRtf.trim().length === 0) {
                    throw new Error('File RTF kosong atau tidak dapat dibaca');
                }
                return cleanedRtf;
                
            default:
                throw new Error(`Format file ${fileExtension} tidak didukung`);
        }
    } catch (error) {
        console.error(`Error processing file ${originalName}:`, error.message);
        throw new Error(`Error membaca file ${originalName}: ${error.message}`);
    }
}

function cleanRTF(rtfContent) {
    try {
        let cleanText = rtfContent
            .replace(/\\[a-z]+\d*/gi, ' ')
            .replace(/\{[^}]*\}/g, ' ')
            .replace(/\\['"][a-f0-9]{2}/gi, ' ')
            .replace(/\\\\/g, '\\')
            .replace(/\\[{}]/g, '')
            .replace(/\\[^a-zA-Z]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return cleanText;
    } catch (error) {
        throw new Error('Error cleaning RTF content');
    }
}

function validateAndSanitizeText(text, filename = '') {
    if (!text || typeof text !== 'string') {
        throw new Error('Konten file tidak valid');
    }
    
    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
        throw new Error(`File ${filename} tidak mengandung teks yang dapat dibaca`);
    }
    
    if (trimmedText.length < 10) {
        throw new Error(`File ${filename} terlalu pendek untuk dianalisis (minimal 10 karakter)`);
    }
    
    const sanitizedText = trimmedText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    return sanitizedText;
}

function preprocessText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function createNGrams(text, n = 3) {
    const words = text.split(' ');
    const ngrams = [];
    
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }
    
    return ngrams;
}

function calculateTF(text) {
    const words = text.split(' ');
    const tf = {};
    const totalWords = words.length;
    
    words.forEach(word => {
        tf[word] = (tf[word] || 0) + 1;
    });
    
    Object.keys(tf).forEach(word => {
        tf[word] = tf[word] / totalWords;
    });
    
    return tf;
}

function cosineSimilarity(text1, text2) {
    const tf1 = calculateTF(text1);
    const tf2 = calculateTF(text2);
    
    const words = [...new Set([...Object.keys(tf1), ...Object.keys(tf2)])];
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    words.forEach(word => {
        const val1 = tf1[word] || 0;
        const val2 = tf2[word] || 0;
        
        dotProduct += val1 * val2;
        magnitude1 += val1 * val1;
        magnitude2 += val2 * val2;
    });
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

function ngramSimilarity(text1, text2, n = 3) {
    const ngrams1 = createNGrams(text1, n);
    const ngrams2 = createNGrams(text2, n);
    
    const set1 = new Set(ngrams1);
    const set2 = new Set(ngrams2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    return intersection.size / Math.max(set1.size, set2.size);
}

function createFingerprint(text, windowSize = 50) {
    const words = text.split(' ');
    const fingerprints = [];
    
    for (let i = 0; i <= words.length - windowSize; i++) {
        const window = words.slice(i, i + windowSize).join(' ');
        const hash = crypto.createHash('md5').update(window).digest('hex');
        fingerprints.push({
            hash: hash,
            position: i,
            content: window
        });
    }
    
    return fingerprints;
}

// Enhanced AI Thinking function to detect exact matches and suggest changes
function generateAIThinking(targetText, sourceText, similarity) {
    const thinking = {
        exactMatches: [],
        suggestions: [],
        analysis: '',
        severity: 'low'
    };
    
    // Find exact matches using sentence-level comparison
    const targetSentences = targetText.match(/[^\.!?]+[\.!?]+/g) || [targetText];
    const sourceSentences = sourceText.match(/[^\.!?]+[\.!?]+/g) || [sourceText];
    
    const exactMatches = [];
    const nearMatches = [];
    
    targetSentences.forEach((targetSentence, targetIndex) => {
        const cleanTarget = targetSentence.trim().toLowerCase().replace(/[^\w\s]/g, '');
        
        sourceSentences.forEach((sourceSentence, sourceIndex) => {
            const cleanSource = sourceSentence.trim().toLowerCase().replace(/[^\w\s]/g, '');
            
            // Check for exact matches (>90% similarity)
            const sentenceSimilarity = cosineSimilarity(cleanTarget, cleanSource);
            
            if (sentenceSimilarity > 0.9) {
                exactMatches.push({
                    original: targetSentence.trim(),
                    source: sourceSentence.trim(),
                    similarity: Math.round(sentenceSimilarity * 100),
                    position: targetIndex,
                    type: 'exact'
                });
            } else if (sentenceSimilarity > 0.7) {
                nearMatches.push({
                    original: targetSentence.trim(),
                    source: sourceSentence.trim(),
                    similarity: Math.round(sentenceSimilarity * 100),
                    position: targetIndex,
                    type: 'near'
                });
            }
        });
    });
    
    // Generate human-like suggestions for each match
    const suggestions = [];
    
    [...exactMatches, ...nearMatches].forEach((match, index) => {
        const originalWords = match.original.split(' ');
        let suggestion = '';
        
        if (match.similarity >= 90) {
            // Exact match - need complete rewrite
            if (originalWords.length <= 10) {
                suggestion = `Kalimat "${match.original}" perlu ditulis ulang sepenuhnya. Coba ungkapkan ide yang sama dengan kata-kata dan struktur yang berbeda.`;
            } else {
                suggestion = `Paragraf ini terlalu mirip dengan sumber. Cobalah untuk:\n• Ubah struktur kalimat dari aktif ke pasif atau sebaliknya\n• Gunakan sinonim untuk kata-kata kunci\n• Pecah kalimat panjang menjadi beberapa kalimat pendek\n• Tambahkan transisi atau penjelasan tambahan`;
            }
        } else if (match.similarity >= 70) {
            // Near match - need paraphrasing
            suggestion = `Kalimat ini cukup mirip (${match.similarity}%) dengan sumber. Saran perbaikan:\n• Ganti beberapa kata dengan sinonim yang tepat\n• Ubah urutan informasi dalam kalimat\n• Tambahkan kata penghubung atau keterangan tambahan\n• Pastikan makna tetap sama tapi dengan gaya penulisan yang berbeda`;
        }
        
        suggestions.push({
            originalText: match.original,
            similarity: match.similarity,
            suggestion: suggestion,
            position: match.position,
            type: match.type
        });
    });
    
    // Generate overall analysis
    let analysis = '';
    if (exactMatches.length > 0) {
        thinking.severity = 'high';
        analysis = `🚨 Ditemukan ${exactMatches.length} kalimat yang hampir identik dengan sumber. `;
        if (nearMatches.length > 0) {
            analysis += `Ditambah ${nearMatches.length} kalimat lain yang sangat mirip. `;
        }
        analysis += `Ini menunjukkan kemungkinan copy-paste langsung. Diperlukan penulisan ulang yang komprehensif.`;
    } else if (nearMatches.length > 0) {
        thinking.severity = nearMatches.length > 3 ? 'high' : 'medium';
        analysis = `⚠️ Ditemukan ${nearMatches.length} kalimat yang mirip dengan sumber. Meski tidak identik, tingkat kemiripannya cukup tinggi untuk memerlukan parafrase yang lebih baik.`;
    } else {
        thinking.severity = 'low';
        analysis = `✅ Tidak ditemukan kalimat yang identik atau sangat mirip. Dokumen menunjukkan usaha parafrase yang baik.`;
    }
    
    return {
        exactMatches: exactMatches,
        nearMatches: nearMatches,
        suggestions: suggestions,
        analysis: analysis,
        severity: thinking.severity,
        totalIssues: exactMatches.length + nearMatches.length
    };
}

// Enhanced AI recommendations with thinking analysis
function generateAIRecommendations(plagiarismResults, targetText, aiThinking) {
    const maxSimilarity = Math.max(...plagiarismResults.map(r => r.overallSimilarity));
    const recommendations = [];
    
    // Add AI thinking analysis as first recommendation
    if (aiThinking && aiThinking.totalIssues > 0) {
        recommendations.push({
            priority: aiThinking.severity === 'high' ? 'WAJIB' : 'SEDANG',
            type: 'ai_analysis',
            title: '🤖 AI Thinking Analysis',
            description: aiThinking.analysis,
            actions: [
                `Ditemukan ${aiThinking.totalIssues} bagian yang memerlukan perbaikan`,
                'Lihat detail suggestions di bagian "Exact Matches" untuk panduan spesifik',
                'Fokus pada bagian dengan similarity >90% terlebih dahulu',
                'Gunakan teknik parafrase yang lebih kreatif'
            ],
            aiThinking: aiThinking
        });
    }
    
    // Continue with existing recommendation logic...
    if (maxSimilarity >= 80) {
        recommendations.push({
            priority: 'WAJIB',
            type: 'critical',
            title: 'Rewrite Komprehensif Diperlukan',
            description: 'Dokumen menunjukkan tingkat plagiat yang sangat tinggi (≥80%). Penulisan ulang komprehensif sangat diperlukan.',
            actions: [
                'Tulis ulang seluruh bagian yang teridentifikasi plagiat',
                'Gunakan sudut pandang dan struktur kalimat yang berbeda',
                'Tambahkan analisis dan interpretasi pribadi',
                'Berikan kutipan yang tepat untuk referensi'
            ],
            severity: 'high'
        });
    } else if (maxSimilarity >= 50) {
        recommendations.push({
            priority: 'SEDANG',
            type: 'paraphrasing',
            title: 'Tingkatkan Teknik Parafrase',
            description: 'Dokumen menunjukkan tingkat plagiat sedang (50-79%). Perbaikan teknik parafrase diperlukan.',
            actions: [
                'Ubah struktur kalimat secara signifikan',
                'Gunakan sinonim yang tepat dan variasi kata',
                'Reorganisasi urutan ide dan argumen',
                'Tambahkan contoh dan ilustrasi pribadi'
            ],
            severity: 'medium'
        });
    } else if (maxSimilarity >= 25) {
        recommendations.push({
            priority: 'RENDAH',
            type: 'improvement',
            title: 'Optimasi Orisinalitas',
            description: 'Dokumen menunjukkan tingkat plagiat rendah (25-49%). Beberapa perbaikan minor diperlukan.',
            actions: [
                'Review bagian-bagian dengan kesamaan tinggi',
                'Perkuat transisi antar paragraf dengan kata-kata Anda',
                'Tambahkan lebih banyak interpretasi personal',
                'Pastikan setiap kutipan memiliki sitasi yang tepat'
            ],
            severity: 'low'
        });
    } else {
        recommendations.push({
            priority: 'RENDAH',
            type: 'maintenance',
            title: 'Pertahankan Standar Orisinalitas',
            description: 'Dokumen menunjukkan tingkat orisinalitas yang baik (<25%). Pertahankan standar ini.',
            actions: [
                'Lakukan final check untuk konsistensi sitasi',
                'Review sekali lagi untuk memastikan tidak ada plagiat tidak disengaja',
                'Pertahankan gaya penulisan yang original',
                'Dokumentasikan sumber inspirasi dan referensi'
            ],
            severity: 'info'
        });
    }
    
    return recommendations;
}

// Enhanced plagiarism detection with AI thinking
function detectPlagiarism(targetText, sourceText, sourceDocument) {
    const preprocessedTarget = preprocessText(targetText);
    const preprocessedSource = preprocessText(sourceText);
    
    // 1. Cosine Similarity (bobot: 40%)
    const cosineSim = cosineSimilarity(preprocessedTarget, preprocessedSource);
    
    // 2. N-gram Similarity (bobot: 35%)
    const trigramSim = ngramSimilarity(preprocessedTarget, preprocessedSource, 3);
    const bigramSim = ngramSimilarity(preprocessedTarget, preprocessedSource, 2);
    const ngramAvg = (trigramSim + bigramSim) / 2;
    
    // 3. Fingerprint Matching (bobot: 25%)
    const targetFingerprints = createFingerprint(preprocessedTarget);
    const sourceFingerprints = createFingerprint(preprocessedSource);
    
    const sourceHashes = new Set(sourceFingerprints.map(fp => fp.hash));
    const matchingFingerprints = targetFingerprints.filter(fp => sourceHashes.has(fp.hash));
    const fingerprintSim = matchingFingerprints.length / Math.max(targetFingerprints.length, 1);
    
    // Kalkulasi skor akhir dengan weighted average
    const finalScore = (cosineSim * 0.4) + (ngramAvg * 0.35) + (fingerprintSim * 0.25);
    
    // Generate AI thinking analysis
    const aiThinking = generateAIThinking(targetText, sourceText, finalScore);
    
    return {
        overallSimilarity: Math.round(finalScore * 100),
        cosineSimilarity: Math.round(cosineSim * 100),
        ngramSimilarity: Math.round(ngramAvg * 100),
        fingerprintSimilarity: Math.round(fingerprintSim * 100),
        matchingPhrases: matchingFingerprints.slice(0, 5).map(fp => fp.content),
        aiThinking: aiThinking,
        sourceDocument: sourceDocument
    };
}

// Database helper functions
function saveReferenceDocument(document) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO reference_documents 
                    (id, filename, content, file_type, upload_date, file_size, content_length) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [
            document.id,
            document.filename,
            document.content,
            document.fileType,
            document.uploadDate,
            document.fileSize,
            document.content.length
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function getAllReferenceDocuments() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM reference_documents ORDER BY upload_date DESC`;
        
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function deleteReferenceDocument(id) {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM reference_documents WHERE id = ?`;
        
        db.run(sql, [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

function saveHistoryEntry(entry) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO history 
                    (id, file_name, check_date, max_similarity, status, total_documents_checked, 
                     text_length, detailed_results, ai_recommendations, summary) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [
            entry.id,
            entry.fileName,
            entry.checkDate,
            entry.maxSimilarity,
            entry.status,
            entry.totalDocumentsChecked,
            entry.textLength,
            JSON.stringify(entry.detailedResults),
            JSON.stringify(entry.aiRecommendations),
            JSON.stringify(entry.summary)
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function getHistoryEntries(limit = 10, offset = 0) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM history ORDER BY check_date DESC LIMIT ? OFFSET ?`;
        
        db.all(sql, [limit, offset], (err, rows) => {
            if (err) reject(err);
            else {
                const entries = rows.map(row => ({
                    ...row,
                    detailedResults: JSON.parse(row.detailed_results),
                    aiRecommendations: JSON.parse(row.ai_recommendations),
                    summary: JSON.parse(row.summary)
                }));
                resolve(entries);
            }
        });
    });
}

function getHistoryCount() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT COUNT(*) as count FROM history`;
        
        db.get(sql, [], (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
        });
    });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload reference document
app.post('/upload-reference', upload.single('referenceFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const filePath = req.file.path;
        const originalName = req.file.originalname;
        
        console.log(`Processing reference file: ${originalName}`);
        
        const rawContent = await extractTextFromFile(filePath, originalName);
        const content = validateAndSanitizeText(rawContent, originalName);
        
        const document = {
            id: Date.now().toString(),
            filename: originalName,
            content: content,
            fileType: path.extname(originalName).toLowerCase(),
            uploadDate: new Date().toISOString(),
            fileSize: req.file.size
        };
        
        await saveReferenceDocument(document);
        
        fs.unlinkSync(filePath);
        
        console.log(`Reference document added: ${originalName} (${content.length} characters)`);
        
        res.json({
            success: true,
            message: `Dokumen referensi ${originalName} berhasil diupload`,
            documentId: document.id,
            extractedLength: content.length,
            fileType: document.fileType
        });
    } catch (error) {
        console.error('Error uploading reference:', error.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Enhanced plagiarism check with AI thinking
app.post('/check-plagiarism', upload.single('targetFile'), async (req, res) => {
    try {
        let targetText = '';
        let fileName = 'Text Input';
        
        if (req.file) {
            const filePath = req.file.path;
            fileName = req.file.originalname;
            console.log(`Processing target file: ${fileName}`);
            
            const rawContent = await extractTextFromFile(filePath, fileName);
            targetText = validateAndSanitizeText(rawContent, fileName);
            
            fs.unlinkSync(filePath);
        } else if (req.body.text) {
            targetText = validateAndSanitizeText(req.body.text, 'Direct Text Input');
            fileName = 'Direct Text Input';
        } else {
            return res.status(400).json({ error: 'No text or file provided' });
        }
        
        const referenceDocuments = await getAllReferenceDocuments();
        
        if (referenceDocuments.length === 0) {
            return res.status(400).json({ 
                error: 'Belum ada dokumen referensi. Silakan upload dokumen referensi terlebih dahulu.' 
            });
        }
        
        console.log(`Checking plagiarism for ${fileName} (${targetText.length} characters) against ${referenceDocuments.length} reference documents`);
        
        const results = [];
        let maxSimilarity = 0;
        let combinedAIThinking = {
            exactMatches: [],
            nearMatches: [],
            suggestions: [],
            analysis: '',
            severity: 'low',
            totalIssues: 0
        };
        
        // Bandingkan dengan setiap dokumen di database
        referenceDocuments.forEach(doc => {
            const similarity = detectPlagiarism(targetText, doc.content, doc);
            
            if (similarity.overallSimilarity > maxSimilarity) {
                maxSimilarity = similarity.overallSimilarity;
            }
            
            // Combine AI thinking results
            if (similarity.aiThinking) {
                combinedAIThinking.exactMatches.push(...similarity.aiThinking.exactMatches);
                combinedAIThinking.nearMatches.push(...similarity.aiThinking.nearMatches);
                combinedAIThinking.suggestions.push(...similarity.aiThinking.suggestions);
                combinedAIThinking.totalIssues += similarity.aiThinking.totalIssues;
                
                if (similarity.aiThinking.severity === 'high') {
                    combinedAIThinking.severity = 'high';
                } else if (similarity.aiThinking.severity === 'medium' && combinedAIThinking.severity === 'low') {
                    combinedAIThinking.severity = 'medium';
                }
            }
            
            results.push({
                documentId: doc.id,
                filename: doc.filename,
                fileType: doc.file_type || '.txt',
                ...similarity
            });
        });
        
        // Sort by similarity
        results.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
        
        // Update combined AI thinking analysis
        if (combinedAIThinking.totalIssues > 0) {
            const exactCount = combinedAIThinking.exactMatches.length;
            const nearCount = combinedAIThinking.nearMatches.length;
            
            if (exactCount > 0) {
                combinedAIThinking.analysis = `🚨 Ditemukan ${exactCount} kalimat yang hampir identik dengan sumber referensi. `;
                if (nearCount > 0) {
                    combinedAIThinking.analysis += `Ditambah ${nearCount} kalimat lain yang sangat mirip. `;
                }
                combinedAIThinking.analysis += `Ini menunjukkan kemungkinan copy-paste langsung dari multiple sumber. Diperlukan penulisan ulang yang komprehensif.`;
            } else if (nearCount > 0) {
                combinedAIThinking.analysis = `⚠️ Ditemukan ${nearCount} kalimat yang mirip dengan berbagai sumber referensi. Meski tidak identik, tingkat kemiripannya cukup tinggi untuk memerlukan parafrase yang lebih baik.`;
            }
        } else {
            combinedAIThinking.analysis = `✅ Tidak ditemukan kalimat yang identik atau sangat mirip dengan sumber referensi. Dokumen menunjukkan usaha parafrase yang baik.`;
        }
        
        // Determine status
        let status = 'AMAN';
        let color = 'green';
        
        if (maxSimilarity >= 80) {
            status = 'PLAGIAT TINGGI';
            color = 'red';
        } else if (maxSimilarity >= 50) {
            status = 'PLAGIAT SEDANG';
            color = 'orange';
        } else if (maxSimilarity >= 25) {
            status = 'PLAGIAT RENDAH';
            color = 'yellow';
        }
        
        // Generate AI Recommendations with thinking
        const aiRecommendations = generateAIRecommendations(results, targetText, combinedAIThinking);
        
        // Save to history
        const historyEntry = {
            id: Date.now().toString(),
            fileName: fileName,
            checkDate: new Date().toISOString(),
            maxSimilarity: maxSimilarity,
            status: status,
            totalDocumentsChecked: referenceDocuments.length,
            textLength: targetText.length,
            detailedResults: results.slice(0, 10),
            aiRecommendations: aiRecommendations,
            summary: {
                avgCosine: Math.round(results.reduce((sum, r) => sum + r.cosineSimilarity, 0) / results.length),
                avgNgram: Math.round(results.reduce((sum, r) => sum + r.ngramSimilarity, 0) / results.length),
                avgFingerprint: Math.round(results.reduce((sum, r) => sum + r.fingerprintSimilarity, 0) / results.length)
            }
        };
        
        await saveHistoryEntry(historyEntry);
        
        console.log(`Plagiarism check completed. Max similarity: ${maxSimilarity}% (${status})`);
        
        res.json({
            success: true,
            sourceFileName: fileName,
            overallStatus: status,
            statusColor: color,
            maxSimilarity: maxSimilarity,
            totalDocumentsChecked: referenceDocuments.length,
            textLength: targetText.length,
            detailedResults: results.slice(0, 10),
            aiRecommendations: aiRecommendations,
            aiThinking: combinedAIThinking,
            historyId: historyEntry.id,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error checking plagiarism:', error.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// NEW: Download result as PDF/DOCX
app.post('/api/download-result/:historyId', async (req, res) => {
    try {
        const historyId = req.params.historyId;
        const format = req.body.format || 'pdf'; // pdf, docx, txt
        
        // Get history entry
        const historyEntry = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM history WHERE id = ?`, [historyId], (err, row) => {
                if (err) reject(err);
                else if (!row) reject(new Error('History entry not found'));
                else {
                    resolve({
                        ...row,
                        detailedResults: JSON.parse(row.detailed_results),
                        aiRecommendations: JSON.parse(row.ai_recommendations),
                        summary: JSON.parse(row.summary)
                    });
                }
            });
        });
        
        const timestamp = new Date(historyEntry.check_date).toLocaleString('id-ID');
        const filename = `plagiarism_report_${historyEntry.file_name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        
        if (format === 'txt') {
            // Generate TXT report
            let txtContent = `LAPORAN ANALISIS PLAGIARISME\n`;
            txtContent += `=====================================\n\n`;
            txtContent += `File: ${historyEntry.file_name}\n`;
            txtContent += `Tanggal Pemeriksaan: ${timestamp}\n`;
            txtContent += `Status: ${historyEntry.status}\n`;
            txtContent += `Tingkat Kesamaan: ${historyEntry.max_similarity}%\n`;
            txtContent += `Dokumen Referensi Diperiksa: ${historyEntry.total_documents_checked}\n`;
            txtContent += `Panjang Teks: ${historyEntry.text_length} karakter\n\n`;
            
            txtContent += `REKOMENDASI AI\n`;
            txtContent += `===============\n\n`;
            historyEntry.aiRecommendations.forEach((rec, index) => {
                txtContent += `${index + 1}. ${rec.title} (Prioritas: ${rec.priority})\n`;
                txtContent += `   ${rec.description}\n`;
                if (rec.actions) {
                    txtContent += `   Tindakan yang disarankan:\n`;
                    rec.actions.forEach(action => {
                        txtContent += `   - ${action}\n`;
                    });
                }
                txtContent += `\n`;
            });
            
            if (historyEntry.aiRecommendations[0]?.aiThinking?.suggestions) {
                txtContent += `AI THINKING - ANALISIS DETAIL\n`;
                txtContent += `===============================\n\n`;
                txtContent += `${historyEntry.aiRecommendations[0].aiThinking.analysis}\n\n`;
                
                txtContent += `SARAN PERBAIKAN SPESIFIK:\n\n`;
                historyEntry.aiRecommendations[0].aiThinking.suggestions.forEach((suggestion, index) => {
                    txtContent += `${index + 1}. Kalimat: "${suggestion.originalText}"\n`;
                    txtContent += `   Tingkat Kemiripan: ${suggestion.similarity}%\n`;
                    txtContent += `   Saran: ${suggestion.suggestion}\n\n`;
                });
            }
            
            txtContent += `HASIL DETAIL\n`;
            txtContent += `=============\n\n`;
            historyEntry.detailedResults.forEach((result, index) => {
                txtContent += `${index + 1}. ${result.filename}\n`;
                txtContent += `   Kesamaan Keseluruhan: ${result.overallSimilarity}%\n`;
                txtContent += `   Cosine Similarity: ${result.cosineSimilarity}%\n`;
                txtContent += `   N-gram Similarity: ${result.ngramSimilarity}%\n`;
                txtContent += `   Fingerprint Match: ${result.fingerprintSimilarity}%\n\n`;
            });
            
            txtContent += `\n---\nLaporan dibuat oleh Advanced Plagiarism Checker v2.0\n`;
            txtContent += `Waktu pembuatan: ${new Date().toLocaleString('id-ID')}\n`;
            
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
            res.send(txtContent);
            
        } else if (format === 'json') {
            // Generate JSON report
            const jsonReport = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generatedBy: 'Advanced Plagiarism Checker v2.0',
                    reportId: `report_${Date.now()}`
                },
                document: {
                    fileName: historyEntry.file_name,
                    checkDate: historyEntry.check_date,
                    textLength: historyEntry.text_length
                },
                results: {
                    overallStatus: historyEntry.status,
                    maxSimilarity: historyEntry.max_similarity,
                    totalDocumentsChecked: historyEntry.total_documents_checked,
                    summary: historyEntry.summary
                },
                aiAnalysis: {
                    recommendations: historyEntry.aiRecommendations,
                    thinking: historyEntry.aiRecommendations[0]?.aiThinking || null
                },
                detailedResults: historyEntry.detailedResults
            };
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
            res.json(jsonReport);
            
        } else {
            // Default to HTML report for easy viewing/printing
            let htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laporan Analisis Plagiarisme - ${historyEntry.file_name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .header p { color: #7f8c8d; margin: 5px 0; }
        .section { margin: 30px 0; }
        .section h2 { color: #3498db; border-left: 4px solid #3498db; padding-left: 15px; }
        .section h3 { color: #2c3e50; margin-top: 25px; }
        .status-box { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .status-safe { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status-low { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .status-medium { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .status-high { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .recommendation { border: 1px solid #ecf0f1; border-radius: 8px; padding: 20px; margin: 15px 0; }
        .recommendation.wajib { border-left: 4px solid #e74c3c; }
        .recommendation.sedang { border-left: 4px solid #f39c12; }
        .recommendation.rendah { border-left: 4px solid #27ae60; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 15px; font-size: 0.8em; font-weight: bold; color: white; }
        .priority-wajib { background: #e74c3c; }
        .priority-sedang { background: #f39c12; }
        .priority-rendah { background: #27ae60; }
        .result-item { border: 1px solid #ecf0f1; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .similarity-bar { width: 100%; height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .similarity-fill { height: 100%; border-radius: 10px; }
        .similarity-high { background: #e74c3c; }
        .similarity-medium { background: #f39c12; }
        .similarity-low { background: #27ae60; }
        .ai-thinking { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .suggestion-item { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0; }
        .suggestion-original { font-style: italic; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 4px; margin: 10px 0; }
        .footer { text-align: center; color: #7f8c8d; font-size: 0.9em; margin-top: 50px; border-top: 1px solid #ecf0f1; padding-top: 20px; }
        @media print { body { margin: 20px; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Laporan Analisis Plagiarisme</h1>
        <p><strong>File:</strong> ${historyEntry.file_name}</p>
        <p><strong>Tanggal Pemeriksaan:</strong> ${timestamp}</p>
        <p><strong>Dibuat oleh:</strong> Advanced Plagiarism Checker v2.0</p>
    </div>

    <div class="section">
        <h2>📊 Ringkasan Hasil</h2>
        <div class="status-box status-${historyEntry.status.includes('TINGGI') ? 'high' : historyEntry.status.includes('SEDANG') ? 'medium' : historyEntry.status.includes('RENDAH') ? 'low' : 'safe'}">
            <h3>Status: ${historyEntry.status}</h3>
            <h2>${historyEntry.max_similarity}%</h2>
            <p>Tingkat Kesamaan Tertinggi</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 2em; font-weight: bold; color: #3498db;">${historyEntry.total_documents_checked}</div>
                <div style="color: #7f8c8d;">Dokumen Diperiksa</div>
            </div>
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 2em; font-weight: bold; color: #3498db;">${(historyEntry.text_length / 1000).toFixed(1)}K</div>
                <div style="color: #7f8c8d;">Karakter Teks</div>
            </div>
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 2em; font-weight: bold; color: #3498db;">${historyEntry.aiRecommendations.length}</div>
                <div style="color: #7f8c8d;">AI Recommendations</div>
            </div>
        </div>
    </div>`;

            // Add AI Thinking section if available
            const aiThinking = historyEntry.aiRecommendations[0]?.aiThinking;
            if (aiThinking && aiThinking.totalIssues > 0) {
                htmlContent += `
    <div class="section">
        <h2>🤖 AI Thinking Analysis</h2>
        <div class="ai-thinking">
            <h3 style="margin-top: 0; color: white;">Analisis Kemiripan Detail</h3>
            <p>${aiThinking.analysis}</p>
            
            <h4>📋 Temuan Spesifik:</h4>
            <ul>
                <li>Total issues ditemukan: ${aiThinking.totalIssues}</li>
                <li>Exact matches: ${aiThinking.exactMatches.length}</li>
                <li>Near matches: ${aiThinking.nearMatches.length}</li>
                <li>Severity level: ${aiThinking.severity}</li>
            </ul>
            
            ${aiThinking.suggestions.length > 0 ? `
            <h4>💡 Saran Perbaikan Spesifik:</h4>
            ${aiThinking.suggestions.slice(0, 5).map((suggestion, index) => `
                <div class="suggestion-item">
                    <strong>Issue #${index + 1} (${suggestion.similarity}% similarity)</strong>
                    <div class="suggestion-original">"${suggestion.originalText}"</div>
                    <p>${suggestion.suggestion}</p>
                </div>
            `).join('')}
            ${aiThinking.suggestions.length > 5 ? `<p><em>... dan ${aiThinking.suggestions.length - 5} saran lainnya</em></p>` : ''}
            ` : ''}
        </div>
    </div>`;
            }

            // Add AI Recommendations section
            htmlContent += `
    <div class="section">
        <h2>🎯 Rekomendasi AI</h2>`;
            
            historyEntry.aiRecommendations.forEach((rec, index) => {
                if (rec.type !== 'ai_analysis') { // Skip the AI analysis rec as it's shown above
                    htmlContent += `
        <div class="recommendation ${rec.priority.toLowerCase()}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0;">${rec.title}</h3>
                <span class="priority-badge priority-${rec.priority.toLowerCase()}">${rec.priority}</span>
            </div>
            <p>${rec.description}</p>
            ${rec.actions ? `
            <div>
                <strong>Tindakan yang disarankan:</strong>
                <ul>
                    ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>`;
                }
            });

            htmlContent += `
    </div>

    <div class="section">
        <h2>📋 Hasil Detail Pemeriksaan</h2>`;
            
            historyEntry.detailedResults.slice(0, 10).forEach((result, index) => {
                const similarityClass = result.overallSimilarity >= 80 ? 'high' : result.overallSimilarity >= 50 ? 'medium' : 'low';
                htmlContent += `
        <div class="result-item">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: bold;">📄 ${result.filename}</span>
                <span style="font-weight: bold; font-size: 1.2em; color: ${similarityClass === 'high' ? '#e74c3c' : similarityClass === 'medium' ? '#f39c12' : '#27ae60'};">
                    ${result.overallSimilarity}%
                </span>
            </div>
            
            <div class="similarity-bar">
                <div class="similarity-fill similarity-${similarityClass}" style="width: ${result.overallSimilarity}%;"></div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-weight: bold; color: #3498db;">${result.cosineSimilarity}%</div>
                    <div style="font-size: 0.8em; color: #7f8c8d;">Cosine</div>
                </div>
                <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-weight: bold; color: #3498db;">${result.ngramSimilarity}%</div>
                    <div style="font-size: 0.8em; color: #7f8c8d;">N-gram</div>
                </div>
                <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-weight: bold; color: #3498db;">${result.fingerprintSimilarity}%</div>
                    <div style="font-size: 0.8em; color: #7f8c8d;">Fingerprint</div>
                </div>
            </div>
        </div>`;
            });

            htmlContent += `
    </div>

    <div class="footer">
        <p>Laporan ini dibuat secara otomatis oleh <strong>Advanced Plagiarism Checker v2.0</strong></p>
        <p>Waktu pembuatan: ${new Date().toLocaleString('id-ID')}</p>
        <p>⚠️ Laporan ini hanya untuk referensi. Interpretasi akhir tetap menjadi tanggung jawab pengguna.</p>
    </div>
</body>
</html>`;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);
            res.send(htmlContent);
        }
        
    } catch (error) {
        console.error('Error generating download:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get history with pagination
app.get('/check-history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const [entries, totalCount] = await Promise.all([
            getHistoryEntries(limit, offset),
            getHistoryCount()
        ]);
        
        const historyWithSummary = entries.map(entry => ({
            id: entry.id,
            fileName: entry.file_name,
            checkDate: entry.check_date,
            maxSimilarity: entry.max_similarity,
            status: entry.status,
            totalDocumentsChecked: entry.total_documents_checked,
            textLength: entry.text_length,
            recommendationCount: entry.aiRecommendations ? entry.aiRecommendations.length : 0,
            criticalIssues: entry.aiRecommendations ? entry.aiRecommendations.filter(r => r.priority === 'WAJIB').length : 0,
            summary: entry.summary
        }));
        
        res.json({
            success: true,
            history: historyWithSummary,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalEntries: totalCount,
                hasNext: offset + limit < totalCount,
                hasPrev: offset > 0
            }
        });
    } catch (error) {
        console.error('Error loading history:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get specific history entry
app.get('/check-history/:id', async (req, res) => {
    try {
        const historyId = req.params.id;
        
        const historyEntry = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM history WHERE id = ?`, [historyId], (err, row) => {
                if (err) reject(err);
                else if (!row) reject(new Error('History entry not found'));
                else {
                    resolve({
                        ...row,
                        detailedResults: JSON.parse(row.detailed_results),
                        aiRecommendations: JSON.parse(row.ai_recommendations),
                        summary: JSON.parse(row.summary)
                    });
                }
            });
        });
        
        res.json({
            success: true,
            historyEntry: {
                id: historyEntry.id,
                fileName: historyEntry.file_name,
                checkDate: historyEntry.check_date,
                maxSimilarity: historyEntry.max_similarity,
                status: historyEntry.status,
                totalDocumentsChecked: historyEntry.total_documents_checked,
                textLength: historyEntry.text_length,
                detailedResults: historyEntry.detailedResults,
                aiRecommendations: historyEntry.aiRecommendations,
                summary: historyEntry.summary
            }
        });
    } catch (error) {
        console.error('Error loading history entry:', error.message);
        res.status(404).json({ error: error.message });
    }
});

// Delete history entry
app.delete('/check-history/:id', async (req, res) => {
    try {
        const historyId = req.params.id;
        
        const deleted = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM history WHERE id = ?`, [historyId], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
        
        if (deleted) {
            res.json({ success: true, message: 'History entry deleted successfully' });
        } else {
            res.status(404).json({ error: 'History entry not found' });
        }
    } catch (error) {
        console.error('Error deleting history entry:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Clear all history
app.delete('/check-history', async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            db.run(`DELETE FROM history`, [], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
        
        res.json({ success: true, message: 'All history entries cleared successfully' });
    } catch (error) {
        console.error('Error clearing history:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get reference documents
app.get('/reference-documents', async (req, res) => {
    try {
        const documents = await getAllReferenceDocuments();
        
        const docs = documents.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            fileType: doc.file_type,
            uploadDate: doc.upload_date,
            contentLength: doc.content_length,
            fileSize: doc.file_size || 0
        }));
        
        res.json({
            success: true,
            documents: docs,
            totalDocuments: docs.length
        });
    } catch (error) {
        console.error('Error loading reference documents:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Delete reference document
app.delete('/reference-documents/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await deleteReferenceDocument(id);
        
        if (deleted) {
            console.log(`Reference document deleted: ${id}`);
            res.json({ success: true, message: 'Document deleted successfully' });
        } else {
            res.status(404).json({ error: 'Document not found' });
        }
    } catch (error) {
        console.error('Error deleting reference document:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Dashboard stats
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [totalChecks, totalReferences] = await Promise.all([
            getHistoryCount(),
            new Promise((resolve, reject) => {
                db.get(`SELECT COUNT(*) as count FROM reference_documents`, [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            })
        ]);
        
        const recentChecks = await getHistoryEntries(7, 0);
        
        const avgSimilarity = recentChecks.length > 0 
            ? Math.round(recentChecks.reduce((sum, check) => sum + check.max_similarity, 0) / recentChecks.length)
            : 0;
        
        // Status distribution
        const statusDistribution = {
            safe: 0,
            low: 0,
            medium: 0,
            high: 0
        };
        
        const allHistory = await new Promise((resolve, reject) => {
            db.all(`SELECT max_similarity FROM history`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        allHistory.forEach(entry => {
            if (entry.max_similarity < 25) statusDistribution.safe++;
            else if (entry.max_similarity < 50) statusDistribution.low++;
            else if (entry.max_similarity < 80) statusDistribution.medium++;
            else statusDistribution.high++;
        });
        
        // File type stats
        const fileTypeStats = {};
        const fileNameHistory = await new Promise((resolve, reject) => {
            db.all(`SELECT file_name FROM history`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        fileNameHistory.forEach(entry => {
            const ext = path.extname(entry.file_name).toLowerCase() || '.txt';
            fileTypeStats[ext] = (fileTypeStats[ext] || 0) + 1;
        });
        
        // Critical recommendations count
        const criticalRecommendations = await new Promise((resolve, reject) => {
            db.all(`SELECT ai_recommendations FROM history`, [], (err, rows) => {
                if (err) reject(err);
                else {
                    let count = 0;
                    rows.forEach(row => {
                        try {
                            const recs = JSON.parse(row.ai_recommendations);
                            count += recs.filter(r => r.priority === 'WAJIB').length;
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    });
                    resolve(count);
                }
            });
        });
        
        res.json({
            success: true,
            stats: {
                totalChecks,
                totalReferences,
                avgSimilarity,
                statusDistribution,
                fileTypeStats,
                criticalRecommendations,
                recentActivity: recentChecks.map(check => ({
                    id: check.id,
                    fileName: check.file_name,
                    similarity: check.max_similarity,
                    date: check.check_date,
                    status: check.status
                }))
            }
        });
    } catch (error) {
        console.error('Error loading dashboard stats:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Export history to CSV
app.get('/api/export-history', async (req, res) => {
    try {
        const format = req.query.format || 'csv';
        
        if (format === 'csv') {
            const allHistory = await new Promise((resolve, reject) => {
                db.all(`SELECT * FROM history ORDER BY check_date DESC`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            let csvContent = 'ID,File Name,Check Date,Similarity %,Status,Documents Checked,Text Length,Critical Issues\n';
            
            allHistory.forEach(entry => {
                let criticalIssues = 0;
                try {
                    const recs = JSON.parse(entry.ai_recommendations);
                    criticalIssues = recs.filter(r => r.priority === 'WAJIB').length;
                } catch (e) {
                    // Skip invalid JSON
                }
                
                csvContent += `"${entry.id}","${entry.file_name}","${entry.check_date}","${entry.max_similarity}","${entry.status}","${entry.total_documents_checked}","${entry.text_length}","${criticalIssues}"\n`;
            });
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="plagiarism_history.csv"');
            res.send(csvContent);
        } else {
            res.status(400).json({ error: 'Format not supported. Use format=csv' });
        }
    } catch (error) {
        console.error('Error exporting history:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Pattern recommendations
app.get('/api/pattern-recommendations', async (req, res) => {
    try {
        const historyCount = await getHistoryCount();
        
        if (historyCount < 3) {
            return res.json({
                success: true,
                recommendations: [{
                    type: 'info',
                    title: 'Belum Cukup Data',
                    description: 'Lakukan minimal 3 pemeriksaan untuk mendapatkan rekomendasi berdasarkan pattern.',
                    priority: 'INFO'
                }]
            });
        }
        
        const allHistory = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM history ORDER BY check_date DESC`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const patternRecommendations = [];
        
        // Pattern analysis
        const avgSimilarity = allHistory.reduce((sum, h) => sum + h.max_similarity, 0) / allHistory.length;
        const recentAvg = allHistory.slice(0, 5).reduce((sum, h) => sum + h.max_similarity, 0) / Math.min(5, allHistory.length);
        
        if (recentAvg > avgSimilarity + 10) {
            patternRecommendations.push({
                type: 'trend',
                title: 'Tren Peningkatan Plagiat',
                description: `Tingkat plagiat meningkat ${Math.round(recentAvg - avgSimilarity)}% dari rata-rata historis.`,
                priority: 'SEDANG',
                actions: [
                    'Review dan perbaiki metode penulisan',
                    'Tingkatkan penggunaan teknik parafrase',
                    'Konsultasi dengan supervisor atau mentor',
                    'Gunakan lebih banyak sumber referensi yang beragam'
                ]
            });
        }
        
        res.json({
            success: true,
            recommendations: patternRecommendations,
            analytics: {
                avgSimilarity: Math.round(avgSimilarity),
                recentAvg: Math.round(recentAvg),
                totalChecks: historyCount
            }
        });
    } catch (error) {
        console.error('Error generating pattern recommendations:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Deep analysis
app.post('/api/deep-analysis', async (req, res) => {
    try {
        const { historyIds } = req.body;
        
        if (!historyIds || !Array.isArray(historyIds)) {
            return res.status(400).json({ error: 'Invalid history IDs provided' });
        }
        
        const selectedEntries = await new Promise((resolve, reject) => {
            const placeholders = historyIds.map(() => '?').join(',');
            db.all(`SELECT * FROM history WHERE id IN (${placeholders})`, historyIds, (err, rows) => {
                if (err) reject(err);
                else {
                    const entries = rows.map(row => ({
                        ...row,
                        detailedResults: JSON.parse(row.detailed_results),
                        aiRecommendations: JSON.parse(row.ai_recommendations),
                        summary: JSON.parse(row.summary)
                    }));
                    resolve(entries);
                }
            });
        });
        
        if (selectedEntries.length === 0) {
            return res.status(404).json({ error: 'No matching history entries found' });
        }
        
        // Deep analysis logic
        const analysis = {
            overallAssessment: '',
            keyFindings: [],
            detailedRecommendations: [],
            improvementPlan: [],
            riskAssessment: ''
        };
        
        const avgSimilarity = selectedEntries.reduce((sum, e) => sum + e.max_similarity, 0) / selectedEntries.length;
        const maxSimilarity = Math.max(...selectedEntries.map(e => e.max_similarity));
        const minSimilarity = Math.min(...selectedEntries.map(e => e.max_similarity));
        
        // Overall Assessment
        if (avgSimilarity >= 70) {
            analysis.overallAssessment = 'TINGKAT RISIKO TINGGI: Dokumen-dokumen menunjukkan pola plagiat yang konsisten dan memerlukan intervensi segera.';
        } else if (avgSimilarity >= 40) {
            analysis.overallAssessment = 'TINGKAT RISIKO SEDANG: Ada indikasi masalah dalam teknik penulisan yang perlu diperbaiki secara sistematis.';
        } else if (avgSimilarity >= 20) {
            analysis.overallAssessment = 'TINGKAT RISIKO RENDAH: Kualitas penulisan sudah cukup baik, namun masih ada ruang untuk peningkatan.';
        } else {
            analysis.overallAssessment = 'TINGKAT RISIKO MINIMAL: Kualitas orisinalitas sangat baik, pertahankan standar ini.';
        }
        
        // Key Findings
        analysis.keyFindings = [
            `Rata-rata tingkat kesamaan: ${Math.round(avgSimilarity)}%`,
            `Rentang kesamaan: ${minSimilarity}% - ${maxSimilarity}%`,
            `Variasi kualitas: ${maxSimilarity - minSimilarity > 30 ? 'Tinggi (inkonsisten)' : 'Rendah (konsisten)'}`,
            `Jumlah dokumen dianalisis: ${selectedEntries.length}`,
            `Dokumen dengan risiko tinggi: ${selectedEntries.filter(e => e.max_similarity >= 80).length}`
        ];
        
        res.json({
            success: true,
            analysis: analysis,
            metadata: {
                analyzedDocuments: selectedEntries.length,
                analysisDate: new Date().toISOString(),
                avgSimilarity: Math.round(avgSimilarity)
            }
        });
    } catch (error) {
        console.error('Error performing deep analysis:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API info
app.get('/api/info', async (req, res) => {
    try {
        const [totalRefs, totalHistory] = await Promise.all([
            new Promise((resolve, reject) => {
                db.get(`SELECT COUNT(*) as count FROM reference_documents`, [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            }),
            getHistoryCount()
        ]);
        
        res.json({
            name: 'Advanced Plagiarism Checker',
            version: '2.0.0',
            supportedFormats: ['.txt', '.pdf', '.doc', '.docx', '.odt', '.rtf'],
            maxFileSize: '10MB',
            totalReferenceDocuments: totalRefs,
            totalHistoryEntries: totalHistory,
            algorithms: ['Cosine Similarity', 'N-gram Analysis', 'Fingerprinting'],
            features: ['AI Recommendations', 'AI Thinking Analysis', 'History Tracking', 'Pattern Analysis', 'Deep Analysis', 'Download Reports'],
            database: 'SQLite',
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting API info:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error.message);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File terlalu besar (maksimal 10MB)' });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Format file tidak diizinkan' });
        }
    }
    
    res.status(500).json({ error: error.message || 'Internal server error' });
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down server gracefully...');
    
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Advanced Plagiarism Checker Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
    console.log(`📁 Upload folder: ${path.join(__dirname, 'uploads')}`);
    console.log(`💾 Database: SQLite (plagiarism_checker.db)`);
    console.log(`📄 Supported formats: .txt, .pdf, .doc, .docx, .odt, .rtf`);
    console.log(`💾 Max file size: 10MB`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆕 NEW FEATURES v2.0:');
    console.log('   ✅ SQLite Database Integration');
    console.log('   ✅ AI Thinking Analysis with Exact Match Detection');
    console.log('   ✅ Download Reports (HTML, TXT, JSON)');
    console.log('   ✅ Enhanced Pattern Analysis');
    console.log('   ✅ Persistent Data Storage');
    console.log('   ✅ Human-like Suggestions for Text Improvement');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Ready to check for plagiarism with advanced AI insights!');
    
    // Initialize database
    initializeDatabase();
});

module.exports = app;