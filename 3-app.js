const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#0e1510"/></svg>');

/* ---------- menu, progress, nav spy ---------- */
const menuBtn = $('menu-toggle'), siteNav = $('site-nav');
menuBtn.addEventListener('click', () => { const o = siteNav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); });
siteNav.addEventListener('click', e => { if (e.target.closest('a')) { siteNav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });
const navLinks = [...document.querySelectorAll('#site-nav a')];
const spy = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
}), { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('main section').forEach(s => spy.observe(s));
navLinks[0].classList.add('active');
addEventListener('scroll', () => {
    const h = document.documentElement; $('progress').style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
}, { passive: true });
const reveal = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); reveal.unobserve(en.target); } }), { threshold: 0.08 });
const watchReveal = () => document.querySelectorAll('.reveal:not(.in)').forEach(el => reveal.observe(el));

/* ---------- cursor glow + card tilt (fine pointers only) ---------- */
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    const g = $('cursor-glow');
    addEventListener('mousemove', e => { g.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; g.style.opacity = 1; });
    document.addEventListener('mousemove', e => {
        const c = e.target.closest && e.target.closest('.tilt');
        document.querySelectorAll('.tilt.hot').forEach(t => { if (t !== c) { t.classList.remove('hot'); t.style.transform = ''; } });
        if (!c) return;
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.classList.add('hot');
        c.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-4px)`;
        c.style.setProperty('--mx', (x + .5) * 100 + '%'); c.style.setProperty('--my', (y + .5) * 100 + '%');
    });
}

/* ---------- hero: neural network canvas that reacts to the pointer ---------- */
(function neural() {
    const cv = $('net'), ctx = cv.getContext('2d');
    let W, H, nodes = [], pulses = [], mouse = { x: -999, y: -999 }, dpr = Math.min(devicePixelRatio || 1, 2);
    const hero = $('hero');
    function size() {
        W = hero.clientWidth; H = hero.clientHeight;
        cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.round(Math.min(90, Math.max(28, W * H / 16000)));
        nodes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.6 + .8 }));
    }
    addEventListener('resize', size); size();
    hero.addEventListener('mousemove', e => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('mouseleave', () => { mouse.x = mouse.y = -999; });
    hero.addEventListener('click', e => { const r = hero.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; nodes.forEach(n => { const d = Math.hypot(n.x - x, n.y - y); if (d < 220) { const a = Math.atan2(n.y - y, n.x - x); n.vx += Math.cos(a) * (220 - d) / 90; n.vy += Math.sin(a) * (220 - d) / 90; } }); });
    const LINK = 150;
    let visible = true;
    new IntersectionObserver(es => visible = es[0].isIntersecting).observe(hero);
    function frame() {
        requestAnimationFrame(frame);
        if (!visible) return;
        ctx.clearRect(0, 0, W, H);
        for (const n of nodes) {
            if (!reduceMotion) { n.x += n.vx; n.y += n.vy; n.vx *= .995; n.vy *= .995; n.vx += (Math.random() - .5) * .01; n.vy += (Math.random() - .5) * .01; }
            if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1;
            const md = Math.hypot(n.x - mouse.x, n.y - mouse.y);
            if (md < 140 && !reduceMotion) { n.vx += (n.x - mouse.x) / md * .02; n.vy += (n.y - mouse.y) / md * .02; }
        }
        for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < LINK) {
                const near = Math.min(Math.hypot(a.x - mouse.x, a.y - mouse.y), Math.hypot(b.x - mouse.x, b.y - mouse.y)) < 180;
                ctx.strokeStyle = `rgba(61,255,154,${(1 - d / LINK) * (near ? .6 : .2)})`;
                ctx.lineWidth = near ? 1.2 : .7;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                if (!reduceMotion && Math.random() < .0008) pulses.push({ a, b, t: 0 });
            }
        }
        for (const n of nodes) { ctx.fillStyle = 'rgba(61,255,154,.85)'; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill(); }
        pulses = pulses.filter(p => p.t < 1);
        for (const p of pulses) {
            p.t += .02; const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
            ctx.fillStyle = '#ffb703'; ctx.shadowColor = '#ffb703'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        }
    }
    frame();
})();

/* ---------- hero HUD: live loss curve ---------- */
(function loss() {
    const cv = $('loss'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    const pts = []; let ep = 0, t = 0;
    const val = x => 0.08 + 0.92 * Math.exp(-x * 3.2) + (Math.sin(x * 55) + Math.sin(x * 23)) * .012 * (1 - x * .6);
    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(61,255,154,.10)'; ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, i * H / 6); ctx.lineTo(W, i * H / 6); ctx.stroke(); }
        for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke(); }
        const n = Math.max(2, Math.floor(t * 120));
        const grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(61,255,154,.28)'); grd.addColorStop(1, 'rgba(61,255,154,0)');
        ctx.beginPath();
        for (let i = 0; i <= n; i++) { const x = i / 120, px = x * W, py = H - 12 - val(x) * (H - 36); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.strokeStyle = '#3dff9a'; ctx.lineWidth = 2.2; ctx.stroke();
        const lx = (n / 120) * W, ly = H - 12 - val(n / 120) * (H - 36);
        ctx.lineTo(lx, H); ctx.lineTo(0, H); ctx.fillStyle = grd; ctx.fill();
        ctx.fillStyle = '#ffb703'; ctx.shadowColor = '#ffb703'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        $('epoch').textContent = 'epoch ' + String(Math.floor(t * 99) + 1).padStart(3, '0');
        const rows = $('hud-rows').children;
        if (rows.length) { rows[0].lastChild.textContent = val(n / 120).toFixed(3); rows[1].lastChild.textContent = (100 - val(n / 120) * 60).toFixed(1) + '%'; }
    }
    function tick() { requestAnimationFrame(tick); t += reduceMotion ? 0 : .0035; if (t > 1.25) t = 0; draw(); }
    t = reduceMotion ? 1 : .55; tick();
})();

/* ---------- name decode + typed roles ---------- */
function decode(el, text) {
    if (reduceMotion) { el.textContent = text; return; }
    const chars = '01<>/{}[]#*+=_', total = 26; let f = 0;
    const id = setInterval(() => {
        el.textContent = [...text].map((c, i) => c === ' ' ? ' ' : (i < f * text.length / total ? c : chars[Math.floor(Math.random() * chars.length)])).join('');
        if (++f > total) { clearInterval(id); el.textContent = text; }
    }, 40);
}
function typeLoop(el, words) {
    if (reduceMotion) { el.textContent = words[0]; return; }
    let w = 0, i = 0, del = false;
    (function step() {
        const word = words[w];
        el.textContent = word.slice(0, i);
        if (!del && i === word.length) { del = true; return setTimeout(step, 1600); }
        if (del && i === 0) { del = false; w = (w + 1) % words.length; return setTimeout(step, 300); }
        i += del ? -1 : 1; setTimeout(step, del ? 25 : 55);
    })();
}

/* ---------- galleries ---------- */
function gallery(images, title) {
    if (!images || !images.length) return '';
    const t = esc(title);
    const img = (src, cls = '') => `<img class="${cls}" src="${esc(src)}" alt="${t}" loading="lazy" draggable="false" onerror="this.onerror=null;this.src='${FALLBACK}'" onclick="openView(this.src)">`;
    if (images.length === 1) return `<div class="gal gal-1">${img(images[0])}</div>`;
    if (images.length === 2) return `<div class="gal gal-2">${img(images[0])}${img(images[1])}</div>`;
    return `<div class="gal gal-n"><div class="gal-main">${img(images[0], 'gal-main-img')}</div>
        <div class="gal-thumbs">${images.map((s, i) => `<button type="button" class="thumb ${i ? '' : 'on'}" aria-label="Show image ${i + 1}" data-src="${esc(s)}"><img src="${esc(s)}" alt="" loading="lazy" draggable="false" onerror="this.onerror=null;this.src='${FALLBACK}'"></button>`).join('')}</div></div>`;
}
document.addEventListener('click', e => {
    const b = e.target.closest('.thumb'); if (!b) return;
    const g = b.closest('.gal-n'); g.querySelector('.gal-main-img').src = b.dataset.src;
    g.querySelectorAll('.thumb').forEach(t => t.classList.toggle('on', t === b));
});
const yearOf = s => (String(s).match(/20\d\d/g) || []).slice(-1)[0] || '';
const skillIcons = { ai_deep_learning: 'fa-microchip', computer_vision: 'fa-eye', web_integration: 'fa-server', embedded_iot: 'fa-gears' };

/* ---------- horizontal rail: drag + buttons + progress ---------- */
function setupRail() {
    const rail = $('dynamic-competitions'), fill = $('rail-fill');
    const upd = () => { const m = rail.scrollWidth - rail.clientWidth; fill.style.width = (m > 0 ? 18 + 82 * rail.scrollLeft / m : 100) + '%'; };
    rail.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    const step = () => rail.clientWidth * .8;
    $('rail-prev').onclick = () => rail.scrollBy({ left: -step(), behavior: 'smooth' });
    $('rail-next').onclick = () => rail.scrollBy({ left: step(), behavior: 'smooth' });
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.target.closest('button')) return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; rail.classList.add('drag'); } rail.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { down = false; setTimeout(() => rail.classList.remove('drag'), 0); });
    rail.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}

async function run() {
    try {
        const data = await (await fetch('data.json')).json(), p = data.personal;
        document.title = `${p.name} | AI Portfolio`;
        decode($('hero-name'), p.name);
        $('hero-summary').textContent = p.summary;
        $('hero-badge-title').textContent = '> ' + p.title;
        $('main-github-btn').href = p.links.github;
        typeLoop($('typed'), Object.values(data.skills).map(s => s.title.replace(/\s*\(.*\)/, '')));

        const firsts = data.competitions.filter(c => /1st/i.test(c.role)).length;
        $('stats').innerHTML = [[data.competitions.length, 'competitions'], [firsts, '1st place wins'], [data.projects.length, 'projects shipped'], [data.certificates.length, 'certificates']]
            .map(([n, l]) => `<li><strong data-n="${n}">${n}</strong><span>${l}</span></li>`).join('');
        $('hud-rows').innerHTML = `<li><span>loss</span><b>0.000</b></li><li><span>accuracy</span><b>0%</b></li><li><span>model</span><b>${esc(data.projects[data.projects.length - 1]?.title.split(' ')[0] || 'cnn')}</b></li>`;

        $('dynamic-competitions').innerHTML = data.competitions.map((c, i) => `
            <article class="mission">
                <div class="m-top"><span class="m-idx">M-${String(data.competitions.length - i).padStart(2, '0')}</span><span class="m-year">${esc(yearOf(c.timeline))}</span></div>
                <h3>${esc(c.title)}</h3>
                <div class="chips"><span class="chip chip-hot"><i class="fa-solid fa-medal"></i> ${esc(c.role)}</span><span class="chip"><i class="fa-regular fa-calendar"></i> ${esc(c.timeline)}</span></div>
                ${gallery(c.images, c.title)}
                <p><strong>${esc(c.project)}.</strong> ${esc(c.description)}</p>
            </article>`).join('');
        setupRail();

        $('dynamic-projects').innerHTML = data.projects.map((x, i) => `
            <article class="project tilt reveal">
                <div class="p-head"><span>build_${String(i + 1).padStart(2, '0')}</span><i class="fa-solid fa-circle"></i></div>
                <h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>
                <a href="${esc(x.github_link)}" target="_blank" rel="noopener noreferrer" class="link-arrow">git clone <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
            </article>`).join('');

        const keys = Object.keys(data.skills), tabs = $('skill-tabs'), panel = $('skill-panel');
        tabs.innerHTML = keys.map((k, i) => `<button type="button" role="tab" id="tab-${k}" aria-selected="${i === 0}" aria-controls="skill-panel" data-k="${k}" class="chip-btn ${i === 0 ? 'on' : ''}"><i class="fa-solid ${skillIcons[k] || 'fa-code'}"></i><span>${esc(data.skills[k].title.replace(/\s*\(.*\)/, ''))}</span><em>U${i + 1}</em></button>`).join('');
        const show = k => {
            const b = data.skills[k];
            tabs.querySelectorAll('button').forEach(t => { const on = t.dataset.k === k; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
            panel.setAttribute('aria-labelledby', 'tab-' + k);
            panel.innerHTML = `<div class="sp-in"><h3><i class="fa-solid ${skillIcons[k] || 'fa-code'}"></i> ${esc(b.title)}</h3><p>${esc(b.description)}</p><ul>${b.items.map(i => { const [h, ...r] = i.split(/:\s(.+)/); return r.length ? `<li><b>${esc(h)}</b>${esc(r[0] || '')}</li>` : `<li>${esc(i)}</li>`; }).join('')}</ul></div>`;
        };
        tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.k); });
        show(keys[0]);

        const raw = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="#0e1510"/><text x="50%" y="50%" fill="#6b7f72" font-family="monospace" font-size="14" text-anchor="middle" dy=".3em">credential image pending</text></svg>';
        const fb = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(raw);
        $('dynamic-certs-visual').innerHTML = data.certificates.map((c, i) => `
            <article class="cert ${i >= 8 ? 'extra' : ''}">
                <img src="${esc(c.image) || fb}" alt="${esc(c.title)}" loading="lazy" onerror="this.onerror=null;this.src='${fb}'" onclick="openView(this.src)">
                <div class="cert-body"><h4>${esc(c.title)}</h4><span class="muted"><i class="fa-regular fa-calendar"></i> ${esc(c.date)}</span>
                <a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer" class="link-arrow">verify <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>
            </article>`).join('');
        if (data.certificates.length > 8) {
            const btn = $('certs-more'); btn.hidden = false; const all = `Show all ${data.certificates.length}`; btn.textContent = all;
            btn.onclick = () => { const o = $('dynamic-certs-visual').classList.toggle('expanded'); btn.textContent = o ? 'Show fewer' : all; };
        }
        $('dynamic-yt').innerHTML = data.youtube_courses.map(c => `<a class="yt-item" href="${esc(c.link)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-youtube"></i><span>${esc(c.title)}</span><i class="fa-solid fa-arrow-up-right-from-square go"></i></a>`).join('');
        watchReveal();
    } catch (err) {
        console.error('Could not load portfolio data:', err);
        $('hero-summary').textContent = 'Content failed to load. Please refresh the page.';
    }
}
const lightbox = $('lightbox'), lightboxImg = $('lightbox-img');
function openView(src) { lightboxImg.src = src; lightbox.classList.add('active'); }
$('lightbox-close').addEventListener('click', () => lightbox.classList.remove('active'));
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('active'); });
addEventListener('keydown', e => { if (e.key === 'Escape') lightbox.classList.remove('active'); });
function copyEmail(e, email) {
    e.preventDefault(); const t = $('toast');
    const show = m => { t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); };
    navigator.clipboard.writeText(email).then(() => show('Email copied: ' + email)).catch(() => { location.href = 'mailto:' + email; });
}
run();
