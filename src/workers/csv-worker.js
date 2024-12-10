// src/workers/csv-worker.js

importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js');

self.addEventListener('message', async (e) => {
    const { file, command, options } = e.data;
    
    try {
        switch (command) {
            case 'analyze':
                const results = await analyzeCSV(file);
                self.postMessage({ type: 'success', data: results });
                break;
            
            case 'validate':
                const validation = await validateCSV(file);
                self.postMessage({ type: 'success', data: validation });
                break;
            
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
});

async function analyzeCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            worker: true,
            chunk: (results, parser) => {
                // Process data in chunks to handle large files
                processChunk(results.data);
            },
            complete: (results) => {
                const analysis = finalizeAnalysis(results.data);
                resolve(analysis);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

const columnStats = new Map();
let totalRows = 0;

function processChunk(data) {
    totalRows += data.length;
    
    // Process each column in the chunk
    Object.entries(data[0] || {}).forEach(([column, _]) => {
        if (!columnStats.has(column)) {
            columnStats.set(column, initializeColumnStats());
        }
        
        const stats = columnStats.get(column);
        data.forEach(row => {
            updateColumnStats(stats, row[column]);
        });
    });
}

function initializeColumnStats() {
    return {
        type: null,
        count: 0,
        nullCount: 0,
        uniqueValues: new Set(),
        sum: 0,
        min: Infinity,
        max: -Infinity,
        textLengths: [],
    };
}

function updateColumnStats(stats, value) {
    if (value === null || value === undefined || value === '') {
        stats.nullCount++;
        return;
    }

    stats.count++;
    stats.uniqueValues.add(value);

    if (stats.type === null) {
        stats.type = typeof value;
    }

    if (typeof value === 'number') {
        stats.sum += value;
        stats.min = Math.min(stats.min, value);
        stats.max = Math.max(stats.max, value);
    } else if (typeof value === 'string') {
        stats.textLengths.push(value.length);
    }
}

function finalizeAnalysis(data) {
    const analysis = {};

    columnStats.forEach((stats, column) => {
        analysis[column] = {
            type: stats.type,
            unique: stats.uniqueValues.size,
            missing: stats.nullCount,
            total: totalRows
        };

        if (stats.type === 'number') {
            analysis[column] = {
                ...analysis[column],
                min: stats.min,
                max: stats.max,
                mean: stats.sum / stats.count,
                hasDecimals: hasDecimalValues(stats.uniqueValues)
            };
        } else if (stats.type === 'string') {
            analysis[column] = {
                ...analysis[column],
                minLength: Math.min(...stats.textLengths),
                maxLength: Math.max(...stats.textLengths),
                avgLength: stats.textLengths.reduce((a, b) => a + b, 0) / stats.textLengths.length
            };
        }
    });

    return analysis;
}

function hasDecimalValues(values) {
    return [...values].some(value => value % 1 !== 0);
}

async function validateCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            preview: 10, // Check first 10 rows
            complete: (results) => {
                const validation = {
                    isValid: true,
                    errors: [],
                    warnings: []
                };

                // Check for basic structure
                if (!results.data || results.data.length === 0) {
                    validation.isValid = false;
                    validation.errors.push('File is empty');
                }

                // Check for consistent column count
                const headerCount = results.data[0]?.length || 0;
                const inconsistentRows = results.data.findIndex(row => 
                    row.length !== headerCount
                );

                if (inconsistentRows !== -1) {
                    validation.warnings.push(
                        `Inconsistent column count at row ${inconsistentRows + 1}`
                    );
                }

                resolve(validation);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}
