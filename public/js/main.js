/* Portfolio — interactions front-end (vanilla JS) */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = window.matchMedia("(hover: none)").matches;

  /* ── Barre de navigation : opacité au défilement ─────────────────────── */
  const navbar = document.getElementById("navbar");
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle("nav-scrolled", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ── Menu burger mobile ──────────────────────────────────────────────── */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobile-menu");
  if (burger && mobileMenu) {
    const setMenu = (open) => {
      burger.classList.toggle("burger-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      mobileMenu.hidden = !open;
      if (open) navbar.classList.add("nav-scrolled");
    };

    burger.addEventListener("click", () => {
      setMenu(mobileMenu.hidden);
    });

    // Fermer avec Échap (navigation au clavier)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !mobileMenu.hidden) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ── Panneau en verre : effet 3D suivant la souris ───────────────────── */
  const panel = document.getElementById("glass-panel");
  const scene = panel ? panel.closest("[data-tilt-scene]") : null;

  if (panel && scene && !prefersReducedMotion && !isTouchDevice) {
    const MAX_TILT = 8; // degrés — l'effet doit rester subtil
    const SMOOTHING = 0.1; // interpolation : plus petit = plus doux
    let targetRX = 0;
    let targetRY = 0;
    let currentRX = 0;
    let currentRY = 0;
    let rafId = null;

    // Boucle d'animation : l'inclinaison et l'ombre convergent en douceur
    // vers la cible, comme une plaque avec une légère inertie
    const animate = () => {
      currentRX += (targetRX - currentRX) * SMOOTHING;
      currentRY += (targetRY - currentRY) * SMOOTHING;
      panel.style.setProperty("--rx", `${currentRX.toFixed(3)}deg`);
      panel.style.setProperty("--ry", `${currentRY.toFixed(3)}deg`);
      // L'ombre glisse à l'opposé de l'inclinaison pour ancrer la vitre
      panel.style.setProperty("--sx", `${(currentRY * 2.4).toFixed(2)}px`);
      panel.style.setProperty("--sy", `${(currentRX * -2).toFixed(2)}px`);

      const settled =
        Math.abs(targetRX - currentRX) < 0.02 && Math.abs(targetRY - currentRY) < 0.02;
      rafId = settled ? null : requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (!rafId) rafId = requestAnimationFrame(animate);
    };

    // La zone d'écoute est la scène (stable), pas la vitre (qui bouge)
    scene.addEventListener("pointermove", (e) => {
      const rect = scene.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;

      targetRY = px * MAX_TILT;
      targetRX = -py * MAX_TILT;

      // Reflet spéculaire sous le curseur
      panel.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`);
      panel.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`);
      // L'arête lumineuse du pourtour tourne vers la souris
      const edgeAngle = Math.atan2(px, -py) * (180 / Math.PI);
      panel.style.setProperty("--edge", `${edgeAngle.toFixed(1)}deg`);

      startAnimation();
    });

    scene.addEventListener("pointerleave", () => {
      targetRX = 0;
      targetRY = 0;
      panel.style.setProperty("--edge", "0deg");
      panel.style.setProperty("--my", "35%");
      startAnimation();
    });
  }

  /* ── Matérialisation ──────────────────────────────────────────────────
     Un bloc se reconstruit de haut en bas derrière une ligne de scan, sur
     fond de grille holographique, pendant que des particules de données
     sont absorbées. Le même effet sert à la vitre après son bris, à
     l'arrivée sur une page et aux blocs découverts au défilement.       */
  const canAnimate = !prefersReducedMotion && "animate" in Element.prototype;

  // Au-delà, les particules deviennent coûteuses sans rien apporter de plus
  const MAX_BIT_BURSTS = 4;
  let activeBitBursts = 0;

  const spawnDataBits = (rect) => {
    if (activeBitBursts >= MAX_BIT_BURSTS) return;
    activeBitBursts++;

    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText =
      `position:fixed;left:${rect.left}px;top:${rect.top}px;` +
      `width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:41;`;

    // Les grands blocs absorbent plus de fragments que les petits
    const area = rect.width * rect.height;
    const count = Math.round(Math.min(28, Math.max(6, area / 14000)));

    for (let i = 0; i < count; i++) {
      const bit = document.createElement("div");
      const size = 2 + Math.random() * 4;
      const color = Math.random() < 0.5 ? "#c084fc" : "#a855f7";
      bit.style.cssText =
        `position:absolute;width:${size}px;height:${size}px;background:${color};` +
        `left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;` +
        "box-shadow:0 0 8px rgba(168,85,247,0.9);opacity:0;";
      container.appendChild(bit);

      // Chaque fragment arrive de loin et se fait absorber par le bloc
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * 180;
      bit.animate(
        [
          {
            transform:
              `translate(${(Math.cos(angle) * distance).toFixed(1)}px, ` +
              `${(Math.sin(angle) * distance).toFixed(1)}px) rotate(${((Math.random() - 0.5) * 240).toFixed(0)}deg)`,
            opacity: 0
          },
          { opacity: 1, offset: 0.4 },
          { transform: "translate(0, 0) rotate(0deg)", opacity: 0 }
        ],
        {
          duration: 550 + Math.random() * 650,
          delay: Math.random() * 550,
          easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
          fill: "both"
        }
      );
    }

    document.body.appendChild(container);
    setTimeout(() => {
      container.remove();
      activeBitBursts--;
    }, 2000);
  };

  const materialize = (el) => {
    el.classList.remove("materialize");
    if (!canAnimate) return;

    el.classList.add("materializing");

    const scan = document.createElement("div");
    scan.className = "materialize-scan";
    scan.setAttribute("aria-hidden", "true");

    const grid = document.createElement("div");
    grid.className = "holo-grid";
    grid.setAttribute("aria-hidden", "true");

    el.append(scan, grid);
    spawnDataBits(el.getBoundingClientRect());

    const onEnd = (e) => {
      if (e.target !== el || e.animationName !== "materialize") return;
      el.classList.remove("materializing");
      scan.remove();
      grid.remove();
      el.removeEventListener("animationend", onEnd);
    };
    el.addEventListener("animationend", onEnd);
  };

  /* ── Easter egg : 10 clics sur la vitre et elle éclate ──────────────── */
  if (panel && canAnimate) {
    const CLICKS_TO_SHATTER = 10;
    const RESTORE_DELAY = 5000;
    const COLS = 6;
    const ROWS = 4;
    let clickCount = 0;
    let broken = false;

    // Découpe le panneau en triangles : grille de points avec un décalage
    // aléatoire pour que les fissures paraissent naturelles
    const buildGrid = () => {
      const grid = [];
      for (let r = 0; r <= ROWS; r++) {
        const row = [];
        for (let c = 0; c <= COLS; c++) {
          const edgeX = c === 0 || c === COLS;
          const edgeY = r === 0 || r === ROWS;
          row.push([
            (c * 100) / COLS + (edgeX ? 0 : (Math.random() - 0.5) * (80 / COLS)),
            (r * 100) / ROWS + (edgeY ? 0 : (Math.random() - 0.5) * (80 / ROWS))
          ]);
        }
        grid.push(row);
      }
      return grid;
    };

    const shatter = () => {
      broken = true;
      const rect = panel.getBoundingClientRect();

      // Conteneur d'éclats superposé exactement sur la vitre
      const shards = document.createElement("div");
      shards.style.cssText =
        `position:fixed;left:${rect.left}px;top:${rect.top}px;` +
        `width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:40;`;
      shards.setAttribute("aria-hidden", "true");

      const grid = buildGrid();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const corners = [grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]];
          // Chaque cellule donne deux éclats triangulaires
          const triangles = [
            [corners[0], corners[1], corners[2]],
            [corners[0], corners[2], corners[3]]
          ];

          for (const tri of triangles) {
            const shard = panel.cloneNode(true);
            shard.removeAttribute("id");
            shard.classList.add("glass-shard");
            const polygon = tri.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(",");
            shard.style.cssText =
              `position:absolute;inset:0;clip-path:polygon(${polygon});will-change:transform,opacity;`;
            shards.appendChild(shard);

            // Trajectoire : chaque éclat part du centre vers l'extérieur,
            // tombe avec la gravité et tournoie
            const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3 - 50;
            const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3 - 50;
            const distance = Math.hypot(cx / 50, cy / 50);
            const dx = (cx / 100) * rect.width * (1.6 + Math.random() * 2.2);
            const dy = (cy / 100) * rect.height * (1.2 + Math.random()) + 220 + Math.random() * 160;
            const rotation = (Math.random() - 0.5) * 220;

            shard.animate(
              [
                { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
                { opacity: 1, offset: 0.35 },
                { transform: `translate(${dx}px, ${dy}px) rotate(${rotation}deg) scale(0.7)`, opacity: 0 }
              ],
              {
                duration: 900 + Math.random() * 600,
                delay: distance * 60,
                easing: "cubic-bezier(0.25, 0.5, 0.5, 1)",
                fill: "forwards"
              }
            );
          }
        }
      }

      const flash = document.createElement("div");
      flash.className = "shatter-flash";
      shards.appendChild(flash);

      document.body.appendChild(shards);
      panel.style.visibility = "hidden";

      // La vitre se rematérialise après 5 secondes
      setTimeout(() => {
        shards.remove();
        panel.style.visibility = "";
        materialize(panel);
        broken = false;
        clickCount = 0;
      }, RESTORE_DELAY);
    };

    panel.addEventListener("click", (e) => {
      // Les clics sur les boutons du panneau ne comptent pas
      if (broken || e.target.closest("a, button")) return;
      clickCount++;

      if (clickCount >= CLICKS_TO_SHATTER) {
        shatter();
        return;
      }

      // Secousse de plus en plus marquée à chaque clic : la vitre se fragilise.
      // La propriété `translate` se combine avec l'inclinaison 3D sans l'écraser.
      const intensity = 1 + clickCount * 0.6;
      panel.animate(
        [
          { translate: "0 0" },
          { translate: `${-intensity}px ${intensity * 0.4}px` },
          { translate: `${intensity}px ${-intensity * 0.4}px` },
          { translate: "0 0" }
        ],
        { duration: 180, easing: "ease-out" }
      );
    });
  }

  /* ── Particules discrètes (page d'accueil) ───────────────────────────── */
  const canvas = document.getElementById("particles");
  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext("2d");
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(60, Math.floor(window.innerWidth / 24));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.4 + 0.1
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192, 132, 252, ${p.alpha})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  /* ── Transitions entre les pages ─────────────────────────────────────── */
  // À l'arrivée, la page se matérialise (rideau + scan, en CSS via body.page-fx).
  // Au départ, le contenu se dématérialise brièvement avant la navigation.
  if (!prefersReducedMotion) {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.target && link.target !== "_self") return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Les ancres de la page courante défilent normalement
      if (url.pathname === window.location.pathname && url.hash) return;

      e.preventDefault();
      document.body.classList.add("page-leaving");
      setTimeout(() => {
        window.location.href = url.href;
      }, 200);
    });

    // Retour via le cache du navigateur : réafficher la page normalement
    window.addEventListener("pageshow", () => {
      document.body.classList.remove("page-leaving");
    });
  }

  /* ── Matérialisation des blocs : à l'arrivée puis au fil du défilement ──
     Les blocs déjà à l'écran se matérialisent du haut vers le bas comme une
     vague ; les suivants attendent d'entrer dans la fenêtre, ce qui étale
     l'effet sur toute la hauteur d'une longue page.                      */
  const blocks = document.querySelectorAll(".materialize");
  if (blocks.length > 0) {
    if (!canAnimate || !("IntersectionObserver" in window)) {
      blocks.forEach((el) => el.classList.remove("materialize"));
    } else {
      const ARRIVAL_SWEEP = 650; // durée de la vague d'arrivée, de haut en bas
      const STAGGER = 90; // décalage entre deux blocs révélés ensemble
      let firstBatch = true;
      let nextSlot = 0;

      const observer = new IntersectionObserver(
        (entries, obs) => {
          const visible = entries.filter((entry) => entry.isIntersecting);
          if (visible.length === 0) return;

          // Du haut vers le bas : la matérialisation suit le sens de lecture
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          const now = performance.now();
          const base = Math.max(now, nextSlot);
          const viewport = window.innerHeight || 1;

          visible.forEach((entry, i) => {
            obs.unobserve(entry.target);

            // À l'arrivée, le délai suit la position à l'écran (vague de haut
            // en bas) ; ensuite, cascade régulière à l'entrée dans la fenêtre
            const delay = firstBatch
              ? (Math.min(Math.max(entry.boundingClientRect.top, 0), viewport) / viewport) * ARRIVAL_SWEEP
              : base - now + i * STAGGER;

            setTimeout(() => materialize(entry.target), delay);
          });

          nextSlot = firstBatch ? now + ARRIVAL_SWEEP : base + visible.length * STAGGER;
          firstBatch = false;
        },
        { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
      );

      blocks.forEach((el) => observer.observe(el));
    }
  }

  /* ── Notification (toast) ────────────────────────────────────────────── */
  const toast = document.getElementById("toast");
  let toastTimer = null;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove("toast-hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add("toast-hidden");
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 2600);
  };

  /* ── Copie de l'adresse e-mail ───────────────────────────────────────── */
  document.querySelectorAll(".copy-email").forEach((copyBtn) => {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.email);
        showToast("Adresse e-mail copiée");
      } catch {
        showToast("Impossible de copier l'adresse");
      }
    });
  });

  /* ── Filtres de la page projets ──────────────────────────────────────── */
  const filterButtons = document.querySelectorAll(".filter-btn");
  const projectCards = document.querySelectorAll(".project-card");
  const noProjects = document.getElementById("no-projects");

  if (filterButtons.length > 0 && projectCards.length > 0) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter;

        filterButtons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("filter-btn-active", active);
          b.setAttribute("aria-pressed", String(active));
        });

        let visibleCount = 0;
        projectCards.forEach((card) => {
          const match = filter === "Tous" || card.dataset.category === filter;
          card.hidden = !match;
          if (match) {
            // Les cartes retenues se rematérialisent en cascade
            card.classList.add("materialize");
            setTimeout(() => materialize(card), visibleCount * 70);
            visibleCount++;
          }
        });

        if (noProjects) noProjects.hidden = visibleCount > 0;
      });
    });

    const applyHashFilter = () => {
      const slug = decodeURIComponent(window.location.hash.replace("#", "")).trim();
      if (!slug) return;
      const match = [...filterButtons].find((btn) => btn.dataset.slug === slug);
      if (match) match.click();
    };

    applyHashFilter();
    window.addEventListener("hashchange", applyHashFilter);
  }

  /* ── Formulaire de contact : validation côté client + envoi ──────────── */
  const form = document.getElementById("contact-form");
  if (form) {
    const fields = ["name", "email", "subject", "message"];

    const setError = (fieldName, message) => {
      const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
      const input = form.elements[fieldName];
      if (errorEl) {
        errorEl.textContent = message || "";
        errorEl.hidden = !message;
      }
      if (input) {
        input.classList.toggle("field-invalid", Boolean(message));
        input.setAttribute("aria-invalid", message ? "true" : "false");
      }
    };

    const validateField = (input) => {
      const value = input.value.trim();
      if (input.required && value.length === 0) {
        return "Ce champ est obligatoire.";
      }
      if (input.minLength > 0 && value.length < input.minLength) {
        return `Minimum ${input.minLength} caractères.`;
      }
      if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return "Adresse e-mail invalide.";
      }
      return "";
    };

    fields.forEach((name) => {
      form.elements[name].addEventListener("blur", (e) => {
        setError(name, validateField(e.target));
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setError("global", "");

      let hasError = false;
      fields.forEach((name) => {
        const error = validateField(form.elements[name]);
        setError(name, error);
        if (error) hasError = true;
      });
      if (hasError) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi en cours...";

      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const res = await fetch("/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.ok) {
          form.reset();
          showToast("Message envoyé. Merci !");
        } else if (data.errors) {
          Object.entries(data.errors).forEach(([field, msg]) => setError(field, msg));
        }
      } catch {
        setError("global", "Une erreur est survenue. Réessayez plus tard.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Envoyer";
      }
    });
  }
})();
