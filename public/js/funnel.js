/* Tunnel « Créer mon projet » : navigation par étapes et questions conditionnelles.

   Les tarifs restent calculés côté serveur pour l'admin ; le visiteur ne voit
   aucun montant. */
(() => {
  "use strict";

  const form = document.getElementById("funnel");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".funnel-step"));
  const questions = Array.from(form.querySelectorAll(".funnel-question"));
  const dots = Array.from(document.querySelectorAll("#funnel-dots .funnel-dot"));
  const live = document.getElementById("funnel-live");
  const prevBtn = document.getElementById("funnel-prev");
  const nextBtn = document.getElementById("funnel-next");
  const submitBtn = document.getElementById("funnel-submit");
  const globalError = form.querySelector('[data-error-for="global"]');

  const resultIndex = steps.length - 1;
  let current = 0;
  let sent = false;

  /* ── Questions conditionnelles ───────────────────────────────────────── */
  const selectedType = () => {
    const checked = form.querySelector('input[name="type"]:checked');
    return checked ? checked.value : "";
  };

  const selectedTypeLabel = () => {
    const checked = form.querySelector('input[name="type"]:checked');
    return checked ? (checked.dataset.label || checked.value) : "";
  };

  const isVisible = (question) => {
    const showFor = question.dataset.showFor;
    return !showFor || showFor.split(" ").includes(selectedType());
  };

  const applyConditions = () => {
    questions.forEach((question) => {
      const visible = isVisible(question);
      question.hidden = !visible;
      question.querySelectorAll("input, textarea, select").forEach((field) => {
        field.disabled = !visible;
      });
    });
  };

  const refreshLive = () => {
    const label = selectedTypeLabel();
    live.textContent = label || "Choisissez un type de projet";
  };

  /* ── Récapitulatif des réponses déjà données ─────────────────────────── */
  const answerLabels = (question) => {
    const checked = Array.from(question.querySelectorAll("input:checked"));
    if (checked.length > 0) return checked.map((input) => input.dataset.label || input.value);

    const field = question.querySelector("input[type=number]");
    if (field) return [`${question.querySelector(".funnel-legend").textContent.trim()} : ${field.value}`];
    return [];
  };

  const refreshRecap = () => {
    steps.forEach((step, index) => {
      const recap = step.querySelector("[data-recap]");
      if (!recap) return;

      // Seules les étapes franchies alimentent le rappel
      const labels = questions
        .filter((question) => !question.hidden && steps.indexOf(question.closest(".funnel-step")) < index)
        .flatMap(answerLabels);

      recap.hidden = labels.length === 0;
      const chips = recap.querySelector("[data-recap-chips]");
      chips.textContent = "";
      for (const label of labels) {
        const chip = document.createElement("span");
        chip.className = "funnel-chip";
        chip.textContent = label;
        chips.appendChild(chip);
      }
    });
  };

  /* ── Validation d'une étape ──────────────────────────────────────────── */
  const setError = (question, message) => {
    const errorEl = question.querySelector("[data-error-for]");
    if (!errorEl) return;
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  };

  const validateStep = (index) => {
    let firstInvalid = null;

    for (const question of steps[index].querySelectorAll(".funnel-question")) {
      if (question.hidden) continue;
      setError(question, "");
      if (!question.hasAttribute("data-required")) continue;

      const choices = question.querySelectorAll("input[type=radio], input[type=checkbox]");
      const field = question.querySelector("input:not([type=radio]):not([type=checkbox]), textarea");
      let message = "";

      if (choices.length > 0) {
        if (!question.querySelector("input:checked")) message = "Choisissez une réponse.";
      } else if (field) {
        if (!field.value.trim()) message = "Ce champ est obligatoire.";
        else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field.value.trim())) {
          message = "Adresse e-mail invalide.";
        }
      }

      if (message) {
        setError(question, message);
        if (!firstInvalid) firstInvalid = question;
      }
    }

    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      // Les boutons de choix sont masqués visuellement mais restent focusables :
      // c'est bien eux qu'il faut viser pour une question à choix
      const field = firstInvalid.querySelector("input:not([disabled]), textarea:not([disabled])");
      if (field) field.focus({ preventScroll: true });
      return false;
    }
    return true;
  };

  /* ── Affichage de l'étape courante ───────────────────────────────────── */
  const showStep = (index) => {
    current = index;
    steps.forEach((step, i) => step.toggleAttribute("data-active", i === index));

    dots.forEach((dot, i) => {
      dot.dataset.state = i < index ? "done" : i === index ? "current" : "todo";
    });

    const onResult = index === resultIndex;
    const onLast = index === resultIndex - 1;
    prevBtn.hidden = index === 0 || onResult;
    nextBtn.hidden = onLast || onResult;
    submitBtn.hidden = !onLast;

    // Sur l'étape finale, la barre de pilotage n'a plus lieu d'être :
    // tout est dans le récapitulatif
    form.querySelectorAll(".funnel-bar").forEach((el) => { el.hidden = onResult; });

    refreshRecap();
    window.scrollTo({ top: 0, behavior: index === 0 ? "auto" : "smooth" });
  };

  /* ── Envoi ───────────────────────────────────────────────────────────── */
  const collect = () => {
    const payload = {};
    for (const question of questions) {
      if (question.hidden) continue;
      const name = question.dataset.question;

      const checkboxes = question.querySelectorAll("input[type=checkbox]");
      if (checkboxes.length > 0) {
        payload[name] = Array.from(checkboxes).filter((c) => c.checked).map((c) => c.value);
        continue;
      }

      if (question.querySelector("input[type=radio]")) {
        const checked = question.querySelector("input[type=radio]:checked");
        if (checked) payload[name] = checked.value;
        continue;
      }

      const field = question.querySelector("input:not([type=radio]):not([type=checkbox]), textarea");
      if (field) payload[name] = field.value.trim();
    }
    return payload;
  };

  const send = async () => {
    if (sent) return;
    globalError.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours...";

    try {
      const res = await fetch("/creer-mon-projet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collect())
      });
      const data = await res.json();

      if (!data.ok) {
        // Une réponse invalide renvoie l'utilisateur sur la question fautive
        for (const [name, message] of Object.entries(data.errors || {})) {
          const question = questions.find((q) => q.dataset.question === name);
          if (question) setError(question, message);
        }
        const firstStep = steps.findIndex((step) =>
          Object.keys(data.errors || {}).some((name) => step.querySelector(`[data-question="${name}"]`))
        );
        if (firstStep >= 0) showStep(firstStep);
        else {
          globalError.textContent = "Une erreur est survenue. Réessayez plus tard.";
          globalError.hidden = false;
        }
        return;
      }

      sent = true;
      showStep(resultIndex);
    } catch {
      globalError.textContent = "Une erreur est survenue. Réessayez plus tard.";
      globalError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer ma demande";
    }
  };

  /* ── Branchements ────────────────────────────────────────────────────── */
  nextBtn.addEventListener("click", () => {
    if (!validateStep(current)) return;
    showStep(Math.min(current + 1, resultIndex - 1));
  });

  prevBtn.addEventListener("click", () => showStep(Math.max(current - 1, 0)));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (validateStep(current)) send();
  });

  form.addEventListener("change", (e) => {
    if (e.target.name === "type") applyConditions();
    refreshLive();
    refreshRecap();
  });

  form.addEventListener("input", (e) => {
    if (e.target.type === "number") refreshLive();
  });

  // Sélecteurs de quantité : les boutons remplacent les flèches natives
  form.querySelectorAll("[data-stepper]").forEach((stepper) => {
    const input = stepper.querySelector("input");
    const nudge = (delta) => {
      const value = Number(input.value) || 0;
      const next = Math.min(Number(input.max), Math.max(Number(input.min), value + delta));
      if (next === value) return;
      input.value = next;
      refreshLive();
    };
    stepper.querySelector("[data-step-down]").addEventListener("click", () => nudge(-1));
    stepper.querySelector("[data-step-up]").addEventListener("click", () => nudge(1));
  });

  // Choisir un type de projet fait avancer d'office : le clic vaut validation
  form.querySelectorAll('input[name="type"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (current === 0) setTimeout(() => showStep(1), 260);
    });
  });

  applyConditions();
  refreshLive();
  showStep(0);
})();
