(() => {
  "use strict";

  /* ====================
     FOOTER YEAR (shared)
     ==================== */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
