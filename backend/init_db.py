"""
Simple script to initialize database with new models
"""
from app import create_app
from models import db, User, Product, ProductCategory, Sale, SaleItem

print("Creating database...")
app = create_app()

with app.app_context():
    # Create all tables
    db.create_all()
    print("✅ Database tables created")
    
    # Create Abby (owner with financial access)
    if not User.query.filter_by(username='abby').first():
        abby = User(
            username='abby',
            full_name='Abby',
            can_view_financials=True
        )
        abby.set_password('abby123')
        db.session.add(abby)
        print("✓ Abby user created")
    
    # Create Ir fan (manager without financial access)
    if not User.query.filter_by(username='ivy').first():
        ivy = User(
            username='ivy',
            full_name='Ivy',
            can_view_financials=False
        )
        ivy.set_password('ivy123')
        db.session.add(ivy)
        print("✓ Ivy user created")
    
    db.session.commit()
    
    print("\n" + "="*50)
    print("✅ Database initialized successfully!")
    print("="*50)
    print("\nLogin credentials:")
    print("  Abby (Owner): username='abby', password='abby123'")
    print("  Ivy (Manager): username='ivy', password='ivy123'")
    print("\n⚠️  Change these passwords in production!")
