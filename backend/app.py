from flask import Flask, jsonify
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import click
import os

from models import db, User
from config import Config

# Import blueprints
from routes.auth import auth_bp
from routes.products import products_bp
from routes.sales import sales_bp
from routes.customers import customers_bp
from routes.stock_intake import stock_intake_bp
from routes.expenses import expenses_bp
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
    # app.register_blueprint(timeline_bp, url_prefix='/api/timeline')

    # Auto-initialize database on startup (for serverless/free tier deployments)
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✅ Database tables created/verified")
            
            # Create default users if they don't exist
            # Delete existing users first (one-time fix for password hash column size issue)
            User.query.filter_by(username='abbas').delete()
            User.query.filter_by(username='irfan').delete()
            db.session.commit()
            
            abbas = User(
                username='abbas',
                full_name='Abbas',
                can_view_financials=True
            )
            abbas.set_password('abbas123')
            db.session.add(abbas)
            print("✅ Abbas user created")
            
            irfan = User(
                username='irfan',
                full_name='Irfan',
                can_view_financials=False
            )
            irfan.set_password('irfan123')
            db.session.add(irfan)
            print("✅ Irfan user created")
            
            db.session.commit()
            print("✅ Database initialization complete")
        except Exception as e:
            print(f"⚠️ Database initialization note: {e}")

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

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

