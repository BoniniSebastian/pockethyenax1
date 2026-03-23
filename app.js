import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const cardsEl = document.getElementById("cards");
const logEl = document.getElementById("log");
const callsTodayEl = document.getElementById("callsToday");
const answersTodayEl = document.getElementById("answersToday");
const analysisSummaryEl = document.getElementById("analysisSummary");
const tenDaysWrapEl = document.getElementById("tenDaysWrap");
const toggleTenDaysBtn = document.getElementById("toggleTenDaysBtn");
const refreshBtn = document.getElementById("refreshBtn");

const toolChips = [...document.querySelectorAll(".toolChip")];
const panelBlocks = [...document.querySelectorAll(".panelBlock")];

const filterButtons = [...document.querySelectorAll(".filterButton")];

const bottomSheet = document.getElementById("bottomSheet");
const sheetOverlay = document.getElementById("sheetOverlay");
const closeSheetBtn = document.getElementById("closeSheetBtn");

const sheetImportantInfo = document.getElementById("sheetImportantInfo");
const sheetName = document.getElementById("sheetName");
const sheetStatus = document.getElementById("sheetStatus");

const sheetNameInput = document.getElementById("sheetNameInput");
const sheetPhoneInput = document.getElementById("sheetPhoneInput");
const sheetEmailInput = document.getElementById("sheetEmailInput");
const sheetVnrInput = document.getElementById("sheetVnrInput");
const sheetLinkInput = document.getElementById("sheetLinkInput");
const sheetImportantInfoInput = document.getElementById("sheetImportantInfoInput");
const sheetStatusInput = document.getElementById("sheetStatusInput");
const sheetNotesInput = document.getElementById("sheetNotesInput");

const saveContactInfoBtn = document.getElementById("saveContactInfoBtn");
const saveNotesBtn = document.getElementById("saveNotesBtn");
const mailCrmBtn = document.getElementById("mailCrmBtn");
const sheetPhoneLink = document.getElementById("sheetPhoneLink");
const sheetOpenLink = document.getElementById("sheetOpenLink");
const outcomeGrid = document.getElementById("outcomeGrid");

const cardForm = document.getElementById("cardForm");
const cardFormId = document.getElementById("cardFormId");
const formName = document.getElementById("formName");
const formPhone = document.getElementById("formPhone");
const formEmail = document.getElementById("formEmail");
const formVnr = document.getElementById("formVnr");
const formLink = document.getElementById("formLink");
const formStatus = document.getElementById("formStatus");
const formImportantInfo = document.getElementById("formImportantInfo");
const formNotes = document.getElementById("formNotes");
const resetCardFormBtn = document.getElementById("resetCardFormBtn");
const manageList = document.getElementById("manageList");

const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const importJsonInput = document.getElementById("importJsonInput");

const surpriseBtn = document.getElementById("surpriseBtn");
const surpriseCard = document.getElementById("surpriseCard");

let cardsCache = [];
let logCache = [];
let currentCardId = null;
let currentFilter = "all";
let tenDaysVisible = false;

const LOG_OUTCOMES = [
  "Svarade",
  "Inget svar",
  "Upptaget",
  "Återkom senare",
  "Fel nummer",
  "Bokat möte",
  "Skicka mail"
];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeCard(raw = {}, id = "") {
  return {
    id,
    name: raw.name || "",
    phone: raw.phone || "",
    email: raw.email || "",
    vnr: raw.vnr || "",
    link: raw.link || "",
    status: raw.status || "",
    importantInfo: raw.importantInfo || "",
    notes: raw.notes || "",
    updatedAt: raw.updatedAt || "",
    createdAt: raw.createdAt || ""
  };
}

function normalizeLog(raw = {}, id = "") {
  return {
    id,
    cardId: raw.cardId || "",
    name: raw.name || "",
    outcome: raw.outcome || "Ringd",
    time: raw.time || new Date().toISOString()
  };
}

function formatDateTime(dateString) {
  const d = new Date(dateString);
  return d.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateShort(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("sv-SE", {
    month: "2-digit",
    day: "2-digit"
  });
}

function getDateKey(dateString) {
  const d = new Date(dateString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDateKey(dateString, key) {
  return getDateKey(dateString) === key;
}

function getTodayKey() {
  return getDateKey(new Date().toISOString());
}

function getRelativeDayKey(offsetDays = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return getDateKey(d.toISOString());
}

function getRelativeDayLabel(offsetDays = 0) {
  if (offsetDays === 0) return "Idag";
  if (offsetDays === 1) return "Igår";
  if (offsetDays === 2) return "Förrgår";
  return formatDateShort(getRelativeDayKey(offsetDays));
}

function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setActivePanel(panelId) {
  toolChips.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.panelTarget === panelId);
  });

  panelBlocks.forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== panelId);
    panel.classList.toggle("active", panel.id === panelId);
  });
}

function setFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderCards();
}

function getFilteredCards() {
  let list = [...cardsCache];

  if (currentFilter === "unprospected") {
    list = list.filter(card => (card.status || "").trim().toLowerCase() === "ej prospekterad");
  }

  list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "sv"));
  return list;
}

function renderCards() {
  const filtered = getFilteredCards();

  if (!filtered.length) {
    cardsEl.innerHTML = `
      <div class="emptyState">
        Inga kort att visa här ännu.
      </div>
    `;
    return;
  }

  cardsEl.innerHTML = filtered.map(card => {
    const importantInfoHtml = card.importantInfo
      ? `<div class="cardInfoLine">${escapeHtml(card.importantInfo)}</div>`
      : "";

    const linkHtml = card.link
      ? `<a class="cardLink" href="${escapeHtml(card.link)}" target="_blank" rel="noopener noreferrer">Öppna länk</a>`
      : "";

    const phoneHtml = card.phone
      ? `<a class="cardLink" href="tel:${escapeHtml(card.phone)}">${escapeHtml(card.phone)}</a>`
      : "";

    const statusHtml = card.status
      ? `<div class="cardStatus">${escapeHtml(card.status)}</div>`
      : `<div class="cardStatus"></div>`;

    return `
      <article class="card" data-card-id="${escapeHtml(card.id)}">
        <div class="cardTop">
          <div class="cardText">
            ${importantInfoHtml}
            <div class="cardName">${escapeHtml(card.name || "Namnlös kontakt")}</div>
            <div class="cardLinks">
              ${linkHtml}
              ${phoneHtml}
            </div>
            ${statusHtml}
          </div>
          <div class="cardBulb">💡</div>
        </div>
      </article>
    `;
  }).join("");
}

function renderLog() {
  if (!logCache.length) {
    logEl.innerHTML = `
      <div class="emptyState">
        Ingen logg ännu.
      </div>
    `;
    return;
  }

  logEl.innerHTML = logCache.map(item => `
    <article class="logItem">
      <div>
        <div class="logName">${escapeHtml(item.name || "Okänd kontakt")}</div>
        <span class="logMeta">${escapeHtml(item.outcome)} • ${formatDateTime(item.time)}</span>
      </div>
      <button class="deleteLogBtn" data-log-id="${escapeHtml(item.id)}" title="Ta bort loggrad">✕</button>
    </article>
  `).join("");
}

function updateStats() {
  const todayKey = getTodayKey();
  const todaysLogs = logCache.filter(item => isSameDateKey(item.time, todayKey));
  const todaysAnswers = todaysLogs.filter(item => item.outcome === "Svarade");

  callsTodayEl.textContent = String(todaysLogs.length);
  answersTodayEl.textContent = String(todaysAnswers.length);
}

function getStatsForDateKey(key) {
  const dayLogs = logCache.filter(item => isSameDateKey(item.time, key));
  const answers = dayLogs.filter(item => item.outcome === "Svarade").length;

  return {
    calls: dayLogs.length,
    answers
  };
}

function renderAnalysis() {
  const summaryOffsets = [0, 1, 2];

  analysisSummaryEl.innerHTML = summaryOffsets.map(offset => {
    const key = getRelativeDayKey(offset);
    const stats = getStatsForDateKey(key);

    return `
      <article class="dayCard">
        <div class="dayLabel">${getRelativeDayLabel(offset)}</div>
        <div class="dayStats">
          <span>Samtal: <strong>${stats.calls}</strong></span>
          <span>Svar: <strong>${stats.answers}</strong></span>
        </div>
      </article>
    `;
  }).join("");

  const days = [];
  for (let i = 0; i < 10; i += 1) {
    const key = getRelativeDayKey(i);
    const stats = getStatsForDateKey(key);
    days.push({
      label: i === 0 ? "Idag" : i === 1 ? "Igår" : formatDateShort(key),
      key,
      ...stats
    });
  }

  tenDaysWrapEl.innerHTML = days.map(day => `
    <div class="tenDayRow">
      <div>
        <div>${day.label}</div>
        <div class="tenDayMeta">${day.key}</div>
      </div>
      <div>Samtal: <strong>${day.calls}</strong> • Svar: <strong>${day.answers}</strong></div>
    </div>
  `).join("");

  tenDaysWrapEl.classList.toggle("hidden", !tenDaysVisible);
  toggleTenDaysBtn.textContent = tenDaysVisible ? "Dölj 10 dagar" : "Visa 10 dagar";
}

function renderManageList() {
  if (!cardsCache.length) {
    manageList.innerHTML = `<div class="emptyState">Inga kort ännu.</div>`;
    return;
  }

  const sorted = [...cardsCache].sort((a, b) => (a.name || "").localeCompare(b.name || "", "sv"));

  manageList.innerHTML = sorted.map(card => `
    <article class="manageCard">
      <div>
        <div class="manageCardName">${escapeHtml(card.name || "Namnlös kontakt")}</div>
        <div class="manageCardMeta">${escapeHtml(card.phone || "Inget nummer")} • ${escapeHtml(card.status || "Ingen status")}</div>
      </div>
      <div class="manageCardActions">
        <button class="smallGhostButton" data-edit-card-id="${escapeHtml(card.id)}" title="Redigera">✎</button>
        <button class="smallDangerButton" data-delete-card-id="${escapeHtml(card.id)}" title="Ta bort">✕</button>
      </div>
    </article>
  `).join("");
}

function renderSurpriseCard() {
  surpriseCard.textContent = "Tryck på knappen nedan för att få ett slumpat kort.";
}

function populateCardForm(card = null) {
  if (!card) {
    cardFormId.value = "";
    formName.value = "";
    formPhone.value = "";
    formEmail.value = "";
    formVnr.value = "";
    formLink.value = "";
    formStatus.value = "";
    formImportantInfo.value = "";
    formNotes.value = "";
    return;
  }

  cardFormId.value = card.id;
  formName.value = card.name || "";
  formPhone.value = card.phone || "";
  formEmail.value = card.email || "";
  formVnr.value = card.vnr || "";
  formLink.value = card.link || "";
  formStatus.value = card.status || "";
  formImportantInfo.value = card.importantInfo || "";
  formNotes.value = card.notes || "";
}

function openBottomSheet(cardId) {
  const card = cardsCache.find(item => item.id === cardId);
  if (!card) return;

  currentCardId = cardId;

  sheetImportantInfo.textContent = card.importantInfo || "";
  sheetName.textContent = card.name || "Namnlös kontakt";
  sheetStatus.textContent = card.status || "";

  sheetNameInput.value = card.name || "";
  sheetPhoneInput.value = card.phone || "";
  sheetEmailInput.value = card.email || "";
  sheetVnrInput.value = card.vnr || "";
  sheetLinkInput.value = card.link || "";
  sheetImportantInfoInput.value = card.importantInfo || "";
  sheetStatusInput.value = card.status || "";
  sheetNotesInput.value = card.notes || "";

  if (card.phone) {
    sheetPhoneLink.href = `tel:${card.phone}`;
    sheetPhoneLink.classList.remove("hidden");
  } else {
    sheetPhoneLink.href = "#";
    sheetPhoneLink.classList.add("hidden");
  }

  if (card.link) {
    sheetOpenLink.href = card.link;
    sheetOpenLink.classList.remove("hidden");
  } else {
    sheetOpenLink.href = "#";
    sheetOpenLink.classList.add("hidden");
  }

  bottomSheet.classList.add("open");
  sheetOverlay.classList.add("open");
  bottomSheet.setAttribute("aria-hidden", "false");
}

function closeBottomSheet() {
  bottomSheet.classList.remove("open");
  sheetOverlay.classList.remove("open");
  bottomSheet.setAttribute("aria-hidden", "true");
  currentCardId = null;
}

function getCurrentCard() {
  return cardsCache.find(item => item.id === currentCardId) || null;
}

async function loadCards() {
  const snapshot = await getDocs(collection(db, "cards"));
  cardsCache = snapshot.docs.map(item => normalizeCard(item.data(), item.id));
  renderCards();
  renderManageList();
}

async function loadLog() {
  const q = query(collection(db, "log"), orderBy("time", "desc"), limit(200));
  const snapshot = await getDocs(q);
  logCache = snapshot.docs.map(item => normalizeLog(item.data(), item.id));
  renderLog();
  updateStats();
  renderAnalysis();
}

async function refreshAll() {
  await Promise.all([loadCards(), loadLog()]);
}

async function createLog(card, outcome) {
  await addDoc(collection(db, "log"), {
    cardId: card.id,
    name: card.name || "Namnlös kontakt",
    outcome,
    time: new Date().toISOString()
  });

  await loadLog();
}

async function deleteLogEntry(logId) {
  await deleteDoc(doc(db, "log", logId));
  await loadLog();
}

async function saveCurrentCardInfo() {
  const card = getCurrentCard();
  if (!card) return;

  const updated = {
    name: sheetNameInput.value.trim(),
    phone: sheetPhoneInput.value.trim(),
    email: sheetEmailInput.value.trim(),
    vnr: sheetVnrInput.value.trim(),
    link: sheetLinkInput.value.trim(),
    importantInfo: sheetImportantInfoInput.value.trim(),
    status: sheetStatusInput.value.trim(),
    notes: sheetNotesInput.value.trim(),
    updatedAt: new Date().toISOString()
  };

  await updateDoc(doc(db, "cards", card.id), updated);
  await loadCards();
  openBottomSheet(card.id);
}

async function saveCurrentNotes() {
  const card = getCurrentCard();
  if (!card) return;

  await updateDoc(doc(db, "cards", card.id), {
    notes: sheetNotesInput.value.trim(),
    updatedAt: new Date().toISOString()
  });

  await loadCards();
  openBottomSheet(card.id);
}

function openMailToCrm() {
  const card = getCurrentCard();
  if (!card) return;

  const subject = encodeURIComponent(`CRM - ${card.name || "Kontakt"}`);
  const body = encodeURIComponent(
`Kontakt: ${card.name || ""}
Telefon: ${card.phone || ""}
E-post: ${card.email || ""}
VNR: ${card.vnr || ""}
Länk: ${card.link || ""}

Anteckningar:
${sheetNotesInput.value.trim()}`
  );

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

async function saveCardFromManageForm(event) {
  event.preventDefault();

  const payload = {
    name: formName.value.trim(),
    phone: formPhone.value.trim(),
    email: formEmail.value.trim(),
    vnr: formVnr.value.trim(),
    link: formLink.value.trim(),
    status: formStatus.value.trim(),
    importantInfo: formImportantInfo.value.trim(),
    notes: formNotes.value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (!payload.name) {
    alert("Namn behövs.");
    return;
  }

  if (cardFormId.value) {
    await updateDoc(doc(db, "cards", cardFormId.value), payload);
  } else {
    const createdAt = new Date().toISOString();
    await addDoc(collection(db, "cards"), {
      ...payload,
      createdAt
    });
  }

  populateCardForm(null);
  await loadCards();
}

async function deleteCard(cardId) {
  const confirmed = window.confirm("Ta bort detta kort?");
  if (!confirmed) return;

  await deleteDoc(doc(db, "cards", cardId));
  await loadCards();
}

async function handleJsonImport(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (Array.isArray(parsed.cards)) {
    for (const card of parsed.cards) {
      const ref = card.id ? doc(db, "cards", card.id) : doc(collection(db, "cards"));
      const cleanCard = normalizeCard(card, card.id || ref.id);
      await setDoc(ref, {
        name: cleanCard.name,
        phone: cleanCard.phone,
        email: cleanCard.email,
        vnr: cleanCard.vnr,
        link: cleanCard.link,
        status: cleanCard.status,
        importantInfo: cleanCard.importantInfo,
        notes: cleanCard.notes,
        updatedAt: cleanCard.updatedAt || new Date().toISOString(),
        createdAt: cleanCard.createdAt || new Date().toISOString()
      });
    }
  }

  if (Array.isArray(parsed.log)) {
    for (const item of parsed.log) {
      const ref = item.id ? doc(db, "log", item.id) : doc(collection(db, "log"));
      const cleanLog = normalizeLog(item, item.id || ref.id);
      await setDoc(ref, {
        cardId: cleanLog.cardId,
        name: cleanLog.name,
        outcome: cleanLog.outcome,
        time: cleanLog.time
      });
    }
  }

  await refreshAll();
}

function exportJsonBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    cards: cardsCache,
    log: logCache
  };

  downloadTextFile(
    `phx1-backup-${getTodayKey()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
}

function exportLogCsv() {
  const header = ["name", "outcome", "time", "cardId"];
  const rows = logCache.map(item => [
    item.name || "",
    item.outcome || "",
    item.time || "",
    item.cardId || ""
  ]);

  const csv = [
    header.join(","),
    ...rows.map(row =>
      row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")
    )
  ].join("\n");

  downloadTextFile(`phx1-logg-${getTodayKey()}.csv`, csv, "text/csv;charset=utf-8");
}

function handleSurprise() {
  if (!cardsCache.length) {
    surpriseCard.textContent = "Det finns inga kort ännu.";
    return;
  }

  const random = cardsCache[Math.floor(Math.random() * cardsCache.length)];
  surpriseCard.innerHTML = `
    <strong>${escapeHtml(random.name || "Namnlös kontakt")}</strong><br>
    <span class="miniText">${escapeHtml(random.phone || "Inget nummer")}</span><br>
    <span class="miniText">${escapeHtml(random.importantInfo || random.status || "Ingen extra info")}</span>
  `;
}

function bindAccordion() {
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-accordion-toggle]");
    if (!toggle) return;

    const targetId = toggle.dataset.accordionToggle;
    const body = document.getElementById(targetId);
    if (!body) return;

    body.classList.toggle("open");
  });
}

function bindEvents() {
  toolChips.forEach(btn => {
    btn.addEventListener("click", () => {
      setActivePanel(btn.dataset.panelTarget);
    });
  });

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      setFilter(btn.dataset.filter);
    });
  });

  cardsEl.addEventListener("click", (event) => {
    const cardEl = event.target.closest(".card");
    if (!cardEl) return;

    const cardId = cardEl.dataset.cardId;
    openBottomSheet(cardId);
  });

  logEl.addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest("[data-log-id]");
    if (!deleteBtn) return;

    await deleteLogEntry(deleteBtn.dataset.logId);
  });

  closeSheetBtn.addEventListener("click", closeBottomSheet);
  sheetOverlay.addEventListener("click", closeBottomSheet);

  saveContactInfoBtn.addEventListener("click", saveCurrentCardInfo);
  saveNotesBtn.addEventListener("click", saveCurrentNotes);
  mailCrmBtn.addEventListener("click", openMailToCrm);

  outcomeGrid.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-outcome]");
    if (!btn) return;

    const card = getCurrentCard();
    if (!card) return;

    const outcome = btn.dataset.outcome;
    await createLog(card, outcome);

    if (outcome === "Skicka mail") {
      openMailToCrm();
    }

    if (outcome === "Bokat möte") {
      await updateDoc(doc(db, "cards", card.id), {
        status: "Bokat möte",
        updatedAt: new Date().toISOString()
      });
      await loadCards();
      openBottomSheet(card.id);
    }
  });

  cardForm.addEventListener("submit", saveCardFromManageForm);

  resetCardFormBtn.addEventListener("click", () => {
    populateCardForm(null);
  });

  manageList.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("[data-edit-card-id]");
    const deleteBtn = event.target.closest("[data-delete-card-id]");

    if (editBtn) {
      const card = cardsCache.find(item => item.id === editBtn.dataset.editCardId);
      if (card) {
        populateCardForm(card);
        setActivePanel("managePanel");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (deleteBtn) {
      await deleteCard(deleteBtn.dataset.deleteCardId);
    }
  });

  toggleTenDaysBtn.addEventListener("click", () => {
    tenDaysVisible = !tenDaysVisible;
    renderAnalysis();
  });

  exportJsonBtn.addEventListener("click", exportJsonBackup);
  exportCsvBtn.addEventListener("click", exportLogCsv);

  importJsonInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await handleJsonImport(file);
      alert("Import klar.");
      importJsonInput.value = "";
    } catch (error) {
      console.error(error);
      alert("Import misslyckades.");
    }
  });

  surpriseBtn.addEventListener("click", handleSurprise);
  refreshBtn.addEventListener("click", refreshAll);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBottomSheet();
    }
  });

  bindAccordion();
}

async function init() {
  try {
    renderSurpriseCard();
    setActivePanel("analysisPanel");
    setFilter("all");
    await refreshAll();
    bindEvents();
  } catch (error) {
    console.error(error);
    cardsEl.innerHTML = `
      <div class="emptyState">
        Kunde inte läsa från Firebase. Kontrollera att Firestore är igång och att reglerna fortfarande tillåter läsning/skrivning.
      </div>
    `;
  }
}

init();
