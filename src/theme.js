/**
 * Hell/Dunkel-Schalter.
 *
 * Das Umschalten selbst passiert im Kopf des Dokuments, damit beim Laden nichts
 * aufblitzt. Hier hängt nur noch die Bedienung dran.
 */
(function () {
  var wurzel = document.documentElement;
  var schalter = document.querySelector('.schalter');
  if (!schalter) return;

  function beschrifte() {
    var dunkel = wurzel.getAttribute('data-theme') === 'dunkel';
    schalter.setAttribute('aria-label', dunkel ? 'Zu hellem Design wechseln' : 'Zu dunklem Design wechseln');
    schalter.setAttribute('aria-pressed', String(dunkel));
  }

  schalter.addEventListener('click', function () {
    var dunkel = wurzel.getAttribute('data-theme') === 'dunkel';
    var neu = dunkel ? 'hell' : 'dunkel';
    wurzel.setAttribute('data-theme', neu);
    try {
      localStorage.setItem('theme', neu);
    } catch (e) {
      // Im privaten Modus mancher Browser verboten. Dann gilt die Wahl nur für
      // diesen Besuch - kein Grund für eine Fehlermeldung.
    }
    beschrifte();
  });

  beschrifte();
})();
