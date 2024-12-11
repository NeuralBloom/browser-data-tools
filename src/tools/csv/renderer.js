// src/tools/csv/renderer.js
class CSVRenderer {
    constructor(summaryContainer, detailsContainer) {
        this.summaryContainer = document.getElementById(summaryContainer);
        this.detailsContainer = document.getElementById(detailsContainer);
        
        if (!this.summaryContainer || !this.detailsContainer) {
            console.error('Required containers not found');
        }
    }

    render(analysis) {
        console.log('Rendering analysis:', analysis);
        if (!analysis) {
            console.error('No analysis data provided');
            return;
        }

        if (analysis.summary) {
            this.renderSummary(analysis.summary);
        }

        if (analysis.columns) {
            this.renderColumnDetails(analysis.columns);
        }
    }

    renderSummary(summary) {
        if (!summary) {
            console.error('No summary data provided');
            return;
        }

        console.log('Rendering summary:', summary);

        const completenessClass = summary.completeness > 90 ? 'success' : 
                                summary.completeness > 70 ? 'warning' : 'error';

        this.summaryContainer.innerHTML = `
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-title">Dataset Size</div>
                    <div class="stat-content">
                        <div class="stat-item">
                            <span class="stat-label">Rows</span>
                            <span class="stat-value">${(summary.rowCount || 0).toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Columns</span>
                            <span class="stat-value">${summary.columnCount || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Estimated Size</span>
                            <span class="stat-value">${this.formatBytes(summary.memorySizeEstimate || 0)}</span>
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
                                     style="width: ${summary.completeness || 0}%"></div>
                            </div>
                            <span class="stat-value">${(summary.completeness || 0).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-title">Column Types</div>
                    <div class="stat-content">
                        ${this.renderTypeDistribution(summary.typeDistribution || {})}
                    </div>
                </div>
            </div>
        `;
    }

    renderTypeDistribution(distribution) {
        if (!distribution || Object.keys(distribution).length === 0) {
            return '<div class="no-data">No type data available</div>';
        }

        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        return Object.entries(distribution)
            .map(([type, count]) => {
                const percentage = total > 0 ? (count / total) * 100 : 0;
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
        if (!columns) {
            console.error('No column data provided');
            return;
        }

        console.log('Rendering columns:', columns);

        const columnCards = Object.entries(columns).map(([name, column]) => {
            if (!column) return '';
            
            return `
                <div class="column-card">
                    <div class="column-header">
                        <h4 class="column-name">${this.escapeHtml(name)}</h4>
                        <span class="column-type ${column.type || ''}">${column.type || 'unknown'}</span>
                    </div>
                    <div class="column-content">
                        <div class="column-stats">
                            ${this.renderColumnStats(column)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.detailsContainer.innerHTML = `
            <div class="column-grid">
                ${columnCards}
            </div>
        `;
    }

    renderColumnStats(column) {
        if (!column) return '';

        const stats = [];

        // Common stats for all types
        stats.push(`
            <div class="stat-row">
                <span class="stat-label">Unique Values</span>
                <span class="stat-value">${(column.unique || 0).toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Missing Values</span>
                <span class="stat-value">${(column.missing || 0).toLocaleString()}</span>
            </div>
        `);

        // Type-specific stats
        if (column.stats) {
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
        }

        return stats.join('');
    }

    renderNumericStats(stats) {
        if (!stats) return '';

        return `
            <div class="stat-row">
                <span class="stat-label">Range</span>
                <span class="stat-value">${stats.min?.toLocaleString() || 0} - ${stats.max?.toLocaleString() || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Mean</span>
                <span class="stat-value">${(stats.mean || 0).toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Zero Values</span>
                <span class="stat-value">${stats.zeros || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Negative Values</span>
                <span class="stat-value">${stats.negative || 0}</span>
            </div>
        `;
    }

    renderStringStats(stats) {
        if (!stats) return '';

        const topValues = stats.topValues ? stats.topValues.map(({value, count}) => `
            <div class="top-value">
                <span class="value">${this.escapeHtml(String(value))}</span>
                <span class="count">(${count})</span>
            </div>
        `).join('') : '';

        return `
            <div class="stat-row">
                <span class="stat-label">Length Range</span>
                <span class="stat-value">${stats.minLength || 0} - ${stats.maxLength || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Length</span>
                <span class="stat-value">${(stats.avgLength || 0).toFixed(1)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Empty Strings</span>
                <span class="stat-value">${stats.empty || 0}</span>
            </div>
            ${topValues ? `
                <div class="stat-section">
                    <div class="stat-subtitle">Most Common Values</div>
                    <div class="top-values">
                        ${topValues}
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderDateStats(stats) {
        if (!stats) return '';

        return `
            <div class="stat-row">
                <span class="stat-label">Date Range</span>
                <span class="stat-value">
                    ${stats.earliest ? new Date(stats.earliest).toLocaleDateString() : 'N/A'} - 
                    ${stats.latest ? new Date(stats.latest).toLocaleDateString() : 'N/A'}
                </span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Time Span</span>
                <span class="stat-value">${this.formatTimespan(stats.range || 0)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Invalid Dates</span>
                <span class="stat-value">${stats.invalidDates || 0}</span>
            </div>
        `;
    }

    renderBooleanStats(stats) {
        if (!stats) return '';

        return `
            <div class="stat-row">
                <span class="stat-label">True Values</span>
                <span class="stat-value">${stats.trueCount || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">False Values</span>
                <span class="stat-value">${stats.falseCount || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">True Percentage</span>
                <span class="stat-value">${(stats.truePercentage || 0).toFixed(1)}%</span>
            </div>
        `;
    }

    renderMixedStats(stats) {
        if (!stats) return '';

        const typeDistribution = stats.typeDistribution ? Object.entries(stats.typeDistribution)
            .map(([type, count]) => `
                <div class="type-item">
                    <span class="type-name">${type}</span>
                    <span class="type-count">${count}</span>
                </div>
            `).join('') : '';

        return `
            <div class="stat-row">
                <span class="stat-label">Predominant Type</span>
                <span class="stat-value">${stats.predominantType || 'unknown'}</span>
            </div>
            ${typeDistribution ? `
                <div class="stat-section">
                    <div class="stat-subtitle">Type Distribution</div>
                    <div class="type-distribution">
                        ${typeDistribution}
                    </div>
                </div>
            ` : ''}
        `;
    }

    formatBytes(bytes) {
        if (!bytes || isNaN(bytes)) return '0 B';
        
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
        if (!ms || isNaN(ms)) return '0 days';

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
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
