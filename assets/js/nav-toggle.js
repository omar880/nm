document.addEventListener('DOMContentLoaded', function () {
  // تحديث سنة حقوق النشر بالفوتر تلقائياً كل سنة بدون تعديل يدوي
  document.querySelectorAll('.footer-bottom').forEach(function (el) {
    el.textContent = el.textContent.replace(/©\s*\d{4}/, '© ' + new Date().getFullYear());
  });

  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.topbar nav');
  if (!btn || !nav) return;

  function closeNav() {
    nav.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });
});
