
import os
from sqlalchemy import create_engine, text

# Get database URL from environment or use local sqlite
database_url = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

print(f"🔌 Connecting to database...")

try:
    engine = create_engine(database_url)
    with engine.connect() as conn:
        print("🔍 Checking if warehouse_id column exists in stock_intake...")
        
        # Check if column exists
        try:
            # Try to select the column
            conn.execute(text("SELECT warehouse_id FROM stock_intake LIMIT 1"))
            print("✅ Column 'warehouse_id' already exists.")
        except Exception:
            print("⚠️ Column 'warehouse_id' MISSING. Attempting to add it...")
            
            # Rollback previous failed transaction if any
            # conn.rollback() 
            
            # Add the column
            try:
                # Need to use a new connection/transaction for schema change often
                with engine.begin() as trans_conn:
                    print("🛠️ Running ALTER TABLE...")
                    trans_conn.execute(text("ALTER TABLE stock_intake ADD COLUMN warehouse_id INTEGER REFERENCES warehouse(id)"))
                print("✅ successfully added 'warehouse_id' column!")
            except Exception as e:
                print(f"❌ Failed to add column: {e}")
                
    print("✨ Schema check complete.")

except Exception as e:
    print(f"❌ Fatal error: {e}")
