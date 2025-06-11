function calculateItemPrices(item) {
    if (item.type === 'mpack') {
        const price = parseFloat(item.unit_price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const discountPercent = parseFloat(item.discount_percent) || 0;
        const gstPercent = parseFloat(item.gst_percent) || 18;
        
        const discountAmount = (price * discountPercent / 100);
        const priceAfterDiscount = price - discountAmount;
        const gstAmount = (priceAfterDiscount * gstPercent / 100);
        const finalUnitPrice = priceAfterDiscount + gstAmount;
        const finalTotal = finalUnitPrice * quantity;
        
        item.calculations = {
            unitPrice: parseFloat(price.toFixed(2)),
            quantity: quantity,
            discountPercent: discountPercent,
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            priceAfterDiscount: parseFloat(priceAfterDiscount.toFixed(2)),
            gstPercent: gstPercent,
            gstAmount: parseFloat(gstAmount.toFixed(2)),
            finalUnitPrice: parseFloat(finalUnitPrice.toFixed(2)),
            finalTotal: parseFloat(finalTotal.toFixed(2))
        };
    }
    
    return item;
}

function addToCart(item) {
    item = calculateItemPrices(item);
    const addToCartBtn = event.target;
    const originalText = addToCartBtn.innerHTML;
    
    addToCartBtn.disabled = true;
    addToCartBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

    fetch('/add_to_cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Success', 'Item added to cart!', 'success');
            updateCartCount();
        } else {
            showToast('Error', data.message || 'Failed to add item to cart', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error', 'An error occurred while adding to cart', 'error');
    })
    .finally(() => {
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = originalText;
    });
}

// Function to update cart count in the UI
function updateCartCount() {
    fetch('/get_cart_count')
        .then(response => response.json())
        .then(data => {
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                cartCount.textContent = data.count;
                cartCount.style.display = data.count > 0 ? 'inline' : 'none';
            }
        })
        .catch(error => console.error('Error updating cart count:', error));
}

// Function to show toast notifications
function showToast(title, message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '1100';
        document.body.appendChild(toastContainer);
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type} border-0`;
    toast.role = 'alert';
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.style.marginBottom = '10px';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong><br>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Calculate product prices based on type
function calculateProductPrices(container) {
    const type = container.dataset.type;
    
    if (type === 'blanket') {
        calculateBlanketPrices(container);
    } else if (type === 'mpack') {
        calculateMPackPrices(container);
    }
}

// Calculate blanket prices
function calculateBlanketPrices(container) {
    // Get data attributes
    const area = parseFloat(container.dataset.area) || 0;
    const rate = parseFloat(container.dataset.rate) || 0;
    const basePrice = parseFloat(container.dataset.basePrice) || 0;
    const barPrice = parseFloat(container.dataset.barPrice) || 0;
    const quantity = parseInt(container.dataset.quantity) || 1;
    const discountPercent = parseFloat(container.dataset.discountPercent) || 0;
    const gstPercent = parseFloat(container.dataset.gstPercent) || 18;
    
    // Calculate prices
    const pricePerUnit = basePrice + barPrice;
    const subtotal = pricePerUnit * quantity;
    const discountAmount = subtotal * (discountPercent / 100);
    const discountedSubtotal = subtotal - discountAmount;
    const gstAmount = (discountedSubtotal * gstPercent) / 100;
    const finalTotal = discountedSubtotal + gstAmount;
    
    // Update UI
    container.querySelector('.area').textContent = area.toFixed(4);
    container.querySelector('.rate').textContent = rate.toFixed(2);
    container.querySelector('.base-price').textContent = basePrice.toFixed(2);
    container.querySelector('.quantity').textContent = quantity;
    container.querySelector('.quantity-display').textContent = quantity;
    
    // Handle barring price display
    const barringRow = container.querySelector('.barring-row');
    if (barPrice > 0) {
        barringRow.classList.remove('d-none');
        container.querySelector('.bar-price-display').textContent = barPrice.toFixed(2);
        container.querySelector('.price-per-unit').textContent = pricePerUnit.toFixed(2);
    } else {
        barringRow.classList.add('d-none');
    }
    
    // Handle discount display
    const discountRow = container.querySelector('.discount-row');
    if (discountPercent > 0) {
        discountRow.classList.remove('d-none');
        container.querySelector('.discount-percent').textContent = discountPercent;
        container.querySelector('.discount-amount').textContent = discountAmount.toFixed(2);
        container.querySelector('.after-discount').textContent = discountedSubtotal.toFixed(2);
    } else {
        discountRow.classList.add('d-none');
    }
    
    // Update remaining fields
    container.querySelector('.subtotal').textContent = subtotal.toFixed(2);
    container.querySelector('.gst-percent').textContent = gstPercent;
    container.querySelector('.gst-amount').textContent = gstAmount.toFixed(2);
    container.querySelector('.final-total').textContent = finalTotal.toFixed(2);
}

// Calculate MPack prices
function calculateMPackPrices(container) {
    // Get data attributes
    const unitPrice = parseFloat(container.dataset.unitPrice) || 0;
    const quantity = parseInt(container.dataset.quantity) || 1;
    const discountPercent = parseFloat(container.dataset.discountPercent) || 0;
    const gstPercent = parseFloat(container.dataset.gstPercent) || 18;
    
    // Calculate prices
    const subtotal = unitPrice * quantity;
    const discountAmount = subtotal * (discountPercent / 100);
    const priceAfterDiscount = subtotal - discountAmount;
    const gstAmount = (priceAfterDiscount * gstPercent) / 100;
    const finalTotal = priceAfterDiscount + gstAmount;
    
    // Update UI
    container.querySelector('.unit-price').textContent = unitPrice.toFixed(2);
    container.querySelector('.quantity').textContent = quantity;
    
    // Handle discount display
    const discountRow = container.querySelector('.discount-row');
    if (discountPercent > 0) {
        discountRow.classList.remove('d-none');
        container.querySelector('.discount-percent').textContent = discountPercent;
        container.querySelector('.discount-amount').textContent = discountAmount.toFixed(2);
        container.querySelector('.after-discount').textContent = priceAfterDiscount.toFixed(2);
    } else {
        discountRow.classList.add('d-none');
    }
    
    // Update GST and total
    container.querySelector('.gst-percent').textContent = gstPercent;
    container.querySelector('.gst-amount').textContent = gstAmount.toFixed(2);
    container.querySelector('.final-total').textContent = finalTotal.toFixed(2);
}

// Initialize cart and calculations when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();
    
    // Initialize price calculations for all products
    document.querySelectorAll('.price-breakdown').forEach(container => {
        calculateProductPrices(container);
    });
});

