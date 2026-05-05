// Stores latest result for each cell card
// key = cell name, value = { status: "low|normal|high|na", enteredText, typeLabel, normalText }
const cellResults = new Map();

function formatRange(min, max, unit = "") {
  const u = unit ? ` ${unit}` : "";
  return `${min}–${max}${u}`;
}

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.htmlFor) node.htmlFor = opts.htmlFor;
  if (opts.type) node.type = opts.type;
  if (opts.src) node.src = opts.src;
  if (opts.alt) node.alt = opts.alt;
  if (opts.id) node.id = opts.id;
  if (opts.name) node.name = opts.name;
  if (opts.placeholder) node.placeholder = opts.placeholder;
  if (opts.inputMode) node.inputMode = opts.inputMode;
  if (opts.role) node.setAttribute("role", opts.role);
  if (opts.ariaLabel) node.setAttribute("aria-label", opts.ariaLabel);
  if (opts.ariaModal) node.setAttribute("aria-modal", opts.ariaModal);
  if (opts.autocomplete) node.autocomplete = opts.autocomplete;
  if (opts.dataset) {
    for (const [k, v] of Object.entries(opts.dataset)) node.dataset[k] = v;
  }
  return node;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildDiagnosisNodes({ title, entered, unitLabel, normalRangeText, description }) {
  const frag = document.createDocumentFragment();

  const titleDiv = el("div", { className: "title", text: title });
  const metaDiv = el("div", { className: "meta" });

  metaDiv.appendChild(document.createTextNode("Entered: "));
  metaDiv.appendChild(el("b", { text: String(entered) }));
  if (unitLabel) metaDiv.appendChild(document.createTextNode(` ${unitLabel}`));
  metaDiv.appendChild(document.createTextNode(" · Normal: "));
  metaDiv.appendChild(document.createTextNode(normalRangeText));

  const descDiv = el("div", { className: "desc", text: description });

  frag.appendChild(titleDiv);
  frag.appendChild(metaDiv);
  frag.appendChild(descDiv);

  return frag;
}

function ensureSummaryUI() {
  // Floating button
  let fab = document.querySelector(".summary-fab");
  if (!fab) {
    fab = el("button", { className: "summary-fab", type: "button", text: "Summary" });
    document.body.appendChild(fab);
  }

  // Modal
  let modal = document.querySelector(".summary-modal");
  if (!modal) {
    modal = el("div", { className: "summary-modal" });

    const overlay = el("div", { className: "overlay", dataset: { close: "1" } });

    const panel = el("div", {
      className: "panel",
      role: "dialog",
      ariaModal: "true",
      ariaLabel: "Summary",
    });

    const header = document.createElement("header");
    const h3 = el("h3", { text: "Summary" });

    const actions = el("div", { className: "summary-actions" });
    const resetBtn = el("button", {
      className: "close-btn danger",
      type: "button",
      text: "Reset All",
      dataset: { reset: "1" },
    });

    const printBtn = el("button", {
      className: "close-btn",
      type: "button",
      text: "Print / PDF",
      dataset: { print: "1" },
    });

    const closeBtn = el("button", {
      className: "close-btn",
      type: "button",
      text: "Close",
      dataset: { close: "1" },
    });

    actions.appendChild(resetBtn);
    actions.appendChild(printBtn);
    actions.appendChild(closeBtn);

    header.appendChild(h3);
    header.appendChild(actions);

    const content = el("div", { className: "content" });

    // Table layout for Summary (print-friendly)
    const tableWrap = el("div", { className: "summary-table-wrap" });

    const table = el("table", { className: "summary-table" });
    table.innerHTML = `
      <thead>
        <tr>
          <th>Cell</th>
          <th>Type</th>
          <th>Entered</th>
          <th>Normal Range</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody class="summary-tbody"></tbody>
    `;

    tableWrap.appendChild(table);
    content.appendChild(tableWrap);

    panel.appendChild(header);
    panel.appendChild(content);

    modal.appendChild(overlay);
    modal.appendChild(panel);

    document.body.appendChild(modal);
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  function renderSummaryList() {
    const tbody = modal.querySelector(".summary-tbody");
    clearElement(tbody);

    const entries = Array.from(cellResults.entries());

    if (entries.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="5" style="color:#6b7280; padding:12px;">
          No entries yet. Enter values on the cards and press Determine to generate a summary.
        </td>
      `;
      tbody.appendChild(tr);
      return;
    }

    for (const [name, r] of entries) {
      const badgeClass = r.status || "na";
      const badgeLabel =
        badgeClass === "low" ? "Low" :
          badgeClass === "high" ? "High" :
            badgeClass === "normal" ? "Normal" : "N/A";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${escapeHtml(name)}</b></td>
        <td>${escapeHtml(r.typeLabel || "")}</td>
        <td>${escapeHtml(r.enteredText || "—")}</td>
        <td>${escapeHtml(r.normalText || "—")}</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      `;
      tbody.appendChild(tr);
    }
  }

  function openModal() {
    renderSummaryList();
    modal.classList.add("open");
  }

  function resetAll() {
    // clear stored results
    cellResults.clear();

    // clear UI on each card
    document.querySelectorAll(".cell-card").forEach((card) => {
      const input = card.querySelector("input");
      const result = card.querySelector(".diagnosis-result");
      if (input) input.value = "";
      if (result) {
        result.className = "diagnosis-result";
        result.style.display = "none";
        clearElement(result);
      }
    });

    renderSummaryList();
  }

  function printSummary() {
    renderSummaryList();         // ensure latest rows
    modal.classList.add("open"); // ensure visible for print
    window.print();
  }

  fab.addEventListener("click", openModal);

  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.close) closeModal();
    if (t.dataset.reset) resetAll();
    if (t.dataset.print) printSummary();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

/**
 * cellConfig example:
 * {
 *   name: "Neutrophil",
 *   imgSrc: "./img/Picture1.png",
 *   shortDescription: "....",
 *   reference: { min: 2000, max: 7500, unit: "cells/µL", lowText: "...", highText: "..." },
 *   percent:   { min: 40, max: 70, unit: "%", lowText: "...", highText: "..." }
 * }
 */
function addCellCard(cellConfig) {
  const { name, imgSrc, reference, percent, shortDescription } = cellConfig;

  const cardList = document.querySelector(".card-list");
  const cardCount = document.querySelectorAll(".cell-card").length + 1;

  const section = el("section", { className: "cell-card" });

  const infoDiv = el("div", { className: "cell-info" });
  const img = el("img", { src: imgSrc, alt: `${name} Image` });
  const h2 = el("h2", { text: name });

  infoDiv.appendChild(img);
  infoDiv.appendChild(h2);

  const form = el("form", { className: "cell-form", autocomplete: "off" });
  form.onsubmit = (e) => e.preventDefault();

  const unitLabel = el("label", { text: "Type" });

  const select = document.createElement("select");
  const optRef = el("option", { text: "Reference Value" });
  optRef.value = "reference";
  const optPct = el("option", { text: "Percentage" });
  optPct.value = "percent";
  select.appendChild(optRef);
  select.appendChild(optPct);

  const inputId = `value${name.replace(/\s+/g, "")}${cardCount}`;

  const inputLabel = el("label", { htmlFor: inputId, text: "Value" });

  const inlineRow = el("div", { className: "inline-row" });

  const input = el("input", {
    type: "text",
    inputMode: "decimal",
    id: inputId,
    name: inputId,
    placeholder: "Enter value",
  });

  const unitSpan = el("span", { className: "unit-span" });

  inlineRow.appendChild(input);
  inlineRow.appendChild(unitSpan);

  const button = el("button", { type: "button", text: "Determine" });

  const resultDiv = el("div", { className: "diagnosis-result" });
  resultDiv.style.display = "none";

  function getModeConfig() {
    return select.value === "reference" ? reference : percent;
  }

  function resetResult() {
    resultDiv.style.display = "none";
    resultDiv.className = "diagnosis-result";
    clearElement(resultDiv);
  }

  function appendAlwaysDescription() {
    if (!shortDescription) return;
    const always = el("div", { className: "always-desc", text: shortDescription });
    resultDiv.appendChild(always);
  }

  // Update label and units on select change
  select.addEventListener("change", function () {
    const cfg = getModeConfig();

    inputLabel.textContent = select.value === "reference" ? "Reference value" : "Percentage";
    unitSpan.textContent = cfg?.unit ? cfg.unit : "";
    input.placeholder = select.value === "reference" ? "e.g. 5000" : "e.g. 55";

    input.value = "";
    resetResult();
  });

  // Initialize
  select.dispatchEvent(new Event("change"));

  button.addEventListener("click", function () {
    const raw = input.value.trim();
    const val = parseFloat(raw);
    const cfg = getModeConfig();

    resetResult();

    // Invalid input
    if (Number.isNaN(val)) {
      resultDiv.style.display = "block";
      resultDiv.classList.add("diagnosis-fail");

      resultDiv.appendChild(el("div", { className: "title", text: "Invalid input" }));
      resultDiv.appendChild(el("div", { className: "desc", text: "Please enter a valid number." }));
      appendAlwaysDescription();

      cellResults.set(name, {
        status: "na",
        enteredText: "",
        typeLabel: select.value === "reference" ? "Reference" : "Percent",
        normalText: "",
      });
      return;
    }

    // No config
    if (!cfg || typeof cfg.min !== "number" || typeof cfg.max !== "number") {
      resultDiv.style.display = "block";
      resultDiv.classList.add("diagnosis-normal");

      resultDiv.appendChild(el("div", { className: "title", text: "No reference available" }));
      resultDiv.appendChild(
        el("div", { className: "desc", text: "This cell type doesn’t have ranges configured yet." })
      );
      appendAlwaysDescription();

      cellResults.set(name, {
        status: "na",
        enteredText: String(val),
        typeLabel: select.value === "reference" ? "Reference" : "Percent",
        normalText: "",
      });
      return;
    }

    const normalText = formatRange(cfg.min, cfg.max, cfg.unit || "");
    let statusClass = "diagnosis-normal";
    let titleText = `Normal ${name}`;
    let description =
      "Your result is within the expected range. Interpret alongside symptoms and other CBC values.";

    if (val < cfg.min) {
      statusClass = "diagnosis-low";
      titleText = `Low ${name}`;
      description =
        cfg.lowText ||
        "Low results can be seen with infections, medication effects, or bone marrow suppression. Consider clinical context.";
    } else if (val > cfg.max) {
      statusClass = "diagnosis-high";
      titleText = `High ${name}`;
      description =
        cfg.highText ||
        "High results can occur with inflammation, infection, or stress responses. Consider clinical context.";
    }

    const status =
      statusClass === "diagnosis-low" ? "low" :
        statusClass === "diagnosis-high" ? "high" :
          statusClass === "diagnosis-normal" ? "normal" : "na";

    cellResults.set(name, {
      status,
      enteredText: `${val}${cfg.unit ? " " + cfg.unit : ""}`,
      typeLabel: select.value === "reference" ? "Reference" : "Percent",
      normalText,
    });

    resultDiv.style.display = "block";
    resultDiv.classList.add(statusClass);

    resultDiv.appendChild(
      buildDiagnosisNodes({
        title: titleText,
        entered: val,
        unitLabel: cfg.unit || "",
        normalRangeText: normalText,
        description,
      })
    );

    appendAlwaysDescription();
  });

  form.appendChild(unitLabel);
  form.appendChild(select);
  form.appendChild(inputLabel);
  form.appendChild(inlineRow);
  form.appendChild(button);

  section.appendChild(infoDiv);
  section.appendChild(form);
  section.appendChild(resultDiv);
  cardList.appendChild(section);
}

/* Configure your cells here */
addCellCard({
  name: "Neutrophil",
  imgSrc: "./img/Picture1.png",
  shortDescription:
    'Left shift”: Increase in immature neutrophils (band cells), indicating active infection. Main role: First-line defense against bacteria (phagocytosis)',
  reference: {
    min: 2000,
    max: 7000,
    unit: "cells/µL",
    lowText:
      "Decrease in neutrophils, often caused by viral infections or bone marrow suppression (e.g., chemotherapy), leading to a higher risk of infection.",
    highText:
      "Increase in neutrophils, commonly due to bacterial infections, inflammation, trauma, stress, or leukemia.",
  },
  percent: {
    min: 50,
    max: 70,
    unit: "%",
    lowText:
      "Decrease in neutrophils, often caused by viral infections or bone marrow suppression (e.g., chemotherapy), leading to a higher risk of infection.",
    highText:
      "Increase in neutrophils, commonly due to bacterial infections, inflammation, trauma, stress, or leukemia.",
  },
});

addCellCard({
  name: "Eosinophil",
  imgSrc: "./img/Picture2.png",
  shortDescription: "Main role: Defense against parasites and involvement in allergic reactions",
  reference: {
    min: 50,
    max: 400,
    unit: "cells/µL",
    lowText: "Decrease in eosinophils, often associated with stress or corticosteroid use.",
    highText:
      "Increase in eosinophils, commonly due to parasitic infections (especially helminths), allergic conditions (e.g., asthma, hay fever), or some skin diseases.",
  },
  percent: {
    min: 20,
    max: 40,
    unit: "%",
    lowText: "Decrease in eosinophils, often associated with stress or corticosteroid use.",
    highText:
      "Increase in eosinophils, commonly due to parasitic infections (especially helminths), allergic conditions (e.g., asthma, hay fever), or some skin diseases.",
  },
});

addCellCard({
  name: "Basophil",
  imgSrc: "./img/Picture3.png",
  shortDescription: "Main role: Release histamine in allergic and inflammatory responses",
  reference: {
    min: 0,
    max: 100,
    unit: "cells/µL",
    lowText: "Decrease is rare and usually not clinically significant.",
    highText:
      "Increase in basophils, commonly seen in allergic reactions, chronic inflammation, or myeloproliferative disorders (e.g., leukemia).",
  },
  percent: {
    min: 0,
    max: 1,
    unit: "%",
    lowText: "Decrease is rare and usually not clinically significant.",
    highText:
      "Increase in basophils, commonly seen in allergic reactions, chronic inflammation, or myeloproliferative disorders (e.g., leukemia).",
  },
});

addCellCard({
  name: "Lymphocyte",
  imgSrc: "./img/Picture4.png",
  shortDescription: "Main role: Adaptive immunity (B cells and T cells)",
  reference: {
    min: 1000,
    max: 4000,
    unit: "cells/µL",
    lowText: "Decrease in lymphocytes, often caused by HIV/AIDS, immunodeficiency, or steroid therapy.",
    highText:
      "Increase in lymphocytes, commonly due to viral infections (e.g., infectious mononucleosis), chronic infections, or some leukemias.",
  },
  percent: {
    min: 20,
    max: 40,
    unit: "%",
    lowText: "Decrease in lymphocytes, often caused by HIV/AIDS, immunodeficiency, or steroid therapy.",
    highText:
      "Increase in lymphocytes, commonly due to viral infections (e.g., infectious mononucleosis), chronic infections, or some leukemias.",
  },
});

addCellCard({
  name: "Monocyte",
  imgSrc: "./img/Picture5.png",
  shortDescription: "Main role: Differentiate into macrophages; involved in phagocytosis and antigen presentation",
  reference: {
    min: 200,
    max: 800,
    unit: "cells/µL",
    lowText: "Decrease in monocytes, often associated with bone marrow suppression.",
    highText:
      "Increase in monocytes, commonly due to chronic infections (e.g., tuberculosis), autoimmune diseases, or recovery phase of acute infection.",
  },
  percent: {
    min: 2,
    max: 8,
    unit: "%",
    lowText: "Decrease in monocytes, often associated with bone marrow suppression.",
    highText:
      "Increase in monocytes, commonly due to chronic infections (e.g., tuberculosis), autoimmune diseases, or recovery phase of acute infection.",
  },
});

ensureSummaryUI();

const FEEDBACK_TO_EMAIL = "youremail@example.com";

const feedbackForm = document.getElementById("feedbackForm");
if (feedbackForm) {
  feedbackForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("fbName")?.value?.trim() || "";
    const subject = document.getElementById("fbSubject")?.value?.trim() || "Feedback";
    const message = document.getElementById("fbMessage")?.value?.trim() || "";

    const bodyLines = [
      message,
      "",
      "----",
      name ? `From: ${name}` : "",
      `Page: ${location.href}`,
      `Date: ${new Date().toLocaleString()}`
    ].filter(Boolean);

    const mailto = `mailto:${encodeURIComponent(FEEDBACK_TO_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = mailto;
  });
}