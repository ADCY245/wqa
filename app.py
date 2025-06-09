from flask import Flask, render_template, send_from_directory, request, redirect, url_for, jsonify, flash
from waitress import serve
import os
import json
from datetime import datetime
import uuid

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
        print("Loading cart data...")  # Debug log
        cart_data = load_cart()
        print(f"Cart data: {cart_data}")  # Debug log
        
        # Ensure products is a list
        if not isinstance(cart_data.get('products'), list):
            print("Products is not a list, initializing empty list")  # Debug log
            cart_data['products'] = []
            save_cart(cart_data)
            
        # Calculate total price safely
        total_price = 0
        for item in cart_data['products']:
            try:
                # Ensure total_price is a number
                price = float(item.get('total_price', 0))
                total_price += price
            except (ValueError, TypeError) as e:
                print(f"Error processing item price: {e}")
                continue
                
        print(f"Calculated total price: {total_price}")  # Debug log
        return render_template('cart.html', cart=cart_data, total=round(total_price, 2))
        
    except Exception as e:
        print(f"Error in cart route: {str(e)}")
        # Return empty cart in case of error
        return render_template('cart.html', cart={"products": []}, total=0)

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
        if not os.path.exists(CART_FILE):
            return {"products": []}
        with open(CART_FILE, 'r') as f:
            cart = json.load(f)
            # Ensure the cart has the products list
            if 'products' not in cart:
                cart = {"products": []}
            return cart
    except json.JSONDecodeError:
        # If the file is corrupted, reset it
        return {"products": []}
    except Exception as e:
        print(f"Error loading cart: {e}")
        return {"products": []}

def save_cart(cart):
    try:
        # Ensure the directory exists
        os.makedirs(os.path.dirname(CART_FILE), exist_ok=True)
        # Write to a temporary file first to prevent corruption
        temp_file = f"{CART_FILE}.tmp"
        with open(temp_file, 'w') as f:
            json.dump(cart, f, indent=2)
        # Rename the temp file to the actual file (atomic operation)
        if os.path.exists(CART_FILE):
            os.replace(temp_file, CART_FILE)
        else:
            os.rename(temp_file, CART_FILE)
    except Exception as e:
        print(f"Error saving cart: {e}")
        # If there's an error, try to save to a backup file
        backup_file = f"{CART_FILE}.bak.{int(datetime.now().timestamp())}"
        try:
            with open(backup_file, 'w') as f:
                json.dump(cart, f, indent=2)
            print(f"Cart backup saved to {backup_file}")
        except Exception as backup_error:
            print(f"Failed to save backup: {backup_error}")

from flask import request, jsonify

@app.route('/add_to_cart', methods=['POST'])
def add_to_cart():
    if not request.is_json:
        return jsonify({"success": False, "message": "Invalid JSON."}), 400
    
    try:
        product = request.get_json()
        cart = load_cart()
        
        # Add timestamp and ensure ID exists
        if 'id' not in product:
            product['id'] = str(uuid.uuid4())
        if 'added_at' not in product:
            product['added_at'] = datetime.now().isoformat()
        
        # Check if the cart has space (limit to 100 items)
        if len(cart['products']) >= 100:
            return jsonify({"success": False, "message": "Cart is full. Maximum 100 items allowed."}), 400
        
        # Add the new product
        cart['products'].append(product)
        save_cart(cart)
        
        return jsonify({
            "success": True, 
            "message": "Product added to cart.",
            "cart_count": len(cart['products'])
        }), 201
        
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

@app.route('/send-invoice', methods=['POST'])
def send_invoice():
    # Clear the cart after "sending" invoice
    cart = {"products": []}
    save_cart(cart)

    flash('Invoice sent and cart cleared.', 'success')
    return redirect(url_for('cart'))

# ---------- START APP ---------- #

if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=8080)
