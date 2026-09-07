// ── SCROLL REVEAL ──
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      const delay = e.target.closest('.dmaic-track')
        ? Array.from(e.target.parentElement.children).indexOf(e.target) * 80
        : 0;
      setTimeout(() => e.target.classList.add('visible'), delay);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(el => observer.observe(el));

// ── HAMBURGER MENU ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});

document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

// ── DEMO IFRAME SCALING ──
function scaleDemoPreviews() {
  document.querySelectorAll('.demo-preview').forEach(wrapper => {
    const iframe = wrapper.querySelector('iframe');
    if (!iframe) return;
    const scale = wrapper.clientWidth / 1280;
    iframe.style.transform = `scale(${scale})`;
    iframe.style.height = `${wrapper.clientHeight / scale}px`;
  });
}
scaleDemoPreviews();
window.addEventListener('resize', scaleDemoPreviews);

// ── NAV DROPDOWN ("We Offer") ──
// Hover opens it on desktop (CSS); this makes click and keyboard work too.
document.querySelectorAll('.nav-drop').forEach(drop => {
  const toggle = drop.querySelector('.nav-drop-toggle');
  if (!toggle) return;

  const setOpen = (open) => {
    drop.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!drop.classList.contains('open'));
  });

  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setOpen(false); toggle.focus(); }
  });

  document.addEventListener('click', (e) => {
    if (!drop.contains(e.target)) setOpen(false);
  });

  drop.querySelectorAll('.nav-drop-menu a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });
});
