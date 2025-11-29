/**
 * Material Design 3 Application Controller - Enhanced Version
 * Handles app initialization, layout management, and responsive navigation
 */
const App = {
    currentView: null,
    isMobile: false,

    /**
     * Initialize the application
     */
    init() {
        App.checkMobile();
        App.renderNavigationRail();
        App.renderBottomNavigation();
        App.setupMobileMenu();
        App.setupResponsiveListeners();
        
        // 初始化路由系统
        Views.initRouter();
        
        console.log("[App] Material Design 3 UI initialized (v2.0)");
    },

    /**
     * Check if current viewport is mobile
     */
    checkMobile() {
        App.isMobile = window.innerWidth < 768;
    },

    /**
     * Setup responsive listeners
     */
    setupResponsiveListeners() {
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const wasMobile = App.isMobile;
                App.checkMobile();
                
                // Only update if breakpoint crossed
                if (wasMobile !== App.isMobile) {
                    App.updateNavigation();
                }
            }, 100);
        });
    },

    /**
     * Setup mobile menu button (top app bar)
     * 绑定移动端顶部左侧三杠按钮，弹出导航菜单
     */
    setupMobileMenu() {
        const menuBtn = document.getElementById("mobile-menu-btn");
        if (!menuBtn) return;

        if (!AppConfig || !Array.isArray(AppConfig.navItems)) return;

        const items = AppConfig.navItems.map((item) => ({
            label: item.label,
            icon: item.icon,
            onClick: () => {
                App.navigateTo(item.id, item.label);
            }
        }));

        // 使用 MD3 菜单组件；UI.menu 内部会在点击时自动打开/关闭
        UI.menu(menuBtn, items, { position: "bottom-start" });
    },

    /**
     * Update navigation based on viewport
     */
    updateNavigation() {
        const navRail = document.getElementById("nav-rail");
        const bottomNav = document.getElementById("bottom-nav");
        
        if (App.isMobile) {
            if (navRail) navRail.style.display = "none";
            if (bottomNav) bottomNav.style.display = "flex";
        } else {
            if (navRail) navRail.style.display = "flex";
            if (bottomNav) bottomNav.style.display = "none";
        }
    },

    /**
     * Render MD3 Navigation Rail (Desktop)
     */
    renderNavigationRail() {
        const navItems = document.getElementById("nav-items");
        if (!navItems) {
            console.error("[App] Navigation items container not found");
            return;
        }

        navItems.innerHTML = "";

        AppConfig.navItems.forEach((item) => {
            const navItem = document.createElement("button");
            navItem.className = "nav-rail-item w-full h-14 rounded-md-lg flex flex-col items-center justify-center gap-1 text-md-on-surface-variant hover:bg-md-on-surface/8 transition-all md-state-layer";
            navItem.dataset.id = item.id;
            navItem.setAttribute("data-tooltip", item.label);
            
            const icon = UI.icon(item.icon, "text-2xl");
            const label = document.createElement("span");
            label.className = "text-label-small";
            label.textContent = item.label.split(" ")[0];
            
            navItem.appendChild(icon);
            navItem.appendChild(label);
            
            navItem.onclick = () => {
                App.navigateTo(item.id, item.label);
            };
            
            navItems.appendChild(navItem);
        });

        App.setActiveNavItem("dashboard");
    },

    /**
     * Render MD3 Bottom Navigation (Mobile)
     */
    renderBottomNavigation() {
        const bottomNav = document.getElementById("bottom-nav");
        if (!bottomNav) {
            console.error("[App] Bottom navigation container not found");
            return;
        }

        bottomNav.innerHTML = "";

        const totalItems = AppConfig.navItems.length;
        
        // If 5 or fewer items, show all; otherwise show first 4 + "more" menu
        if (totalItems <= 5) {
            AppConfig.navItems.forEach((item) => {
                bottomNav.appendChild(App._createBottomNavItem(item));
            });
        } else {
            // Show first 4 items
            const visibleItems = AppConfig.navItems.slice(0, 4);
            const moreItems = AppConfig.navItems.slice(4);

            visibleItems.forEach((item) => {
                bottomNav.appendChild(App._createBottomNavItem(item));
            });

            // Add "More" button with menu
            const moreBtn = document.createElement("button");
            moreBtn.className = "bottom-nav-item flex-1 flex flex-col items-center justify-center gap-1 py-3 text-md-on-surface-variant hover:bg-md-on-surface/8 transition-all md-state-layer rounded-md-lg mx-1";
            moreBtn.dataset.id = "more";
            
            const iconContainer = document.createElement("div");
            iconContainer.className = "icon-container w-16 h-8 rounded-md-full flex items-center justify-center transition-all";
            iconContainer.appendChild(UI.icon("more_horiz", "text-2xl"));
            
            const label = document.createElement("span");
            label.className = "text-label-small mt-1";
            label.textContent = "更多";
            
            moreBtn.appendChild(iconContainer);
            moreBtn.appendChild(label);
            
            // Create menu items for the "more" button
            const menuItems = moreItems.map((item) => ({
                label: item.label,
                icon: item.icon,
                onClick: () => {
                    App.navigateTo(item.id, item.label);
                }
            }));
            
            // Setup menu
            UI.menu(moreBtn, menuItems, { position: "top-end" });
            
            bottomNav.appendChild(moreBtn);
        }

        App.setActiveBottomNavItem("dashboard");
    },

    /**
     * Create a bottom navigation item
     * @private
     */
    _createBottomNavItem(item) {
        const navItem = document.createElement("button");
        navItem.className = "bottom-nav-item flex-1 flex flex-col items-center justify-center gap-1 py-3 text-md-on-surface-variant hover:bg-md-on-surface/8 transition-all md-state-layer rounded-md-lg mx-1";
        navItem.dataset.id = item.id;
        
        // Icon container with pill background for active state
        const iconContainer = document.createElement("div");
        iconContainer.className = "icon-container w-16 h-8 rounded-md-full flex items-center justify-center transition-all";
        iconContainer.appendChild(UI.icon(item.icon, "text-2xl"));
        
        const label = document.createElement("span");
        label.className = "text-label-small mt-1";
        label.textContent = item.label.split(" ")[0];
        
        navItem.appendChild(iconContainer);
        navItem.appendChild(label);
        
        navItem.onclick = () => {
            App.navigateTo(item.id, item.label);
        };
        
        return navItem;
    },

    /**
     * Navigate to a view (使用 URL 路由)
     */
    navigateTo(viewId, label) {
        // 使用 Views 的路由系统进行导航
        Views.navigateTo(viewId);
    },

    /**
     * Set active navigation item (Desktop Rail)
     */
    setActiveNavItem(itemId) {
        document.querySelectorAll(".nav-rail-item").forEach((el) => {
            if (el.dataset.id === itemId) {
                el.classList.add("active", "bg-md-primary-container", "text-md-on-primary-container");
                el.classList.remove("text-md-on-surface-variant");
                const icon = el.querySelector(".material-symbols-outlined");
                if (icon) {
                    icon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
                }
            } else {
                el.classList.remove("active", "bg-md-primary-container", "text-md-on-primary-container");
                el.classList.add("text-md-on-surface-variant");
                const icon = el.querySelector(".material-symbols-outlined");
                if (icon) {
                    icon.style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
                }
            }
        });
    },

    /**
     * Set active bottom navigation item (Mobile)
     */
    setActiveBottomNavItem(itemId) {
        // Check if the item is in the "more" menu (items after index 3 when total > 5)
        const totalItems = AppConfig.navItems.length;
        const moreItemIds = totalItems > 5 ? AppConfig.navItems.slice(4).map(item => item.id) : [];
        const isInMoreMenu = moreItemIds.includes(itemId);
        
        document.querySelectorAll(".bottom-nav-item").forEach((el) => {
            const iconContainer = el.querySelector(".icon-container");
            const elId = el.dataset.id;
            
            // Highlight "more" button if the active item is in the more menu
            const shouldHighlight = (elId === itemId) || (elId === "more" && isInMoreMenu);
            
            if (shouldHighlight) {
                el.classList.add("text-md-on-primary-container");
                el.classList.remove("text-md-on-surface-variant");
                if (iconContainer) {
                    iconContainer.classList.add("bg-md-primary-container");
                }
                const icon = el.querySelector(".material-symbols-outlined");
                if (icon) {
                    icon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
                }
            } else {
                el.classList.remove("text-md-on-primary-container");
                el.classList.add("text-md-on-surface-variant");
                if (iconContainer) {
                    iconContainer.classList.remove("bg-md-primary-container");
                }
                const icon = el.querySelector(".material-symbols-outlined");
                if (icon) {
                    icon.style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
                }
            }
        });
    },

    /**
     * Update Top App Bar title and actions
     */
    updateTopAppBar(title) {
        const topAppBar = document.getElementById("top-app-bar");
        if (!topAppBar) return;

        const titleEl = topAppBar.querySelector("h1");
        if (titleEl) {
            titleEl.textContent = title;
        }

        const balanceChip = topAppBar.querySelector(".bg-md-secondary-container");
        if (balanceChip && AppConfig.currentUser) {
            balanceChip.textContent = `Balance: ¥${AppConfig.currentUser.balance}`;
        }
    },

    /**
     * Show a success message
     */
    showSuccess(message) {
        UI.snackbar(message, "关闭", null, { variant: "success" });
    },

    /**
     * Show an error message
     */
    showError(message) {
        UI.snackbar(message, "重试", null, { variant: "error" });
    },

    /**
     * Show a loading state in content viewport
     */
    showLoading() {
        const viewport = document.getElementById("content-viewport");
        if (!viewport) return;
        
        viewport.innerHTML = "";
        viewport.appendChild(UI.spinner());
    },

    /**
     * Clear content viewport
     */
    clearContent() {
        const viewport = document.getElementById("content-viewport");
        if (viewport) {
            viewport.innerHTML = "";
        }
    }
};

/**
 * Initialize app when DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
    App.init();
});