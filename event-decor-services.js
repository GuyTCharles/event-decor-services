(() => {
  "use strict";

  /* ====================
     FOOTER YEAR (shared)
     ==================== */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const rootEl = document.documentElement;
  const topbarEl = document.querySelector(".topbar");
  let compactViewportQuery = null;
  if (typeof window.matchMedia === "function") {
    compactViewportQuery = window.matchMedia("(max-width: 820px)");
  }
  let compactSettleToken = 0;
  let offsetRefreshQueued = false;

  function isCompactViewport() {
    return !!compactViewportQuery?.matches;
  }

  function getAnchorPadding() {
    return 12;
  }

  function getTopbarOffset() {
    if (!topbarEl) return 96;
    const topbarBox = topbarEl.getBoundingClientRect();
    const viewportOffset = window.visualViewport?.offsetTop || 0;
    return Math.max(topbarBox.bottom, topbarBox.height + viewportOffset);
  }

  function normalizePath(pathname) {
    return pathname.replace(/\/+$/, "") || "/";
  }

  function updateScrollOffsetVar() {
    if (!topbarEl) return;
    const offset = Math.ceil(getTopbarOffset() + getAnchorPadding());
    rootEl.style.setProperty("--scroll-offset", `${offset}px`);
  }

  function queueOffsetRefresh() {
    if (offsetRefreshQueued) return;
    offsetRefreshQueued = true;
    requestAnimationFrame(() => {
      offsetRefreshQueued = false;
      updateScrollOffsetVar();
    });
  }

  function getScrollOffset() {
    const raw = Number.parseFloat(
      getComputedStyle(rootEl).getPropertyValue("--scroll-offset")
    );
    if (Number.isFinite(raw)) return raw;
    if (topbarEl) return Math.ceil(getTopbarOffset() + getAnchorPadding());
    return 96;
  }

  function resolveAnchorTarget(hash) {
    if (!hash || hash === "#") return null;
    const token = decodeURIComponent(hash.slice(1)).trim();
    if (!token) return null;

    const byId = document.getElementById(token);
    if (byId) return byId;

    const byDataId = document.querySelector(`[data-scroll-id="${token}"]`);
    if (byDataId) return byDataId;

    const classToken = token.startsWith(".") ? token.slice(1) : token;
    if (!classToken) return null;

    try {
      let escaped = "";
      if (window.CSS && typeof window.CSS.escape === "function") {
        escaped = window.CSS.escape(classToken);
      } else {
        escaped = classToken.replace(/[^a-zA-Z0-9_-]/g, "");
      }
      if (!escaped) return null;
      return document.querySelector(`.${escaped}`);
    } catch {
      return null;
    }
  }

  function scrollToTarget(target, { behavior = "smooth" } = {}) {
    if (!target) return false;
    updateScrollOffsetVar();
    const offsetTop = Math.max(
      0,
      Math.round(window.scrollY + target.getBoundingClientRect().top - getScrollOffset())
    );
    window.scrollTo({ top: offsetTop, behavior });
    return true;
  }

  function runCompactSettlePasses(target) {
    if (!isCompactViewport() || !target?.isConnected) return;
    compactSettleToken += 1;
    const token = compactSettleToken;
    const settle = () => {
      if (token !== compactSettleToken || !target.isConnected) return;
      updateScrollOffsetVar();
      scrollToTarget(target, { behavior: "auto" });
    };

    [120, 280, 520].forEach((delay) => {
      window.setTimeout(settle, delay);
    });
  }

  function scrollToTargetStable(target, { behavior = "smooth" } = {}) {
    if (!scrollToTarget(target, { behavior })) return false;
    runCompactSettlePasses(target);
    return true;
  }

  /* ===========================
     TABS (event-decor-services)
     =========================== */
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

  function setActiveTab(tabId, { focus = false } = {}) {
    if (!tabs.length || !panels.length) return;

    tabs.forEach((t) => {
      const selected = t.id === tabId;
      t.setAttribute("aria-selected", selected ? "true" : "false");
      t.tabIndex = selected ? 0 : -1;
      if (selected && focus) t.focus();
    });

    panels.forEach((p) => {
      p.hidden = p.getAttribute("aria-labelledby") !== tabId;
    });
  }

  function activateJumpKey(key) {
    if (key === "balloons") {
      setActiveTab("balloons-tab");
      return true;
    }
    if (key === "no-balloons") {
      setActiveTab("no-balloons-tab");
      return true;
    }
    if (key === "sleepover") {
      setActiveTab("sleepover-tab");
      return true;
    }
    return false;
  }

  function activateTabForHash(hash) {
    if (!hash || hash === "#") return false;
    const token = decodeURIComponent(hash.slice(1)).trim();
    if (!token) return false;

    if (activateJumpKey(token)) return true;

    const tabById = document.getElementById(token);
    if (tabById?.getAttribute("role") === "tab") {
      setActiveTab(tabById.id);
      return true;
    }

    const panel = document.getElementById(token);
    if (panel?.getAttribute("role") === "tabpanel") {
      const panelTabId = panel.getAttribute("aria-labelledby");
      if (panelTabId) {
        setActiveTab(panelTabId);
        return true;
      }
    }
    return false;
  }

  if (tabs.length) {
    // Ensure one tab is active on load (first selected, else first tab)
    const initiallySelected =
      tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
    if (initiallySelected?.id) setActiveTab(initiallySelected.id);

    tabs.forEach((t) => {
      t.addEventListener("click", () => setActiveTab(t.id));

      t.addEventListener("keydown", (e) => {
        const i = tabs.indexOf(t);
        if (i < 0) return;

        if (e.key === "ArrowRight") {
          e.preventDefault();
          setActiveTab(tabs[(i + 1) % tabs.length].id, { focus: true });
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setActiveTab(tabs[(i - 1 + tabs.length) % tabs.length].id, {
            focus: true,
          });
        }
        if (e.key === "Home") {
          e.preventDefault();
          setActiveTab(tabs[0].id, { focus: true });
        }
        if (e.key === "End") {
          e.preventDefault();
          setActiveTab(tabs[tabs.length - 1].id, { focus: true });
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveTab(t.id, { focus: true });
        }
      });
    });
  }

  function applyHashNavigation({ behavior = "auto" } = {}) {
    const { hash } = window.location;
    if (!hash || hash === "#") return;

    const tabOrJumpActivated = activateTabForHash(hash);
    const token = decodeURIComponent(hash.slice(1)).trim();

    let target = resolveAnchorTarget(hash);
    if (!target && tabOrJumpActivated) {
      target = document.getElementById("packages");
    }

    if (target && target.closest("[hidden]")) {
      target = document.getElementById("packages") || target;
    }

    if (target) {
      requestAnimationFrame(() => scrollToTargetStable(target, { behavior }));
    }
  }

  document.addEventListener("click", (event) => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) return;

    const customTrigger = eventTarget.closest("[data-scroll-target]");
    if (customTrigger && !customTrigger.closest("a[href]")) {
      const selector = customTrigger.getAttribute("data-scroll-target");
      if (!selector) return;
      const target = document.querySelector(selector);
      if (target) {
        event.preventDefault();
        scrollToTargetStable(target, { behavior: "smooth" });
      }
      return;
    }

    const link = eventTarget.closest('a[href*="#"]');
    if (!link) return;

    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref === "#") return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }

    if (!url.hash) return;
    if (url.origin !== window.location.origin) return;
    if (normalizePath(url.pathname) !== normalizePath(window.location.pathname)) {
      return;
    }

    event.preventDefault();

    const jumpKey = link.getAttribute("data-jump");
    const tabOrJumpActivated = jumpKey ? activateJumpKey(jumpKey) : activateTabForHash(url.hash);

    const token = decodeURIComponent(url.hash.slice(1)).trim();
    if (token.toLowerCase() === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.location.hash !== url.hash) history.pushState(null, "", url.hash);
      return;
    }

    let target = resolveAnchorTarget(url.hash);
    if (!target && tabOrJumpActivated) {
      target = document.getElementById("packages");
    }

    if (target && target.closest("[hidden]")) {
      target = document.getElementById("packages") || target;
    }

    if (!scrollToTargetStable(target, { behavior: "smooth" })) return;

    if (window.location.hash !== url.hash) history.pushState(null, "", url.hash);
    else history.replaceState(null, "", url.hash);
  });

  updateScrollOffsetVar();
  window.addEventListener("resize", queueOffsetRefresh, { passive: true });
  window.addEventListener("orientationchange", queueOffsetRefresh, {
    passive: true,
  });
  window.visualViewport?.addEventListener("resize", queueOffsetRefresh, {
    passive: true,
  });
  window.visualViewport?.addEventListener("scroll", queueOffsetRefresh, {
    passive: true,
  });
  compactViewportQuery?.addEventListener("change", queueOffsetRefresh);

  if (topbarEl && "ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(updateScrollOffsetVar);
    resizeObserver.observe(topbarEl);
  }

  window.addEventListener("load", () => {
    updateScrollOffsetVar();
    applyHashNavigation({ behavior: "auto" });
    setTimeout(() => {
      updateScrollOffsetVar();
      applyHashNavigation({ behavior: "auto" });
    }, 160);
    document.fonts?.ready?.then(() => {
      updateScrollOffsetVar();
      applyHashNavigation({ behavior: "auto" });
    });
  });
  window.addEventListener("hashchange", () =>
    applyHashNavigation({ behavior: "smooth" })
  );

  /* ===============================
     PACKAGE CTA -> PREFILL DROPDOWN
     =============================== */
  document.querySelectorAll("[data-prefill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-prefill");
      const sel = document.getElementById("package");
      if (!v || !sel) return;

      const opt = Array.from(sel.options).find(
        (o) => o.textContent.trim() === v
      );
      if (opt) sel.value = opt.textContent;

      const details = document.getElementById("details");
      if (details) details.focus();
    });
  });

  /* =================================
     FORM SUBMIT + COPY SUMMARY (demo)
     ================================= */
  const form = document.getElementById("quoteForm");
  const note = document.getElementById("formNote");
  const copyBtn = document.getElementById("copySummaryBtn");
  const dateInput = document.getElementById("date");

  if (note) {
    note.setAttribute("role", "status");
    note.setAttribute("aria-live", "polite");
  }

  if (dateInput && !dateInput.min) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateInput.min = today.toISOString().split("T")[0];
  }

  function buildSummary() {
    if (!form) return "";
    const data = new FormData(form);

    const lines = [
      `Name: ${data.get("name") || ""}`,
      `Email: ${data.get("email") || ""}`,
      `Event date: ${data.get("date") || ""}`,
      `Guest count: ${data.get("guests") || ""}`,
      `Package: ${data.get("package") || ""}`,
      `Details: ${data.get("details") || ""}`,
    ];

    return lines.join("\n");
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (note)
        note.textContent =
          "Submitted (demo). Connect this form to your email/CRM to receive leads.";
      // Example:
      // fetch('/api/quote', { method:'POST', body: new FormData(form) })
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(buildSummary());
        if (note) note.textContent = "Copied request summary to clipboard.";
      } catch {
        if (note)
          note.textContent =
            "Could not copy. Please manually copy the form info.";
      }
    });
  }
})();
    });
  }

  /* ===========================================
     JUMP CHIPS (hero chips -> switch tab first)
     =========================================== */
  document.querySelectorAll("[data-jump]").forEach((a) => {
    a.addEventListener("click", () => {
      const key = a.getAttribute("data-jump");
      if (!key) return;

      if (key === "balloons") setActiveTab("balloons-tab");
      if (key === "no-balloons") setActiveTab("no-balloons-tab");
      if (key === "sleepover") setActiveTab("sleepover-tab");
    });
  });

  /* ===============================
     PACKAGE CTA -> PREFILL DROPDOWN
     =============================== */
  document.querySelectorAll("[data-prefill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-prefill");
      const sel = document.getElementById("package");
      if (!v || !sel) return;

      const opt = Array.from(sel.options).find(
        (o) => o.textContent.trim() === v
      );
      if (opt) sel.value = opt.textContent;

      const details = document.getElementById("details");
      if (details) details.focus();
    });
  });

  /* =================================
     FORM SUBMIT + COPY SUMMARY (demo)
     ================================= */
  const form = document.getElementById("quoteForm");
  const note = document.getElementById("formNote");
  const copyBtn = document.getElementById("copySummaryBtn");
  const dateInput = document.getElementById("date");

  if (note) {
    note.setAttribute("role", "status");
    note.setAttribute("aria-live", "polite");
  }

  if (dateInput && !dateInput.min) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateInput.min = today.toISOString().split("T")[0];
  }

  function buildSummary() {
    if (!form) return "";
    const data = new FormData(form);

    const lines = [
      `Name: ${data.get("name") || ""}`,
      `Email: ${data.get("email") || ""}`,
      `Event date: ${data.get("date") || ""}`,
      `Guest count: ${data.get("guests") || ""}`,
      `Package: ${data.get("package") || ""}`,
      `Details: ${data.get("details") || ""}`,
    ];

    return lines.join("\n");
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (note)
        note.textContent =
          "Submitted (demo). Connect this form to your email/CRM to receive leads.";
      // Example:
      // fetch('/api/quote', { method:'POST', body: new FormData(form) })
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(buildSummary());
        if (note) note.textContent = "Copied request summary to clipboard.";
      } catch {
        if (note)
          note.textContent =
            "Could not copy. Please manually copy the form info.";
      }
    });
  }
})();
