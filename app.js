import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const cardsEl = document.getElementById("cards");
const logEl = document.getElementById("log");
const callsTodayEl = document.getElementById("callsToday");
const answersTodayEl = document.getElementById("answersToday");

let cardsCache = [];
let logCache = [];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isToday(dateString) {
  const d = new Date(dateString);
  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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

function renderCards() {
  if (!cardsCache.length) {
    cardsEl.innerHTML = `
      <div class="emptyState">
        Inga kort ännu. Lägg till fler dokument i Firestore under collection <strong>cards</strong>.
      </div>
    `;
    return;
  }

  cardsEl.innerHTML = cardsCache.map(card => {
    const infoLine = card.importantInfo
      ? `<div class="cardInfoLine">${escapeHtml(card.importantInfo)}</div>`
      : "";

    const websiteLink = card.link
      ? `<a class="cardLink" href="${escapeHtml(card.link)}" target="_blank" rel="noopener noreferrer">Öppna länk</a>`
      : "";

    const phoneLink = card.phone
      ? `<a class="cardLink" href="tel:${escapeHtml(card.phone)}">${escapeHtml(card.phone)}</a>`
      : "";

    return `
      <article class="card" data-id="${escapeHtml(card.id)}">
        ${infoLine}
        <div class="cardName">${escapeHtml(card.name || "Namnlös kontakt")}</div>
        <div class="cardLinks">
          ${websiteLink}
          ${phoneLink}
        </div>
        <div class="cardStatus">${escapeHtml(card.status || "")}</div>
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
    <div class="logItem">
      ${escapeHtml(item.name || "Okänd kontakt")}
      <span class="logMeta">${escapeHtml(item.outcome || "ringd")} • ${formatDateTime(item.time)}</span>
    </div>
  `).join("");
}

function updateStats() {
  const todaysLogs = logCache.filter(item => isToday(item.time));
  const todaysAnswers = todaysLogs.filter(item => item.outcome === "Svarade");

  callsTodayEl.textContent = String(todaysLogs.length);
  answersTodayEl.textContent = String(todaysAnswers.length);
}

async function loadCards() {
  const snapshot = await getDocs(collection(db, "cards"));

  cardsCache = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderCards();
}

async function loadLog() {
  const q = query(collection(db, "log"), orderBy("time", "desc"), limit(50));
  const snapshot = await getDocs(q);

  logCache = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderLog();
  updateStats();
}

async function createQuickLog(name, outcome = "Ringd") {
  await addDoc(collection(db, "log"), {
    name,
    outcome,
    time: new Date().toISOString()
  });

  await loadLog();
}

function bindCardEvents() {
  cardsEl.addEventListener("click", async (event) => {
    const cardEl = event.target.closest(".card");
    if (!cardEl) return;

    const cardId = cardEl.dataset.id;
    const card = cardsCache.find(item => item.id === cardId);
    if (!card) return;

    await createQuickLog(card.name, "Ringd");
  });
}

async function init() {
  try {
    await Promise.all([loadCards(), loadLog()]);
    bindCardEvents();
  } catch (error) {
    console.error(error);
    cardsEl.innerHTML = `
      <div class="emptyState">
        Kunde inte läsa från Firebase. Kontrollera Firestore, reglerna och att filerna är rätt inlagda.
      </div>
    `;
  }
}

init();
