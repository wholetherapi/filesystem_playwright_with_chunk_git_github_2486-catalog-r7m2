/* Northline Workspace Supply - catalog rendering */
(function () {
  var REGIONS = {
    central: {label: "Central Distribution Center", currency: "USD", rate: 1.0, symbol: "US$"},
    coastal: {label: "Coastal Hub - Zone B", currency: "USD", rate: 1.0, symbol: "US$"},
    northern: {label: "Northern Depot", currency: "CAD", rate: 1.36, symbol: "C$"}
  };
  var CURRENCIES = {USD: {symbol: "US$", rate: 1.0}, CAD: {symbol: "C$", rate: 1.36}};

  function readCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  var cookieRegion = readCookie("ship_region");
  var regionKey = (cookieRegion && REGIONS[cookieRegion]) ? cookieRegion : "central";
  var cookieCurrency = readCookie("display_currency");
  var currencyCode = (cookieCurrency && CURRENCIES[cookieCurrency]) ? cookieCurrency : "USD";
  var region = REGIONS[regionKey];
  var currency = CURRENCIES[currencyCode];

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function money(usd) {
    var amount = Math.round(parseFloat(usd) * currency.rate * 100) / 100;
    return currency.symbol + " " + amount.toFixed(2);
  }

  function priceRange(pair) {
    return money(pair[0]) + " - " + money(pair[1]);
  }

  function offerFor(item) {
    if (!item.offers) { return null; }
    return item.offers[regionKey] || null;
  }

  function isPurchasable(offer) {
    if (!offer) { return false; }
    return !/out of stock|unavailable|discontinued/i.test(offer.stock || "");
  }

  function paintHeader() {
    var rsel = document.getElementById("ship-region");
    if (rsel) { rsel.value = regionKey; }
    var csel = document.getElementById("display-currency");
    if (csel) { csel.value = currencyCode; }
    var note = document.getElementById("session-note");
    if (note) {
      note.textContent = "Showing " + currencyCode + " prices for delivery to " + region.label +
        (regionKey === "central" ? " (default destination)." : ".");
    }
  }

  function wireSessionControls() {
    var rsel = document.getElementById("ship-region");
    if (rsel) {
      rsel.addEventListener("change", function () {
        document.cookie = "ship_region=" + encodeURIComponent(rsel.value) + "; path=/; SameSite=Lax";
        window.location.reload();
      });
    }
    var csel = document.getElementById("display-currency");
    if (csel) {
      csel.addEventListener("change", function () {
        document.cookie = "display_currency=" + encodeURIComponent(csel.value) + "; path=/; SameSite=Lax";
        window.location.reload();
      });
    }
  }

  function cardHtml(item) {
    var offer = offerFor(item);
    var priceHtml;
    if (offer && isPurchasable(offer)) {
      priceHtml = '<div class="price">' + money(offer.price_usd) + "</div>";
    } else if (offer) {
      priceHtml = '<div class="price muted">Unavailable for this destination</div>';
    } else {
      priceHtml = '<div class="price muted">No offer for this destination</div>';
    }
    return '<article class="card" data-category="' + esc(item.category) + '">' +
      '<div class="cat">' + esc(item.category) + "</div>" +
      '<h3><a href="item.html?id=' + encodeURIComponent(item.id) + '">' + esc(item.title) + "</a></h3>" +
      '<div class="seller">' + esc(item.seller) + "</div>" +
      '<div class="meta">' + esc(item.material) + " &middot; " + esc(item.colour) + "</div>" +
      priceHtml +
      "</article>";
  }

  function renderGrid(items) {
    var grid = document.getElementById("catalog-grid");
    if (!grid) { return; }
    grid.innerHTML = items.map(cardHtml).join("");
  }

  function renderIndex() {
    var grid = document.getElementById("catalog-grid");
    if (!grid) { return; }
    fetch("catalog.json", {cache: "no-store"}).then(function (r) { return r.json(); }).then(function (data) {
      var all = data.items || [];
      var chips = document.getElementById("category-chips");
      if (chips) {
        var cats = ["All"].concat(Object.keys(all.reduce(function (acc, it) { acc[it.category] = 1; return acc; }, {})));
        chips.innerHTML = cats.map(function (c, i) {
          var value = c === "All" ? "all" : c;
          return '<button class="chip' + (i === 0 ? " active" : "") + '" data-category="' + esc(value) + '" type="button">' + esc(c) + "</button>";
        }).join("");
        chips.querySelectorAll(".chip").forEach(function (chip) {
          chip.addEventListener("click", function () {
            chips.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
            chip.classList.add("active");
            var cat = chip.getAttribute("data-category");
            renderGrid(cat === "all" ? all : all.filter(function (i) { return i.category === cat; }));
          });
        });
      }
      function applySearch() {
        var input = document.getElementById("search-input");
        var q = input ? input.value.trim().toLowerCase() : "";
        var items = q ? all.filter(function (i) {
          return [i.title, i.seller, i.category, i.material, i.colour, i.id].join(" ").toLowerCase().indexOf(q) >= 0;
        }) : all;
        renderGrid(items);
      }
      var input = document.getElementById("search-input");
      if (input) { input.addEventListener("input", applySearch); }
      renderGrid(all);
    });
  }

  function renderItem() {
    var detail = document.getElementById("item-detail");
    if (!detail) { return; }
    var id = (new URLSearchParams(window.location.search)).get("id") || "";
    fetch("catalog.json", {cache: "no-store"}).then(function (r) { return r.json(); }).then(function (data) {
      var all = data.items || [];
      var item = all.filter(function (i) { return i.id === id; })[0];
      if (!item) {
        detail.innerHTML = "<h1>Item not found</h1><p>The requested trade item is not in this catalog.</p>";
        return;
      }
      document.title = item.title + " - Northline Workspace Supply";
      document.getElementById("item-title").textContent = item.title;
      document.getElementById("item-seller").textContent = "Sold by " + item.seller;
      document.getElementById("item-category").textContent = item.category;
      document.getElementById("item-id").value = item.id;
      document.getElementById("item-material").textContent = item.material;
      document.getElementById("item-colour").textContent = item.colour;
      document.getElementById("item-lumbar").textContent = item.lumbar_note;
      document.getElementById("item-weight").textContent = item.weight_capacity_lb + " lb";
      document.getElementById("item-warranty").textContent = item.warranty;

      var box = document.getElementById("featured-offer");
      box.setAttribute("data-region", regionKey);
      var body = document.getElementById("offer-body");
      var offer = offerFor(item);
      if (offer) {
        var stockClass = isPurchasable(offer) ? "stock-good" : "stock-bad";
        body.innerHTML =
          '<div class="offer-price" id="offer-price">' + money(offer.price_usd) + "</div>" +
          '<div class="offer-stock ' + stockClass + '" id="offer-stock">' + esc(offer.stock) +
          " &middot; ships from " + esc(region.label) + "</div>";
      } else {
        body.innerHTML =
          '<div class="offer-none" id="offer-none">No current offer is available for delivery to ' + esc(region.label) + ".</div>" +
          '<div class="offer-stock stock-bad" id="offer-stock">Not stocked for this destination</div>';
      }

      document.getElementById("item-list-price").textContent = money(item.list_price_usd);
      document.getElementById("item-range").textContent = priceRange(item.market_range_usd);
      if (item.other_seller) {
        document.getElementById("item-other-seller").textContent =
          "Also listed by " + item.other_seller.name + " at " + money(item.other_seller.price_usd) + " (separate seller).";
      }
      document.getElementById("item-description").textContent = item.description;
      var rel = document.getElementById("item-related");
      rel.innerHTML = (item.related || []).map(function (r) {
        return '<li><a href="item.html?id=' + encodeURIComponent(r.id) + '">' + esc(r.title) + "</a> - " + money(r.price_usd) + "</li>";
      }).join("");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    paintHeader();
    wireSessionControls();
    renderIndex();
    renderItem();
  });
})();
