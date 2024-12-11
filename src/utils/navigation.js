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

        // Check localStorage for last used tool
        const savedTool = localStorage.getItem('lastUsedTool');
        if (savedTool && this.tools.includes(savedTool)) return savedTool;

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
            if (link.getAttribute('data-tool') === tool) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update tool sections
        document.querySelectorAll('.tool-section').forEach(section => {
            if (section.id === `${tool}-tool`) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });

        // Update URL hash and localStorage
        window.location.hash = tool;
        localStorage.setItem('lastUsedTool', tool);
        this.currentTool = tool;

        // Dispatch event for tool change
        window.dispatchEvent(new CustomEvent('toolChange', { detail: { tool } }));
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigationController = new NavigationController();
});
