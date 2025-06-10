<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Cart</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="{{ url_for('static', filename='styles/style.css') }}">
    <style>
        .cart-container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
        }
        .cart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        .cart-item {
            display: flex;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #eee;
        }
        .item-details {
            flex-grow: 1;
            padding: 0 20px;
        }
        .item-price {
            font-weight: bold;
            margin: 5px 0;
        }
        .item-quantity {
            color: #666;
        }
        .remove-btn {
            background: none;
            border: none;
            color: #dc3545;
            cursor: pointer;
        }
        .cart-summary {
            margin-top: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        .empty-cart {
            text-align: center;
            padding: 50px 0;
        }
    </style>
</head>
<body>
    <div class="cart-container">
        <div class="cart-header">
            <h1>Your Shopping Cart</h1>
            <div class="d-flex align-items-center gap-3">
                <a href="{{ url_for('home') }}" class="btn btn-outline-primary">Continue Shopping</a>
                <span class="badge bg-primary">{{ cart.products|length }} items</span>
            </div>
        </div>

        {% if cart.products %}
            <div class="cart-items">
                {% for item in cart.products %}
                <div class="cart-item">
                    <div class="item-details">
                        <h5>{{ item.name or 'Unknown Product' }}</h5>
                        {% if item.type == 'blanket' %}
                            {% set unit_price_before_discount = item.unit_price / (1 + (item.gst_percent / 100)) %}
                            {% set subtotal_before_discount = unit_price_before_discount * item.quantity %}
                            {% set discount_amount = (subtotal_before_discount * (item.discount_percent / 100)) if item.discount_percent and item.discount_percent > 0 else 0 %}
                            {% set subtotal_after_discount = subtotal_before_discount - discount_amount %}
                            {% set gst_amount = (subtotal_after_discount * (item.gst_percent / 100)) if item.gst_percent else 0 %}
                            {% set final_total = subtotal_after_discount + gst_amount %}
                            
                            <p>Blanket Type: {{ item.name or 'Unknown' }}</p>
                            <p>Machine: {{ item.machine or 'Unknown' }}</p>
                            <p>Dimensions: {{ item.length or '0' }} x {{ item.width or '0' }} ({{ item.thickness or 'N/A' }})</p>
                            {% if item.bar_type and item.bar_type != 'None' %}
                                <p>Barring: {{ item.bar_type }}</p>
                            {% endif %}
                            
                            <!-- Price Breakdown -->
                            <div class="price-breakdown mt-3">
                                <div class="d-flex justify-content-between">
                                    <span>Subtotal ({{ item.quantity }} units):</span>
                                    <span>₹{{ "%.2f"|format(subtotal_before_discount) }}</span>
                                </div>
                                {% if item.discount_percent and item.discount_percent > 0 %}
                                <div class="d-flex justify-content-between text-danger">
                                    <span>Discount ({{ item.discount_percent }}%):</span>
                                    <span>-₹{{ "%.2f"|format(discount_amount) }}</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>After Discount:</span>
                                    <span>₹{{ "%.2f"|format(subtotal_after_discount) }}</span>
                                </div>
                                {% endif %}
                                <div class="d-flex justify-content-between">
                                    <span>GST ({{ item.gst_percent or 18 }}%):</span>
                                    <span>+₹{{ "%.2f"|format(gst_amount) }}</span>
                                </div>
                                <div class="d-flex justify-content-between fw-bold mt-2 pt-2 border-top">
                                    <span>Final Amount:</span>
                                    <span>₹{{ "%.2f"|format(final_total) }}</span>
                                </div>
                            </div>
                        {% elif item.type == 'mpack' %}
                            {% set base_price = item.unit_price %}
                            {% set quantity = item.quantity %}
                            {% set discount_percent = item.discount_percent or 0 %}
                            
                            {# Calculate prices like in mpack.js #}
                            {% set subtotal_before_discount = base_price * quantity %}
                            {% set discount_amount = (subtotal_before_discount * discount_percent / 100) if discount_percent > 0 else 0 %}
                            {% set subtotal_after_discount = subtotal_before_discount - discount_amount %}
                            {% set gst_percent = item.gst_percent or 12 %}
                            {% set gst_amount = (subtotal_after_discount * gst_percent / 100) %}
                            {% set final_total = subtotal_after_discount + gst_amount %}
                            
                            <p>Thickness: {{ item.thickness or 'Unknown' }} micron</p>
                            {% if item.size %}
                                <p>Size: {{ item.size }}</p>
                            {% endif %}
                            
                            <!-- Price Breakdown -->
                            <div class="price-breakdown mt-3">
                                <div class="d-flex justify-content-between">
                                    <span>Subtotal ({{ item.quantity }} units):</span>
                                    <span>₹{{ "%.2f"|format(subtotal_before_discount) }}</span>
                                </div>
                                {% if item.discount_percent and item.discount_percent > 0 %}
                                <div class="d-flex justify-content-between text-danger">
                                    <span>Discount ({{ item.discount_percent }}%):</span>
                                    <span>-₹{{ "%.2f"|format(discount_amount) }}</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>After Discount:</span>
                                    <span>₹{{ "%.2f"|format(subtotal_after_discount) }}</span>
                                </div>
                                {% endif %}
                                <div class="d-flex justify-content-between">
                                    <span>GST ({{ item.gst_percent or 12 }}%):</span>
                                    <span>+₹{{ "%.2f"|format(gst_amount) }}</span>
                                </div>
                                <div class="d-flex justify-content-between fw-bold mt-2 pt-2 border-top">
                                    <span>Final Amount:</span>
                                    <span>₹{{ "%.2f"|format(final_total) }}</span>
                                </div>
                            </div>
                        {% endif %}
                        <div class="item-price">₹{{ "%.2f"|format(item.total_price or 0) }}</div>
                        <div class="item-quantity">Quantity: {{ item.quantity or 1 }}</div>
                        {% if item.unit_price %}
                            <div class="unit-price">Unit Price: ₹{{ "%.2f"|format(item.unit_price or 0) }}</div>
                        {% endif %}
                    </div>
                    <form action="{{ url_for('remove_from_cart') }}" method="POST">
                        <input type="hidden" name="product_id" value="{{ item.id }}">
                        <button type="submit" class="remove-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </form>
                </div>
                {% endfor %}
            </div>

            <div class="cart-summary">
                <div class="d-flex justify-content-between align-items-center">
                    <h4>Total: ₹{{ "%.2f"|format(total) }}</h4>
                    <a href="#" class="btn btn-primary btn-lg">Proceed to Checkout</a>
                </div>
            </div>
        {% else %}
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <a href="{{ url_for('home') }}" class="btn btn-primary">Start Shopping</a>
            </div>
        {% endif %}
    </div>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    
    <style>
        .remove-btn {
            background: none;
            border: none;
            color: #dc3545;
            cursor: pointer;
            padding: 0;
            font-size: 1.25rem;
        }
        .remove-btn:hover {
            color: #a02d36;
        }
        .remove-btn:focus {
            outline: none;
            box-shadow: none;
        }
    </style>
</body>
</html>

