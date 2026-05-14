// SmartFinance - premium frontend application logic

const state = {
    currentTab: 'dashboard',
    currentMonth: getCurrentMonth(),
    transactionsPage: 1,
    transactionsLimit: 10,
    categories: [],
    transactionType: 'expense',
    editingTransactionId: null,
    selectedCategoryFilter: null
};

let budgetMonth = getCurrentMonth();
let monthNavLocked = false;
let lastSummary = null;

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
}

function formatDate(dateStr, long = false) {
    const date = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: long ? 'long' : 'short',
        year: long ? 'numeric' : undefined
    }).format(date);
}

function formatCurrency(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatAmount(amount, type) {
    const prefix = type === 'income' ? '+' : '-';
    return `${prefix}${formatCurrency(amount)}`;
}

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function hasMotion() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function withGsap(callback) {
    if (window.gsap && hasMotion()) callback(window.gsap);
}

function animateAmount(element, value) {
    if (!element) return;
    const numeric = Math.abs(Number(value || 0));
    if (!window.gsap || !hasMotion()) {
        element.textContent = formatCurrency(numeric);
        return;
    }

    const proxy = { value: 0 };
    window.gsap.to(proxy, {
        value: numeric,
        duration: 1.2,
        ease: 'power4.out',
        onUpdate: () => {
            element.textContent = formatCurrency(proxy.value);
        }
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    while (container.children.length >= 3) {
        container.firstElementChild?.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span aria-hidden="true">${type === 'error' ? '×' : '✓'}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" type="button" aria-label="Dismiss notification">×</button>
    `;

    const close = () => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 260);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    container.appendChild(toast);
    setTimeout(close, 3000);
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return result.data;
    } catch (error) {
        console.error(`API Error: ${endpoint}`, error);
        showToast(error.message || 'Something went wrong', 'error');
        throw error;
    }
}

async function fetchCategories() { return await apiCall('/categories'); }
async function fetchSummary(month) { return await apiCall(`/summary?month=${month}`); }
async function fetchTransactions(month, page = 1, categoryId = null) {
    let url = `/transactions?month=${month}&page=${page}&limit=${state.transactionsLimit}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    return await apiCall(url);
}
async function fetchRecentTransactions(limit = 5) { return await apiCall(`/recent-transactions?limit=${limit}`); }
async function fetchExpenseByCategory(month) { return await apiCall(`/expense-by-category?month=${month}`); }
async function fetchBudgets(month) { return await apiCall(`/budgets?month=${month}`); }
async function fetchBudgetHealth(month) { return await apiCall(`/budget-health?month=${month}`); }
async function fetchTrendData(months = 6) { return await apiCall(`/trend?months=${months}`); }
async function fetchCategoryBreakdown(month) { return await apiCall(`/category-breakdown?month=${month}`); }
async function fetchRecurring() { return await apiCall('/recurring'); }
async function createRecurring(data) { return await apiCall('/recurring', { method: 'POST', body: JSON.stringify(data) }); }
async function deleteRecurring(id) { return await apiCall(`/recurring/${id}`, { method: 'DELETE' }); }
async function createTransaction(data) { return await apiCall('/transactions', { method: 'POST', body: JSON.stringify(data) }); }
async function updateTransaction(id, data) { return await apiCall(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
async function deleteTransaction(id) { return await apiCall(`/transactions/${id}`, { method: 'DELETE' }); }
async function createBudget(data) { return await apiCall('/budgets', { method: 'POST', body: JSON.stringify(data) }); }
async function sendChatMessage(message) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            month: state.currentMonth
        })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'The AI advisor is unavailable right now.');
    return result.data;
}

async function streamChatMessage(message, onDelta) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            month: state.currentMonth,
            stream: true
        })
    });

    if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const result = await response.json();
            throw new Error(result.error || 'The AI advisor is unavailable right now.');
        }
        throw new Error(await response.text() || 'The AI advisor is unavailable right now.');
    }

    if (!response.body) {
        const text = await response.text();
        onDelta(text);
        return text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        onDelta(chunk);
    }

    const tail = decoder.decode();
    if (tail) {
        fullText += tail;
        onDelta(tail);
    }

    return fullText;
}

function initTheme() {
    const savedTheme = localStorage.getItem('sf-theme') || 'dark';
    applyTheme(savedTheme, false);
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme, true);
    });
}

function applyTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#09090E' : '#EEF0F5');
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
        toggle.querySelector('.theme-toggle__icon').textContent = theme === 'dark' ? '☾' : '☀';
    }
    if (persist) {
        localStorage.setItem('sf-theme', theme);
        window.updateChartTheme?.();
    }
}

function switchTab(tabName) {
    state.currentTab = tabName;

    document.querySelectorAll('.nav-tab, .mobile-nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}-panel`);
    });

    withGsap(gsap => {
        gsap.fromTo(`#${tabName}-panel`, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' });
        gsap.fromTo(`.mobile-nav-tab[data-tab="${tabName}"]`, { scale: 0.94 }, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1 });
    });

    window.refreshChartsForTab?.(tabName);
    loadTabData(tabName);
}

async function loadTabData(tabName) {
    switch (tabName) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'transactions':
            await loadTransactions();
            break;
        case 'budgets':
            await loadBudgets();
            break;
        case 'analytics':
            await loadAnalytics();
            break;
    }
}

async function loadDashboard() {
    try {
        setSkeleton('recentTransactions', 4);
        const [summary, recentTx, expenseData] = await Promise.all([
            fetchSummary(state.currentMonth),
            fetchRecentTransactions(5),
            fetchExpenseByCategory(state.currentMonth)
        ]);
        lastSummary = summary || {};

        const totalIncome = summary?.total_income || 0;
        const totalExpense = summary?.total_expense || 0;
        const savings = summary?.savings || (totalIncome - totalExpense);
        const savingsRate = totalIncome ? Math.round((savings / totalIncome) * 100) : 0;

        animateAmount(document.getElementById('totalIncome'), totalIncome);
        animateAmount(document.getElementById('totalExpense'), totalExpense);
        animateAmount(document.getElementById('netSavings'), savings);
        document.getElementById('netSavings').classList.toggle('amount--expense', savings < 0);
        document.getElementById('netSavings').classList.toggle('amount--savings', savings >= 0);
        document.getElementById('savingsRate').textContent = `Savings rate ${savingsRate}%`;

        renderRecentTransactions(recentTx);
        window.updateDashboardCharts?.(expenseData);
        animateDashboardLoad();
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
        container.innerHTML = emptyState('₹', `No transactions in ${formatMonth(state.currentMonth)}`, 'Add income or expenses to start seeing your financial rhythm.', true);
        return;
    }

    container.innerHTML = transactions.map(tx => transactionRow(tx, false)).join('');
    withGsap(gsap => gsap.fromTo('#recentTransactions .recent-row', { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.06, ease: 'power3.out' }));
}

async function loadTransactions() {
    try {
        document.getElementById('currentMonth').textContent = formatMonth(state.currentMonth);
        await loadCategoryFilters();
        setSkeleton('transactionsList', 5);

        const result = await fetchTransactions(state.currentMonth, state.transactionsPage, state.selectedCategoryFilter);
        renderTransactions(result.transactions);
        renderPagination(result);
    } catch (error) {
        console.error('Transactions load error:', error);
    }
}

async function loadCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    if (!container) return;
    if (state.categories.length === 0) state.categories = await fetchCategories();

    const expenseCategories = state.categories.filter(c => c.type === 'expense');
    container.innerHTML = `
        <button class="category-pill ${!state.selectedCategoryFilter ? 'active' : ''}" type="button" data-category="">All</button>
        ${expenseCategories.map(cat => `
            <button class="category-pill ${state.selectedCategoryFilter === cat.id ? 'active' : ''}" type="button" data-category="${cat.id}">
                <span>${cat.icon}</span><span>${escapeHtml(cat.name)}</span>
            </button>
        `).join('')}
    `;

    container.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const categoryId = pill.dataset.category;
            state.selectedCategoryFilter = categoryId ? parseInt(categoryId, 10) : null;
            state.transactionsPage = 1;
            loadTransactions();
        });
    });
}

function renderTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
        container.innerHTML = emptyState('0', `No expenses in ${formatMonth(state.currentMonth)}`, 'Switch months, clear the filter, or add your first transaction for this period.', true);
        return;
    }

    const groups = {};
    transactions.forEach(tx => {
        const key = formatDate(tx.date, true);
        if (!groups[key]) groups[key] = [];
        groups[key].push(tx);
    });

    container.innerHTML = Object.entries(groups).map(([date, txs]) => `
        <section class="date-group">
            <div class="date-heading">${date}</div>
            <div class="transaction-stack">${txs.map(tx => transactionRow(tx, true)).join('')}</div>
        </section>
    `).join('');

    withGsap(gsap => gsap.fromTo('#transactionsList .transaction-row', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: 'power3.out' }));
}

function transactionRow(tx, withActions) {
    const type = tx.category_type === 'income' ? 'income' : 'expense';
    const rowClass = withActions ? 'transaction-row' : 'recent-row';
    return `
        <div class="${rowClass}">
            <div class="category-avatar" style="background:${tx.category_color || '#7C3AED'}22;">${tx.category_icon || '₹'}</div>
            <div class="transaction-copy">
                <strong>${escapeHtml(tx.category_name || 'Uncategorised')}</strong>
                <span>${escapeHtml(tx.description || 'No description')}</span>
            </div>
            <div class="transaction-meta">
                <div class="transaction-amount ${type}">${formatAmount(tx.amount, type)}</div>
                <div class="transaction-date">${withActions ? escapeHtml(tx.date) : formatDate(tx.date)}</div>
            </div>
            ${withActions ? `
                <div class="row-actions">
                    <button class="icon-button" type="button" onclick="openEditModal(${tx.id})" aria-label="Edit transaction">✎</button>
                    <button class="icon-button danger-button" type="button" onclick="deleteTx(${tx.id}, this)" aria-label="Delete transaction">×</button>
                </div>
            ` : ''}
        </div>
    `;
}

function renderPagination(result) {
    const { page, total, limit } = result;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    document.getElementById('pageInfo').textContent = `Page ${page} of ${totalPages}`;
    document.getElementById('prevPage').disabled = page <= 1;
    document.getElementById('nextPage').disabled = page >= totalPages;
}

function changeMonth(direction) {
    if (monthNavLocked) return;
    monthNavLocked = true;
    setTimeout(() => { monthNavLocked = false; }, 300);

    const [year, month] = state.currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + direction, 1);
    state.currentMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    state.transactionsPage = 1;
    animateMonthButton(direction > 0 ? 'nextMonth' : 'prevMonth');
    loadTabData(state.currentTab);
}

async function loadBudgets() {
    try {
        document.getElementById('budgetMonth').textContent = formatMonth(budgetMonth);
        setSkeleton('budgetCards', 3);
        const healthData = await fetchBudgetHealth(budgetMonth);
        renderBudgetCards(healthData);
    } catch (error) {
        console.error('Budgets load error:', error);
    }
}

function renderBudgetCards(budgets) {
    const container = document.getElementById('budgetCards');
    if (!container) return;

    if (!budgets || budgets.length === 0) {
        container.innerHTML = emptyState('₹', `No budgets set for ${formatMonth(budgetMonth)}`, 'Set your first budget to stay on track before the month gets away from you.', false);
        return;
    }

    container.innerHTML = budgets.map(budget => {
        const spent = Number(budget.spent_amount || 0);
        const cap = Number(budget.budget_amount || 0);
        const percentage = cap ? (spent / cap) * 100 : 0;
        const status = percentage >= 100 ? 'Over Budget' : percentage >= 80 ? 'Warning' : 'On Track';
        const statusClass = percentage >= 100 ? 'status-danger' : percentage >= 80 ? 'status-warning' : 'status-good';
        const color = percentage >= 100 ? 'var(--color-expense)' : percentage >= 80 ? 'var(--color-warning)' : percentage >= 50 ? '#F97316' : 'var(--color-income)';
        const overspent = spent > cap ? `<p class="overspent">Overspent by ${formatCurrency(spent - cap)}</p>` : '';

        return `
            <article class="panel budget-card" data-animate>
                <div class="budget-top">
                    <div class="category-avatar" style="background:${budget.category_color || '#7C3AED'}22;">${budget.category_icon || '₹'}</div>
                    <div>
                        <h2>${escapeHtml(budget.category_name || 'Budget')}</h2>
                        <span class="status-badge ${statusClass}">${status}</span>
                    </div>
                </div>
                <div class="budget-amounts">
                    <span>${formatCurrency(spent)}</span>
                    <span style="color:var(--color-muted)"> / ${formatCurrency(cap)}</span>
                </div>
                <div class="progress-track" aria-label="${status}: ${Math.round(percentage)} percent spent">
                    <div class="progress-fill" style="--progress-color:${color}; width:${Math.min(percentage, 100)}%"></div>
                </div>
                ${overspent}
            </article>
        `;
    }).join('');

    withGsap(gsap => gsap.fromTo('#budgetCards .budget-card', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power3.out' }));
}

function changeBudgetMonth(direction) {
    if (monthNavLocked) return;
    monthNavLocked = true;
    setTimeout(() => { monthNavLocked = false; }, 300);

    const [year, month] = budgetMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + direction, 1);
    budgetMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    animateMonthButton(direction > 0 ? 'nextBudgetMonth' : 'prevBudgetMonth');
    loadBudgets();
}

async function loadAnalytics() {
    try {
        const [trendData, categoryData] = await Promise.all([
            fetchTrendData(6),
            fetchExpenseByCategory(state.currentMonth)
        ]);
        window.updateAnalyticsCharts?.(trendData, categoryData);
        renderTopCategories(categoryData.slice(0, 3));
    } catch (error) {
        console.error('Analytics load error:', error);
    }
}

function renderTopCategories(categories) {
    const container = document.getElementById('topCategories');
    const insight = document.getElementById('insightChip');
    if (!container) return;

    if (!categories || categories.length === 0) {
        container.innerHTML = emptyState('₹', 'No spending pattern yet', 'Add expenses this month to surface your top categories.', false);
        if (insight) insight.textContent = 'No category signal for this month yet';
        return;
    }

    const total = categories.reduce((sum, cat) => sum + Number(cat.total || 0), 0);
    if (insight) {
        const top = categories[0];
        const pct = total ? Math.round((Number(top.total || 0) / total) * 100) : 0;
        insight.textContent = `${top.icon || '₹'} ${top.name} is ${pct}% of your top tracked spend`;
    }

    container.innerHTML = categories.map((cat, index) => {
        const pct = total ? Math.round((Number(cat.total || 0) / total) * 100) : 0;
        return `
            <div class="top-category-row">
                <div class="rank-pill">${index + 1}</div>
                <div class="category-avatar" style="background:${cat.color || '#7C3AED'}22;">${cat.icon || '₹'}</div>
                <div class="top-copy" style="flex:1">
                    <strong>${escapeHtml(cat.name)}</strong>
                    <span>${pct}% of top categories</span>
                    <div class="inline-bar"><span style="width:${pct}%; background:${cat.color || 'var(--color-accent)'}"></span></div>
                </div>
                <div class="top-amount">${formatCurrency(cat.total)}</div>
            </div>
        `;
    }).join('');
}

function openTransactionModal(editId = null) {
    const modal = document.getElementById('transactionModal');
    const title = document.getElementById('modalTitle');
    if (!modal || !title) return;

    if (editId) {
        title.textContent = 'Edit Transaction';
        state.editingTransactionId = editId;
        loadTransactionForEdit(editId);
    } else {
        title.textContent = 'Add Transaction';
        state.editingTransactionId = null;
        resetTransactionForm();
    }

    modal.classList.remove('hidden');
    withGsap(gsap => gsap.fromTo(modal.querySelector('.modal-card'), { opacity: 0, scale: 0.94, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power3.out' }));
    setTimeout(() => document.getElementById('category')?.focus(), 50);
}

function closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    state.editingTransactionId = null;
    resetTransactionForm();
}

function resetTransactionForm() {
    const form = document.getElementById('transactionForm');
    form?.reset();
    state.transactionType = 'expense';
    document.getElementById('date').value = new Date().toISOString().slice(0, 10);
    updateTypeButtons();
    populateCategorySelect('category');
    updateDescriptionCount();
}

function updateTypeButtons() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === state.transactionType);
    });
}

function populateCategorySelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const type = selectId === 'budgetCategory' ? 'expense' : state.transactionType;
    const filteredCategories = state.categories.filter(c => c.type === type);
    select.innerHTML = `
        <option value="">Select category</option>
        ${filteredCategories.map(cat => `<option value="${cat.id}">${cat.icon} ${escapeHtml(cat.name)}</option>`).join('')}
    `;
}

async function loadTransactionForEdit(id) {
    try {
        const result = await fetchTransactions(state.currentMonth, 1, null);
        const tx = result.transactions.find(t => t.id === id);
        if (!tx) {
            showToast('Open the transaction month before editing this item', 'error');
            return;
        }

        state.transactionType = tx.category_type;
        updateTypeButtons();
        populateCategorySelect('category');
        document.getElementById('transactionId').value = tx.id;
        document.getElementById('category').value = tx.category_id;
        document.getElementById('amount').value = tx.amount;
        document.getElementById('description').value = tx.description || '';
        document.getElementById('date').value = tx.date;
        updateDescriptionCount();
    } catch (error) {
        console.error('Error loading transaction:', error);
    }
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const data = {
        category_id: parseInt(document.getElementById('category').value, 10),
        amount: parseFloat(document.getElementById('amount').value),
        description: document.getElementById('description').value,
        date: document.getElementById('date').value
    };

    try {
        if (state.editingTransactionId) {
            await updateTransaction(state.editingTransactionId, data);
            showToast('Transaction updated successfully');
        } else {
            await createTransaction(data);
            showToast('Transaction added successfully');
        }
        closeTransactionModal();
        loadTabData(state.currentTab);
    } catch (error) {
        // apiCall already reports the error.
    }
}

window.openEditModal = openTransactionModal;

async function deleteTx(id, button = null) {
    if (button) {
        withGsap(gsap => gsap.fromTo(button, { x: -4 }, { x: 4, duration: 0.05, repeat: 5, yoyo: true, clearProps: 'x' }));
    }
    if (!confirm('Delete this transaction? This will remove it from your rupee trail.')) return;

    try {
        await deleteTransaction(id);
        showToast('Transaction deleted');
        loadTabData(state.currentTab);
    } catch (error) {
        // apiCall already reports the error.
    }
}

window.deleteTx = deleteTx;

function openBudgetModal() {
    const modal = document.getElementById('budgetModal');
    if (!modal) return;
    populateCategorySelect('budgetCategory');
    document.getElementById('budgetMonthInput').value = budgetMonth;
    modal.classList.remove('hidden');
    withGsap(gsap => gsap.fromTo(modal.querySelector('.modal-card'), { opacity: 0, scale: 0.94, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power3.out' }));
    setTimeout(() => document.getElementById('budgetCategory')?.focus(), 50);
}

function closeBudgetModal() {
    const modal = document.getElementById('budgetModal');
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    document.getElementById('budgetForm')?.reset();
}

async function handleBudgetSubmit(e) {
    e.preventDefault();
    const data = {
        category_id: parseInt(document.getElementById('budgetCategory').value, 10),
        amount: parseFloat(document.getElementById('budgetAmount').value),
        month: document.getElementById('budgetMonthInput').value
    };

    try {
        await createBudget(data);
        showToast('Budget created successfully');
        closeBudgetModal();
        loadBudgets();
    } catch (error) {
        // apiCall already reports the error.
    }
}

function initScrollAnimations() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

function initFormValidation() {
    const inputs = document.querySelectorAll('input[required], select[required]');
    inputs.forEach(input => {
        const wrapper = input.closest('.field') || input.parentElement;
        input.addEventListener('input', () => validateInput(input, wrapper));
        input.addEventListener('blur', () => validateInput(input, wrapper));
    });
}

function validateInput(input, wrapper) {
    let errorEl = wrapper?.querySelector('.error-message');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        wrapper?.appendChild(errorEl);
    }

    if (input.value && input.checkValidity()) {
        input.classList.add('input-valid');
        input.classList.remove('input-invalid');
        errorEl.textContent = '';
    } else if (input.value || document.activeElement !== input) {
        input.classList.toggle('input-invalid', !input.checkValidity());
        input.classList.remove('input-valid');
        errorEl.textContent = input.checkValidity() ? '' : input.validationMessage;
    }
}

function setSkeleton(containerId, rows = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Array.from({ length: rows }, () => '<div class="skeleton skeleton-row"></div>').join('');
}

function emptyState(icon, title, copy, withCta) {
    return `
        <div class="empty-state">
            <div class="empty-illustration">${icon}</div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(copy)}</p>
            ${withCta ? '<button class="primary-action" type="button" onclick="openEditModal()">Add Transaction</button>' : ''}
        </div>
    `;
}

function animateDashboardLoad() {
    withGsap(gsap => {
        gsap.fromTo('.summary-grid .metric-card', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: 'power4.out' });
        gsap.fromTo('.chart-panel canvas', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' });
    });
}

function animateMonthButton(id) {
    withGsap(gsap => gsap.fromTo(`#${id}`, { rotate: -10, scale: 0.95 }, { rotate: 0, scale: 1, duration: 0.25, ease: 'back.out(2)' }));
}

function updateDescriptionCount() {
    const input = document.getElementById('description');
    const counter = document.getElementById('descriptionCount');
    if (input && counter) counter.textContent = `${input.value.length}/80`;
}

function initHeaderScrollState() {
    const header = document.getElementById('appHeader');
    window.addEventListener('scroll', () => {
        header?.classList.toggle('is-scrolled', window.scrollY > 8);
    }, { passive: true });
}

function initChatWidget() {
    const widget = document.getElementById('chatWidget');
    const toggle = document.getElementById('chatToggle');
    const panel = document.getElementById('chatPanel');
    const close = document.getElementById('closeChat');
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');

    if (!widget || !toggle || !panel || !input || !send) return;

    const openChat = () => {
        panel.classList.remove('hidden');
        widget.classList.add('is-open');
        toggle.setAttribute('aria-label', 'Close AI Advisor Chat');
        setTimeout(() => input.focus(), 40);
        withGsap(gsap => gsap.fromTo(panel, { opacity: 0, y: 18, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'power3.out' }));
    };

    const closeChat = () => {
        panel.classList.add('hidden');
        widget.classList.remove('is-open');
        toggle.setAttribute('aria-label', 'Open AI Advisor Chat');
    };

    toggle.addEventListener('click', () => {
        if (panel.classList.contains('hidden')) openChat();
        else closeChat();
    });
    close?.addEventListener('click', closeChat);
    send.addEventListener('click', handleChatSubmit);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleChatSubmit();
        }
    });
}

async function handleChatSubmit() {
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');
    if (!input || !send) return;

    const message = input.value.trim();
    if (!message) return;

    appendChatMessage(message, 'user');
    input.value = '';
    input.disabled = true;
    send.disabled = true;

    const pending = appendChatMessage('Thinking through your rupee trail...', 'assistant', true);

    try {
        const target = beginStreamingChatResponse(pending);
        const fullText = await streamChatMessage(message, chunk => {
            target.textContent += chunk;
            scrollChatToBottom();
        });
        if (!fullText.trim()) {
            target.textContent = 'I could not generate an answer from the current data.';
        }
    } catch (error) {
        renderChatResponse(pending, error.message || 'The AI advisor is unavailable right now. Please try again.');
    } finally {
        input.disabled = false;
        send.disabled = false;
        input.focus();
    }
}

function appendChatMessage(content, role, pending = false) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return null;

    const message = document.createElement('div');
    message.className = `message ${role}${pending ? ' is-pending' : ''}`;
    message.innerHTML = `<p>${escapeHtml(content)}</p>`;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
}

function renderChatResponse(element, text) {
    if (!element) return;
    element.classList.remove('is-pending');

    if (!window.gsap || !hasMotion()) {
        element.innerHTML = `<p>${escapeHtml(text)}</p>`;
        document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
        return;
    }

    element.innerHTML = '<p></p>';
    const target = element.querySelector('p');
    const chars = String(text).split('');
    let index = 0;
    const timer = setInterval(() => {
        target.textContent += chars[index] || '';
        index += 1;
        document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
        if (index >= chars.length) clearInterval(timer);
    }, 10);
}

function beginStreamingChatResponse(element) {
    element.classList.remove('is-pending');
    element.innerHTML = '<p></p>';
    return element.querySelector('p');
}

function scrollChatToBottom() {
    const messages = document.getElementById('chatMessages');
    if (messages) messages.scrollTop = messages.scrollHeight;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        initTheme();
        initScrollAnimations();
        initFormValidation();
        initHeaderScrollState();
        initChatWidget();

        state.categories = await fetchCategories();
        window.initializeCharts?.();

        document.querySelectorAll('.nav-tab, .mobile-nav-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        document.querySelectorAll('.view-all-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        document.getElementById('addTransactionBtn')?.addEventListener('click', () => openTransactionModal());
        document.getElementById('prevMonth')?.addEventListener('click', () => changeMonth(-1));
        document.getElementById('nextMonth')?.addEventListener('click', () => changeMonth(1));
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (state.transactionsPage > 1) {
                state.transactionsPage--;
                loadTransactions();
            }
        });
        document.getElementById('nextPage')?.addEventListener('click', () => {
            state.transactionsPage++;
            loadTransactions();
        });
        document.getElementById('prevBudgetMonth')?.addEventListener('click', () => changeBudgetMonth(-1));
        document.getElementById('nextBudgetMonth')?.addEventListener('click', () => changeBudgetMonth(1));
        document.getElementById('addBudgetBtn')?.addEventListener('click', openBudgetModal);

        document.getElementById('closeModal')?.addEventListener('click', closeTransactionModal);
        document.getElementById('cancelBtn')?.addEventListener('click', closeTransactionModal);
        document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
        document.getElementById('description')?.addEventListener('input', updateDescriptionCount);

        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.transactionType = btn.dataset.type;
                updateTypeButtons();
                populateCategorySelect('category');
            });
        });

        document.getElementById('closeBudgetModal')?.addEventListener('click', closeBudgetModal);
        document.getElementById('cancelBudgetBtn')?.addEventListener('click', closeBudgetModal);
        document.getElementById('budgetForm')?.addEventListener('submit', handleBudgetSubmit);

        document.getElementById('transactionModal')?.addEventListener('click', e => {
            if (e.target.id === 'transactionModal') closeTransactionModal();
        });
        document.getElementById('budgetModal')?.addEventListener('click', e => {
            if (e.target.id === 'budgetModal') closeBudgetModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeTransactionModal();
                closeBudgetModal();
            }
        });

        await loadDashboard();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize app', 'error');
    }
});
