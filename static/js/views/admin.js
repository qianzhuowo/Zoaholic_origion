/**
 * Admin View - API Key Management
 * 管理视图 - API 密钥管理
 */
const AdminView = {
    /**
     * Render admin view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        container.appendChild(UI.el("h2", "text-display-small text-md-on-surface mb-6", "API 密钥管理"));

        const card = UI.card("outlined", "p-8 text-center");
        card.appendChild(UI.icon("vpn_key", "text-6xl text-md-on-surface-variant mb-4"));
        card.appendChild(UI.el("p", "text-body-large text-md-on-surface-variant", "API 密钥管理功能开发中..."));
        
        // Demo: Show progress indicator
        card.appendChild(UI.el("div", "mt-4"));
        card.appendChild(UI.progressLinear(60, "max-w-xs mx-auto"));
        card.appendChild(UI.el("p", "text-body-small text-md-on-surface-variant mt-2", "开发进度: 60%"));
        
        container.appendChild(card);
    }
};