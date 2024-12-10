// src/utils/visualization.js

export class Visualization {
    static createTable(data, options = {}) {
        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';
        
        // Create header
        const thead = document.createElement('thead');
        thead.className = 'bg-gray-50';
        const headerRow = document.createElement('tr');
        
        Object.keys(data[0]).forEach(key => {
            const th = document.createElement('th');
            th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
            th.textContent = key;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        tbody.className = 'bg-white divide-y divide-gray-200';
        
        data.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.className = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            
            Object.values(row).forEach(value => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
                td.textContent = value;
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        return table;
    }

    static createChart(container, data, type = 'bar') {
        // Placeholder for chart creation
        // In a real implementation, we would use a charting library
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        
        // This is where we would initialize the chart
        // For now, we'll just add a placeholder message
        const placeholder = document.createElement('div');
        placeholder.className = 'text-center p-4 text-gray-500';
        placeholder.textContent = 'Chart visualization coming soon';
        container.appendChild(placeholder);
    }

    static createSummaryCard(title, content) {
        const card = document.createElement('div');
        card.className = 'bg-white overflow-hidden shadow rounded-lg';
        
        const cardBody = document.createElement('div');
        cardBody.className = 'px-4 py-5 sm:p-6';
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'text-lg leading-6 font-medium text-gray-900';
        titleEl.textContent = title;
        
        const contentEl = document.createElement('div');
        contentEl.className = 'mt-2 max-w-xl text-sm text-gray-500';
        contentEl.innerHTML = content;
        
        cardBody.appendChild(titleEl);
        cardBody.appendChild(contentEl);
        card.appendChild(cardBody);
        
        return card;
    }

    static loading(container, message = 'Processing...') {
        const loader = document.createElement('div');
        loader.className = 'flex items-center justify-center p-4';
        loader.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-gray-600">${message}</span>
        `;
        container.appendChild(loader);
        return loader;
    }
}
