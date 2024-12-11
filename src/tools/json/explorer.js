// src/tools/json/explorer.js

class JSONExplorer {
    constructor() {
        this.data = null;
        this.flattenedPaths = new Map();
        this.initializeEventListeners();
    }

    analyze(jsonString) {
        try {
            this.data = typeof jsonString === 'string' ? 
                JSON.parse(jsonString) : jsonString;
            
            return {
                structure: this.mapStructure(this.data),
                paths: this.getAllPaths(this.data),
                stats: this.getStats(this.data)
            };
        } catch (error) {
            throw new Error(`JSON parsing failed: ${error.message}`);
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
            nullCount: 0,
            stringLengths: {
                min: Infinity,
                max: 0,
                avg: 0
            },
            numberStats: {
                min: Infinity,
                max: -Infinity,
                sum: 0,
                count: 0
            }
        };

        const stringLengths = [];
        const numbers = [];

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

            if (type === 'string') {
                const length = current.length;
                stringLengths.push(length);
                stats.stringLengths.min = Math.min(stats.stringLengths.min, length);
                stats.stringLengths.max = Math.max(stats.stringLengths.max, length);
            }

            if (type === 'number') {
                numbers.push(current);
                stats.numberStats.min = Math.min(stats.numberStats.min, current);
                stats.numberStats.max = Math.max(stats.numberStats.max, current);
                stats.numberStats.sum += current;
                stats.numberStats.count++;
            }
        };

        traverse(obj);

        // Calculate averages
        if (stringLengths.length > 0) {
            stats.stringLengths.avg = stringLengths.reduce((a, b) => a + b, 0) / stringLengths.length;
        }

        if (stats.numberStats.count > 0) {
            stats.numberStats.avg = stats.numberStats.sum / stats.numberStats.count;
        }

        return stats;
    }

    findPaths(query) {
        const queryParts = query.split('.');
        const results = [];

        this.flattenedPaths.forEach((value, path) => {
            const pathParts = path.split('.');
            let matches = true;
            
            for (let i = 0; i < queryParts.length; i++) {
                if (queryParts[i] !== '*' && queryParts[i] !== pathParts[i]) {
                    matches = false;
                    break;
                }
            }

            if (matches) {
                results.push({ path, ...value });
            }
        });

        return results;
    }

    flatten() {
        const result = {};
        
        this.flattenedPaths.forEach((value, path) => {
            if (value.value !== undefined) {
                result[path] = value.value;
            }
        });

        return result;
    }

    query(path) {
        const parts = path.split('.');
        let current = this.data;

        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }

        return current;
    }

    diff(other) {
        const differences = [];
        const otherExplorer = other instanceof JSONExplorer ? 
            other : new JSONExplorer().analyze(other);

        const compare = (path1, path2) => {
            const value1 = this.query(path1);
            const value2 = otherExplorer.query(path2);

            if (JSON.stringify(value1) !== JSON.stringify(value2)) {
                differences.push({
                    path: path1,
                    original: value1,
                    new: value2
                });
            }
        };

        const paths1 = new Set(this.getAllPaths(this.data).map(p => p.path));
        const paths2 = new Set(otherExplorer.getAllPaths(otherExplorer.data).map(p => p.path));

        // Check common paths
        paths1.forEach(path => {
            if (paths2.has(path)) {
                compare(path, path);
            } else {
                differences.push({
                    path,
                    original: this.query(path),
                    new: undefined,
                    type: 'removed'
                });
            }
        });

        // Check for new paths
        paths2.forEach(path => {
            if (!paths1.has(path)) {
                differences.push({
                    path,
                    original: undefined,
                    new: otherExplorer.query(path),
                    type: 'added'
                });
            }
        });

        return differences;
    }
}
