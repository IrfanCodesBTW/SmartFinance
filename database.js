const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
const dbPath = path.join(__dirname, 'smartfinance.db');

// ============================================
// Database Initialization
// ============================================

async function initializeDatabase() {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.run(schema);

    // Run seed data
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    db.run(seed);

    // Save to file
    saveDatabase();
    console.log('Database initialized with schema and seed data');
    return db;
}

function saveDatabase() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

// ============================================
// Helper Functions
// ============================================

function queryAll(sql, params = []) {
    const stmt = getDb().prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results[0] || null;
}

function runQuery(sql, params = []) {
    getDb().run(sql, params);
    saveDatabase();
    return { lastID: getDb().getRowsModified() };
}

// ============================================
// User Functions - MODULE I: Entity-Relationship
// ============================================

function getUserById(userId) {
    // MODULE I: Entity extraction from Users table
    return queryOne('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
}

function getAllUsers() {
    return queryAll('SELECT id, name, email, created_at FROM users');
}

// ============================================
// Category Functions - MODULE II: Relational Model
// ============================================

function getAllCategories() {
    // MODULE II: Simple SELECT from categories table
    return queryAll('SELECT * FROM categories ORDER BY type, name');
}

function getCategoriesByType(type) {
    return queryAll('SELECT * FROM categories WHERE type = ? ORDER BY name', [type]);
}

function getCategoryById(categoryId) {
    return queryOne('SELECT * FROM categories WHERE id = ?', [categoryId]);
}

// ============================================
// Transaction Functions - MODULE IV, V, VI: SQL Operations
// ============================================

function getTransactions(params) {
    // MODULE IV: Relational algebra - SELECT with filters
    // MODULE V: Aggregation with pagination
    const { month, category_id, page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    let query = `
        SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color, c.type as category_type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = 1
    `;
    const queryParams = [];

    if (month) {
        query += ' AND strftime("%Y-%m", t.date) = ?';
        queryParams.push(month);
    }
    if (category_id) {
        query += ' AND t.category_id = ?';
        queryParams.push(category_id);
    }

    query += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const transactions = queryAll(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE user_id = 1';
    const countParams = [];
    if (month) {
        countQuery += ' AND strftime("%Y-%m", date) = ?';
        countParams.push(month);
    }
    if (category_id) {
        countQuery += ' AND category_id = ?';
        countParams.push(category_id);
    }

    const total = queryOne(countQuery, countParams)?.total || 0;

    return { transactions, total, page, limit };
}

function createTransaction(transaction) {
    // MODULE II: INSERT - create new transaction
    const { user_id, category_id, amount, description, date } = transaction;
    runQuery(`
        INSERT INTO transactions (user_id, category_id, amount, description, date)
        VALUES (?, ?, ?, ?, ?)
    `, [user_id, category_id, amount, description, date]);

    const lastId = queryOne('SELECT last_insert_rowid() as id');
    return { id: lastId.id, ...transaction };
}

function updateTransaction(id, transaction) {
    // MODULE II: UPDATE - modify existing transaction
    const { category_id, amount, description, date } = transaction;
    runQuery(`
        UPDATE transactions
        SET category_id = ?, amount = ?, description = ?, date = ?
        WHERE id = ? AND user_id = 1
    `, [category_id, amount, description, date, id]);

    return true;
}

function deleteTransaction(id) {
    // MODULE II: DELETE - remove transaction
    runQuery('DELETE FROM transactions WHERE id = ? AND user_id = 1', [id]);
    return true;
}

function getRecentTransactions(limit = 5) {
    // MODULE V: Aggregation with LIMIT
    return queryAll(`
        SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color, c.type as category_type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = 1
        ORDER BY t.date DESC, t.id DESC
        LIMIT ?
    `, [limit]);
}

// ============================================
// Summary Functions - MODULE V, VI: Aggregation Views
// ============================================

function getMonthlySummary(month) {
    // MODULE V: Uses VIEW with GROUP BY and CASE for conditional aggregation
    return queryOne('SELECT * FROM monthly_summary WHERE month = ?', [month]);
}

function getBudgetHealth(month) {
    // MODULE V, VI: Uses VIEW but allows filtering by month
    const query = month
        ? 'SELECT * FROM budget_health WHERE month = ?'
        : 'SELECT * FROM budget_health';
    return month ? queryAll(query, [month]) : queryAll(query);
}

// ============================================
// Budget Functions - MODULE II, III: CRUD Operations
// ============================================

function getBudgets(month) {
    // MODULE II: SELECT with optional filter
    if (month) {
        return queryAll(`
            SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = 1 AND b.month = ?
            ORDER BY c.name
        `, [month]);
    }
    return queryAll(`
        SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = 1
        ORDER BY b.month DESC, c.name
    `);
}

function upsertBudget(budget) {
    // MODULE II: INSERT OR REPLACE - upsert operation
    const { user_id, category_id, amount, month } = budget;
    runQuery(`
        INSERT OR REPLACE INTO budgets (user_id, category_id, amount, month)
        VALUES (?, ?, ?, ?)
    `, [user_id, category_id, amount, month]);
    return { user_id, category_id, amount, month };
}

function deleteBudget(id) {
    runQuery('DELETE FROM budgets WHERE id = ? AND user_id = 1', [id]);
    return true;
}

// ============================================
// Analytics Functions - MODULE V, VI: Advanced Queries
// ============================================

function getTrendData(months = 6) {
    // MODULE V: Aggregation across multiple months
    return queryAll(`
        SELECT * FROM monthly_summary
        ORDER BY month DESC
        LIMIT ?
    `, [months]);
}

function getCategoryBreakdown(month) {
    // MODULE V: Direct aggregation instead of hardcoded view to support month filtering
    return queryAll(`
        SELECT
            c.id as category_id,
            c.name as category_name,
            c.icon as category_icon,
            c.color as category_color,
            c.type as category_type,
            SUM(t.amount) as total_amount,
            COUNT(*) as transaction_count
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = 1
            AND c.type = 'expense'
            AND strftime('%Y-%m', t.date) = ?
        GROUP BY c.id, c.name, c.icon, c.color, c.type
        ORDER BY total_amount DESC
        LIMIT 5
    `, [month]);
}

function getExpenseByCategory(month) {
    // MODULE V: GROUP BY category with conditional sum
    return queryAll(`
        SELECT c.id, c.name, c.icon, c.color,
               SUM(t.amount) as total, COUNT(*) as count
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = 1
            AND c.type = 'expense'
            AND strftime('%Y-%m', t.date) = ?
        GROUP BY c.id, c.name, c.icon, c.color
        ORDER BY total DESC
    `, [month]);
}

function getCategoryHistory(months = 3) {
    // Get historical spend per category for the last N months (excluding current)
    const currentMonth = new Date().toISOString().slice(0, 7);
    return queryAll(`
        SELECT
            c.id as category_id,
            c.name as category_name,
            strftime('%Y-%m', t.date) as month,
            SUM(t.amount) as total_amount
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = 1
            AND c.type = 'expense'
            AND strftime('%Y-%m', t.date) < ?
        GROUP BY c.id, c.name, month
        ORDER BY month DESC, total_amount DESC
    `, [currentMonth]); 
}

function getCurrentMonthDay() {
    return new Date().getDate();
}

// ============================================
// Recurring Transactions - MODULE II: Additional Entity
// ============================================

function getRecurringTransactions() {
    return queryAll(`
        SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM recurring_transactions r
        JOIN categories c ON r.category_id = c.id
        WHERE r.user_id = 1
        ORDER BY r.next_due_date
    `);
}

function createRecurringTransaction(transaction) {
    const { user_id, category_id, amount, description, frequency, next_due_date } = transaction;
    runQuery(`
        INSERT INTO recurring_transactions (user_id, category_id, amount, description, frequency, next_due_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [user_id, category_id, amount, description, frequency, next_due_date]);

    const lastId = queryOne('SELECT last_insert_rowid() as id');
    return { id: lastId.id, ...transaction };
}

function deleteRecurringTransaction(id) {
    runQuery('DELETE FROM recurring_transactions WHERE id = ? AND user_id = 1', [id]);
    return true;
}

// ============================================
// Export all functions
// ============================================

module.exports = {
    initializeDatabase,
    getUserById,
    getAllUsers,
    getAllCategories,
    getCategoriesByType,
    getCategoryById,
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getRecentTransactions,
    getMonthlySummary,
    getBudgetHealth,
    getBudgets,
    upsertBudget,
    deleteBudget,
    getTrendData,
    getCategoryBreakdown,
    getExpenseByCategory,
    getCategoryHistory,
    getCurrentMonthDay,
    getRecurringTransactions,
    createRecurringTransaction,
    deleteRecurringTransaction
};