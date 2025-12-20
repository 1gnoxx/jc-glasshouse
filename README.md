# JC Glasshouse - Auto Glass Inventory & Sales Management

A streamlined inventory and sales management system for wholesale auto glass business.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Initialize Database

```bash
# Create database and run migrations
python3 -m flask db upgrade

# Create Abbas and Irfan users
python3 -m flask create-users
```

This creates:
- **abbas** (password: `abbas123`) - Full access including financial data
- **irfan** (password: `irfan123`) - Operations access, no financial data

⚠️ **Change these passwords in production!**

### 3. Run Backend

```bash
python3 app.py
```

Backend runs on: http://localhost:5000

### 4. Run Frontend

```bash
cd ../frontend
npm install
npm start
```

Frontend runs on: http://localhost:3000

## Features

### For Abbas (Owner)
- ✅ Full inventory management
- ✅ Create and view all sales
- ✅ View sales history and financial reports
- ✅ See purchase prices and profit margins
- ✅ Access to all reports and analytics

### For Irfan (Manager)
- ✅ Full inventory management  
- ✅ Create new sales/invoices
- ✅ View today's sales (limited data)
- ❌ No access to sales history
- ❌ Cannot see financial data (revenue, profits)
- ❌ Cannot see purchase prices

## API Endpoints

### Authentication
```bash
POST /api/auth/login
POST /api/auth/register
```

### Products
```bash
GET    /api/products          # List all products (with filters)
POST   /api/products          # Add new product
GET    /api/products/:id      # Get product details
PUT    /api/products/:id      # Update product
DELETE /api/products/:id      # Delete product
```

### Sales
```bash
GET    /api/sales             # List sales (filtered by user permissions)
POST   /api/sales             # Create new sale
GET    /api/sales/:id         # Get sale details
PUT    /api/sales/:id/payment # Update payment status
```

### Dashboard
```bash
GET /api/dashboard/stats      # Get dashboard statistics
```

## Database Schema

### User
- username, password, full_name
- can_view_financials (Boolean) - Controls financial data access

### Product
- product_code, name, category, description
- length_mm, width_mm, thickness_mm (dimensions)
- compatible_vehicles
- stock_quantity, low_stock_threshold
- purchase_price, selling_price
- image_url

### Sale
- invoice_number
- customer_name, customer_phone, customer_company
- sale_date, payment_status, payment_method
- total_amount, discount_amount, amount_paid
- created_by_user_id

### SaleItem
- sale_id, product_id
- quantity, unit_price

## Development

### Creating a Migration

```bash
python3 -m flask db migrate -m "Description of changes"
python3 -m flask db upgrade
```

### Adding Sample Data

```python
python3 -m flask shell

>>> from models import db, Product, ProductCategory
>>> product = Product(
...     product_code="SF-HC20",
...     name="Honda Civic 2020 Sunroof",
...     category=ProductCategory.SUNROOF,
...     length_mm=850,
...     width_mm=650,
...     stock_quantity=10,
...     selling_price=12500
... )
>>> db.session.add(product)
>>> db.session.commit()
```

## Project Structure

```
workshop-inventory/
├── backend/
│   ├── app.py                 # Flask application
│   ├── models.py              # Database models
│   ├── config.py              # Configuration
│   ├── routes/
│   │   ├── auth.py            # Authentication routes
│   │   ├── product.py         # Product routes (TODO)
│   │   ├── sales.py           # Sales routes
│   │   └── utils.py           # Helper functions
│   └── instance/
│       └── app.db             # SQLite database
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.js
    │   │   ├── Inventory.js
    │   │   └── Sales.js
    │   └── context/
    │       └── AuthContext.js
    └── package.json
```

## Next Steps

1. ✅ Backend models created
2. ✅ Authentication updated for Abbas/Irfan access
3. 🔄 Update API routes for new models
4. ⏳ Build frontend pages
5. ⏳ Deploy to production

## Support

For issues or questions, refer to `/home/ignoxx/.gemini/antigravity/brain/9cc9dbea-acb7-49a4-9d20-f3eb8854b866/implementation_plan.md`
