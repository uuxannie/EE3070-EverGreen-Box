let todayWaterCount = 2;
let todayLightCount = 1;
let todayVentCount = 1;

const plantData = {
    cactus: {
        name: "Cactus",
        confidence: "96%",
        image:
            "https://static.planetminecraft.com/files/image/minecraft/texture-pack/2023/003/16489908-remodeledcactusicon_l.webp",
        personality: "calm and a little aloof",
        greeting:
            "Hello, I’m your Cactus. I prefer dry soil and a bit of personal space 🌵",
        report:
            "This week, the cactus remained stable. Soil moisture stayed mostly within the preferred low range. No major disease risk was detected. Recommendation: avoid overwatering and maintain good light exposure.",
        advice:
            "Cactus prefers less frequent watering. Keep soil relatively dry between waterings.",
        chart: {
            soil: [22, 25, 21, 24, 20, 23, 21],
            temperature: [26, 27, 27, 28, 27, 26, 27],
            light: [720, 750, 710, 770, 760, 740, 735],
            health: [92, 93, 92, 94, 93, 94, 95]
        }
    },
    succulent: {
        name: "Succulent",
        confidence: "94%",
        image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZ5mV5N0Kt81Lv7CzONjqdBbQkeS-fSY374w&s",
        personality: "gentle and easygoing",
        greeting:
            "Hi, I’m your Succulent. I like bright light and careful watering 🌱",
        report:
            "This week, the succulent remained healthy overall. Light levels were stable, and only one mild drop in soil moisture triggered watering. Recommendation: continue moderate watering and ensure sufficient sunlight.",
        advice:
            "Succulent likes bright light and moderate watering. Avoid soggy soil.",
        chart: {
            soil: [36, 39, 34, 37, 33, 35, 38],
            temperature: [24, 25, 25, 26, 25, 24, 25],
            light: [610, 650, 620, 670, 640, 630, 645],
            health: [90, 91, 92, 92, 91, 93, 93]
        }
    },
    pothos: {
        name: "Pothos",
        confidence: "95%",
        image:
            "https://www.guide-to-houseplants.com/images/golden-pothos.jpg",
        personality: "friendly and talkative",
        greeting:
            "Hi! I’m your Pothos. Thanks for checking on me today 🌿",
        report:
            "This week, the pothos remained generally healthy. Soil moisture dropped below the threshold twice, triggering automatic watering. Light exposure was stable overall. No disease risk was detected. Recommendation: maintain the current watering schedule and continue automatic monitoring.",
        advice:
            "Pothos enjoys steady moisture and indirect light. Keep the environment stable.",
        chart: {
            soil: [42, 45, 40, 43, 38, 41, 44],
            temperature: [24, 25, 25, 26, 24, 25, 25],
            light: [480, 520, 500, 540, 510, 495, 525],
            health: [88, 89, 90, 91, 89, 90, 92]
        }
    }
};

const labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
let trendChart;
let currentMetric = "soil";

function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function updateSystemStatus(text, type = "healthy") {
    const status = document.getElementById("systemStatus");
    status.textContent = `System Status: ${text}`;
    status.classList.remove("warning", "alert");

    if (type === "warning") {
        status.classList.add("warning");
    } else if (type === "alert") {
        status.classList.add("alert");
    }
}

function addCareRecord(action, trigger) {
    const tableBody = document.getElementById("careTableBody");
    const row = document.createElement("tr");
    row.innerHTML = `
    <td>${getCurrentTime()}</td>
    <td>${action}</td>
    <td>${trigger}</td>
  `;
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
    document.getElementById("soilMoisture").textContent = "55%";
    document.getElementById("currentAdvice").textContent =
        "Watering completed. Soil moisture has improved.";
    document.getElementById("recommendation").textContent =
        "Moisture restored. Continue monitoring.";
    addCareRecord("Manual watering", "User command");
    updateSystemStatus("Watering completed", "healthy");
    refreshSummaryCounts();
}

function turnOnLight() {
    todayLightCount++;
    document.getElementById("lightLevel").textContent = "760 lux";
    document.getElementById("currentAdvice").textContent =
        "Supplemental light activated to improve light exposure.";
    addCareRecord("Manual light on", "User command");
    updateSystemStatus("Supplemental lighting active", "healthy");
    refreshSummaryCounts();
}

function turnOnFan() {
    todayVentCount++;
    document.getElementById("temperature").textContent = "24°C";
    document.getElementById("currentAdvice").textContent =
        "Ventilation started to reduce temperature and improve airflow.";
    addCareRecord("Manual fan on", "User command");
    updateSystemStatus("Ventilation active", "healthy");
    refreshSummaryCounts();
}

function simulateAutoCare() {
    const actions = [
        {
            action: "Auto watering",
            trigger: "Soil moisture below threshold",
            advice: "Automatic watering triggered due to dry soil."
        },
        {
            action: "Shade deployed",
            trigger: "Excessive light intensity",
            advice: "Shading activated to protect the plant from excessive light."
        },
        {
            action: "Fan activated",
            trigger: "Temperature above threshold",
            advice: "Ventilation started automatically due to high temperature."
        }
    ];

    const pick = actions[Math.floor(Math.random() * actions.length)];

    if (pick.action.includes("watering")) {
        todayWaterCount++;
        document.getElementById("soilMoisture").textContent = "50%";
    } else if (pick.action.includes("Shade")) {
        todayLightCount++;
        document.getElementById("lightLevel").textContent = "430 lux";
    } else {
        todayVentCount++;
        document.getElementById("temperature").textContent = "24°C";
    }

    document.getElementById("currentAdvice").textContent = pick.advice;
    addCareRecord(pick.action, pick.trigger);
    updateSystemStatus("Automatic care action executed", "healthy");
    refreshSummaryCounts();
}

function simulateHealthy() {
    document.getElementById("healthStatus").textContent = "Healthy";
    document.getElementById("diseaseClass").textContent = "Healthy";
    document.getElementById("recommendation").textContent = "No action needed";
    document.getElementById("currentAdvice").textContent =
        "AI indicates healthy appearance. Continue current care plan.";
    updateSystemStatus("Healthy", "healthy");
}

function simulateYellowing() {
    document.getElementById("healthStatus").textContent = "Warning";
    document.getElementById("diseaseClass").textContent = "Yellowing";
    document.getElementById("recommendation").textContent =
        "Possible nutrient/light issue. Inspect watering and light conditions.";
    document.getElementById("currentAdvice").textContent =
        "AI detected yellowing. Check light level and watering balance.";
    addCareRecord("AI warning issued", "Yellowing detected from webcam");
    updateSystemStatus("Yellowing detected", "warning");
}

function simulateRotRisk() {
    document.getElementById("healthStatus").textContent = "Alert";
    document.getElementById("diseaseClass").textContent = "Dark-spot / Rot risk";
    document.getElementById("recommendation").textContent =
        "Reduce watering and improve ventilation. Inspect for fungal infection.";
    document.getElementById("currentAdvice").textContent =
        "AI detected possible rot risk. Reduce moisture and improve airflow.";
    addCareRecord("AI alert issued", "Dark-spot / Rot risk detected");
    updateSystemStatus("Disease risk detected", "alert");
}

function changePlant() {
    const selected = document.getElementById("plantSelect").value;
    const data = plantData[selected];

    document.getElementById("plantType").textContent = data.name;
    document.getElementById("confidence").textContent = data.confidence;
    document.getElementById("plantImage").src = data.image;
    document.getElementById("weeklyReport").textContent = data.report;
    document.getElementById("currentAdvice").textContent = data.advice;

    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = `
    <div class="chat-message plant">${data.greeting}</div>
    <div class="chat-message plant">My personality is ${data.personality}, so please take good care of me.</div>
  `;

    if (selected === "cactus") {
        document.getElementById("soilMoisture").textContent = "24%";
        document.getElementById("lightLevel").textContent = "740 lux";
        document.getElementById("humidity").textContent = "40%";
        document.getElementById("temperature").textContent = "27°C";
    } else if (selected === "succulent") {
        document.getElementById("soilMoisture").textContent = "36%";
        document.getElementById("lightLevel").textContent = "640 lux";
        document.getElementById("humidity").textContent = "50%";
        document.getElementById("temperature").textContent = "25°C";
    } else {
        document.getElementById("soilMoisture").textContent = "42%";
        document.getElementById("lightLevel").textContent = "520 lux";
        document.getElementById("humidity").textContent = "68%";
        document.getElementById("temperature").textContent = "25°C";
    }

    simulateHealthy();
    loadChart(currentMetric);
}

function getCurrentPlantKey() {
    return document.getElementById("plantSelect").value;
}

function getMetricLabel(metric) {
    if (metric === "soil") return "Soil Moisture";
    if (metric === "temperature") return "Temperature";
    if (metric === "light") return "Light Intensity";
    return "Health Score";
}

function loadChart(metric) {
    currentMetric = metric;
    const plantKey = getCurrentPlantKey();
    const data = plantData[plantKey].chart[metric];
    const label = getMetricLabel(metric);

    if (trendChart) {
        trendChart.destroy();
    }

    const ctx = document.getElementById("trendChart").getContext("2d");
    trendChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: `${plantData[plantKey].name} - ${label}`,
                    data: data,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

function sendMessage() {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text) return;

    const chatBox = document.getElementById("chatBox");

    const userMsg = document.createElement("div");
    userMsg.className = "chat-message user";
    userMsg.textContent = text;
    chatBox.appendChild(userMsg);

    const plantKey = getCurrentPlantKey();
    const plantName = plantData[plantKey].name;
    const soil = document.getElementById("soilMoisture").textContent;
    const temp = document.getElementById("temperature").textContent;
    const humidity = document.getElementById("humidity").textContent;
    const disease = document.getElementById("diseaseClass").textContent;

    let reply = "";

    if (text.toLowerCase().includes("how are you") || text.includes("怎么样") || text.includes("还好吗")) {
        reply = `I’m Mr. ${plantName}, and I’m feeling okay today. My soil moisture is ${soil}, temperature is ${temp}, and humidity is ${humidity}. It's quite comfy here~ I'm happy that you come to visit me. ^v^`;
    } else if (text.toLowerCase().includes("water") || text.includes("浇水")) {
        reply = `As a ${plantName}, I’m currently seeing soil moisture at ${soil}. Do you think I need more water? Don't forget to stay hydrated yourself as well!`;
    } else if (text.toLowerCase().includes("health") || text.includes("健康") || text.includes("病")) {
        reply = `My latest AI health result is: ${disease}. Please keep monitoring me carefully. I would feel more at ease if you could stay with me more or play your favorite music for me~`;
    } else {
        reply = `Hello from your ${plantName}! Based on today’s environment, I’ll keep growing as long as you continue caring for me 🌿`;
    }

    const plantMsg = document.createElement("div");
    plantMsg.className = "chat-message plant";
    plantMsg.textContent = reply;
    chatBox.appendChild(plantMsg);

    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
}

function fakeSensorRefresh() {
    const plantKey = getCurrentPlantKey();

    if (plantKey === "cactus") {
        const humidity = 35 + Math.floor(Math.random() * 8);
        const temperature = 26 + Math.floor(Math.random() * 3);
        document.getElementById("humidity").textContent = `${humidity}%`;
        document.getElementById("temperature").textContent = `${temperature}°C`;
    } else if (plantKey === "succulent") {
        const humidity = 45 + Math.floor(Math.random() * 10);
        const temperature = 24 + Math.floor(Math.random() * 3);
        document.getElementById("humidity").textContent = `${humidity}%`;
        document.getElementById("temperature").textContent = `${temperature}°C`;
    } else {
        const humidity = 60 + Math.floor(Math.random() * 12);
        const temperature = 24 + Math.floor(Math.random() * 3);
        document.getElementById("humidity").textContent = `${humidity}%`;
        document.getElementById("temperature").textContent = `${temperature}°C`;
    }
}

document.getElementById("chatInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

refreshSummaryCounts();
changePlant();
setInterval(fakeSensorRefresh, 5000);
