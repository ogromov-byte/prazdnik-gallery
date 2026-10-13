(() => {
  const products = [{"name": "Коломбина", "src": "assets/3e261e6db5223e6cc269.png", "url": "kolombina.html"}, {"name": "Зайчик", "src": "assets/zaychik/photo-01.webp", "url": "zaychik.html"}, {"name": "Моряк", "src": "assets/5a14c9bd0471d3d9fe14.png", "url": "moryak.html"}, {"name": "Ангел", "src": "assets/4f1a94022ef52df6a376.png", "url": "angel.html"}, {"name": "Снежинка", "src": "assets/df7c85a1d8f06b24dc3a.png", "url": "snezhinka.html"}, {"name": "Пьеро", "src": "assets/7dbca0cb8bb32a2267da.png", "url": "piero.html"}, {"name": "Девочка с единорогом", "src": "assets/01c236fb4b5b0c5e3fbf.png", "url": "unicorn.html"}, {"name": "Мальчик с лошадкой", "src": "assets/f2f78f6728b19d69c205.png", "url": "horse.html"}, {"name": "Мальчик с мишкой", "src": "assets/8d58b556cd603644dfa2.png", "url": "teddy.html"}];
  const current = document.currentScript.dataset.product;
  const section = document.getElementById('recently-viewed');
  const grid = document.getElementById('recent-grid');
  const key = 'gallery-recently-viewed';
  let history;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    history = Array.isArray(parsed) ? parsed : [];
  } catch { history = []; }
  history = [...new Set(history.filter(url => products.some(p => p.url === url)))];
  const previous = history.filter(url => url !== current).slice(0, 4);
  if (section && grid && previous.length) {
    grid.replaceChildren();
    previous.forEach(url => {
      const product = products.find(p => p.url === url);
      const link = document.createElement('a');
      link.href = product.url; link.className = 'recent-item';
      const image = document.createElement('img');
      image.src = product.src; image.alt = product.name; image.loading = 'lazy';
      const label = document.createElement('span'); label.textContent = product.name;
      const frame = document.createElement('div'); frame.className = 'recent-image-frame';
      frame.append(image);
      link.append(frame, label); grid.append(link);
    });
    section.hidden = false;
  }
  if (products.some(p => p.url === current)) {
    try { localStorage.setItem(key, JSON.stringify([current, ...history.filter(url => url !== current)].slice(0, 9))); }
    catch { /* Viewing works remains available when local storage is blocked. */ }
  }
})();