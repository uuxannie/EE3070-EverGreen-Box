// ==========================================
// 1. CONFIGURATION & STATE MANAGEMENT
// ==========================================
const API_BASE_URL = "https://evergreen-box-backend.onrender.com/api";
const RENDER_ROOT = "https://evergreen-box-backend.onrender.com";
const REFRESH_INTERVAL_MS = 10000;

// Centralized Application State (Single Source of Truth)
const appState = {
    status: "Connecting...",
    statusType: "alert", // 'healthy', 'warning', 'alert'
    sensor: {
        temperature: null,
        humidity: null,
        light: null
    },
    deviceStats: {
        water_pump: 0,
        grow_light: 0,
        fan: 0
    },
    history: [],
    chartMetric: "temperature",
    activePlant: null,
    latestPhotoUrl: null
};

// Fallback plant profiles (Ideally, fetch these from /api/plants in the future)
const plantProfiles = {
    cactus: {
        name: "Cactus", confidence: "96%",
        image: "https://static.planetminecraft.com/files/image/minecraft/texture-pack/2023/003/16489908-remodeledcactusicon_l.webp",
        report: "This week, the cactus remained stable with optimal temperature and light levels. Recommendation: continue with the current watering schedule."
    },
    succulent: {
        name: "Succulent", confidence: "94%",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZ5mV5N0Kt81Lv7CzONjqdBbQkeS-fSY374w&s",
        report: "This week, the succulent remained healthy overall. Light levels and humidity were stable. Recommendation: maintain current care conditions."
    },
    pothos: {
        name: "Pothos", confidence: "95%",
        image: "https://www.guide-to-houseplants.com/images/golden-pothos.jpg",
        report: "This week, the pothos remained generally healthy. Environmental conditions were favorable. Recommendation: maintain the current monitoring schedule."
    }
};

let trendChart = null; // Chart.js instance

// ==========================================
// 2. DRY API LAYER
// ==========================================

/**
 * Generic fetch wrapper to eliminate try/catch repetition.
 */
async function apiCall(endpoint, method = "GET", body = null) {
    const options = { method, headers: {} };
    if (body) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
}

async function fetchAllData() {
    try {
        const [latest, history, stats] = await Promise.all([
            apiCall("/sensor/latest"),
            apiCall("/sensor/history"),
            apiCall("/device/stats") // Assumes you added the device stats endpoint
        ]);

        appState.sensor = latest;
        appState.history = Array.isArray(history) ? history : [];
        appState.deviceStats = stats || appState.deviceStats;
        
        setSystemStatus("Online & Monitoring", "healthy");
    } catch (error) {
        console.error("Data synchronization failed:", error);
        setSystemStatus("Backend Unavailable", "alert");
    } finally {
        renderAll();
    }
}

async function executeDeviceCommand(target, action, successMsg) {
    setSystemStatus(`Sending command to ${target}...`, "warning");
    renderSystemStatus();

    try {
        await apiCall("/device/set_state", "POST", { target, action });
        
        document.getElementById("currentAdvice").textContent = successMsg;
        addCareRecord(`Manual ${target.replace('_', ' ')}`, "User command");
        setSystemStatus("Command executed successfully", "healthy");
        
        // Re-sync stats after an action
        const stats = await apiCall("/device/stats");
        appState.deviceStats = stats || appState.deviceStats;
        
    } catch (error) {
        console.error(`${target} command failed:`, error);
        setSystemStatus(`Failed to communicate with ${target}`, "alert");
        document.getElementById("currentAdvice").textContent = "Error: Could not send command to the greenhouse.";
    } finally {
        renderAll();
    }
}

// ==========================================
// 3. STATE MUTATORS & EVENT HANDLERS
// ==========================================

function setSystemStatus(message, type) {
    appState.status = message;
    appState.statusType = type;
}

function changePlant() {
    const selected = document.getElementById("plantSelect").value;
    appState.activePlant = plantProfiles[selected];
    renderPlantProfile();
    updateChart();
    refreshPlantPhoto();
}

function switchChartMetric(metric) {
    appState.chartMetric = metric;
    updateChart();
}

// Hardware Triggers (Mapped to actual backend routes)
const waterPlant = () => executeDeviceCommand("water_pump", "on", "Watering sequence initiated.");
const turnOffWater = () => executeDeviceCommand("water_pump", "off", "Watering stopped.");
const turnOnLight = () => executeDeviceCommand("grow_light", "on", "Supplemental light activated for optimal photosynthesis.");
const turnOffLight = () => executeDeviceCommand("grow_light", "off", "Supplemental light deactivated.");
const turnOnFan = () => executeDeviceCommand("fan", "on", "Ventilation started to regulate temperature and airflow.");
const turnOffFan = () => executeDeviceCommand("fan", "off", "Ventilation stopped.");

function updateHealthSimulation(status, diseaseClass, recommendation, type) {
    // Update display with test data
    document.getElementById("healthStatus").textContent = status;
    document.getElementById("diseaseClass").textContent = diseaseClass;
    document.getElementById("recommendation").textContent = recommendation;
    setSystemStatus(status === "Healthy" ? "Healthy" : `${diseaseClass} detected`, type);
    renderSystemStatus();
    console.log("⚠️ Simulation mode - using test data. Deploy the webcam for real detection.");
}

// Simulation buttons for testing (will be overridden by real YOLO data when available)
const simulateHealthy = () => updateHealthSimulation("Healthy", "Healthy", "No action needed", "healthy");
const simulateYellowing = () => updateHealthSimulation("Warning", "Yellowing", "Inspect watering conditions.", "warning");
const simulateRotRisk = () => updateHealthSimulation("Alert", "Dark-spot / Rot risk", "Reduce watering and improve ventilation.", "alert");


// ==========================================
// 4. CLEAN DOM RENDERING
// ==========================================

function renderAll() {
    renderSystemStatus();
    renderEnvironment();
    renderDeviceStats();
    updateChart();
}

function renderSystemStatus() {
    const statusEl = document.getElementById("systemStatus");
    statusEl.textContent = `System Status: ${appState.status}`;
    statusEl.className = "system-status"; 
    if (appState.statusType !== "healthy") {
        statusEl.classList.add(appState.statusType);
    }
}

function renderEnvironment() {
    const { temperature, humidity, light } = appState.sensor;
    
    document.getElementById("temperature").textContent = temperature != null ? `${temperature}°C` : "--°C";
    document.getElementById("humidity").textContent = humidity != null ? `${humidity}%` : "--%";
    document.getElementById("lightLevel").textContent = light != null ? `${light} lux` : "-- lux";
}

function renderDeviceStats() {
    const stats = appState.deviceStats;
    
    // Overview Cards
    document.getElementById("todayWater").textContent = stats.water_pump || 0;
    document.getElementById("todayLight").textContent = stats.grow_light || 0;
    document.getElementById("todayVent").textContent = stats.fan || 0;

    // Mini Summary
    document.getElementById("wateringCount").textContent = `${stats.water_pump || 0} times`;
    const fanCount = stats.fan || 0;
    document.getElementById("fanCount").textContent = `${fanCount} time${fanCount !== 1 ? "s" : ""}`;
}

function renderPlantProfile() {
    if (!appState.activePlant) return;
    const p = appState.activePlant;
    
    document.getElementById("plantType").textContent = p.name;
    document.getElementById("confidence").textContent = p.confidence;
    document.getElementById("plantImage").src = p.image;
    document.getElementById("weeklyReport").textContent = p.report;
}

function addCareRecord(action, trigger) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    
    const tableBody = document.getElementById("careTableBody");
    const row = document.createElement("tr");
    row.innerHTML = `<td>${timeStr}</td><td>${action}</td><td>${trigger}</td>`;
    tableBody.prepend(row);
}

async function refreshPlantPhoto() {
    const imgElement = document.getElementById("plantImage");
    const captureTimeEl = document.getElementById("captureTime");
    
    if (!imgElement || !captureTimeEl) return;

    try {
        const result = await apiCall("/camera/latest");

        if (result.status === "success" && result.data) {
            // Construct full URL and add cache-busting timestamp
            const baseUrl = RENDER_ROOT;
            const imageUrl = baseUrl + result.data.image_url + "?t=" + new Date().getTime();
            
            imgElement.src = imageUrl;
            captureTimeEl.textContent = result.data.captured_at;
            appState.latestPhotoUrl = result.data.image_url;
            
            console.log("✅ Plant photo updated:", imageUrl);
        } else {
            // No photo available from camera, use fallback
            useFallbackPlantImage();
        }
    } catch (error) {
        console.warn("Failed to fetch latest plant photo:", error);
        useFallbackPlantImage();
    }
}

/**
 * Display fallback image when camera photo is unavailable
 */
function useFallbackPlantImage() {
    const imgElement = document.getElementById("plantImage");
    const captureTimeEl = document.getElementById("captureTime");
    
    if (!appState.activePlant) return;
    
    imgElement.src = appState.activePlant.image;
    captureTimeEl.textContent = "N/A (Using fallback)";
    console.log("📷 Using fallback image for", appState.activePlant.name);
}

/**
 * Fetch and display real YOLO detection results from backend
 */
async function refreshYoloResults() {
    const plantTypeEl = document.getElementById("plantType");
    const confidenceEl = document.getElementById("confidence");
    const healthStatusEl = document.getElementById("healthStatus");
    const diseaseClassEl = document.getElementById("diseaseClass");
    const recommendationEl = document.getElementById("recommendation");
    
    if (!plantTypeEl || !confidenceEl) return;

    try {
        const result = await apiCall("/camera/detection");

        if (result.status === "success" && result.data) {
            const detection = result.data;
            
            // Update UI with real detection results
            plantTypeEl.textContent = detection.plant_type.charAt(0).toUpperCase() + detection.plant_type.slice(1);
            confidenceEl.textContent = detection.confidence;
            healthStatusEl.textContent = detection.health_status;
            diseaseClassEl.textContent = detection.disease_class;
            recommendationEl.textContent = detection.recommendation;
            
            // Update system status based on health
            const statusType = detection.health_status === "Healthy" ? "healthy" : 
                             detection.health_status === "Warning" ? "warning" : "alert";
            setSystemStatus(`Plant Status: ${detection.health_status}`, statusType);
            
            console.log("✅ YOLO results updated:", detection);
        } else {
            // Use fallback values if no detection available
            plantTypeEl.textContent = appState.activePlant?.name || "Unknown";
            confidenceEl.textContent = "N/A";
            healthStatusEl.textContent = "Monitoring...";
            diseaseClassEl.textContent = "Waiting for analysis...";
            recommendationEl.textContent = "Processing first detection...";
            console.log("📊 No detection data yet, using defaults");
        }
    } catch (error) {
        console.warn("Failed to fetch YOLO detection results:", error);
        // Gracefully handle errors - keep showing previous values
    }
}
// ==========================================
// 5. CHART & CHAT LOGIC
// ==========================================

function initChart() {
    const ctx = document.getElementById("trendChart").getContext("2d");
    trendChart = new Chart(ctx, {
        type: "line",
        data: { labels: [], datasets: [{ label: "Loading...", data: [], tension: 0.3, fill: false, borderColor: '#2e7d32' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
    });
}

function updateChart() {
    if (!trendChart || appState.history.length === 0 || !appState.activePlant) return;

    const metric = appState.chartMetric;
    const labels = appState.history.map(row => {
        if (!row.timestamp) return "Unknown";
        const d = new Date(row.timestamp);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    const dataPoints = appState.history.map(row => row[metric] || 0);
    const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1);

    // Calculate dynamic y-axis max based on actual data
    const maxDataValue = Math.max(...dataPoints);
    const yAxisMax = Math.ceil(maxDataValue * 1.2);

    trendChart.data.labels = labels;
    trendChart.data.datasets[0].label = `${appState.activePlant.name} - ${metricLabel}`;
    trendChart.data.datasets[0].data = dataPoints;
    trendChart.options.scales.y.max = yAxisMax;
    trendChart.update();
}

async function sendMessage() {
    const input = document.getElementById("chatInput");
    const chatBox = document.getElementById("chatBox");
    const text = input.value.trim();
    if (!text) return;

    // Render User Message
    chatBox.innerHTML += `<div class="chat-message user">${text}</div>`;
    input.value = "";

    // Render Loading
    const loadingId = "loading-" + Date.now();
    chatBox.innerHTML += `<div class="chat-message plant" id="${loadingId}">🌱 thinking...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    // Construct Context strictly from appState, not by scraping the DOM
    const contextStr = `Name: ${appState.activePlant?.name || 'Unknown'}, Temp: ${appState.sensor.temperature}°C, Hum: ${appState.sensor.humidity}%`;

    try {
        const data = await apiCall("/chat", "POST", {
            message: `User message: ${text}\nPlant info: ${contextStr}`
        });
        
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="chat-message plant">${data.reply || data.error || "No valid reply returned."}</div>`;
    } catch (error) {
        console.error("Chat fetch error:", error);
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="chat-message plant">⚠️ Cannot reach the AI. Please check your connection.</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById("chatInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// ==========================================
// 6. BOOTSTRAP
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    initChart();
    
    // Set initial active plant before fetching data
    document.getElementById("plantSelect").value = "pothos"; 
    changePlant(); 
    
    // Initial fetch of all real data
    await fetchAllData();
    
    // Fetch real plant photo and YOLO detection results
    await refreshPlantPhoto();
    await refreshYoloResults();

    // Start polling loop
    setInterval(async () => {
        try {
            const latest = await apiCall("/sensor/latest");
            appState.sensor = latest;
            setSystemStatus("Online & Monitoring", "healthy");
        } catch (err) {
            setSystemStatus("Backend Unavailable", "alert");
        }
        renderSystemStatus();
        renderEnvironment();
        
        // Refresh plant photo and detection every interval
        await refreshPlantPhoto();
        await refreshYoloResults();
        
    }, REFRESH_INTERVAL_MS);
});