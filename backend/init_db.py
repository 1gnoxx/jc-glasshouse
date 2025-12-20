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
    
    # Create Abbas (owner with financial access)
    if not User.query.filter_by(username='abbas').first():
        abbas = User(
            username='abbas',
            full_name='Abbas',
            can_view_financials=True
        )
        abbas.set_password('abbas123')
        db.session.add(abbas)
        print("✓ Abbas user created")
    
    # Create Ir fan (manager without financial access)
    if not User.query.filter_by(username='irfan').first():
        irfan = User(
            username='irfan',
            full_name='Irfan',
            can_view_financials=False
        )
        irfan.set_password('irfan123')
        db.session.add(irfan)
        print("✓ Irfan user created")
    
    db.session.commit()
    
    print("\n" + "="*50)
    print("✅ Database initialized successfully!")
    print("="*50)
    print("\nLogin credentials:")
    print("  Abbas (Owner): username='abbas', password='abbas123'")
    print("  Irfan (Manager): username='irfan', password='irfan123'")
    print("\n⚠️  Change these passwords in production!")
