/**
 * Dashboard View - System Overview
 * 仪表盘视图 - 系统概览
 */
const DashboardView = {
    /**
     * Render dashboard view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        // Page title with progress indicator demo
        const titleSection = UI.el("div", "flex items-center justify-between");
        titleSection.appendChild(
            UI.el("h2", "text-display-small text-md-on-surface", "系统概览")
        );
        container.appendChild(titleSection);

        // Loading state
        const loading = UI.spinner();
        container.appendChild(loading);

        (async () => {
            const adminKey = AppConfig?.currentUser?.key || null;
            const headers = adminKey ? { Authorization: `Bearer ${adminKey}` } : {};

            let statsData = null;
            let channelStats = [];
            let totalTokens = 0;

            // Fetch /v1/stats
            try {
                const res = await fetch("/v1/stats?hours=24", { headers });
                if (res.ok) {
                    const json = await res.json();
                    statsData = json.stats || json;
                    channelStats = statsData.channel_success_rates || [];
                }
            } catch (e) {
                console.error("Failed to load /v1/stats:", e);
            }

            // Fetch /v1/token_usage
            try {
                const usageRes = await fetch("/v1/token_usage?last_n_days=30", { headers });
                if (usageRes.ok) {
                    const usageJson = await usageRes.json();
                    const usageList = usageJson.usage || [];
                    totalTokens = usageList.reduce((sum, item) => sum + (item.total_tokens || 0), 0);
                }
            } catch (e) {
                console.error("Failed to load /v1/token_usage:", e);
            }

            // Process data
            let totalRequests = 0;
            let successRate = 0;
            let activeChannels = 0;
            let channelRows = [];

            if (statsData) {
                totalRequests = channelStats.reduce((sum, item) => sum + (item.total_requests || item.total || 0), 0);

                if (totalRequests > 0) {
                    const successSum = channelStats.reduce((sum, item) => {
                        const sr = typeof item.success_rate === "number" ? item.success_rate : 0;
                        const count = item.total_requests || item.total || 0;
                        return sum + sr * count;
                    }, 0);
                    successRate = successSum / totalRequests;
                }

                activeChannels = channelStats.length;

                channelRows = channelStats.map((item) => {
                    const count = item.total_requests || item.total || 0;
                    const sr = typeof item.success_rate === "number" ? item.success_rate : 0;
                    const srPercent = (sr * 100).toFixed(1) + "%";
                    let status = "healthy";
                    if (sr < 0.95) status = "warning";
                    if (sr < 0.8) status = "error";
                    return {
                        name: item.provider,
                        status,
                        latency: "-",
                        success: srPercent,
                        requests: count,
                    };
                });
            } else if (MockData?.stats) {
                totalRequests = MockData.stats.total_requests || 0;
                totalTokens = totalTokens || MockData.stats.total_tokens || 0;
                successRate = (MockData.stats.success_rate || 0) / 100;
                activeChannels = MockData.stats.active_channels || 0;
                channelRows = (MockData.channels || []).map((c) => ({
                    name: c.name,
                    status: c.status,
                    latency: c.latency,
                    success: c.success,
                    requests: null,
                }));
            }

            loading.remove();

            // Stats Cards Grid
            const grid = UI.el("div", "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4");

            const statsConfig = [
                {
                    label: "今日请求",
                    sublabel: "Total Requests",
                    value: totalRequests.toLocaleString(),
                    icon: "api",
                    color: "text-md-primary",
                    bgColor: "bg-md-primary-container",
                },
                {
                    label: "Token 消耗",
                    sublabel: "Total Tokens",
                    value: totalTokens.toLocaleString(),
                    icon: "token",
                    color: "text-md-tertiary",
                    bgColor: "bg-md-tertiary-container",
                },
                {
                    label: "平均成功率",
                    sublabel: "Success Rate",
                    value: (successRate * 100).toFixed(1) + "%",
                    icon: "check_circle",
                    color: "text-md-success",
                    bgColor: "bg-md-success-container",
                },
                {
                    label: "活跃渠道",
                    sublabel: "Active Channels",
                    value: String(activeChannels),
                    icon: "dns",
                    color: "text-md-warning",
                    bgColor: "bg-md-warning-container",
                },
            ];

            statsConfig.forEach((stat) => {
                const card = UI.card("filled", "hover:shadow-md-1 transition-all cursor-pointer");
                const content = UI.el("div", "flex items-start gap-4");

                const iconBox = UI.el("div", `w-12 h-12 rounded-md-lg ${stat.bgColor} flex items-center justify-center ${stat.color}`);
                iconBox.appendChild(UI.icon(stat.icon, "text-2xl", true));

                const info = UI.el("div", "flex-1");
                info.appendChild(UI.el("div", "text-label-large text-md-on-surface-variant", stat.label));
                info.appendChild(UI.el("div", "text-body-small text-md-on-surface-variant/60 mt-0.5", stat.sublabel));
                info.appendChild(UI.el("div", "text-headline-medium font-bold text-md-on-surface mt-2", stat.value));

                content.appendChild(iconBox);
                content.appendChild(info);
                card.appendChild(content);
                grid.appendChild(card);
            });

            container.appendChild(grid);

            // Channel Health Table
            const tableSection = UI.el("div", "mt-6");
            tableSection.appendChild(UI.el("h3", "text-title-large text-md-on-surface mb-4", "渠道健康监控"));

            const tableCard = UI.card("outlined", "overflow-hidden p-0");
            const table = UI.el("table", "w-full text-left");

            const thead = UI.el("thead", "bg-md-surface-container-highest");
            thead.innerHTML = `
                <tr>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Provider Name</th>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Status</th>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Latency</th>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Success Rate</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = UI.el("tbody", "divide-y divide-md-outline-variant");

            if (!channelRows.length) {
                const tr = UI.el("tr");
                tr.innerHTML = '<td colspan="4" class="px-6 py-8 text-center text-body-medium text-md-on-surface-variant">暂无渠道数据</td>';
                tbody.appendChild(tr);
            } else {
                channelRows.forEach((channel) => {
                    const tr = UI.el("tr", "hover:bg-md-surface-container transition-colors");

                    let statusChip;
                    if (channel.status === "healthy") {
                        statusChip = UI.chip("Healthy", "filter", "check_circle", { selected: true });
                        statusChip.classList.add("bg-md-success-container", "text-md-on-success-container", "border-md-success-container");
                    } else if (channel.status === "warning") {
                        statusChip = UI.chip("Warning", "filter", "warning", { selected: true });
                        statusChip.classList.add("bg-md-warning-container", "text-md-on-warning-container", "border-md-warning-container");
                    } else {
                        statusChip = UI.chip("Error", "filter", "error", { selected: true });
                        statusChip.classList.add("bg-md-error-container", "text-md-on-error-container", "border-md-error-container");
                    }

                    const nameTd = UI.el("td", "px-6 py-4");
                    nameTd.appendChild(UI.el("span", "text-body-large text-md-on-surface", channel.name));

                    const statusTd = UI.el("td", "px-6 py-4");
                    statusTd.appendChild(statusChip);

                    const latencyTd = UI.el("td", "px-6 py-4 text-body-medium text-md-on-surface-variant", channel.latency || "-");
                    const successTd = UI.el("td", "px-6 py-4 font-mono text-body-medium text-md-on-surface", channel.success || "-");

                    tr.appendChild(nameTd);
                    tr.appendChild(statusTd);
                    tr.appendChild(latencyTd);
                    tr.appendChild(successTd);
                    tbody.appendChild(tr);
                });
            }

            table.appendChild(tbody);
            tableCard.appendChild(table);
            tableSection.appendChild(tableCard);
            container.appendChild(tableSection);
        })();
    }
};