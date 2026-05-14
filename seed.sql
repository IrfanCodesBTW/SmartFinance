-- SmartFinance Seed Data
-- 3 months of realistic Indian college student transactions

-- Insert user
INSERT OR IGNORE INTO users (id, name, email) VALUES (1, 'Irfan', 'irfan@example.com');

-- MODULE III: Data Types - Insert categories with specific types
-- Income categories (type = 'income')
INSERT OR IGNORE INTO categories (id, name, type, icon, color) VALUES
(1, 'Pocket Money', 'income', '💰', '#3FB950'),
(2, 'Freelance', 'income', '💻', '#58A6FF'),
(3, 'Stipend', 'income', '🎓', '#A371F7'),
(4, 'Part-Time', 'income', '⚡', '#F0883E'),
(5, 'Other Income', 'income', '✨', '#3FB950');

-- Expense categories (type = 'expense')
INSERT OR IGNORE INTO categories (id, name, type, icon, color) VALUES
(6, 'UPI Payment', 'expense', '📱', '#58A6FF'),
(7, 'Mess/Food', 'expense', '🍱', '#F0883E'),
(8, 'Tea & Snacks', 'expense', '☕', '#E3B341'),
(9, 'Transport', 'expense', '🛺', '#58A6FF'),
(10, 'Mobile Recharge', 'expense', '📶', '#A371F7'),
(11, 'Entertainment', 'expense', '🎬', '#F85149'),
(12, 'Shopping', 'expense', '🛍️', '#E3B341'),
(13, 'Subscription', 'expense', '📺', '#A371F7'),
(14, 'Rent', 'expense', '🏠', '#F85149'),
(15, 'Medical', 'expense', '💊', '#3FB950'),
(16, 'Other', 'expense', '📦', '#8B949E');

-- March 2026 Transactions
INSERT INTO transactions (user_id, category_id, amount, description, date) VALUES
(1, 1, 8000, 'Monthly pocket money received', '2026-03-01'),
(1, 7, 2500, 'Mess fee for March', '2026-03-02'),
(1, 6, 350, 'UPI - Ordered food from Zomato', '2026-03-03'),
(1, 9, 80, 'Auto to college', '2026-03-04'),
(1, 8, 40, 'Tea and pakoras with friends', '2026-03-05'),
(1, 10, 239, 'Jio recharge - 1.5GB/day', '2026-03-06'),
(1, 6, 450, 'UPI - Swiggy dinner', '2026-03-08'),
(1, 11, 299, 'Netflix monthly subscription', '2026-03-10'),
(1, 9, 120, 'Auto rickshaw fare to mall', '2026-03-12'),
(1, 8, 60, 'Tea and samosa at canteen', '2026-03-13'),
(1, 2, 3500, 'Freelance web development project', '2026-03-15'),
(1, 6, 280, 'UPI - Grocery shopping', '2026-03-16'),
(1, 12, 850, 'Bought a new t-shirt and jeans', '2026-03-18'),
(1, 9, 150, 'Bus pass renewal', '2026-03-20'),
(1, 8, 35, 'Evening tea and biscuits', '2026-03-21'),
(1, 6, 520, 'UPI - Dinner with friends', '2026-03-22'),
(1, 14, 3500, 'Room rent for March', '2026-03-25'),
(1, 16, 200, 'Printing and stationery', '2026-03-27'),
(1, 8, 45, 'Tea during library study', '2026-03-28'),
(1, 6, 180, 'UPI - Late night snacks', '2026-03-30');

-- April 2026 Transactions
INSERT INTO transactions (user_id, category_id, amount, description, date) VALUES
(1, 1, 8000, 'Monthly pocket money received', '2026-04-01'),
(1, 7, 2500, 'Mess fee for April', '2026-04-02'),
(1, 10, 239, 'Airtel recharge', '2026-04-03'),
(1, 6, 420, 'UPI - Ordered biryani', '2026-04-05'),
(1, 9, 60, 'Auto to tuition center', '2026-04-06'),
(1, 8, 55, 'Tea and槟榔at campus', '2026-04-07'),
(1, 6, 380, 'UPI - Swiggy lunch', '2026-04-09'),
(1, 11, 149, 'Spotify premium', '2026-04-10'),
(1, 3, 5000, 'Monthly stipend from college', '2026-04-12'),
(1, 8, 40, 'Tea during break', '2026-04-13'),
(1, 9, 200, 'Fuel for bike', '2026-04-15'),
(1, 6, 560, 'UPI - Weekend outing', '2026-04-17'),
(1, 12, 450, 'Bought textbooks', '2026-04-18'),
(1, 8, 30, 'Evening tea', '2026-04-19'),
(1, 6, 290, 'UPI - Grocery items', '2026-04-20'),
(1, 14, 3500, 'Room rent for April', '2026-04-25'),
(1, 15, 350, 'Medicine from pharmacy', '2026-04-26'),
(1, 2, 2500, 'Freelance logo design', '2026-04-28'),
(1, 8, 50, 'Tea and snacks during exam prep', '2026-04-29'),
(1, 6, 200, 'UPI - Snacks after exam', '2026-04-30');

-- May 2026 Transactions (Current month with partial data)
INSERT INTO transactions (user_id, category_id, amount, description, date) VALUES
(1, 1, 8000, 'Monthly pocket money received', '2026-05-01'),
(1, 7, 2500, 'Mess fee for May', '2026-05-02'),
(1, 10, 239, 'Jio 5G recharge', '2026-05-03'),
(1, 6, 480, 'UPI - Dinner at restaurant', '2026-05-04'),
(1, 9, 90, 'Auto to interview', '2026-05-05'),
(1, 8, 45, 'Tea with seniors', '2026-05-06'),
(1, 13, 599, 'Amazon Prime annual', '2026-05-07'),
(1, 6, 350, 'UPI - Food delivery', '2026-05-08'),
(1, 8, 60, 'Ice tea and chat', '2026-05-09'),
(1, 11, 299, 'SonyLIV subscription', '2026-05-10'),
(1, 9, 180, 'Metro card recharge', '2026-05-11'),
(1, 4, 3000, 'Part-time tutoring income', '2026-05-12'),
(1, 6, 420, 'UPI - Grocery shopping', '2026-05-13'),
(1, 8, 35, 'Morning tea', '2026-05-13'),
(1, 14, 3500, 'Room rent for May', '2026-05-14'),
(1, 12, 650, 'New sandals and belt', '2026-05-15'),
(1, 6, 550, 'UPI - Birthday treat to friend', '2026-05-16'),
(1, 16, 150, 'Miscellaneous expenses', '2026-05-17');

-- Budgets for May 2026
INSERT OR REPLACE INTO budgets (user_id, category_id, amount, month) VALUES
(1, 7, 3000, '2026-05'),  -- Mess/Food budget
(1, 9, 1000, '2026-05'),  -- Transport budget
(1, 11, 500, '2026-05');  -- Entertainment budget