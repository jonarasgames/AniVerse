/* js/theme.js - Theme initialization (must load BEFORE DOMContentLoaded) */
(function() {
    'use strict';
    
    function initTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('aniverse_theme');
        
        let theme = savedTheme || (prefersDark ? 'theme-dark' : 'theme-light');
        
        // Apply theme immediately
        document.documentElement.classList.remove('theme-dark', 'theme-light');
        document.documentElement.classList.add(theme);
        
        // Also add to body for compatibility
        document.body.classList.remove('dark-mode', 'light-mode');
        if (theme === 'theme-dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.add('light-mode');
        }
        
        console.log('Theme initialized:', theme);
        
        // Listen for system preference changes
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem('aniverse_theme')) {
                const newTheme = e.matches ? 'theme-dark' : 'theme-light';
                document.documentElement.classList.remove('theme-dark', 'theme-light');
                document.documentElement.classList.add(newTheme);
                
                document.body.classList.remove('dark-mode', 'light-mode');
                if (newTheme === 'theme-dark') {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.add('light-mode');
                }
                
                console.log('System theme changed:', newTheme);
            }
        });
    }
    
    // Toggle theme function
    function toggleTheme() {
        const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light';
        const newTheme = currentTheme === 'theme-dark' ? 'theme-light' : 'theme-dark';
        
        document.documentElement.classList.remove('theme-dark', 'theme-light');
        document.documentElement.classList.add(newTheme);
        
        document.body.classList.remove('dark-mode', 'light-mode');
        if (newTheme === 'theme-dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.add('light-mode');
        }
        
        localStorage.setItem('aniverse_theme', newTheme);
        console.log('Theme toggled to:', newTheme);
        
        // Update icon
        const icon = document.querySelector('#dark-mode-toggle i');
        if (icon) {
            icon.className = newTheme === 'theme-dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        return newTheme;
    }
    
    // Execute immediately
    initTheme();
    
    // Bind toggle button when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const toggleBtn = document.getElementById('dark-mode-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', toggleTheme);
                
                // Set initial icon
                const icon = toggleBtn.querySelector('i');
                const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light';
                if (icon) {
                    icon.className = currentTheme === 'theme-dark' ? 'fas fa-sun' : 'fas fa-moon';
                }
            }
        });
    } else {
        const toggleBtn = document.getElementById('dark-mode-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
            
            const icon = toggleBtn.querySelector('i');
            const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light';
            if (icon) {
                icon.className = currentTheme === 'theme-dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }
    
    // Export
    window.toggleTheme = toggleTheme;
})();
