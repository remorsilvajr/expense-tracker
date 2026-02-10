/** A key for the local storage transactions entry. */
const TRANSACTIONS_KEY = "transactions";

const dom = {
  /** @type {HTMLHeadingElement | null} */
  balance: document.getElementById("balance"),

  /** @type {HTMLParagraphElement | null} */
  income: document.getElementById("income"),

  /** @type {HTMLParagraphElement | null} */
  expense: document.getElementById("expense"),

  /** @type {HTMLUListElement | null} */
  transactions: document.getElementById("transactions"),

  /** @type {HTMLFormElement | null} */
  transaction: document.getElementById("transaction"),
  
  // New element!
  /** @type {HTMLInputElement | null} */
  id: document.getElementById("transaction-id"),

  /** @type {HTMLInputElement | null} */
  description: document.getElementById("description"),

  /** @type {HTMLInputElement | null} */
  amount: document.getElementById("amount"),

  // New element!
  /** @type {HTMLInputElement | null} */
  date: document.getElementById("date"),

  // New element!
  /** @type {HTMLInputElement | null} */
  category: document.getElementById("category"),

  // New element!
  /** @type {HTMLButtonElement | null} */
  submitBtn: document.getElementById("submit-btn"),

  //  New Filter Elements
  /** @type {HTMLInputElement | null} */
  searchInput: document.getElementById("search-input"),

  /** @type {HTMLSelectElement | null} */
  filterCategory: document.getElementById("filter-category"),
  
  /** @type {HTMLSelectElement | null} */
  filterDate: document.getElementById("filter-date"),

  //  NEW: Sort Element
  filterSort: document.getElementById("filter-sort"),

  /** @type {HTMLTemplateElement | null} */
  transactionItemTemplate: document.getElementById("transaction-item-template"),
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * A model that represents a transaction.
 */
class Transaction {
  id;
  description;
  amount;
  date; // New
  category; // New
  /**
   * **Note:** use this constructor to assign an entry instead of creating one.
   * @param {number} id
   * @param {string} description
   * @param {number} amount
   * @param {string} date // New
   * @param {string} category // New
   */
  constructor(id, description, amount, date, category) {
    if (typeof id !== "number") {
      throw new Error("ID must be a number");
    }

    if (typeof description !== "string" || description.length === 0) {
      throw new Error("Description must be a non-empty string");
    }

    if (typeof amount !== "number" || isNaN(amount)) {
      throw new Error("Amount must be a valid number");
    }

    // Default to today if date is missing (backward compatibility)
    this.id = id;
    this.description = description;
    this.amount = amount;
    this.date = date || new Date().toISOString().split("T")[0]; // Default to today
    this.category = category || "Uncategorized"; // Default category
  }

  /**
   * Creates a new instance using only the required data.
   * @param {string} description
   * @param {number} amount
   * @param {string} date // New
   * @param {string} category // New
   */
  static create(description, amount, date, category) {
    return new this(Date.now(), description, amount, date, category);
  } // Added date and category
}

/** @type {Transaction[]} */
let transactions = [];

/**
 * Initializes the entire application.
 * @returns {void}
 */
function initialize() {
  transactions = getTransactions();
  dom.date.valueAsDate = new Date(); // Set default date to today for the add form
  renderSummary();
  renderTransactions();
}

initialize();

/* =========================
    State Actions
========================= */

/**
 * Adds a transaction to the current transaction state.
 * @param {Transaction} transaction
 * @returns {void}
 */
function addTransaction(transaction) {
  transactions.push(transaction);
}

/** New function!
 * Updates an existing transaction in the state.
 * @param {Transaction} updatedTransaction
 * @returns {void}
 */
function updateTransaction(updatedTransaction) {
  transactions = transactions.map((t) =>
    t.id === updatedTransaction.id ? updatedTransaction : t
  );
}


/**
 * Deletes a transaction from the current transaction state.
 * @param {Transaction["id"]} id
 * @returns {void}
 */
function deleteTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);
}

/** New function!
 * Prepares the UI for editing a transaction.
 * @param {Transaction["id"]} id
 * @returns {void}
 */
function editTransaction(id) {
  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) return;

  // Populate form
  dom.id.value = transaction.id;
  dom.description.value = transaction.description;
  dom.amount.value = transaction.amount;
  dom.date.value = transaction.date;
  dom.category.value = transaction.category;

  // Change UI to Edit Mode
  dom.submitBtn.textContent = "Update Transaction";
  dom.submitBtn.style.background = "linear-gradient(135deg, #f39c12, #d35400)";
  window.scrollTo({ top: dom.transaction.offsetTop, behavior: "smooth" });
}


/* =========================
    Store Actions
========================= */

/**
 * Gets all the saved transactions from the local storage.
 * @returns {Transaction[]}
 */
function getTransactions() {
  const data = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY)) ?? [];

  return data.map(
    ({ id, description, amount, date, category }) => 
      new Transaction(id, description, amount, date, category)
  ); // Added date and category New
}

/**
 * Saves the current transaction state to the local storage.
 * @returns {void}
 */
function persistTransactions() {
  return localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

/* =========================
    Rendering
========================= */

/**
 * Renders the balance, total income, and total expense.
 * @returns {void}
 * @remarks Slow operation because it requires to re-render everything.
 */
function renderSummary() {
  let balance = 0;
  let income = 0;
  let expense = 0;

  for (const transaction of transactions) {
    const amount = transaction.amount;

    if (amount > 0) {
      income += amount;
    }

    if (amount < 0) {
      expense += amount;
    }

    balance += amount;
  }

  dom.balance.textContent = formatToUSD(balance);
  dom.income.textContent = formatToUSD(income);
  dom.expense.textContent = formatToUSD(expense);
}

/**
 * Renders the transactions list UI with Filtering Logic.
 * @returns {void}
 * @remarks Slow operation because it requires to re-render everything.
 */
function renderTransactions() {
  dom.transactions.innerHTML = "";

  // 1. Get current filter & sort values
  const searchTerm = dom.searchInput.value.toLowerCase();
  const filterCat = dom.filterCategory.value;
  const filterDate = dom.filterDate.value;
  const sortType = dom.filterSort ? dom.filterSort.value : "date-desc"; //new

  // 2. Filter the transactions New
  let processedTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm);
    const matchesCategory = filterCat === "All" || t.category === filterCat;
    const matchesDate = checkDateFilter(t.date, filterDate);
    return matchesSearch && matchesCategory && matchesDate;
  });

  // New
  // 3. Sort the transactions (NEW LOGIC)
  processedTransactions.sort((a, b) => {
    if (sortType === "date-desc") {
      return new Date(b.date) - new Date(a.date); // Newest first
    } else if (sortType === "date-asc") {
      return new Date(a.date) - new Date(b.date); // Oldest first
    } else if (sortType === "amount-desc") {
      return Math.abs(b.amount) - Math.abs(a.amount); // Highest number first
    } else if (sortType === "amount-asc") {
      return Math.abs(a.amount) - Math.abs(b.amount); // Lowest number first
    } else if (sortType === "name-asc") {
      return a.description.localeCompare(b.description); // A-Z
    } else if (sortType === "name-desc") {
      return b.description.localeCompare(a.description); // Z-A
    }
  });

  for (const { id, description, amount, date, category } of processedTransactions) {
    const fragment = dom.transactionItemTemplate.content.cloneNode(true);

    const li = fragment.querySelector("li");
    li.classList.add(amount > 0 ? "income" : "expense");

    const h1 = fragment.querySelector("h1");
    h1.textContent = description;

    // Set Date & Category New
    const dateSpan = fragment.querySelector(".date");
    dateSpan.textContent = date;

    // Set Category Badge New
    const categoryBadge = fragment.querySelector(".category-badge");
    categoryBadge.textContent = category;

    // Hide badge if no category is provided
    if (category === "Uncategorized") {
        categoryBadge.style.opacity = "0.5";
    }

    const p = fragment.querySelector("p");
    p.textContent = formatToUSD(amount);

    // ... (Keep existing button event listeners) ... New
    const editBtn = fragment.querySelector("#edit-btn");
    editBtn.addEventListener("click", () => editTransaction(id));

    const button = fragment.querySelector("#delete-btn");
    button.addEventListener("click", () => {
      deleteTransaction(id);
      persistTransactions();
      renderSummary();
      renderTransactions(); // Re-render to update list New
      li.remove();
    });

    dom.transactions.appendChild(li);
  }
}

/** New function!
 * Helper to check if a date is within the selected window (7 days, 30 days)
 */
function checkDateFilter(transactionDateStr, filterType) {
    if (filterType === "All") return true;
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const transactionDate = new Date(transactionDateStr);
    
    // Calculate the cutoff date (e.g. 7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(today.getDate() - Number(filterType));
    cutoffDate.setHours(0, 0, 0, 0); // Start of that day

    return transactionDate >= cutoffDate && transactionDate <= today;
}

/** New function!
 * Resets the form to its default "Add" state.
 */
function resetForm() {
  dom.transaction.reset();
  dom.id.value = "";
  dom.date.valueAsDate = new Date(); // Reset date to today
  dom.submitBtn.textContent = "Add Transaction";
  dom.submitBtn.style.background = ""; // Reset to CSS default
}

/* =========================
    Utilities
========================= */

/**
 * Formats a given amount to USD currency.
 * @param {number} amount
 * @returns {string}
 */
function formatToUSD(amount) {
  return currencyFormatter.format(amount);
}

/* =========================
    Event Listeners
========================= */

// Form Submit
dom.transaction.addEventListener("submit", (event) => {
  event.preventDefault();

  const id = dom.id.value ? Number(dom.id.value) : null; // New
  const description = dom.description.value.trim();
  const amount = Number(dom.amount.value.trim()); // Use Number to allow decimals New
  const date = dom.date.value; // New
  const category = dom.category.value.trim(); // New

  // New logic for Add vs Edit
  if (id) {
    // Edit Mode
    const transaction = new Transaction(id, description, amount, date, category);
    updateTransaction(transaction);
  } else {
    // Add Mode
    const transaction = Transaction.create(description, amount, date, category);
    addTransaction(transaction);
  }

  persistTransactions();
  renderSummary();
  renderTransactions();
  resetForm(); // changed from "event.target.reset();"
});

// NEW Listeners for Search and Filter
dom.searchInput.addEventListener("input", () => {
    renderTransactions();
});

dom.filterCategory.addEventListener("change", () => {
    renderTransactions();
});

dom.filterDate.addEventListener("change", () => {
    renderTransactions();
});

dom.filterDate.addEventListener("change", () => {
   renderTransactions();
});

// NEW: Listen for sort changes
dom.filterSort.addEventListener("change", () => {
   renderTransactions();

});
