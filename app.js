const API_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const LEAGUES = {
  "FL1": { slug: "fra.1",          name: "Ligue 1" },
  "PL":  { slug: "eng.1",          name: "Premier League" },
  "PD":  { slug: "esp.1",          name: "La Liga" },
  "BL1": { slug: "ger.1",          name: "Bundesliga" },
  "SA":  { slug: "ita.1",          name: "Serie A" },
  "CL":  { slug: "uefa.champions", name: "Champions League" }
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
  const slug = LEAGUES[league].slug;
  const today = getDateString(0);
  const url = `${API_URL}/${slug}/scoreboard?dates=${today}`;
  try {
    const data = await fetchAPI(url);
    renderMatches(data.events, "results-tab");
  } catch (e) {
    showError("results-tab", e);
  }
  hideLoader();
}

async function loadUpcoming(league) {
  const slug = LEAGUES[league].slug;
  const url = `${API_URL}/${slug}/scoreboard`;
  try {
    const data = await fetchAPI(url);
    renderMatches(data.events, "upcoming-tab");
  } catch (e) {
    showError("upcoming-tab", e);
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
    const competition = event.competitions[0];
    const home = competition.competitors.find(t => t.homeAway === "home");
    const away = competition.competitors.find(t => t.homeAway === "away");
    const status = event.status.type.name;
    const time = new Date(event.date).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    });

    const isFinished = status === "STATUS_FINAL";
    const isLive = status === "STATUS_IN_PROGRESS";

    const scoreDisplay = (isFinished || isLive)
      ? `${home.score} - ${away.score}`
      : time;

    const statusLabel = isFinished ? "FINISHED"
      : isLive ? "IN_PLAY"
      : "SCHEDULED";

    return `
      <div class="match-card">
        <div class="match-teams">
          <span class="team-name">${home.team.displayName}</span>
          <span class="match-score">${scoreDisplay}</span>
          <span class="team-name">${away.team.displayName}</span>
        </div>
        <div class="match-info">
          <span>🏆 ${event.name}</span>
          <span class="status-badge status-${statusLabel}">
            ${formatStatus(statusLabel)}
          </span>
          <span>🕐 ${time}</span>
        </div>
      </div>`;
  }).join("");
}

async function loadStandings(league) {
  const slug = LEAGUES[league].slug;
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings`;
  try {
    const data = await fetchAPI(url);
    renderStandings(data.standings[0].entries);
  } catch (e) {
    showError("standings-tab", e);
  }
  hideLoader();
}

function renderStandings(entries) {
  const container = document.getElementById("standings-tab");

  if (!entries || entries.length === 0) {
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
          ${entries.map(entry => {
            const stats = entry.stats;
            const played = stats.find(s => s.name === "gamesPlayed")?.value ?? 0;
            const wins   = stats.find(s => s.name === "wins")?.value ?? 0;
            const draws  = stats.find(s => s.name === "ties")?.value ?? 0;
            const losses = stats.find(s => s.name === "losses")?.value ?? 0;
            const points = stats.find(s => s.name === "points")?.value ?? 0;
            return `
              <tr>
                <td>${entry.stats.find(s => s.name === "rank")?.value ?? ""}</td>
                <td>${entry.team.displayName}</td>
                <td>${played}</td>
                <td>${wins}</td>
                <td>${draws}</td>
                <td>${losses}</td>
                <td>${points}</td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

async function fetchAPI(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function getDateString(addDays) {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return d.toISOString().split("T")[0].replace(/-/g, "");
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

function showError(containerId, e) {
  document.getElementById(containerId).innerHTML =
    `<p class="error-msg">
      ❌ Erreur : ${e.message}
    </p>`;
}
