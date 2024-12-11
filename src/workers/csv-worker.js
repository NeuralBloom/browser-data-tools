// src/workers/csv-worker.js

importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js');

self.addEventListener('message', async (e) => {
    console.log('Worker received message:', e.data);
    
    if (!e.data) {
        self.postMessage({ 
            type: 'error', 
            error: 'No data received by worker' 
        });
        return;
    }

    const { file, command } = e.data;
    
    if (!file) {
        self.postMessage({ 
            type: 'error', 
            error: 'No file data provided' 
        });
        return;
    }
    
    try {
        switch (command) {
            case 'analyze':
                console.log('Worker starting analysis');
                const results = await analyzeCSV(file);
                console.log('Worker analysis complete:', results);
                self.postMessage({ 
                    type: 'success', 
                    data: results 
                });
                break;
            
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({ 
            type: 'error', 
            error: error.message || 'Unknown error in worker' 
        });
    }
});

function analyzeCSV(fileContent) {
    return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (!results || !results.data) {
                    reject(new Error('Failed to parse CSV data'));
                    return;
                }

                try {
                    const analysis = processData(results.data);
                    resolve(analysis);
                } catch (error) {
                    reject(error);
                }
            },
            error: (error) => {
                reject(new Error('CSV parsing error: ' + error.message));
            }
        });
    });
}

function processData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid or empty CSV data');
    }

    const columns = {};
    const headers = Object.keys(data[0]);

    headers.forEach(header => {
        columns[header] = initializeColumnStats();
    });

    let totalRows = data.length;

    // Process each row
    data.forEach(row => {
        headers.forEach(header => {
            updateColumnStats(columns[header], row[header]);
        });
    });

    // Finalize statistics for each column
    headers.forEach(header => {
        finalizeColumnStats(columns[header], totalRows);
    });

    return columns;
}

function initializeColumnStats() {
    return {
        type: null,
        count: 0,
        missing: 0,
        unique: new Set(),
        total: 0,
        // Numeric specific
        min: Infinity,
        max: -Infinity,
        sum: 0,
        // String specific
        minLength: Infinity,
        maxLength: 0,
        lengthSum: 0,
        // For all types
        values: []
    };
}

function updateColumnStats(stats, value) {
    // Handle null, undefined, or empty string
    if (value === null || value === undefined || value === '') {
        stats.missing++;
        return;
    }

    // Determine type if not yet set
    if (!stats.type) {
        stats.type = typeof value;
    }

    stats.count++;
    stats.unique.add(value);
    stats.values.push(value);

    if (typeof value === 'number' && !isNaN(value)) {
        stats.min = Math.min(stats.min, value);
        stats.max = Math.max(stats.max, value);
        stats.sum += value;
    } else if (typeof value === 'string') {
        stats.minLength = Math.min(stats.minLength, value.length);
        stats.maxLength = Math.max(stats.maxLength, value.length);
        stats.lengthSum += value.length;
    }
}

function finalizeColumnStats(stats, totalRows) {
    stats.total = totalRows;
    stats.unique = stats.unique.size;

    if (stats.type === 'number') {
        if (stats.count > 0) {
            stats.mean = stats.sum / stats.count;
            stats.hasDecimals = stats.values.some(v => v % 1 !== 0);
            stats.zeros = stats.values.filter(v => v === 0).length;
            stats.negative = stats.values.filter(v => v < 0).length;
        }
        delete stats.sum;
    } else if (stats.type === 'string') {
        if (stats.count > 0) {
            stats.avgLength = stats.lengthSum / stats.count;
            stats.empty = stats.values.filter(v => v === '').length;
        }
        delete stats.lengthSum;
    }

    // Clean up
    delete stats.values;
}
