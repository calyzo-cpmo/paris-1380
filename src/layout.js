// Mise en page commune aux maquettes.

// La barre du bas passe sur deux lignes quand la fenêtre est de largeur moyenne (tablette, fenêtre réduite) : ce qui se
// pose au-dessus d'elle — frise, fiches, mini-plan — suit sa hauteur réelle, lue ici, plutôt qu'une hauteur fixe.
// La marge basse de l'écran (--sab) est comptée à part par la feuille de style : on la retire de la mesure.
export function suivreBarre(dock) {
  const maj = () => { const h = dock.offsetHeight - (parseFloat(getComputedStyle(dock).paddingBottom) || 0) + 10; if (h > 20) document.documentElement.style.setProperty('--dock-h', Math.round(h) + 'px'); };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(maj).observe(dock);
  window.addEventListener('resize', maj);
  maj();
}
