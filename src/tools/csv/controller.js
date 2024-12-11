// src/tools/csv/controller.js

class CSVController {
    constructor() {
        this.analyzer = new CSVAnalyzer();
        this.renderer = new CSVRenderer('csv-summary', 'csv-column-details');
        this.initWorker();
        this.initializeEventListeners();
    }

    initWorker() {
        try {
            this.worker = new Worker('src/workers/csv-worker.js');
            console.log('Worker initialized');

            this.worker.onmessage = (e) => {
                console.log('Worker message received:', e.data);
                const { type, data, error } = e.data;
                
                if (type === 'error') {
                    console.error('Worker error:', error);
                    this.hideLoading();
                    this.showError(error);
                    return;
                }

                if (type === 'success') {
                    if (!data) {
                        this.showError('No data received from worker');
                        return;
                    }

                    try {
                        console.log('Analysis complete:', data);
                        const results = this.formatWorkerResults(data);
                        this.renderer.render(results);
                        this.hideLoading();
                        
                        const resultsContainer = document.getElementById('csv-results');
                        if (resultsContainer) {
                            resultsContainer.style.display = 'block';
                        }
                    } catch (error) {
                        console.error('Error processing worker results:', error);
                        this.showError('Error processing analysis results: ' + error.message);
                    }
                }
            };

            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                this.hideLoading();
                this.showError('Worker error: ' + error.message);
            };
        } catch (error) {
            console.error('Failed to initialize worker:', error);
            this.showError('Failed to initialize CSV analyzer: ' + error.message);
        }
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('csvInput');
        const dropZone = document.querySelector('.file-drop-zone');

        if (!fileInput || !dropZone) {
            console.error('Required elements not found');
            return;
        }

        fileInput.addEventListener('change', (event) => {
            console.log('File input change event');
            const file = event.target.files[0];
            if (file) {
                this.processFile(file);
            }
        });

        // Drag and drop handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                this.processFile(file);
            }
        });

        // Prevent file drag over entire window
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        window.addEventListener('drop', (e) => {
            e.preventDefault();
        });
    }

    async processFile(file) {
        console.log('Processing file:', file);
        
        if (!file) {
            this.showError('No file selected');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showError('Please upload a CSV file');
            return;
        }

        // Reset previous results
        const resultsContainer = document.getElementById('csv-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }

        try {
            this.showLoading('Reading file...');
            const fileText = await file.text();
            console.log('File loaded, size:', fileText.length, 'bytes');

            // Basic validation
            if (!fileText.trim()) {
                throw new Error('File is empty');
            }

            // First validate the CSV structure
            this.worker.postMessage({ 
                command: 'validate',
                file: fileText
            });

            this.showLoading('Validating CSV structure...');

            // Then analyze the content
            this.worker.postMessage({ 
                command: 'analyze',
                file: fileText
            });
            
            this.showLoading('Analyzing CSV data...');

        } catch (error) {
            console.error('Error processing file:', error);
            this.hideLoading();
            this.showError('Error reading file: ' + error.message);
        }
    }

    formatWorkerResults(workerData) {
        console.log('Formatting worker results:', workerData);
        
        try {
            if (!workerData || typeof workerData !== 'object') {
                throw new Error('Invalid worker data format');
            }

            const firstColumn = Object.values(workerData)[0] || {};
            
            const summary = {
                rowCount: firstColumn.total || 0,
                columnCount: Object.keys(workerData).length,
                completeness: this.calculateCompleteness(workerData),
                typeDistribution: this.calculateTypeDistribution(workerData),
                memorySizeEstimate: this.estimateMemorySize(workerData)
            };

            const columns = {};
            Object.entries(workerData).forEach(([name, data]) => {
                if (!data) return;
                
                columns[name] = {
                    name,
                    type: data.type || 'unknown',
                    unique: data.unique || 0,
                    missing: data.missing || 0,
                    total: data.total || 0,
                    stats: this.formatColumnStats(data)
                };
            });

            console.log('Formatted results:', { summary, columns });
            return { summary, columns };
        } catch (error) {
            console.error('Error formatting results:', error);
            throw error;
        }
    }

    calculateCompleteness(data) {
        try {
            const firstColumn = Object.values(data)[0] || {};
            const totalCells = (firstColumn.total || 0) * Object.keys(data).length;
            const missingCells = Object.values(data)
                .reduce((sum, col) => sum + (col.missing || 0), 0);

            if (totalCells === 0) return 0;
            return ((totalCells - missingCells) / totalCells) * 100;
        } catch (error) {
            console.error('Error calculating completeness:', error);
            return 0;
        }
    }

    calculateTypeDistribution(data) {
        try {
            const distribution = {};
            Object.values(data).forEach(col => {
                const type = col.type || 'unknown';
                distribution[type] = (distribution[type] || 0) + 1;
            });
            return distribution;
        } catch (error) {
            console.error('Error calculating type distribution:', error);
            return {};
        }
    }

    estimateMemorySize(data) {
        try {
            let size = 0;
            Object.values(data).forEach(col => {
                // Estimate based on column type and number of values
                const valueCount = (col.total || 0) - (col.missing || 0);
                switch (col.type) {
                    case 'number':
                        size += valueCount * 8; // 64-bit numbers
                        break;
                    case 'string':
                        size += valueCount * (col.avgLength || 10) * 2; // Unicode characters
                        break;
                    case 'boolean':
                        size += valueCount; // 1 byte per boolean
                        break;
                    case 'date':
                        size += valueCount * 8; // 64-bit timestamps
                        break;
                    default:
                        size += valueCount * 8; // Default assumption
                }
            });
            return size;
        } catch (error) {
            console.error('Error estimating memory size:', error);
            return 0;
        }
    }

    formatColumnStats(data) {
        if (!data) return {};

        switch (data.type) {
            case 'number':
                return {
                    min: data.min,
                    max: data.max,
                    mean: data.mean,
                    hasDecimals: data.hasDecimals,
                    zeros: data.zeros || 0,
                    negative: data.negative || 0
                };
            case 'string':
                return {
                    minLength: data.minLength || 0,
                    maxLength: data.maxLength || 0,
                    avgLength: data.avgLength || 0,
                    empty: data.empty || 0,
                    topValues: data.topValues || []
                };
            case 'date':
                return {
                    earliest: data.earliest,
                    latest: data.latest,
                    range: data.range || 0,
                    invalidDates: data.invalidDates || 0
                };
            case 'boolean':
                return {
                    trueCount: data.trueCount || 0,
                    falseCount: data.falseCount || 0,
                    truePercentage: data.truePercentage || 0
                };
            case 'mixed':
                return {
                    typeDistribution: data.typeDistribution || {},
                    predominantType: data.predominantType || 'unknown'
                };
            default:
                return {};
        }
    }

    showLoading(message = 'Processing...') {
        let loadingEl = document.querySelector('.loading-indicator');
        
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.className = 'loading-indicator';
        }
        
        loadingEl.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${this.escapeHtml(message)}</div>
        `;
        
        const container = document.querySelector('.tool-content');
        if (container) {
            container.appendChild(loadingEl);
        }
    }

    hideLoading() {
        const loadingEl = document.querySelector('.loading-indicator');
        if (loadingEl) {
            loadingEl.remove();
        }
    }

    showError(message) {
        console.error('Error:', message);
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        
        const resultsContainer = document.getElementById('csv-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.appendChild(errorEl);
            resultsContainer.style.display = 'block';
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
