import 'phoenix_html';
import 'bootstrap';

const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));
const parallaxItems = Array.from(document.querySelectorAll('[data-parallax]'));

if (revealItems.length > 0) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 },
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }
}

if (parallaxItems.length > 0) {
  const updateParallax = () => {
    const viewportHeight = window.innerHeight || 0;

    parallaxItems.forEach((item) => {
      const depth = Number(item.dataset.parallax || 0);
      const rect = item.getBoundingClientRect();
      const progress = (rect.top + rect.height * 0.5 - viewportHeight * 0.5) / viewportHeight;
      const translate = Math.max(-24, Math.min(24, -progress * 80 * depth));
      item.style.transform = `translateY(${translate}px)`;
    });
  };

  let ticking = false;

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  };

  updateParallax();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}
