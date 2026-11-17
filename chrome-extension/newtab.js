(() => {
  const canvas = document.getElementById("ascii-canvas");
  const timeDisplay = document.getElementById("time-display");
  const dateDisplay = document.getElementById("date-display");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const dropdownBtn = document.getElementById("theme-dropdown-btn");
  const dropdownMenu = document.getElementById("theme-dropdown-menu");
  const speciesList = document.getElementById("species-list");
  const activeDot = document.getElementById("active-species-dot");
  const activeLabel = document.getElementById("active-species-label");
  const chevron = dropdownBtn?.querySelector(".chevron");
  const uiContainer = document.getElementById("ui-container");

  let engine = null;
  let currentAnimal = "koi";
  let isMenuOpen = false;
  let isUiVisible = true;

  const SPECIES = window.SPECIES_CONFIG || [
    { key: "butterflies", label: "Butterfly", color: "#38bdf8", hotkey: "1" },
    { key: "koi",         label: "Koi",       color: "#fb923c", hotkey: "2" },
    { key: "jellyfish",   label: "Jellyfish", color: "#f472b6", hotkey: "3" },
    { key: "dragonflies", label: "Dragonfly", color: "#4ade80", hotkey: "4" },
    { key: "frogs",       label: "Frog",      color: "#84cc16", hotkey: "5" },
    { key: "cranes",      label: "Crane",     color: "#f8fafc", hotkey: "6" },
    { key: "crabs",       label: "Crab",      color: "#f87171", hotkey: "7" },
    { key: "manta",       label: "Manta",     color: "#818cf8", hotkey: "8" }
  ];

  // 1. Clock & Date
  function updateClock() {
    const now = new Date();
    if (timeDisplay) {
      timeDisplay.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (dateDisplay) {
      dateDisplay.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 2. Initialize Canvas & Engine
  function initEngine(animalKey) {
    if (!canvas || !window.AnimalEngine) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    currentAnimal = animalKey;
    engine = new window.AnimalEngine(canvas, {
      animal: animalKey,
      theme: "dark"
    });

    window.addEventListener("resize", () => {
      if (canvas && engine) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize();
      }
    });

    updateDropdownUI(animalKey);
  }

  // 3. Switch Species
  function setSpecies(animalKey) {
    if (!SPECIES.some(s => s.key === animalKey)) return;
    currentAnimal = animalKey;

    if (engine) {
      engine.setAnimal(animalKey);
    }
    updateDropdownUI(animalKey);

    // Save to storage
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ "ascii_animal_theme": animalKey });
    } else {
      localStorage.setItem("ascii_animal_theme", animalKey);
    }
  }

  function updateDropdownUI(animalKey) {
    const meta = SPECIES.find(s => s.key === animalKey) || SPECIES[1];
    if (activeDot) {
      activeDot.style.backgroundColor = meta.color;
      activeDot.style.boxShadow = `0 0 10px ${meta.color}`;
    }
    if (activeLabel) {
      activeLabel.textContent = meta.label;
    }

    // Update active class in menu
    const items = speciesList?.querySelectorAll(".species-item");
    items?.forEach(btn => {
      const key = btn.getAttribute("data-key");
      btn.classList.toggle("active", key === animalKey);
    });
  }

  // 4. Build Dropdown Menu
  function populateMenu() {
    if (!speciesList) return;
    speciesList.innerHTML = "";

    SPECIES.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `species-item ${s.key === currentAnimal ? "active" : ""}`;
      btn.setAttribute("data-key", s.key);

      btn.innerHTML = `
        <span class="species-dot" style="background-color: ${s.color}; box-shadow: 0 0 8px ${s.color};"></span>
        <span>${s.label}</span>
        <span class="species-hotkey">${s.hotkey}</span>
      `;

      btn.addEventListener("click", () => {
        setSpecies(s.key);
        closeMenu();
      });

      speciesList.appendChild(btn);
    });
  }

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    dropdownMenu?.classList.toggle("hidden", !isMenuOpen);
    chevron?.classList.toggle("open", isMenuOpen);
  }

  function closeMenu() {
    isMenuOpen = false;
    dropdownMenu?.classList.add("hidden");
    chevron?.classList.remove("open");
  }

  dropdownBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  window.addEventListener("click", (e) => {
    if (isMenuOpen && !dropdownMenu?.contains(e.target) && e.target !== dropdownBtn) {
      closeMenu();
    }
  });

  // 5. Search Submissions
  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput?.value?.trim();
    if (!query) return;

    // Check if query looks like a direct URL
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
    if (urlPattern.test(query)) {
      const url = query.startsWith("http") ? query : `https://${query}`;
      window.location.href = url;
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  });

  // 6. Interactive Startle on Canvas Click
  window.addEventListener("pointerdown", (e) => {
    if (!engine) return;
    const target = e.target;
    if (target && target.closest("#theme-dropdown-btn, #theme-dropdown-menu, .search-box, .link-chip, a, button, input")) {
      return;
    }
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engine.flock?.startle(x, y);
  });

  // 7. Keyboard Shortcuts (1-8 for species, H for UI toggle)
  window.addEventListener("keydown", (e) => {
    const tag = e.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) {
      return;
    }

    if (e.key === "Escape") {
      closeMenu();
      return;
    }

    if (e.key.toLowerCase() === "h") {
      isUiVisible = !isUiVisible;
      uiContainer?.classList.toggle("hidden-ui", !isUiVisible);
      return;
    }

    const keyMap = {
      "1": "butterflies",
      "2": "koi",
      "3": "jellyfish",
      "4": "dragonflies",
      "5": "frogs",
      "6": "cranes",
      "7": "crabs",
      "8": "manta"
    };

    if (keyMap[e.key]) {
      setSpecies(keyMap[e.key]);
    }
  });

  // 8. Storage Sync: Load saved animal & listen to changes from popup
  async function loadInitialTheme() {
    let savedAnimal = "koi";
    try {
      if (chrome?.storage?.local) {
        const res = await chrome.storage.local.get("ascii_animal_theme");
        if (res && res.ascii_animal_theme) {
          savedAnimal = res.ascii_animal_theme;
        }
      } else {
        const local = localStorage.getItem("ascii_animal_theme");
        if (local) savedAnimal = local;
      }
    } catch (_) {}

    initEngine(savedAnimal);
    populateMenu();
  }

  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.ascii_animal_theme) {
        const newAnimal = changes.ascii_animal_theme.newValue;
        if (newAnimal && newAnimal !== currentAnimal) {
          setSpecies(newAnimal);
        }
      }
    });
  }

  // Start
  loadInitialTheme();
})();
