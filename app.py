from flask import Flask, render_template, send_from_directory, request, redirect, url_for, jsonify, flash, session
from waitress import serve
import os
import json
from datetime import datetime
import uuid

# For Render deployment - use in-memory storage
class CartStore:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.cart = {"products": []}
        return cls._instance
    
    def get_cart(self):
        return self.cart
    
    def save_cart(self, cart):
        self.cart = cart
        return True

# Initialize cart store
cart_store = CartStore()

# Ensure the data directory exists
os.makedirs('static/data', exist_ok=True)

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'your-secret-key'  # Needed for flash messages

CART_FILE = os.path.join('static', 'data', 'cart.json')

# Initialize cart file if it doesn't exist
if not os.path.exists(CART_FILE):
    with open(CART_FILE, 'w') as f:
        json.dump({"products": []}, f)

# ---------- ROUTES ---------- #

@app.route('/')
def home():
    return render_template('display.html')

@app.route('/blankets')
def blankets():
    return render_template('products/blankets/blankets.html')

@app.route('/mpack')
def mpack():
    return render_template('products/chemicals/mpack.html')

@app.route('/cart')
def cart():
    try:
        print("\n=== [CART ROUTE] Loading cart data ===")
        
        # Load cart data
        cart_data = load_cart()
        print(f"[CART ROUTE] Raw cart data from file: {cart_data}")
        
        # Initialize cart if it doesn't exist
        if cart_data is None:
            print("[CART ROUTE] Cart data is None, initializing empty cart")
            cart_data = {"products": []}
            save_cart(cart_data)
        
        # Ensure products is a list
        if not isinstance(cart_data.get('products'), list):
            print(f"[CART ROUTE] Products is not a list (type: {type(cart_data.get('products'))}), initializing empty list")
            cart_data['products'] = []
            save_cart(cart_data)
        
        # Debug output
        print(f"[CART ROUTE] Number of products in cart: {len(cart_data.get('products', []))}")
        for i, product in enumerate(cart_data.get('products', []), 1):
            print(f"[CART ROUTE] Product {i}:")
            print(f"  Name: {product.get('name', 'Unnamed')}")
            print(f"  Type: {product.get('type', 'unknown')}")
            print(f"  Calculations: {product.get('calculations', 'No calculations')}")
            
        # Ensure all products have required fields
        for product in cart_data.get('products', []):
            if 'id' not in product:
                product['id'] = str(uuid.uuid4())
            if 'added_at' not in product:
                product['added_at'] = datetime.now().isoformat()
                
            # Ensure calculations exist for MPack products
            if product.get('type') == 'mpack':
                print(f"[CART ROUTE] Processing MPack product: {product.get('name')}")
                # Ensure all required fields exist
                product['unit_price'] = product.get('unit_price', 0)
                product['quantity'] = product.get('quantity', 1)
                product['discount_percent'] = product.get('discount_percent', 0)
                product['gst_percent'] = product.get('gst_percent', 12)
                
                # Calculate derived values
                subtotal = product['unit_price'] * product['quantity']
                discount_amount = subtotal * (product['discount_percent'] / 100)
                price_after_discount = subtotal - discount_amount
                gst_amount = (price_after_discount * product['gst_percent']) / 100
                final_total = price_after_discount + gst_amount
                
                # Update product with calculations
                product['calculations'] = {
                    'unitPrice': product['unit_price'],
                    'quantity': product['quantity'],
                    'subtotal': subtotal,
                    'discountPercent': product['discount_percent'],
                    'discountAmount': discount_amount,
                    'priceAfterDiscount': price_after_discount,
                    'gstPercent': product['gst_percent'],
                    'gstAmount': gst_amount,
                    'finalTotal': final_total
                }
                
                # Update the product's total_price to match the calculated final total
                product['total_price'] = final_total
                
        # Save any updates
        save_cart(cart_data)
            
        # Calculate total price - use the pre-calculated total_price which already includes GST
        total_price = 0
        for item in cart_data['products']:
            try:
                # The item's total_price is already calculated with GST in the add_to_cart function
                item_total = float(item.get('total_price', 0))
                total_price += item_total
                
                # Debug log
                print(f"Item: {item.get('name', 'Unknown')}, Total: {item_total}, Type: {item.get('type', 'unknown')}")
                
            except (ValueError, TypeError) as e:
                print(f"Error processing item price: {e}")
                continue
                
        print(f"Calculated total price: {total_price}")  # Debug log
        return render_template('cart.html', cart=cart_data, total=round(total_price, 2))
        
    except Exception as e:
        import traceback
        print(f"Error in cart route: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        # Return empty cart in case of error
        return render_template('cart.html', cart={"products": []}, total=0), 500

# ---------- STATIC FILE SERVING ---------- #

@app.route('/blankets-data/<path:filename>')
def blankets_data(filename):
    return send_from_directory('static/products/blankets', filename)

@app.route('/chemicals-data/<path:filename>')
def chemicals_data(filename):
    return send_from_directory('static/chemicals', filename)

# ---------- CART HANDLING ---------- #

def load_cart():
    try:
        # For Render, use in-memory store
        cart = cart_store.get_cart()
        # Ensure the cart has the products list
        if 'products' not in cart:
            cart = {"products": []}
        return cart
    except Exception as e:
        print(f"Error loading cart: {e}")
        return {"products": []}

def save_cart(cart):
    try:
        # For Render, use in-memory store
        return cart_store.save_cart(cart)
    except Exception as e:
        print(f"Error saving cart: {e}")
        # For local development, you can uncomment the backup code
        # backup_file = f"{CART_FILE}.bak.{int(datetime.now().timestamp())}"
        # try:
        #     with open(backup_file, 'w') as f:
        #         json.dump(cart, f, indent=2)
        #     print(f"Cart backup saved to {backup_file}")
        # except Exception as backup_error:
        #     print(f"Failed to save backup: {backup_error}")
        return False

from flask import request, jsonify

@app.route('/add_to_cart', methods=['POST'])
def add_to_cart():
    print("\n=== Add to Cart Request ===")
    print(f"Request data: {request.data}")
    
    if not request.is_json:
        error_msg = "Invalid JSON in request"
        print(f"Error: {error_msg}")
        return jsonify({"success": False, "message": error_msg}), 400
    
    try:
        product = request.get_json()
        print(f"Product data received: {json.dumps(product, indent=2)}")
        
        cart = load_cart()
        print(f"Current cart before add: {json.dumps(cart, indent=2)}")
        
        # Add timestamp and ensure ID exists
        if 'id' not in product:
            product['id'] = str(uuid.uuid4())
        if 'added_at' not in product:
            product['added_at'] = datetime.now().isoformat()
        
        # Check if the cart has space (limit to 100 items)
        if len(cart['products']) >= 100:
            error_msg = "Cart is full. Maximum 100 items allowed."
            print(error_msg)
            return jsonify({"success": False, "message": error_msg}), 400
        
        # Add the new product
        cart['products'].append(product)
        print(f"Cart after adding product: {json.dumps(cart, indent=2)}")
        
        # Save the cart
        save_cart(cart)
        
        # Verify the cart was saved
        saved_cart = load_cart()
        print(f"Cart after save (verification): {json.dumps(saved_cart, indent=2)}")
        print(f"Number of products in saved cart: {len(saved_cart.get('products', []))}")
        
        response = {
            "success": True, 
            "message": "Product added to cart.",
            "cart_count": len(cart['products'])
        }
        print(f"Sending response: {json.dumps(response, indent=2)}")
        return jsonify(response), 201
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/get_cart_count')
def get_cart_count():
    try:
        cart = load_cart()
        return jsonify({
            'success': True,
            'count': len(cart.get('products', [])),
            'total': sum(float(item.get('total_price', 0)) for item in cart.get('products', []))
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/remove_from_cart', methods=['POST'])
def remove_from_cart():
    product_id = request.form['product_id']
    cart = load_cart()
    cart['products'] = [item for item in cart['products'] if item['id'] != product_id]
    save_cart(cart)
    return redirect(url_for('cart'))

@app.route('/clear_cart', methods=['POST'])
def clear_cart():
    try:
        cart = {"products": []}
        save_cart(cart)
        flash('All items have been removed from your cart.', 'success')
    except Exception as e:
        flash('An error occurred while clearing the cart.', 'error')
        app.logger.error(f"Error clearing cart: {str(e)}")
    return redirect(url_for('cart'))

@app.route('/send_invoice', methods=['POST'])
def send_invoice():
    try:
        cart = load_cart()
        if not cart.get('products'):  # Check if cart is empty
            flash('Your cart is empty. Add items before sending an invoice.', 'warning')
            return redirect(url_for('cart'))
            
        # Here you would typically generate and send the invoice
        # For now, we'll just clear the cart
        cart = {"products": []}
        save_cart(cart)
        
        flash('Invoice has been sent successfully!', 'success')
        return redirect(url_for('cart'))
    except Exception as e:
        flash('An error occurred while sending the invoice.', 'error')
        app.logger.error(f"Error sending invoice: {str(e)}")
        return redirect(url_for('cart'))

# ---------- START APP ---------- #

if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=8080)
