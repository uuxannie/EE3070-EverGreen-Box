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
        moisture: null,
        light: null
    },
    deviceStats: {
        water_pump: 0,
        grow_light: 0,
        fan: 0
    },
    history: [],
    chartMetric: "moisture",
    activePlant: null,
    latestPhotoUrl: null
};

// Fallback plant profiles (Ideally, fetch these from /api/plants in the future)
const plantProfiles = {
    cactus: {
        name: "Cactus", confidence: "96%",
        image: "https://static.planetminecraft.com/files/image/minecraft/texture-pack/2023/003/16489908-remodeledcactusicon_l.webp",
        report: "This week, the cactus remained stable. Soil moisture stayed mostly within the preferred low range. Recommendation: avoid overwatering."
    },
    succulent: {
        name: "Succulent", confidence: "94%",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZ5mV5N0Kt81Lv7CzONjqdBbQkeS-fSY374w&s",
        report: "This week, the succulent remained healthy overall. Light levels were stable. Recommendation: continue moderate watering."
    },
    pothos: {
        name: "Pothos", confidence: "95%",
        image: "https://www.guide-to-houseplants.com/images/golden-pothos.jpg",
        report: "This week, the pothos remained generally healthy. Recommendation: maintain the current watering schedule and continue automatic monitoring."
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
        await apiCall("/device/command", "POST", { target, action });
        
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
const waterPlant = () => executeDeviceCommand("water_pump", "on", "Watering sequence initiated. Soil moisture should improve soon.");
const turnOnLight = () => executeDeviceCommand("grow_light", "on", "Supplemental light activated for optimal photosynthesis.");
const turnOnFan = () => executeDeviceCommand("fan", "on", "Ventilation started to regulate temperature and airflow.");

// Simulation helpers (For UI testing without backend action)
function simulateAutoCare() {
    addCareRecord("Auto Care (Sim)", "Timer/Threshold");
    document.getElementById("currentAdvice").textContent = "Simulated Auto Care executed.";
}

function updateHealthSimulation(status, diseaseClass, recommendation, type) {
    document.getElementById("healthStatus").textContent = status;
    document.getElementById("diseaseClass").textContent = diseaseClass;
    document.getElementById("recommendation").textContent = recommendation;
    setSystemStatus(status === "Healthy" ? "Healthy" : `${diseaseClass} detected`, type);
    renderSystemStatus();
}

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
    const { temperature, humidity, moisture, light } = appState.sensor;
    
    document.getElementById("temperature").textContent = temperature != null ? `${temperature}°C` : "--°C";
    document.getElementById("humidity").textContent = humidity != null ? `${humidity}%` : "--%";
    document.getElementById("soilMoisture").textContent = moisture != null ? `${moisture}%` : "--%";
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
    if (!imgElement) return;

    try {
        const response = await fetch("https://evergreen-box-backend.onrender.com/api/camera/latest");
        const result = await response.json();

        if (result.status === "success" && result.data) {
            const fullUrl = "https://evergreen-box-backend.onrender.com" + result.data.image_url;
            
            // --- 关键修改：直接暴力修改 src，不经过任何 if 判断 ---
            const finalUrl = fullUrl + "?t=" + new Date().getTime();
            imgElement.src = finalUrl;
            
            // 为了确认真的执行了，我们在图片旁边打个日志
            console.log("🔥 强制覆盖！当前图片地址已修改为: ", finalUrl);
            
            // 顺便把那个 Waiting 删掉
            document.getElementById("captureTime").textContent = result.data.captured_at;
        }
    } catch (error) {
        console.error("❌ 自动刷新照片失败:", error);
    }
}
/*
async function refreshPlantPhoto() {
    const imgElement = document.getElementById("plantImage");
    if (!imgElement) return;

    try {
        const result = await apiCall("/camera/latest");

        if (result.status === "success" && result.data) {
            // 1. renew pic
            const relativeUrl = result.data.image_url;
            appState.latestPhotoUrl = relativeUrl; 

            const baseUrl = API_BASE_URL.replace("/api", "");
            imgElement.src = baseUrl + relativeUrl + "?t=" + new Date().getTime();
            
            // 2. renew capture time
            document.getElementById("captureTime").textContent = result.data.captured_at;
            
            // 💡 这里的 Confidence 目前还是用你字典里写死的 (例如 95%)
            // 等你同学的 YOLO 连上后端了，你可以改成: result.data.yolo_confidence
            if (appState.activePlant) {
                document.getElementById("confidence").textContent = appState.activePlant.confidence;
            }

        } else {
            // no photo available, use fallback
            if (appState.activePlant) {
                imgElement.src = appState.activePlant.image;
                document.getElementById("captureTime").textContent = "N/A (Using fallback image)";
            }
        }
    } catch (error) {
        console.error("failed to fetch latest photo:", error);
    }
}
*/
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
    const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1).replace("moisture", "Soil Moisture");

    trendChart.data.labels = labels;
    trendChart.data.datasets[0].label = `${appState.activePlant.name} - ${metricLabel}`;
    trendChart.data.datasets[0].data = dataPoints;
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
    const contextStr = `Name: ${appState.activePlant?.name || 'Unknown'}, Soil: ${appState.sensor.moisture}%, Temp: ${appState.sensor.temperature}°C, Hum: ${appState.sensor.humidity}%`;

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
    }, REFRESH_INTERVAL_MS);
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
    
    // 👇 新增 1：网页刚打开时，立刻去拉取一次云端真实照片！
    refreshPlantPhoto();

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
        
        // 👇 新增 2：每 10 秒钟，自动刷新一次照片！
        refreshPlantPhoto();
        
    }, REFRESH_INTERVAL_MS);
});