export function initialiseTabs({ defaultTab = 'inputs', onChange = null } = {}) {
  const buttons = Array.from(document.querySelectorAll('[data-tab-button]'));
  const panels = Array.from(document.querySelectorAll('[data-tab-panel]'));

  function setActiveTab(tabName) {
    buttons.forEach((button) => {
      const isActive = button.dataset.tabButton === tabName;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === tabName;
      panel.classList.toggle('is-active', isActive);

      if (isActive) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    });

    if (typeof onChange === 'function') {
      onChange(tabName);
    }
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.tabButton);
    });
  });

  const availableTabs = new Set(buttons.map((button) => button.dataset.tabButton));
  const initialTab = availableTabs.has(defaultTab)
    ? defaultTab
    : buttons[0]?.dataset.tabButton;

  if (initialTab) {
    setActiveTab(initialTab);
  }

  return {
    setActiveTab,
    getActiveTab() {
      const activeButton = buttons.find((button) => button.classList.contains('is-active'));
      return activeButton ? activeButton.dataset.tabButton : null;
    }
  };
}