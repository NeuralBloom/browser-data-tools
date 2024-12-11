// src/utils/navigation.js

class NavigationController {
    constructor() {
        this.tools = ['csv', 'json', 'timeseries'];
        this.currentTool = null;
        this.initializeNavigation();
    }

    initializeNavigation() {
        // Set up navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tool = link.getAttribute('data-tool');
                this.switchTool(tool);
            });
        });

        // Handle initial tool selection
        const initialTool = this.getInitialTool();
        this.switchTool(initialTool);

        // Set up hash change listener
        window.addEventListener('hashchange', () => {
            const tool = this.getToolFromHash();
            if (tool && tool !== this.currentTool) {
                this.switchTool(tool);
            }
        });
    }

    getInitialTool() {
        // Check URL hash first
        const hashTool = this.getToolFromHash();
        if (hashTool) return hashTool;

        // Default to first tool
        return this.tools[0];
    }

    getToolFromHash() {
        const hash = window.location.hash.slice(1);
        return this.tools.includes(hash) ? hash : null;
    }

    switchTool(tool) {
        if (!this.tools.includes(tool)) return;

        // Update navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            const isActive = link.getAttribute('data-tool') === tool;
            link.classList.toggle('active', isActive);
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
        });

        // Update tool sections
        document.querySelectorAll('.tool-section').forEach(section => {
            // Using display style directly instead of classes
            section.style.display = section.id === `${tool}-tool` ? 'block' : 'none';
        });

        // Update URL hash
        if (window.location.hash !== `#${tool}`) {
            window.location.hash = tool;
        }
        
        this.currentTool = tool;

        // Dispatch event for tool change
        window.dispatchEvent(new CustomEvent('toolChange', { 
            detail: { tool, previous: this.currentTool } 
        }));

        // Log for debugging
        console.log(`Switched to ${tool} tool`);
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigationController = new NavigationController();
});
