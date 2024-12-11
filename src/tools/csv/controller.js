// src/tools/csv/controller.js

import { CSVAnalyzer } from './analyzer.js';
import { CSVRenderer } from './renderer.js';

class CSVController {
    constructor() {
        this.analyzer = new CSVAnalyzer();
        this.renderer = new CSVRenderer('csv-summary', 'csv-column-details');
        this.worker = new Worker('src/workers/csv-worker.js');
        this.initializeWorker();
        this.initializeEventListeners();
    }

    initializeWorker() {
        this.worker.onmessage = (e) => {
            const { type, data, error } = e.data;
            
            if (type === 'error') {
                this.hideLoading();
                this.showError(error);
                return;
            }

            if (type === 'success') {
                // Convert worker analysis format to renderer format
                const results = this.formatWorkerResults(data);
                this.renderer.render(results);
                this.hideLoading();
                
                // Show results container
                const resultsContainer = document.getElementById('csv-results');
                resultsContainer.style.display = 'block';
            }
        };

        this.worker.onerror = (error) => {
            this.hideLoading();
            this.showError('Worker error: ' + error.message);
        };
    }

    initializeEventListeners() {
        // Get file input element
        const fileInput = document.getElementById('csvInput');
        const dropZone = document.querySelector('.file-drop-zone');
        const resultsContainer = document.getElementById('csv-results');

        // File input change handler
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                await this.processFile(file);
            }
        });

        // Drag and drop handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                await this.processFile(file);
            }
        });
    }

    async processFile(file) {
        try {
            // First, validate the CSV
            this.showLoading('Validating CSV file...');
            this.worker.postMessage({ 
                command: 'validate',
                file: file
            });

            // Then analyze it
            this.showLoading('Analyzing CSV data...');
            this.worker.postMessage({ 
                command: 'analyze',
                file: file
            });

        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    formatWorkerResults(workerData) {
        // Convert worker analysis format to renderer format
        const summary = {
            rowCount: Object.values(workerData)[0]?.total || 0,
            columnCount: Object.keys(workerData).length,
            completeness: this.calculateCompleteness(workerData),
            typeDistribution: this.calculateTypeDistribution(workerData)
        };

        const columns = {};
        Object.entries(workerData).forEach(([name, data]) => {
            columns[name] = {
                name,
                type: data.type,
                unique: data.unique,
                missing: data.missing,
                stats: this.formatColumnStats(data)
            };
        });

        return { summary, columns };
    }

    calculateCompleteness(data) {
        const totalCells = Object.values(data)[0]?.total * Object.keys(data).length;
        const missingCells = Object.values(data)
            .reduce((sum, col) => sum + (col.missing || 0), 0);

        return ((totalCells - missingCells) / totalCells) * 100;
    }

    calculateTypeDistribution(data) {
        const distribution = {};
        Object.values(data).forEach(col => {
            distribution[col.type] = (distribution[col.type] || 0) + 1;
        });
        return distribution;
    }

    formatColumnStats(data) {
        if (data.type === 'number') {
            return {
                min: data.min,
                max: data.max,
                mean: data.mean,
                hasDecimals: data.hasDecimals,
                zeros: data.zeros || 0,
                negative: data.negative || 0
            };
        }

        if (data.type === 'string') {
            return {
                minLength: data.minLength,
                maxLength: data.maxLength,
                avgLength: data.avgLength,
                empty: data.empty || 0
            };
        }

        return {};
    }

    showLoading(message = 'Processing...') {
        let loadingEl = document.querySelector('.loading-indicator');
        
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.className = 'loading-indicator';
        }
        
        loadingEl.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        
        document.querySelector('.tool-content').appendChild(loadingEl);
    }

    hideLoading() {
        const loadingEl = document.querySelector('.loading-indicator');
        if (loadingEl) {
            loadingEl.remove();
        }
    }

    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        
        const resultsContainer = document.getElementById('csv-results');
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(errorEl);
        resultsContainer.style.display = 'block';
    }
}

// Initialize the controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.csvController = new CSVController();
});

export default CSVController;
