/*
  Страница раздела.
  1. Загружает data/products.json.
  2. Строит список подразделов и ряды плашек.
  3. Сортировка и фильтры: цена, цвет, размер.
  4. Плашки выезжают слева направо, когда попадают в экран.
  Все тексты ставятся через textContent. Данные из полей ввода
  в страницу как разметка не попадают.
*/
(function () {
  "use strict";

  var P = window.PRYSMERK;
  var i18n = P.i18n;
  var t = i18n.t;
  var h = P.dom.h;

  var HEX = /^#[0-9a-f]{6}$/i;
  var SIZE_ORDER = ["s", "m", "l", "xl", "k4", "k6", "k8", "k10", "one"];
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Раздел берём из адреса (section.html?s=men), а не из body: transitions.js
  // на время плавной смены свечения временно ставит туда цвет прошлой страницы.
  var sectionId = new URLSearchParams(location.search).get("s");
  if (["men", "women", "kids"].indexOf(sectionId) === -1) sectionId = "men";
  var catalogEl = document.getElementById("catalog");
  var statusEl = document.getElementById("catalog-status");
  var titleEl = document.getElementById("section-title");
  var filtersModal = document.getElementById("filters");
  var openBtn = document.getElementById("filters-open");
  var countEl = document.getElementById("filters-count");
  var applyBtn = document.getElementById("filters-apply");
  var resetBtn = document.getElementById("filters-reset");
  var minInput = document.getElementById("price-min");
  var maxInput = document.getElementById("price-max");
  var priceError = document.getElementById("price-error");
  var resetAllBtn = document.getElementById("catalog-reset");

  titleEl.setAttribute("data-i18n", "nav." + sectionId);

  var data = null;
  var rows = [];            // { id, section, track, navItem }
  var state = { sort: null, colors: {}, sizes: {}, min: null, max: null };

  /* ---------- Цена (общий помощник из data.js) ---------- */
  var priceKey = P.data.priceKey;
  var formatPrice = P.data.formatPrice;

  /* ---------- Данные ---------- */
  function sectionProducts() {
    return data.products.filter(function (p) { return p.section === sectionId; });
  }

  function matches(p) {
    var anyColor = Object.keys(state.colors).length > 0;
    var anySize = Object.keys(state.sizes).length > 0;
    if (anyColor && !p.colors.some(function (c) { return state.colors[c]; })) return false;
    if (anySize && !p.sizes.some(function (s) { return state.sizes[s]; })) return false;
    var v = p.price[priceKey()];
    if (state.min !== null && v < state.min) return false;
    if (state.max !== null && v > state.max) return false;
    return true;
  }

  function productsFor(cat) {
    var list = sectionProducts().filter(function (p) { return p.category === cat && matches(p); });
    if (state.sort) {
      var k = priceKey();
      var dir = state.sort === "asc" ? 1 : -1;
      list = list.slice().sort(function (a, b) { return (a.price[k] - b.price[k]) * dir; });
    }
    return list;
  }

  /* ---------- Плашка ---------- */
  function buildTile(p) {
    var tone = HEX.test(data.colors[p.colors[0]] || "") ? data.colors[p.colors[0]] : "#3b3b40";
    var name = p.name[i18n.getLang()] || p.name.uk;
    var price = formatPrice(p);

    var a = h("a", {
      class: "tile is-pre",
      href: "product.html?id=" + encodeURIComponent(p.id),
      "aria-label": name + ", " + price
    }, [
      h("span", { class: "tile__ph", "aria-hidden": "true" }),
      h("span", { class: "tile__info" }, [
        h("span", { class: "tile__name" }, [name]),
        h("span", { class: "tile__price" }, [price])
      ])
    ]);
    a.style.setProperty("--tone", tone);
    return a;
  }

  /* ---------- Появление плашек ----------
     Когда несколько плашек попали в экран одновременно, они выезжают
     по очереди с задержкой 100 мс. */
  var revealObserver = null;
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (e) { return e.isIntersecting; });
      visible.sort(function (a, b) {
        return a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      visible.forEach(function (e, i) {
        var el = e.target;
        el.style.setProperty("--d", i * 100 + "ms");
        el.classList.remove("is-pre");
        el.classList.add("is-reveal");
        revealObserver.unobserve(el);
        // после показа задержка больше не нужна
        window.setTimeout(function () {
          el.classList.remove("is-reveal");
          el.style.removeProperty("--d");
        }, 900 + i * 100);
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -4% 0px" });
  }

  function watchTile(el) {
    if (revealObserver) revealObserver.observe(el);
    else el.classList.remove("is-pre"); // старый браузер: показываем сразу
  }

  /* ---------- Отрисовка рядов ---------- */
  function renderRows() {
    var total = 0;
    rows.forEach(function (r) {
      var list = productsFor(r.id);
      total += list.length;
      var tiles = list.map(buildTile);
      r.track.replaceChildren.apply(r.track, tiles);
      tiles.forEach(watchTile);
      r.section.hidden = list.length === 0;
      r.navItem.hidden = list.length === 0;
    });

    if (total === 0) showStatus("catalog.empty");
    else hideStatus();
    // пустой результат: даём выход прямо здесь, а не только через панель фильтров
    resetAllBtn.hidden = total !== 0;
    // без результатов список подразделов пуст: пустую плашку не показываем
    if (subnav) subnav.hidden = total === 0;

    updateButtons(total);
    updateScrollSpy();
  }

  function showStatus(key) {
    statusEl.setAttribute("data-i18n", key);
    statusEl.textContent = t(key);
    statusEl.hidden = false;
  }
  function hideStatus() { statusEl.hidden = true; }

  function activeFilterCount() {
    return (state.sort ? 1 : 0) +
      Object.keys(state.colors).length +
      Object.keys(state.sizes).length +
      (state.min !== null || state.max !== null ? 1 : 0);
  }

  function updateButtons(total) {
    var n = activeFilterCount();
    countEl.hidden = n === 0;
    countEl.textContent = String(n);
    applyBtn.textContent = t("filters.show") + " (" + total + ")";
  }

  /* ---------- Список подразделов ---------- */
  var subnav, subnavScroll, subnavLinks = {};
  var lockSpyUntil = 0;

  function smoothBehavior() { return reduceMotion ? "auto" : "smooth"; }

  function buildStructure() {
    var cats = data.sections[sectionId] || [];
    var list = h("ul", { class: "subnav__list" });

    cats.forEach(function (cat) {
      var link = h("a", { class: "subnav__link", href: "#" + cat, "data-cat": cat }, [
        h("span", { "data-i18n": "cat." + cat })
      ]);
      subnavLinks[cat] = link;
      var li = h("li", {}, [link]);
      list.appendChild(li);

      var track = h("div", { class: "track" });
      var title = h("h2", { class: "row__title", "data-i18n": "cat." + cat });
      var section = h("section", { class: "row", id: cat }, [title, track]);
      catalogEl.appendChild(section);
      rows.push({ id: cat, section: section, track: track, navItem: li });
    });

    subnavScroll = h("div", { class: "subnav__scroll" }, [list]);
    subnav = h("nav", { class: "subnav glass-btn", "data-i18n-aria": "subnav.label" }, [subnavScroll]);
    // сразу после кнопки меню (перед ней стоит ссылка «Перейти до змісту»)
    var topbarEl = document.querySelector(".topbar");
    document.body.insertBefore(subnav, topbarEl ? topbarEl.nextSibling : document.body.firstChild);

    // Колёсико мыши листает список в стороны
    subnavScroll.addEventListener("wheel", function (e) {
      if (subnavScroll.scrollWidth <= subnavScroll.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        subnavScroll.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    list.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[data-cat]") : null;
      if (!a) return;
      e.preventDefault();
      var cat = a.getAttribute("data-cat");
      var row = document.getElementById(cat);
      if (!row) return;
      lockSpyUntil = Date.now() + 900;
      setActive(cat);
      row.scrollIntoView({ behavior: smoothBehavior(), block: "start" });
      if (history.replaceState) history.replaceState(null, "", "#" + cat);
    });

    i18n.apply(document);
  }

  function setActive(cat) {
    Object.keys(subnavLinks).forEach(function (c) {
      if (c === cat) subnavLinks[c].setAttribute("aria-current", "true");
      else subnavLinks[c].removeAttribute("aria-current");
    });
    var link = subnavLinks[cat];
    if (link && subnavScroll.scrollWidth > subnavScroll.clientWidth) {
      // листаем только сам список, страницу не двигаем
      var left = link.offsetLeft - (subnavScroll.clientWidth - link.offsetWidth) / 2;
      subnavScroll.scrollTo({ left: left, behavior: smoothBehavior() });
    }
  }

  /* Следим, какой ряд сейчас на экране, и подсвечиваем его в списке */
  var spyObserver = null;
  var spyVisible = {};
  function updateScrollSpy() {
    if (!("IntersectionObserver" in window)) return;
    if (spyObserver) spyObserver.disconnect();
    spyVisible = {};
    spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { spyVisible[e.target.id] = e.isIntersecting; });
      if (Date.now() < lockSpyUntil) return;
      for (var i = 0; i < rows.length; i++) {
        if (!rows[i].section.hidden && spyVisible[rows[i].id]) {
          setActive(rows[i].id);
          return;
        }
      }
    }, { rootMargin: "-25% 0px -60% 0px" });
    rows.forEach(function (r) { if (!r.section.hidden) spyObserver.observe(r.section); });
    var first = rows.filter(function (r) { return !r.section.hidden; })[0];
    if (first && !Object.keys(subnavLinks).some(function (c) { return subnavLinks[c].getAttribute("aria-current"); })) {
      setActive(first.id);
    }
  }

  /* ---------- Панель фильтров ---------- */
  var colorChips = document.getElementById("color-chips");
  var sizeChips = document.getElementById("size-chips");
  var sortChips = document.getElementById("sort-chips");

  function buildFilterChips() {
    var items = sectionProducts();
    var colorsUsed = {}, sizesUsed = {};
    items.forEach(function (p) {
      p.colors.forEach(function (c) { colorsUsed[c] = true; });
      p.sizes.forEach(function (s) { sizesUsed[s] = true; });
    });

    Object.keys(data.colors).filter(function (c) { return colorsUsed[c]; }).forEach(function (c) {
      var chip = h("button", { class: "chip", type: "button", "data-color": c, "aria-pressed": "false", "data-i18n": "color." + c });
      colorChips.appendChild(chip);
    });

    SIZE_ORDER.filter(function (s) { return sizesUsed[s]; }).forEach(function (s) {
      sizeChips.appendChild(h("button", {
        class: "chip", type: "button", "data-size": s, "aria-pressed": "false", "data-i18n": "size." + s
      }));
    });

    i18n.apply(filtersModal);
  }

  var renderTimer = null;
  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderRows, 120);
  }

  function togglePressed(btn, on) { btn.setAttribute("aria-pressed", on ? "true" : "false"); }

  sortChips.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-sort]") : null;
    if (!btn) return;
    var v = btn.getAttribute("data-sort");
    state.sort = state.sort === v ? null : v;
    Array.prototype.forEach.call(sortChips.querySelectorAll("[data-sort]"), function (b) {
      togglePressed(b, b.getAttribute("data-sort") === state.sort);
    });
    scheduleRender();
  });

  colorChips.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-color]") : null;
    if (!btn) return;
    var c = btn.getAttribute("data-color");
    if (state.colors[c]) delete state.colors[c]; else state.colors[c] = true;
    togglePressed(btn, !!state.colors[c]);
    scheduleRender();
  });

  sizeChips.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-size]") : null;
    if (!btn) return;
    var s = btn.getAttribute("data-size");
    if (state.sizes[s]) delete state.sizes[s]; else state.sizes[s] = true;
    togglePressed(btn, !!state.sizes[s]);
    scheduleRender();
  });

  /* Цена: в поле можно ввести только цифры. Всё остальное сразу стирается. */
  function readPriceInputs() {
    var min = minInput.value === "" ? null : parseInt(minInput.value, 10);
    var max = maxInput.value === "" ? null : parseInt(maxInput.value, 10);
    var bad = (min !== null && isNaN(min)) || (max !== null && isNaN(max)) ||
      (min !== null && max !== null && min > max);
    if (bad) {
      priceError.hidden = false;
      minInput.setAttribute("aria-invalid", "true");
      maxInput.setAttribute("aria-invalid", "true");
      return;
    }
    priceError.hidden = true;
    minInput.removeAttribute("aria-invalid");
    maxInput.removeAttribute("aria-invalid");
    state.min = min;
    state.max = max;
    scheduleRender();
  }

  [minInput, maxInput].forEach(function (input) {
    input.addEventListener("input", function () {
      var clean = input.value.replace(/\D/g, "").slice(0, 6);
      if (clean !== input.value) input.value = clean;
      readPriceInputs();
    });
  });

  function updateCurrencyUi() {
    var sign = i18n.getLang() === "en" ? "$" : "₴";
    Array.prototype.forEach.call(document.querySelectorAll("[data-currency]"), function (el) {
      el.textContent = sign;
    });
    var k = priceKey();
    var prices = sectionProducts().map(function (p) { return p.price[k]; });
    if (prices.length) {
      minInput.placeholder = String(Math.min.apply(null, prices));
      maxInput.placeholder = String(Math.max.apply(null, prices));
    }
  }

  function resetAll() {
    state.sort = null;
    state.colors = {};
    state.sizes = {};
    state.min = null;
    state.max = null;
    minInput.value = "";
    maxInput.value = "";
    priceError.hidden = true;
    minInput.removeAttribute("aria-invalid");
    maxInput.removeAttribute("aria-invalid");
    Array.prototype.forEach.call(filtersModal.querySelectorAll(".chip"), function (b) { togglePressed(b, false); });
    renderRows();
  }

  resetBtn.addEventListener("click", resetAll);
  resetAllBtn.addEventListener("click", function () {
    resetAll();
    openBtn.focus({ preventScroll: true }); // кнопка сброса исчезла, фокус не должен потеряться
  });
  openBtn.addEventListener("click", function () { P.modal.open(filtersModal, openBtn); });

  /* ---------- Смена языка ----------
     Валюта меняется (гривны или доллары), поэтому фильтр по цене сбрасывается. */
  document.addEventListener("prysmerk:lang", function () {
    if (!data) return;
    state.min = null;
    state.max = null;
    minInput.value = "";
    maxInput.value = "";
    priceError.hidden = true;
    updateCurrencyUi();
    renderRows();
    if (!statusEl.hidden && statusEl.getAttribute("data-i18n")) statusEl.textContent = t(statusEl.getAttribute("data-i18n"));
  });

  /* ---------- Открытие товара ---------- */
  catalogEl.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a.tile") : null;
    if (!a || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (P.hero && P.hero.available()) {
      P.hero.start(a);
    } else {
      // «Уменьшить движение»: без зума, только затухание. Переход тоже сразу.
      document.dispatchEvent(new CustomEvent("prysmerk:leave"));
      document.body.classList.add("is-hero-leaving");
      a.classList.add("is-chosen");
      location.href = a.href;
    }
  });

  /* ---------- Предзагрузка ----------
     Пока палец или курсор над плашкой, страница товара уже качается: к моменту клика она в кэше.
     Скрипты и стили страницы товара подгружаем заранее, когда браузер свободен. */
  var prefetched = {};
  function prefetch(href) {
    if (!href || prefetched[href]) return;
    prefetched[href] = true;
    var l = document.createElement("link");
    l.rel = "prefetch";
    l.href = href;
    document.head.appendChild(l);
  }
  function tileFromEvent(e) { return e.target.closest ? e.target.closest("a.tile") : null; }
  catalogEl.addEventListener("pointerover", function (e) { var a = tileFromEvent(e); if (a) prefetch(a.href); });
  catalogEl.addEventListener("touchstart", function (e) { var a = tileFromEvent(e); if (a) prefetch(a.href); }, { passive: true });
  function prefetchProductAssets() {
    ["css/product.css", "js/product.js", "js/order.js"].forEach(prefetch);
  }
  if ("requestIdleCallback" in window) window.requestIdleCallback(prefetchProductAssets, { timeout: 2500 });
  else window.setTimeout(prefetchProductAssets, 1500);

  /* ---------- Запуск ---------- */
  function init(json) {
    data = json;
    buildStructure();
    renderRows();

    // Панель фильтров скрыта: собираем её после первого кадра, чтобы не удлинять его.
    // Запасной таймер нужен для фоновых вкладок, где requestAnimationFrame не вызывается.
    var filtersBuilt = false;
    var buildFilters = function () {
      if (filtersBuilt) return;
      filtersBuilt = true;
      buildFilterChips();
      updateCurrencyUi();
    };
    window.requestAnimationFrame(buildFilters);
    window.setTimeout(buildFilters, 120);

    // Переход по ссылке вида section.html?s=men#jackets
    var hash = decodeURIComponent(location.hash.replace("#", ""));
    if (hash && document.getElementById(hash) && subnavLinks[hash]) {
      lockSpyUntil = Date.now() + 900;
      setActive(hash);
      document.getElementById(hash).scrollIntoView({ block: "start" });
    }
  }

  function ready() { document.body.classList.add("is-ready"); }

  i18n.apply(document);

  // Если данные уже есть в памяти вкладки, рисуем сразу, в этом же кадре. Иначе ждём сеть.
  var cachedData = P.data.cached();
  if (cachedData) {
    init(cachedData);
    ready();
    P.data.load(); // в фоне проверит свежесть
  } else {
    P.data.load()
      .then(function (d) { init(d); ready(); })
      .catch(function () {
        showStatus("catalog.error");
        openBtn.hidden = true;
        // Повтор: страница перезагружается целиком, так вернётся и сбойный файл, и данные
        var retry = document.getElementById("catalog-retry");
        retry.hidden = false;
        retry.addEventListener("click", function () { location.reload(); });
        ready();
      });
  }
})();
