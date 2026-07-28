/* Centre de contrôle — confirmation avant suppression */
(() => {
  "use strict";

  document.querySelectorAll("form[data-confirm]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      if (!window.confirm(form.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });
})();
