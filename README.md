# SmartFinance

![SmartFinance Banner](assets/banner.png)

SmartFinance is a modern, SQL-first personal finance tracker tailored for college students, first-job professionals, and freelancers to seamlessly track their expenses, income, and budgets. Built to showcase core database management system (DBMS) principles, it provides a comprehensive backend architecture using SQLite and an elegant, responsive frontend powered by Tailwind CSS.

![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![ExpressJS](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

## 🚀 Features

- **Intuitive Dashboard:** Get a bird's-eye view of your finances with a summary of total income, expenses, and net savings for the current month.
- **Transaction Management:** Easily add, edit, and delete transactions.
- **Expense Categorization:** India-first default categories (UPI Payment, Mess/Food, Mobile Recharge, Rent, etc.) to match real-world spending habits.
- **Budgeting:** Set category-specific monthly budgets and track your progress with visually distinct progress bars.
- **Advanced Analytics:** Visualize your spending patterns with interactive Doughnut charts (category breakdown) and Line charts (6-month trends) using Chart.js.
- **Modern UI/UX:** A premium, minimal SaaS aesthetic with sticky navigation, pill-shaped buttons, and responsive grid layouts.

## 🛠️ Technology Stack

**Frontend:**
- HTML5 / Vanilla JavaScript
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [Chart.js](https://www.chartjs.org/) (Data Visualization)
- [Google Fonts](https://fonts.google.com/) (Inter typography)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/) (REST API)
- [SQLite](https://www.sqlite.org/) via `sql.js` (In-memory / File-based Database)

## 🗄️ Database Architecture

This project is built heavily around normalized relational database design (3NF), explicitly designed to demonstrate all major DBMS modules:
- Normalized schema with `users`, `categories`, `transactions`, and `budgets` tables.
- Advanced querying using `JOIN`s, subqueries, and set operations.
- Logical `VIEWS` for `monthly_summary` and `budget_health`.
- Database indexing on `date` and `category_id` for optimized queries.

*(See `SPEC.md` for a complete breakdown of DBMS module coverage.)*

## 🚀 Quick Start (Windows)

The easiest way to run the entire project (including the Valkey cache) is to use the automated startup script:

1.  Ensure **Docker Desktop** is running.
2.  Double-click **`start.bat`** in the project root.

This script will automatically:
- Check for Docker and start the **Valkey** container.
- Install any missing **npm dependencies**.
- Launch the **SmartFinance server** at [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Manual Installation & Setup

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`. The database will automatically initialize and seed itself with sample data on startup.

## 📁 Project Structure

```text
SmartFinance/
├── public/                # Frontend static assets
│   ├── index.html         # Main dashboard layout
│   ├── styles.css         # Custom CSS & Tailwind overrides
│   ├── app.js             # Frontend application logic & API calls
│   └── charts.js          # Chart.js initialization and updates
├── server.js              # Express.js server & API routes
├── database.js            # SQLite database initialization & query logic
├── schema.sql             # SQL Data Definition Language (DDL)
├── seed.sql               # SQL sample data insertion
├── package.json           # Node.js dependencies
└── SPEC.md                # Detailed project specification document
```

## 🌐 API Endpoints

The backend provides a comprehensive RESTful API:

- **Transactions:** `GET /api/transactions`, `POST /api/transactions`, `PUT /api/transactions/:id`, `DELETE /api/transactions/:id`
- **Dashboard Summary:** `GET /api/summary`, `GET /api/categories`
- **Budgets:** `GET /api/budgets`, `POST /api/budgets`, `GET /api/budget-health`
- **Analytics:** `GET /api/trend`, `GET /api/category-breakdown`, `GET /api/expense-by-category`

## 🤝 Contributing

This project is intended as a robust baseline for personal finance tracking and a demonstration of SQL capabilities. Feel free to fork, experiment, and submit pull requests if you have improvements or new features in mind!

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
#
