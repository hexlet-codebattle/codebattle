const SHOW_CLASS = 'cb-show';

function isVisible(element: HTMLElement): boolean {
  return !element.classList.contains(SHOW_CLASS);
}

function initCollapseToggles(): void {
  document.querySelectorAll<HTMLElement>('[data-toggle="collapse"]').forEach((button) => {
    const target = document.querySelector<HTMLElement>(`#${button.dataset.target?.slice(1)}`);
    if (!target) return;

    button.addEventListener('click', () => {
      const visible = isVisible(target);
      target.classList.toggle(SHOW_CLASS, visible);
      button.setAttribute('aria-expanded', String(visible));
    });
  });
}

function closeDropdowns(except?: HTMLElement): void {
  document.querySelectorAll<HTMLElement>('.cb-dropdown').forEach((dropdown) => {
    if (except && dropdown.contains(except)) return;
    dropdown.classList.remove(SHOW_CLASS);
    const menu = dropdown.querySelector<HTMLElement>('.cb-dropdown-menu');
    if (menu) menu.classList.remove(SHOW_CLASS);
    const toggle = dropdown.querySelector<HTMLElement>('[data-toggle="dropdown"]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
}

function initDropdownToggles(): void {
  document.querySelectorAll<HTMLElement>('[data-toggle="dropdown"]').forEach((toggle) => {
    const dropdown = toggle.closest<HTMLElement>('.cb-dropdown');
    if (!dropdown) return;

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = !dropdown.classList.contains(SHOW_CLASS);
      closeDropdowns(dropdown);
      if (willOpen) {
        dropdown.classList.add(SHOW_CLASS);
        const menu = dropdown.querySelector<HTMLElement>('.cb-dropdown-menu');
        if (menu) menu.classList.add(SHOW_CLASS);
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', () => closeDropdowns());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDropdowns();
  });
}

function initAlertDismissals(): void {
  document.querySelectorAll<HTMLElement>('[data-dismiss="alert"]').forEach((button) => {
    button.addEventListener('click', () => {
      button.closest<HTMLElement>('.cb-alert')?.remove();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCollapseToggles();
  initDropdownToggles();
  initAlertDismissals();
});
