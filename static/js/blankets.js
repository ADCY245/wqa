let machineData = [], blanketData = [], barData = [], discountData = [], thicknessData = [];
let basePrice = 0, priceWithBar = 0, finalDiscountedPrice = 0;
let currentDiscount = 0;
let currentBarRate = 0;

window.onload = () => {
  fetch("/static/data/machine.json")
    .then(res => res.json())
    .then(data => {
      machineData = data.machines;
      const select = document.getElementById("machineSelect");
      select.innerHTML = '<option value="">--Select Machine--</option>';
      machineData.forEach(machine => {
        const option = document.createElement("option");
        option.value = machine.id;
        option.text = machine.name;
        select.appendChild(option);
      });
      select.addEventListener("change", () => {
        document.getElementById("blanketSection").style.display = 'block';
      });
    });

  fetch("/static/data/blankets.json")
    .then(res => res.json())
    .then(data => {
      blanketData = data.products;
      const blanketSelect = document.getElementById("blanketSelect");
      blanketSelect.innerHTML = '<option value="">--Select Blanket--</option>';
      blanketData.forEach(blanket => {
        const opt = document.createElement("option");
        opt.value = blanket.id;
        opt.text = blanket.name;
        blanketSelect.appendChild(opt);
      });

      blanketSelect.addEventListener("change", () => {
        displayRates();
        calculatePrice();
      });
    });

  fetch("/static/products/blankets/bar.json")
    .then(res => res.json())
    .then(data => {
      barData = data.bars;
      const barSelect = document.getElementById("barSelect");
      barSelect.innerHTML = '<option value="">--Select--</option>';
      barData.forEach(bar => {
        const opt = document.createElement("option");
        opt.value = bar.barRate;
        opt.text = bar.bar;
        barSelect.appendChild(opt);
      });

      barSelect.onchange = () => {
        currentBarRate = parseFloat(barSelect.value || 0);
        const barRateElement = document.getElementById("barRate");
        if (barRateElement) {
          barRateElement.innerText = `Barring Price/pc: ₹${currentBarRate.toFixed(2)}`;
        }
        calculatePrice();
      };
    });

  fetch("/static/data/discount.json")
    .then(res => res.json())
    .then(data => {
      discountData = data.discounts || [];
      console.log('Discount data loaded:', discountData);
    })
    .catch(error => {
      console.error('Error loading discount data:', error);
      discountData = [];
    });

  fetch("/static/data/thickness.json")
    .then(res => res.json())
    .then(data => {
      thicknessData = data.thicknesses || [];
      const select = document.getElementById("thicknessSelect");
      if (select) {
        select.innerHTML = '<option value="">-- Select Thickness --</option>';
        thicknessData.forEach(th => {
          const opt = document.createElement("option");
          opt.value = th.value;
          opt.textContent = th.label;
          select.appendChild(opt);
        });
        // Add change event to recalculate price when thickness changes
        select.addEventListener('change', calculatePrice);
      }
    })
    .catch(error => {
      console.error('Error loading thickness data:', error);
    });

  // Debug: Log when script loads
  console.log('Blankets script loaded');

  // Add event listeners for automatic updates
  const inputs = [
    { id: "lengthInput", type: "input" },
    { id: "widthInput", type: "input" },
    { id: "unitSelect", type: "change" },
    { id: "thicknessSelect", type: "change" },
    { id: "quantityInput", type: "input" },
    { id: "barSelect", type: "change" },
    { id: "gstSelect", type: "change" },
    { id: "discountSelect", type: "change" }
  ];
  
  inputs.forEach(({id, type}) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(type, (e) => {
        console.log(`${id} ${type} event triggered`);
        calculatePrice();
      });
    } else {
      console.warn(`Element with id '${id}' not found`);
    }
  });

  // Add click handler for calculate button
  const calculateBtn = document.querySelector('button[onclick*="calculatePrice"]');
  if (calculateBtn) {
    console.log('Found calculate button');
    calculateBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Calculate button clicked');
      calculatePrice();
    });
  } else {
    console.warn('Calculate button not found');
  }

  // Initialize discount section
  updateDiscountSection();
  
  // Initial calculation
  calculatePrice();
};

function convertToMeters(value, unit) {
  if (!value) {
    console.log('convertToMeters: No value provided, returning 0');
    return 0;
  }
  
  console.log(`convertToMeters: Converting ${value} ${unit} to meters`);
  
  let result;
  switch(unit) {
    case "mm": 
      result = value / 1000;
      break;
    case "m": 
      result = value;
      break;
    case "in": 
      result = value * 0.0254;
      break;
    default: 
      console.warn(`convertToMeters: Unknown unit '${unit}', returning value as is`);
      result = value;
  }
  
  console.log(`convertToMeters: ${value} ${unit} = ${result} meters`);
  return result;
}

function displayRates() {
  const selected = blanketData.find(p => p.id == document.getElementById("blanketSelect").value);
  if (selected) {
    document.getElementById("rateSqMeter").innerText = `₹${selected.ratePerSqMt}`;
    document.getElementById("rateSqYard").innerText = `₹${selected.ratePerSqYard}`;
  } else {
    document.getElementById("rateSqMeter").innerText = '-';
    document.getElementById("rateSqYard").innerText = '-';
  }
}

function calculatePrice() {
  console.log('calculatePrice called');
  
  // Get input values with fallbacks
  const length = parseFloat(document.getElementById("lengthInput")?.value) || 0;
  const width = parseFloat(document.getElementById("widthInput")?.value) || 0;
  const unit = document.getElementById("unitSelect")?.value || 'mm';
  const thickness = document.getElementById("thicknessSelect")?.value || '';
  const quantity = parseInt(document.getElementById("quantityInput")?.value) || 0;
  const blanketSelect = document.getElementById("blanketSelect");
  
  console.log('Input values:', { length, width, unit, thickness, quantity });
  
  if (!blanketSelect?.value) {
    console.log('No blanket selected');
    return;
  }
  
  // Convert string ID to number for comparison
  const selectedBlanket = blanketData.find(b => b.id.toString() === blanketSelect.value.toString());
  
  if (!selectedBlanket) {
    console.log('Selected blanket not found in data');
    return;
  }
  
  console.log('Selected blanket:', selectedBlanket);

  // Convert dimensions to meters
  const lengthM = convertToMeters(length, unit);
  const widthM = convertToMeters(width, unit);
  const areaSqM = lengthM * widthM;
  const areaSqYard = areaSqM * 1.19599; // 1 sq.m = 1.19599 sq.yd

  // Update area display
  const areaElement = document.getElementById("calculatedArea");
  if (areaElement) {
    areaElement.innerText = `Area per unit: ${areaSqM.toFixed(4)} m² (${areaSqYard.toFixed(4)} yd²)`;
  }

  // Calculate base price using ratePerSqMt (rate per square meter)
  console.log('Calculating base price:', {
    areaSqM,
    ratePerSqMt: selectedBlanket.ratePerSqMt,
    currentBarRate
  });
  
  basePrice = areaSqM * selectedBlanket.ratePerSqMt;
  console.log('Base price calculated:', basePrice);
  
  const basePriceElement = document.getElementById("basePrice");
  if (basePriceElement) {
    const displayText = `Base Price: ₹${basePrice.toFixed(2)}`;
    console.log('Updating base price display:', displayText);
    basePriceElement.innerText = displayText;
  } else {
    console.warn('basePriceElement not found');
  }

  // Update price with bar
  priceWithBar = basePrice + currentBarRate;
  console.log('Price with bar:', priceWithBar);
  
  // Only show base price in the left column
  const netUnitPriceElement = document.querySelectorAll("#netUnitPrice")[0];
  if (netUnitPriceElement) {
    netUnitPriceElement.innerText = ''; // Clear the left column price
  }
  
  // Show net price/unit after barring type in the right column
  const netPriceAfterBarElement = document.querySelectorAll("#netUnitPrice")[1];
  if (netPriceAfterBarElement) {
    const displayText = `Net Price/Unit: ₹${priceWithBar.toFixed(2)}`;
    console.log('Updating net unit price after bar:', displayText);
    netPriceAfterBarElement.innerText = displayText;
  }

  // Calculate total price
  const totalNetPrice = priceWithBar * quantity;
  console.log('Total net price:', totalNetPrice);
  
  const totalNetPriceElement = document.getElementById("totalNetPrice");
  if (totalNetPriceElement) {
    const displayText = `Total Net Price: ₹${totalNetPrice.toFixed(2)}`;
    console.log('Updating total net price:', displayText);
    totalNetPriceElement.innerText = displayText;
  } else {
    console.warn('totalNetPriceElement not found');
  }

  // Apply discount and GST
  applyDiscount();
  applyGST();
}

function applyDiscount() {
  const discountSelect = document.getElementById("discountSelect");
  const discountVal = discountSelect.value;
  const discountedValueElement = document.getElementById("discountedValue");
  
  if (discountVal) {
    const discount = parseFloat(discountVal.replace('%', '')) || 0;
    currentDiscount = discount;
    const discountAmount = (priceWithBar * discount) / 100;
    finalDiscountedPrice = priceWithBar - discountAmount;
    
    // Show discounted value per unit
    if (discountedValueElement) {
      discountedValueElement.style.display = 'block';
      discountedValueElement.textContent = `Discounted value/unit: ₹${discountAmount.toFixed(2)}`;
    }
  } else {
    currentDiscount = 0;
    finalDiscountedPrice = priceWithBar;
    // Hide discounted value display when no discount is selected
    if (discountedValueElement) {
      discountedValueElement.style.display = 'none';
    }
  }
}

function applyGST() {
  const quantity = parseInt(document.getElementById("quantityInput").value) || 0;
  if (quantity === 0) return;

  const gstRate = parseFloat(document.getElementById("gstSelect").value) || 0;
  const totalBeforeDiscount = priceWithBar * quantity;
  const discountAmount = (totalBeforeDiscount * currentDiscount) / 100;
  const totalAfterDiscount = totalBeforeDiscount - discountAmount;
  const gstAmount = (totalAfterDiscount * gstRate) / 100;
  const finalPrice = totalAfterDiscount + gstAmount;

  const finalPriceElement = document.getElementById("finalPrice");
  if (finalPriceElement) {
    finalPriceElement.innerHTML = `
      <div class="price-breakdown">
        <div class="d-flex justify-content-between">
          <span>Subtotal (${quantity} units):</span>
          <span>₹${totalBeforeDiscount.toFixed(2)}</span>
        </div>
        ${currentDiscount > 0 ? `
        <div class="d-flex justify-content-between text-danger">
          <span>Discount (${currentDiscount}%):</span>
          <span>-₹${discountAmount.toFixed(2)}</span>
        </div>
        <div class="d-flex justify-content-between">
          <span>After Discount:</span>
          <span>₹${totalAfterDiscount.toFixed(2)}</span>
        </div>` : ''}
        <div class="d-flex justify-content-between">
          <span>GST (${gstRate}%):</span>
          <span>+₹${gstAmount.toFixed(2)}</span>
        </div>
        <div class="d-flex justify-content-between fw-bold mt-2 pt-2 border-top">
          <span>Final Amount:</span>
          <span>₹${finalPrice.toFixed(2)}</span>
        </div>
      </div>
    `;
  }
}

function showDiscountSection() {
  const discountSection = document.getElementById('discountSection');
  const discountSelect = document.getElementById('discountSelect');
  
  if (!discountSection || !discountSelect) {
    console.error('Discount section or select element not found');
    return;
  }
  
  // Toggle display
  const isVisible = discountSection.style.display !== 'none';
  discountSection.style.display = isVisible ? 'none' : 'block';
  
  // Only initialize discount options if showing the section
  if (!isVisible) {
    // Clear existing options except the first one
    while (discountSelect.options.length > 1) {
      discountSelect.remove(1);
    }
    
    // Add discount options if we have data
    if (discountData && discountData.length > 0) {
      discountData.forEach(discount => {
        const option = new Option(`${discount}%`, discount);
        discountSelect.add(option);
      });
      
      // Add event listener for discount change
      discountSelect.onchange = applyDiscount;
      
      console.log('Discount options loaded:', discountData);
    } else {
      console.warn('No discount data available');
    }
  }
  
  // Recalculate price when showing/hiding discount
  calculatePrice();
}

function addBlanketToCart() {
  // Get input elements
  const blanketSelect = document.getElementById('blanketSelect');
  const machineSelect = document.getElementById('machineSelect');
  const thicknessSelect = document.getElementById('thicknessSelect');
  const lengthInput = document.getElementById('lengthInput');
  const widthInput = document.getElementById('widthInput');
  const quantityInput = document.getElementById('quantityInput');
  const barSelect = document.getElementById('barSelect');
  const gstSelect = document.getElementById('gstSelect');
  
  // Get input values
  const quantity = parseInt(quantityInput.value) || 1;
  const length = parseFloat(lengthInput.value) || 0;
  const width = parseFloat(widthInput.value) || 0;
  const unit = document.getElementById('unitSelect').value || 'mm';
  const gstPercent = parseFloat(gstSelect.value) || 0;
  
  // Get selected blanket
  const selectedBlanketId = parseInt(blanketSelect.value);
  const selectedBlanket = blanketData.find(b => b.id === selectedBlanketId);
  
  if (!selectedBlanket) {
    showToast('Error', 'Please select a valid blanket', 'error');
    return;
  }
  
  // Get barring information
  const selectedBar = barData.find(b => b.id === barSelect.value);
  const barType = selectedBar ? selectedBar.name : 'None';
  const barPrice = selectedBar ? parseFloat(selectedBar.price) : 0;
  
  // Convert dimensions to meters for calculation
  const lengthM = convertToMeters(length, unit);
  const widthM = convertToMeters(width, unit);
  const areaSqM = lengthM * widthM;
  
  // Calculate base price (area * rate per sq.meter)
  const basePrice = areaSqM * selectedBlanket.ratePerSqMt;
  
  // Apply barring price if any
  const priceWithBar = basePrice + barPrice;
  
  // Apply discount if any
  const discountAmount = currentDiscount > 0 ? (priceWithBar * currentDiscount / 100) : 0;
  const discountedPrice = priceWithBar - discountAmount;
  
  // Calculate GST on the discounted price
  const gstAmount = (discountedPrice * gstPercent) / 100;
  const finalUnitPrice = discountedPrice + gstAmount;
  const finalTotalPrice = finalUnitPrice * quantity;

  // Create product object with all calculated values
  const product = {
    id: 'blanket_' + Date.now(),
    type: 'blanket',
    name: selectedBlanket.name,
    machine: machineSelect.options[machineSelect.selectedIndex].text,
    thickness: thicknessSelect ? thicknessSelect.value : '',
    length: length,
    width: width,
    bar_type: barType,
    bar_price: barPrice,
    quantity: quantity,
    
    // Pre-calculated values for display
    calculations: {
      areaSqM: parseFloat(areaSqM.toFixed(4)),
      ratePerSqMt: selectedBlanket.ratePerSqMt,
      basePrice: parseFloat(basePrice.toFixed(2)),
      pricePerUnit: parseFloat(priceWithBar.toFixed(2)),
      subtotal: parseFloat((priceWithBar * quantity).toFixed(2)),
      discount_percent: currentDiscount,
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      discounted_subtotal: parseFloat((discountedPrice * quantity).toFixed(2)),
      gst_percent: gstPercent,
      gst_amount: parseFloat((gstAmount * quantity).toFixed(2)),
      final_price: parseFloat(finalTotalPrice.toFixed(2))
    },
    
    // For backward compatibility
    unit_price: parseFloat(finalUnitPrice.toFixed(2)),
    total_price: parseFloat(finalTotalPrice.toFixed(2)),
    
    // Other
    image: 'images/products/blanket-placeholder.jpg',
    added_at: new Date().toISOString()
  };
  
  console.log('Adding to cart with pre-calculated values:', JSON.stringify(product, null, 2));

  // Show loading state
  const addToCartBtn = event.target;
  const originalText = addToCartBtn.innerHTML;
  addToCartBtn.disabled = true;
  addToCartBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

  fetch('/add_to_cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('Success', 'Blanket added to cart!', 'success');
      updateCartCount();
    } else {
      showToast('Error', data.message || 'Failed to add to cart', 'error');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('Error', 'Failed to add to cart', 'error');
  })
  .finally(() => {
    addToCartBtn.disabled = false;
    addToCartBtn.innerHTML = originalText;
  });
}
