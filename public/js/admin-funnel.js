/* Formulaire de question du tunnel : n'affiche que les réglages utiles au type
   de champ retenu, et permet d'ajouter ou retirer des réponses.

   Sans JavaScript, tous les blocs restent visibles (le <noscript> de la vue
   n'a pas lieu d'être ici : le serveur ignore les réglages hors sujet). */
(() => {
  "use strict";

  const form = document.querySelector("[data-question-form]");
  if (!form) return;

  const typeSelect = form.querySelector("[data-question-type]");
  const sections = Array.from(form.querySelectorAll("[data-for-type]"));
  const list = form.querySelector("[data-options]");
  const addBtn = form.querySelector("[data-add-option]");
  const template = document.querySelector("[data-option-template]");

  const applyType = () => {
    const type = typeSelect.value;
    sections.forEach((section) => {
      section.hidden = !section.dataset.forType.split(" ").includes(type);
    });
  };

  typeSelect.addEventListener("change", applyType);
  applyType();

  addBtn.addEventListener("click", () => {
    const row = template.content.firstElementChild.cloneNode(true);
    list.appendChild(row);
    const field = row.querySelector('input[name="optLabel"]');
    if (field) field.focus();
  });

  // Une question à choix a besoin d'au moins deux réponses : le serveur le
  // refuse, autant ne pas laisser vider la liste
  list.addEventListener("click", (e) => {
    const button = e.target.closest("[data-remove-option]");
    if (!button) return;
    if (list.querySelectorAll("[data-option-row]").length <= 2) {
      window.alert("Une question à choix demande au moins deux réponses.");
      return;
    }
    button.closest("[data-option-row]").remove();
  });
})();
