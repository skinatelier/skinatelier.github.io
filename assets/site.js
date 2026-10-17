document.documentElement.classList.add('js');

// Einblendungen einmalig beim Scrollen
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .1, rootMargin: '0px 0px -40px 0px' }) : null;
document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

// Mobilmenü
const nav = document.querySelector('.main-nav');
const mb = document.querySelector('.menu-btn');
if (nav && mb) {
  mb.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    mb.setAttribute('aria-expanded', open);
    mb.textContent = open ? 'Schließen' : 'Menü';
  });
}

// Jahr im Footer
document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

// Arbeiten filtern
document.querySelectorAll('[data-filter-group]').forEach(group => {
  const buttons = group.querySelectorAll('button[data-filter]');
  const items = document.querySelectorAll(group.dataset.filterGroup + ' [data-cat]');
  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.setAttribute('aria-pressed', x === b));
    items.forEach(i => i.hidden = b.dataset.filter !== 'alle' && i.dataset.cat !== b.dataset.filter);
  }));
});

// Anfrage: Nachricht zusammenstellen und in WhatsApp oder E-Mail öffnen.
// Es wird nichts automatisch versendet – die Person schickt die Nachricht selbst ab.
const form = document.getElementById('anfrage');
if (form) {
  const vorwahl = new URLSearchParams(location.search).get('anliegen');
  if (vorwahl && form.anliegen) form.anliegen.value = vorwahl;

  const text = () => {
    const f = form.elements;
    return [
      `Hallo Malina, ich interessiere mich für: ${f.anliegen.value}.`,
      f.zeitraum.value ? `Wunschzeitraum: ${f.zeitraum.value}` : '',
      f.nachricht.value ? `\n${f.nachricht.value}` : '',
      `\nViele Grüße\n${f.name.value}`
    ].filter(Boolean).join('\n');
  };
  const valid = () => {
    let ok = true;
    ['name', 'anliegen'].forEach(n => {
      const el = form.elements[n]; const wrap = el.closest('.field');
      const bad = !el.value.trim(); wrap.classList.toggle('invalid', bad);
      el.setAttribute('aria-invalid', bad); if (bad && ok) { el.focus(); ok = false; }
    });
    return ok;
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!valid()) return;
    window.open('https://wa.me/4916095902220?text=' + encodeURIComponent(text()), '_blank', 'noopener');
  });
  document.getElementById('per-mail').addEventListener('click', () => {
    if (!valid()) return;
    location.href = 'mailto:info@skinatelier.studio?subject=' + encodeURIComponent('Terminanfrage: ' + form.elements.anliegen.value) + '&body=' + encodeURIComponent(text());
  });
}

// Navigation: auf iPhone/iPad Apple Karten, sonst Google Maps
if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) {
  document.querySelectorAll('[data-route]').forEach(a => a.href = 'https://maps.apple.com/?daddr=Breite+Str.+23,+13187+Berlin');
}

// Zwei-Klick-Einbettungen (Google-Bewertungen, Instagram): erst nach Klick laden
function einbettungLaden(box) {
  const tpl = box.querySelector('template');
  if (!tpl || box.classList.contains('geladen')) return;
  const ziel = document.createElement('div');
  ziel.innerHTML = tpl.innerHTML;
  // Skripte neu anlegen, damit der Browser sie ausführt
  ziel.querySelectorAll('script').forEach(alt => {
    const neu = document.createElement('script');
    [...alt.attributes].forEach(a => neu.setAttribute(a.name, a.value));
    neu.textContent = alt.textContent;
    alt.replaceWith(neu);
  });
  box.replaceChildren(ziel);
  box.classList.add('geladen');
}
document.querySelectorAll('.einbettung').forEach(box => {
  const dienst = box.dataset.dienst;
  let erlaubt = false;
  try { erlaubt = localStorage.getItem('einwilligung-' + dienst) === 'ja'; } catch (e) {}
  if (erlaubt) { einbettungLaden(box); return; }
  box.querySelectorAll('[data-laden]').forEach(k => k.addEventListener('click', () => {
    if (k.hasAttribute('data-immer')) { try { localStorage.setItem('einwilligung-' + dienst, 'ja'); } catch (e) {} }
    einbettungLaden(box);
  }));
});
// Einwilligungen widerrufen (Link in der Datenschutzerklärung)
document.querySelectorAll('[data-einwilligung-zuruecksetzen]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  try { Object.keys(localStorage).filter(k => k.startsWith('einwilligung-')).forEach(k => localStorage.removeItem(k)); } catch (err) {}
  a.textContent = 'Erledigt: Alle Einwilligungen wurden zurückgesetzt.';
}));

// Untere Terminleiste (Handy): immer sichtbar, außer wenn ein großer Termin-Button im Bild ist; auf der Kontaktseite nie
(() => {
  const leiste = document.querySelector('.mobile-cta');
  if (!leiste) return;
  if (/kontakt\.html$/.test(location.pathname)) { leiste.remove(); return; }
  document.body.classList.add('cta-aktiv');
  const knoepfe = [...document.querySelectorAll('main .btn-primary')];
  const pruefen = () => {
    const h = window.innerHeight;
    const imBild = knoepfe.some(k => { const r = k.getBoundingClientRect(); return r.bottom > 0 && r.top < h - 70; });
    leiste.classList.toggle('sichtbar', !imBild);
  };
  addEventListener('scroll', pruefen, { passive: true });
  addEventListener('resize', pruefen);
  pruefen();
})();

// PMU-Pen-Animation (Augenbrauen-PMU): Vorzeichnung, dann Powder-Schattierung Punkt für Punkt
(() => {
  const fig = document.querySelector('.pmu-anim');
  if (!fig) return;
  const svg = fig.querySelector('svg');
  const form = fig.querySelector('.braue-vorzeichnung');
  const lage = fig.querySelector('.braue-pigment');
  const pen = fig.querySelector('.pmu-pen');
  const NS = 'http://www.w3.org/2000/svg';
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Punkte innerhalb der Brauenform, vorn heller (Ombré), zum Ende dichter
  const innen = (x, y) => {
    try { const p = svg.createSVGPoint(); p.x = x; p.y = y; return form.isPointInFill(p); } catch (e) { return true; }
  };
  const glatt = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const punkte = [];
  for (let i = 0; i < 5200 && punkte.length < 1500; i++) {
    const x = 56 + Math.random() * 420, y = 86 + Math.random() * 98;
    const u = (x - 56) / 420;
    if (Math.random() > .3 + .7 * glatt(0, .4, u) || !innen(x, y)) continue;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
    c.setAttribute('r', (.7 + Math.random() * .9).toFixed(2));
    c.dataset.o = ((.12 + .5 * glatt(0, .45, u)) * (.6 + Math.random() * .4)).toFixed(2);
    c.style.opacity = 0;
    punkte.push({ x, y, c });
  }
  // Reihenfolge wie beim Schattieren: in schmalen Bahnen von vorn nach hinten, auf und ab
  punkte.sort((a, b) => {
    const sa = Math.floor(a.x / 7), sb = Math.floor(b.x / 7);
    return sa - sb || (sa % 2 ? b.y - a.y : a.y - b.y);
  });
  punkte.forEach(p => lage.appendChild(p.c));
  const zeigeAlle = () => punkte.forEach(p => { p.c.style.opacity = p.c.dataset.o; });

  let px = 520, py = 20;
  const setzePen = (x, y) => pen.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
  setzePen(px, py);

  if (ruhig) { zeigeAlle(); fig.classList.add('pen-an'); setzePen(478, 150); return; }

  const DAUER = 5600;
  let laeuft = false, sichtbar = false, timer = 0;
  const warte = ms => new Promise(r => { timer = setTimeout(r, ms); });

  async function durchlauf() {
    laeuft = true;
    punkte.forEach(p => { p.c.style.transition = ''; p.c.style.opacity = 0; });
    fig.classList.remove('zeichnet', 'pen-an', 'arbeitet');
    await warte(400);
    fig.classList.add('zeichnet');                    // Vorzeichnung
    await warte(1700);
    px = 470; py = 30; setzePen(px, py);
    fig.classList.add('pen-an');
    await new Promise(fertig => {                      // Pen fährt zum Brauenanfang
      const ziel = punkte[0];
      const schritt = () => {
        px += (ziel.x - px) * .12; py += (ziel.y - py) * .12; setzePen(px, py);
        if (Math.hypot(ziel.x - px, ziel.y - py) < 1.5) return fertig();
        requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    });
    fig.classList.add('arbeitet');
    await new Promise(fertig => {                      // Schattieren
      const start = performance.now();
      let n = 0;
      const schritt = jetzt => {
        const soll = Math.min(punkte.length, Math.floor((jetzt - start) / DAUER * punkte.length));
        for (; n < soll; n++) punkte[n].c.style.opacity = punkte[n].c.dataset.o;
        const z = punkte[Math.min(n, punkte.length - 1)];
        px += (z.x - px) * .3; py += (z.y - py) * .3; setzePen(px, py);
        if (n >= punkte.length) return fertig();
        requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    });
    fig.classList.remove('arbeitet');
    await new Promise(fertig => {                      // Pen hebt ab
      const schritt = () => {
        px += (500 - px) * .06; py += (20 - py) * .06; setzePen(px, py);
        if (py < 30) return fertig();
        requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    });
    fig.classList.remove('pen-an');
    await warte(2800);                                 // Ergebnis stehen lassen
    punkte.forEach(p => { p.c.style.transition = 'opacity .8s'; p.c.style.opacity = 0; });
    fig.classList.remove('zeichnet');
    await warte(1000);
    laeuft = false;
    if (sichtbar) durchlauf();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => {
      sichtbar = es[0].isIntersecting;
      if (sichtbar && !laeuft) durchlauf();
    }, { threshold: .4 }).observe(fig);
  } else { zeigeAlle(); }
})();

// Startseite: Vorhang mit großem Logo (einmal pro Besuch), danach fährt das Porträt hoch
(() => {
  const h = document.documentElement;
  if (!h.classList.contains('hero-anim')) return;
  const los = () => h.classList.add('hero-los');
  const vorhang = document.querySelector('.vorhang');
  if (!h.classList.contains('vorhang-an') || !vorhang) { requestAnimationFrame(() => requestAnimationFrame(los)); return; }

  let fertig = false;
  const raus = () => {
    if (fertig) return; fertig = true;
    try { sessionStorage.setItem('vorhang', '1'); } catch (e) {}
    const logo = vorhang.querySelector('.vorhang-logo');
    const ziel = document.querySelector('.logo-kopf');
    if (logo && ziel) {
      const a = logo.getBoundingClientRect(), b = ziel.getBoundingClientRect();
      const s = b.width / a.width;
      logo.style.animation = 'none';
      logo.getBoundingClientRect();
      requestAnimationFrame(() => { logo.style.transform = `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${s})`; });
    }
    h.classList.add('vorhang-raus');
    setTimeout(los, 380);
    setTimeout(() => { h.classList.remove('vorhang-an', 'vorhang-raus'); vorhang.remove(); }, 1050);
  };
  const timer = setTimeout(raus, 2500);
  const abkuerzen = () => { clearTimeout(timer); raus(); };
  vorhang.addEventListener('click', abkuerzen);
  ['keydown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, abkuerzen, { once: true, passive: true }));
})();
