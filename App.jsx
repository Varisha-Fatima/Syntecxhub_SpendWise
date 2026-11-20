
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'spendwise-transactions-v2'
const BUDGET_KEY = 'spendwise-monthly-budget'

const today = new Date()
const dateOffset = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

const sampleTransactions = [
  { id: 1, title: 'Monthly Salary', category: 'Salary', date: dateOffset(1), amount: 85000, type: 'income' },
  { id: 2, title: 'Grocery Shopping', category: 'Food', date: dateOffset(2), amount: 4500, type: 'expense' },
  { id: 3, title: 'Internet Bill', category: 'Bills', date: dateOffset(3), amount: 2500, type: 'expense' },
  { id: 4, title: 'Freelance Project', category: 'Freelance', date: dateOffset(5), amount: 12000, type: 'income' },
  { id: 5, title: 'Transport', category: 'Transport', date: dateOffset(6), amount: 1800, type: 'expense' },
  { id: 6, title: 'Shopping', category: 'Shopping', date: dateOffset(8), amount: 3500, type: 'expense' },
]

const categories = ['Food', 'Bills', 'Transport', 'Shopping', 'Health', 'Education', 'Entertainment', 'Salary', 'Freelance', 'Other']

const money = (amount) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

function App() {
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : sampleTransactions
    } catch {
      return sampleTransactions
    }
  })

  const [budget, setBudget] = useState(() => {
    const saved = Number(localStorage.getItem(BUDGET_KEY))
    return saved > 0 ? saved : 50000
  })

  const [activePage, setActivePage] = useState('Dashboard')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    type: 'expense',
    date: today.toISOString().slice(0, 10),
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, String(budget))
  }, [budget])

  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const thisMonthTransactions = transactions.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  const income = thisMonthTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0)

  const expenses = thisMonthTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0)

  const balance = income - expenses
  const budgetPercent = budget > 0 ? Math.min((expenses / budget) * 100, 100) : 0

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.category.toLowerCase().includes(search.toLowerCase())

        const matchesType = filterType === 'all' || item.type === filterType
        return matchesSearch && matchesType
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, search, filterType])

  const expenseCategories = categories
    .map((category) => ({
      name: category,
      amount: thisMonthTransactions
        .filter((item) => item.type === 'expense' && item.category === category)
        .reduce((sum, item) => sum + Number(item.amount), 0),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const categoryColors = ['#6759e8', '#20b486', '#f2a541', '#e56b8a', '#4598d8', '#9b72cf', '#55b7b0', '#db8757']

  const totalCategoryExpense = expenseCategories.reduce((sum, item) => sum + item.amount, 0)

  const categoryGradient = (() => {
    if (!totalCategoryExpense) return '#e9edf4'
    let current = 0
    const segments = expenseCategories.map((item, index) => {
      const start = current
      current += (item.amount / totalCategoryExpense) * 100
      return `${categoryColors[index % categoryColors.length]} ${start}% ${current}%`
    })
    return `conic-gradient(${segments.join(', ')})`
  })()

  const monthlyChart = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(currentYear, currentMonth - 5 + index, 1)
    const month = monthDate.getMonth()
    const year = monthDate.getFullYear()

    const amount = transactions
      .filter((item) => {
        const date = new Date(`${item.date}T00:00:00`)
        return item.type === 'expense' && date.getMonth() === month && date.getFullYear() === year
      })
      .reduce((sum, item) => sum + Number(item.amount), 0)

    return {
      label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      amount,
    }
  })

  const maxMonthlyExpense = Math.max(...monthlyChart.map((item) => item.amount), 1)

  function addTransaction(event) {
    event.preventDefault()

    if (!form.title.trim() || Number(form.amount) <= 0 || !form.date) return

    const newTransaction = {
      id: Date.now(),
      title: form.title.trim(),
      amount: Number(form.amount),
      category: form.category,
      type: form.type,
      date: form.date,
    }

    setTransactions((previous) => [newTransaction, ...previous])
    setForm({
      title: '',
      amount: '',
      category: 'Food',
      type: 'expense',
      date: today.toISOString().slice(0, 10),
    })
    setShowForm(false)
  }

  function deleteTransaction(id) {
    const confirmed = window.confirm('Are you sure you want to delete this transaction?')
    if (confirmed) {
      setTransactions((previous) => previous.filter((item) => item.id !== id))
    }
  }

  function openNewTransaction() {
    setShowForm(true)
  }

  function renderTransactions(limit) {
    const items = limit ? filteredTransactions.slice(0, limit) : filteredTransactions

    if (!items.length) {
      return (
        <tr>
          <td colSpan="5" className="empty-state">No transactions found.</td>
        </tr>
      )
    }

    return items.map((item) => (
      <tr key={item.id}>
        <td>
          <div className="transaction-name">
            <span className={`transaction-symbol ${item.type}`}>
              {item.type === 'income' ? '↙' : '↗'}
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.type === 'income' ? 'Money received' : 'Money spent'}</small>
            </div>
          </div>
        </td>
        <td><span className="category-pill">{item.category}</span></td>
        <td>{formatDate(item.date)}</td>
        <td className={item.type === 'income' ? 'positive amount-cell' : 'negative amount-cell'}>
          {item.type === 'income' ? '+' : '-'}{money(item.amount)}
        </td>
        <td>
          <button className="delete-btn" onClick={() => deleteTransaction(item.id)} aria-label={`Delete ${item.title}`}>
            Delete
          </button>
        </td>
      </tr>
    ))
  }

  function renderDashboard() {
    return (
      <>
        <section className="summary-grid">
          <div className="summary-card balance-card">
            <div className="summary-top">
              <span>Total Balance</span>
              <span className="summary-icon purple">◈</span>
            </div>
            <h2>{money(balance)}</h2>
            <p>Income minus expenses this month</p>
          </div>

          <div className="summary-card">
            <div className="summary-top">
              <span>Total Income</span>
              <span className="summary-icon green">↙</span>
            </div>
            <h2>{money(income)}</h2>
            <p className="positive">Money received this month</p>
          </div>

          <div className="summary-card">
            <div className="summary-top">
              <span>Total Expenses</span>
              <span className="summary-icon orange">↗</span>
            </div>
            <h2>{money(expenses)}</h2>
            <p className="negative">Money spent this month</p>
          </div>

          <div className="summary-card">
            <div className="summary-top">
              <span>Monthly Budget</span>
              <span className="summary-icon blue">◷</span>
            </div>
            <h2>{money(budget)}</h2>
            <p>{Math.round(budgetPercent)}% of budget used</p>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel spending-panel">
            <div className="panel-heading">
              <div>
                <h3>Spending Overview</h3>
                <p>Your expenses over the last 6 months</p>
              </div>
              <span className="period-label">6 months</span>
            </div>

            <div className="bar-chart">
              {monthlyChart.map((item) => (
                <div className="bar-column" key={`${item.label}-${item.amount}`}>
                  <span className="bar-value">{item.amount ? `${Math.round(item.amount / 1000)}k` : '0'}</span>
                  <div className="bar-track">
                    <div
                      className="bar"
                      style={{ height: `${Math.max((item.amount / maxMonthlyExpense) * 100, item.amount ? 5 : 0)}%` }}
                    />
                  </div>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="panel category-panel">
            <div className="panel-heading">
              <div>
                <h3>Expense Categories</h3>
                <p>Where your money goes this month</p>
              </div>
            </div>

            <div className="category-content">
              <div className="donut" style={{ background: categoryGradient }}>
                <div className="donut-inner">
                  <strong>{money(expenses)}</strong>
                  <small>Total spent</small>
                </div>
              </div>

              <div className="legend">
                {expenseCategories.length ? expenseCategories.slice(0, 5).map((item, index) => (
                  <div className="legend-item" key={item.name}>
                    <span className="legend-dot" style={{ background: categoryColors[index % categoryColors.length] }} />
                    <span>{item.name}</span>
                    <strong>{money(item.amount)}</strong>
                  </div>
                )) : <p className="muted-text">No expenses recorded this month.</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="panel transactions-panel">
          <div className="panel-heading">
            <div>
              <h3>Recent Transactions</h3>
              <p>Your latest financial activity</p>
            </div>
            <button className="text-btn" onClick={() => setActivePage('Transactions')}>View all →</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>TRANSACTION</th>
                  <th>CATEGORY</th>
                  <th>DATE</th>
                  <th>AMOUNT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>{renderTransactions(5)}</tbody>
            </table>
          </div>
        </section>
      </>
    )
  }

  function renderTransactionsPage() {
    return (
      <section className="panel transactions-panel full-panel">
        <div className="panel-heading">
          <div>
            <h3>All Transactions</h3>
            <p>Manage and review your income and expenses</p>
          </div>
          <button className="primary-btn" onClick={openNewTransaction}>+ New Transaction</button>
        </div>

        <div className="table-tools">
          <input
            className="search-input"
            type="search"
            placeholder="Search transactions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
            <option value="all">All transactions</option>
            <option value="income">Income only</option>
            <option value="expense">Expenses only</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>TRANSACTION</th>
                <th>CATEGORY</th>
                <th>DATE</th>
                <th>AMOUNT</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>{renderTransactions()}</tbody>
          </table>
        </div>
        <p className="table-footer">{filteredTransactions.length} transaction(s) found</p>
      </section>
    )
  }

  function renderBudgetsPage() {
    const remaining = budget - expenses

    return (
      <section className="budget-layout">
        <div className="panel budget-main">
          <div className="panel-heading">
            <div>
              <h3>Monthly Budget</h3>
              <p>Keep your spending within your plan</p>
            </div>
            <span className="summary-icon purple">◷</span>
          </div>

          <div className="budget-total">{money(budget)}</div>
          <p className="muted-text">Your monthly spending limit</p>

          <div className="budget-progress-heading">
            <span>Budget used</span>
            <strong>{Math.round(budgetPercent)}%</strong>
          </div>
          <div className="progress-track">
            <div className={`progress-fill ${budgetPercent >= 100 ? 'over-budget' : ''}`} style={{ width: `${budgetPercent}%` }} />
          </div>

          <div className="budget-stats">
            <div>
              <span>Spent</span>
              <strong className="negative">{money(expenses)}</strong>
            </div>
            <div>
              <span>{remaining >= 0 ? 'Remaining' : 'Over budget'}</span>
              <strong className={remaining >= 0 ? 'positive' : 'negative'}>{money(Math.abs(remaining))}</strong>
            </div>
          </div>
        </div>

        <div className="panel budget-edit">
          <h3>Set Monthly Budget</h3>
          <p>Enter the amount you want to spend this month.</p>
          <label htmlFor="budget-input">Budget amount (PKR)</label>
          <input
            id="budget-input"
            type="number"
            min="1"
            value={budget}
            onChange={(event) => setBudget(Math.max(1, Number(event.target.value)))}
          />
          <p className="helper-text">Your budget is saved automatically in this browser.</p>
        </div>

        <div className="panel budget-categories">
          <h3>Spending by Category</h3>
          <p className="muted-text">Your expense breakdown for this month</p>
          {expenseCategories.length ? expenseCategories.map((item, index) => (
            <div className="category-progress" key={item.name}>
              <div className="category-progress-heading">
                <span>{item.name}</span>
                <strong>{money(item.amount)}</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${expenses ? (item.amount / expenses) * 100 : 0}%`,
                    background: categoryColors[index % categoryColors.length],
                  }}
                />
              </div>
            </div>
          )) : <p className="empty-message">Add an expense to see category breakdown.</p>}
        </div>
      </section>
    )
  }

  function renderAnalyticsPage() {
    return (
      <>
        <section className="summary-grid analytics-summary">
          <div className="summary-card">
            <span>Total income this month</span>
            <h2>{money(income)}</h2>
          </div>
          <div className="summary-card">
            <span>Total expenses this month</span>
            <h2>{money(expenses)}</h2>
          </div>
          <div className="summary-card">
            <span>Average expense</span>
            <h2>{money(thisMonthTransactions.filter((item) => item.type === 'expense').length ? expenses / thisMonthTransactions.filter((item) => item.type === 'expense').length : 0)}</h2>
          </div>
          <div className="summary-card">
            <span>Total transactions</span>
            <h2>{thisMonthTransactions.length}</h2>
          </div>
        </section>

        <section className="panel analytics-panel">
          <div className="panel-heading">
            <div>
              <h3>Monthly Spending Analysis</h3>
              <p>Compare your expenses across the last six months</p>
            </div>
          </div>
          <div className="bar-chart analytics-chart">
            {monthlyChart.map((item) => (
              <div className="bar-column" key={`${item.label}-${item.amount}`}>
                <span className="bar-value">{money(item.amount)}</span>
                <div className="bar-track">
                  <div
                    className="bar"
                    style={{ height: `${Math.max((item.amount / maxMonthlyExpense) * 100, item.amount ? 5 : 0)}%` }}
                  />
                </div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel analytics-panel">
          <div className="panel-heading">
            <div>
              <h3>Category Breakdown</h3>
              <p>Expenses grouped by category</p>
            </div>
          </div>
          {expenseCategories.length ? expenseCategories.map((item, index) => (
            <div className="category-progress" key={item.name}>
              <div className="category-progress-heading">
                <span>{item.name}</span>
                <strong>{money(item.amount)} ({expenses ? Math.round((item.amount / expenses) * 100) : 0}%)</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${expenses ? (item.amount / expenses) * 100 : 0}%`, background: categoryColors[index % categoryColors.length] }} />
              </div>
            </div>
          )) : <p className="empty-message">No expense data available yet.</p>}
        </section>
      </>
    )
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>SpendWise</span>
        </div>

        <p className="nav-heading">WORKSPACE</p>
        <nav className="nav-menu">
          {[
            { name: 'Dashboard', icon: '▦' },
            { name: 'Transactions', icon: '⇄' },
            { name: 'Budgets', icon: '◷' },
            { name: 'Analytics', icon: '▥' },
          ].map((item) => (
            <button
              key={item.name}
              className={`nav-item ${activePage === item.name ? 'active' : ''}`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">U</div>
            <div>
              <strong>My Account</strong>
              <small>Personal Finance</small>
            </div>
          </div>
          <p className="sidebar-version">SpendWise · Personal Edition</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="welcome">Welcome back!</p>
            <h1>{activePage}</h1>
            <p className="page-subtitle">
              {activePage === 'Dashboard' && 'Here is your financial overview.'}
              {activePage === 'Transactions' && 'Keep track of every rupee.'}
              {activePage === 'Budgets' && 'Plan your spending and stay on track.'}
              {activePage === 'Analytics' && 'Understand your spending habits.'}
            </p>
          </div>
          <button className="primary-btn topbar-action" onClick={openNewTransaction}>+ New Transaction</button>
        </header>

        {activePage === 'Dashboard' && renderDashboard()}
        {activePage === 'Transactions' && renderTransactionsPage()}
        {activePage === 'Budgets' && renderBudgetsPage()}
        {activePage === 'Analytics' && renderAnalyticsPage()}

        <footer className="footer">SpendWise © {currentYear} · Manage your money with confidence.</footer>
      </main>

      {showForm && (
        <div className="modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowForm(false)
        }}>
          <form className="transaction-form" onSubmit={addTransaction}>
            <div className="form-heading">
              <div>
                <h2>New Transaction</h2>
                <p>Add income or an expense to your records.</p>
              </div>
              <button type="button" className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>

            <label htmlFor="transaction-title">Transaction title</label>
            <input
              id="transaction-title"
              required
              placeholder="e.g. Grocery shopping"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />

            <label htmlFor="transaction-amount">Amount (PKR)</label>
            <input
              id="transaction-amount"
              required
              type="number"
              min="1"
              placeholder="Enter amount"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />

            <div className="form-row">
              <div>
                <label htmlFor="transaction-type">Transaction type</label>
                <select
                  id="transaction-type"
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label htmlFor="transaction-category">Category</label>
                <select
                  id="transaction-category"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                >
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
            </div>

            <label htmlFor="transaction-date">Date</label>
            <input
              id="transaction-date"
              required
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />

            <button className="primary-btn submit-btn" type="submit">Save Transaction</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
