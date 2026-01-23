from flask import Flask, jsonify
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import click
import os

from models import db, User, Warehouse
from config import Config

# Import blueprints
from routes.auth import auth_bp
from routes.products import products_bp
from routes.sales import sales_bp
from routes.customers import customers_bp
from routes.stock_intake import stock_intake_bp
from routes.expenses import expenses_bp
from routes.warehouses import warehouses_bp
# Legacy routes temporarily disabled during migration
# from routes.user import user_bp
# from routes.dashboard import dashboard_bp
from routes.catalog import catalog_bp
# from routes.timeline import timeline_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    Migrate(app, db)
    JWTManager(app)
    
    # CORS configuration - allow all origins for development
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(sales_bp, url_prefix='/api/sales')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(stock_intake_bp, url_prefix='/api/stock-intake')
    app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
    # Legacy routes temporarily disabled
    # app.register_blueprint(user_bp, url_prefix='/api/users')
    # app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(catalog_bp, url_prefix='/api/catalog')
    app.register_blueprint(warehouses_bp, url_prefix='/api/warehouses')
    # app.register_blueprint(timeline_bp, url_prefix='/api/timeline')

    # Auto-initialize database on startup (for serverless/free tier deployments)
    with app.app_context():
        # Step 1: Create tables
        try:
            db.create_all()
            print("✅ Database tables created/verified")
        except Exception as e:
            print(f"⚠️ Table creation note: {e}")
        
        # Step 2: Create default users (if they don't exist)
        try:
            if not User.query.filter_by(username='abbas').first():
                abbas = User(
                    username='abbas',
                    full_name='Abbas',
                    can_view_financials=True
                )
                abbas.set_password('abbasarva31377')
                db.session.add(abbas)
                db.session.commit()
                print("✅ Abbas user created")
            
            if not User.query.filter_by(username='irfan').first():
                irfan = User(
                    username='irfan',
                    full_name='Irfan',
                    can_view_financials=False
                )
                irfan.set_password('irfanbhai123')
                db.session.add(irfan)
                db.session.commit()
                print("✅ Irfan user created")
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ User creation note: {e}")
        
        # Step 3: Create default warehouses (if they don't exist)
        try:
            if not Warehouse.query.filter_by(code='BHAIJAAN').first():
                bhaijaan = Warehouse(
                    code='BHAIJAAN',
                    name='BhaiJaan',
                    description='Main storage warehouse',
                    is_default_intake=True,
                    is_shipping_location=False
                )
                db.session.add(bhaijaan)
                db.session.commit()
                print("✅ BhaiJaan warehouse created")
            
            if not Warehouse.query.filter_by(code='MAHAPOLI').first():
                mahapoli = Warehouse(
                    code='MAHAPOLI',
                    name='Mahapoli',
                    description='Shipping/dispatch location',
                    is_default_intake=False,
                    is_shipping_location=True
                )
                db.session.add(mahapoli)
                db.session.commit()
                print("✅ Mahapoli warehouse created")
            
            print("✅ Database initialization complete")
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ Warehouse creation note: {e}")

        # Step 4: Emergency Schema Fix (Auto-run)
        try:
            print("🔄 Checking for missing schema columns...")
            from sqlalchemy import text
            # Try to select warehouse_id from stock_intake
            try:
                db.session.execute(text("SELECT warehouse_id FROM stock_intake LIMIT 1"))
            except Exception:
                db.session.rollback()
                print("⚠️ Column warehouse_id missing in stock_intake. Adding it...")
                db.session.execute(text("ALTER TABLE stock_intake ADD COLUMN warehouse_id INTEGER REFERENCES warehouse(id)"))
                db.session.commit()
                print("✅ Added warehouse_id column")
        except Exception as e:
            print(f"⚠️ Schema check warning: {e}")
            db.session.rollback()

    @app.cli.command("create-users")
    def create_users():
        """Creates Abbas (owner) and Irfan (manager) users."""
        # Create Abbas with financial access
        if not User.query.filter_by(username='abbas').first():
            click.echo("Creating Abbas (Owner) user...")
            abbas = User(
                username='abbas',
                full_name='Abbas',
                can_view_financials=True
            )
            abbas.set_password('abbas123')  # Change this in production!
            db.session.add(abbas)
            click.echo("✓ Abbas user created (username: abbas, password: abbas123)")
        else:
            click.echo("Abbas user already exists.")
        
        # Create Irfan without financial access
        if not User.query.filter_by(username='irfan').first():
            click.echo("Creating Irfan (Manager) user...")
            irfan = User(
                username='irfan',
                full_name='Irfan',
                can_view_financials=False
            )
            irfan.set_password('irfan123')  # Change this in production!
            db.session.add(irfan)
            click.echo("✓ Irfan user created (username: irfan, password: irfan123)")
        else:
            click.echo("Irfan user already exists.")
        
        db.session.commit()
        click.echo("\n" + "="*50)
        click.echo("✅ User setup complete!")
        click.echo("="*50)

    @app.route('/')
    def index():
        return jsonify({"message": "Welcome to the Workshop Inventory API"})

    @app.route('/health')
    def health():
        """
        Health check endpoint with working hours support.
        - During 7 AM - 12 AM IST: Pings database to keep connections alive
        - Outside working hours: Returns OK without DB ping (allows backend to sleep)
        """
        from datetime import datetime, timezone, timedelta
        
        # IST is UTC+5:30
        ist_offset = timedelta(hours=5, minutes=30)
        ist_time = datetime.now(timezone.utc) + ist_offset
        current_hour = ist_time.hour
        
        # Working hours: 7 AM (7) to 12 AM (0) IST
        # That means: 7 <= hour <= 23 OR hour == 0
        is_working_hours = (7 <= current_hour <= 23) or (current_hour == 0)
        
        if is_working_hours:
            try:
                from sqlalchemy import text
                db.session.execute(text('SELECT 1'))
                return f'OK - DB Active (IST: {ist_time.strftime("%H:%M")})', 200
            except Exception as e:
                return f'DB Error: {str(e)}', 500
        else:
            # Outside working hours - just return OK without DB ping
            return f'OK - Off Hours (IST: {ist_time.strftime("%H:%M")})', 200

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

