export function initMotion() {
  const button = document.querySelector<HTMLButtonElement>('#motion-toggle');
  if (!button) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let manuallyPaused = false;
  try {
    manuallyPaused = localStorage.getItem('motion-paused') === 'true';
  } catch {
    /* Storage is optional. */
  }
  const isPaused = () => manuallyPaused || preference.matches;
  const starfield = document.querySelector<HTMLElement>('.starfield');
  const finePointer = window.matchMedia('(pointer: fine)');
  const moveStars = (x: number, y: number) => {
    starfield?.style.setProperty('--pointer-x', `${x}px`);
    starfield?.style.setProperty('--pointer-y', `${y}px`);
  };
  window.addEventListener(
    'pointermove',
    (event) => {
      if (isPaused() || !finePointer.matches || event.pointerType === 'touch')
        return;
      const x = Math.max(-1, Math.min(1, (event.clientX / innerWidth) * 2 - 1));
      const y = Math.max(
        -1,
        Math.min(1, (event.clientY / innerHeight) * 2 - 1),
      );
      moveStars(x * 12, y * 8);
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    if (!isPaused()) moveStars(0, 0);
  });
  const update = () => {
    const paused = isPaused();
    if (paused) moveStars(0, 0);
    document.documentElement.classList.toggle('motion-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.querySelector('.motion-label')!.textContent = preference.matches
      ? 'Reduced motion'
      : paused
        ? 'Resume motion'
        : 'Pause motion';
    button.querySelector('.motion-icon')!.textContent = paused ? '▷' : 'Ⅱ';
    button.disabled = preference.matches;
    window.dispatchEvent(new Event('motionchange'));
  };
  button.hidden = false;
  button.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    try {
      localStorage.setItem('motion-paused', String(manuallyPaused));
    } catch {
      /* Storage is optional. */
    }
    update();
  });
  preference.addEventListener('change', update);
  update();
  // Navigation and readable fallback objects do not depend on this enhancement.
  import('./scene')
    .then(({ createScene }) => createScene(isPaused))
    .catch(() => {});
}
