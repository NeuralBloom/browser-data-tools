// src/tools/stats/calculator.js

export class StatisticalCalculator {
    constructor() {
        this.data = [];
        this.sortedData = [];
        this.descriptiveStats = null;
        this.distributionStats = null;
        this.correlationStats = null;
    }

    setData(numbers) {
        if (!Array.isArray(numbers)) {
            throw new Error('Input must be an array of numbers');
        }

        this.data = numbers.filter(n => typeof n === 'number' && !isNaN(n));
        this.sortedData = [...this.data].sort((a, b) => a - b);
        
        // Reset cached calculations
        this.descriptiveStats = null;
        this.distributionStats = null;
        this.correlationStats = null;

        return this;
    }

    calculate() {
        return {
            descriptive: this.calculateDescriptiveStats(),
            distribution: this.calculateDistributionStats(),
            correlation: this.calculateCorrelationStats()
        };
    }

    calculateDescriptiveStats() {
        if (this.descriptiveStats) return this.descriptiveStats;
        
        const n = this.data.length;
        if (n === 0) return null;

        const sum = this.data.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        // Calculate variance and standard deviation
        const squaredDiffs = this.data.map(x => Math.pow(x - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(variance);

        // Calculate quartiles
        const q1 = this.calculatePercentile(25);
        const median = this.calculatePercentile(50);
        const q3 = this.calculatePercentile(75);
        
        this.descriptiveStats = {
            count: n,
            sum,
            mean,
            median,
            mode: this.calculateMode(),
            variance,
            stdDev,
            min: this.sortedData[0],
            max: this.sortedData[n - 1],
            range: this.sortedData[n - 1] - this.sortedData[0],
            quartiles: {
                q1,
                q2: median,
                q3
            },
            iqr: q3 - q1,
            coefficientOfVariation: (stdDev / mean) * 100
        };

        return this.descriptiveStats;
    }

    calculateDistributionStats() {
        if (this.distributionStats) return this.distributionStats;
        
        const { mean, stdDev } = this.calculateDescriptiveStats();
        
        // Calculate skewness
        const cubedZScores = this.data.map(x => Math.pow((x - mean) / stdDev, 3));
        const skewness = cubedZScores.reduce((a, b) => a + b, 0) / this.data.length;
        
        // Calculate kurtosis
        const fourthZScores = this.data.map(x => Math.pow((x - mean) / stdDev, 4));
        const kurtosis = fourthZScores.reduce((a, b) => a + b, 0) / this.data.length;
        
        // Calculate normality tests
        const normalityTests = {
            shapiroWilk: this.shapiroWilkTest(),
            jarqueBera: this.jarqueBeraTest(skewness, kurtosis)
        };
        
        this.distributionStats = {
            skewness,
            kurtosis,
            isNormal: Math.abs(skewness) < 0.5 && Math.abs(kurtosis - 3) < 0.5,
            normalityTests,
            histogram: this.calculateHistogram(),
            densityEstimation: this.calculateKernelDensity()
        };

        return this.distributionStats;
    }

    calculateCorrelationStats() {
        if (this.correlationStats) return this.correlationStats;
        
        const n = this.data.length;
        if (n < 2) return null;

        // Calculate autocorrelation
        const autocorrelations = [];
        for (let lag = 1; lag <= Math.min(10, Math.floor(n / 3)); lag++) {
            autocorrelations.push(this.calculateAutocorrelation(lag));
        }

        // Calculate runs test for randomness
        const runsTest = this.calculateRunsTest();

        this.correlationStats = {
            autocorrelation: autocorrelations,
            runsTest,
            trend: this.calculateTrendAnalysis()
        };

        return this.correlationStats;
    }

    // Helper methods for calculations
    calculatePercentile(percentile) {
        const index = (percentile / 100) * (this.sortedData.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        
        if (upper === lower) return this.sortedData[index];
        return (1 - weight) * this.sortedData[lower] + weight * this.sortedData[upper];
    }

    calculateMode() {
        const counts = new Map();
        let maxCount = 0;
        let modes = [];

        for (const value of this.data) {
            const count = (counts.get(value) || 0) + 1;
            counts.set(value, count);

            if (count > maxCount) {
                maxCount = count;
                modes = [value];
            } else if (count === maxCount) {
                modes.push(value);
            }
        }

        return modes;
    }

    calculateHistogram(bins = 'sturges') {
        const n = this.data.length;
        let numBins;

        // Calculate number of bins using different rules
        switch (bins) {
            case 'sturges':
                numBins = Math.ceil(Math.log2(n) + 1);
                break;
            case 'rice':
                numBins = Math.ceil(2 * Math.pow(n, 1/3));
                break;
            case 'sqrt':
                numBins = Math.ceil(Math.sqrt(n));
                break;
            default:
                numBins = typeof bins === 'number' ? bins : Math.ceil(Math.log2(n) + 1);
        }

        const { min, max } = this.calculateDescriptiveStats();
        const binWidth = (max - min) / numBins;
        const histogram = new Array(numBins).fill(0);
        const binEdges = Array.from({ length: numBins + 1 }, (_, i) => min + i * binWidth);

        this.data.forEach(value => {
            const binIndex = Math.min(
                Math.floor((value - min) / binWidth),
                numBins - 1
            );
            histogram[binIndex]++;
        });

        return {
            counts: histogram,
            binEdges,
            binWidth
        };
    }

    calculateKernelDensity(bandwidth = 'silverman') {
        const n = this.data.length;
        const { stdDev } = this.calculateDescriptiveStats();

        // Calculate bandwidth using Silverman's rule of thumb
        const h = bandwidth === 'silverman'
            ? 1.06 * stdDev * Math.pow(n, -0.2)
            : bandwidth;

        // Generate points for the density estimation
        const points = 100;
        const { min, max } = this.calculateDescriptiveStats();
        const x = Array.from({ length: points }, (_, i) => 
            min + (i / (points - 1)) * (max - min)
        );

        // Calculate density estimation using Gaussian kernel
        const density = x.map(xi => {
            const kernelSum = this.data.reduce((sum, value) => {
                const z = (xi - value) / h;
                return sum + Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
            }, 0);
            return kernelSum / (n * h);
        });

        return { x, density };
    }

    shapiroWilkTest() {
        // Simplified implementation of Shapiro-Wilk test
        const n = this.data.length;
        if (n < 3 || n > 5000) return null;

        const mean = this.calculateDescriptiveStats().mean;
        const centeredData = this.data.map(x => x - mean);
        
        // Calculate W statistic
        const denominator = centeredData.reduce((sum, x) => sum + x * x, 0);
        const sortedCentered = [...centeredData].sort((a, b) => a - b);
        
        let numerator = 0;
        for (let i = 0; i < Math.floor(n/2); i++) {
            const weight = 1 / Math.sqrt(2);  // Simplified weights
            numerator += weight * (sortedCentered[n-1-i] - sortedCentered[i]);
        }
        
        const W = (numerator * numerator) / denominator;
        
        return {
            statistic: W,
            significant: W < 0.95  // Simplified critical value
        };
    }

    jarqueBeraTest(skewness, kurtosis) {
        const n = this.data.length;
        const JB = (n/6) * (Math.pow(skewness, 2) + Math.pow(kurtosis - 3, 2)/4);
        const pValue = 1 - this.chiSquareCDF(JB, 2);
        
        return {
            statistic: JB,
            pValue,
            significant: pValue < 0.05
        };
    }

    calculateAutocorrelation(lag) {
        const { mean } = this.calculateDescriptiveStats();
        const n = this.data.length;
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n - lag; i++) {
            numerator += (this.data[i] - mean) * (this.data[i + lag] - mean);
        }
        
        for (let i = 0; i < n; i++) {
            denominator += Math.pow(this.data[i] - mean, 2);
        }
        
        return numerator / denominator;
    }

    calculateRunsTest() {
        const { mean } = this.calculateDescriptiveStats();
        const signs = this.data.map(x => x > mean ? 1 : 0);
        let runs = 1;
        
        for (let i = 1; i < signs.length; i++) {
            if (signs[i] !== signs[i-1]) runs++;
        }
        
        const n1 = signs.filter(x => x === 1).length;
        const n2 = signs.filter(x => x === 0).length;
        
        const expectedRuns = ((2 * n1 * n2) / (n1 + n2)) + 1;
        const variance = (2 * n1 * n2 * (2 * n1 * n2 - n1 - n2)) / 
                        (Math.pow(n1 + n2, 2) * (n1 + n2 - 1));
        
        const zScore = (runs - expectedRuns) / Math.sqrt(variance);
        
        return {
            runs,
            expectedRuns,
            zScore,
            isRandom: Math.abs(zScore) < 1.96
        };
    }

    calculateTrendAnalysis() {
        const n = this.data.length;
        const xMean = (n - 1) / 2;
        const { mean: yMean } = this.calculateDescriptiveStats();
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (this.data[i] - yMean);
            denominator += Math.pow(i - xMean, 2);
        }
        
        const slope = numerator / denominator;
        const intercept = yMean - slope * xMean;
        
        return {
            slope,
            intercept,
            trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
            strength: Math.abs(slope)
        };
    }

    chiSquareCDF(x, df) {
        // Simplified implementation of chi-square CDF using Wilson-Hilferty approximation
        if (x <= 0) return 0;
        const z = Math.pow((x/df), 1/3) - (1 - 2/(9*df));
        return this.normalCDF(z * Math.sqrt(9*df/2));
    }

    normalCDF(x) {
        // Approximation of normal CDF using error function
        return 0.5 * (1 + this.erf(x/Math.sqrt(2)));
    }

    erf(x) {
        // Approximation of error function
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const t = 1.0/(1.0 + p*x);
        const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
        return sign*y;
    }
}
