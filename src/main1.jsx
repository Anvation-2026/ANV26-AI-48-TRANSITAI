import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import heroImage from "./assets/transit-hero.png";

// ================= SMS CONFIG =================
const SMS_API = import.meta.env.VITE_SMS_API || "http://localhost:3001";
const ALERT_PHONE = "+919141970488"; // authority number (Twilio trial: must be a verified number)

async function sendSms(to, message) {
  const response = await fetch(`${SMS_API}/api/send-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, message }),
  });
  return response.json();
}

const buildAlertMessage = (route) =>
  `TRANSITAI CRITICAL ALERT\nRoute ${route.number}: ${route.name}\nPassengers: ${route.tickets}/${route.capacity}\nRisk: CRITICAL\nImmediate action required.`;

function App() {
  const [active, setActive] = useState("Dashboard");
  const [buses, setBuses] = useState(24);
  const [weather, setWeather] = useState(20);
  const [alertVisible, setAlertVisible] = useState(true);
  const [selectedBus, setSelectedBus] = useState("B12");
  // ================= FORECAST + AI ALLOCATION =================

const [forecastRoute, setForecastRoute] = useState("201");
const [forecastWindow, setForecastWindow] = useState("60");
const [allocatedBuses, setAllocatedBuses] = useState([]);
const [allocationApplied, setAllocationApplied] = useState(false);

// Forecast calculation
const forecastData = routeStats.map((route) => {
  const weatherFactor = weather / 100;

  const predictedDemand = Math.round(
    route.tickets +
      route.tickets * 0.12 +
      route.tickets * weatherFactor * 0.08
  );

  const predictedOccupancy = Math.round(
    (predictedDemand / route.capacity) * 100
  );

  let forecastRisk = "NORMAL";

  if (predictedOccupancy >= 100) {
    forecastRisk = "CRITICAL";
  } else if (predictedOccupancy >= 85) {
    forecastRisk = "HIGH";
  } else if (predictedOccupancy >= 65) {
    forecastRisk = "MEDIUM";
  }

  const busesRequired = Math.max(
    0,
    Math.ceil(predictedDemand / route.capacity) - 1
  );

  return {
    ...route,
    predictedDemand,
    predictedOccupancy,
    forecastRisk,
    busesRequired,
  };
});

// AI priority scoring
const allocationRecommendations = forecastData
  .map((route) => {
    const demandScore = Math.min(
      40,
      Math.round(route.predictedOccupancy * 0.4)
    );

    const occupancyScore = Math.min(
      30,
      Math.round(route.occupancy * 0.3)
    );

    const riskScore =
      route.forecastRisk === "CRITICAL"
        ? 30
        : route.forecastRisk === "HIGH"
        ? 22
        : route.forecastRisk === "MEDIUM"
        ? 12
        : 5;

    const priorityScore = Math.min(
      100,
      demandScore + occupancyScore + riskScore
    );

    return {
      ...route,
      priorityScore,
    };
  })
  .sort((a, b) => b.priorityScore - a.priorityScore);

const totalRecommendedBuses = allocationRecommendations.reduce(
  (sum, route) => sum + route.busesRequired,
  0
);
  // ================= AUTHORITY NOTIFICATION SYSTEM =================

const [notifications, setNotifications] = useState([
  {
    id: 1,
    severity: "CRITICAL",
    route: "201",
    message: "Occupancy reached 94%. Immediate action recommended.",
    time: "Just now",
    status: "PENDING",
  },
  {
    id: 2,
    severity: "WARNING",
    route: "500",
    message: "Passenger demand is approaching high-risk level.",
    time: "5 min ago",
    status: "MONITORING",
  },
]);

const authorityContacts = [
  {
    id: "ops",
    name: "Network Operations Manager",
    role: "Operations Control",
    phone: "+91 XXXXX XXXXX",
    routes: ["ALL"],
    alertLevel: "CRITICAL",
  },
  {
    id: "r201",
    name: "Route 201 Supervisor",
    role: "Route Supervisor",
    phone: "+91 XXXXX XXXXX",
    routes: ["201"],
    alertLevel: "WARNING",
  },
  {
    id: "r500",
    name: "Route 500 Supervisor",
    role: "Route Supervisor",
    phone: "+91 XXXXX XXXXX",
    routes: ["500"],
    alertLevel: "WARNING",
  },
  {
    id: "depot",
    name: "Electronic City Depot Manager",
    role: "Depot Operations",
    phone: "+91 XXXXX XXXXX",
    routes: ["201"],
    alertLevel: "CRITICAL",
  },
];
 const scenarios = [
  [
    {
      number: "201",
      name: "Majestic → Electronic City",
      tickets: 65,
      capacity: 50,
    },
    {
      number: "500",
      name: "KR Market → Silk Board",
      tickets: 52,
      capacity: 50,
    },
    {
      number: "335",
      name: "Shivajinagar → Whitefield",
      tickets: 28,
      capacity: 50,
    },
    {
      number: "G1",
      name: "Yeshwanthpur → Jayanagar",
      tickets: 18,
      capacity: 50,
    },
  ],

  [
    {
      number: "201",
      name: "Majestic → Electronic City",
      tickets: 38,
      capacity: 50,
    },
    {
      number: "500",
      name: "KR Market → Silk Board",
      tickets: 67,
      capacity: 50,
    },
    {
      number: "335",
      name: "Shivajinagar → Whitefield",
      tickets: 48,
      capacity: 50,
    },
    {
      number: "G1",
      name: "Yeshwanthpur → Jayanagar",
      tickets: 25,
      capacity: 50,
    },
  ],
];

const [scenarioIndex, setScenarioIndex] = useState(0);
const [simulationRunning, setSimulationRunning] = useState(false);

const routes = scenarios[scenarioIndex];
// ================= AUTOMATIC SCENARIO ENGINE =================

const lastAlertedScenario = useRef(null);

// Change scenario every 10 seconds
useEffect(() => {
  if (!simulationRunning) {
    return;
  }

  const scenarioTimer = setInterval(() => {
    setScenarioIndex((current) => (current + 1) % scenarios.length);
  }, 10000);

  return () => clearInterval(scenarioTimer);
}, [simulationRunning]);
// Automatically notify authority when a route becomes critical
useEffect(() => {
  if (!simulationRunning) {
    return;
  }

  // Prevent sending the same scenario repeatedly
  if (lastAlertedScenario.current === scenarioIndex) {
    return;
  }

  lastAlertedScenario.current = scenarioIndex;

  // Find routes with more than 60 passengers
  const criticalRoutes = routes.filter(
    (route) => route.tickets > 60
  );

  criticalRoutes.forEach(async (route) => {
    try {
      const result = await sendSms(ALERT_PHONE, buildAlertMessage(route));

      if (result.success) {
        setNotifications((current) => [
          ...current,
          {
            id: Date.now(),
            severity: "CRITICAL",
            route: route.number,
            message: `Automatic SMS sent. Passengers: ${route.tickets}/${route.capacity}.`,
            time: "Just now",
            status: "AUTHORITY NOTIFIED",
          },
        ]);

        console.log(
          `Automatic SMS sent for Route ${route.number}`
        );
      } else {
        console.error(
          `SMS failed for Route ${route.number}:`,
          result.error
        );
      }
    } catch (error) {
      console.error(
        `Unable to send automatic SMS for Route ${route.number}:`,
        error
      );
    }
  });
}, [simulationRunning, scenarioIndex]);






const getOccupancy = (tickets, capacity) => {
  return Math.round((tickets / capacity) * 100);
};

const getRisk = (tickets) => {
  if (tickets > 60) return "CRITICAL";
  if (tickets > 40) return "WARNING";
  return "NORMAL";
};
const routeStats = routes.map((route) => {
  const occupancy = getOccupancy(route.tickets, route.capacity);
 const risk = getRisk(route.tickets);

  return {
    ...route,
    occupancy,
    risk,
  };
});

const highRiskRoutes = routeStats.filter(
  (route) => route.risk === "HIGH" || route.risk === "CRITICAL"
);

const warningRoutes = routeStats.filter(
  (route) => route.risk === "WARNING"
);

const normalRoutes = routeStats.filter(
  (route) => route.risk === "NORMAL"
);

const criticalRoutes = routeStats.filter(
  (route) => route.risk === "CRITICAL"
);

const totalTickets = routeStats.reduce(
  (sum, route) => sum + route.tickets,
  0
);

const totalCapacity = routeStats.reduce(
  (sum, route) => sum + route.capacity,
  0
);

const averageOccupancy = Math.round(
  (totalTickets / totalCapacity) * 100
);

const availableCapacity = totalCapacity - totalTickets;

const recommendedBuses = highRiskRoutes.length;

  const menu = [
  "Dashboard",
  "Route Monitor",
  "Forecast",
  "AI Allocation",
  "Authority Alerts",
];

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🚌</div>
          <div>
            <h2>TransitAI</h2>
            <span>OPERATIONS CENTER</span>
          </div>
        </div>

        <div className="menu-title">MAIN</div>

        {menu.map((item) => (
          <button
            key={item}
            className={`menu-item ${active === item ? "active" : ""}`}
            onClick={() => setActive(item)}
          >
            <span>
              {item === "Dashboard" && "▦"}
              {item === "Route Monitor" && "⌖"}
              {item === "Forecast" && "▥"}
              {item === "AI Allocation" && "✦"}
              {item === "Authority Alerts" && "🔔"}
            </span>
            {item}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="live-dot"></div>
          <div>
           <strong>
  {simulationRunning ? "System Active" : "Simulation Paused"}
</strong>

<small>
  {simulationRunning
    ? "AI simulation running"
    : "Automatic alerts stopped"}
</small>

<button
  onClick={() => {
  if (!simulationRunning) {
    lastAlertedScenario.current = null;
  }

  setSimulationRunning((current) => !current);
}}
  style={{
    marginTop: "10px",
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: simulationRunning ? "#7f1d1d" : "#065f46",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
  }}
>
  {simulationRunning ? "⏹ STOP SIMULATION" : "▶ START SIMULATION"}
</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">

        {/* HERO */}
        <section
          className="hero"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="hero-overlay"></div>

          <div className="hero-content">
            <div className="hero-badge">● LIVE TRANSPORT INTELLIGENCE</div>

            <h1>Smarter Public Transport.<br />
              <span>Better Cities.</span>
            </h1>

            <p>
              Predict demand, detect overcrowding and intelligently
              allocate buses before congestion happens.
            </p>

            <div className="hero-buttons">
              <button
                onClick={() => setActive("Route Monitor")}
                className="primary-btn"
              >
                Explore Network →
              </button>

              <button
                className="glass-btn"
                onClick={() => {
                  setActive("Dashboard");
                  setTimeout(() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" }), 50);
                }}
              >
                View Dashboard ↓
              </button>
            </div>
          </div>

          <div className="hero-stat">
            <strong>24</strong>
            <span>Active Buses</span>
          </div>
        </section>

        {/* HEADER */}
        {active === "Dashboard" && (
  <>
    {/* HEADER */}
    <div id="dashboard" className="page-header">
          <div>
            <div className="eyebrow">TRANSPORT INTELLIGENCE PLATFORM</div>
            <h2>{active}</h2>
            <p>Real-time network overview and AI-powered decisions.</p>
          </div>

          <div className="status">
            <span></span>
            Simulation Live
          </div>
        </div>

        {/* METRICS */}
      {/* METRICS */}
<section className="metrics">

  <div className="metric-card">
    <div className="metric-top">
      <span>Network Occupancy</span>
      <b>◉</b>
    </div>

    <strong>{averageOccupancy}%</strong>

    <small>Average across monitored routes</small>

    <div className="positive">
      ● {normalRoutes.length} route operating normally
    </div>
  </div>


  <div className="metric-card danger">
    <div className="metric-top">
      <span>High-Risk Routes</span>
      <b>⚠</b>
    </div>

    <strong>{highRiskRoutes.length}</strong>

    <small>
      {criticalRoutes.length > 0
        ? `${criticalRoutes.length} critical • immediate action`
        : "routes requiring attention"}
    </small>

    <div className="progress">
      <i
        style={{
          width: `${Math.min(100, averageOccupancy)}%`,
        }}
      ></i>
    </div>
  </div>


  <div className="metric-card">
    <div className="metric-top">
      <span>Available Capacity</span>
      <b>🚌</b>
    </div>

    <strong>{availableCapacity}</strong>

    <small>Passenger spaces remaining</small>

    <div className="positive">
      ● Across monitored routes
    </div>
  </div>


  <div
  className="metric-card ai"
  onClick={() => setActive("AI Allocation")}
  style={{ cursor: "pointer" }}
>
 <div className="metric-top">
  <span>AI Fleet Allocation</span>
  <b>✦</b>
</div>

<strong>+{recommendedBuses}</strong>

<small>
  {recommendedBuses === 1 ? "bus" : "buses"} available for redistribution
</small>

<div className="ai-label">
  ✦ AI RECOMMENDS DEPLOYMENT
</div>

<div className="ai-mini-action">
  Route 201 → Deploy {recommendedBuses} {recommendedBuses === 1 ? "bus" : "buses"}
</div>




</div>
   </section>

        {/* SIMULATOR */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <div className="panel-icon">⚡</div>
              <div>
                <h3>Scenario Simulator</h3>
                <p>Test how unexpected conditions affect transport demand.</p>
              </div>
            </div>

            <button
              className="reset"
              onClick={() => {
                setBuses(24);
                setWeather(20);
              }}
            >
              Reset
            </button>
          </div>

          <div className="controls">

            <div className="control">
              <label>Available buses</label>
              <div className="control-value">{buses}</div>
              <input
                type="range"
                min="5"
                max="50"
                value={buses}
                onChange={(e) => setBuses(Number(e.target.value))}
              />
            </div>

            <div className="control">
              <label>Weather impact</label>
              <div className="control-value">{weather}%</div>
              <input
                type="range"
                min="0"
                max="100"
                value={weather}
                onChange={(e) => setWeather(Number(e.target.value))}
              />
            </div>

          </div>
        </section>

        {/* ROUTES */}
        <section className="panel">
          <div className="panel-heading simple">
            <div>
              <h3>Route Risk Monitor</h3>
              <p>Predicted demand compared with available route capacity.</p>
            </div>
            <span className="view">View network →</span>
          </div>

          {alertVisible && (
  <div className="live-alert">
    <div className="alert-left">
      <div className="alert-icon">!</div>

      <div>
        <div className="alert-title">
          HIGH OVERCROWDING DETECTED
        </div>

        <div className="alert-route">
          Route 201 • Majestic → Electronic City
        </div>

        <div className="alert-details">
          Occupancy: <strong>94%</strong>
          <span>•</span>
          Capacity: <strong>50 passengers</strong>
          <span>•</span>
          Status: <strong>HIGH RISK</strong>
        </div>

        <div className="alert-action">
          AI Recommendation: Deploy 1 additional bus
        </div>
      </div>
    </div>

    <button
      className="alert-dismiss"
      onClick={() => setAlertVisible(false)}
    >
      ACKNOWLEDGE
    </button>
  </div>
)}<div className="routes">

{routes.map((route) => {
  const occupancy = getOccupancy(route.tickets, route.capacity);
const risk = getRisk(route.tickets);

  return (
    <div className={`route route-${risk.toLowerCase()}`} key={route.number}>

      <div className="route-info">
        <div className="route-title">
          <strong>{route.number}</strong>
          <span>{route.name}</span>
        </div>

        <div
  style={{
    width: "100%",
    height: "8px",
    marginTop: "12px",
    background: "#e5edf1",
    borderRadius: "20px",
    overflow: "hidden"
  }}
>
  <div
    style={{
      width: `${Math.min(occupancy, 100)}%`,
      height: "100%",
      background:
        risk === "CRITICAL"
          ? "#dc2626"
          : risk === "HIGH"
          ? "#ef4444"
          : risk === "WARNING"
          ? "#f59e0b"
          : "#10b981",
      borderRadius: "20px",
      transition: "width 0.5s ease"
    }}
  ></div>
</div>
      </div>

      <div className="route-number">
        {route.tickets} / {route.capacity}
        <small>passengers</small>
      </div>

      <div className={`risk ${risk.toLowerCase()}`}>
        {occupancy}% • {risk}
      </div>

    </div>
  );
})}

          </div>
        </section>
            </>
  )}

       {active === "Route Monitor" && (
  <section className="route-monitor-screen">
        

    {/* ROUTE MONITOR HEADER */}
    <div className="route-monitor-header">

      <div>
        <div className="eyebrow">
          LIVE OPERATIONS
        </div>

        <h2>
          Route Monitor <span>— Live Operations</span>
        </h2>

        <p>
          Real-time tracking of buses and passenger movement across the network.
        </p>
      </div>

      <div className="live-network-status">
        <span className="live-dot"></span>
        LIVE NETWORK
      </div>

    </div>


    {/* LIVE MAP */}
    <div className="operations-map">

      <div className="map-toolbar">

        <button>＋</button>
        <button>−</button>

        <div className="map-location">
          ◉ Bengaluru Network
        </div>

        <button className="traffic-active">
          ◉ Live Traffic
        </button>

      </div>


      {/* ROUTE LINES */}

      <svg
        className="route-map-svg"
        viewBox="0 0 1000 520"
        preserveAspectRatio="none"
      >

        <path
          d="M90 110 C210 150 260 250 390 210 C520 170 600 240 720 180 C820 130 900 180 950 250"
          className="map-route route-red"
        />

        <path
          d="M80 390 C190 320 250 410 370 350 C470 300 520 360 640 330 C760 300 850 350 930 400"
          className="map-route route-cyan"
        />

        <path
          d="M120 220 C250 180 330 270 450 300 C570 330 650 280 760 350 C830 390 900 370 950 430"
          className="map-route route-orange"
        />

        <path
          d="M100 450 C220 430 300 450 410 400 C530 350 620 420 750 390 C830 370 880 450 940 460"
          className="map-route route-green"
        />

      </svg>


      {/* STOPS */}

      <div className="map-stop stop-1">
        <span></span>
        Majestic
      </div>

      <div className="map-stop stop-2">
        <span></span>
        KR Market
      </div>

      <div className="map-stop stop-3">
        <span></span>
        Shivajinagar
      </div>

      <div className="map-stop stop-4">
        <span></span>
        Silk Board
      </div>

      <div className="map-stop stop-5">
        <span></span>
        Whitefield
      </div>


      {/* BUS B12 */}

      <button
        className={`map-bus bus-b12 ${
          selectedBus === "B12" ? "selected-bus" : ""
        }`}
        onClick={() => setSelectedBus("B12")}
      >
        <div className="bus-pulse"></div>

        <div className="bus-icon">
          🚌
        </div>

        <div className="bus-label">
          <strong>B12</strong>
          <small>47/50 • Route 201</small>
        </div>
      </button>


      {/* BUS B27 */}

      <button
        className={`map-bus bus-b27 ${
          selectedBus === "B27" ? "selected-bus" : ""
        }`}
        onClick={() => setSelectedBus("B27")}
      >
        <div className="bus-pulse"></div>

        <div className="bus-icon">
          🚌
        </div>

        <div className="bus-label">
          <strong>B27</strong>
          <small>32/50 • Route 201</small>
        </div>
      </button>


      {/* BUS B08 */}

      <button
        className={`map-bus bus-b08 ${
          selectedBus === "B08" ? "selected-bus" : ""
        }`}
        onClick={() => setSelectedBus("B08")}
      >
        <div className="bus-pulse"></div>

        <div className="bus-icon">
          🚌
        </div>

        <div className="bus-label">
          <strong>B08</strong>
          <small>36/50 • Route 335</small>
        </div>
      </button>


      {/* BUS B19 */}

      <button
        className={`map-bus bus-b19 ${
          selectedBus === "B19" ? "selected-bus" : ""
        }`}
        onClick={() => setSelectedBus("B19")}
      >
        <div className="bus-pulse"></div>

        <div className="bus-icon">
          🚌
        </div>

        <div className="bus-label">
          <strong>B19</strong>
          <small>46/50 • Route 500</small>
        </div>
      </button>


      {/* MAP LEGEND */}

      <div className="map-legend">

        <div>
          <i className="legend-red"></i>
          High Load
        </div>

        <div>
          <i className="legend-orange"></i>
          Delayed
        </div>

        <div>
          <i className="legend-green"></i>
          Normal
        </div>

      </div>

    </div>


    {/* SELECTED BUS */}

    <div className="selected-bus-strip">

      <div>
        <span className="selected-label">
          SELECTED VEHICLE
        </span>

        <h3>
          Bus {selectedBus}
        </h3>
      </div>

      <div className="selected-bus-info">

        {selectedBus === "B12" && (
          <>
            <span>
              Route <strong>201</strong>
            </span>

            <span>
              Load <strong>47 / 50</strong>
            </span>

            <span>
              Speed <strong>28 km/h</strong>
            </span>

            <span className="danger-text">
              HIGH LOAD
            </span>
          </>
        )}

        {selectedBus === "B27" && (
          <>
            <span>
              Route <strong>201</strong>
            </span>

            <span>
              Load <strong>32 / 50</strong>
            </span>

            <span>
              Speed <strong>36 km/h</strong>
            </span>

            <span className="success-text">
              ON TIME
            </span>
          </>
        )}

        {selectedBus === "B08" && (
          <>
            <span>
              Route <strong>335</strong>
            </span>

            <span>
              Load <strong>36 / 50</strong>
            </span>

            <span>
              Speed <strong>24 km/h</strong>
            </span>

            <span className="warning-text">
              DELAYED
            </span>
          </>
        )}

        {selectedBus === "B19" && (
          <>
            <span>
              Route <strong>500</strong>
            </span>

            <span>
              Load <strong>46 / 50</strong>
            </span>

            <span>
              Speed <strong>31 km/h</strong>
            </span>

            <span className="danger-text">
              HIGH LOAD
            </span>
          </>
        )}

      </div>

    </div>

  </section>
  )}
  {/* ================= FORECAST ================= */}

{active === "Forecast" && (
  <section className="forecast-screen">

    <div className="forecast-header">

      <div>
        <div className="eyebrow">
          PREDICTIVE TRANSPORT INTELLIGENCE
        </div>

        <h2>
          Demand Forecast <span>— AI Prediction</span>
        </h2>

        <p>
          Predict passenger demand and identify overcrowding before it happens.
        </p>
      </div>

      <div className="forecast-live">
        <span className="live-dot"></span>
        AI FORECAST ACTIVE
      </div>

    </div>


    {/* CONTROLS */}

    <div className="forecast-controls">

      <div className="forecast-control">

        <label>SELECT ROUTE</label>

        <select
          value={forecastRoute}
          onChange={(e) => setForecastRoute(e.target.value)}
        >
          {routes.map((route) => (
            <option
              key={route.number}
              value={route.number}
            >
              Route {route.number} — {route.name}
            </option>
          ))}
        </select>

      </div>


      <div className="forecast-control">

        <label>FORECAST WINDOW</label>

        <select
          value={forecastWindow}
          onChange={(e) => setForecastWindow(e.target.value)}
        >
          <option value="30">Next 30 Minutes</option>
          <option value="60">Next 60 Minutes</option>
          <option value="180">Next 3 Hours</option>
        </select>

      </div>

    </div>


    {(() => {

      const selectedForecast =
        forecastData.find(
          (route) => route.number === forecastRoute
        ) || forecastData[0];

      const demand = selectedForecast.predictedDemand;
      const occupancy = selectedForecast.predictedOccupancy;

      return (
        <>

          {/* FORECAST KPI CARDS */}

          <div className="forecast-metrics">

            <div className="forecast-card">

              <span>CURRENT DEMAND</span>

              <strong>
                {selectedForecast.tickets}
              </strong>

              <small>
                passengers
              </small>

            </div>


            <div className="forecast-card prediction">

              <span>PREDICTED DEMAND</span>

              <strong>
                {demand}
              </strong>

              <small>
                passengers
              </small>

            </div>


            <div className="forecast-card">

              <span>PREDICTED OCCUPANCY</span>

              <strong>
                {occupancy}%
              </strong>

              <div className="forecast-progress">
                <i
                  style={{
                    width: `${Math.min(
                      occupancy,
                      100
                    )}%`,
                  }}
                ></i>
              </div>

            </div>


            <div
              className={`forecast-card risk-card ${selectedForecast.forecastRisk.toLowerCase()}`}
            >

              <span>RISK LEVEL</span>

              <strong>
                {selectedForecast.forecastRisk}
              </strong>

              <small>
                AI classification
              </small>

            </div>

          </div>


          {/* DEMAND GRAPH */}

          <div className="forecast-main-grid">

            <div className="forecast-chart-panel">

              <div className="panel-heading simple">

                <div>
                  <h3>
                    Passenger Demand Projection
                  </h3>

                  <p>
                    Current demand vs AI predicted demand
                  </p>
                </div>

                <span className="forecast-badge">
                  {forecastWindow} MIN
                </span>

              </div>


              <div className="demand-chart">

                {[0, 1, 2, 3, 4, 5].map((point) => {

                  const multiplier =
                    1 +
                    point * 0.04 +
                    weather / 1000;

                  const value = Math.round(
                    selectedForecast.tickets *
                      multiplier
                  );

                  const height = Math.min(
                    95,
                    Math.max(
                      12,
                      (value / selectedForecast.capacity) *
                        100
                    )
                  );

                  return (
                    <div
                      className="demand-point"
                      key={point}
                    >

                      <div className="demand-value">
                        {value}
                      </div>

                      <div
                        className="demand-bar"
                        style={{
                          height: `${height}%`,
                        }}
                      ></div>

                      <small>
                        +
                        {point * 10}
                        m
                      </small>

                    </div>
                  );

                })}

              </div>

              <div className="chart-legend">

                <span>
                  <i></i>
                  Predicted passenger demand
                </span>

                <span>
                  Capacity: {selectedForecast.capacity}
                </span>

              </div>

            </div>


            {/* AI RECOMMENDATION */}

            <div className="forecast-ai-panel">

              <div className="ai-panel-icon">
                ✦
              </div>

              <div className="eyebrow">
                AI RECOMMENDATION
              </div>

              <h3>
                {selectedForecast.busesRequired > 0
                  ? `Deploy ${selectedForecast.busesRequired} additional ${
                      selectedForecast.busesRequired === 1
                        ? "bus"
                        : "buses"
                    }`
                  : "No additional bus required"}
              </h3>

              <p>
                Route {selectedForecast.number} is
                expected to reach{" "}
                <strong>
                  {occupancy}%
                </strong>{" "}
                occupancy within the next{" "}
                {forecastWindow} minutes.
              </p>

              <div className="ai-reason">

                <div>
                  <span>Current Load</span>
                  <strong>
                    {selectedForecast.tickets}/
                    {selectedForecast.capacity}
                  </strong>
                </div>

                <div>
                  <span>Predicted Load</span>
                  <strong>
                    {demand}/
                    {selectedForecast.capacity}
                  </strong>
                </div>

                <div>
                  <span>Weather Impact</span>
                  <strong>
                    +{Math.round(weather * 0.08)}%
                  </strong>
                </div>

              </div>

              <button
                className="primary-btn forecast-action"
                onClick={() =>
                  setActive("AI Allocation")
                }
              >
                Open AI Allocation →
              </button>

            </div>

          </div>


          {/* NETWORK FORECAST */}

          <div className="forecast-network">

            <div className="panel-heading simple">

              <div>
                <h3>
                  Network Demand Forecast
                </h3>

                <p>
                  AI-ranked routes requiring attention
                </p>
              </div>

            </div>


            <div className="forecast-route-list">

              {forecastData
                .sort(
                  (a, b) =>
                    b.predictedOccupancy -
                    a.predictedOccupancy
                )
                .map((route) => (

                  <div
                    className="forecast-route-row"
                    key={route.number}
                  >

                    <div className="forecast-route-name">

                      <strong>
                        {route.number}
                      </strong>

                      <span>
                        {route.name}
                      </span>

                    </div>


                    <div>
                      <small>
                        Current
                      </small>

                      <strong>
                        {route.tickets}
                      </strong>
                    </div>


                    <div>
                      <small>
                        Predicted
                      </small>

                      <strong>
                        {route.predictedDemand}
                      </strong>
                    </div>


                    <div>
                      <small>
                        Occupancy
                      </small>

                      <strong>
                        {route.predictedOccupancy}%
                      </strong>
                    </div>


                    <div
                      className={`forecast-risk ${route.forecastRisk.toLowerCase()}`}
                    >
                      {route.forecastRisk}
                    </div>

                  </div>

                ))}

            </div>

          </div>

        </>
      );

    })()}

  </section>
)}

  {/* ================= AUTHORITY ALERTS ================= */}
  {/* ================= AI ALLOCATION ================= */}

{active === "AI Allocation" && (
  <section className="allocation-screen">

    <div className="allocation-header">

      <div>
        <div className="eyebrow">
          AUTONOMOUS FLEET OPTIMIZATION
        </div>

        <h2>
          AI Fleet Allocation <span>— Smart Deployment</span>
        </h2>

        <p>
          Automatically assign available buses to routes with the highest predicted demand.
        </p>
      </div>

      <div className="allocation-status">
        <span className="live-dot"></span>
        AI ENGINE READY
      </div>

    </div>


    {/* ALLOCATION SUMMARY */}

    <div className="allocation-summary">

      <div className="allocation-summary-card">

        <span>AVAILABLE BUSES</span>

        <strong>
          {buses}
        </strong>

        <small>
          fleet capacity
        </small>

      </div>


      <div className="allocation-summary-card danger">

        <span>BUSES REQUIRED</span>

        <strong>
          {totalRecommendedBuses}
        </strong>

        <small>
          based on forecast
        </small>

      </div>


      <div className="allocation-summary-card">

        <span>HIGH PRIORITY ROUTES</span>

        <strong>
          {
            allocationRecommendations.filter(
              (route) =>
                route.priorityScore >= 70
            ).length
          }
        </strong>

        <small>
          requiring deployment
        </small>

      </div>


      <div className="allocation-summary-card success">

        <span>ALLOCATION STATUS</span>

        <strong>
          {allocationApplied
            ? "APPLIED"
            : "READY"}
        </strong>

        <small>
          AI recommendation
        </small>

      </div>

    </div>


    {/* AI EXPLANATION */}

    <div className="allocation-explanation">

      <div className="allocation-ai-icon">
        ✦
      </div>

      <div>

        <div className="eyebrow">
          HOW TRANSITAI DECIDES
        </div>

        <h3>
          AI Priority Score
        </h3>

        <p>
          TransitAI combines predicted passenger demand,
          current occupancy, risk level and weather impact
          to rank routes before assigning available buses.
        </p>

      </div>

      <div className="score-formula">

        <span>
          DEMAND
        </span>

        <b>+</b>

        <span>
          OCCUPANCY
        </span>

        <b>+</b>

        <span>
          RISK
        </span>

        <b>+</b>

        <span>
          WEATHER
        </span>

        <b>=</b>

        <strong>
          PRIORITY
        </strong>

      </div>

    </div>


    {/* RECOMMENDATIONS */}

    <div className="allocation-panel">

      <div className="panel-heading">

        <div>
          <span className="eyebrow">
            AI RECOMMENDATIONS
          </span>

          <h3>
            Recommended Bus Deployment
          </h3>
        </div>

        <span className="allocation-count">
          {allocationRecommendations.length} ROUTES
        </span>

      </div>


      <div className="allocation-list">

        {allocationRecommendations.map((route) => {

          const assigned =
            allocatedBuses.includes(
              route.number
            );

          return (
            <div
              className={`allocation-row ${
                assigned
                  ? "allocation-assigned"
                  : ""
              }`}
              key={route.number}
            >

              <div className="allocation-route">

                <div className="allocation-route-number">
                  {route.number}
                </div>

                <div>
                  <strong>
                    {route.name}
                  </strong>

                  <small>
                    Current: {route.tickets}/
                    {route.capacity} passengers
                  </small>
                </div>

              </div>


              <div className="allocation-stat">

                <small>
                  PREDICTED
                </small>

                <strong>
                  {route.predictedDemand}
                </strong>

              </div>


              <div className="allocation-stat">

                <small>
                  OCCUPANCY
                </small>

                <strong>
                  {route.predictedOccupancy}%
                </strong>

              </div>


              <div className="allocation-stat">

                <small>
                  PRIORITY
                </small>

                <strong>
                  {route.priorityScore}
                </strong>

              </div>


              <div
                className={`allocation-risk ${route.forecastRisk.toLowerCase()}`}
              >
                {route.forecastRisk}
              </div>


              <div className="allocation-action">

                <span>
                  {route.busesRequired > 0
                    ? `+${route.busesRequired} BUS`
                    : "NO BUS"}
                </span>

                {route.busesRequired > 0 && (
                  <button
                    className={
                      assigned
                        ? "assigned-btn"
                        : "assign-btn"
                    }
                    onClick={() => {

                      if (assigned) {
                        setAllocatedBuses(
                          (current) =>
                            current.filter(
                              (item) =>
                                item !==
                                route.number
                            )
                        );

                      } else {

                        setAllocatedBuses(
                          (current) => [
                            ...current,
                            route.number,
                          ]
                        );

                      }

                      setAllocationApplied(false);

                    }}
                  >
                    {assigned
                      ? "✓ Assigned"
                      : "Assign"}
                  </button>
                )}

              </div>

            </div>
          );

        })}

      </div>


      {/* APPLY */}

      <div className="allocation-footer">

        <div>

          <strong>
            AI Deployment Plan
          </strong>

          <span>
            {allocatedBuses.length > 0
              ? `${allocatedBuses.length} route(s) selected for deployment`
              : "Review the AI recommendations and assign buses."}
          </span>

        </div>


        <button
          className="apply-allocation-btn"
          onClick={() => {

            const recommendedRoutes =
              allocationRecommendations
                .filter(
                  (route) =>
                    route.busesRequired > 0
                )
                .slice(
                  0,
                  Math.max(
                    0,
                    buses
                  )
                )
                .map(
                  (route) =>
                    route.number
                );

            setAllocatedBuses(
              recommendedRoutes
            );

            setAllocationApplied(true);

          }}
        >
          ✦ Apply AI Allocation
        </button>

      </div>

    </div>


    {/* FINAL FLOW */}

    <div className="allocation-flow">

      <div className="allocation-flow-step active">
        <span>01</span>
        <strong>Forecast</strong>
        <small>Predict demand</small>
      </div>

      <div>→</div>

      <div className="allocation-flow-step active">
        <span>02</span>
        <strong>Score</strong>
        <small>Rank route priority</small>
      </div>

      <div>→</div>

      <div className="allocation-flow-step active">
        <span>03</span>
        <strong>Allocate</strong>
        <small>Assign available buses</small>
      </div>

      <div>→</div>

      <div className="allocation-flow-step">
        <span>04</span>
        <strong>Alert</strong>
        <small>Notify operations</small>
      </div>

    </div>

  </section>
)}

{active === "Authority Alerts" && (
  <section className="authority-alerts-screen">

    {/* HEADER */}
    <div className="authority-alert-header">

      <div>
        <div className="eyebrow">
          AUTOMATED RESPONSE SYSTEM
        </div>

        <h2>
          Authority Alerts <span>— Proactive Operations</span>
        </h2>

        <p>
          TransitAI automatically identifies operational risks and
          notifies the responsible authority.
        </p>
      </div>

      <div className="alert-system-status">
        <span className="live-dot"></span>
        ALERT ENGINE ACTIVE
      </div>

    </div>


    {/* ALERT SUMMARY */}
    <div className="alert-summary-grid">

      <div className="alert-summary-card critical">
        <span>CRITICAL ALERTS</span>

        <strong>
          {
            notifications.filter(
              (notification) =>
                notification.severity === "CRITICAL"
            ).length
          }
        </strong>

        <small>Require immediate intervention</small>
      </div>


      <div className="alert-summary-card warning">
        <span>WARNING ALERTS</span>

        <strong>
          {
            notifications.filter(
              (notification) =>
                notification.severity === "WARNING"
            ).length
          }
        </strong>

        <small>Routes under observation</small>
      </div>


      <div className="alert-summary-card">
        <span>AUTHORITIES</span>

        <strong>
          {authorityContacts.length}
        </strong>

        <small>Configured response contacts</small>
      </div>


      <div className="alert-summary-card success">
        <span>ESCALATION</span>

        <strong>ACTIVE</strong>

        <small>Automatic escalation enabled</small>
      </div>

    </div>


    {/* ACTIVE ALERTS */}
    <div className="authority-alert-panel">

      <div className="panel-heading">

        <div>
          <span className="eyebrow">
            LIVE ALERT QUEUE
          </span>

          <h3>
            Operational Alerts
          </h3>
        </div>

        <span className="alert-count">
          {notifications.length} ACTIVE
        </span>

      </div>


      <div className="authority-alert-list">

        {notifications.map((notification) => (

          <div
            className={`authority-alert-item ${notification.severity.toLowerCase()}`}
            key={notification.id}
          >

            <div className="alert-severity-icon">
              {notification.severity === "CRITICAL"
                ? "🚨"
                : "⚠️"}
            </div>


            <div className="alert-main-content">

              <div className="alert-title-row">

                <strong>
                  Route {notification.route}
                </strong>

                <span className="severity-badge">
                  {notification.severity}
                </span>

              </div>


              <p>
                {notification.message}
              </p>


              <div className="alert-meta">

                <span>
                  ◷ {notification.time}
                </span>

                <span>•</span>

                <span>
                  {notification.status}
                </span>

              </div>

            </div>


            <button
              className="notify-authority-btn"
              disabled={notification.status === "AUTHORITY NOTIFIED"}
              onClick={async () => {
                try {
                  const result = await sendSms(
                    ALERT_PHONE,
                    `TRANSITAI ${notification.severity} ALERT\nRoute ${notification.route}\n${notification.message}\nPlease take action.`
                  );

                  if (result.success) {
                    setNotifications((current) =>
                      current.map((item) =>
                        item.id === notification.id
                          ? { ...item, status: "AUTHORITY NOTIFIED", time: "Just now" }
                          : item
                      )
                    );
                    alert("SMS sent successfully to the authority!");
                  } else {
                    alert("SMS failed: " + result.error);
                  }
                } catch (error) {
                  console.error(error);
                  alert("Unable to connect to SMS server. Is it running on port 3001?");
                }
              }}
            >
              {notification.status === "AUTHORITY NOTIFIED"
                ? "✓ Authority Notified"
                : "Notify Authority"}
            </button>

          </div>

        ))}

      </div>

    </div>


    {/* AUTHORITY DIRECTORY */}
    <div className="authority-directory-panel">

      <div className="panel-heading">

        <div>
          <span className="eyebrow">
            RESPONSE DIRECTORY
          </span>

          <h3>
            Responsible Authorities
          </h3>
        </div>

        <span className="directory-status">
          ● CONTACTS READY
        </span>

      </div>


      <div className="authority-directory-grid">

        {authorityContacts.map((authority) => (

          <div
            className="authority-contact-card"
            key={authority.id}
          >

            <div className="authority-contact-icon">
              👤
            </div>


            <div className="authority-contact-info">

              <strong>
                {authority.name}
              </strong>

              <span>
                {authority.role}
              </span>

              <small>
                Routes: {authority.routes.join(", ")}
              </small>

              <small>
                Alert level: {authority.alertLevel}
              </small>

            </div>


            <div className="authority-contact-status">
              ● READY
            </div>

          </div>

        ))}

      </div>

    </div>


    {/* ESCALATION FLOW */}
    <div className="escalation-panel">

      <div>
        <span className="eyebrow">
          AUTOMATED ESCALATION
        </span>

        <h3>
          TransitAI Response Flow
        </h3>
      </div>


      <div className="escalation-flow">

        <div className="flow-step">
          <span>01</span>
          <strong>Risk Detected</strong>
          <small>AI monitors occupancy</small>
        </div>


        <div className="flow-arrow">
          →
        </div>


        <div className="flow-step">
          <span>02</span>
          <strong>Severity Classified</strong>
          <small>Warning / Critical</small>
        </div>


        <div className="flow-arrow">
          →
        </div>


        <div className="flow-step">
          <span>03</span>
          <strong>Authority Identified</strong>
          <small>Route responsibility</small>
        </div>


        <div className="flow-arrow">
          →
        </div>


        <div className="flow-step active">
          <span>04</span>
          <strong>Notification Sent</strong>
          <small>Immediate intervention</small>
        </div>

      </div>

    </div>

  </section>
)}
  
        {/* FOOTER */}
        <footer>
          <span>TransitAI • AI-powered urban mobility</span>
          <span>Decision-support prototype</span>
        </footer>

      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);