## BondPro: Secure Fixed Income Management

A centralized web application designed to replace fragile, error-prone spreadsheets with a robust, database-driven platform for managing fixed income bond data.

### Why does this exist? (The "Excel Hell" Problem)

Most finance teams track bonds in Excel. While familiar, spreadsheets are dangerous for high-stakes financial data. BondPro solves these fundamental issues:

* **Single Source of Truth:** No more "Final_v2_updated.xlsx." Every analyst views the same live data in the central database.
* **Data Integrity:** Unlike Excel, which lets you type anything into any cell, our system validates every entry. You cannot accidentally save a maturity date in the past or misspell a company name.
* **Auditability:** Every transaction is tracked. We know exactly who changed what, when, and why—providing the security that spreadsheets simply cannot offer.
* **Collaboration:** A multi-user system where teams can work simultaneously without overwriting each other’s changes.

### Key Features

* **Smart Uploads:** Drag-and-drop CSV parsing with automatic data validation.
* **Relational Database:** Structured management of Issuers, Bonds, and Transactions.
* **Dynamic UI:** A high-density, professional dashboard for filtering and managing thousands of records.
* **Role-Based Security:** Secure login and authentication to ensure sensitive financial data is protected.
