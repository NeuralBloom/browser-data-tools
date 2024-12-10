# Browser Data Tools API Documentation

## Table of Contents
1. [CSV Analyzer](#csv-analyzer-api)
2. [JSON Explorer](#json-explorer-api)
3. [Time Series Visualizer](#time-series-visualizer-api)
4. [Statistical Calculator](#statistical-calculator-api)
5. [Utility Functions](#utility-functions)
6. [Web Workers](#web-workers)
7. [Error Handling](#error-handling)

## CSV Analyzer API

### CSVAnalyzer Class

```javascript
const analyzer = new CSVAnalyzer();
```

#### Methods

##### analyze(file)
Analyzes a CSV file and returns detailed statistics.

```javascript
const results = await analyzer.analyze(file);
```

Parameters:
- `file`: File object containing CSV data

Returns:
```javascript
{
    summary: {
        rowCount: number,
        columnCount: number,
        missingValues: number,
        completeRows: number
    },
    columns: {
        [columnName]: {
            type: string,
            uniqueValues: number,
            missingValues: number,
            // Type-specific statistics
        }
    }
}
```

##### generateReport()
Generates a detailed report of the analysis.

```javascript
const report = analyzer.generateReport();
```

Returns: HTML string containing formatted report

##### exportResults(format)
Exports analysis results in various formats.

```javascript
const exported = await analyzer.exportResults('json');
```

Parameters:
- `format`: String ('json', 'csv', 'html')

## JSON Explorer API

### JSONExplorer Class

```javascript
const explorer = new JSONExplorer();
```

#### Methods

##### analyze(jsonString)
Analyzes a JSON string and returns structure information.

```javascript
const structure = explorer.analyze(jsonString);
```

Parameters:
- `jsonString`: String containing valid JSON data

Returns:
```javascript
{
    structure: object,
    paths: string[],
    stats: {
        totalKeys: number,
        maxDepth: number,
        arrayCount: number,
        valueTypes: object
    }
}
```

##### findPaths(query)
Finds all paths matching a specific query.

```javascript
const paths = explorer.findPaths('user.address');
```

Parameters:
- `query`: String (dot notation path)

Returns: Array of matching paths

##### flatten()
Flattens nested JSON structure.

```javascript
const flattened = explorer.flatten();
```

## Time Series Visualizer API

### TimeSeriesVisualizer Class

```javascript
const visualizer = new TimeSeriesVisualizer(canvas);
```

#### Methods

##### setData(timeseriesData)
Sets the data for visualization.

```javascript
visualizer.setData([
    { date: '2024-01-01', value: 100 },
    { date: '2024-01-02', value: 150 }
]);
```

Parameters:
- `timeseriesData`: Array of objects with date and value properties

##### render(options)
Renders the visualization.

```javascript
visualizer.render({
    type: 'line',
    showPoints: true,
    smoothing: 0.5
});
```

Parameters:
- `options`: Object containing rendering options
  - `type`: String ('line', 'bar', 'area')
  - `showPoints`: Boolean
  - `smoothing`: Number (0-1)

##### analyze()
Performs time series analysis.

```javascript
const analysis = visualizer.analyze();
```

Returns:
```javascript
{
    trend: {
        direction: string,
        strength: number
    },
    seasonality: {
        detected: boolean,
        period: number
    },
    outliers: Array<{
        date: string,
        value: number,
        zscore: number
    }>
}
```

## Statistical Calculator API

### StatisticalCalculator Class

```javascript
const calculator = new StatisticalCalculator();
```

#### Methods

##### setData(numbers)
Sets the data for statistical analysis.

```javascript
calculator.setData([1, 2, 3, 4, 5]);
```

Parameters:
- `numbers`: Array of numbers

##### calculate()
Performs statistical calculations.

```javascript
const stats = calculator.calculate();
```

Returns:
```javascript
{
    descriptive: {
        mean: number,
        median: number,
        mode: number[],
        stdDev: number,
        variance: number,
        range: number,
        quartiles: number[],
        iqr: number
    },
    distribution: {
        skewness: number,
        kurtosis: number,
        isNormal: boolean
    },
    correlation: {
        autocorrelation: number,
        lag1: number
    }
}
```

##### testHypothesis(type, params)
Performs statistical hypothesis testing.

```javascript
const result = calculator.testHypothesis('ttest', {
    mu0: 0,
    alpha: 0.05
});
```

Parameters:
- `type`: String ('ttest', 'chi-square', 'anova')
- `params`: Object containing test parameters

Returns:
```javascript
{
    testType: string,
    statistic: number,
    pValue: number,
    rejected: boolean,
    confidence: {
        level: number,
        interval: [number, number]
    }
}
```

## Utility Functions

### FileHandler

```javascript
import { FileHandler } from './utils/file-handler.js';
```

#### Methods

##### static async readFile(file)
Reads a file and returns its contents.

##### static async validateCSV(content)
Validates CSV content structure.

##### static getFileExtension(filename)
Returns the file extension.

##### static formatBytes(bytes)
Formats byte size to human-readable string.

### Visualization

```javascript
import { Visualization } from './utils/visualization.js';
```

#### Methods

##### static createTable(data, options)
Creates an HTML table from data.

##### static createChart(container, data, type)
Creates a chart visualization.

##### static createSummaryCard(title, content)
Creates a summary card element.

##### static loading(container, message)
Creates a loading indicator.

## Web Workers

### CSV Worker

```javascript
// Initialize worker
const worker = new Worker('workers/csv-worker.js');

// Send command
worker.postMessage({
    command: 'parse',
    file: file,
    options: {
        header: true,
        dynamicTyping: true
    }
});

// Receive results
worker.onmessage = function(e) {
    const { type, data, error } = e.data;
    // Handle results
};
```

Available commands:
- `parse`: Parses CSV file
- `analyze`: Analyzes CSV data

### Statistics Worker

```javascript
const worker = new Worker('workers/stats-worker.js');
```

Available commands:
- `calculate`: Performs statistical calculations
- `hypothesis`: Runs hypothesis tests

## Error Handling

### Error Types

```javascript
class DataToolsError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
```

Common error codes:
- `INVALID_FILE`: Invalid file format
- `PARSE_ERROR`: Error parsing data
- `CALCULATION_ERROR`: Error in calculations
- `VISUALIZATION_ERROR`: Error creating visualization

### Error Handling Example

```javascript
try {
    const results = await analyzer.analyze(file);
} catch (error) {
    if (error instanceof DataToolsError) {
        console.error(`Error ${error.code}: ${error.message}`);
    } else {
        console.error('Unexpected error:', error);
    }
}
```

## TypeScript Support

Type definitions are available for all classes and methods. Import types:

```typescript
import { 
    CSVAnalyzer, 
    JSONExplorer,
    TimeSeriesVisualizer,
    StatisticalCalculator
} from 'browser-data-tools';
```

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Performance Considerations

- Files larger than 50MB are automatically processed in chunks
- Web Workers are used for CPU-intensive operations
- Memory usage is optimized for large datasets
- Visualizations are rendered with canvas for better performance

## Best Practices

1. Always check file size before processing
2. Use workers for large datasets
3. Implement error handling
4. Clean up resources after use
5. Consider browser memory limitations

## Examples

Complete examples are available in the `/examples` directory of the repository.

---

For updates and more information, visit the [GitHub repository](https://github.com/yourusername/browser-data-tools).
