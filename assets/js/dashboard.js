const savedUser = localStorage.getItem("portalUser");

if (!savedUser) {
  window.location.href = "/login.html";
}

const logoutBtn = document.getElementById("logoutBtn");
const repFilter = document.getElementById("repFilter");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const salesTableBody = document.getElementById("salesTableBody");

let allSales = [];
let filteredSales = [];

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("portalUser");
  window.location.href = "/login.html";
});

repFilter.addEventListener("change", applyFilters);
startDate.addEventListener("change", applyFilters);
endDate.addEventListener("change", applyFilters);

async function loadSales() {
  try {
    const response = await fetch("/.netlify/functions/get-sales");
    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("Failed to load sales:", data.error);
      alert(data.error || "Failed to load sales");
      return;
    }

    allSales = Array.isArray(data.sales) ? data.sales : [];
    populateRepFilter(allSales);
    applyFilters();
  } catch (error) {
    console.error("Dashboard load error:", error);
    alert("Something went wrong loading the dashboard");
  }
}

function populateRepFilter(sales) {
  const reps = [...new Set(
    sales
      .map((row) => row.salesRep)
      .filter((rep) => rep && rep.trim() !== "")
  )].sort((a, b) => a.localeCompare(b));

  repFilter.innerHTML = `<option value="">All Reps</option>`;

  reps.forEach((rep) => {
    const option = document.createElement("option");
    option.value = rep;
    option.textContent = rep;
    repFilter.appendChild(option);
  });
}

function applyFilters() {
  const selectedRep = repFilter.value;
  const selectedStart = startDate.value;
  const selectedEnd = endDate.value;

  filteredSales = allSales.filter((row) => {
    const repMatch = !selectedRep || row.salesRep === selectedRep;
    const startMatch = !selectedStart || (row.docsSent && row.docsSent >= selectedStart);
    const endMatch = !selectedEnd || (row.docsSent && row.docsSent <= selectedEnd);

    return repMatch && startMatch && endMatch;
  });

  renderTable(filteredSales);
  updateCards(filteredSales);
}

function renderTable(rows) {
  salesTableBody.innerHTML = "";

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="10" style="text-align:center; color:#64748b; padding:24px;">
        No sales found for the selected filters.
      </td>
    `;
    salesTableBody.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(row.firstName)}</td>
      <td>${escapeHtml(row.lastName)}</td>
      <td>${escapeHtml(row.email)}</td>
      <td>${escapeHtml(row.phone)}</td>
      <td>${escapeHtml(row.salesRep)}</td>
      <td>${escapeHtml(row.model)}</td>
      <td>${escapeHtml(row.docsSent)}</td>
      <td>${escapeHtml(row.docsSigned)}</td>
      <td>${escapeHtml(row.paymentReceived)}</td>
    `;

    salesTableBody.appendChild(tr);
  });
}

function updateCards(rows) {
  const completedRows = rows.filter(
    (row) => (row.status || "").trim().toLowerCase() === "completed"
  );

  const miniCompleted = completedRows.filter(
    (row) => (row.model || "").trim().toLowerCase() === "minibox"
  );

  const bungalowCompleted = completedRows.filter(
    (row) => (row.model || "").trim().toLowerCase() === "bungalow"
  );

  const duplexCompleted = completedRows.filter(
    (row) => (row.model || "").trim().toLowerCase() === "duplex"
  );

  document.getElementById("totalSubmitted").textContent = rows.length;
  document.getElementById("completedCount").textContent = completedRows.length;
  document.getElementById("miniCompleted").textContent = miniCompleted.length;
  document.getElementById("bungalowCompleted").textContent = bungalowCompleted.length;
  document.getElementById("duplexCompleted").textContent = duplexCompleted.length;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

loadSales();