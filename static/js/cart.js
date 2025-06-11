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

// Initialize cart count when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();
});
