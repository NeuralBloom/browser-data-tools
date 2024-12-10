// src/utils/file-handler.js

export class FileHandler {
    static async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }

    static async validateCSV(content) {
        // Basic CSV validation
        if (!content || typeof content !== 'string') {
            throw new Error('Invalid file content');
        }

        const lines = content.split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must contain headers and at least one data row');
        }

        const headers = lines[0].split(',');
        if (headers.length < 1) {
            throw new Error('CSV must contain at least one column');
        }

        return true;
    }

    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
