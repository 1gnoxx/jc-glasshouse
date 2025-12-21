# JC Glasshouse - Auto Glass Inventory & Sales Management

A streamlined inventory and sales management system for wholesale auto glass business.

## 🌐 Live Application

**Production URL**: https://jcglasshouse.netlify.app


## Tech Stack

- **Frontend**: React, Material-UI
- **Backend**: Flask, SQLAlchemy
- **Database**: PostgreSQL (Neon)
- **Hosting**: Netlify (frontend), Render (backend)

## Local Development

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Initialize Database

```bash
python3 -m flask db upgrade
python3 -m flask create-users
```

### 3. Run Backend

```bash
python3 app.py
```

Backend runs on: http://localhost:5000

### 4. Run Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on: http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Add new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales
- `GET /api/sales` - List sales
- `POST /api/sales` - Create new sale
- `PUT /api/sales/:id/payment` - Update payment status

### Stock Intake
- `GET /api/stock-intake` - List stock intakes
- `POST /api/stock-intake` - Create new intake

## Project Structure

```
workshop-inventory/
├── backend/
│   ├── app.py           # Flask application
│   ├── models.py        # Database models
│   ├── config.py        # Configuration
│   └── routes/          # API routes
└── frontend/
    ├── src/
    │   ├── pages/       # React pages
    │   └── context/     # React contexts
    └── package.json
```

## Deployment

- **Frontend**: Auto-deploys to Netlify on git push
- **Backend**: Auto-deploys to Render on git push
- **Backups**: Automated weekly backups via GitHub Actions

## License

Private - JC Glasshouse
