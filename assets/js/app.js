(function () {
  "use strict";

  const data = window.TESHUVAULT;
  const escapeHtml = window.TeshuMarkdown.escapeHtml;
  const storageKeys = {
    theme: "teshuvault-theme",
    progress: "teshuvault-progress",
    journal: "teshuvault-journal"
  };

  const state = {
    tradition: "הכול",
    layer: "הכול",
    query: "",
    progress: new Set()
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const getStoredJSON = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_error) {
      return fallback;
    }
  };

  const setStoredJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  };

  const traditionIcon = {
    "מקרא": "📜",
    "חז״ל": "🕯️",
    "הלכה": "⚖️",
    "ראשונים": "🏛️",
    "מוסר": "🌱",
    "קבלה": "🌌",
    "חסידות": "🔥",
    "מחשבה": "🌅",
    "סינתזה": "💎"
  };

  const renderFilters = () => {
    const traditions = ["הכול", ...new Set(data.interpretations.map((item) => item.tradition))];
    const layers = [...new Set(data.interpretations.map((item) => item.layer))].sort((a, b) => a.localeCompare(b, "he"));
    const filterRoot = qs("#traditionFilters");
    const layerSelect = qs("#layerFilter");

    filterRoot.innerHTML = traditions.map((tradition) => `
      <button class="filter-chip" type="button" data-tradition="${escapeHtml(tradition)}" aria-pressed="${tradition === "הכול"}">
        ${tradition === "הכול" ? "✦ הכול" : `${traditionIcon[tradition] || "•"} ${escapeHtml(tradition)}`}
      </button>
    `).join("");

    layers.forEach((layer) => {
      const option = document.createElement("option");
      option.value = layer;
      option.textContent = layer;
      layerSelect.append(option);
    });
  };

  const filteredItems = () => {
    const query = state.query.trim().toLocaleLowerCase("he");
    return data.interpretations.filter((item) => {
      const matchesTradition = state.tradition === "הכול" || item.tradition === state.tradition;
      const matchesLayer = state.layer === "הכול" || item.layer === state.layer;
      const haystack = `${item.title} ${item.source} ${item.summary} ${item.action} ${item.tradition} ${item.layer}`.toLocaleLowerCase("he");
      return matchesTradition && matchesLayer && (!query || haystack.includes(query));
    });
  };

  const cardTemplate = (item) => `
    <article class="interpretation-card" data-id="${item.id}">
      <div class="card-topline">
        <span class="tradition-tag">${traditionIcon[item.tradition] || "•"} ${escapeHtml(item.tradition)}</span>
        <span class="layer-tag">${escapeHtml(item.layer)}</span>
      </div>
      <h3>${item.id}. ${escapeHtml(item.title)}</h3>
      <p class="card-source">${escapeHtml(item.source)}</p>
      <p class="card-summary">${escapeHtml(item.summary)}</p>
      <p class="card-action"><strong>צעד:</strong> ${escapeHtml(item.action)}</p>
      <button class="card-open" type="button" data-detail="${item.id}" aria-label="פתיחת פרשנות ${item.id}">↗</button>
    </article>
  `;

  const renderInterpretations = () => {
    const items = filteredItems();
    qs("#interpretationGrid").innerHTML = items.map(cardTemplate).join("");
    qs("#resultCount").textContent = items.length;
    qs("#emptyState").hidden = items.length !== 0;
  };

  const resetFilters = () => {
    state.tradition = "הכול";
    state.layer = "הכול";
    state.query = "";
    qs("#searchInput").value = "";
    qs("#layerFilter").value = "הכול";
    qsa(".filter-chip").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.tradition === "הכול")));
    renderInterpretations();
  };

  const openDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    document.body.classList.add("modal-open");
    const markdown = qs("[data-markdown-file]", dialog);
    if (markdown) window.TeshuMarkdown.loadInto(markdown);
  };

  const closeDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    document.body.classList.remove("modal-open");
  };

  const showDetail = (id) => {
    const item = data.interpretations.find((entry) => entry.id === Number(id));
    if (!item) return;
    qs("#detailContent").innerHTML = `
      <div class="modal-kicker">${traditionIcon[item.tradition] || "•"} פרשנות ${item.id} מתוך 40</div>
      <h2 id="detailTitle">${escapeHtml(item.title)}</h2>
      <div class="detail-meta">
        <span class="tradition-tag">${escapeHtml(item.tradition)}</span>
        <span class="layer-tag">${escapeHtml(item.layer)}</span>
      </div>
      <p class="detail-source">📚 ${escapeHtml(item.source)}</p>
      <p>${escapeHtml(item.summary)}</p>
      <div class="detail-action"><strong>🧭 פעולה מעשית:</strong><br>${escapeHtml(item.action)}</div>
      <p class="detail-link"><a class="text-link" href="${escapeHtml(item.url)}">פתיחת המקור או המסמך <span aria-hidden="true">←</span></a></p>
    `;
    openDialog(qs("#detailModal"));
  };

  const loadProgress = () => {
    const saved = getStoredJSON(storageKeys.progress, []);
    state.progress = new Set(Array.isArray(saved) ? saved.map(Number) : []);
  };

  const updateProgressUI = () => {
    const percent = Math.round((state.progress.size / data.steps.length) * 100);
    qs("#progressNumber").textContent = `${percent}%`;
    qs("#progressRing").style.setProperty("--progress", percent);
    qsa(".step-card").forEach((card) => {
      const complete = state.progress.has(Number(card.dataset.step));
      card.classList.toggle("completed", complete);
      card.setAttribute("aria-pressed", String(complete));
      qs(".step-check", card).textContent = complete ? "✓" : "";
    });
  };

  const renderSteps = () => {
    qs("#stepsGrid").innerHTML = data.steps.map((step) => `
      <button class="step-card" type="button" data-step="${step.id}" aria-pressed="false">
        <span class="step-check" aria-hidden="true"></span>
        <span class="step-main">
          <span class="step-icon" aria-hidden="true">${step.icon}</span>
          <h3>${escapeHtml(step.title)}</h3>
          <p>${escapeHtml(step.text)}</p>
        </span>
        <span class="step-number">${String(step.id).padStart(2, "0")}</span>
      </button>
    `).join("");
    updateProgressUI();
  };

  const toggleStep = (id) => {
    const numericId = Number(id);
    if (state.progress.has(numericId)) state.progress.delete(numericId);
    else state.progress.add(numericId);
    setStoredJSON(storageKeys.progress, [...state.progress]);
    updateProgressUI();
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    const toggle = qs("#themeToggle");
    toggle.textContent = theme === "light" ? "🌙" : "☀️";
    toggle.setAttribute("aria-label", theme === "light" ? "מעבר לערכה כהה" : "מעבר לערכה בהירה");
  };

  const initTheme = () => {
    let theme = "dark";
    try {
      theme = localStorage.getItem(storageKeys.theme) || "dark";
    } catch (_error) {
      theme = "dark";
    }
    applyTheme(theme);
  };

  const loadJournal = () => {
    const journal = getStoredJSON(storageKeys.journal, { truth: "", repair: "", next: "", savedAt: "" });
    qs("#journalTruth").value = journal.truth || "";
    qs("#journalRepair").value = journal.repair || "";
    qs("#journalNext").value = journal.next || "";
    if (journal.savedAt) qs("#saveStatus").textContent = `הרשומה האחרונה נשמרה במכשיר: ${journal.savedAt}`;
  };

  const saveJournal = () => {
    const entry = {
      truth: qs("#journalTruth").value.trim(),
      repair: qs("#journalRepair").value.trim(),
      next: qs("#journalNext").value.trim(),
      savedAt: new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(new Date())
    };
    const saved = setStoredJSON(storageKeys.journal, entry);
    qs("#saveStatus").textContent = saved ? `✓ נשמר מקומית: ${entry.savedAt}` : "לא ניתן לשמור בדפדפן זה.";
  };

  const clearJournal = () => {
    if (!window.confirm("למחוק את היומן האישי ואת תוכנו מהמכשיר?")) return;
    try {
      localStorage.removeItem(storageKeys.journal);
    } catch (_error) {
      // ממשיכים לניקוי התצוגה גם אם האחסון חסום.
    }
    ["#journalTruth", "#journalRepair", "#journalNext"].forEach((selector) => { qs(selector).value = ""; });
    qs("#saveStatus").textContent = "✓ היומן נמחק מהמכשיר.";
  };

  const bindEvents = () => {
    qs("#searchInput").addEventListener("input", (event) => {
      state.query = event.target.value;
      renderInterpretations();
    });

    qs("#layerFilter").addEventListener("change", (event) => {
      state.layer = event.target.value;
      renderInterpretations();
    });

    qs("#traditionFilters").addEventListener("click", (event) => {
      const chip = event.target.closest("[data-tradition]");
      if (!chip) return;
      state.tradition = chip.dataset.tradition;
      qsa(".filter-chip").forEach((button) => button.setAttribute("aria-pressed", String(button === chip)));
      renderInterpretations();
    });

    qs("#interpretationGrid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-detail]");
      if (button) showDetail(button.dataset.detail);
    });

    qs("#resetFilters").addEventListener("click", resetFilters);

    qs("#stepsGrid").addEventListener("click", (event) => {
      const step = event.target.closest("[data-step]");
      if (step) toggleStep(step.dataset.step);
    });

    qs("#resetProgress").addEventListener("click", () => {
      if (!window.confirm("לאפס את כל סימוני ההתקדמות?")) return;
      state.progress.clear();
      setStoredJSON(storageKeys.progress, []);
      updateProgressUI();
    });

    qsa("[data-open-modal]").forEach((button) => {
      button.addEventListener("click", () => openDialog(document.getElementById(button.dataset.openModal)));
    });

    qsa("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => closeDialog(button.closest("dialog")));
    });

    qsa("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
      dialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
    });

    qs("#themeToggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      try {
        localStorage.setItem(storageKeys.theme, next);
      } catch (_error) {
        // הערכה עדיין משתנה לסשן הנוכחי.
      }
      applyTheme(next);
    });

    const menuToggle = qs("#menuToggle");
    const mobileNav = qs("#mobileNav");
    menuToggle.addEventListener("click", () => {
      const open = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!open));
      mobileNav.hidden = open;
    });
    qsa("a, button", mobileNav).forEach((item) => {
      item.addEventListener("click", () => {
        menuToggle.setAttribute("aria-expanded", "false");
        mobileNav.hidden = true;
      });
    });

    qs("#saveJournal").addEventListener("click", saveJournal);
    qs("#clearJournal").addEventListener("click", clearJournal);
  };

  const registerServiceWorker = () => {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  };

  const init = () => {
    initTheme();
    renderFilters();
    renderInterpretations();
    loadProgress();
    renderSteps();
    loadJournal();
    bindEvents();
    registerServiceWorker();
  };

  document.addEventListener("DOMContentLoaded", init);
})();
