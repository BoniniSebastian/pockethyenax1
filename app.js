import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const cardsEl = document.getElementById("cards");
const callsTodayEl = document.getElementById("callsToday");
const answersTodayEl = document.getElementById("answersToday");

const refreshBtn = document.getElementById("refreshBtn");

const toolChips = [...document.querySelectorAll(".toolChip")];
const panelBlocks = [...document.querySelectorAll(".panelBlock")];

const filterButtons = [...document.querySelectorAll(".filterButton")];

const analysisDaysEl = document.getElementById("analysisDays");
const analysisTenDaysEl = document.getElementById("analysisTenDays");
const analysisDetailEl = document.getElementById("analysisDetail");
const analysisDetailTitleEl = document.getElementById("analysisDetailTitle");
const analysisDetailListEl = document.getElementById("analysisDetailList");
const toggleTenDaysBtn = document.getElementById("toggleTenDaysBtn");

const cardForm = document.getElementById("cardForm");
const cardFormId = document.getElementById("cardFormId");
const formName = document.getElementById("formName");
const formContactPerson = document.getElementById("formContactPerson");
const formPhone = document.getElementById("formPhone");
const formEmail = document.getElementById("formEmail");
const formVnr = document.getElementById("formVnr");
const formLink = document.getElementById("formLink");
const formStatus = document.getElementById("formStatus");
const formImportantInfo = document.getElementById("formImportantInfo");
const formNotes = document.getElementById("formNotes");
const resetCardFormBtn = document.getElementById("resetCardFormBtn");
const manageList = document.getElementById("manageList");

const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const importExcelInput = document.getElementById("importExcelInput");

const generalNoteInput = document.getElementById("generalNoteInput");
const saveGeneralNoteBtn = document.getElementById("saveGeneralNoteBtn");
const copyGeneralNoteBtn = document.getElementById("copyGeneralNoteBtn");

const bottomSheet = document.getElementById("bottomSheet");
const sheetOverlay = document.getElementById("sheetOverlay");
const closeSheetBtn = document.getElementById("closeSheetBtn");

const sheetImportantInfo = document.getElementById("sheetImportantInfo");
const sheetName = document.getElementById("sheetName");
const sheetContactPreview = document.getElementById("sheetContactPreview");
const sheetStatus = document.getElementById("sheetStatus");

const sheetNameInput = document.getElementById("sheetNameInput");
const sheetContactPersonInput = document.getElementById("sheetContactPersonInput");
const sheetPhoneInput = document.getElementById("sheetPhoneInput");
const sheetEmailInput = document.getElementById("sheetEmailInput");
const sheetVnrInput = document.getElementById("sheetVnrInput");
const sheetLinkInput = document.getElementById("sheetLinkInput");
const sheetImportantInfoInput = document.getElementById("sheetImportantInfoInput");
const sheetStatusInput = document.getElementById("sheetStatusInput");
const sheetNotesInput = document.getElementById("sheetNotesInput");

const sheetPhoneLink = document.getElementById("sheetPhoneLink");
const sheetOpenLink = document.getElementById("sheetOpenLink");

const saveContactInfoBtn = document.getElementById("saveContactInfoBtn");
const saveNotesBtn = document.getElementById("saveNotesBtn");
const mailCrmBtn = document.getElementById("mailCrmBtn");
const markProspectedBtn = document.getElementById("markProspectedBtn");

const startLogCallBtn = document.getElementById("startLogCallBtn");
const callStepPrimary = document.getElementById("callStepPrimary");
const callStepSecondary = document.getElementById("callStepSecondary");

const customerLogList = document.getElementById("customerLogList");

const sheetGeneralNoteInput = document.getElementById("sheetGeneralNoteInput");
const saveGeneralNoteFromCardBtn = document.getElementById("saveGeneralNoteFromCardBtn");
const copyGeneralNoteFromCardBtn = document.getElementById("copyGeneralNoteFromCardBtn");
const openGeneralNoteFromCardBtn = document.getElementById("openGeneralNoteFromCardBtn");

let cardsCache = [];
let logCache = [];
let generalNoteCache = "";
let currentCardId = null;
let currentFilter = "all";
let tenDaysVisible = false;
let selectedPrimaryOutcome = null;
let selectedSecondaryOutcome = null;

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
    contactPerson: raw.contactPerson || "",
    phone: raw.phone || "",
    email: raw.email || "",
    vnr: raw.vnr || "",
    link: raw.link || "",
    status: raw.status || "",
    importantInfo: raw.importantInfo || "",
    notes: raw.notes || "",
    highlighted: !!raw.highlighted,
    updatedAt: raw.updatedAt || "",
    createdAt: raw.createdAt || ""
  };
}

function normalizeLog(raw = {}, id = "") {
  return {
    id,
    cardId: raw.cardId || "",
    name: raw.name || "",
    outcome: raw.outcome || "",
    time: raw.time || new Date().toISOString()
  };
}

function getNotesPreview(notes = "") {
  const firstLine = String(notes).split("\n").find(line => line.trim());
  return firstLine ? firstLine.trim() : "";
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

function formatDateOnly(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function formatShortDate(dateString) {
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

function getTodayKey() {
  return getDateKey(new Date().toISOString());
}

function isSameDateKey(dateString, key) {
  return getDateKey(dateString) === key;
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
  return formatShortDate(getRelativeDayKey(offsetDays));
}

function getCurrentCard() {
  return cardsCache.find(card => card.id === currentCardId) || null;
}

function setActivePanel(panelId = null) {
  toolChips.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.panelTarget === panelId);
  });

  panelBlocks.forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== panelId);
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

  if (currentFilter === "prospected") {
    list = list.filter(card => (card.status || "").trim().toLowerCase() === "prospekterad");
  }

  list.sort((a, b) => {
    if (a.highlighted && !b.highlighted) return -1;
    if (!a.highlighted && b.highlighted) return 1;
    return (a.name || "").localeCompare(b.name || "", "sv");
  });

  return list;
}

function renderCards() {
  const list = getFilteredCards();

  if (!list.length) {
    cardsEl.innerHTML = `
      <div class="emptyState">
        Inga säljkort att visa.
      </div>
    `;
    return;
  }

  cardsEl.innerHTML = list.map(card => {
    const importantInfoHtml = card.importantInfo
      ? `<div class="cardInfoLine">${escapeHtml(card.importantInfo)}</div>`
      : `<div class="cardInfoLine"></div>`;

    const notePreview = getNotesPreview(card.notes) || "";
    const contactPreview = card.contactPerson || "Kontakt saknas";

    const linkHtml = card.link
      ? `<a class="cardLink" href="${escapeHtml(card.link)}" target="_blank" rel="noopener noreferrer">Öppna länk</a>`
      : "";

    const phoneHtml = card.phone
      ? `<a class="cardLink" href="tel:${escapeHtml(card.phone)}">${escapeHtml(card.phone)}</a>`
      : "";

    return `
      <article class="card ${card.highlighted ? "highlighted" : ""}" data-card-id="${escapeHtml(card.id)}">
        ${importantInfoHtml}
        <div class="cardTopRow">
          <div class="cardName">${escapeHtml(card.name || "Namnlös organisation")}</div>
          <button class="cardBulbButton" data-highlight-id="${escapeHtml(card.id)}" title="Highlighta">💡</button>
        </div>

        <div class="cardContactPerson">${escapeHtml(contactPreview)}</div>
        <div class="cardNotePreview">${escapeHtml(notePreview || "Ingen anteckning ännu")}</div>

        <div class="cardLinks">
          ${linkHtml}
          ${phoneHtml}
        </div>

        <div class="cardBottomRow">
          <div class="cardStatus">${escapeHtml(card.status || "")}</div>
          <button class="cardQuickAction" data-prospect-id="${escapeHtml(card.id)}">Prospekterad</button>
        </div>
      </article>
    `;
  }).join("");
}

function updateStats() {
  const todayKey = getTodayKey();
  const todaysLogs = logCache.filter(item => isSameDateKey(item.time, todayKey));
  const todaysAnswers = todaysLogs.filter(item => {
    const outcome = (item.outcome || "").trim().toLowerCase();
    return outcome === "svarade" || outcome === "bokat möte" || outcome === "ej intresserad";
  });

  callsTodayEl.textContent = String(todaysLogs.length);
  answersTodayEl.textContent = String(todaysAnswers.length);
}

function getStatsForDateKey(key) {
  const dayLogs = logCache.filter(item => isSameDateKey(item.time, key));
  const answers = dayLogs.filter(item => {
    const outcome = (item.outcome || "").trim().toLowerCase();
    return outcome === "svarade" || outcome === "bokat möte" || outcome === "ej intresserad";
  }).length;

  return {
    calls: dayLogs.length,
    answers
  };
}

function renderAnalysisDays() {
  const offsets = [0, 1, 2];

  analysisDaysEl.innerHTML = offsets.map(offset => {
    const key = getRelativeDayKey(offset);
    const stats = getStatsForDateKey(key);

    return `
      <button class="dayCard" data-analysis-day="${escapeHtml(key)}">
        <div class="dayLabel">${getRelativeDayLabel(offset)}</div>
        <div class="dayStats">
          <span>Samtal: <strong>${stats.calls}</strong></span>
          <span>Svar: <strong>${stats.answers}</strong></span>
        </div>
      </button>
    `;
  }).join("");

  const rows = [];
  for (let i = 0; i < 10; i += 1) {
    const key = getRelativeDayKey(i);
    const stats = getStatsForDateKey(key);

    rows.push(`
      <button class="tenDayRow" data-analysis-day="${escapeHtml(key)}">
        <div>${i === 0 ? "Idag" : i === 1 ? "Igår" : formatShortDate(key)}</div>
        <div>Samtal: <strong>${stats.calls}</strong> • Svar: <strong>${stats.answers}</strong></div>
      </button>
    `);
  }

  analysisTenDaysEl.innerHTML = rows.join("");
  analysisTenDaysEl.classList.toggle("hidden", !tenDaysVisible);
  toggleTenDaysBtn.textContent = tenDaysVisible ? "Dölj 10 dagar" : "Visa 10 dagar";
}

function renderAnalysisDetail(dayKey) {
  const dayLogs = logCache.filter(item => isSameDateKey(item.time, dayKey));

  analysisDetailEl.classList.remove("hidden");
  analysisDetailTitleEl.textContent = `Logg ${dayKey}`;

  if (!dayLogs.length) {
    analysisDetailListEl.innerHTML = `<div class="emptyState">Ingen logg för denna dag.</div>`;
    return;
  }

  analysisDetailListEl.innerHTML = dayLogs.map(item => `
    <article class="analysisLogItem">
      <div>
        <div class="analysisLogName">${escapeHtml(item.name || "Okänd kund")}</div>
        <div class="analysisLogMeta">${escapeHtml(formatDateTime(item.time))} • ${escapeHtml(item.outcome)}</div>
      </div>
    </article>
  `).join("");
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
        <div class="manageCardName">${escapeHtml(card.name || "Namnlös organisation")}</div>
        <div class="manageCardMeta">${escapeHtml(card.contactPerson || "Kontakt saknas")} • ${escapeHtml(card.status || "Ingen status")}</div>
      </div>

      <div class="rowActions">
        <button class="smallGhostButton" data-edit-card-id="${escapeHtml(card.id)}" title="Redigera">✎</button>
        <button class="smallDangerButton" data-delete-card-id="${escapeHtml(card.id)}" title="Ta bort">✕</button>
      </div>
    </article>
  `).join("");
}

function resetCardForm() {
  cardFormId.value = "";
  formName.value = "";
  formContactPerson.value = "";
  formPhone.value = "";
  formEmail.value = "";
  formVnr.value = "";
  formLink.value = "";
  formStatus.value = "";
  formImportantInfo.value = "";
  formNotes.value = "";
}

function populateCardForm(card) {
  cardFormId.value = card.id || "";
  formName.value = card.name || "";
  formContactPerson.value = card.contactPerson || "";
  formPhone.value = card.phone || "";
  formEmail.value = card.email || "";
  formVnr.value = card.vnr || "";
  formLink.value = card.link || "";
  formStatus.value = card.status || "";
  formImportantInfo.value = card.importantInfo || "";
  formNotes.value = card.notes || "";
}

function renderCustomerLog(cardId) {
  const items = logCache
    .filter(item => item.cardId === cardId)
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  if (!items.length) {
    customerLogList.innerHTML = `<div class="emptyState">Ingen logg på kunden ännu.</div>`;
    return;
  }

  customerLogList.innerHTML = items.map(item => `
    <article class="customerLogItem">
      <div>
        <div class="customerLogTitle">${escapeHtml(item.outcome)}</div>
        <div class="customerLogMeta">${escapeHtml(formatDateTime(item.time))}</div>
      </div>
      <button class="smallDangerButton" data-delete-log-id="${escapeHtml(item.id)}" title="Ta bort loggrad">✕</button>
    </article>
  `).join("");
}

function openBottomSheet(cardId) {
  const card = cardsCache.find(item => item.id === cardId);
  if (!card) return;

  currentCardId = card.id;

  sheetImportantInfo.textContent = card.importantInfo || "";
  sheetName.textContent = card.name || "Namnlös organisation";
  sheetContactPreview.textContent = card.contactPerson || "Kontakt saknas";
  sheetStatus.textContent = card.status || "";

  sheetNameInput.value = card.name || "";
  sheetContactPersonInput.value = card.contactPerson || "";
  sheetPhoneInput.value = card.phone || "";
  sheetEmailInput.value = card.email || "";
  sheetVnrInput.value = card.vnr || "";
  sheetLinkInput.value = card.link || "";
  sheetImportantInfoInput.value = card.importantInfo || "";
  sheetStatusInput.value = card.status || "";
  sheetNotesInput.value = card.notes || "";

  sheetGeneralNoteInput.value = generalNoteCache || "";

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

  resetCallLogFlow();
  renderCustomerLog(card.id);

  bottomSheet.classList.add("open");
  sheetOverlay.classList.add("open");
  bottomSheet.setAttribute("aria-hidden", "false");
}

function closeBottomSheet() {
  bottomSheet.classList.remove("open");
  sheetOverlay.classList.remove("open");
  bottomSheet.setAttribute("aria-hidden", "true");
  currentCardId = null;
  resetCallLogFlow();
}

function resetCallLogFlow() {
  selectedPrimaryOutcome = null;
  selectedSecondaryOutcome = null;
  callStepPrimary.classList.add("hidden");
  callStepSecondary.classList.add("hidden");

  document.querySelectorAll("[data-primary-outcome]").forEach(btn => {
    btn.classList.remove("selected");
  });

  document.querySelectorAll("[data-secondary-outcome]").forEach(btn => {
    btn.classList.remove("selected");
  });
}

function getCrmRecipient(vnr) {
  const clean = String(vnr || "").trim();
  if (!clean) return "";
  return `${clean}.eventful@severamail.com`;
}

function buildCustomerMailBody(card, customerLogs) {
  const lines = [
    `Namn: ${card.name || ""}`,
    `Telefonnummer: ${card.phone || ""}`,
    "",
    "Anteckningar:",
    `${card.notes || ""}`,
    "",
    "Samtalslogg:"
  ];

  if (!customerLogs.length) {
    lines.push("Ingen logg ännu.");
  } else {
    customerLogs.forEach(item => {
      lines.push(`${formatDateTime(item.time)} — ${item.outcome}`);
    });
  }

  return lines.join("\n");
}

async function loadCards() {
  const snapshot = await getDocs(collection(db, "cards"));
  cardsCache = snapshot.docs.map(item => normalizeCard(item.data(), item.id));
  renderCards();
  renderManageList();
}

async function loadLog() {
  const q = query(collection(db, "log"), orderBy("time", "desc"), limit(500));
  const snapshot = await getDocs(q);
  logCache = snapshot.docs.map(item => normalizeLog(item.data(), item.id));
  updateStats();
  renderAnalysisDays();

  if (currentCardId) {
    renderCustomerLog(currentCardId);
  }
}

async function loadGeneralNote() {
  const ref = doc(db, "meta", "generalNote");
  const snap = await getDoc(ref);

  generalNoteCache = snap.exists() ? String(snap.data()?.content || "") : "";
  generalNoteInput.value = generalNoteCache;
  sheetGeneralNoteInput.value = generalNoteCache;
}

async function refreshAll() {
  await Promise.all([loadCards(), loadLog(), loadGeneralNote()]);
}

async function toggleHighlight(cardId) {
  const card = cardsCache.find(item => item.id === cardId);
  if (!card) return;

  await updateDoc(doc(db, "cards", cardId), {
    highlighted: !card.highlighted,
    updatedAt: new Date().toISOString()
  });

  await loadCards();

  if (currentCardId === cardId) {
    openBottomSheet(cardId);
  }
}

async function markCardProspected(cardId) {
  await updateDoc(doc(db, "cards", cardId), {
    status: "Prospekterad",
    updatedAt: new Date().toISOString()
  });

  await loadCards();

  if (currentCardId === cardId) {
    openBottomSheet(cardId);
  }
}

async function saveCurrentContactInfo() {
  const card = getCurrentCard();
  if (!card) return;

  await updateDoc(doc(db, "cards", card.id), {
    name: sheetNameInput.value.trim(),
    contactPerson: sheetContactPersonInput.value.trim(),
    phone: sheetPhoneInput.value.trim(),
    email: sheetEmailInput.value.trim(),
    vnr: sheetVnrInput.value.trim(),
    link: sheetLinkInput.value.trim(),
    importantInfo: sheetImportantInfoInput.value.trim(),
    status: sheetStatusInput.value.trim(),
    notes: sheetNotesInput.value.trim(),
    updatedAt: new Date().toISOString()
  });

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

async function saveGeneralNote(content) {
  await setDoc(doc(db, "meta", "generalNote"), {
    content,
    updatedAt: new Date().toISOString()
  });

  generalNoteCache = content;
  generalNoteInput.value = content;
  sheetGeneralNoteInput.value = content;
}

async function createLog(card, outcome) {
  await addDoc(collection(db, "log"), {
    cardId: card.id,
    name: card.name || "",
    outcome,
    time: new Date().toISOString()
  });

  if (outcome === "Bokat möte") {
    await updateDoc(doc(db, "cards", card.id), {
      status: "Bokat möte",
      updatedAt: new Date().toISOString()
    });
    await loadCards();
  }

  if (outcome === "Ej intresserad") {
    await updateDoc(doc(db, "cards", card.id), {
      status: "Ej intresserad",
      updatedAt: new Date().toISOString()
    });
    await loadCards();
  }

  await loadLog();

  if (currentCardId === card.id) {
    openBottomSheet(card.id);
  }
}

async function deleteLogEntry(logId) {
  await deleteDoc(doc(db, "log", logId));
  await loadLog();
}

async function saveCardFromForm(event) {
  event.preventDefault();

  const payload = {
    name: formName.value.trim(),
    contactPerson: formContactPerson.value.trim(),
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
    alert("Organisation behövs.");
    return;
  }

  if (cardFormId.value) {
    await updateDoc(doc(db, "cards", cardFormId.value), payload);
  } else {
    await addDoc(collection(db, "cards"), {
      ...payload,
      highlighted: false,
      createdAt: new Date().toISOString()
    });
  }

  resetCardForm();
  await loadCards();
}

async function deleteCard(cardId) {
  const ok = window.confirm("Ta bort detta kort?");
  if (!ok) return;

  await deleteDoc(doc(db, "cards", cardId));
  await loadCards();

  if (currentCardId === cardId) {
    closeBottomSheet();
  }
}

function buildTemplateRows() {
  return [
    {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      vnr: "",
      link: "",
      status: "",
      importantInfo: "",
      notes: ""
    }
  ];
}

function exportWorkbook() {
  const cardsRows = cardsCache.map(card => ({
    name: card.name || "",
    contactPerson: card.contactPerson || "",
    phone: card.phone || "",
    email: card.email || "",
    vnr: card.vnr || "",
    link: card.link || "",
    status: card.status || "",
    importantInfo: card.importantInfo || "",
    notes: card.notes || "",
    highlighted: card.highlighted ? "true" : "false"
  }));

  const logRows = logCache.map(item => ({
    name: item.name || "",
    outcome: item.outcome || "",
    date: formatDateOnly(item.time),
    time: formatDateTime(item.time),
    cardId: item.cardId || ""
  }));

  const wb = XLSX.utils.book_new();
  const wsCards = XLSX.utils.json_to_sheet(cardsRows.length ? cardsRows : buildTemplateRows());
  const wsLog = XLSX.utils.json_to_sheet(logRows.length ? logRows : [{ name: "", outcome: "", date: "", time: "", cardId: "" }]);

  XLSX.utils.book_append_sheet(wb, wsCards, "Cards");
  XLSX.utils.book_append_sheet(wb, wsLog, "Logg");
  XLSX.writeFile(wb, `PHX1-export-${getTodayKey()}.xlsx`);
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(buildTemplateRows());
  XLSX.utils.book_append_sheet(wb, ws, "Cards");
  XLSX.writeFile(wb, "PHX1-mall.xlsx");
}

async function overwriteCardsFromExcel(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const existingCards = await getDocs(collection(db, "cards"));
  for (const snap of existingCards.docs) {
    await deleteDoc(doc(db, "cards", snap.id));
  }

  for (const row of rows) {
    const name = String(row.name || "").trim();
    if (!name) continue;

    await addDoc(collection(db, "cards"), {
      name,
      contactPerson: String(row.contactPerson || "").trim(),
      phone: String(row.phone || "").trim(),
      email: String(row.email || "").trim(),
      vnr: String(row.vnr || "").trim(),
      link: String(row.link || "").trim(),
      status: String(row.status || "").trim(),
      importantInfo: String(row.importantInfo || "").trim(),
      notes: String(row.notes || "").trim(),
      highlighted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  await loadCards();
}

function copyTextToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

function handleMailCrm() {
  const card = getCurrentCard();
  if (!card) return;

  const recipient = getCrmRecipient(sheetVnrInput.value.trim() || card.vnr);
  if (!recipient) {
    alert("VNR saknas.");
    return;
  }

  const customerLogs = logCache
    .filter(item => item.cardId === card.id)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 20);

  const subject = encodeURIComponent(`CRM - ${card.name || "Kontakt"}`);
  const body = encodeURIComponent(buildCustomerMailBody({
    ...card,
    notes: sheetNotesInput.value.trim(),
    phone: sheetPhoneInput.value.trim() || card.phone
  }, customerLogs));

  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
}

function bindAccordion() {
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-accordion-target]");
    if (!toggle) return;

    const targetId = toggle.dataset.accordionTarget;
    const body = document.getElementById(targetId);
    if (!body) return;

    body.classList.toggle("open");
  });
}

function bindEvents() {
  refreshBtn.addEventListener("click", refreshAll);

  toolChips.forEach(btn => {
    btn.addEventListener("click", () => {
      const isOpen = !document.getElementById(btn.dataset.panelTarget).classList.contains("hidden");
      setActivePanel(isOpen ? null : btn.dataset.panelTarget);
    });
  });

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  cardsEl.addEventListener("click", async (event) => {
    const highlightBtn = event.target.closest("[data-highlight-id]");
    if (highlightBtn) {
      event.stopPropagation();
      await toggleHighlight(highlightBtn.dataset.highlightId);
      return;
    }

    const prospectBtn = event.target.closest("[data-prospect-id]");
    if (prospectBtn) {
      event.stopPropagation();
      await markCardProspected(prospectBtn.dataset.prospectId);
      return;
    }

    const cardEl = event.target.closest(".card");
    if (!cardEl) return;

    openBottomSheet(cardEl.dataset.cardId);
  });

  analysisDaysEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-analysis-day]");
    if (!btn) return;

    renderAnalysisDetail(btn.dataset.analysisDay);
  });

  analysisTenDaysEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-analysis-day]");
    if (!btn) return;

    renderAnalysisDetail(btn.dataset.analysisDay);
  });

  toggleTenDaysBtn.addEventListener("click", () => {
    tenDaysVisible = !tenDaysVisible;
    analysisTenDaysEl.classList.toggle("hidden", !tenDaysVisible);
    toggleTenDaysBtn.textContent = tenDaysVisible ? "Dölj 10 dagar" : "Visa 10 dagar";
  });

  cardForm.addEventListener("submit", saveCardFromForm);
  resetCardFormBtn.addEventListener("click", resetCardForm);

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

  downloadTemplateBtn.addEventListener("click", downloadTemplate);
  exportExcelBtn.addEventListener("click", exportWorkbook);

  importExcelInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ok = window.confirm("Detta skriver över alla befintliga kort. Fortsätta?");
    if (!ok) {
      importExcelInput.value = "";
      return;
    }

    try {
      await overwriteCardsFromExcel(file);
      alert("Excel importerat.");
    } catch (error) {
      console.error(error);
      alert("Import misslyckades.");
    } finally {
      importExcelInput.value = "";
    }
  });

  saveGeneralNoteBtn.addEventListener("click", async () => {
    await saveGeneralNote(generalNoteInput.value);
  });

  copyGeneralNoteBtn.addEventListener("click", () => {
    copyTextToClipboard(generalNoteInput.value);
  });

  closeSheetBtn.addEventListener("click", closeBottomSheet);
  sheetOverlay.addEventListener("click", closeBottomSheet);

  saveContactInfoBtn.addEventListener("click", saveCurrentContactInfo);
  saveNotesBtn.addEventListener("click", saveCurrentNotes);
  mailCrmBtn.addEventListener("click", handleMailCrm);

  markProspectedBtn.addEventListener("click", async () => {
    const card = getCurrentCard();
    if (!card) return;
    await markCardProspected(card.id);
  });

  openGeneralNoteFromCardBtn.addEventListener("click", async () => {
    setActivePanel("generalNotePanel");
    generalNoteInput.value = generalNoteCache;
    closeBottomSheet();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  saveGeneralNoteFromCardBtn.addEventListener("click", async () => {
    await saveGeneralNote(sheetGeneralNoteInput.value);
  });

  copyGeneralNoteFromCardBtn.addEventListener("click", () => {
    copyTextToClipboard(sheetGeneralNoteInput.value);
  });

  startLogCallBtn.addEventListener("click", () => {
    resetCallLogFlow();
    callStepPrimary.classList.remove("hidden");
  });

  callStepPrimary.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-primary-outcome]");
    if (!btn) return;

    selectedPrimaryOutcome = btn.dataset.primaryOutcome;

    document.querySelectorAll("[data-primary-outcome]").forEach(el => {
      el.classList.toggle("selected", el.dataset.primaryOutcome === selectedPrimaryOutcome);
    });

    if (selectedPrimaryOutcome === "Inget svar") {
      const card = getCurrentCard();
      if (!card) return;
      await createLog(card, "Inget svar");
      resetCallLogFlow();
      return;
    }

    if (selectedPrimaryOutcome === "Svarade") {
      callStepSecondary.classList.remove("hidden");
    }
  });

  callStepSecondary.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-secondary-outcome]");
    if (!btn) return;

    selectedSecondaryOutcome = btn.dataset.secondaryOutcome;

    document.querySelectorAll("[data-secondary-outcome]").forEach(el => {
      el.classList.toggle("selected", el.dataset.secondaryOutcome === selectedSecondaryOutcome);
    });

    const card = getCurrentCard();
    if (!card) return;

    await createLog(card, selectedSecondaryOutcome);
    resetCallLogFlow();
  });

  customerLogList.addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest("[data-delete-log-id]");
    if (!deleteBtn) return;

    await deleteLogEntry(deleteBtn.dataset.deleteLogId);
    const card = getCurrentCard();
    if (card) {
      renderCustomerLog(card.id);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBottomSheet();
    }
  });

  bindAccordion();
}

async function init() {
  try {
    setActivePanel(null);
    setFilter("all");
    await refreshAll();
    bindEvents();
  } catch (error) {
    console.error(error);
    cardsEl.innerHTML = `
      <div class="emptyState">
        Kunde inte läsa från Firebase. Kontrollera Firestore och reglerna.
      </div>
    `;
  }
}

init();
