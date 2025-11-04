// Theme toggle functionality
function toggleTheme() {
  const body = document.body;
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const currentTheme = body.getAttribute('data-theme');

  if (currentTheme === 'dark') {
    body.removeAttribute('data-theme');
    if (toggleBtn) {
      toggleBtn.textContent = 'dark';
    }
    localStorage.setItem('theme', 'light');
  } else {
    body.setAttribute('data-theme', 'dark');
    if (toggleBtn) {
      toggleBtn.textContent = 'light';
    }
    localStorage.setItem('theme', 'dark');
  }
}

// Load theme preference immediately (before DOMContentLoaded)
(function() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
  }
})();

// Update button text after DOM loads
document.addEventListener('DOMContentLoaded', function() {
  const savedTheme = localStorage.getItem('theme');
  const toggleBtn = document.getElementById('theme-toggle-btn');

  if (toggleBtn && savedTheme === 'dark') {
    toggleBtn.textContent = 'light';
  }
});
