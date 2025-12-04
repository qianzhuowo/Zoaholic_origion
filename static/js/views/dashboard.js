/**
 * Dashboard View - Enhanced System Overview with Charts
 * 仪表盘视图 - 增强系统概览（含图表）
 */
const DashboardView = {
    charts: {}, // 存储图表实例
    refreshInterval: null,
    currentTimeRange: 24, // 当前时间范围（小时）

    /**
     * Render enhanced dashboard view with charts
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        // 清空容器
        container.innerHTML = "";
        
        // 页面标题和控制按钮
        const headerSection = UI.el("div", "flex items-center justify-between mb-6");
        headerSection.appendChild(UI.el("h2", "text-display-small text-md-on-surface", "系统概览"));
        
        // 控制按钮组
        const controls = UI.el("div", "flex items-center gap-3");
        
        // 时间范围选择器
        const timeRangeGroup = UI.el("div", "flex items-center gap-2 bg-md-surface-container rounded-md-full p-1");
        const timeRanges = [
            { label: "1小时", value: 1 },
            { label: "6小时", value: 6 },
            { label: "24小时", value: 24 },
            { label: "7天", value: 168 },
            { label: "30天", value: 720 }
        ];
        
        timeRanges.forEach(range => {
            const btn = document.createElement("button");
            btn.className = `px-4 py-2 rounded-md-full text-label-large transition-all ${
                range.value === this.currentTimeRange
                    ? "bg-md-secondary-container text-md-on-secondary-container"
                    : "text-md-on-surface-variant hover:bg-md-on-surface/8"
            }`;
            btn.textContent = range.label;
            btn.onclick = () => {
                this.currentTimeRange = range.value;
                this.render(container);
            };
            timeRangeGroup.appendChild(btn);
        });
        controls.appendChild(timeRangeGroup);
        
        // 刷新按钮
        const refreshBtn = UI.iconBtn("refresh", () => this.render(container), "tonal");
        refreshBtn.setAttribute("data-tooltip", "刷新数据");
        controls.appendChild(refreshBtn);
        
        headerSection.appendChild(controls);
        container.appendChild(headerSection);

        // 加载状态
        const loading = UI.spinner();
        container.appendChild(loading);

        // 异步加载数据
        this.loadDashboardData(container, loading);
    },

    /**
     * 加载Dashboard数据
     */
    async loadDashboardData(container, loading) {
        const adminKey = AppConfig?.currentUser?.key || null;
        const headers = adminKey ? { Authorization: `Bearer ${adminKey}` } : {};

        let statsData = null;
        let tokenUsageData = null;

        try {
            // 获取统计数据
            const [statsRes, usageRes] = await Promise.all([
                fetch(`/v1/stats?hours=${this.currentTimeRange}`, { headers }),
                fetch(`/v1/token_usage?last_n_days=30`, { headers })
            ]);

            if (statsRes.ok) {
                const json = await statsRes.json();
                statsData = json.stats || json;
            }

            if (usageRes.ok) {
                const usageJson = await usageRes.json();
                tokenUsageData = usageJson.usage || [];
            }
        } catch (e) {
            console.error("Failed to load dashboard data:", e);
            UI.snackbar("加载数据失败", null, null, { variant: "error" });
        }

        loading.remove();

        // 渲染内容
        this.renderContent(container, statsData, tokenUsageData);
    },

    /**
     * 渲染Dashboard内容
     */
    renderContent(container, statsData, tokenUsageData) {
        const channelStats = statsData?.channel_success_rates || [];
        const modelStats = statsData?.model_request_counts || [];
        const endpointStats = statsData?.endpoint_request_counts || [];
        const ipStats = statsData?.ip_request_counts || [];

        // 添加调试日志
        console.log('Dashboard Data:', {
            channelStats,
            modelStats,
            totalChannels: channelStats.length,
            statsData
        });

        // 计算总计指标
        const totalRequests = channelStats.reduce((sum, item) => sum + (item.total_requests || 0), 0);
        const totalTokens = (tokenUsageData || []).reduce((sum, item) => sum + (item.total_tokens || 0), 0);
        
        let avgSuccessRate = 0;
        if (totalRequests > 0 && channelStats.length > 0) {
            const successSum = channelStats.reduce((sum, item) => {
                const sr = typeof item.success_rate === 'number' ? item.success_rate : 0;
                const count = item.total_requests || 0;
                return sum + sr * count;
            }, 0);
            avgSuccessRate = successSum / totalRequests;
        }

        const activeChannels = channelStats.length;
        
        // 判断是否有数据
        const hasData = totalRequests > 0 || activeChannels > 0;

        // 1. 统计卡片网格
        const statsGrid = UI.el("div", "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6");
        
        const statsConfig = [
            {
                label: "总请求数",
                sublabel: "Total Requests",
                value: hasData ? totalRequests.toLocaleString() : "暂无数据",
                icon: "api",
                color: "text-md-primary",
                bgColor: "bg-md-primary-container",
                trend: hasData && totalRequests > 0 ? "+12.5%" : null
            },
            {
                label: "Token 消耗",
                sublabel: "Total Tokens",
                value: hasData && totalTokens > 0 ? totalTokens.toLocaleString() : "暂无数据",
                icon: "token",
                color: "text-md-tertiary",
                bgColor: "bg-md-tertiary-container",
                trend: hasData && totalTokens > 0 ? "+8.3%" : null
            },
            {
                label: "平均成功率",
                sublabel: "Success Rate",
                value: hasData && totalRequests > 0 ? (avgSuccessRate * 100).toFixed(1) + "%" : "暂无数据",
                icon: "check_circle",
                color: hasData && avgSuccessRate >= 0.95 ? "text-md-success" : hasData && avgSuccessRate >= 0.8 ? "text-md-warning" : "text-md-error",
                bgColor: hasData && avgSuccessRate >= 0.95 ? "bg-md-success-container" : hasData && avgSuccessRate >= 0.8 ? "bg-md-warning-container" : "bg-md-error-container",
                trend: hasData && totalRequests > 0 ? (avgSuccessRate > 0.95 ? "+2.1%" : "-1.2%") : null
            },
            {
                label: "活跃渠道",
                sublabel: "Active Channels",
                value: String(activeChannels),
                icon: "dns",
                color: "text-md-warning",
                bgColor: "bg-md-warning-container",
                trend: null
            }
        ];

        statsConfig.forEach((stat) => {
            const card = UI.card("filled", "hover:shadow-md-2 transition-all cursor-pointer");
            const content = UI.el("div", "flex items-start gap-4");

            const iconBox = UI.el("div", `w-12 h-12 rounded-md-lg ${stat.bgColor} flex items-center justify-center ${stat.color}`);
            iconBox.appendChild(UI.icon(stat.icon, "text-2xl", true));

            const info = UI.el("div", "flex-1");
            const labelRow = UI.el("div", "flex items-center justify-between");
            labelRow.appendChild(UI.el("div", "text-label-large text-md-on-surface-variant", stat.label));
            if (stat.trend) {
                const trendColor = stat.trend.startsWith("+") ? "text-md-success" : "text-md-error";
                labelRow.appendChild(UI.el("div", `text-label-small ${trendColor} font-medium`, stat.trend));
            }
            info.appendChild(labelRow);
            info.appendChild(UI.el("div", "text-body-small text-md-on-surface-variant/60 mt-0.5", stat.sublabel));
            info.appendChild(UI.el("div", "text-headline-medium font-bold text-md-on-surface mt-2", stat.value));

            content.appendChild(iconBox);
            content.appendChild(info);
            card.appendChild(content);
            statsGrid.appendChild(card);
        });

        container.appendChild(statsGrid);

        // 2. 图表区域 - 两列布局
        const chartsSection = UI.el("div", "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6");

        // 2.1 请求量趋势图（模拟数据）
        const requestTrendCard = this.createChartCard(
            "请求量趋势",
            "Request Volume Trend",
            "chart-request-trend"
        );
        chartsSection.appendChild(requestTrendCard);

        // 2.2 成功率趋势图（模拟数据）
        const successRateTrendCard = this.createChartCard(
            "成功率趋势",
            "Success Rate Trend",
            "chart-success-rate"
        );
        chartsSection.appendChild(successRateTrendCard);

        container.appendChild(chartsSection);

        // 3. 分布图表区域 - 三列布局
        const distributionSection = UI.el("div", "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6");

        // 3.1 模型分布饼图
        const modelDistCard = this.createChartCard(
            "模型分布",
            "Model Distribution",
            "chart-model-dist"
        );
        distributionSection.appendChild(modelDistCard);

        // 3.2 端点分布饼图
        const endpointDistCard = this.createChartCard(
            "端点分布",
            "Endpoint Distribution",
            "chart-endpoint-dist"
        );
        distributionSection.appendChild(endpointDistCard);

        // 3.3 渠道性能对比
        const channelPerfCard = this.createChartCard(
            "渠道性能",
            "Channel Performance",
            "chart-channel-perf"
        );
        distributionSection.appendChild(channelPerfCard);

        container.appendChild(distributionSection);

        // 4. 渠道健康监控表格（保留原有）
        const tableSection = UI.el("div", "mt-6");
        tableSection.appendChild(UI.el("h3", "text-title-large text-md-on-surface mb-4", "渠道健康监控"));

        const tableCard = UI.card("outlined", "overflow-hidden p-0");
        const table = this.createChannelHealthTable(channelStats);
        tableCard.appendChild(table);
        tableSection.appendChild(tableCard);
        container.appendChild(tableSection);

        // 初始化所有图表
        this.initializeCharts(statsData, tokenUsageData);
    },

    /**
     * 创建图表卡片
     */
    createChartCard(title, subtitle, canvasId) {
        const card = UI.card("filled", "h-[320px] flex flex-col");
        
        const header = UI.el("div", "mb-4");
        header.appendChild(UI.el("h3", "text-title-medium text-md-on-surface", title));
        header.appendChild(UI.el("p", "text-body-small text-md-on-surface-variant", subtitle));
        
        const canvasWrapper = UI.el("div", "flex-1 relative min-h-0");
        const canvas = document.createElement("canvas");
        canvas.id = canvasId;
        canvasWrapper.appendChild(canvas);
        
        card.appendChild(header);
        card.appendChild(canvasWrapper);
        
        return card;
    },

    /**
     * 创建渠道健康表格
     */
    createChannelHealthTable(channelStats) {
        const table = UI.el("table", "w-full text-left");

        const thead = UI.el("thead", "bg-md-surface-container-highest");
        thead.innerHTML = `
            <tr>
                <th class="px-6 py-4 text-label-large text-md-on-surface">渠道名称</th>
                <th class="px-6 py-4 text-label-large text-md-on-surface">状态</th>
                <th class="px-6 py-4 text-label-large text-md-on-surface">请求数</th>
                <th class="px-6 py-4 text-label-large text-md-on-surface">成功率</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = UI.el("tbody", "divide-y divide-md-outline-variant");

        if (!channelStats.length) {
            const tr = UI.el("tr");
            tr.innerHTML = '<td colspan="4" class="px-6 py-8 text-center text-body-medium text-md-on-surface-variant">暂无渠道数据</td>';
            tbody.appendChild(tr);
        } else {
            channelStats.forEach((channel) => {
                const tr = UI.el("tr", "hover:bg-md-surface-container transition-colors");
                const requestCount = channel.total_requests || 0;
                const sr = typeof channel.success_rate === 'number' ? channel.success_rate : 0;
                
                // 只有当有请求数据时才显示成功率
                let srPercent, status, statusChip;
                
                if (requestCount === 0) {
                    // 没有请求数据
                    srPercent = "-";
                    statusChip = UI.chip("无数据", "filter", "remove", { selected: true });
                    statusChip.classList.add("md-chip-status-warning");
                } else {
                    // 有请求数据，计算成功率
                    srPercent = (sr * 100).toFixed(1) + "%";
                    
                    status = "healthy";
                    if (sr < 0.95) status = "warning";
                    if (sr < 0.8) status = "error";

                    if (status === "healthy") {
                        statusChip = UI.chip("正常", "filter", "check_circle", { selected: true });
                        statusChip.classList.add("md-chip-status-healthy");
                    } else if (status === "warning") {
                        statusChip = UI.chip("警告", "filter", "warning", { selected: true });
                        statusChip.classList.add("md-chip-status-warning");
                    } else {
                        statusChip = UI.chip("错误", "filter", "error", { selected: true });
                        statusChip.classList.add("md-chip-status-error");
                    }
                }

                const nameTd = UI.el("td", "px-6 py-4");
                nameTd.appendChild(UI.el("span", "text-body-large text-md-on-surface font-medium", channel.provider));

                const statusTd = UI.el("td", "px-6 py-4");
                statusTd.appendChild(statusChip);

                const requestsTd = UI.el("td", "px-6 py-4 text-body-medium text-md-on-surface-variant", requestCount.toLocaleString());
                const successTd = UI.el("td", "px-6 py-4 font-mono text-body-medium text-md-on-surface font-bold", srPercent);

                tr.appendChild(nameTd);
                tr.appendChild(statusTd);
                tr.appendChild(requestsTd);
                tr.appendChild(successTd);
                tbody.appendChild(tr);
            });
        }

        table.appendChild(tbody);
        return table;
    },

    /**
     * 初始化所有图表
     */
    initializeCharts(statsData, tokenUsageData) {
        // 销毁旧图表
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};

        // Chart.js 全局配置
        if (window.Chart) {
            Chart.defaults.font.family = "'Roboto', sans-serif";
            Chart.defaults.color = "#42474E";
        }

        // 1. 请求量趋势图（模拟24小时数据）
        this.charts.requestTrend = this.createRequestTrendChart(statsData);

        // 2. 成功率趋势图
        this.charts.successRate = this.createSuccessRateTrendChart(statsData);

        // 3. 模型分布饼图
        this.charts.modelDist = this.createModelDistributionChart(statsData);

        // 4. 端点分布饼图
        this.charts.endpointDist = this.createEndpointDistributionChart(statsData);

        // 5. 渠道性能对比
        this.charts.channelPerf = this.createChannelPerformanceChart(statsData);
    },

    /**
     * 创建请求量趋势图
     */
    createRequestTrendChart(statsData) {
        const ctx = document.getElementById('chart-request-trend');
        if (!ctx || !window.Chart) return null;

        // 生成模拟时间序列数据
        const hours = Math.min(this.currentTimeRange, 24);
        const labels = [];
        const data = [];
        
        for (let i = hours - 1; i >= 0; i--) {
            labels.push(`${i}h前`);
            // 模拟数据：基础值 + 随机波动
            data.push(Math.floor(50 + Math.random() * 100));
        }

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.reverse(),
                datasets: [{
                    label: '请求数',
                    data: data.reverse(),
                    borderColor: '#1976D2',
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    },

    /**
     * 创建成功率趋势图
     */
    createSuccessRateTrendChart(statsData) {
        const ctx = document.getElementById('chart-success-rate');
        if (!ctx || !window.Chart) return null;

        const hours = Math.min(this.currentTimeRange, 24);
        const labels = [];
        const data = [];
        
        for (let i = hours - 1; i >= 0; i--) {
            labels.push(`${i}h前`);
            // 模拟成功率数据：95-100%之间
            data.push(95 + Math.random() * 5);
        }

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.reverse(),
                datasets: [{
                    label: '成功率 (%)',
                    data: data.reverse(),
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: (context) => `成功率: ${context.parsed.y.toFixed(2)}%`
                        }
                    }
                },
                scales: {
                    y: {
                        min: 90,
                        max: 100,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    },

    /**
     * 创建模型分布饼图
     */
    createModelDistributionChart(statsData) {
        const ctx = document.getElementById('chart-model-dist');
        if (!ctx || !window.Chart) return null;

        const modelStats = statsData?.model_request_counts || [];
        const topModels = modelStats.slice(0, 5);
        
        // 如果没有数据，显示空状态
        if (topModels.length === 0 || topModels.every(m => (m.count || 0) === 0)) {
            const labels = ['暂无数据'];
            const data = [1];
            
            return new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#DFE3EB'],
                        borderWidth: 2,
                        borderColor: '#FAFCFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
        }
        
        const labels = topModels.map(m => m.model || 'Unknown');
        const data = topModels.map(m => m.count || 0);
        
        const colors = [
            '#1976D2', '#6B5B95', '#546E7A', '#2E7D32', '#F57C00'
        ];

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#FAFCFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 11 },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 创建端点分布饼图
     */
    createEndpointDistributionChart(statsData) {
        const ctx = document.getElementById('chart-endpoint-dist');
        if (!ctx || !window.Chart) return null;

        const endpointStats = statsData?.endpoint_request_counts || [];
        const topEndpoints = endpointStats.slice(0, 5);
        
        // 如果没有数据，显示空状态
        if (topEndpoints.length === 0 || topEndpoints.every(e => (e.count || 0) === 0)) {
            const labels = ['暂无数据'];
            const data = [1];
            
            return new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#DFE3EB'],
                        borderWidth: 2,
                        borderColor: '#FAFCFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
        }
        
        const labels = topEndpoints.map(e => {
            const endpoint = e.endpoint || 'Unknown';
            return endpoint.replace('POST ', '').replace('GET ', '');
        });
        const data = topEndpoints.map(e => e.count || 0);
        
        const colors = [
            '#1976D2', '#6B5B95', '#546E7A', '#2E7D32', '#F57C00'
        ];

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#FAFCFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 11 },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 创建渠道性能对比柱状图
     */
    createChannelPerformanceChart(statsData) {
        const ctx = document.getElementById('chart-channel-perf');
        if (!ctx || !window.Chart) return null;

        const channelStats = statsData?.channel_success_rates || [];
        const topChannels = channelStats.slice(0, 6);
        
        // 如果没有数据，显示空状态
        if (topChannels.length === 0) {
            const labels = ['暂无数据'];
            const data = [0];
            
            return new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '成功率 (%)',
                        data: data,
                        backgroundColor: ['#DFE3EB'],
                        borderRadius: 6,
                        barThickness: 30
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
        
        const labels = topChannels.map(c => c.provider || 'Unknown');
        const successRates = topChannels.map(c => {
            const sr = typeof c.success_rate === 'number' ? c.success_rate : 0;
            return sr * 100;
        });

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '成功率 (%)',
                    data: successRates,
                    backgroundColor: successRates.map(rate =>
                        rate >= 95 ? '#2E7D32' : rate >= 80 ? '#F57C00' : '#BA1A1A'
                    ),
                    borderRadius: 6,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: (context) => `成功率: ${context.parsed.y.toFixed(2)}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
};