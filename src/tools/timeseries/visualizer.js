// src/tools/timeseries/visualizer.js

class TimeSeriesVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = [];
        this.options = {
            padding: 40,
            pointRadius: 3,
            lineWidth: 2,
            gridLines: true,
            smoothing: 0.2,
            annotations: true,
            autoScale: true,
            showLegend: true
        };
        this.colors = {
            line: '#2563eb',
            point: '#1d4ed8',
            grid: '#e5e7eb',
            text: '#374151',
            background: '#ffffff',
            trend: '#ef4444',
            annotation: '#84cc16'
        };
        this.trendline = null;
        this.annotations = [];
    }

    setData(timeseriesData) {
        this.data = timeseriesData
            .map(d => ({
                date: new Date(d.date),
                value: Number(d.value)
            }))
            .sort((a, b) => a.date - b.date);
        
        this.calculateBounds();
        if (this.options.autoScale) {
            this.calculateTrendline();
        }
        return this;
    }

    calculateBounds() {
        const values = this.data.map(d => d.value);
        this.bounds = {
            minDate: new Date(Math.min(...this.data.map(d => d.date))),
            maxDate: new Date(Math.max(...this.data.map(d => d.date))),
            minValue: Math.min(...values),
            maxValue: Math.max(...values),
            valueRange: Math.max(...values) - Math.min(...values)
        };

        // Add padding to value range
        const padding = this.bounds.valueRange * 0.1;
        this.bounds.minValue -= padding;
        this.bounds.maxValue += padding;
        this.bounds.valueRange += padding * 2;
    }

    calculateTrendline() {
        const xValues = this.data.map(d => d.date.getTime());
        const yValues = this.data.map(d => d.value);
        const n = xValues.length;

        const xMean = xValues.reduce((a, b) => a + b, 0) / n;
        const yMean = yValues.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
            denominator += Math.pow(xValues[i] - xMean, 2);
        }

        const slope = numerator / denominator;
        const intercept = yMean - slope * xMean;

        this.trendline = { slope, intercept };
    }

    scaleX(date) {
        const { width } = this.canvas;
        const { padding } = this.options;
        const timeRange = this.bounds.maxDate - this.bounds.minDate;
        
        return padding + (width - 2 * padding) * 
               (date - this.bounds.minDate) / timeRange;
    }

    scaleY(value) {
        const { height } = this.canvas;
        const { padding } = this.options;
        
        return height - padding - (height - 2 * padding) * 
               (value - this.bounds.minValue) / this.bounds.valueRange;
    }

    addAnnotation(date, text) {
        this.annotations.push({ date: new Date(date), text });
        return this;
    }

    clearAnnotations() {
        this.annotations = [];
        return this;
    }

    render() {
        const { width, height } = this.canvas;
        const { padding } = this.options;

        // Clear canvas
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, width, height);

        // Draw grid
        if (this.options.gridLines) {
            this.drawGrid();
        }

        // Draw axes
        this.drawAxes();

        // Draw trend line if calculated
        if (this.trendline && this.options.autoScale) {
            this.drawTrendline();
        }

        // Draw data
        this.drawData();

        // Draw annotations if enabled
        if (this.options.annotations && this.annotations.length > 0) {
            this.drawAnnotations();
        }

        // Draw legend if enabled
        if (this.options.showLegend) {
            this.drawLegend();
        }

        return this;
    }

    drawGrid() {
        const { width, height } = this.canvas;
        const { padding } = this.options;

        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 0.5;

        // Vertical grid lines (dates)
        const dateStep = (this.bounds.maxDate - this.bounds.minDate) / 10;
        for (let i = 0; i <= 10; i++) {
            const date = new Date(this.bounds.minDate.getTime() + dateStep * i);
            const x = this.scaleX(date);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding);
            this.ctx.lineTo(x, height - padding);
            this.ctx.stroke();
        }

        // Horizontal grid lines (values)
        const valueStep = this.bounds.valueRange / 8;
        for (let i = 0; i <= 8; i++) {
            const value = this.bounds.minValue + valueStep * i;
            const y = this.scaleY(value);
            
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(width - padding, y);
            this.ctx.stroke();
        }
    }

    drawTrendline() {
        const startX = this.bounds.minDate.getTime();
        const endX = this.bounds.maxDate.getTime();
        
        const startY = this.trendline.slope * startX + this.trendline.intercept;
        const endY = this.trendline.slope * endX + this.trendline.intercept;

        this.ctx.strokeStyle = this.colors.trend;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.scaleX(new Date(startX)), this.scaleY(startY));
        this.ctx.lineTo(this.scaleX(new Date(endX)), this.scaleY(endY));
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    drawAnnotations() {
        this.ctx.fillStyle = this.colors.annotation;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        
        this.annotations.forEach(({ date, text }) => {
            const x = this.scaleX(date);
            const dataPoint = this.data.find(d => d.date.getTime() === date.getTime());
            const y = dataPoint ? this.scaleY(dataPoint.value) : this.canvas.height / 2;
            
            // Draw annotation marker
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - 10);
            this.ctx.lineTo(x - 5, y - 20);
            this.ctx.lineTo(x + 5, y - 20);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw annotation text
            this.ctx.fillText(text, x, y - 25);
        });
    }

    drawLegend() {
        const legendItems = [
            { color: this.colors.line, label: 'Data Points' }
        ];
        
        if (this.trendline) {
            legendItems.push({ color: this.colors.trend, label: 'Trend Line' });
        }
        
        const legendX = this.canvas.width - this.options.padding - 100;
        const legendY = this.options.padding;
        
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        legendItems.forEach((item, index) => {
            const y = legendY + (index * 20);
            
            // Draw color box
            this.ctx.fillStyle = item.color;
            this.ctx.fillRect(legendX, y - 5, 10, 10);
            
            // Draw label
            this.ctx.fillStyle = this.colors.text;
            this.ctx.fillText(item.label, legendX + 15, y);
        });
    }

    exportImage(type = 'png') {
        return this.canvas.toDataURL(`image/${type}`);
    }

    analyze() {
        const values = this.data.map(d => d.value);
        const dates = this.data.map(d => d.date.getTime());
        
        // Calculate basic statistics
        const stats = {
            mean: values.reduce((a, b) => a + b) / values.length,
            min: Math.min(...values),
            max: Math.max(...values)
        };
        
        // Calculate moving average
        const movingAverage = [];
        const window = Math.min(5, Math.floor(values.length / 3));
        
        for (let i = window - 1; i < values.length; i++) {
            const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b);
            movingAverage.push(sum / window);
        }
        
        // Detect trend
        const trend = {
            direction: this.trendline.slope > 0 ? 'increasing' : 'decreasing',
            strength: Math.abs(this.trendline.slope)
        };
        
        // Detect seasonality (simple method)
        const diffs = [];
        for (let i = 1; i < dates.length; i++) {
            diffs.push(dates[i] - dates[i-1]);
        }
        
        const avgDiff = diffs.reduce((a, b) => a + b) / diffs.length;
        const seasonality = {
            detected: diffs.every(d => Math.abs(d - avgDiff) < avgDiff * 0.1),
            period: avgDiff
        };
        
        return {
            stats,
            trend,
            seasonality,
            movingAverage
        };
    }
}
