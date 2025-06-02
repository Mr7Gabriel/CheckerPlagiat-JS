#!/usr/bin/env node

/**
 * Advanced Plagiarism Checker - Backup Utility
 * Backup history and reference documents to JSON files
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = 'backups';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
    }
}

/**
 * Read data from backup files (simulating in-memory database)
 */
function readDatabaseFiles() {
    const data = {
        history: [],
        references: []
    };

    try {
        // Try to read existing backup files
        if (fs.existsSync('backup_history.json')) {
            const historyData = fs.readFileSync('backup_history.json', 'utf8');
            data.history = JSON.parse(historyData);
            console.log(`📚 Found ${data.history.length} history entries`);
        }

        if (fs.existsSync('backup_references.json')) {
            const referencesData = fs.readFileSync('backup_references.json', 'utf8');
            data.references = JSON.parse(referencesData);
            console.log(`📁 Found ${data.references.length} reference documents`);
        }

        return data;
    } catch (error) {
        console.error('❌ Error reading database files:', error.message);
        return data;
    }
}

/**
 * Create comprehensive backup
 */
function createBackup() {
    console.log('🔄 Starting backup process...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        ensureBackupDir();
        
        const data = readDatabaseFiles();
        
        // Create backup metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            totalHistoryEntries: data.history.length,
            totalReferenceDocuments: data.references.length,
            backupSize: 0,
            checksums: {}
        };

        // Calculate statistics
        if (data.history.length > 0) {
            const avgSimilarity = data.history.reduce((sum, entry) => sum + entry.maxSimilarity, 0) / data.history.length;
            const statusDistribution = data.history.reduce((acc, entry) => {
                const status = entry.status || 'Unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            
            metadata.analytics = {
                avgSimilarity: Math.round(avgSimilarity),
                statusDistribution,
                dateRange: {
                    oldest: data.history[data.history.length - 1]?.checkDate,
                    newest: data.history[0]?.checkDate
                }
            };
        }

        if (data.references.length > 0) {
            const totalSize = data.references.reduce((sum, doc) => sum + (doc.fileSize || doc.contentLength || 0), 0);
            const formats = [...new Set(data.references.map(doc => doc.fileType))];
            
            metadata.referenceStats = {
                totalSize,
                formats,
                avgDocumentSize: Math.round(totalSize / data.references.length)
            };
        }

        // Create backup files
        const backupFiles = {
            history: `${BACKUP_DIR}/history_${TIMESTAMP}.json`,
            references: `${BACKUP_DIR}/references_${TIMESTAMP}.json`,
            metadata: `${BACKUP_DIR}/metadata_${TIMESTAMP}.json`,
            combined: `${BACKUP_DIR}/complete_backup_${TIMESTAMP}.json`
        };

        // Write individual files
        fs.writeFileSync(backupFiles.history, JSON.stringify(data.history, null, 2));
        fs.writeFileSync(backupFiles.references, JSON.stringify(data.references, null, 2));
        fs.writeFileSync(backupFiles.metadata, JSON.stringify(metadata, null, 2));

        // Write combined backup
        const combinedBackup = {
            metadata,
            data: {
                history: data.history,
                references: data.references
            }
        };
        fs.writeFileSync(backupFiles.combined, JSON.stringify(combinedBackup, null, 2));

        // Calculate file sizes and update metadata
        Object.keys(backupFiles).forEach(key => {
            const filePath = backupFiles[key];
            const stats = fs.statSync(filePath);
            metadata.backupSize += stats.size;
            metadata.checksums[key] = require('crypto')
                .createHash('md5')
                .update(fs.readFileSync(filePath))
                .digest('hex');
        });

        // Update metadata file with size info
        fs.writeFileSync(backupFiles.metadata, JSON.stringify(metadata, null, 2));

        // Create latest symlinks (for easy access)
        const latestLinks = {
            'backups/latest_history.json': backupFiles.history,
            'backups/latest_references.json': backupFiles.references,
            'backups/latest_metadata.json': backupFiles.metadata,
            'backups/latest_complete.json': backupFiles.combined
        };

        Object.entries(latestLinks).forEach(([linkPath, targetPath]) => {
            try {
                if (fs.existsSync(linkPath)) {
                    fs.unlinkSync(linkPath);
                }
                fs.copyFileSync(targetPath, linkPath);
            } catch (error) {
                console.warn(`⚠️  Warning: Could not create symlink ${linkPath}`);
            }
        });

        // Success summary
        console.log('✅ Backup completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Backup Summary:`);
        console.log(`   📚 History Entries: ${data.history.length}`);
        console.log(`   📁 Reference Documents: ${data.references.length}`);
        console.log(`   💾 Total Backup Size: ${(metadata.backupSize / 1024).toFixed(2)} KB`);
        console.log(`   📅 Timestamp: ${metadata.timestamp}`);
        
        if (metadata.analytics) {
            console.log(`   📈 Avg Similarity: ${metadata.analytics.avgSimilarity}%`);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📁 Backup Files Created:`);
        Object.entries(backupFiles).forEach(([type, filePath]) => {
            const size = (fs.statSync(filePath).size / 1024).toFixed(2);
            console.log(`   ${type.padEnd(12)}: ${filePath} (${size} KB)`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Cleanup old backups (keep last 10)
        cleanupOldBackups();
        
        return true;

    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

/**
 * Cleanup old backup files (keep last 10 of each type)
 */
function cleanupOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backupTypes = ['history', 'references', 'metadata', 'complete_backup'];
        
        backupTypes.forEach(type => {
            const typeFiles = files
                .filter(file => file.startsWith(type) && file.endsWith('.json') && !file.includes('latest'))
                .sort()
                .reverse(); // Newest first
            
            if (typeFiles.length > 10) {
                const filesToDelete = typeFiles.slice(10);
                filesToDelete.forEach(file => {
                    const filePath = path.join(BACKUP_DIR, file);
                    fs.unlinkSync(filePath);
                    console.log(`🗑️  Deleted old backup: ${file}`);
                });
            }
        });
    } catch (error) {
        console.warn('⚠️  Warning: Could not cleanup old backups:', error.message);
    }
}

/**
 * List existing backups
 */
function listBackups() {
    console.log('📋 Existing Backups:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            console.log('📭 No backups found. Run backup first.');
            return;
        }

        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter(file => file.startsWith('complete_backup_') && file.endsWith('.json'))
            .sort()
            .reverse();

        if (backups.length === 0) {
            console.log('📭 No complete backups found.');
            return;
        }

        backups.forEach((file, index) => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const timestamp = file.match(/complete_backup_(.+)\.json/)[1];
            const date = new Date(timestamp.replace(/-/g, ':').replace('T', ' '));
            
            console.log(`${index + 1}. ${file}`);
            console.log(`   📅 Date: ${date.toLocaleString()}`);
            console.log(`   💾 Size: ${(stats.size / 1024).toFixed(2)} KB`);
            
            // Try to read metadata
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (content.metadata) {
                    console.log(`   📚 History: ${content.metadata.totalHistoryEntries} entries`);
                    console.log(`   📁 References: ${content.metadata.totalReferenceDocuments} documents`);
                }
            } catch (error) {
                console.log(`   ⚠️  Could not read metadata`);
            }
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error listing backups:', error.message);
    }
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'backup';

    console.log('🔍 Advanced Plagiarism Checker - Backup Utility v2.0');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    switch (command.toLowerCase()) {
        case 'backup':
        case 'create':
            const success = createBackup();
            process.exit(success ? 0 : 1);
            break;

        case 'list':
        case 'ls':
            listBackups();
            break;

        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;

        case 'status':
            showStatus();
            break;

        case 'verify':
            verifyBackups();
            break;

        default:
            console.log(`❌ Unknown command: ${command}`);
            console.log('💡 Use "help" to see available commands');
            process.exit(1);
    }
}

/**
 * Show help information
 */
function showHelp() {
    console.log('📖 Available Commands:');
    console.log('');
    console.log('  backup, create    Create a new backup of all data');
    console.log('  list, ls          List all existing backups');
    console.log('  status            Show current database status');
    console.log('  verify            Verify backup integrity');
    console.log('  help              Show this help message');
    console.log('');
    console.log('📝 Examples:');
    console.log('  node backup.js backup     # Create backup');
    console.log('  node backup.js list       # List backups');
    console.log('  node backup.js status     # Show status');
    console.log('');
    console.log('📁 Backup Location: ./backups/');
    console.log('🔄 Auto-cleanup: Keeps last 10 backups of each type');
}

/**
 * Show current database status
 */
function showStatus() {
    console.log('📊 Current Database Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        const data = readDatabaseFiles();
        
        console.log(`📚 History Database:`);
        console.log(`   Total Entries: ${data.history.length}`);
        
        if (data.history.length > 0) {
            const avgSimilarity = data.history.reduce((sum, entry) => sum + entry.maxSimilarity, 0) / data.history.length;
            const recentEntries = data.history.slice(0, 5);
            const statusCounts = data.history.reduce((acc, entry) => {
                acc[entry.status] = (acc[entry.status] || 0) + 1;
                return acc;
            }, {});

            console.log(`   Average Similarity: ${avgSimilarity.toFixed(1)}%`);
            console.log(`   Status Distribution:`);
            Object.entries(statusCounts).forEach(([status, count]) => {
                console.log(`     ${status}: ${count} entries`);
            });
            
            console.log(`   Recent Entries:`);
            recentEntries.forEach((entry, index) => {
                const date = new Date(entry.checkDate).toLocaleString();
                console.log(`     ${index + 1}. ${entry.fileName} (${entry.maxSimilarity}%) - ${date}`);
            });
        }

        console.log('');
        console.log(`📁 Reference Database:`);
        console.log(`   Total Documents: ${data.references.length}`);
        
        if (data.references.length > 0) {
            const totalSize = data.references.reduce((sum, doc) => sum + (doc.fileSize || doc.contentLength || 0), 0);
            const formats = [...new Set(data.references.map(doc => doc.fileType))];
            
            console.log(`   Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
            console.log(`   File Formats: ${formats.join(', ')}`);
            console.log(`   Recent Documents:`);
            
            data.references.slice(0, 5).forEach((doc, index) => {
                const date = new Date(doc.uploadDate).toLocaleString();
                const size = ((doc.fileSize || doc.contentLength) / 1024).toFixed(2);
                console.log(`     ${index + 1}. ${doc.filename} (${size} KB) - ${date}`);
            });
        }

        console.log('');
        console.log('💾 Backup Files:');
        if (fs.existsSync(BACKUP_DIR)) {
            const backupFiles = fs.readdirSync(BACKUP_DIR);
            const latestBackups = backupFiles.filter(file => file.startsWith('latest_'));
            
            if (latestBackups.length > 0) {
                console.log('   Latest Backups Available:');
                latestBackups.forEach(file => {
                    const stats = fs.statSync(path.join(BACKUP_DIR, file));
                    const date = new Date(stats.mtime).toLocaleString();
                    console.log(`     ${file} - ${date}`);
                });
            } else {
                console.log('   No latest backups found');
            }
        } else {
            console.log('   No backup directory found');
        }

    } catch (error) {
        console.error('❌ Error reading database status:', error.message);
    }
}

/**
 * Verify backup file integrity
 */
function verifyBackups() {
    console.log('🔍 Verifying Backup Integrity:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            console.log('❌ No backup directory found');
            return;
        }

        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files.filter(file => file.startsWith('complete_backup_') && file.endsWith('.json'));

        if (backups.length === 0) {
            console.log('❌ No backup files found');
            return;
        }

        let verifiedCount = 0;
        let errorCount = 0;

        backups.forEach(file => {
            const filePath = path.join(BACKUP_DIR, file);
            
            try {
                // Test JSON parsing
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Verify structure
                if (!content.metadata || !content.data) {
                    throw new Error('Invalid backup structure');
                }

                // Verify data integrity
                const historyCount = content.data.history ? content.data.history.length : 0;
                const referencesCount = content.data.references ? content.data.references.length : 0;
                
                if (historyCount !== content.metadata.totalHistoryEntries) {
                    throw new Error(`History count mismatch: expected ${content.metadata.totalHistoryEntries}, got ${historyCount}`);
                }
                
                if (referencesCount !== content.metadata.totalReferenceDocuments) {
                    throw new Error(`References count mismatch: expected ${content.metadata.totalReferenceDocuments}, got ${referencesCount}`);
                }

                console.log(`✅ ${file} - Valid`);
                verifiedCount++;

            } catch (error) {
                console.log(`❌ ${file} - Error: ${error.message}`);
                errorCount++;
            }
        });

        console.log('');
        console.log(`📊 Verification Summary:`);
        console.log(`   ✅ Valid Backups: ${verifiedCount}`);
        console.log(`   ❌ Invalid Backups: ${errorCount}`);
        console.log(`   📁 Total Checked: ${backups.length}`);

        if (errorCount > 0) {
            console.log('');
            console.log('⚠️  Some backups have issues. Consider creating a new backup.');
        }

    } catch (error) {
        console.error('❌ Error during verification:', error.message);
    }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Backup process interrupted');
    process.exit(130);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Backup process terminated');
    process.exit(143);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    console.error(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the main function if this script is executed directly
if (require.main === module) {
    main();
}

// Export functions for use in other modules
module.exports = {
    createBackup,
    listBackups,
    showStatus,
    verifyBackups,
    readDatabaseFiles
};