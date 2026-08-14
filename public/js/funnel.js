/* Tunnel « Créer mon projet » : navigation par étapes, questions conditionnelles
   et estimation affichée en direct.

   Les tarifs ne sont pas dupliqués ici : ils sont lus dans les attributs data-*
   posés par views/partials/funnel-question.ejs depuis lib/funnel.js. Le montant
   affiché reste un aperçu — celui qui fait foi est renvoyé par le serveur. */
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

  const resultIndex = steps.length - 1; // la dernière étape affiche l'estimation
  let current = 0;
  let sent = false;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const euro = (n) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  /* ── Questions conditionnelles ───────────────────────────────────────── */
  const selectedType = () => {
    const checked = form.querySelector('input[name="type"]:checked');
    return checked ? checked.value : "";
  };

  const isVisible = (question) => {
    const showFor = question.dataset.showFor;
    return !showFor || showFor.split(" ").includes(selectedType());
  };

  const applyConditions = () => {
    questions.forEach((question) => {
      const visible = isVisible(question);
      question.hidden = !visible;
      // Les champs masqués ne doivent pas partir dans la requête
      question.querySelectorAll("input, textarea, select").forEach((field) => {
        field.disabled = !visible;
      });
    });
  };

  /* ── Estimation en direct ────────────────────────────────────────────── */
  const readEstimate = () => {
    let min = 0;
    let max = 0;
    let factor = 1;
    let monthly = [0, 0];

    for (const question of questions) {
      if (question.hidden) continue;

      question.querySelectorAll("input[type=radio]:checked, input[type=checkbox]:checked").forEach((input) => {
        min += Number(input.dataset.min || 0);
        max += Number(input.dataset.max || 0);
        if (input.dataset.factor) factor *= Number(input.dataset.factor);
        if (Number(input.dataset.monthlyMax) > 0) {
          monthly = [Number(input.dataset.monthlyMin), Number(input.dataset.monthlyMax)];
        }
      });

      question.querySelectorAll("input[type=number][data-unit-min]").forEach((input) => {
        const quantity = Math.min(Number(input.value) || 0, Number(input.max));
        const extra = Math.max(0, quantity - Number(input.dataset.included));
        min += extra * Number(input.dataset.unitMin);
        max += extra * Number(input.dataset.unitMax);
      });
    }

    const round = (n) => Math.round((n * factor) / 50) * 50;
    return { min: round(min), max: round(max), monthly };
  };

  /* Le montant grimpe jusqu'à sa nouvelle valeur : le budget se construit sous
     les yeux du visiteur à chaque réponse plutôt que de sauter d'un coup. */
  let shown = [0, 0];
  let countFrame = 0;

  const paintLive = (min, max, monthly) => {
    const suffix = monthly[1] > 0 ? ` + ${euro(monthly[0])}–${euro(monthly[1])} / mois` : "";
    live.textContent = `${euro(min)} à ${euro(max)}${suffix}`;
  };

  const refreshLive = () => {
    if (!selectedType()) {
      cancelAnimationFrame(countFrame);
      shown = [0, 0];
      live.textContent = "Choisissez un type de projet";
      return;
    }

    const { min, max, monthly } = readEstimate();
    if (reducedMotion) {
      shown = [min, max];
      paintLive(min, max, monthly);
      return;
    }

    const from = shown;
    const start = performance.now();
    const DURATION = 550;

    cancelAnimationFrame(countFrame);
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / DURATION);
      // Décélération : la course ralentit à l'approche du montant final
      const eased = 1 - Math.pow(1 - progress, 3);
      const step = (a, b) => Math.round((a + (b - a) * eased) / 50) * 50;
      shown = [step(from[0], min), step(from[1], max)];
      paintLive(shown[0], shown[1], monthly);
      if (progress < 1) countFrame = requestAnimationFrame(tick);
      else shown = [min, max];
    };
    countFrame = requestAnimationFrame(tick);
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

  /* ── Rendu de l'estimation renvoyée par le serveur ───────────────────── */
  // Échelle de la jauge : borne haute de mes interventions courantes. Une
  // fourchette qui la dépasse sature simplement à droite.
  const GAUGE_CEILING = 45000;

  const renderQuote = (quote) => {
    document.getElementById("quote-range").textContent = `${euro(quote.min)} à ${euro(quote.max)}`;

    const [wMin, wMax] = quote.weeks;
    document.getElementById("quote-weeks").textContent =
      wMin === wMax ? `${wMin} semaines` : `${wMin} à ${wMax} semaines`;

    document.getElementById("quote-monthly").textContent =
      quote.monthly[1] > 0 ? `${euro(quote.monthly[0])} à ${euro(quote.monthly[1])} / mois` : "Aucune";

    const percent = (n) => Math.min(100, (n / GAUGE_CEILING) * 100);
    const gauge = document.getElementById("quote-gauge");
    const left = percent(quote.min);
    gauge.style.left = `${left}%`;
    gauge.style.width = `${Math.max(4, percent(quote.max) - left)}%`;

    // Le trait de chaque poste se lit par rapport au plus lourd d'entre eux
    const heaviest = quote.breakdown.reduce((top, line) => Math.max(top, line.max), 0) || 1;
    const list = document.getElementById("quote-breakdown");
    list.textContent = "";

    for (const line of quote.breakdown) {
      const item = document.createElement("li");

      const row = document.createElement("div");
      row.className = "flex items-baseline justify-between gap-4 text-sm";

      const label = document.createElement("span");
      label.className = "text-secondary";
      label.textContent = line.label;

      const amount = document.createElement("span");
      amount.className = "shrink-0 text-primary";
      amount.textContent = `${euro(line.min)} à ${euro(line.max)}`;

      row.append(label, amount);

      const bar = document.createElement("div");
      bar.className = "funnel-line-bar";
      const fill = document.createElement("div");
      fill.className = "funnel-line-fill";
      bar.appendChild(fill);

      item.append(row, bar);
      list.appendChild(item);

      // Largeur posée après insertion pour que la transition CSS s'amorce
      requestAnimationFrame(() => { fill.style.width = `${(line.max / heaviest) * 100}%`; });
    }
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
    submitBtn.textContent = "Calcul en cours...";

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
      renderQuote(data.quote);
      showStep(resultIndex);
    } catch {
      globalError.textContent = "Une erreur est survenue. Réessayez plus tard.";
      globalError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Voir mon estimation";
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
