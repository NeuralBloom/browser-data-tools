// src/tools/csv/controller.js

import { CSVAnalyzer } from './analyzer.js';
import { CSVRenderer } from './renderer.js';

class CSVController {
    constructor() {
        this.analyzer = new CSVAnalyzer();
        this.renderer = new CSVRenderer('csv-summary', 'csv-column-details');
        this.initWorker();
        this.initializeEventListeners();
    }

    initWorker() {
        try {
            this.worker = new Worker('/src/workers/csv-worker.js');
            console.log('Worker initialized');

            this.worker.onmessage = (e) => {
                console.log('Worker message received:', e.data);
                const { type, data, error } = e.data;
                
                if (type === 'error') {
                    this.hideLoading();
                    this.showError(error);
                    return;
                }

                if (type === 'success') {
                    console.log('Analysis results:', data);
                    const results = this.formatWorkerResults(data);
                    this.renderer.render(results);
                    this.hideLoading();
                    
                    const resultsContainer = document.getElementById('csv-results');
                    resultsContainer.style.display = 'block';
                }
            };

            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                this.hideLoading();
                this.showError('Worker error: ' + error.message);
            };
        } catch (error) {
            console.error('Failed to initialize worker:', error);
            this.showError('Failed to initialize CSV analyzer');
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

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            console.log('File drop event');
            dropZone.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                this.processFile(file);
            }
        });
    }

    async processFile(file) {
        console.log('Processing file:', file);
        
        if (!file) {
            this.showError('No file selected');
            return;
        }

        try {
            // Create a text copy of the file for the worker
            const fileText = await file.text();
            console.log('File text loaded, sending to worker');

            this.showLoading('Analyzing CSV file...');
            
            // Send the file text to the worker
            this.worker.postMessage({ 
                command: 'analyze',
                file: fileText
            });

        } catch (error) {
            console.error('Error processing file:', error);
            this.hideLoading();
            this.showError(error.message);
        }
    }

    formatWorkerResults(workerData) {
        console.log('Formatting worker results:', workerData);
        
        try {
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

            console.log('Formatted results:', { summary, columns });
            return { summary, columns };
        } catch (error) {
            console.error('Error formatting results:', error);
            throw error;
        }
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
        console.error('Error:', message);
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
    console.log('Initializing CSV Controller');
    window.csvController = new CSVController();
});

export default CSVController;
