const API_URL = "https://www.thesportsdb.com/api/v1/json/3";

const LEAGUES = {
  "FL1":  { id: "4334", name: "Ligue 1",          season: "2024-2025" },
  "PL":   { id: "4328", name: "Premier League",    season: "2024-2025" },
  "PD":   { id: "4335", name: "La Liga",           season: "2024-2025" },
  "BL1":  { id: "4331", name: "Bundesliga",        season: "2024-2025" },
  "SA":   { id: "4332", name: "Serie A",           season: "2024-2025" },
  "CL":   { id: "4480", name: "Champions League",  season: "2024-2025" }
};

let currentTab = "results";

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  document.getElementById("date-today").textContent =
    today.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }

  loadData();
});

function showTab(tab, btn) {
  currentTab = tab;

  document.querySelectorAll(".nav-btn")
    .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  document.querySelectorAll(".tab-content")
    .forEach(el => el.classList.add("hidden"));
  document.getElementById(`${tab}-tab`)
    .classList.remove("hidden");

  loadData();
}

function loadData() {
  const league = document.getElementById("league-select").value;
  showLoader();

  if (currentTab === "results")   loadResults(league);
  if (currentTab === "standings") loadStandings(league);
  if (currentTab === "upcoming")  loadUpcoming(league);
}

function showLoader() {
  document.getElementById("loader").style.display = "block";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

async function loadResults(league) {
  const leagueId = LEAGUES[league].id;
  const url = `${API_URL}/eventspastleague.php?id=${leagueId}`;
  try {
    const data = await fetchAPI(url);
    renderMatches(data.events, "results-tab");
  } catch (e) {
    showError("results-tab");
  }
  hideLoader();
}

async function loadUpcoming(league) {
  const leagueId = LEAGUES[league].id;
  const url = `${API_URL}/eventsnextleague.php?id=${leagueId}`;
  try {
    const data = await fetchAPI(url);
    renderMatches(data.events, "upcoming-tab");
  } catch (e) {
    showError("upcoming-tab");
  }
  hideLoader();
}

function renderMatches(events, containerId) {
  const container = document.getElementById(containerId);

  if (!events || events.length === 0) {
    container.innerHTML =
      `<p class="empty-msg">😴 Aucun match trouvé</p>`;
    return;
  }

  container.innerHTML = events.map(event => {
    const homeScore = event.intHomeScore ?? "–";
    const awayScore = event.intAwayScore ?? "–";
    const isPlayed  = event.intHomeScore !== null;
    const time      = event.strTime
                        ? event.strTime.substring(0, 5)
                        : "--:--";
    const date      = event.dateEvent ?? "";

    const scoreDisplay = isPlayed
      ? `${homeScore} - ${awayScore}`
      : time;

    const status = isPlayed ? "FINISHED" : "SCHEDULED";

    return `
      <div class="match-card">
        <div class="match-teams">
          <span class="team-name">${event.strHomeTeam}</span>
          <span class="match-score">${scoreDisplay}</span>
          <span class="team-name">${event.strAwayTeam}</span>
        </div>
        <div class="match-info">
          <span>🏆 ${event.strLeague}</span>
          <span class="status-badge status-${status}">
            ${formatStatus(status)}
          </span>
          <span>📅 ${date}</span>
        </div>
      </div>`;
  }).join("");
}

async function loadStandings(league) {
  const leagueData = LEAGUES[league];
  const url = `${API_URL}/lookuptable.php?l=${leagueData.id}&s=${leagueData.season}`;
  try {
    const data = await fetchAPI(url);
    renderStandings(data.table);
  } catch (e) {
    showError("standings-tab");
  }
  hideLoader();
}

function renderStandings(table) {
  const container = document.getElementById("standings-tab");

  if (!table || table.length === 0) {
    container.innerHTML =
      `<p class="empty-msg">😴 Classement non disponible</p>`;
    return;
  }

  container.innerHTML = `
    <div class="standings-wrapper">
      <table class="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Équipe</th>
            <th>J</th>
            <th>G</th>
            <th>N</th>
            <th>P</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          ${table.map(row => `
            <tr>
              <td>${row.intRank}</td>
              <td>${row.strTeam}</td>
              <td>${row.intPlayed}</td>
              <td>${row.intWin}</td>
              <td>${row.intDraw}</td>
              <td>${row.intLoss}</td>
              <td>${row.intPoints}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

async function fetchAPI(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function formatStatus(status) {
  const map = {
    FINISHED:  "✅ Terminé",
    IN_PLAY:   "🔴 En direct",
    PAUSED:    "⏸ Mi-temps",
    SCHEDULED: "📅 Programmé",
    POSTPONED: "⚠️ Reporté",
    CANCELLED: "❌ Annulé",
  };
  return map[status] ?? status;
}

function showError(containerId) {
  document.getElementById(containerId).innerHTML =
    `<p class="error-msg">
      ❌ Erreur de chargement.<br/>
      Réessayez dans quelques instants.
    </p>`;
}
