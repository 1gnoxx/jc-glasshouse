"""
Migration script to assign all existing product stock to BhaiJaan warehouse.

This script should be run once after deploying the multi-warehouse feature.
It will:
1. Create ProductStock records for each product at BhaiJaan warehouse
2. Set the quantity equal to the product's current stock_quantity

Usage:
    cd workshop-inventory/backend
    source venv/bin/activate
    python migrate_stock_to_bhaijaan.py
"""

import sys
import os

# Add the parent directory to the path so we can import from the app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, Product, Warehouse, ProductStock

def migrate_stock_to_bhaijaan():
    """Assign all existing product stock to BhaiJaan warehouse"""
    
    app = create_app()
    
    with app.app_context():
        # Find BhaiJaan warehouse
        bhaijaan = Warehouse.query.filter_by(code='BHAIJAAN').first()
        
        if not bhaijaan:
            print("❌ BhaiJaan warehouse not found! Make sure the database is initialized.")
            return False
        
        print(f"✅ Found BhaiJaan warehouse (ID: {bhaijaan.id})")
        
        # Get all products with stock > 0
        products = Product.query.filter(Product.stock_quantity > 0).all()
        
        if not products:
            print("ℹ️  No products with stock found. Nothing to migrate.")
            return True
        
        print(f"📦 Found {len(products)} products with stock to migrate")
        
        migrated_count = 0
        skipped_count = 0
        
        for product in products:
            # Check if ProductStock already exists for this product at BhaiJaan
            existing_stock = ProductStock.query.filter_by(
                product_id=product.id,
                warehouse_id=bhaijaan.id
            ).first()
            
            if existing_stock:
                if existing_stock.quantity == product.stock_quantity:
                    skipped_count += 1
                    continue
                else:
                    # Update existing record
                    print(f"  Updating {product.name}: {existing_stock.quantity} → {product.stock_quantity}")
                    existing_stock.quantity = product.stock_quantity
                    migrated_count += 1
            else:
                # Create new ProductStock record
                product_stock = ProductStock(
                    product_id=product.id,
                    warehouse_id=bhaijaan.id,
                    quantity=product.stock_quantity
                )
                db.session.add(product_stock)
                print(f"  ➕ {product.name}: {product.stock_quantity} units → BhaiJaan")
                migrated_count += 1
        
        db.session.commit()
        
        print(f"\n✅ Migration complete!")
        print(f"   📊 Migrated: {migrated_count} products")
        print(f"   ⏭️  Skipped (already migrated): {skipped_count} products")
        
        return True

if __name__ == '__main__':
    print("=" * 50)
    print("Stock Migration: Assign all stock to BhaiJaan")
    print("=" * 50)
    print()
    
    success = migrate_stock_to_bhaijaan()
    
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
