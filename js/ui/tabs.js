export function initialiseTabs({ navSelector = '[data-tab-button]', panelSelector = '[data-tab-panel]', defaultTab = 'plan', onChange = null } = {}) {
  const buttons = Array.from(document.querySelectorAll(navSelector));
  const panels = Array.from(document.querySelectorAll(panelSelector));

  if (buttons.length === 0 || panels.length === 0) {
    return {
      setActiveTab() {}
    };
  }

  const panelMap = new Map(panels.map((panel) => [panel.dataset.tabPanel, panel]));
  const buttonMap = new Map(buttons.map((button) => [button.dataset.tabButton, button]));

  function setActiveTab(tabName, focusButton = false) {
    buttonMap.forEach((button, name) => {
      const isActive = name === tabName;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      if (isActive && focusButton) button.focus();
    });

    panelMap.forEach((panel, name) => {
      const isActive = name === tabName;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });

    if (typeof onChange === 'function') {
      onChange(tabName);
    }
  }

  function handleKeydown(event) {
    const currentIndex = buttons.findIndex((button) => button === event.currentTarget);
    if (currentIndex === -1) return;

    let nextIndex = null;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = buttons.length - 1;

    if (nextIndex === null) return;

    event.preventDefault();
    const nextButton = buttons[nextIndex];
    setActiveTab(nextButton.dataset.tabButton, true);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tabButton));
    button.addEventListener('keydown', handleKeydown);
  });

  setActiveTab(buttonMap.has(defaultTab) ? defaultTab : buttons[0].dataset.tabButton);

  return { setActiveTab };
}
