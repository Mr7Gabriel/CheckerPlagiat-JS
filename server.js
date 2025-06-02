const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = 3000;

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
            'text/plain',                                    // .txt
            'application/pdf',                               // .pdf
            'application/msword',                            // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.oasis.opendocument.text',       // .odt
            'application/rtf',                               // .rtf
            'text/rtf'                                       // .rtf alternative
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

// In-memory databases
let documentDatabase = [];
let historyDatabase = []; // NEW: Database untuk menyimpan history pemeriksaan

// Fungsi untuk mengekstrak teks dari berbagai format file
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

// Fungsi untuk membersihkan RTF content
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

// Fungsi untuk validasi dan sanitasi teks
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

// Fungsi untuk membersihkan dan memproses teks
function preprocessText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') 
        .replace(/\s+/g, ' ')    
        .trim();
}

// Fungsi untuk membuat n-gram
function createNGrams(text, n = 3) {
    const words = text.split(' ');
    const ngrams = [];
    
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }
    
    return ngrams;
}

// Fungsi untuk menghitung Term Frequency
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

// Fungsi untuk menghitung Cosine Similarity
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

// Fungsi untuk deteksi plagiat menggunakan N-gram
function ngramSimilarity(text1, text2, n = 3) {
    const ngrams1 = createNGrams(text1, n);
    const ngrams2 = createNGrams(text2, n);
    
    const set1 = new Set(ngrams1);
    const set2 = new Set(ngrams2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / Math.max(set1.size, set2.size);
}

// Fungsi untuk membuat fingerprint teks
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

// NEW: Fungsi AI untuk generate rekomendasi
function generateAIRecommendations(plagiarismResults, targetText) {
    const maxSimilarity = Math.max(...plagiarismResults.map(r => r.overallSimilarity));
    const recommendations = [];
    
    // Analisis tingkat plagiat dan generate rekomendasi
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
        
        recommendations.push({
            priority: 'WAJIB',
            type: 'citation',
            title: 'Perbaiki Sistem Sitasi',
            description: 'Implementasikan sistem sitasi yang konsisten untuk menghindari plagiat tidak disengaja.',
            actions: [
                'Gunakan format sitasi standar (APA, MLA, Chicago)',
                'Berikan kutipan untuk setiap ide yang bukan milik Anda',
                'Buat daftar pustaka yang lengkap',
                'Gunakan tools manajemen referensi seperti Zotero atau Mendeley'
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
        
        recommendations.push({
            priority: 'SEDANG',
            type: 'content',
            title: 'Tambahkan Konten Original',
            description: 'Perkaya dokumen dengan perspektif dan analisis original Anda.',
            actions: [
                'Tambahkan analisis kritis dari sudut pandang Anda',
                'Berikan contoh dari pengalaman atau penelitian tambahan',
                'Kembangkan argumen dengan data atau studi kasus baru',
                'Integrasikan berbagai sumber untuk perspektif yang lebih luas'
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
        
        recommendations.push({
            priority: 'RENDAH',
            type: 'quality',
            title: 'Tingkatkan Kualitas Penulisan',
            description: 'Fokus pada peningkatan kualitas dan keunikan gaya penulisan.',
            actions: [
                'Variasikan struktur kalimat dan paragraf',
                'Gunakan terminologi yang spesifik untuk bidang Anda',
                'Kembangkan voice dan tone yang konsisten',
                'Review dan edit untuk memastikan kejelasan ide'
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
    
    // Rekomendasi berdasarkan jenis kesamaan yang ditemukan
    const avgCosine = plagiarismResults.reduce((sum, r) => sum + r.cosineSimilarity, 0) / plagiarismResults.length;
    const avgNgram = plagiarismResults.reduce((sum, r) => sum + r.ngramSimilarity, 0) / plagiarismResults.length;
    const avgFingerprint = plagiarismResults.reduce((sum, r) => sum + r.fingerprintSimilarity, 0) / plagiarismResults.length;
    
    if (avgNgram > avgCosine && avgNgram > avgFingerprint) {
        recommendations.push({
            priority: 'SEDANG',
            type: 'structural',
            title: 'Variasikan Struktur Kalimat',
            description: 'Deteksi tinggi pada N-gram menunjukkan penggunaan frasa yang mirip secara berturut-turut.',
            actions: [
                'Ubah urutan kata dalam kalimat',
                'Gunakan voice aktif dan pasif secara bergantian',
                'Variasikan panjang kalimat',
                'Pisahkan kalimat panjang menjadi beberapa kalimat pendek'
            ],
            severity: 'medium'
        });
    }
    
    if (avgFingerprint > avgCosine && avgFingerprint > avgNgram) {
        recommendations.push({
            priority: 'WAJIB',
            type: 'rewrite',
            title: 'Hindari Copy-Paste Langsung',
            description: 'Deteksi tinggi pada Fingerprint menunjukkan kemungkinan copy-paste langsung dari sumber.',
            actions: [
                'Identifikasi bagian yang di-copy paste langsung',
                'Tulis ulang dengan kata-kata sendiri',
                'Berikan kutipan langsung dengan tanda kutip jika diperlukan',
                'Pastikan setiap kutipan memiliki sitasi yang tepat'
            ],
            severity: 'high'
        });
    }
    
    // Rekomendasi berdasarkan panjang teks
    const wordCount = targetText.split(' ').length;
    if (wordCount < 500) {
        recommendations.push({
            priority: 'SEDANG',
            type: 'expansion',
            title: 'Kembangkan Konten Lebih Luas',
            description: 'Dokumen relatif pendek. Pengembangan konten akan mengurangi tingkat kesamaan.',
            actions: [
                'Tambahkan lebih banyak detail dan penjelasan',
                'Berikan contoh dan ilustrasi yang relevan',
                'Kembangkan argumen dengan sub-poin yang lebih detail',
                'Tambahkan analisis mendalam dari berbagai perspektif'
            ],
            severity: 'medium'
        });
    }
    
    return recommendations;
}

// Fungsi utama untuk deteksi plagiat
function detectPlagiarism(targetText, sourceText) {
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
    
    return {
        overallSimilarity: Math.round(finalScore * 100),
        cosineSimilarity: Math.round(cosineSim * 100),
        ngramSimilarity: Math.round(ngramAvg * 100),
        fingerprintSimilarity: Math.round(fingerprintSim * 100),
        matchingPhrases: matchingFingerprints.slice(0, 5).map(fp => fp.content)
    };
}

// Route untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route untuk upload dokumen referensi
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
        
        documentDatabase.push(document);
        
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

// Route untuk cek plagiat (ENHANCED dengan history dan AI recommendations)
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
        
        if (documentDatabase.length === 0) {
            return res.status(400).json({ 
                error: 'Belum ada dokumen referensi. Silakan upload dokumen referensi terlebih dahulu.' 
            });
        }
        
        console.log(`Checking plagiarism for ${fileName} (${targetText.length} characters) against ${documentDatabase.length} reference documents`);
        
        const results = [];
        let maxSimilarity = 0;
        
        // Bandingkan dengan setiap dokumen di database
        documentDatabase.forEach(doc => {
            const similarity = detectPlagiarism(targetText, doc.content);
            
            if (similarity.overallSimilarity > maxSimilarity) {
                maxSimilarity = similarity.overallSimilarity;
            }
            
            results.push({
                documentId: doc.id,
                filename: doc.filename,
                fileType: doc.fileType || '.txt',
                ...similarity
            });
        });
        
        // Urutkan berdasarkan similarity tertinggi
        results.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
        
        // Tentukan status plagiat
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
        
        // NEW: Generate AI Recommendations
        const aiRecommendations = generateAIRecommendations(results, targetText);
        
        // NEW: Save to history
        const historyEntry = {
            id: Date.now().toString(),
            fileName: fileName,
            checkDate: new Date().toISOString(),
            maxSimilarity: maxSimilarity,
            status: status,
            totalDocumentsChecked: documentDatabase.length,
            textLength: targetText.length,
            detailedResults: results.slice(0, 10),
            aiRecommendations: aiRecommendations,
            summary: {
                avgCosine: Math.round(results.reduce((sum, r) => sum + r.cosineSimilarity, 0) / results.length),
                avgNgram: Math.round(results.reduce((sum, r) => sum + r.ngramSimilarity, 0) / results.length),
                avgFingerprint: Math.round(results.reduce((sum, r) => sum + r.fingerprintSimilarity, 0) / results.length)
            }
        };
        
        historyDatabase.push(historyEntry);
        
        // Limit history to last 50 entries
        if (historyDatabase.length > 50) {
            historyDatabase = historyDatabase.slice(-50);
        }
        
        console.log(`Plagiarism check completed. Max similarity: ${maxSimilarity}% (${status})`);
        
        res.json({
            success: true,
            sourceFileName: fileName,
            overallStatus: status,
            statusColor: color,
            maxSimilarity: maxSimilarity,
            totalDocumentsChecked: documentDatabase.length,
            textLength: targetText.length,
            detailedResults: results.slice(0, 10),
            aiRecommendations: aiRecommendations, // NEW
            historyId: historyEntry.id, // NEW
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

// NEW: Route untuk mendapatkan history pemeriksaan
app.get('/check-history', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const sortedHistory = historyDatabase.sort((a, b) => new Date(b.checkDate) - new Date(a.checkDate));
    const paginatedHistory = sortedHistory.slice(startIndex, endIndex);
    
    const historyWithSummary = paginatedHistory.map(entry => ({
        id: entry.id,
        fileName: entry.fileName,
        checkDate: entry.checkDate,
        maxSimilarity: entry.maxSimilarity,
        status: entry.status,
        totalDocumentsChecked: entry.totalDocumentsChecked,
        textLength: entry.textLength,
        recommendationCount: entry.aiRecommendations ? entry.aiRecommendations.length : 0,
        criticalIssues: entry.aiRecommendations ? entry.aiRecommendations.filter(r => r.priority === 'WAJIB').length : 0,
        summary: entry.summary
    }));
    
    res.json({
        success: true,
        history: historyWithSummary,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(historyDatabase.length / limit),
            totalEntries: historyDatabase.length,
            hasNext: endIndex < historyDatabase.length,
            hasPrev: startIndex > 0
        }
    });
});

// NEW: Route untuk mendapatkan detail history berdasarkan ID
app.get('/check-history/:id', (req, res) => {
    const historyId = req.params.id;
    const historyEntry = historyDatabase.find(entry => entry.id === historyId);
    
    if (!historyEntry) {
        return res.status(404).json({ error: 'History entry not found' });
    }
    
    res.json({
        success: true,
        historyEntry: historyEntry
    });
});

// NEW: Route untuk hapus history entry
app.delete('/check-history/:id', (req, res) => {
    const historyId = req.params.id;
    const initialLength = historyDatabase.length;
    
    historyDatabase = historyDatabase.filter(entry => entry.id !== historyId);
    
    if (historyDatabase.length < initialLength) {
        res.json({ success: true, message: 'History entry deleted successfully' });
    } else {
        res.status(404).json({ error: 'History entry not found' });
    }
});

// NEW: Route untuk clear semua history
app.delete('/check-history', (req, res) => {
    historyDatabase = [];
    res.json({ success: true, message: 'All history entries cleared successfully' });
});

// Route untuk mendapatkan daftar dokumen referensi
app.get('/reference-documents', (req, res) => {
    const docs = documentDatabase.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        fileType: doc.fileType || '.txt',
        uploadDate: doc.uploadDate,
        contentLength: doc.content.length,
        fileSize: doc.fileSize || 0
    }));
    
    res.json({
        success: true,
        documents: docs,
        totalDocuments: docs.length
    });
});

// Route untuk hapus dokumen referensi
app.delete('/reference-documents/:id', (req, res) => {
    const id = req.params.id;
    const initialLength = documentDatabase.length;
    
    documentDatabase = documentDatabase.filter(doc => doc.id !== id);
    
    if (documentDatabase.length < initialLength) {
        console.log(`Reference document deleted: ${id}`);
        res.json({ success: true, message: 'Document deleted successfully' });
    } else {
        res.status(404).json({ error: 'Document not found' });
    }
});

// NEW: Route untuk mendapatkan statistik dashboard
app.get('/api/dashboard-stats', (req, res) => {
    const totalChecks = historyDatabase.length;
    const totalReferences = documentDatabase.length;
    
    // Statistik history
    const recentChecks = historyDatabase.slice(-7); // 7 pemeriksaan terakhir
    const avgSimilarity = recentChecks.length > 0 
        ? Math.round(recentChecks.reduce((sum, check) => sum + check.maxSimilarity, 0) / recentChecks.length)
        : 0;
    
    // Distribusi status
    const statusDistribution = {
        safe: historyDatabase.filter(h => h.maxSimilarity < 25).length,
        low: historyDatabase.filter(h => h.maxSimilarity >= 25 && h.maxSimilarity < 50).length,
        medium: historyDatabase.filter(h => h.maxSimilarity >= 50 && h.maxSimilarity < 80).length,
        high: historyDatabase.filter(h => h.maxSimilarity >= 80).length
    };
    
    // Trending files (berdasarkan ekstensi)
    const fileTypeStats = {};
    historyDatabase.forEach(entry => {
        const ext = path.extname(entry.fileName).toLowerCase() || '.txt';
        fileTypeStats[ext] = (fileTypeStats[ext] || 0) + 1;
    });
    
    // Rekomendasi prioritas tinggi
    const criticalRecommendations = historyDatabase
        .flatMap(entry => entry.aiRecommendations || [])
        .filter(rec => rec.priority === 'WAJIB')
        .length;
    
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
                fileName: check.fileName,
                similarity: check.maxSimilarity,
                date: check.checkDate,
                status: check.status
            }))
        }
    });
});

// NEW: Route untuk export history ke CSV
app.get('/api/export-history', (req, res) => {
    const format = req.query.format || 'csv';
    
    if (format === 'csv') {
        let csvContent = 'ID,File Name,Check Date,Similarity %,Status,Documents Checked,Text Length,Critical Issues\n';
        
        historyDatabase.forEach(entry => {
            const criticalIssues = entry.aiRecommendations ? 
                entry.aiRecommendations.filter(r => r.priority === 'WAJIB').length : 0;
            
            csvContent += `"${entry.id}","${entry.fileName}","${entry.checkDate}","${entry.maxSimilarity}","${entry.status}","${entry.totalDocumentsChecked}","${entry.textLength}","${criticalIssues}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="plagiarism_history.csv"');
        res.send(csvContent);
    } else {
        res.status(400).json({ error: 'Format not supported. Use format=csv' });
    }
});

// NEW: Route untuk mendapatkan rekomendasi berdasarkan pattern history
app.get('/api/pattern-recommendations', (req, res) => {
    if (historyDatabase.length < 3) {
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
    
    const patternRecommendations = [];
    
    // Analisis pattern tingkat plagiat
    const avgSimilarity = historyDatabase.reduce((sum, h) => sum + h.maxSimilarity, 0) / historyDatabase.length;
    const recentAvg = historyDatabase.slice(-5).reduce((sum, h) => sum + h.maxSimilarity, 0) / Math.min(5, historyDatabase.length);
    
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
    
    // Analisis pattern jenis file
    const fileTypes = historyDatabase.map(h => path.extname(h.fileName).toLowerCase());
    const mostProblematicType = fileTypes.reduce((acc, type) => {
        const entries = historyDatabase.filter(h => path.extname(h.fileName).toLowerCase() === type);
        const avgSim = entries.reduce((sum, e) => sum + e.maxSimilarity, 0) / entries.length;
        
        if (avgSim > (acc.avgSim || 0)) {
            return { type, avgSim, count: entries.length };
        }
        return acc;
    }, {});
    
    if (mostProblematicType.type && mostProblematicType.avgSim > 50) {
        patternRecommendations.push({
            type: 'filetype',
            title: `Perhatian Khusus untuk File ${mostProblematicType.type.toUpperCase()}`,
            description: `File tipe ${mostProblematicType.type} menunjukkan rata-rata plagiat ${Math.round(mostProblematicType.avgSim)}%.`,
            priority: 'SEDANG',
            actions: [
                `Review proses konversi dan ekstraksi teks untuk file ${mostProblematicType.type}`,
                'Pastikan formatting tidak mempengaruhi deteksi',
                'Pertimbangkan untuk menggunakan format yang lebih standar',
                'Double-check hasil ekstraksi teks'
            ]
        });
    }
    
    // Analisis pattern waktu
    const timePattern = historyDatabase.map(h => ({
        hour: new Date(h.checkDate).getHours(),
        similarity: h.maxSimilarity
    }));
    
    const hourlyStats = {};
    timePattern.forEach(({ hour, similarity }) => {
        if (!hourlyStats[hour]) {
            hourlyStats[hour] = { total: 0, count: 0 };
        }
        hourlyStats[hour].total += similarity;
        hourlyStats[hour].count += 1;
    });
    
    const hourlyAvg = Object.keys(hourlyStats).map(hour => ({
        hour: parseInt(hour),
        avg: hourlyStats[hour].total / hourlyStats[hour].count,
        count: hourlyStats[hour].count
    })).filter(stat => stat.count >= 2);
    
    const peakPlagiarismHour = hourlyAvg.reduce((max, current) => 
        current.avg > max.avg ? current : max, { avg: 0 });
    
    if (peakPlagiarismHour.avg > avgSimilarity + 15) {
        patternRecommendations.push({
            type: 'timing',
            title: 'Pattern Waktu Pemeriksaan',
            description: `Pemeriksaan pada jam ${peakPlagiarismHour.hour}:00 menunjukkan tingkat plagiat yang lebih tinggi.`,
            priority: 'RENDAH',
            actions: [
                'Pertimbangkan untuk mengecek dokumen pada waktu yang berbeda',
                'Review kualitas penulisan berdasarkan waktu kerja',
                'Pastikan kondisi optimal saat menulis dan mereview'
            ]
        });
    }
    
    res.json({
        success: true,
        recommendations: patternRecommendations,
        analytics: {
            avgSimilarity: Math.round(avgSimilarity),
            recentAvg: Math.round(recentAvg),
            totalChecks: historyDatabase.length,
            fileTypeDistribution: fileTypes.reduce((acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {})
        }
    });
});

// NEW: Route untuk AI analysis mendalam
app.post('/api/deep-analysis', (req, res) => {
    const { historyIds } = req.body;
    
    if (!historyIds || !Array.isArray(historyIds)) {
        return res.status(400).json({ error: 'Invalid history IDs provided' });
    }
    
    const selectedEntries = historyDatabase.filter(entry => historyIds.includes(entry.id));
    
    if (selectedEntries.length === 0) {
        return res.status(404).json({ error: 'No matching history entries found' });
    }
    
    // Deep analysis
    const analysis = {
        overallAssessment: '',
        keyFindings: [],
        detailedRecommendations: [],
        improvementPlan: [],
        riskAssessment: ''
    };
    
    const avgSimilarity = selectedEntries.reduce((sum, e) => sum + e.maxSimilarity, 0) / selectedEntries.length;
    const maxSimilarity = Math.max(...selectedEntries.map(e => e.maxSimilarity));
    const minSimilarity = Math.min(...selectedEntries.map(e => e.maxSimilarity));
    
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
        `Dokumen dengan risiko tinggi: ${selectedEntries.filter(e => e.maxSimilarity >= 80).length}`
    ];
    
    // Detailed Recommendations berdasarkan pattern
    const algorithmAnalysis = {
        cosine: selectedEntries.reduce((sum, e) => sum + (e.summary?.avgCosine || 0), 0) / selectedEntries.length,
        ngram: selectedEntries.reduce((sum, e) => sum + (e.summary?.avgNgram || 0), 0) / selectedEntries.length,
        fingerprint: selectedEntries.reduce((sum, e) => sum + (e.summary?.avgFingerprint || 0), 0) / selectedEntries.length
    };
    
    if (algorithmAnalysis.ngram > algorithmAnalysis.cosine && algorithmAnalysis.ngram > algorithmAnalysis.fingerprint) {
        analysis.detailedRecommendations.push({
            category: 'Struktur Penulisan',
            priority: 'TINGGI',
            description: 'N-gram analysis menunjukkan penggunaan pola kalimat yang berulang.',
            actionItems: [
                'Fokus pada variasi struktur kalimat',
                'Gunakan teknik sentence combining dan splitting',
                'Latihan menulis dengan gaya yang berbeda-beda',
                'Review dan edit dengan fokus pada flow kalimat'
            ]
        });
    }
    
    if (algorithmAnalysis.fingerprint > 50) {
        analysis.detailedRecommendations.push({
            category: 'Orisinalitas Konten',
            priority: 'KRITIS',
            description: 'Fingerprint matching tinggi menunjukkan kemungkinan copy-paste yang signifikan.',
            actionItems: [
                'Implementasi zero-tolerance policy untuk copy-paste',
                'Gunakan teknik parafrase yang lebih intensif',
                'Buat outline original sebelum menulis',
                'Consultasi dengan writing center atau mentor'
            ]
        });
    }
    
    // Improvement Plan
    const timelineMap = {
        immediate: [],
        shortTerm: [],
        longTerm: []
    };
    
    if (avgSimilarity >= 60) {
        timelineMap.immediate.push('Stop semua aktivitas penulisan dan fokus pada pemahaman plagiat');
        timelineMap.immediate.push('Review semua dokumen yang sudah dibuat');
        timelineMap.shortTerm.push('Ikuti workshop atau kursus academic writing');
        timelineMap.longTerm.push('Kembangkan personal writing style yang unique');
    } else if (avgSimilarity >= 30) {
        timelineMap.immediate.push('Review teknik parafrase dan sitasi');
        timelineMap.shortTerm.push('Practice menulis dengan multiple drafts');
        timelineMap.longTerm.push('Bangun library personal references');
    } else {
        timelineMap.shortTerm.push('Fine-tune writing techniques');
        timelineMap.longTerm.push('Mentor others dalam academic writing');
    }
    
    analysis.improvementPlan = [
        { timeline: 'Segera (1-2 hari)', actions: timelineMap.immediate },
        { timeline: 'Jangka Pendek (1-2 minggu)', actions: timelineMap.shortTerm },
        { timeline: 'Jangka Panjang (1-3 bulan)', actions: timelineMap.longTerm }
    ].filter(plan => plan.actions.length > 0);
    
    // Risk Assessment
    const riskFactors = [];
    if (avgSimilarity >= 70) riskFactors.push('Tingkat plagiat rata-rata tinggi');
    if (maxSimilarity >= 90) riskFactors.push('Ada dokumen dengan plagiat ekstrem');
    if (maxSimilarity - minSimilarity > 40) riskFactors.push('Inkonsistensi kualitas yang tinggi');
    
    const highRiskDocs = selectedEntries.filter(e => e.maxSimilarity >= 80).length;
    if (highRiskDocs > selectedEntries.length * 0.3) {
        riskFactors.push('Lebih dari 30% dokumen berisiko tinggi');
    }
    
    analysis.riskAssessment = riskFactors.length > 0 
        ? `PERHATIAN: ${riskFactors.join(', ')}. Diperlukan tindakan korektif segera.`
        : 'Tingkat risiko dalam batas wajar, lanjutkan dengan monitoring rutin.';
    
    res.json({
        success: true,
        analysis: analysis,
        metadata: {
            analyzedDocuments: selectedEntries.length,
            analysisDate: new Date().toISOString(),
            avgSimilarity: Math.round(avgSimilarity),
            algorithmBreakdown: algorithmAnalysis
        }
    });
});

// Route untuk info aplikasi
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Advanced Plagiarism Checker',
        version: '2.0.0',
        supportedFormats: ['.txt', '.pdf', '.doc', '.docx', '.odt', '.rtf'],
        maxFileSize: '10MB',
        totalReferenceDocuments: documentDatabase.length,
        totalHistoryEntries: historyDatabase.length,
        algorithms: ['Cosine Similarity', 'N-gram Analysis', 'Fingerprinting'],
        features: ['AI Recommendations', 'History Tracking', 'Pattern Analysis', 'Deep Analysis'],
        lastUpdated: new Date().toISOString()
    });
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
    
    // Optional: Save databases to files before shutdown
    try {
        fs.writeFileSync('backup_history.json', JSON.stringify(historyDatabase, null, 2));
        fs.writeFileSync('backup_references.json', JSON.stringify(documentDatabase, null, 2));
        console.log('✅ Data backed up successfully');
    } catch (error) {
        console.error('❌ Error backing up data:', error.message);
    }
    
    process.exit(0);
});

// Optional: Load data from backup on startup
function loadBackupData() {
    try {
        if (fs.existsSync('backup_history.json')) {
            const historyBackup = JSON.parse(fs.readFileSync('backup_history.json', 'utf8'));
            historyDatabase = historyBackup;
            console.log(`📚 Loaded ${historyDatabase.length} history entries from backup`);
        }
        
        if (fs.existsSync('backup_references.json')) {
            const refBackup = JSON.parse(fs.readFileSync('backup_references.json', 'utf8'));
            documentDatabase = refBackup;
            console.log(`📁 Loaded ${documentDatabase.length} reference documents from backup`);
        }
    } catch (error) {
        console.error('⚠️ Error loading backup data:', error.message);
    }
}

// Start server
app.listen(PORT, () => {
    console.log('🚀 Advanced Plagiarism Checker Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
    console.log(`📁 Upload folder: ${path.join(__dirname, 'uploads')}`);
    console.log(`📄 Supported formats: .txt, .pdf, .doc, .docx, .odt, .rtf`);
    console.log(`💾 Max file size: 10MB`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆕 NEW FEATURES:');
    console.log('   ✅ History Tracking dengan Detail Lengkap');
    console.log('   ✅ AI Recommendations untuk Perbaikan');
    console.log('   ✅ Pattern Analysis & Deep Analytics');
    console.log('   ✅ Dashboard Statistics & Export');
    console.log('   ✅ Risk Assessment & Improvement Planning');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Ready to check for plagiarism with AI-powered insights!');
    
    // Load backup data if available
    loadBackupData();
});

module.exports = app;