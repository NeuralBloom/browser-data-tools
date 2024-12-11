// src/tools/json/explorer.js

class JSONExplorer {
    constructor() {
        this.data = null;
        this.flattenedPaths = new Map();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('jsonInput');
        const loadFileBtn = document.getElementById('loadFileBtn');
        const pasteJsonBtn = document.getElementById('pasteJsonBtn');
        const jsonPaste = document.getElementById('jsonPaste');
        const searchInput = document.getElementById('jsonSearch');
        const expandAllBtn = document.getElementById('expandAllBtn');
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        const copyPathBtn = document.getElementById('copyPathBtn');

        if (loadFileBtn) {
            loadFileBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadFile(file);
                }
            });
        }

        if (pasteJsonBtn && jsonPaste) {
            pasteJsonBtn.addEventListener('click', () => {
                jsonPaste.style.display = jsonPaste.style.display === 'none' ? 'block' : 'none';
            });

            jsonPaste.addEventListener('input', () => {
                this.validateJsonInput(jsonPaste.value);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => this.expandAll());
        }

        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => this.collapseAll());
        }

        if (copyPathBtn) {
            copyPathBtn.addEventListener('click', () => this.copyPath());
        }
    }

    async loadFile(file) {
        try {
            const text = await file.text();
            this.validateJsonInput(text);
        } catch (error) {
            this.showError('Error reading file: ' + error.message);
        }
    }

    validateJsonInput(text) {
        try {
            const trimmedText = text.trim();
            if (!trimmedText) {
                return;
            }

            const data = JSON.parse(trimmedText);
            this.data = data;
            this.analyze();
        } catch (error) {
            this.showError('Invalid JSON: ' + error.message);
        }
    }

    analyze() {
        try {
            const structure = this.mapStructure(this.data);
            const paths = this.getAllPaths(this.data);
            const stats = this.getStats(this.data);

            this.renderResults(structure, paths, stats);
        } catch (error) {
            this.showError('Error analyzing JSON: ' + error.message);
        }
    }

    mapStructure(obj, depth = 0, path = '') {
        if (depth > 20) return '[Max Depth Exceeded]';
        
        const type = Array.isArray(obj) ? 'array' : typeof obj;
        
        if (type !== 'object' || obj === null) {
            this.flattenedPaths.set(path, {
                type,
                value: obj,
                depth
            });
            return { type, value: obj };
        }

        const structure = {};
        Object.entries(obj).forEach(([key, value]) => {
            const newPath = path ? `${path}.${key}` : key;
            structure[key] = this.mapStructure(value, depth + 1, newPath);
        });

        this.flattenedPaths.set(path, {
            type,
            childCount: Object.keys(obj).length,
            depth
        });

        return structure;
    }

    getAllPaths(obj, parentPath = '') {
        const paths = [];
        
        const traverse = (current, path) => {
            if (!current || typeof current !== 'object') {
                paths.push({
                    path,
                    type: typeof current,
                    value: current
                });
                return;
            }

            paths.push({
                path,
                type: Array.isArray(current) ? 'array' : 'object',
                childCount: Object.keys(current).length
            });

            Object.entries(current).forEach(([key, value]) => {
                const newPath = path ? `${path}.${key}` : key;
                traverse(value, newPath);
            });
        };

        traverse(obj, parentPath);
        return paths;
    }

    getStats(obj) {
        const stats = {
            totalKeys: 0,
            maxDepth: 0,
            arrayCount: 0,
            valueTypes: {},
            nullCount: 0
        };

        const traverse = (current, depth = 0) => {
            stats.maxDepth = Math.max(stats.maxDepth, depth);

            if (current === null) {
                stats.nullCount++;
                return;
            }

            if (Array.isArray(current)) {
                stats.arrayCount++;
                current.forEach(item => traverse(item, depth + 1));
                return;
            }

            if (typeof current === 'object') {
                stats.totalKeys += Object.keys(current).length;
                Object.values(current).forEach(value => traverse(value, depth + 1));
                return;
            }

            const type = typeof current;
            stats.valueTypes[type] = (stats.valueTypes[type] || 0) + 1;
        };

        traverse(obj);
        return stats;
    }

    handleSearch(query) {
        const results = this.findPaths(query);
        this.renderSearchResults(results);
    }

    findPaths(query) {
        const results = [];
        query = query.toLowerCase();

        this.flattenedPaths.forEach((value, path) => {
            const pathLower = path.toLowerCase();
            const matches = pathLower.includes(query) || 
                           (value.value && String(value.value).toLowerCase().includes(query));
            
            if (matches) {
                results.push({ path, ...value });
            }
        });

        return results;
    }

    renderResults(structure, paths, stats) {
        const jsonTree = document.getElementById('jsonTree');
        const jsonStats = document.getElementById('jsonStats');
        const resultsContainer = document.getElementById('json-results');

        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }

        if (jsonTree) {
            jsonTree.innerHTML = this.renderTree(structure);
        }

        if (jsonStats) {
            jsonStats.innerHTML = this.renderStats(stats);
        }
    }

    renderTree(structure, level = 0) {
        if (typeof structure !== 'object' || structure === null) {
            return this.renderValue(structure);
        }

        const indent = '  '.repeat(level);
        const items = Object.entries(structure).map(([key, value]) => {
            const isExpandable = typeof value === 'object' && value !== null;
            const toggleBtn = isExpandable ? 
                `<button class="json-tree-toggle">▼</button>` : '';

            return `
                <div class="json-tree-item" data-level="${level}">
                    ${toggleBtn}
                    <span class="json-key">${this.escapeHtml(key)}</span>
                    ${isExpandable ? this.renderTree(value, level + 1) : `: ${this.renderValue(value)}`}
                </div>
            `;
        });

        return items.join('\n');
    }

    renderValue(value) {
        if (value === null) return '<span class="json-null">null</span>';
        if (typeof value === 'string') return `<span class="json-string">"${this.escapeHtml(value)}"</span>`;
        if (typeof value === 'number') return `<span class="json-number">${value}</span>`;
        if (typeof value === 'boolean') return `<span class="json-boolean">${value}</span>`;
        return `<span class="json-${typeof value}">${this.escapeHtml(String(value))}</span>`;
    }

    renderStats(stats) {
        return `
            <div class="stat-card">
                <h4>Structure</h4>
                <div>Total Keys: ${stats.totalKeys}</div>
                <div>Max Depth: ${stats.maxDepth}</div>
                <div>Arrays: ${stats.arrayCount}</div>
            </div>
            <div class="stat-card">
                <h4>Types</h4>
                ${Object.entries(stats.valueTypes).map(([type, count]) => 
                    `<div>${type}: ${count}</div>`
                ).join('')}
            </div>
        `;
    }

    renderSearchResults(results) {
        const jsonTree = document.getElementById('jsonTree');
        if (!jsonTree) return;

        if (results.length === 0) {
            jsonTree.innerHTML = '<div class="no-results">No matches found</div>';
            return;
        }

        jsonTree.innerHTML = results.map(result => `
            <div class="search-result">
                <div class="result-path">${this.escapeHtml(result.path)}</div>
                <div class="result-value">${this.renderValue(result.value)}</div>
            </div>
        `).join('');
    }

    expandAll() {
        const items = document.querySelectorAll('.json-tree-item');
        items.forEach(item => item.classList.remove('collapsed'));
    }

    collapseAll() {
        const items = document.querySelectorAll('.json-tree-item');
        items.forEach(item => item.classList.add('collapsed'));
    }

    async copyPath() {
        const selectedPath = document.querySelector('.json-tree-item.selected')?.dataset.path;
        if (selectedPath) {
            try {
                await navigator.clipboard.writeText(selectedPath);
                this.showNotification('Path copied to clipboard');
            } catch (error) {
                this.showError('Failed to copy path');
            }
        }
    }

    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        
        const resultsContainer = document.getElementById('json-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.appendChild(errorEl);
            resultsContainer.style.display = 'block';
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
