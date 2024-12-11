// src/tools/csv/renderer.js

export class CSVRenderer {
    constructor(summaryContainer, detailsContainer) {
        this.summaryContainer = document.getElementById(summaryContainer);
        this.detailsContainer = document.getElementById(detailsContainer);
    }

    render(analysis) {
        this.renderSummary(analysis.summary);
        this.renderColumnDetails(analysis.columns);
    }

    renderSummary(summary) {
        if (!summary) return;

        const completenessClass = summary.completeness > 90 ? 'success' : 
                                summary.completeness > 70 ? 'warning' : 'error';

        this.summaryContainer.innerHTML = `
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-title">Dataset Size</div>
                    <div class="stat-content">
                        <div class="stat-item">
                            <span class="stat-label">Rows</span>
                            <span class="stat-value">${summary.rowCount.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Columns</span>
                            <span class="stat-value">${summary.columnCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Estimated Size</span>
                            <span class="stat-value">${this.formatBytes(summary.memorySizeEstimate)}</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-title">Data Quality</div>
                    <div class="stat-content">
                        <div class="stat-item">
                            <span class="stat-label">Completeness</span>
                            <div class="progress-bar">
                                <div class="progress-fill ${completenessClass}" 
                                     style="width: ${summary.completeness}%"></div>
                            </div>
                            <span class="stat-value">${summary.completeness.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-title">Column Types</div>
                    <div class="stat-content">
                        ${this.renderTypeDistribution(summary.typeDistribution)}
                    </div>
                </div>
            </div>
        `;
    }

    renderTypeDistribution(distribution) {
        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        return Object.entries(distribution)
            .map(([type, count]) => {
                const percentage = (count / total) * 100;
                return `
                    <div class="type-distribution-item">
                        <span class="type-label ${type}">${type}</span>
                        <div class="type-bar">
                            <div class="type-fill ${type}" 
                                 style="width: ${percentage}%"></div>
                        </div>
                        <span class="type-count">${count}</span>
                    </div>
                `;
            }).join('');
    }

    renderColumnDetails(columns) {
        if (!columns) return;

        const columnCards = Object.values(columns).map(column => `
            <div class="column-card">
                <div class="column-header">
                    <h4 class="column-name">${this.escapeHtml(column.name)}</h4>
                    <span class="column-type ${column.type}">${column.type}</span>
                </div>
                <div class="column-content">
                    <div class="column-stats">
                        ${this.renderColumnStats(column)}
                    </div>
                    ${column.type === 'number' ? this.renderDistributionChart(column) : ''}
                </div>
            </div>
        `).join('');

        this.detailsContainer.innerHTML = `
            <div class="column-grid">
                ${columnCards}
            </div>
        `;
    }

    renderColumnStats(column) {
        const stats = [];

        // Common stats for all types
        stats.push(`
            <div class="stat-row">
                <span class="stat-label">Unique Values</span>
                <span class="stat-value">${column.unique.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Missing Values</span>
                <span class="stat-value">${column.missing.toLocaleString()}</span>
            </div>
        `);

        // Type-specific stats
        switch (column.type) {
            case 'number':
                stats.push(this.renderNumericStats(column.stats));
                break;
            case 'string':
                stats.push(this.renderStringStats(column.stats));
                break;
            case 'date':
                stats.push(this.renderDateStats(column.stats));
                break;
            case 'boolean':
                stats.push(this.renderBooleanStats(column.stats));
                break;
            case 'mixed':
                stats.push(this.renderMixedStats(column.stats));
                break;
        }

        return stats.join('');
    }

    renderNumericStats(stats) {
        return `
            <div class="stat-row">
                <span class="stat-label">Range</span>
                <span class="stat-value">${stats.min.toLocaleString()} - ${stats.max.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Mean</span>
                <span class="stat-value">${stats.mean.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Median</span>
                <span class="stat-value">${stats.median.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Std Dev</span>
                <span class="stat-value">${stats.stdDev.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Zero Values</span>
                <span class="stat-value">${stats.zeros}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Negative Values</span>
                <span class="stat-value">${stats.negative}</span>
            </div>
        `;
    }

    renderStringStats(stats) {
        const topValues = stats.topValues.map(({value, count}) => `
            <div class="top-value">
                <span class="value">${this.escapeHtml(String(value))}</span>
                <span class="count">(${count})</span>
            </div>
        `).join('');

        return `
            <div class="stat-row">
                <span class="stat-label">Length Range</span>
                <span class="stat-value">${stats.minLength} - ${stats.maxLength}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Length</span>
                <span class="stat-value">${stats.avgLength.toFixed(1)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Empty Strings</span>
                <span class="stat-value">${stats.empty}</span>
            </div>
            <div class="stat-section">
                <div class="stat-subtitle">Most Common Values</div>
                <div class="top-values">
                    ${topValues}
                </div>
            </div>
        `;
    }

    renderDateStats(stats) {
        return `
            <div class="stat-row">
                <span class="stat-label">Date Range</span>
                <span class="stat-value">
                    ${stats.earliest.toLocaleDateString()} - 
                    ${stats.latest.toLocaleDateString()}
                </span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Time Span</span>
                <span class="stat-value">${this.formatTimespan(stats.range)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Invalid Dates</span>
                <span class="stat-value">${stats.invalidDates}</span>
            </div>
        `;
    }

    renderBooleanStats(stats) {
        return `
            <div class="stat-row">
                <span class="stat-label">True Values</span>
                <span class="stat-value">${stats.trueCount}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">False Values</span>
                <span class="stat-value">${stats.falseCount}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">True Percentage</span>
                <span class="stat-value">${stats.truePercentage.toFixed(1)}%</span>
            </div>
        `;
    }

    renderMixedStats(stats) {
        const typeDistribution = Object.entries(stats.typeDistribution)
            .map(([type, count]) => `
                <div class="type-item">
                    <span class="type-name">${type}</span>
                    <span class="type-count">${count}</span>
                </div>
            `).join('');

        return `
            <div class="stat-row">
                <span class="stat-label">Predominant Type</span>
                <span class="stat-value">${stats.predominantType}</span>
            </div>
            <div class="stat-section">
                <div class="stat-subtitle">Type Distribution</div>
                <div class="type-distribution">
                    ${typeDistribution}
                </div>
            </div>
        `;
    }

    renderDistributionChart(column) {
        // Simple bar chart for numeric distributions
        if (column.type !== 'number' || !column.stats) return '';

        const range = column.stats.max - column.stats.min;
        const bucketCount = 10;
        const bucketSize = range / bucketCount;
        const buckets = new Array(bucketCount).fill(0);

        // Create buckets
        column.values.forEach(value => {
            if (typeof value === 'number' && !isNaN(value)) {
                const bucketIndex = Math.min(
                    Math.floor((value - column.stats.min) / bucketSize),
                    bucketCount - 1
                );
                buckets[bucketIndex]++;
            }
        });

        const maxBucketValue = Math.max(...buckets);
        const bars = buckets.map((count, i) => {
            const height = (count / maxBucketValue) * 100;
            const start = column.stats.min + (i * bucketSize);
            const end = start + bucketSize;
            return `
                <div class="dist-bar" style="height: ${height}%"
                     title="Range: ${start.toFixed(2)} - ${end.toFixed(2)}
Count: ${count}"></div>
            `;
        }).join('');

        return `
            <div class="distribution-chart">
                <div class="chart-title">Value Distribution</div>
                <div class="chart-bars">
                    ${bars}
                </div>
            </div>
        `;
    }

    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    formatTimespan(ms) {
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        if (days > 365) {
            const years = (days / 365).toFixed(1);
            return `${years} years`;
        }
        if (days > 30) {
            const months = (days / 30).toFixed(1);
            return `${months} months`;
        }
        return `${days} days`;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
