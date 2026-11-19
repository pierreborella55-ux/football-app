const API_KEY = "bddefa94c5444cd78383ec36c161f3aa";
const API_URL = "https://corsproxy.io/?https://api.football-data.org/v4";

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
  const today = getDateString(0);
  const url = `${API_URL}/competitions/${league}/matches?dateFrom=${today}&dateTo=${today}`;
  try {
    const data = await fetchAPI(url);
    renderMatches(data.matches, "results-tab");
  } catch (e) {
    showError("results-tab", e);
  }
  hideLoader();
}

async function loadUpcoming(league) {
  const dateFrom = getDateString(1);
  const dateTo   = getDateString(7);
  const url = `${API_URL}/competitions/${league}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`;
  try {
    const data = await fetchAPI(url);
    renderMatches(data.matches, "upcoming-tab");
  } catch (e) {
    showError("upcoming-tab", e);
  }
  hideLoader();
}

function renderMatches(matches, containerId) {
  const container = document.getElementById(containerId);
  if (!matches || matches.length === 0) {
    container.innerHTML =
      `<p class="empty-msg">😴 Aucun match trouvé</p>`;
    return;
  }
  container.innerHTML = matches.map(match => {
    const homeScore = match.score?.fullTime?.home ?? "–";
    const awayScore = match.score?.fullTime?.away ?? "–";
    const status    = match.status;
    const time      = new Date(match.utcDate)
                        .toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        });
    const scoreDisplay =
      status === "SCHEDULED" || status === "TIMED"
        ? time
        : `${homeScore} - ${awayScore}`;
    return `
      <div class="match-card">
        <div class="match-teams">
          <span class="team-name">${match.homeTeam.name}</span>
          <span class="match-score">${scoreDisplay}</span>
          <span class="team-name">${match.awayTeam.name}</span>
        </div>
        <div class="match-info">
          <span>🏆 ${match.competition?.name ?? ""}</span>
          <span class="status-badge status-${status}">
            ${formatStatus(status)}
          </span>
          <span>🕐 ${time}</span>
        </div>
      </div>`;
  }).join("");
}

async function loadStandings(league) {
  const url = `${API_URL}/competitions/${league}/standings`;
  try {
    const data = await fetchAPI(url);
    const table = data.standings[0].table;
    renderStandings(table);
  } catch (e) {
    showError("standings-tab", e);
  }
  hideLoader();
}

function renderStandings(table) {
  const container = document.getElementById("standings-tab");
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
              <td>${row.position}</td>
              <td>${row.team.shortName ?? row.team.name}</td>
              <td>${row.playedGames}</td>
              <td>${row.won}</td>
              <td>${row.draw}</td>
              <td>${row.lost}</td>
              <td>${row.points}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

async function fetchAPI(url) {
  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": API_KEY,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function getDateString(addDays) {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return d.toISOString().split("T")[0];
}

function formatStatus(status) {
  const map = {
    FINISHED:  "✅ Terminé",
    IN_PLAY:   "🔴 En direct",
    PAUSED:    "⏸ Mi-temps",
    SCHEDULED: "📅 Programmé",
    TIMED:     "📅 Programmé",
    POSTPONED: "⚠️ Reporté",
    CANCELLED: "❌ Annulé",
  };
  return map[status] ?? status;
}

function showError(containerId, e) {
  document.getElementById(containerId).innerHTML =
    `<p class="error-msg">
      ❌ Erreur : ${e.message}<br/>
    </p>`;
}
