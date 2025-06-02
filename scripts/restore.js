#!/usr/bin/env node

/**
 * Advanced Plagiarism Checker - Restore Utility
 * Restore history and reference documents from backup files
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const BACKUP_DIR = 'backups';

/**
 * Create readline interface for user interaction
 */
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Promisify readline question
 */
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

/**
 * List available backup files
 */
function listAvailableBackups() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            console.log('❌ No backup directory found');
            return [];
        }

        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter(file => file.startsWith('complete_backup_') && file.endsWith('.json'))
            .sort()
            .reverse(); // Newest first

        return backups.map(file => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const timestamp = file.match(/complete_backup_(.+)\.json/)[1];
            
            let metadata = null;
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                metadata = content.metadata;
            } catch (error) {
                // Skip if can't read metadata
            }

            return {
                filename: file,
                filePath,
                timestamp,
                size: stats.size,
                modified: stats.mtime,
                metadata
            };
        });
    } catch (error) {
        console.error('❌ Error listing backups:', error.message);
        return [];
    }
}

/**
 * Display backup selection menu
 */
function displayBackupMenu(backups) {
    console.log('📋 Available Backups:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (backups.length === 0) {
        console.log('📭 No backups found');
        return;
    }

    backups.forEach((backup, index) => {
        const date = new Date(backup.modified).toLocaleString();
        const size = (backup.size / 1024).toFixed(2);
        
        console.log(`${index + 1}. ${backup.filename}`);
        console.log(`   📅 Date: ${date}`);
        console.log(`   💾 Size: ${size} KB`);
        
        if (backup.metadata) {
            console.log(`   📚 History: ${backup.metadata.totalHistoryEntries} entries`);
            console.log(`   📁 References: ${backup.metadata.totalReferenceDocuments} documents`);
            
            if (backup.metadata.analytics) {
                console.log(`   📊 Avg Similarity: ${backup.metadata.analytics.avgSimilarity}%`);
            }
        }
        console.log('');
    });
}

/**
 * Restore from backup file
 */
async function restoreFromBackup(backupPath, options = {}) {
    try {
        console.log(`🔄 Restoring from: ${backupPath}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Read backup file
        const backupContent = fs.readFileSync(backupPath, 'utf8');
        const backup = JSON.parse(backupContent);

        // Validate backup structure
        if (!backup.metadata || !backup.data) {
            throw new Error('Invalid backup file structure');
        }

        const { metadata, data } = backup;
        
        console.log('📊 Backup Information:');
        console.log(`   Version: ${metadata.version || 'Unknown'}`);
        console.log(`   Created: ${new Date(metadata.timestamp).toLocaleString()}`);
        console.log(`   History Entries: ${metadata.totalHistoryEntries}`);
        console.log(`   Reference Documents: ${metadata.totalReferenceDocuments}`);
        console.log('');

        // Check for existing data
        const existingHistory = fs.existsSync('backup_history.json');
        const existingReferences = fs.existsSync('backup_references.json');

        if ((existingHistory || existingReferences) && !options.force) {
            console.log('⚠️  Existing data detected:');
            if (existingHistory) console.log('   📚 backup_history.json exists');
            if (existingReferences) console.log('   📁 backup_references.json exists');
            console.log('');

            const overwrite = await question('❓ Overwrite existing data? (y/N): ');
            if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
                console.log('❌ Restore cancelled by user');
                return false;
            }
        }

        // Create backup of existing data before restore
        if (existingHistory || existingReferences) {
            const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            if (existingHistory) {
                const backupPath = `backup_history_before_restore_${backupTimestamp}.json`;
                fs.copyFileSync('backup_history.json', backupPath);
                console.log(`💾 Backed up existing history to: ${backupPath}`);
            }
            
            if (existingReferences) {
                const backupPath = `backup_references_before_restore_${backupTimestamp}.json`;
                fs.copyFileSync('backup_references.json', backupPath);
                console.log(`💾 Backed up existing references to: ${backupPath}`);
            }
        }

        // Restore history data
        if (data.history && data.history.length > 0) {
            fs.writeFileSync('backup_history.json', JSON.stringify(data.history, null, 2));
            console.log(`✅ Restored ${data.history.length} history entries`);
        } else {
            console.log('📭 No history data to restore');
        }

        // Restore references data
        if (data.references && data.references.length > 0) {
            fs.writeFileSync('backup_references.json', JSON.stringify(data.references, null, 2));
            console.log(`✅ Restored ${data.references.length} reference documents`);
        } else {
            console.log('📭 No reference data to restore');
        }

        // Verify restoration
        console.log('');
        console.log('🔍 Verifying restored data...');
        
        const verifyHistory = fs.existsSync('backup_history.json') ? 
            JSON.parse(fs.readFileSync('backup_history.json', 'utf8')).length : 0;
        const verifyReferences = fs.existsSync('backup_references.json') ? 
            JSON.parse(fs.readFileSync('backup_references.json', 'utf8')).length : 0;

        if (verifyHistory === (data.history ? data.history.length : 0) &&
            verifyReferences === (data.references ? data.references.length : 0)) {
            console.log('✅ Data verification successful');
        } else {
            console.log('⚠️  Data verification warning - counts may not match');
        }

        console.log('');
        console.log('🎉 Restore completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Restored Summary:');
        console.log(`   📚 History Entries: ${verifyHistory}`);
        console.log(`   📁 Reference Documents: ${verifyReferences}`);
        console.log('');
        console.log('💡 Restart the application to load the restored data');

        return true;

    } catch (error) {
        console.error('❌ Restore failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

/**
 * Interactive restore process
 */
async function interactiveRestore() {
    try {
        console.log('🔄 Starting interactive restore process...');
        console.log('');

        const backups = listAvailableBackups();
        
        if (backups.length === 0) {
            console.log('❌ No backup files found in the backups directory');
            console.log('💡 Make sure you have created backups using the backup utility');
            return false;
        }

        displayBackupMenu(backups);

        const selection = await question(`📝 Select backup to restore (1-${backups.length}, or 'q' to quit): `);
        
        if (selection.toLowerCase() === 'q' || selection.toLowerCase() === 'quit') {
            console.log('❌ Restore cancelled by user');
            return false;
        }

        const index = parseInt(selection) - 1;
        
        if (isNaN(index) || index < 0 || index >= backups.length) {
            console.log('❌ Invalid selection');
            return false;
        }

        const selectedBackup = backups[index];
        
        console.log('');
        console.log(`📋 Selected: ${selectedBackup.filename}`);
        console.log(`📅 Created: ${new Date(selectedBackup.modified).toLocaleString()}`);
        
        if (selectedBackup.metadata && selectedBackup.metadata.analytics) {
            console.log(`📊 Contains ${selectedBackup.metadata.totalHistoryEntries} history entries with ${selectedBackup.metadata.analytics.avgSimilarity}% avg similarity`);
        }
        console.log('');

        const confirm = await question('❓ Proceed with restore? (y/N): ');
        
        if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
            console.log('❌ Restore cancelled by user');
            return false;
        }

        return await restoreFromBackup(selectedBackup.filePath);

    } catch (error) {
        console.error('❌ Interactive restore failed:', error.message);
        return false;
    }
}

/**
 * Restore latest backup
 */
async function restoreLatest() {
    try {
        console.log('🔄 Restoring from latest backup...');
        
        const latestPath = path.join(BACKUP_DIR, 'latest_complete.json');
        
        if (!fs.existsSync(latestPath)) {
            console.log('❌ No latest backup found');
            console.log('💡 Use interactive mode to select a specific backup');
            return false;
        }

        return await restoreFromBackup(latestPath, { force: false });

    } catch (error) {
        console.error('❌ Latest restore failed:', error.message);
        return false;
    }
}

/**
 * Show current data status
 */
function showCurrentStatus() {
    console.log('📊 Current Data Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        let historyCount = 0;
        let referencesCount = 0;

        if (fs.existsSync('backup_history.json')) {
            const history = JSON.parse(fs.readFileSync('backup_history.json', 'utf8'));
            historyCount = history.length;
            console.log(`📚 History: ${historyCount} entries loaded`);
            
            if (historyCount > 0) {
                const recent = history.slice(0, 3);
                console.log('   Recent entries:');
                recent.forEach((entry, index) => {
                    const date = new Date(entry.checkDate).toLocaleDateString();
                    console.log(`     ${index + 1}. ${entry.fileName} (${entry.maxSimilarity}%) - ${date}`);
                });
            }
        } else {
            console.log('📚 History: No data file found');
        }

        console.log('');

        if (fs.existsSync('backup_references.json')) {
            const references = JSON.parse(fs.readFileSync('backup_references.json', 'utf8'));
            referencesCount = references.length;
            console.log(`📁 References: ${referencesCount} documents loaded`);
            
            if (referencesCount > 0) {
                const formats = [...new Set(references.map(doc => doc.fileType))];
                const totalSize = references.reduce((sum, doc) => sum + (doc.fileSize || doc.contentLength || 0), 0);
                console.log(`   Formats: ${formats.join(', ')}`);
                console.log(`   Total size: ${(totalSize / 1024).toFixed(2)} KB`);
            }
        } else {
            console.log('📁 References: No data file found');
        }

        console.log('');
        console.log(`💾 Total data: ${historyCount + referencesCount} items`);

    } catch (error) {
        console.error('❌ Error reading current data:', error.message);
    }
}

/**
 * Show help information
 */
function showHelp() {
    console.log('📖 Restore Utility Commands:');
    console.log('');
    console.log('  restore, interactive    Interactive restore with backup selection');
    console.log('  latest                  Restore from latest backup');
    console.log('  list                    List available backups');
    console.log('  status                  Show current data status');
    console.log('  help                    Show this help message');
    console.log('');
    console.log('📝 Examples:');
    console.log('  node restore.js restore     # Interactive restore');
    console.log('  node restore.js latest      # Restore latest backup');
    console.log('  node restore.js list        # List available backups');
    console.log('');
    console.log('⚠️  Note: Restore will overwrite existing data');
    console.log('💡 Backup files are located in: ./backups/');
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'restore';

    console.log('🔍 Advanced Plagiarism Checker - Restore Utility v2.0');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let success = false;

    try {
        switch (command.toLowerCase()) {
            case 'restore':
            case 'interactive':
                success = await interactiveRestore();
                break;

            case 'latest':
                success = await restoreLatest();
                break;

            case 'list':
                const backups = listAvailableBackups();
                displayBackupMenu(backups);
                success = true;
                break;

            case 'status':
                showCurrentStatus();
                success = true;
                break;

            case 'help':
            case '--help':
            case '-h':
                showHelp();
                success = true;
                break;

            default:
                console.log(`❌ Unknown command: ${command}`);
                console.log('💡 Use "help" to see available commands');
                success = false;
        }
    } catch (error) {
        console.error('💥 Unexpected error:', error.message);
        success = false;
    } finally {
        rl.close();
    }

    process.exit(success ? 0 : 1);
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Restore process interrupted');
    rl.close();
    process.exit(130);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Restore process terminated');
    rl.close();
    process.exit(143);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    rl.close();
    process.exit(1);
});

// Run the main function if this script is executed directly
if (require.main === module) {
    main();
}

// Export functions for use in other modules
module.exports = {
    restoreFromBackup,
    listAvailableBackups,
    showCurrentStatus,
    interactiveRestore,
    restoreLatest
};