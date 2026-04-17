/* ══════════════════════════════════════════════════════════
   FrameBear — Interactions & Security
   ══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initNavbar();
  initTerminalAnimation();
  initCopyButtons();
  initSecurity();
});

/* ── Scroll Reveal ─────────────────────────────────────── */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .feature-card, .model-card, .terminal-line')
    .forEach(el => observer.observe(el));
}

/* ── Navbar ────────────────────────────────────────────── */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const toggle = document.querySelector('.mobile-toggle');
  const links = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }
}

/* ── Terminal Animation ────────────────────────────────── */
function initTerminalAnimation() {
  const terminal = document.querySelector('.terminal-body');
  if (!terminal) return;

  const lines = terminal.querySelectorAll('.terminal-line');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        lines.forEach((line, i) => {
          setTimeout(() => line.classList.add('visible'), i * 350);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(terminal);
}

/* ── Copy Buttons ──────────────────────────────────────── */
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.getAttribute('data-copy');
      const text = target
        ? document.querySelector(target)?.textContent
        : btn.closest('.install-cmd')?.querySelector('code')?.textContent;

      if (!text) return;

      try {
        await navigator.clipboard.writeText(text.trim());
        const original = btn.textContent;
        btn.classList.add('copied');
        btn.textContent = '✓ Copied';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = original;
        }, 2000);
      } catch (e) {
        console.error('Copy failed', e);
      }
    });
  });
}

/* ── Security ──────────────────────────────────────────── */
function initSecurity() {
  // Disable right-click
  document.addEventListener('contextmenu', e => { e.preventDefault(); return false; });

  // Block keyboard shortcuts
  document.addEventListener('keydown', e => {
    const isCode = e.target.closest('.install-cmd');

    // Block view source, save, devtools, inspector, print
    if ((e.ctrlKey || e.metaKey) && ['u', 's', 'p'].includes(e.key)) {
      e.preventDefault(); return false;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) {
      e.preventDefault(); return false;
    }
    if (e.key === 'F12') { e.preventDefault(); return false; }

    // Block select all and copy outside code
    if ((e.ctrlKey || e.metaKey) && ['a', 'c'].includes(e.key) && !isCode) {
      e.preventDefault(); return false;
    }
  });

  // Disable text selection outside code areas
  document.addEventListener('selectstart', e => {
    if (!e.target.closest('.install-cmd')) {
      e.preventDefault(); return false;
    }
  });

  // Disable image drag
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('dragstart', e => e.preventDefault());
  });
}

/* ── Smooth Scroll ─────────────────────────────────────── */
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (link) {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
