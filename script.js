// --- CONFIGURATION ---
const API_BASE_URL = "https://evergreen-box-backend.onrender.com/api";
const REFRESH_INTERVAL_MS = 10000;

// --- STATE ---
let globalHistoryData = [];
let currentMetric = "moisture";
let trendChart = null; 

let todayWaterCount = 2;
let todayLightCount = 1;
let todayVentCount = 1;

// Removed mock chart arrays, keeping profile info
const plantData = {
    cactus: {
        name: "Cactus",
        confidence: "96%",
        image: "https://static.planetminecraft.com/files/image/minecraft/texture-pack/2023/003/16489908-remodeledcactusicon_l.webp",
        report: "This week, the cactus remained stable. Soil moisture stayed mostly within the preferred low range. Recommendation: avoid overwatering."
    },
    succulent: {
        name: "Succulent",
        confidence: "94%",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZ5mV5N0Kt81Lv7CzONjqdBbQkeS-fSY374w&s",
        report: "This week, the succulent remained healthy overall. Light levels were stable. Recommendation: continue moderate watering."
    },
    pothos: {
        name: "Pothos",
        confidence: "95%",
        image: "https://www.guide-to-houseplants.com/images/golden-pothos.jpg",
        report: "This week, the pothos remained generally healthy. Recommendation: maintain the current watering schedule and continue automatic monitoring."
    }
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    initChart();
    changePlant(); // Setup initial plant profile
    
    // Initial fetch
    await fetchSensorHistory();
    await fetchLatestSensorData();

    // Start polling
    setInterval(fetchLatestSensorData, REFRESH_INTERVAL_MS);
});


// --- DATA FETCHING (Separated from DOM) ---

async function fetchLatestSensorData() {
    try {
        const response = await fetch(`${API_BASE_URL}/sensor/latest`);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        
        const data = await response.json();
        updateEnvironmentUI(data);
        updateSystemStatus("Online & Monitoring", "healthy");
    } catch (error) {
        console.error("Failed to fetch latest sensor data:", error);
        updateEnvironmentUI(null); // Trigger fallback UI
        updateSystemStatus("Backend Unavailable", "alert");
    }
}

async function fetchSensorHistory() {
    try {
        // Assumption: endpoint exists based on prompt requirements
        const response = await fetch(`${API_BASE_URL}/sensor/history`);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            globalHistoryData = data;
            updateChartData();
        }
    } catch (error) {
        console.error("Failed to fetch sensor history:", error);
        // Do not fabricate data. Chart will remain empty.
    }
}

// --- DOM UPDATES ---

function updateEnvironmentUI(data) {
    const tempEl = document.getElementById("temperature");
    const humEl = document.getElementById("humidity");
    const soilEl = document.getElementById("soilMoisture");
    const lightEl = document.getElementById("lightLevel");

    if (!data) {
        // Fallback state
        tempEl.textContent = "--°C";
        humEl.textContent = "--%";
        soilEl.textContent = "--%";
        lightEl.textContent = "-- lux";
        return;
    }

    // Defensive reading using nullish coalescing in case backend misses a field
    tempEl.textContent = data.temperature != null ? `${data.temperature}°C` : "--°C";
    humEl.textContent = data.humidity != null ? `${data.humidity}%` : "--%";
    soilEl.textContent = data.moisture != null ? `${data.moisture}%` : "--%";
    lightEl.textContent = data.light != null ? `${data.light} lux` : "-- lux";
}

function updateSystemStatus(text, type = "healthy") {
    const status = document.getElementById("systemStatus");
    status.textContent = `System Status: ${text}`;
    status.className = "system-status"; // Reset
    if (type !== "healthy") status.classList.add(type);
}

// --- CHART LOGIC (Robust & Stable) ---

function initChart() {
    const ctx = document.getElementById("trendChart").getContext("2d");
    trendChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [], 
            datasets: [{
                label: "Loading...",
                data: [],
                tension: 0.3,
                fill: false,
                borderColor: '#2e7d32' 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
        }
    });
}

function switchChartMetric(metric) {
    currentMetric = metric;
    updateChartData();
}

function updateChartData() {
    if (!trendChart || globalHistoryData.length === 0) return;

    const plantKey = document.getElementById("plantSelect").value;
    const plantName = plantData[plantKey].name;

    // Parse timestamps for readable x-axis (e.g., "11:40")
    const newLabels = globalHistoryData.map(row => {
        if (!row.timestamp) return "Unknown";
        const dateObj = new Date(row.timestamp);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    });

    // Map the selected metric data
    const newData = globalHistoryData.map(row => row[currentMetric] || 0);

    // Label formatting
    let metricLabel = currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1);
    if (currentMetric === "moisture") metricLabel = "Soil Moisture";

    // Update existing chart instance instead of destroying it
    trendChart.data.labels = newLabels;
    trendChart.data.datasets[0].label = `${plantName} - ${metricLabel}`;
    trendChart.data.datasets[0].data = newData;
    trendChart.update();
}

// --- CHAT LOGIC ---

async function sendMessage() {
    const input = document.getElementById("chatInput");
    const chatBox = document.getElementById("chatBox");
    const text = input.value.trim();
    if (!text) return;

    // 1. Render user message
    const userMsg = document.createElement("div");
    userMsg.className = "chat-message user";
    userMsg.innerText = text;
    chatBox.appendChild(userMsg);
    input.value = "";

    // 2. Render loading
    const loadingMsg = document.createElement("div");
    loadingMsg.className = "chat-message plant";
    loadingMsg.innerText = "🌱 thinking...";
    chatBox.appendChild(loadingMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    // 3. Gather context
    const plantKey = document.getElementById("plantSelect").value;
    const plantName = plantData[plantKey].name;
    const soil = document.getElementById("soilMoisture").textContent;
    const temp = document.getElementById("temperature").textContent;
    const humidity = document.getElementById("humidity").textContent;
    const disease = document.getElementById("diseaseClass").textContent;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        // Assumes main.py's ai.router handles the chat logic under /api/chat
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `User message: ${text}\nPlant info: Name: ${plantName}, Soil: ${soil}, Temp: ${temp}, Hum: ${humidity}, Health: ${disease}`
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        
        chatBox.removeChild(loadingMsg);
        const plantMsg = document.createElement("div");
        plantMsg.className = "chat-message plant";
        plantMsg.textContent = data.reply || data.error || "No valid reply returned.";
        chatBox.appendChild(plantMsg);

    } catch (error) {
        console.error("Chat fetch error:", error);
        chatBox.removeChild(loadingMsg);
        const plantMsg = document.createElement("div");
        plantMsg.className = "chat-message plant";

        if (error.name === "AbortError") {
            plantMsg.textContent = "⚠️ The backend took too long to respond. It might be waking up.";
        } else {
            plantMsg.textContent = "⚠️ Cannot reach the backend. Please check your connection.";
        }
        chatBox.appendChild(plantMsg);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById("chatInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});


// --- UI / MANUAL CONTROLS (Kept mostly as-is, minimal cleanups) ---

function changePlant() {
    const selectEl = document.getElementById("plantSelect");
    const selected = selectEl.value;
    const data = plantData[selected];

    document.getElementById("plantType").textContent = data.name;
    document.getElementById("confidence").textContent = data.confidence;
    document.getElementById("plantImage").src = data.image;
    document.getElementById("weeklyReport").textContent = data.report;
    
    // Refresh chart titles automatically
    updateChartData();
}

function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function addCareRecord(action, trigger) {
    const tableBody = document.getElementById("careTableBody");
    const row = document.createElement("tr");
    row.innerHTML = `<td>${getCurrentTime()}</td><td>${action}</td><td>${trigger}</td>`;
    tableBody.prepend(row);
}

function refreshSummaryCounts() {
    document.getElementById("todayWater").textContent = todayWaterCount;
    document.getElementById("todayLight").textContent = todayLightCount;
    document.getElementById("todayVent").textContent = todayVentCount;
    document.getElementById("wateringCount").textContent = `${todayWaterCount} times`;
    document.getElementById("fanCount").textContent = `${todayVentCount} time${todayVentCount > 1 ? "s" : ""}`;
}

function waterPlant() {
    todayWaterCount++;
    document.getElementById("currentAdvice").textContent = "Watering completed manually.";
    addCareRecord("Manual watering", "User command");
    refreshSummaryCounts();
}

function turnOnLight() {
    todayLightCount++;
    document.getElementById("currentAdvice").textContent = "Supplemental light activated.";
    addCareRecord("Manual light on", "User command");
    refreshSummaryCounts();
}

function turnOnFan() {
    todayVentCount++;
    document.getElementById("currentAdvice").textContent = "Ventilation started manually.";
    addCareRecord("Manual fan on", "User command");
    refreshSummaryCounts();
}

function simulateAutoCare() {
    todayWaterCount++;
    document.getElementById("currentAdvice").textContent = "Simulated Auto Care executed.";
    addCareRecord("Auto Care (Sim)", "Timer/Threshold");
    refreshSummaryCounts();
}

function simulateHealthy() {
    document.getElementById("healthStatus").textContent = "Healthy";
    document.getElementById("diseaseClass").textContent = "Healthy";
    document.getElementById("recommendation").textContent = "No action needed";
}

function simulateYellowing() {
    document.getElementById("healthStatus").textContent = "Warning";
    document.getElementById("diseaseClass").textContent = "Yellowing";
    document.getElementById("recommendation").textContent = "Inspect watering conditions.";
}

function simulateRotRisk() {
    document.getElementById("healthStatus").textContent = "Alert";
    document.getElementById("diseaseClass").textContent = "Dark-spot / Rot risk";
    document.getElementById("recommendation").textContent = "Reduce watering and improve ventilation.";
}