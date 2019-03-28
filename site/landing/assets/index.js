document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();

    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth',
    });
  });
});

document.querySelectorAll('a[href^="/#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const el = document.querySelector(this.getAttribute('href').substr(1));
    if (!el) {
      return;
    }
    e.preventDefault();
    el.scrollIntoView({
      behavior: 'smooth',
    });
  });
});
