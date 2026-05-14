// SmartFinance Charts - theme-aware Chart.js configuration

let expenseChartInstance = null;
let analyticsChartInstance = null;
let trendChartInstance = null;

const latestChartData = {
    dashboardExpense: [],
    analyticsTrend: [],
    analyticsCategory: []
};

const chartPalette = ['#7C3AED', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getThemeColors() {
    return {
        bg: cssVar('--color-bg') || '#09090E',
        surface: cssVar('--color-surface') || 'rgba(255,255,255,0.035)',
        accent: cssVar('--color-accent') || '#7C3AED',
        income: cssVar('--color-income') || '#10B981',
        expense: cssVar('--color-expense') || '#EF4444',
        savings: cssVar('--color-savings') || '#3B82F6',
        warning: cssVar('--color-warning') || '#F59E0B',
        text: cssVar('--color-text') || '#F1F5F9',
        muted: cssVar('--color-muted') || '#64748B',
        border: cssVar('--color-border') || 'rgba(255,255,255,0.07)',
        grid: cssVar('--color-chart-grid') || 'rgba(255,255,255,0.04)'
    };
}

function formatRupees(value) {
    return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function applyChartDefaults() {
    const theme = getThemeColors();
    Chart.defaults.color = theme.muted;
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.tooltip.enabled = true;
}

function tooltipOptions() {
    const theme = getThemeColors();
    return {
        backgroundColor: document.documentElement.dataset.theme === 'dark' ? '#1e1e2e' : '#FFFFFF',
        titleColor: theme.text,
        bodyColor: theme.text,
        borderColor: theme.border,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
        boxPadding: 6,
        callbacks: {
            label(context) {
                const label = context.dataset.label ? `${context.dataset.label}: ` : '';
                const value = context.parsed?.y ?? context.raw ?? 0;
                if (context.chart.config.type === 'doughnut') {
                    const total = context.dataset.data.reduce((sum, item) => sum + Number(item || 0), 0);
                    const pct = total ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
                    return `${label}${formatRupees(value)} (${pct}%)`;
                }
                return `${label}${formatRupees(value)}`;
            }
        }
    };
}

function destroyChart(chart) {
    if (chart) chart.destroy();
}

function buildLegend(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-illustration">₹</div><h3>No category spend yet</h3><p>Add an expense to see category contribution.</p></div>';
        return;
    }

    const total = data.reduce((sum, item) => sum + Number(item.total || 0), 0);
    container.innerHTML = data.map((item, index) => {
        const color = item.color || chartPalette[index % chartPalette.length];
        const pct = total ? Math.round((Number(item.total || 0) / total) * 100) : 0;
        return `
            <div class="legend-row">
                <div class="legend-label">
                    <span class="legend-dot" style="background:${color}"></span>
                    <span>${item.icon || ''} ${item.name}</span>
                </div>
                <div class="legend-amount">${formatRupees(item.total)} · ${pct}%</div>
            </div>
        `;
    }).join('');
}

function initExpenseChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const theme = getThemeColors();
    return new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderColor: 'transparent',
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            layout: { padding: 4 },
            plugins: {
                legend: { display: false },
                tooltip: tooltipOptions()
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 850,
                easing: 'easeOutQuart'
            }
        },
        plugins: [{
            id: 'centerText',
            afterDraw(chart) {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                const total = chart.data.datasets[0].data.reduce((sum, value) => sum + Number(value || 0), 0);
                ctx.save();
                ctx.font = '700 12px Inter, sans-serif';
                ctx.fillStyle = theme.muted;
                ctx.textAlign = 'center';
                ctx.fillText('Total Spend', (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2 - 8);
                ctx.font = '800 18px "JetBrains Mono", monospace';
                ctx.fillStyle = theme.text;
                ctx.fillText(formatRupees(total), (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2 + 18);
                ctx.restore();
            }
        }]
    });
}

function updateExpenseChart(chartInstance, data, legendId = null) {
    if (!chartInstance) return;

    const chartData = Array.isArray(data) ? data : [];
    chartInstance.data.labels = chartData.map(item => `${item.icon || ''} ${item.name}`);
    chartInstance.data.datasets[0].data = chartData.map(item => Number(item.total || 0));
    chartInstance.data.datasets[0].backgroundColor = chartData.map((item, index) => item.color || chartPalette[index % chartPalette.length]);
    chartInstance.update('active');

    if (legendId) buildLegend(legendId, chartData);
}

function initAnalyticsChart() {
    return initExpenseChart('analyticsChart');
}

function initTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return null;

    const theme = getThemeColors();
    const ctx = canvas.getContext('2d');
    const incomeGradient = ctx.createLinearGradient(0, 0, 0, 360);
    incomeGradient.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    incomeGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    const expenseGradient = ctx.createLinearGradient(0, 0, 0, 360);
    expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.20)');
    expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

    return new Chart(canvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Income',
                    data: [],
                    borderColor: theme.income,
                    backgroundColor: incomeGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: theme.income,
                    pointBorderColor: theme.bg,
                    pointBorderWidth: 2
                },
                {
                    label: 'Expense',
                    data: [],
                    borderColor: theme.expense,
                    backgroundColor: expenseGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: theme.expense,
                    pointBorderColor: theme.bg,
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: theme.muted,
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 18,
                        font: { family: 'Inter', size: 12, weight: '700' }
                    }
                },
                tooltip: tooltipOptions()
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    border: { display: false },
                    ticks: { color: theme.muted, font: { family: 'Inter', size: 12, weight: '600' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: theme.grid, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: theme.muted,
                        font: { family: 'Inter', size: 12, weight: '600' },
                        callback(value) {
                            return `₹${Number(value).toLocaleString('en-IN')}`;
                        }
                    }
                }
            },
            animation: {
                duration: 850,
                easing: 'easeOutQuart'
            }
        }
    });
}

function updateTrendChart(chartInstance, data) {
    if (!chartInstance) return;

    const trendData = Array.isArray(data) ? data : [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    chartInstance.data.labels = trendData.map(item => {
        const [year, month] = String(item.month || '').split('-');
        const monthIndex = Number(month) - 1;
        return `${monthNames[monthIndex] || item.month} ${String(year || '').slice(-2)}`;
    });
    chartInstance.data.datasets[0].data = trendData.map(item => Number(item.total_income || 0));
    chartInstance.data.datasets[1].data = trendData.map(item => Number(item.total_expense || 0));
    chartInstance.update('active');
}

function initializeCharts() {
    if (!window.Chart) return;
    applyChartDefaults();
    destroyChart(expenseChartInstance);
    destroyChart(analyticsChartInstance);
    destroyChart(trendChartInstance);
    expenseChartInstance = initExpenseChart('expenseChart');
    analyticsChartInstance = null;
    trendChartInstance = null;
}

function updateDashboardCharts(expenseData) {
    latestChartData.dashboardExpense = Array.isArray(expenseData) ? expenseData : [];
    if (!expenseChartInstance) expenseChartInstance = initExpenseChart('expenseChart');
    updateExpenseChart(expenseChartInstance, latestChartData.dashboardExpense, 'expenseLegend');
}

function updateAnalyticsCharts(trendData, categoryData) {
    latestChartData.analyticsTrend = Array.isArray(trendData) ? trendData : [];
    latestChartData.analyticsCategory = Array.isArray(categoryData) ? categoryData : [];
    if (!trendChartInstance) trendChartInstance = initTrendChart();
    if (!analyticsChartInstance) analyticsChartInstance = initAnalyticsChart();
    updateTrendChart(trendChartInstance, latestChartData.analyticsTrend);
    updateExpenseChart(analyticsChartInstance, latestChartData.analyticsCategory, 'analyticsLegend');
}

function refreshChartsForTab(tabName) {
    if (!window.Chart) return;
    applyChartDefaults();

    if (tabName === 'dashboard') {
        destroyChart(expenseChartInstance);
        expenseChartInstance = initExpenseChart('expenseChart');
        updateDashboardCharts(latestChartData.dashboardExpense);
    }

    if (tabName === 'analytics') {
        destroyChart(trendChartInstance);
        destroyChart(analyticsChartInstance);
        trendChartInstance = initTrendChart();
        analyticsChartInstance = initAnalyticsChart();
        updateAnalyticsCharts(latestChartData.analyticsTrend, latestChartData.analyticsCategory);
    }
}

function updateChartTheme() {
    const activePanel = document.querySelector('.tab-panel.active');
    const tabName = activePanel ? activePanel.id.replace('-panel', '') : 'dashboard';
    refreshChartsForTab(tabName);
}

window.initializeCharts = initializeCharts;
window.updateDashboardCharts = updateDashboardCharts;
window.updateAnalyticsCharts = updateAnalyticsCharts;
window.updateExpenseChart = updateExpenseChart;
window.updateTrendChart = updateTrendChart;
window.updateChartTheme = updateChartTheme;
window.refreshChartsForTab = refreshChartsForTab;
