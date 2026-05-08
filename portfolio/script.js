/* ═══════════════════════════════════════════════════════════
   JELLY FISH — Portfolio Interactions
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Navbar scroll ── */
  const nav = document.querySelector('.nav');
  const handleScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  /* ── Mobile menu ── */
  const toggle = document.querySelector('.nav__toggle');
  const links = document.querySelector('.nav__links');
  if (toggle) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.classList.toggle('active');
    });
    links.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.classList.remove('active');
      });
    });
  }

  /* ── Active nav link ── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link');
  const observerNav = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav__link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.3, rootMargin: '-64px 0px -40% 0px' });
  sections.forEach(s => observerNav.observe(s));

  /* ── Reveal on scroll ── */
  const reveals = document.querySelectorAll('.reveal');
  const observerReveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observerReveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  reveals.forEach(el => observerReveal.observe(el));

  /* ── Skill bars (trigger fill when visible) ── */
  const skillCards = document.querySelectorAll('.skill-card');
  const observerSkills = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observerSkills.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  skillCards.forEach(c => observerSkills.observe(c));

  /* ── Counter animation ── */
  const counters = document.querySelectorAll('[data-count]');
  const observerCount = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      let current = 0;
      const step = Math.max(1, Math.floor(target / 40));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = current + (el.dataset.suffix || '');
      }, 30);
      observerCount.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observerCount.observe(c));

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── Typing effect for hero subtitle ── */
  const typeEl = document.querySelector('.hero__typing');
  if (typeEl) {
    const phrases = [
      'CS Student — AI/ML Track',
      'Python & Java Engineer',
      'Consistent Builder',
      'Shipping every day 🚀'
    ];
    let phraseIdx = 0, charIdx = 0, deleting = false;
    function type() {
      const current = phrases[phraseIdx];
      typeEl.textContent = current.substring(0, charIdx);
      if (!deleting) {
        charIdx++;
        if (charIdx > current.length) { deleting = true; setTimeout(type, 1800); return; }
        setTimeout(type, 60);
      } else {
        charIdx--;
        if (charIdx < 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; setTimeout(type, 400); return; }
        setTimeout(type, 35);
      }
    }
    type();
  }

  /* ── Tilt on project cards (desktop only) ── */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translateY(-5px) perspective(800px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
});
