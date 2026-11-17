(() => {
  const activeBadge = document.getElementById("popup-active-badge");
  const speciesGrid = document.getElementById("popup-species-grid");
  const googleToggle = document.getElementById("google-theme-toggle");
  const openNewtabBtn = document.getElementById("open-newtab-btn");

  const SPECIES = [
    { key: "butterflies", label: "Butterfly", color: "#38bdf8", hotkey: "1" },
    { key: "koi",         label: "Koi",       color: "#fb923c", hotkey: "2" },
    { key: "jellyfish",   label: "Jellyfish", color: "#f472b6", hotkey: "3" },
    { key: "dragonflies", label: "Dragonfly", color: "#4ade80", hotkey: "4" },
    { key: "frogs",       label: "Frog",      color: "#84cc16", hotkey: "5" },
    { key: "cranes",      label: "Crane",     color: "#f8fafc", hotkey: "6" },
    { key: "crabs",       label: "Crab",      color: "#f87171", hotkey: "7" },
    { key: "manta",       label: "Manta",     color: "#818cf8", hotkey: "8" }
  ];

  let currentAnimal = "koi";

  function updateBadge(animalKey) {
    const meta = SPECIES.find(s => s.key === animalKey) || SPECIES[1];
    if (activeBadge) {
      activeBadge.textContent = meta.label;
      activeBadge.style.backgroundColor = `${meta.color}22`;
      activeBadge.style.borderColor = `${meta.color}55`;
      activeBadge.style.color = meta.color;
      activeBadge.style.boxShadow = `0 0 10px ${meta.color}33`;
    }
  }

  function renderGrid() {
    if (!speciesGrid) return;
    speciesGrid.innerHTML = "";

    SPECIES.forEach(s => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `grid-card ${s.key === currentAnimal ? "active" : ""}`;
      card.style.setProperty("--species-color", s.color);

      card.innerHTML = `
        <span class="card-dot" style="background-color: ${s.color}; box-shadow: 0 0 8px ${s.color};"></span>
        <span>${s.label}</span>
        <span class="card-key">${s.hotkey}</span>
      `;

      card.addEventListener("click", async () => {
        currentAnimal = s.key;
        updateBadge(s.key);
        renderGrid();

        if (chrome?.storage?.local) {
          await chrome.storage.local.set({ "ascii_animal_theme": s.key });
        }
      });

      speciesGrid.appendChild(card);
    });
  }

  // Options: Google homepage toggle
  googleToggle?.addEventListener("change", async (e) => {
    const enabled = e.target.checked;
    if (chrome?.storage?.local) {
      await chrome.storage.local.set({ "google_theme_enabled": enabled });
    }
  });

  // Open New Tab
  openNewtabBtn?.addEventListener("click", () => {
    if (chrome?.tabs?.create) {
      chrome.tabs.create({});
    } else {
      window.open("newtab.html", "_blank");
    }
  });

  // Load saved state
  async function init() {
    try {
      if (chrome?.storage?.local) {
        const data = await chrome.storage.local.get(["ascii_animal_theme", "google_theme_enabled"]);
        if (data.ascii_animal_theme) {
          currentAnimal = data.ascii_animal_theme;
        }
        if (typeof data.google_theme_enabled === "boolean" && googleToggle) {
          googleToggle.checked = data.google_theme_enabled;
        }
      }
    } catch (_) {}

    updateBadge(currentAnimal);
    renderGrid();
  }

  init();
})();
