/* DJAI animation pack — reacts to the shop via djai:* events from app.js */
(() => {
  'use strict';

  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const COLORS = ['#3a2216', '#6b3a24', '#c97b3d', '#f0b54a', '#e6bd82', '#2a1208', '#d99449'];

  const TXT = {
    lo: { tap: 'ແຕະເພື່ອຂ້າມ', reserved: 'ຈອງສຳເລັດ!', fresh: 'ອົບສົດ ກັນໄວ້ໃຫ້ແລ້ວ', added: 'ໃສ່ກະຕ່າແລ້ວ' },
    th: { tap: 'แตะเพื่อข้าม', reserved: 'จองสำเร็จ!', fresh: 'อบสดใหม่ กันไว้ให้แล้ว', added: 'ใส่ตะกร้าแล้ว' },
    en: { tap: 'Tap to skip', reserved: 'Reserved!', fresh: 'Fresh from the oven, held for you', added: 'Added to cart' },
  };
  const tt = (k) => (TXT[document.documentElement.lang] || TXT.lo)[k];

  // time when the intro is finished — other effects wait for it
  let introEnd = 0;
  const afterIntro = (fn, extra = 0) => setTimeout(fn, Math.max(0, introEnd - performance.now()) + extra);

  /* ------------------------------------------------------------------ */
  /* C · stamp intro + hero entrance                                     */
  /* ------------------------------------------------------------------ */
  function intro() {
    const ov = $('#intro');
    const heroIn = () => document.body.classList.add('hero-in');
    if (!ov) { heroIn(); return; }
    if (REDUCE) { ov.remove(); heroIn(); return; }
    introEnd = performance.now() + 1800;
    $('.intro-skip', ov).textContent = tt('tap');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      introEnd = performance.now();
      heroIn();
      ov.classList.add('lift');
      setTimeout(() => ov.remove(), 850);
    };
    setTimeout(() => ov.classList.add('shake'), 620);
    setTimeout(() => {
      const r = $('.intro-stamp', ov).getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 18, 1.2);
    }, 640);
    setTimeout(finish, 1800);
    ov.addEventListener('click', finish);
  }

  function heroDecor() {
    const art = $('.hero-art');
    if (!art || REDUCE) return;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.className = 'fcrumb';
      const size = rand(5, 11);
      s.style.cssText = `left:${rand(5, 92)}%;top:${rand(8, 90)}%;width:${size}px;height:${size}px;background:${COLORS[i % COLORS.length]};` +
        `--x:${rand(-24, 24)}px;--y:${rand(-30, 10)}px;--d:${rand(5, 9)}s;--dl:${rand(-6, 0)}s`;
      art.appendChild(s);
    }
  }

  /* ------------------------------------------------------------------ */
  /* G · marquee tapes + live stock counters                             */
  /* ------------------------------------------------------------------ */
  function marquee() {
    const hero = $('.hero');
    if (!hero || $('.marquee-wrap')) return;
    const a = 'D · DELIGHTFUL ✦ J · JOYFUL ✦ A · AUTHENTIC ✦ I · IMPRESSIVE ✦ ';
    const b = 'BROWNIE ✦ COOKIE ✦ BAKED FRESH DAILY ✦ LAO QR ✦ ';
    const tape = (cls, text) => `<div class="tape ${cls}"><div class="track"><span>${text.repeat(5)}</span><span>${text.repeat(5)}</span></div></div>`;
    hero.insertAdjacentHTML('afterend', `<div class="marquee-wrap" aria-hidden="true">${tape('t2', b)}${tape('t1', a)}</div>`);
  }

  const lastNum = new Map();
  function numberNode(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && /\d/.test(n.nodeValue)) return n;
    return null;
  }
  function counters() {
    $$('.chip b, .card .badge').forEach((el) => {
      const chip = el.closest('.chip');
      const key = chip ? 'chip' + chip.getAttribute('href') : 'badge#' + (el.closest('.card') || {}).id;
      const node = numberNode(el);
      if (!node) { lastNum.set(key, 0); return; }
      const tpl = node.nodeValue;
      const to = Number(tpl.match(/\d+/)[0]);
      const from = lastNum.has(key) ? lastNum.get(key) : 0;
      lastNum.set(key, to);
      if (from === to || REDUCE) return;
      node.nodeValue = tpl.replace(/\d+/, from);
      afterIntro(() => {
        const t0 = performance.now();
        const dur = Math.min(1400, 500 + Math.abs(to - from) * 60);
        // if the browser pauses frames (background tab), still land on the real number
        setTimeout(() => { if (el.isConnected) node.nodeValue = tpl; }, dur + 150);
        const step = (now) => {
          if (!el.isConnected) return;
          const p = Math.min(1, (now - t0) / dur);
          const e = 1 - Math.pow(1 - p, 3);
          node.nodeValue = tpl.replace(/\d+/, Math.round(from + (to - from) * e));
          if (p < 1) requestAnimationFrame(step);
          else { el.classList.remove('num-flash'); void el.offsetWidth; el.classList.add('num-flash'); }
        };
        requestAnimationFrame(step);
      }, 250);
    });
  }

  /* ------------------------------------------------------------------ */
  /* I · cards: reveal on scroll + 3D tilt                               */
  /* ------------------------------------------------------------------ */
  const revealed = new Set();
  let cardIO = null;
  function cards() {
    if (REDUCE) return;
    if (!cardIO) {
      cardIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const c = en.target;
          cardIO.unobserve(c);
          if (revealed.has(c.id)) return;
          revealed.add(c.id);
          const i = [...c.parentNode.children].indexOf(c);
          afterIntro(() => {
            const cur = document.getElementById(c.id) || c; // the grid may have re-rendered meanwhile
            cur.classList.remove('pre');
            cur.style.animationDelay = (i * 0.16) + 's';
            cur.classList.add('reveal-in');
          }, 300);
        });
      }, { threshold: 0.15 });
    }
    $$('#productGrid .card').forEach((c) => {
      if (revealed.has(c.id)) return;
      c.classList.add('pre');
      cardIO.observe(c);
    });
  }

  function tilt() {
    const grid = $('#productGrid');
    if (!grid || REDUCE) return;
    const set = (card, x, y) => {
      card.style.setProperty('--rx', (-y * 16).toFixed(2) + 'deg');
      card.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg');
      card.style.setProperty('--px', x.toFixed(3));
      card.style.setProperty('--py', y.toFixed(3));
    };
    const reset = (card) => { card.classList.remove('tilting'); set(card, 0, 0); };
    grid.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.card');
      if (!card || card.classList.contains('pre')) return;
      const r = card.getBoundingClientRect();
      card.classList.add('tilting');
      set(card, (e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    });
    grid.addEventListener('pointerout', (e) => {
      const card = e.target.closest('.card');
      if (card && !card.contains(e.relatedTarget)) reset(card);
    });
    ['pointerup', 'pointercancel'].forEach((t) => grid.addEventListener(t, (e) => {
      const card = e.target.closest('.card');
      if (card && e.pointerType !== 'mouse') reset(card);
    }));
  }

  function scrollReveal() {
    if (REDUCE) return;
    const els = $$('.section-head, .steps3 li, .how h2, .footer-in > *');
    els.forEach((el, i) => { el.classList.add('sr'); el.style.transitionDelay = ((i % 3) * 0.12) + 's'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.2 });
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* B · cart rolls through the button and catches the product           */
  /* ------------------------------------------------------------------ */
  const CART_SVG = '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M2 5h5l4.5 18h17L33 10H9.5"/><circle cx="14" cy="29.5" r="2.6" fill="currentColor"/><circle cx="26" cy="29.5" r="2.6" fill="currentColor"/></svg>';

  function bumpCart(times = 1) {
    const cart = $('#cartBtn');
    if (!cart) return;
    const b = cart.getBoundingClientRect();
    cart.classList.remove('bump'); void cart.offsetWidth; cart.classList.add('bump');
    const p = document.createElement('div');
    p.className = 'plus-one';
    p.textContent = '+' + times;
    p.style.left = (b.left + b.width / 2) + 'px';
    p.style.top = (b.bottom + 4) + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 950);
    burst(b.left + b.width / 2, b.top + b.height / 2, 8, 0.6);
  }

  function cartButton() {
    // capture phase: runs before app.js swaps the "add" button for the +/- stepper,
    // so we can play the animation on a copy of the button laid exactly over it
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="add"], [data-act="inc"]');
      if (!btn || btn.disabled || REDUCE) return;
      const card = btn.closest('.card');
      if (!card) return; // +/- inside the cart sheet: no effect
      if (btn.dataset.act === 'inc') { bumpCart(); return; }
      const img = $('.card-media img', card);
      const r = btn.getBoundingClientRect();
      const g = document.createElement('div');
      g.className = 'cart-anim';
      g.style.cssText = `left:${r.left + window.scrollX}px;top:${r.top + window.scrollY}px;width:${r.width}px;height:${r.height}px`;
      g.innerHTML =
        `<span class="ca-label">${btn.innerHTML}</span>` +
        `<span class="ca-box"${img ? ` style="background-image:url('${img.currentSrc || img.src}')"` : ''}></span>` +
        `<span class="ca-cart">${CART_SVG}</span>` +
        `<span class="ca-done">✓ ${tt('added')}</span>`;
      document.body.appendChild(g);
      requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('go')));
      setTimeout(bumpCart, 1300);
      setTimeout(() => g.classList.add('out'), 2000);
      setTimeout(() => g.remove(), 2400);
    }, true);
  }

  /* ------------------------------------------------------------------ */
  /* particles: crumbs burst + confetti rain                             */
  /* ------------------------------------------------------------------ */
  function particle(x, y, size) {
    const d = document.createElement('div');
    d.className = 'particle';
    d.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size * rand(0.6, 1.2)}px;background:${COLORS[Math.floor(Math.random() * COLORS.length)]}`;
    document.body.appendChild(d);
    return d;
  }
  function burst(x, y, n, power = 1) {
    if (REDUCE) return;
    for (let i = 0; i < n; i++) {
      const p = particle(x, y, rand(5, 10));
      const ang = rand(0, Math.PI * 2);
      const dist = rand(40, 130) * power;
      p.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist + 40}px) rotate(${rand(-360, 360)}deg)`, opacity: 0 },
      ], { duration: rand(600, 1000), easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => p.remove();
    }
  }
  function rain(n = 70) {
    if (REDUCE) return;
    for (let i = 0; i < n; i++) {
      const x = rand(0, window.innerWidth);
      const p = particle(x, -20, rand(6, 12));
      p.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${rand(-60, 60)}px, ${window.innerHeight + 60}px) rotate(${rand(-540, 540)}deg)`, opacity: 0.9 },
      ], { duration: rand(1800, 3000), delay: rand(0, 600), easing: 'cubic-bezier(.3,.1,.6,1)' }).onfinish = () => p.remove();
    }
  }

  /* ------------------------------------------------------------------ */
  /* E · oven when an order is reserved                                  */
  /* ------------------------------------------------------------------ */
  function oven() {
    if (REDUCE) return;
    const ov = document.createElement('div');
    ov.className = 'oven-ov';
    ov.innerHTML = `
      <div class="oven-box" aria-hidden="true">
        <div class="oven"><div class="win"></div><div class="door"></div><div class="knobs"><i></i><i></i><i></i></div></div>
        <div class="tray">
          <i class="c" style="left:12px"></i><i class="c" style="left:70px"></i><i class="c" style="left:128px"></i>
          <i class="steam" style="left:28px"></i><i class="steam" style="left:86px;animation-delay:2.6s"></i><i class="steam" style="left:144px;animation-delay:2.9s"></i>
        </div>
        <div class="oven-msg">${tt('reserved')}</div>
        <div class="oven-sub">${tt('fresh')}</div>
      </div>`;
    document.body.appendChild(ov);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 450);
    };
    setTimeout(() => { if (!closed) burst(window.innerWidth / 2, window.innerHeight / 2 + 60, 26, 1.4); }, 2300);
    setTimeout(close, 3600);
    ov.addEventListener('click', close);
  }

  /* ------------------------------------------------------------------ */
  /* wire up                                                             */
  /* ------------------------------------------------------------------ */
  intro();
  heroDecor();
  marquee();
  tilt();
  cartButton();
  scrollReveal();
  document.addEventListener('djai:render', () => { counters(); cards(); });
  document.addEventListener('djai:reserved', oven);
  document.addEventListener('djai:done', () => rain(80));
  document.addEventListener('djai:paid', () => rain(60));
})();
