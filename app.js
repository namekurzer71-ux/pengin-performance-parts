const parts = [
  { name: "Motoröl", price: 1204, category: "Wartung", department: "maintenance" },
  { name: "Ersatzkupplung", price: 4300, category: "Wartung", department: "maintenance" },
  { name: "Luftfilter", price: 1462, category: "Wartung", department: "maintenance" },
  { name: "Zündkerzen", price: 2064, category: "Wartung", department: "maintenance" },
  { name: "Reparaturkit", price: 2700, category: "Wartung", department: "maintenance" },
  { name: "Reinigungsset", price: 1032, category: "Wartung", department: "maintenance" },
  { name: "Panzertape", price: 946, category: "Wartung", department: "maintenance" },
  { name: "Allradantrieb (AWD)", price: 25800, category: "Antriebsstränge", department: "performance" },
  { name: "Heckantrieb", price: 12040, category: "Antriebsstränge", department: "performance" },
  { name: "Frontantrieb (FWD)", price: 12040, category: "Antriebsstränge", department: "performance" },
  { name: "Ersatzreifen", price: 2580, category: "Reifen", department: "performance" },
  { name: "Felgensatz", price: 2752, category: "Reifen", department: "performance" },
  { name: "Reifenrauch-Set", price: 2752, category: "Reifen", department: "performance" },
  { name: "Schusssichere Reifen", price: 7568, category: "Reifen", department: "performance" },
  { name: "Slick-Reifen", price: 6020, category: "Reifen", department: "performance" },
  { name: "Semi-Slick-Reifen", price: 4816, category: "Reifen", department: "performance" },
  { name: "Offroad-Reifen", price: 5504, category: "Reifen", department: "performance" },
  { name: "Bremsbeläge", price: 3440, category: "Bremsen", department: "performance" },
  { name: "Keramikbremsen", price: 12900, category: "Bremsen", department: "performance" },
  { name: "Schaltgetriebe", price: 13760, category: "Getriebe", department: "performance" },
  { name: "Drift-Tuning-Kit", price: 13760, category: "Drift-Tuning", department: "performance" },
  { name: "Turbolader", price: 15480, category: "Turbolader", department: "performance" },
];

const storageKey = "werkbank-build-v2";
const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const quantityFormatter = new Intl.NumberFormat("de-DE");
const partsList = document.querySelector("#parts-list");
const categoryFilters = document.querySelector("#category-filters");
const departmentTabs = [...document.querySelectorAll(".department-tab")];
const searchInput = document.querySelector("#search-input");
const cartItems = document.querySelector("#cart-items");
const grandTotal = document.querySelector("#grand-total");
const selectedCount = document.querySelector("#selected-count");
const clearButton = document.querySelector("#clear-button");
const emptyState = document.querySelector("#empty-state");
const toast = document.querySelector("#toast");

let activeDepartment = "maintenance";
let activeCategory = "Alle Teile";
let quantities = loadBuild();
let toastTimeout;

function loadBuild() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};

    return Object.fromEntries(
      parts.flatMap((part) => {
        const quantity = saved[part.name];
        return Number.isInteger(quantity) && quantity >= 1 && quantity <= 9999
          ? [[part.name, quantity]]
          : [];
      }),
    );
  } catch (error) {
    console.error("Der gespeicherte Build konnte nicht geladen werden.", error);
    return {};
  }
}

function saveBuild() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(quantities));
  } catch (error) {
    console.error("Der Build konnte nicht gespeichert werden.", error);
    showToast("Build konnte nicht gespeichert werden.");
  }
}

function renderFilters() {
  categoryFilters.replaceChildren();
  const departmentParts = parts.filter((part) => part.department === activeDepartment);
  const categories = [...new Set(departmentParts.map((part) => part.category))];
  categoryFilters.hidden = categories.length <= 1;

  for (const category of ["Alle Teile", ...categories]) {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === activeCategory));
    button.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      renderParts();
    });
    categoryFilters.append(button);
  }
}

function renderParts() {
  const search = normalize(searchInput.value.trim());
  const departmentParts = parts.filter((part) => part.department === activeDepartment);
  const filteredParts = parts.filter((part) => {
    const matchesDepartment = part.department === activeDepartment;
    const matchesCategory = activeCategory === "Alle Teile" || part.category === activeCategory;
    const matchesSearch = normalize(`${part.name} ${part.category}`).includes(search);
    return matchesDepartment && matchesCategory && matchesSearch;
  });

  document.querySelector("#catalog-count").textContent =
    `${departmentParts.length} ${departmentParts.length === 1 ? "TEIL" : "TEILE"} IM BEREICH`;
  partsList.replaceChildren();
  emptyState.hidden = filteredParts.length > 0;

  for (const part of filteredParts) {
    const quantity = quantities[part.name] || 0;
    const row = document.createElement("div");
    row.className = `part-row${quantity ? " is-selected" : ""}`;

    const details = document.createElement("div");
    details.className = "part-details";

    const checkboxId = `part-${parts.indexOf(part)}`;
    const checkbox = document.createElement("input");
    checkbox.id = checkboxId;
    checkbox.className = "part-toggle";
    checkbox.type = "checkbox";
    checkbox.checked = quantity > 0;
    checkbox.setAttribute("aria-label", `${part.name} zum Build hinzufügen`);
    checkbox.addEventListener("change", () => setQuantity(part, checkbox.checked ? 1 : 0));

    const labels = document.createElement("label");
    labels.className = "part-label";
    labels.htmlFor = checkboxId;
    const name = document.createElement("span");
    name.className = "part-name";
    name.textContent = part.name;
    const category = document.createElement("span");
    category.className = "part-category";
    category.textContent = part.category;
    labels.append(name, category);
    details.append(checkbox, labels);

    const price = document.createElement("span");
    price.className = "part-price";
    price.textContent = euro.format(part.price);
    const perUnit = document.createElement("small");
    perUnit.textContent = " / STK.";
    price.append(perUnit);

    const controls = document.createElement("div");
    controls.className = "quantity-control";
    controls.setAttribute("aria-label", `Menge für ${part.name}`);

    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `${part.name}: Menge verringern`);
    decrease.disabled = quantity <= 0;
    decrease.addEventListener("click", () => setQuantity(part, Math.max(0, quantity - 1)));

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "9999";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = String(quantity || 1);
    input.disabled = quantity === 0;
    input.setAttribute("aria-label", `Stückzahl für ${part.name}`);
    input.addEventListener("change", () => {
      const next = Number(input.value);
      if (Number.isInteger(next) && next >= 1 && next <= 9999) {
        setQuantity(part, next);
      } else {
        input.value = String(quantity || 1);
        showToast("Bitte eine Menge von 1 bis 9999 eingeben.");
      }
    });

    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `${part.name}: Menge erhöhen`);
    increase.disabled = quantity >= 9999;
    increase.addEventListener("click", () => setQuantity(part, Math.min(9999, quantity + 1)));

    controls.append(decrease, input, increase);
    row.append(details, price, controls);
    partsList.append(row);
  }
}

function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de");
}

function setQuantity(part, quantity) {
  if (quantity > 0) quantities[part.name] = quantity;
  else delete quantities[part.name];
  saveBuild();
  renderParts();
  renderSummary();
}

function renderSummary() {
  const selected = parts.filter((part) => quantities[part.name]);
  const totalItems = selected.reduce((sum, part) => sum + quantities[part.name], 0);
  const total = selected.reduce((sum, part) => sum + part.price * quantities[part.name], 0);

  selectedCount.textContent = quantityFormatter.format(totalItems);
  grandTotal.textContent = euro.format(total);
  clearButton.disabled = selected.length === 0;
  cartItems.replaceChildren();

  if (selected.length === 0) {
    const message = document.createElement("p");
    message.className = "cart-empty";
    message.append("Noch keine Teile ausgewählt.");
    const hint = document.createElement("span");
    hint.append(document.createElement("br"), "Füge Teile zum Kundenangebot hinzu.");
    message.append(hint);
    cartItems.append(message);
    return;
  }

  for (const part of selected) {
    const row = document.createElement("div");
    row.className = "cart-row";
    const details = document.createElement("div");
    const name = document.createElement("div");
    name.className = "cart-item-name";
    name.textContent = part.name;
    const quantity = document.createElement("div");
    quantity.className = "cart-item-quantity";
    quantity.textContent = `${quantityFormatter.format(quantities[part.name])} × ${euro.format(part.price)}`;
    details.append(name, quantity);
    const subtotal = document.createElement("span");
    subtotal.className = "cart-item-total";
    subtotal.textContent = euro.format(part.price * quantities[part.name]);
    row.append(details, subtotal);
    cartItems.append(row);
  }
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

searchInput.addEventListener("input", renderParts);
departmentTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeDepartment = tab.dataset.department;
    activeCategory = "Alle Teile";
    departmentTabs.forEach((button) => {
      button.setAttribute("aria-selected", String(button === tab));
      button.tabIndex = button === tab ? 0 : -1;
    });
    renderFilters();
    renderParts();
  });
  tab.addEventListener("keydown", (event) => {
    const currentIndex = departmentTabs.indexOf(tab);
    let nextIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % departmentTabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + departmentTabs.length) % departmentTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = departmentTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    departmentTabs[nextIndex].focus();
    departmentTabs[nextIndex].click();
  });
});
clearButton.addEventListener("click", () => {
  quantities = {};
  saveBuild();
  renderParts();
  renderSummary();
  showToast("Build zurückgesetzt.");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

renderFilters();
renderParts();
renderSummary();
