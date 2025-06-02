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

// In-memory database untuk menyimpan dokumen referensi
let documentDatabase = [];

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
                // Untuk .doc lama, kita coba dengan mammoth dulu
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
                // Untuk OpenDocument Text, kita baca sebagai text mentah dan bersihkan XML
                const odtContent = fs.readFileSync(filePath, 'utf8');
                const cleanedOdt = odtContent
                    .replace(/<[^>]*>/g, ' ')           // Hapus XML tags
                    .replace(/&[a-zA-Z0-9#]+;/g, ' ')   // Hapus HTML entities
                    .replace(/\s+/g, ' ')               // Normalisasi spasi
                    .trim();
                
                if (!cleanedOdt || cleanedOdt.length < 10) {
                    throw new Error('File ODT tidak dapat dibaca atau kosong');
                }
                return cleanedOdt;
                
            case '.rtf':
                console.log('Processing RTF file...');
                // Untuk RTF, baca dan bersihkan formatting codes
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
        // Hapus RTF control codes dan formatting
        let cleanText = rtfContent
            .replace(/\\[a-z]+\d*/gi, ' ')        // RTF control words
            .replace(/\{[^}]*\}/g, ' ')           // RTF groups
            .replace(/\\['"][a-f0-9]{2}/gi, ' ')  // Hex characters
            .replace(/\\\\/g, '\\')               // Escaped backslashes
            .replace(/\\[{}]/g, '')               // Escaped braces
            .replace(/\\[^a-zA-Z]/g, ' ')         // Other control characters
            .replace(/\s+/g, ' ')                 // Multiple spaces
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
    
    // Bersihkan karakter yang tidak diinginkan
    const sanitizedText = trimmedText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Remove control characters
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();
    
    return sanitizedText;
}

// Fungsi untuk membersihkan dan memproses teks
function preprocessText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Hapus karakter khusus
        .replace(/\s+/g, ' ')    // Normalisasi spasi
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
    
    // Normalisasi dengan total kata
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
        
        // Ekstrak teks dari file berdasarkan format
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
        
        // Hapus file setelah diproses
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
        // Hapus file jika ada error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Route untuk cek plagiat
app.post('/check-plagiarism', upload.single('targetFile'), async (req, res) => {
    try {
        let targetText = '';
        let fileName = 'Text Input';
        
        if (req.file) {
            // Jika file diupload
            const filePath = req.file.path;
            fileName = req.file.originalname;
            console.log(`Processing target file: ${fileName}`);
            
            const rawContent = await extractTextFromFile(filePath, fileName);
            targetText = validateAndSanitizeText(rawContent, fileName);
            
            fs.unlinkSync(filePath); // Hapus file setelah diproses
        } else if (req.body.text) {
            // Jika teks langsung diinput
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
        
        console.log(`Plagiarism check completed. Max similarity: ${maxSimilarity}% (${status})`);
        
        res.json({
            success: true,
            sourceFileName: fileName,
            overallStatus: status,
            statusColor: color,
            maxSimilarity: maxSimilarity,
            totalDocumentsChecked: documentDatabase.length,
            textLength: targetText.length,
            detailedResults: results.slice(0, 10), // Tampilkan 10 hasil teratas
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error checking plagiarism:', error.message);
        // Hapus file jika ada error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
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

// Route untuk info aplikasi
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Plagiarism Checker',
        version: '1.0.0',
        supportedFormats: ['.txt', '.pdf', '.doc', '.docx', '.odt', '.rtf'],
        maxFileSize: '10MB',
        totalReferenceDocuments: documentDatabase.length,
        algorithms: ['Cosine Similarity', 'N-gram Analysis', 'Fingerprinting']
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Plagiarism Checker Server running on http://localhost:${PORT}`);
    console.log(`📁 Upload folder: ${path.join(__dirname, 'uploads')}`);
    console.log(`📄 Supported formats: .txt, .pdf, .doc, .docx, .odt, .rtf`);
    console.log(`💾 Max file size: 10MB`);
    console.log(`🔍 Ready to check for plagiarism!`);
});

module.exports = app;