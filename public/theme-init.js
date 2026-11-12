/* global window, document, localStorage, matchMedia */
// Runs before first paint (a blocking script in <head>), as an external file so the
// Content-Security-Policy can forbid every inline script.
(function () {
  // Clickjacking fallback: the host sends X-Frame-Options/frame-ancestors, but if the page is ever
  // served without them and someone frames it, hide it and break out instead of letting the frame
  // overlay invisible buttons on top of it.
  if (window.top !== window.self) {
    document.documentElement.style.visibility = 'hidden';
    try {
      window.top.location.replace(window.self.location.href);
    } catch {
      // A sandboxed frame cannot navigate the top window: the page simply stays hidden.
    }
    return;
  }

  // Apply the saved theme before first paint so dark mode never flashes white.
  try {
    var saved = JSON.parse(localStorage.getItem('streetbiz-theme') || '{}');
    var mode = (saved.state && saved.state.mode) || 'system';
    var dark =
      mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch {
    // Storage blocked: keep the light theme.
  }
})();
