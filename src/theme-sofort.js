// Läuft im <head>, bevor irgendetwas gezeichnet wird. Ohne das würde beim Laden
// kurz das falsche Design aufblitzen.
(function () {
  document.documentElement.classList.add('js');
  try {
    var gewaehlt = localStorage.getItem('theme');
    if (gewaehlt === 'hell' || gewaehlt === 'dunkel') {
      document.documentElement.setAttribute('data-theme', gewaehlt);
    }
  } catch (e) {
    // Kein localStorage - dann gilt die Systemvorgabe.
  }
})();
