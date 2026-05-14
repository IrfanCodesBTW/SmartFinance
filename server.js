const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const Groq = require('groq-sdk');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database (async)
let dbReady = false;
database.initializeDatabase().then(() => {
    dbReady = true;
    console.log('Database ready');
}).catch(err => {
    console.error('Failed to initialize database:', err);
});

// Helper function for API responses
function apiResponse(res, success, data = null, error = null) {
    if (success) {
        res.json({ success: true, data });
    } else {
        res.status(400).json({ success: false, error });
    }
}

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function buildFinanceAdvisorPrompt({ month, summary, trend, breakdown }) {
    return `You are a personal finance advisor for an Indian college student.
Their financial data this month (${month}): ${JSON.stringify(summary)}
Category breakdown: ${JSON.stringify(breakdown)}
Six-month trend: ${JSON.stringify(trend)}
Answer concisely. Use ₹ for amounts. Be practical.
If the user asks about a category, use the category names and totals from the JSON.
Do not invent transactions or amounts that are not present in the data.`;
}

// ============================================
// Categories API - MODULE II: Read operations
// ============================================

app.get('/api/categories', (req, res) => {
    try {
        const categories = database.getAllCategories();
        apiResponse(res, true, categories);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

// ============================================
// Transactions API - MODULE IV, V: Query Operations
// ============================================

app.get('/api/transactions', (req, res) => {
    try {
        const { month, category_id, page, limit } = req.query;
        const result = database.getTransactions({
            month,
            category_id: category_id ? parseInt(category_id) : undefined,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10
        });
        apiResponse(res, true, result);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.post('/api/transactions', (req, res) => {
    try {
        const { category_id, amount, description, date } = req.body;

        // Validation
        if (!category_id || !amount || !date) {
            return apiResponse(res, false, null, 'category_id, amount, and date are required');
        }
        if (amount <= 0) {
            return apiResponse(res, false, null, 'amount must be greater than 0');
        }

        const transaction = database.createTransaction({
            user_id: 1,
            category_id,
            amount,
            description: description || '',
            date
        });
        apiResponse(res, true, transaction);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.put('/api/transactions/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { category_id, amount, description, date } = req.body;

        if (!category_id || !amount || !date) {
            return apiResponse(res, false, null, 'category_id, amount, and date are required');
        }

        const updated = database.updateTransaction(parseInt(id), {
            category_id,
            amount,
            description: description || '',
            date
        });

        if (updated) {
            apiResponse(res, true, { id: parseInt(id) });
        } else {
            apiResponse(res, false, null, 'Transaction not found');
        }
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.delete('/api/transactions/:id', (req, res) => {
    try {
        const { id } = req.params;
        const deleted = database.deleteTransaction(parseInt(id));

        if (deleted) {
            apiResponse(res, true, { id: parseInt(id) });
        } else {
            apiResponse(res, false, null, 'Transaction not found');
        }
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

// ============================================
// Summary API - MODULE V: Aggregation View
// ============================================

app.get('/api/summary', (req, res) => {
    try {
        const { month } = req.query;
        if (!month) {
            return apiResponse(res, false, null, 'month parameter is required (YYYY-MM)');
        }
        const summary = database.getMonthlySummary(month);
        apiResponse(res, true, summary || { month, total_income: 0, total_expense: 0, savings: 0 });
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.get('/api/recent-transactions', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const transactions = database.getRecentTransactions(limit);
        apiResponse(res, true, transactions);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

// ============================================
// Budgets API - MODULE II: CRUD Operations
// ============================================

app.get('/api/budgets', (req, res) => {
    try {
        const { month } = req.query;
        const budgets = database.getBudgets(month);
        apiResponse(res, true, budgets);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.post('/api/budgets', (req, res) => {
    try {
        const { category_id, amount, month } = req.body;

        if (!category_id || !amount || !month) {
            return apiResponse(res, false, null, 'category_id, amount, and month are required');
        }

        const budget = database.upsertBudget({
            user_id: 1,
            category_id,
            amount,
            month
        });
        apiResponse(res, true, budget);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.delete('/api/budgets/:id', (req, res) => {
    try {
        const { id } = req.params;
        const deleted = database.deleteBudget(parseInt(id));

        if (deleted) {
            apiResponse(res, true, { id: parseInt(id) });
        } else {
            apiResponse(res, false, null, 'Budget not found');
        }
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

// ============================================
// Budget Health API - MODULE V: View Query
// ============================================

app.get('/api/budget-health', (req, res) => {
    try {
        const { month } = req.query;
        const health = database.getBudgetHealth(month);
        apiResponse(res, true, health);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

// ============================================
// Analytics API - MODULE V, VI: Advanced Queries
// ============================================

app.get('/api/trend', (req, res) => {
    try {
        const { months } = req.query;
        const trend = database.getTrendData(parseInt(months) || 6);
        // Reverse to get chronological order
        apiResponse(res, true, trend.reverse());
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.get('/api/category-breakdown', (req, res) => {
    try {
        const { month } = req.query;
        if (!month) {
            return apiResponse(res, false, null, 'month parameter is required (YYYY-MM)');
        }
        const breakdown = database.getCategoryBreakdown(month);
        apiResponse(res, true, breakdown);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.get('/api/expense-by-category', (req, res) => {
    try {
        const { month } = req.query;
        if (!month) {
            return apiResponse(res, false, null, 'month parameter is required (YYYY-MM)');
        }
        const expenses = database.getExpenseByCategory(month);
        apiResponse(res, true, expenses);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

// ============================================
// AI Finance Advisor Chat
// ============================================

app.post('/api/chat', async (req, res) => {
    try {
        const { message, month, stream } = req.body;
        const chatMonth = month || getCurrentMonth();

        if (!message || typeof message !== 'string' || !message.trim()) {
            return apiResponse(res, false, null, 'message is required');
        }

        if (!groq) {
            return res.status(503).json({
                success: false,
                error: 'GROQ_API_KEY is not configured. Add it to .env to enable the AI advisor.'
            });
        }

        const summary = database.getMonthlySummary(chatMonth) || {
            month: chatMonth,
            total_income: 0,
            total_expense: 0,
            savings: 0
        };
        const trend = database.getTrendData(6).reverse();
        const breakdown = database.getCategoryBreakdown(chatMonth);
        const monthlyExpenseByCategory = database.getExpenseByCategory(chatMonth);

        const systemPrompt = buildFinanceAdvisorPrompt({
            month: chatMonth,
            summary,
            trend,
            breakdown: {
                top_categories: breakdown,
                this_month_by_category: monthlyExpenseByCategory
            }
        });

        const completionParams = {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message.trim() }
            ],
            temperature: stream ? 1 : 0.35,
            top_p: 1,
            max_completion_tokens: stream ? 1024 : 450,
            stream: Boolean(stream)
        };

        if (stream) {
            const completionStream = await groq.chat.completions.create(completionParams);
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('X-Accel-Buffering', 'no');

            for await (const chunk of completionStream) {
                const token = chunk.choices?.[0]?.delta?.content || '';
                if (token) res.write(token);
            }

            return res.end();
        }

        const completion = await groq.chat.completions.create(completionParams);

        const answer = completion.choices?.[0]?.message?.content?.trim();
        apiResponse(res, true, {
            answer: answer || 'I could not generate an answer from the current financial data.',
            month: chatMonth,
            model: 'llama-3.3-70b-versatile'
        });
    } catch (error) {
        console.error('Chat advisor error:', error);
        const isAuthError = error.status === 401 || error.code === 'invalid_api_key' || error.error?.code === 'invalid_api_key';
        res.status(isAuthError ? 503 : 500).json({
            success: false,
            error: isAuthError
                ? 'Groq rejected the API key. Update GROQ_API_KEY in .env to enable the AI advisor.'
                : 'The AI advisor is unavailable right now. Please try again in a moment.'
        });
    }
});

// ============================================
// Recurring Transactions API
// ============================================

app.get('/api/recurring', (req, res) => {
    try {
        const recurring = database.getRecurringTransactions();
        apiResponse(res, true, recurring);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.post('/api/recurring', (req, res) => {
    try {
        const { category_id, amount, description, frequency, next_due_date } = req.body;

        if (!category_id || !amount || !frequency || !next_due_date) {
            return apiResponse(res, false, null, 'All fields are required');
        }

        const recurring = database.createRecurringTransaction({
            user_id: 1,
            category_id,
            amount,
            description: description || '',
            frequency,
            next_due_date
        });
        apiResponse(res, true, recurring);
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

app.delete('/api/recurring/:id', (req, res) => {
    try {
        const { id } = req.params;
        const deleted = database.deleteRecurringTransaction(parseInt(id));

        if (deleted) {
            apiResponse(res, true, { id: parseInt(id) });
        } else {
            apiResponse(res, false, null, 'Recurring transaction not found');
        }
    } catch (error) {
        apiResponse(res, false, null, error.message);
    }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`SmartFinance running at http://localhost:${PORT}`);
});
