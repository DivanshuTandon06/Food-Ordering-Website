(function () {
  const controls = document.querySelectorAll('.item-cart-controls');
  if (!controls.length) return;

  function itemKey(name, image) {
    return `${name}||${image}`;
  }

  function setHeaderCount(count) {
    const badge = document.querySelector('.cart-count');
    if (badge) badge.textContent = String(count || 0);
  }

  function updateControlUI(control, count) {
    const minusBtn = control.querySelector('.pizza-minus-btn');
    const plusBtn = control.querySelector('.pizza-plus-btn');
    const countEl = control.querySelector('.pizza-item-count');

    countEl.textContent = String(count);

    if (count <= 0) {
      control.classList.add('is-empty');
      plusBtn.textContent = 'Add +';
      minusBtn.disabled = true;
    } else {
      control.classList.remove('is-empty');
      plusBtn.textContent = '+';
      minusBtn.disabled = false;
    }
  }

  async function postForm(url, payload) {
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

  async function loadInitialCounts() {
    const response = await fetch('/api/cart/items', {
      headers: { 'X-Requested-With': 'fetch' }
    });

    if (response.status === 401) return;

    const data = await response.json().catch(() => null);
    if (!data || !data.success) return;

    const qtyMap = new Map();
    data.items.forEach((item) => {
      qtyMap.set(itemKey(item.name, item.image), Number(item.quantity) || 0);
    });

    controls.forEach((control) => {
      const name = control.dataset.name;
      const image = control.dataset.image;
      const qty = qtyMap.get(itemKey(name, image)) || 0;
      updateControlUI(control, qty);
    });

    setHeaderCount(data.cartCount || 0);
  }

  controls.forEach((control) => {
    const plusBtn = control.querySelector('.pizza-plus-btn');
    const minusBtn = control.querySelector('.pizza-minus-btn');

    updateControlUI(control, 0);

    plusBtn.addEventListener('click', async function () {
      const payload = {
        name: control.dataset.name,
        price: control.dataset.price,
        image: control.dataset.image
      };

      const data = await postForm('/api/cart/add', payload);
      if (!data) return;

      updateControlUI(control, data.itemQuantity || 0);
      setHeaderCount(data.cartCount || 0);
    });

    minusBtn.addEventListener('click', async function () {
      if (minusBtn.disabled) return;

      const payload = {
        name: control.dataset.name,
        image: control.dataset.image,
        action: 'dec'
      };

      const data = await postForm('/api/cart/update', payload);
      if (!data) return;

      updateControlUI(control, data.itemQuantity || 0);
      setHeaderCount(data.cartCount || 0);
    });
  });

  loadInitialCounts();
})();
