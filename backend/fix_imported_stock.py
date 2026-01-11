"""
Fix Script: Sync stock quantities for imported pending intakes

This script fixes the issue where the import script created products with stock_quantity=0
but created StockIntakeItems with quantities that were never added to the products.

Run this with: DATABASE_URL=<your_neon_url> python fix_imported_stock.py
"""

import os

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL environment variable not set!")
    print("Run with: DATABASE_URL='postgresql://...' python fix_imported_stock.py")
    exit(1)

# Fix postgres:// vs postgresql:// issue
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

os.environ['DATABASE_URL'] = DATABASE_URL

from app import create_app
from models import db, Product, StockIntake, StockIntakeItem

app = create_app()

def fix_stock_quantities():
    with app.app_context():
        print("🔍 Finding completed stock intakes from imports...")
        
        # Find intakes that were imported (by supplier name pattern)
        import_intakes = StockIntake.query.filter(
            StockIntake.supplier_name.like('%Excel Import%')
        ).all()
        
        print(f"Found {len(import_intakes)} imported stock intakes")
        
        total_fixed = 0
        
        for intake in import_intakes:
            print(f"\n📋 Processing Intake #{intake.id}: {intake.supplier_name} ({intake.status})")
            
            for item in intake.items:
                product = Product.query.get(item.product_id)
                if product:
                    # Check if stock needs to be added
                    # For imported items, stock_quantity was set to 0 initially
                    # We need to add the intake item quantity
                    
                    print(f"  {product.product_code}: Current stock={product.stock_quantity}, Intake qty={item.quantity}")
                    
                    # Add the stock quantity from this intake
                    product.stock_quantity += item.quantity
                    
                    # Also update purchase price if available
                    if item.purchase_price_per_unit is not None:
                        product.purchase_price = item.purchase_price_per_unit
                    
                    total_fixed += 1
        
        db.session.commit()
        
        print(f"\n{'='*50}")
        print(f"✅ Fixed {total_fixed} products' stock quantities!")
        print(f"{'='*50}")

if __name__ == '__main__':
    fix_stock_quantities()
