(function () {
  const tableBody = document.getElementById('cartTableBody');
  if (!tableBody) return;

  const summaryBox = document.getElementById('cartSummaryBox');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const offerInput = document.getElementById('offerCodeInput');
  const applyOfferBtn = document.getElementById('applyOfferBtn');
  const offerStatusText = document.getElementById('offerStatusText');
  const discountRow = document.getElementById('discountRow');
  const discountValue = document.getElementById('discountValue');
  const pricingState = (function () {
    const pricingNode = document.getElementById('cartPricingData');
    if (!pricingNode) return null;

    try {
      return JSON.parse(pricingNode.textContent || 'null');
    } catch {
      return null;
    }
  })();
  const checkoutBtn = document.getElementById('checkoutBtn');
  const orderPlacedModal = document.getElementById('orderPlacedModal');
  const orderPopupMessage = document.getElementById('orderPopupMessage');
  const orderPopupCloseBtn = document.getElementById('orderPopupCloseBtn');
  const paymentCodRadio = document.getElementById('paymentCod');

  function setHeaderCount(count) {
    const badge = document.querySelector('.cart-count');
    if (badge) badge.textContent = String(count || 0);
  }

  function renderMoney(el, value) {
    if (el) el.textContent = `₹${value}`;
  }

  function renderOfferStatus(message, isError = false) {
    if (!offerStatusText) return;
    offerStatusText.textContent = message || '';
    offerStatusText.classList.toggle('is-error', !!isError);
    offerStatusText.classList.toggle('is-success', !isError && !!message);
  }

  function recalculateSummary(pricingOverride = null) {
    const rows = tableBody.querySelectorAll('.cart-item-row');
    let itemTotal = 0;

    rows.forEach((row) => {
      const price = Number(row.dataset.price || 0);
      const qty = Number(row.querySelector('.cart-qty-value')?.textContent || 0);
      itemTotal += price * qty;
    });

    const deliveryFee = rows.length ? 30 : 0;
    const taxes = rows.length ? Math.round(itemTotal * 0.05) : 0;
    const discount = pricingOverride ? Number(pricingOverride.discount || 0) : 0;
    const grandTotal = Math.max(itemTotal + deliveryFee + taxes - discount, 0);

    renderMoney(document.getElementById('itemTotalValue'), itemTotal);
    renderMoney(document.getElementById('deliveryFeeValue'), deliveryFee);
    renderMoney(document.getElementById('taxesValue'), taxes);
    renderMoney(discountValue, discount);
    renderMoney(document.getElementById('grandTotalValue'), grandTotal);

    if (discountRow) {
      discountRow.classList.toggle('hidden-row', discount <= 0);
    }

    if (!rows.length) {
      if (summaryBox) summaryBox.remove();
      if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-text">Your cart is empty.</p><a href="/pizza" class="continue-shopping">← Continue Ordering</a>';
      }
    }
  }

  async function postData(url, payload) {
    const body = new URLSearchParams(payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'fetch'
      },
      body
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || data.loginRequired) {
      window.location.href = '/login';
      return null;
    }

    return data;
  }

  function showOrderPopup(message) {
    if (!orderPlacedModal || !orderPopupMessage) {
      window.alert(message);
      return;
    }

    orderPopupMessage.textContent = message;
    orderPlacedModal.style.display = 'flex';
  }

  function hideOrderPopup() {
    if (orderPlacedModal) {
      orderPlacedModal.style.display = 'none';
    }
  }

  function syncPricing(payload) {
    if (!payload) return;
    const pricing = payload.pricing || null;

    if (pricing?.appliedOffer) {
      const appliedOffer = pricing.appliedOffer;
      if (offerInput) offerInput.value = appliedOffer.code || '';
      renderOfferStatus(`${appliedOffer.label}${appliedOffer.valid ? ' applied' : ''}`, !appliedOffer.valid);
    } else {
      renderOfferStatus('');
    }

    recalculateSummary(pricing);
  }

  async function handleQtyAction(row, action) {
    const name = row.dataset.name;
    const image = row.dataset.image;
    const qtyEl = row.querySelector('.cart-qty-value');
    const rowTotalEl = row.querySelector('.cart-row-total');
    const price = Number(row.dataset.price || 0);

    const data = await postData('/api/cart/update', { name, image, action });
    if (!data || !data.success) return;

    const qty = Number(data.itemQuantity || 0);
    setHeaderCount(data.cartCount || 0);

    if (qty <= 0) {
      row.remove();
    } else {
      qtyEl.textContent = String(qty);
      rowTotalEl.textContent = `₹${price * qty}`;
    }

    syncPricing(data);
  }

  async function handleRemove(row) {
    const name = row.dataset.name;
    const image = row.dataset.image;

    const data = await postData('/api/cart/remove', { name, image });
    if (!data || !data.success) return;

    row.remove();
    setHeaderCount(data.cartCount || 0);
    syncPricing(data);
  }

  async function applyOffer(code) {
    if (!code) {
      renderOfferStatus('Please enter an offer code', true);
      return;
    }

    const data = await postData('/api/cart/apply-offer', { code });
    if (!data || !data.success) {
      renderOfferStatus(data?.message || 'Invalid offer code', true);
      return;
    }

    renderOfferStatus(data.message || 'Offer applied', false);
    syncPricing(data);
  }

  async function checkoutNow() {
    if (!checkoutBtn) return;

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Placing Order...';

    const paymentMethod = paymentCodRadio?.checked ? 'cod' : 'cod';
    const data = await postData('/api/cart/checkout', { paymentMethod });

    if (!data || !data.success) {
      renderOfferStatus(data?.message || 'Unable to place order right now', true);
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Proceed to Checkout';
      return;
    }

    setHeaderCount(0);

    const rows = tableBody.querySelectorAll('.cart-item-row');
    rows.forEach((row) => row.remove());

    if (summaryBox) summaryBox.remove();
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = '<p class="empty-cart-text">Your cart is empty.</p><a href="/pizza" class="continue-shopping">← Continue Ordering</a>';
    }

    const popupMessage = data.message || `Your order is placed with Cash on Delivery and will arrive in about ${data.etaMinutes || 30} minutes. Thank you!`;
    showOrderPopup(popupMessage);
  }

  if (applyOfferBtn) {
    applyOfferBtn.addEventListener('click', function () {
      applyOffer((offerInput?.value || '').trim());
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function () {
      checkoutNow();
    });
  }

  if (orderPopupCloseBtn) {
    orderPopupCloseBtn.addEventListener('click', hideOrderPopup);
  }

  if (orderPlacedModal) {
    orderPlacedModal.addEventListener('click', function (event) {
      if (event.target === orderPlacedModal) {
        hideOrderPopup();
      }
    });
  }

  const pendingOffer = new URLSearchParams(window.location.search).get('offer');
  if (pendingOffer) {
    applyOffer(pendingOffer.trim()).finally(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('offer');
      window.history.replaceState({}, '', url.toString());
    });
  } else if (pricingState) {
    syncPricing({ pricing: pricingState });
  }

  tableBody.addEventListener('click', function (event) {
    const qtyBtn = event.target.closest('.cart-qty-btn');
    const removeBtn = event.target.closest('.remove-cart-btn');
    const row = event.target.closest('.cart-item-row');

    if (!row) return;

    if (qtyBtn) {
      event.preventDefault();
      handleQtyAction(row, qtyBtn.dataset.action);
      return;
    }

    if (removeBtn) {
      event.preventDefault();
      handleRemove(row);
    }
  });
})();
