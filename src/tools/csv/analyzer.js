// src/tools/csv/analyzer.js

class CSVAnalyzer {
    constructor() {
        this.data = null;
        this.columns = null;
        this.summary = null;
    }

    async analyzeFile(file) {
        try {
            const text = await file.text();
            return this.analyzeText(text);
        } catch (error) {
            throw new Error(`Failed to analyze CSV file: ${error.message}`);
        }
    }

    analyzeText(text) {
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        this.data = results.data;
                        this.columns = this.detectColumns(results.data);
                        this.summary = this.generateSummary();
                        resolve({
                            columns: this.columns,
                            summary: this.summary,
                            rowCount: this.data.length
                        });
                    } catch (error) {
                        reject(new Error(`Failed to analyze CSV: ${error.message}`));
                    }
                },
                error: (error) => {
                    reject(new Error(`Failed to parse CSV: ${error.message}`));
                }
            });
        });
    }

    detectColumns(data) {
        if (!data || data.length === 0) return [];

        const firstRow = data[0];
        const columns = {};

        Object.keys(firstRow).forEach(key => {
            columns[key] = this.analyzeColumn(data, key);
        });

        return columns;
    }

    analyzeColumn(data, columnName) {
        const values = data.map(row => row[columnName]).filter(val => val != null);
        const types = new Set(values.map(val => typeof val));
        
        // Determine primary type
        let type = types.size === 1 ? Array.from(types)[0] : 'mixed';
        
        // Special case for dates
        if (type === 'string') {
            const sampleSize = Math.min(values.length, 10);
            const dateCount = values.slice(0, sampleSize)
                .filter(val => !isNaN(Date.parse(val)))
                .length;
            
            if (dateCount === sampleSize) {
                type = 'date';
            }
        }

        const analysis = {
            name: columnName,
            type: type,
            count: values.length,
            unique: new Set(values).size,
            missing: data.length - values.length,
            stats: {}
        };

        // Calculate type-specific statistics
        switch (type) {
            case 'number':
                analysis.stats = this.calculateNumericStats(values);
                break;
            case 'string':
                analysis.stats = this.calculateStringStats(values);
                break;
            case 'date':
                analysis.stats = this.calculateDateStats(values);
                break;
            case 'boolean':
                analysis.stats = this.calculateBooleanStats(values);
                break;
            case 'mixed':
                analysis.stats = this.calculateMixedStats(values);
                break;
        }

        return analysis;
    }

    calculateNumericStats(values) {
        const numbers = values.filter(v => typeof v === 'number' && !isNaN(v));
        if (numbers.length === 0) return {};

        const sorted = numbers.sort((a, b) => a - b);
        const sum = numbers.reduce((a, b) => a + b, 0);

        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: sum / numbers.length,
            median: this.calculateMedian(sorted),
            stdDev: this.calculateStdDev(numbers),
            zeros: numbers.filter(v => v === 0).length,
            negative: numbers.filter(v => v < 0).length
        };
    }

    calculateStringStats(values) {
        const lengths = values.map(v => String(v).length);
        const words = values.map(v => String(v).split(/\s+/).length);

        return {
            minLength: Math.min(...lengths),
            maxLength: Math.max(...lengths),
            avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length,
            empty: values.filter(v => v === '').length,
            minWords: Math.min(...words),
            maxWords: Math.max(...words),
            topValues: this.getTopValues(values, 5)
        };
    }

    calculateDateStats(values) {
        const dates = values.map(v => new Date(v));
        const timestamps = dates.map(d => d.getTime());

        return {
            earliest: new Date(Math.min(...timestamps)),
            latest: new Date(Math.max(...timestamps)),
            range: Math.max(...timestamps) - Math.min(...timestamps),
            invalidDates: values.filter(v => isNaN(Date.parse(v))).length
        };
    }

    calculateBooleanStats(values) {
        const trueCount = values.filter(v => v === true).length;
        return {
            trueCount: trueCount,
            falseCount: values.length - trueCount,
            truePercentage: (trueCount / values.length) * 100
        };
    }

    calculateMixedStats(values) {
        const types = values.map(v => typeof v);
        const typeCounts = {};
        types.forEach(type => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        return {
            typeDistribution: typeCounts,
            predominantType: Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])[0][0]
        };
    }

    calculateMedian(sorted) {
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    calculateStdDev(numbers) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
        const variance = squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
        return Math.sqrt(variance);
    }

    getTopValues(values, count) {
        const frequency = {};
        values.forEach(value => {
            frequency[value] = (frequency[value] || 0) + 1;
        });

        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([value, count]) => ({ value, count }));
    }

    generateSummary() {
        if (!this.data || !this.columns) return null;

        return {
            rowCount: this.data.length,
            columnCount: Object.keys(this.columns).length,
            completeness: this.calculateCompleteness(),
            typeDistribution: this.calculateTypeDistribution(),
            memorySizeEstimate: this.estimateMemorySize()
        };
    }

    calculateCompleteness() {
        const totalCells = this.data.length * Object.keys(this.columns).length;
        const missingCells = Object.values(this.columns)
            .reduce((sum, col) => sum + col.missing, 0);

        return ((totalCells - missingCells) / totalCells) * 100;
    }

    calculateTypeDistribution() {
        const distribution = {};
        Object.values(this.columns).forEach(col => {
            distribution[col.type] = (distribution[col.type] || 0) + 1;
        });
        return distribution;
    }

    estimateMemorySize() {
        // Rough estimation in bytes
        let size = 0;
        this.data.forEach(row => {
            Object.values(row).forEach(value => {
                switch (typeof value) {
                    case 'string':
                        size += value.length * 2;
                        break;
                    case 'number':
                        size += 8;
                        break;
                    case 'boolean':
                        size += 4;
                        break;
                    default:
                        size += 8;
                }
            });
        });
        return size;
    }
}
