
let activeTab = null;

export function setActiveTab(tabName) {

  document.querySelectorAll('[data-tab-panel]').forEach(panel => {
    panel.style.display = panel.dataset.tabPanel === tabName ? 'block' : 'none';
  });

  document.querySelectorAll('[data-tab-button]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tabButton === tabName);
  });

  activeTab = tabName;
}

export function initialiseTabs({ defaultTab = 'plan' } = {}) {

  document.querySelectorAll('[data-tab-button]').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.tabButton);
    });
  });

  setActiveTab(defaultTab);
}
