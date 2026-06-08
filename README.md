<div align="center">

# 🔮 JC Glasshouse (SunStock)
### *Wholesale Auto Glass Inventory & Sales Command Center*

[![Live App](https://img.shields.io/badge/Live%20Demo-https://jcglasshouse.netlify.app-blueviolet?style=for-the-badge&logo=google-chrome&logoColor=white)](https://jcglasshouse.netlify.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![Flask](https://img.shields.io/badge/Flask-API-000000?style=for-the-badge&logo=flask&logoColor=white)](#)
[![Neon Postgres](https://img.shields.io/badge/Neon-PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](#)
[![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](#)
[![Render](https://img.shields.io/badge/Render-Backend-46E3B7?style=for-the-badge&logo=render&logoColor=white)](#)

A sleek, enterprise-grade inventory and sales management command center custom-tailored for wholesale auto glass distribution. Managing products, tracking sales cycles, initiating multi-warehouse stock transfers, and monitoring business expenses all under a unified dashboard.

[Explore Live Dashboard](https://jcglasshouse.netlify.app) • [View API Configuration](#-environment-secrets) • [Local Developer Setup](#%EF%B8%8F-quick-start)

---
</div>

## 🚀 Key Architectural Features

<table>
  <tr>
    <td width="50%">
      <h4>📦 Inventory Command</h4>
      <ul>
        <li>Auto glass cataloging (sunroofs, windshields, door/quarter glass).</li>
        <li>Low-stock alert boundaries & automatic threshold flags.</li>
        <li>Sub-millimeter dimension precision and multi-tag filtering.</li>
      </ul>
    </td>
    <td width="50%">
      <h4>💸 Sales & Invoicing Pipeline</h4>
      <ul>
        <li>Wholesale transaction logging with dynamic payment statuses (unpaid, partial, paid).</li>
        <li>Instant Excel/PDF invoicing exports.</li>
        <li>Historical invoice lookup and payment tracking logs.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h4>🏢 Multi-Warehouse logistics</h4>
      <ul>
        <li>Distribute inventory across <b>BhaiJaan</b> (Main Storage) and <b>Mahapoli</b> (Shipping Hub).</li>
        <li>Track inter-warehouse stock transfer actions and logs.</li>
      </ul>
    </td>
    <td width="50%">
      <h4>📊 Visualized Analytics</h4>
      <ul>
        <li>Monthly revenue charts, profit margins, and volume breakdowns.</li>
        <li>Founder-only financial dashboards (expenses, purchase costs, margin analysis).</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🔒 Public Sandbox & Demo Mode

We have built-in a secure public sandbox environment to let anybody explore the application without risking read/write access to production databases.

> [!TIP]
> **To test the live application immediately, use the credentials below:**
> * 👤 **Username:** `demo`
> * 🔑 **Password:** `demo`
> 
> *Sandbox Guardrails:*
> * **GET Requests** are intercepted at the route level to serve high-fidelity, interactive mock data.
> * **POST/PUT/DELETE Requests** are blocked automatically (yielding `403 Forbidden` messages) to prevent sandbox users from writing to the database.

---

## 🛠️ Tech Stack & Services

- **Client App**: React 18, Material-UI 5 (responsive dashboard layout), Chart.js, Axios, jsPDF, XLSX.
- **Server API**: Flask (Python), Flask-JWT-Extended (secure stateless token auth), Flask-SQLAlchemy.
- **Data Layer**: PostgreSQL (Neon Serverless in production), SQLite (automated local fallback).
- **Hosting**: Netlify (Frontend build + Netlify redirect proxy logic), Render (Autoscale Web API).

---

## ⚙️ Environment Secrets

To run the application securely or deploy your own clone, configure server-side environment variables or place a `.env` file inside the `backend/` folder:

```env
# Production Database Connection (automatically falls back to local SQLite if left empty)
DATABASE_URL=your-neon-database-url

# Secure Private Profile Credentials (used to sync user table passwords on startup)
FOUNDER_PASSWORD=your-secure-founder-password
MANAGER_PASSWORD=your-secure-manager-password

# Session Security Configuration
SECRET_KEY=generate-a-long-random-flask-key
JWT_SECRET_KEY=generate-a-long-random-jwt-key
```

---

## 🏃‍♂️ Quick Start (Local Development)

### 1. Fire up the Backend API
```bash
# Navigate to backend directory
cd workshop-inventory/backend

# Initialize and activate Python virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run server (starts on http://localhost:5000)
python app.py
```
*(On startup, the backend will auto-generate your local database schema, initialize default warehouse instances, and seed developer credentials from your environment file.)*

### 2. Launch the React App
```bash
# Navigate to frontend directory
cd workshop-inventory/frontend

# Install node dependencies
npm install

# Run the dev server (starts on http://localhost:3000)
npm start
```

---
<div align="center">
  <sub>Designed & Developed for JC Glasshouse. Deployed securely on Netlify and Render.</sub>
</div>
