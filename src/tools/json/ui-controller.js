// src/tools/json/ui-controller.js

class JSONExplorerUI {
    constructor() {
        this.explorer = new JSONExplorer();
        this.initializeElements();
        this.setupEventListeners();
        this.currentPath = [];
    }

    initializeElements() {
        // Input elements
        this.fileInput = document.getElementById('jsonInput');
        this.pasteArea = document.getElementById('jsonPaste');
        this.searchInput = document.getElementById('jsonSearch');
        
        // Buttons
        this.loadFileBtn = document.getElementById('loadFileBtn');
        this.pasteJsonBtn = document.getElementById('pasteJsonBtn');
        this.expandAllBtn = document.getElementById('expandAllBtn');
        this.collapseAllBtn = document.getElementById('collapseAllBtn');
        this.copyPathBtn = document.getElementById('copyPathBtn');

        // Content containers
        this.resultsContainer = document.getElementById('json-results');
        this.jsonTree = document.getElementById('jsonTree');
        this.jsonStats = document.getElementById('jsonStats');
        this.selectedPath = document.getElementById('selectedPath');
    }

    setupEventListeners() {
        // File loading
        this.loadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // JSON pasting
        this.pasteJsonBtn.addEventListener('click', () => {
            this.pasteArea.classList.toggle('hidden');
            if (!this.pasteArea.classList.contains('hidden')) {
                this.pasteArea.focus();
            }
        });
        this.pasteArea.addEventListener('input', () => this.handlePastedJSON());

        // Search functionality
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));

        // Tree controls
        this.expandAllBtn.addEventListener('click', () => this.expandAll());
        this.collapseAllBtn.addEventListener('click', () => this.collapseAll());
        this.copyPathBtn.addEventListener('click', () => this.copyCurrentPath());
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const results = this.explorer.analyze(text);
            this.displayResults(results);
            this.resultsContainer.classList.remove('hidden');
        } catch (error) {
            this.showError('Error processing JSON file: ' + error.message);
        }
    }

    handlePastedJSON() {
        try {
            const text = this.pasteArea.value.trim();
            if (!text) return;

            const results = this.explorer.analyze(text);
            this.displayResults(results);
            this.resultsContainer.classList.remove('hidden');
        } catch (error) {
            // Only show error if there's content and it's not partially typed
            if (this.pasteArea.value.length > 0) {
                this.showError('Invalid JSON: ' + error.message);
            }
        }
    }

    handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const elements = this.jsonTree.querySelectorAll('.json-tree-item');
        
        elements.forEach(element => {
            const key = element.querySelector('.json-key')?.textContent.toLowerCase() || '';
            const value = element.querySelector('.json-value')?.textContent.toLowerCase() || '';
            
            if (key.includes(query) || value.includes(query)) {
                element.style.display = '';
                this.expandParents(element);
            } else {
                element.style.display = 'none';
            }
        });
    }

    expandParents(element) {
        let parent = element.parentElement;
        while (parent && parent.classList.contains('json-tree-item')) {
            parent.classList.remove('collapsed');
            const toggle = parent.querySelector('.json-tree-toggle');
            if (toggle) toggle.textContent = '▼';
            parent = parent.parentElement;
        }
    }

    displayResults(results) {
        this.displayTree(results.structure);
        this.displayStats(results.stats);
    }

    displayTree(structure, parentElement = this.jsonTree) {
        parentElement.innerHTML = '';
        this.renderTreeNode(structure, parentElement);
    }

    renderTreeNode(node, parentElement, key = '') {
        const item = document.createElement('div');
        item.className = 'json-tree-item';

        const keyElement = document.createElement('span');
        keyElement.className = 'json-key';
        keyElement.textContent = key;
        
        if (typeof node === 'object' && node !== null) {
            const toggle = document.createElement('span');
            toggle.className = 'json-tree-toggle';
            toggle.textContent = '▼';
            toggle.onclick = () => {
                item.classList.toggle('collapsed');
                toggle.textContent = item.classList.contains('collapsed') ? '▶' : '▼';
            };
            item.appendChild(toggle);

            const childContainer = document.createElement('div');
            childContainer.className = 'json-tree-children';
            
            const entries = Object.entries(node);
            if (entries.length > 0) {
                entries.forEach(([childKey, childValue]) => {
                    this.renderTreeNode(childValue, childContainer, childKey);
                });
            }

            const previewText = Array.isArray(node) ? 
                `Array(${node.length})` : `Object(${Object.keys(node).length})`;
            
            const preview = document.createElement('span');
            preview.className = 'json-preview';
            preview.textContent = previewText;
            
            item.appendChild(keyElement);
            item.appendChild(preview);
            item.appendChild(childContainer);
        } else {
            const valueElement = document.createElement('span');
            valueElement.className = this.getValueClassName(node);
            valueElement.textContent = this.formatValue(node);
            
            item.appendChild(keyElement);
            item.appendChild(document.createTextNode(': '));
            item.appendChild(valueElement);
        }

        parentElement.appendChild(item);
    }

    getValueClassName(value) {
        if (value === null) return 'json-null';
        switch (typeof value) {
            case 'string': return 'json-string';
            case 'number': return 'json-number';
            case 'boolean': return 'json-boolean';
            default: return '';
        }
    }

    formatValue(value) {
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${value}"`;
        return String(value);
    }

    displayStats(stats) {
        this.jsonStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-title">Structure</div>
                <div class="stat-value">${stats.totalKeys} keys</div>
                <div class="stat-label">Max Depth: ${stats.maxDepth}</div>
                <div class="stat-label">Arrays: ${stats.arrayCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">Values</div>
                <div class="stat-value">${Object.entries(stats.valueTypes)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join('<br>')}</div>
            </div>
            ${stats.valueTypes.string ? `
            <div class="stat-card">
                <div class="stat-title">Strings</div>
                <div class="stat-label">Min Length: ${stats.stringLengths.min}</div>
                <div class="stat-label">Max Length: ${stats.stringLengths.max}</div>
                <div class="stat-label">Avg Length: ${stats.stringLengths.avg.toFixed(1)}</div>
            </div>` : ''}
            ${stats.valueTypes.number ? `
            <div class="stat-card">
                <div class="stat-title">Numbers</div>
                <div class="stat-label">Min: ${stats.numberStats.min}</div>
                <div class="stat-label">Max: ${stats.numberStats.max}</div>
                <div class="stat-label">Avg: ${stats.numberStats.avg.toFixed(2)}</div>
            </div>` : ''}
        `;
    }

    expandAll() {
        const items = this.jsonTree.querySelectorAll('.json-tree-item');
        items.forEach(item => {
            item.classList.remove('collapsed');
            const toggle = item.querySelector('.json-tree-toggle');
            if (toggle) toggle.textContent = '▼';
        });
    }

    collapseAll() {
        const items = this.jsonTree.querySelectorAll('.json-tree-item');
        items.forEach(item => {
            if (item.querySelector('.json-tree-children')) {
                item.classList.add('collapsed');
                const toggle = item.querySelector('.json-tree-toggle');
                if (toggle) toggle.textContent = '▶';
            }
        });
    }

    async copyCurrentPath() {
        const path = this.currentPath.join('.');
        try {
            await navigator.clipboard.writeText(path);
            this.showNotification('Path copied to clipboard!');
        } catch (err) {
            this.showError('Failed to copy path to clipboard');
        }
    }

    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        this.jsonTree.innerHTML = '';
        this.jsonTree.appendChild(errorElement);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.jsonExplorerUI = new JSONExplorerUI();
});

export default JSONExplorerUI;
