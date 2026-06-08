"""
Production Database Import Script
Imports products from Excel files to Neon PostgreSQL database
Run this with: DATABASE_URL=<your_neon_url> python import_products_to_production.py
"""

import os
import json
from datetime import date

# Set up production database connection
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL environment variable not set!")
    print("Run with: DATABASE_URL='postgresql://...' python import_products_to_production.py")
    exit(1)

# Fix postgres:// vs postgresql:// issue
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

os.environ['DATABASE_URL'] = DATABASE_URL

from app import create_app
from models import db, Product, StockIntake, StockIntakeItem, ProductCategory, User

app = create_app()

def import_products():
    with app.app_context():
        # Get or create Abbas user
        abbas = User.query.filter_by(username='abbas').first()
        if not abbas:
            print("❌ Abbas user not found! Make sure users are created first.")
            return
        
        print(f"✅ Using user: {abbas.username} (ID: {abbas.id})")
        
        # ========== IMPORT BACKLIGHT & WINDSHIELD ==========
        print("\n" + "="*50)
        print("📦 IMPORTING BACKLIGHT & WINDSHIELD PRODUCTS")
        print("="*50)
        
        with open('products_to_import.json', 'r') as f:
            backlight_data = json.load(f)
        
        category_map = {
            'windshield': ProductCategory.WINDSHIELD,
            'rear_glass': ProductCategory.REAR_GLASS
        }
        
        backlight_products = []
        for i, p in enumerate(backlight_data, 1):
            if p['category'] == 'windshield':
                prefix = 'WS'
            else:
                prefix = 'BL'
            product_code = f"{prefix}-{i:03d}"
            
            # Handle duplicate name "221 Lami"
            product_name = p['name']
            if product_name == '221 Lami' and p['category'] == 'rear_glass':
                product_name = '221 Lami (Backlight)'
            
            # Check if exists
            product = Product.query.filter_by(product_code=product_code).first()
            if not product:
                # Determine tags
                tags = ['backlight'] if p['category'] == 'rear_glass' else ['windshield']
                
                product = Product(
                    product_code=product_code,
                    name=product_name,
                    category=category_map[p['category']],
                    tags=tags,
                    stock_quantity=0,
                    low_stock_threshold=1,
                    is_active=True
                )
                db.session.add(product)
                db.session.flush()
                print(f"  Created: {product_code} - {product_name}")
            else:
                print(f"  Exists: {product_code}")
            
            backlight_products.append({
                'product_id': product.id,
                'quantity': p['quantity']
            })
        
        # Create stock intake for backlight/windshield
        intake1 = StockIntake(
            intake_date=date.today(),
            supplier_name='Excel Import - Backlight & Windshield',
            notes='Imported from ALL BACKLIGHT AND WINDSHIELD.xlsx',
            status='pending',
            created_by_user_id=abbas.id
        )
        db.session.add(intake1)
        db.session.flush()
        
        for item in backlight_products:
            intake_item = StockIntakeItem(
                stock_intake_id=intake1.id,
                product_id=item['product_id'],
                quantity=item['quantity'],
                purchase_price_per_unit=None
            )
            db.session.add(intake_item)
        
        print(f"\n✅ Created {len(backlight_products)} backlight/windshield products")
        print(f"✅ Stock Intake ID: {intake1.id}")
        
        # ========== IMPORT SUNROOF ==========
        print("\n" + "="*50)
        print("📦 IMPORTING SUNROOF PRODUCTS")
        print("="*50)
        
        with open('sunroof_products_to_import.json', 'r') as f:
            sunroof_data = json.load(f)
        
        sunroof_products = []
        for i, p in enumerate(sunroof_data, 1):
            product_code = f"SR-{i:03d}"
            
            product = Product.query.filter_by(product_code=product_code).first()
            if not product:
                product = Product(
                    product_code=product_code,
                    name=p['name'],
                    category=ProductCategory.SUNROOF,
                    tags=p['tags'],
                    stock_quantity=0,
                    low_stock_threshold=1,
                    is_active=True
                )
                db.session.add(product)
                db.session.flush()
                print(f"  Created: {product_code} - {p['name']}")
            else:
                print(f"  Exists: {product_code}")
            
            sunroof_products.append({
                'product_id': product.id,
                'quantity': p['quantity']
            })
        
        # Create stock intake for sunroofs
        intake2 = StockIntake(
            intake_date=date.today(),
            supplier_name='Excel Import - All Sunroofs',
            notes='Imported from all sunroof.xlsx',
            status='pending',
            created_by_user_id=abbas.id
        )
        db.session.add(intake2)
        db.session.flush()
        
        for item in sunroof_products:
            if item['quantity'] > 0:
                intake_item = StockIntakeItem(
                    stock_intake_id=intake2.id,
                    product_id=item['product_id'],
                    quantity=item['quantity'],
                    purchase_price_per_unit=None
                )
                db.session.add(intake_item)
        
        print(f"\n✅ Created {len(sunroof_products)} sunroof products")
        print(f"✅ Stock Intake ID: {intake2.id}")
        
        # Commit all changes
        db.session.commit()
        
        print("\n" + "="*50)
        print("🎉 IMPORT COMPLETE!")
        print("="*50)
        print(f"📦 Total products: {len(backlight_products) + len(sunroof_products)}")
        print(f"📋 Stock Intakes: {intake1.id}, {intake2.id} (PENDING)")

if __name__ == '__main__':
    import_products()
