from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import enum
from sqlalchemy.sql import func

db = SQLAlchemy()

class User(db.Model):
    """User model for Abbas and Irfan with financial access control"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)  # 'abbas' or 'irfan'
    password_hash = db.Column(db.String(128))
    full_name = db.Column(db.String(100), nullable=False)  # 'Abbas' or 'Irfan'
    can_view_financials = db.Column(db.Boolean, default=False, nullable=False)  # Abbas: True, Irfan: False
    created_at = db.Column(db.DateTime, server_default=func.now())

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.full_name} ({self.username})>'

class ProductCategory(enum.Enum):
    """Categories for wholesale auto glass products"""
    SUNROOF = 'sunroof'
    WINDSHIELD = 'windshield'
    DOOR_GLASS = 'door_glass'
    REAR_GLASS = 'rear_glass'
    QUARTER_GLASS = 'quarter_glass'

class Product(db.Model):
    """Enhanced product model for wholesale auto glass inventory"""
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic Information
    product_code = db.Column(db.String(50), unique=True, nullable=False)  # SKU/Part Number
    name = db.Column(db.String(200), nullable=False)  # e.g., "Honda Civic 2020 Sunroof"
    category = db.Column(db.Enum(ProductCategory), nullable=True)  # Kept for backward compatibility
    tags = db.Column(db.JSON, nullable=False, default=list)  # Multi-tag support
    description = db.Column(db.Text, nullable=True)
    
    # Specifications
    length_mm = db.Column(db.Float, nullable=True)
    width_mm = db.Column(db.Float, nullable=True)
    thickness_mm = db.Column(db.Float, nullable=True)
    year = db.Column(db.String(50), nullable=True)  # e.g., "2020" or "2018-2023"
    
    # Inventory Management
    stock_quantity = db.Column(db.Integer, default=0, nullable=False)
    low_stock_threshold = db.Column(db.Integer, default=5)  # Alert when stock < 5
    
    # Pricing
    purchase_price = db.Column(db.Float, nullable=True)  # What you pay suppliers (Abbas only)
    selling_price = db.Column(db.Float, nullable=True)  # Optional: Set if there's a standard price
    
    # Image
    image_url = db.Column(db.String(255), nullable=True)  # Main product image
    
    # System Fields
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, onupdate=func.now())
    is_active = db.Column(db.Boolean, default=True)  # Can deactivate discontinued products
    
    # Legacy field (keep for migration compatibility)
    car_variant_id = db.Column(db.Integer, db.ForeignKey('car_variant.id'), nullable=True)
    
    @property
    def is_low_stock(self):
        """Check if product stock is below threshold"""
        return self.stock_quantity <= self.low_stock_threshold
    
    @property
    def profit_margin(self):
        """Calculate profit margin (Abbas only should see this)"""
        if self.purchase_price and self.selling_price:
            return self.selling_price - self.purchase_price
        return None
    
    @property
    def profit_percentage(self):
        """Calculate profit percentage (Abbas only should see this)"""
        if self.purchase_price and self.selling_price and self.purchase_price > 0:
            return ((self.selling_price - self.purchase_price) / self.purchase_price) * 100
        return None
    
    def __repr__(self):
        return f'<Product {self.product_code}: {self.name}>'

class Customer(db.Model):
    """Customer model for managing client database"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    company = db.Column(db.String(200), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    address = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now())
    
    # Relationship
    sales = db.relationship('Sale', backref='customer', lazy=True)

    def __repr__(self):
        return f'<Customer {self.name}>'

class Sale(db.Model):
    """Sales/Invoice model for wholesale transactions"""
    id = db.Column(db.Integer, primary_key=True)
    
    # Invoice Reference
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)  # INV-2024-001
    
    # Customer Info (Linked + Snapshot)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=True)
    customer_name = db.Column(db.String(150), nullable=False)
    customer_phone = db.Column(db.String(20), nullable=True)
    customer_company = db.Column(db.String(200), nullable=True)  # If B2B customer
    
    # Sale Details
    sale_date = db.Column(db.DateTime, server_default=func.now())
    status = db.Column(db.String(20), default='pending', nullable=False)  # 'pending' or 'completed'
    payment_status = db.Column(db.String(50), default='unpaid', nullable=False)  # unpaid, partial, paid
    payment_method = db.Column(db.String(50), nullable=True)  # cash, bank_transfer, credit, upi
    
    # Financial (Abbas only should see these)
    total_amount = db.Column(db.Float, nullable=False)  # Calculated from items
    discount_amount = db.Column(db.Float, default=0.0)
    amount_paid = db.Column(db.Float, default=0.0)
    
    # System
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    notes = db.Column(db.Text, nullable=True)  # Internal notes
    
    # Relationships
    created_by = db.relationship('User', backref='sales')
    items = db.relationship('SaleItem', backref='sale', lazy=True, cascade="all, delete-orphan")
    
    @property
    def balance_due(self):
        """Calculate remaining balance"""
        return self.total_amount - self.amount_paid
    
    def calculate_status(self):
        """Auto-calculate status based on whether all items have prices"""
        if not self.items:
            return 'pending'
        # If all items have unit prices > 0, mark as completed
        all_have_prices = all(item.unit_price is not None and item.unit_price > 0 for item in self.items)
        return 'completed' if all_have_prices else 'pending'
    
    def __repr__(self):
        return f'<Sale {self.invoice_number}: {self.customer_name}>'

class Payment(db.Model):
    """Payment record for a sale"""
    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.DateTime, server_default=func.now())
    payment_method = db.Column(db.String(50), nullable=False)  # cash, bank_transfer, etc.
    notes = db.Column(db.Text, nullable=True)
    
    # System
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now())
    
    # Relationships
    sale = db.relationship('Sale', backref=db.backref('payments', lazy=True, cascade="all, delete-orphan"))
    created_by = db.relationship('User')

    def __repr__(self):
        return f'<Payment {self.id}: {self.amount} for Sale {self.sale_id}>'

class SaleItem(db.Model):
    """Individual product line items in a sale"""
    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=True)  # Price at time of sale (nullable for pending sales)
    
    product = db.relationship('Product')
    
    @property
    def line_total(self):
        """Calculate line item total"""
        if self.unit_price is None:
            return 0
        return self.quantity * self.unit_price
    
    def __repr__(self):
        return f'<SaleItem: {self.quantity}x {self.product.name if self.product else "Unknown"}'

class StockIntake(db.Model):
    """Stock intake/purchase record model"""
    id = db.Column(db.Integer, primary_key=True)
    intake_date = db.Column(db.Date, nullable=False)
    supplier_name = db.Column(db.String(200), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending', nullable=False)  # 'pending' or 'completed'
    
    # System fields
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now())
    
    # Relationships
    created_by = db.relationship('User', backref='stock_intakes')
    items = db.relationship('StockIntakeItem', backref='intake', lazy=True, cascade="all, delete-orphan")
    
    @property
    def total_items_count(self):
        """Total number of different products in this intake"""
        return len(self.items)
    
    @property
    def total_quantity(self):
        """Total quantity across all items"""
        return sum(item.quantity for item in self.items)
    
    @property
    def total_cost(self):
        """Total cost of this stock intake"""
        return sum(item.quantity * (item.purchase_price_per_unit or 0) for item in self.items)
    
    def calculate_status(self):
        """Auto-calculate status based on whether all items have prices"""
        if not self.items:
            return 'pending'
        # If all items have purchase prices, mark as completed
        all_have_prices = all(item.purchase_price_per_unit is not None and item.purchase_price_per_unit > 0 for item in self.items)
        return 'completed' if all_have_prices else 'pending'
    
    def __repr__(self):
        return f'<StockIntake {self.intake_date}: {self.supplier_name}>'

class StockIntakeItem(db.Model):
    """Individual items in a stock intake record"""
    id = db.Column(db.Integer, primary_key=True)
    stock_intake_id = db.Column(db.Integer, db.ForeignKey('stock_intake.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    
    quantity = db.Column(db.Integer, nullable=False)
    purchase_price_per_unit = db.Column(db.Float, nullable=True)  # Optional - can be added later
    
    # Relationship
    product = db.relationship('Product')
    
    @property
    def total_cost(self):
        """Total cost for this line item"""
        return self.quantity * (self.purchase_price_per_unit or 0)
    
    def __repr__(self):
        return f'<StockIntakeItem: {self.quantity}x {self.product.name if self.product else "Unknown"}>'

class Expense(db.Model):
    """Expense tracking model for business expenses"""
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # salary, workers, rent, transport, stock_purchase, utilities, other
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Link to stock intake if this expense is from a stock purchase
    stock_intake_id = db.Column(db.Integer, db.ForeignKey('stock_intake.id'), nullable=True)
    
    # System fields
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now())
    
    # Relationships
    created_by = db.relationship('User', backref='expenses')
    stock_intake = db.relationship('StockIntake', backref='expense')
    
    def __repr__(self):
        return f'<Expense {self.date}: {self.category} - ₹{self.amount}>'

class CarVariant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    car_name = db.Column(db.String(200), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    sunroof_type = db.Column(db.String(100), nullable=False)
    sunroof_length_in = db.Column(db.Float)
    clip_positions = db.Column(db.String(255))
    product = db.relationship('Product', backref='car_variant', uselist=False, cascade="all, delete-orphan")

class TimelineEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, server_default=func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    user = db.relationship('User', backref='timeline_events')
