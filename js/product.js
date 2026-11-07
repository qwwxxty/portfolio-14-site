/*
  Страница товара.
  Фото (главное и три других), название, цена, описание, размерная сетка-заглушка,
  доступные размеры и кнопка «Замовити».
  Все тексты ставятся через textContent и createElement, не через innerHTML.
*/
(function () {
  "use strict";

  var P = window.PRYSMERK;
  var i18n = P.i18n;
  var t = i18n.t;
  var h = P.dom.h;
  var D = P.data;

  var HEX = /^#[0-9a-f]{6}$/i;
  var id = new URLSearchParams(location.search).get("id") || "";
  var root = document.getElementById("product");

  // Если пришли с плашки, ставим «призрак» фото на прежнее место, пока грузятся данные
  var heroData = P.hero.showGhost(id);

  var product = null;
  var colorMap = {};

  /* ---------- Свет вещи ----------
     Свечение берёт цвет самой вещи. Но цвета вещей разной яркости: чёрная вещь дала бы
     невидимый свет, молочная слишком яркий, и приглушённый текст на нём перестал бы
     читаться. Поэтому цвет подгоняется по яркости: в центре свечение складывается
     примерно до 50% цвета, и эта яркость держится в допустимых пределах. */
  var PEAK = 0.5;
  var L_MIN = 0.02;   // не темнее: иначе света не видно
  var L_MAX = 0.036;  // не светлее: иначе текст не пройдёт контраст 4,5 : 1

  function hexToRgb(hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); }); }
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
  function scaled(rgb, k) { return rgb.map(function (v) { return Math.max(0, Math.min(255, v * k)); }); }
  function toHex(rgb) { return "#" + rgb.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join(""); }

  function glowFor(hex) {
    var base = hexToRgb(hex);
    if (lum(base) < 0.0005) base = [34, 34, 38]; // совсем чёрный: берём тёмно-серый, цвета в нём нет
    var k = 1;
    var peak = function (kk) { return lum(scaled(scaled(base, kk), PEAK)); };
    if (peak(k) > L_MAX) {
      var lo = 0.01, hi = 1;
      for (var i = 0; i < 24; i++) { var mid = (lo + hi) / 2; if (peak(mid) > L_MAX) hi = mid; else lo = mid; }
      k = lo;
    } else if (peak(k) < L_MIN) {
      var lo2 = 1, hi2 = 12;
      for (var j = 0; j < 24; j++) { var m2 = (lo2 + hi2) / 2; if (peak(m2) < L_MIN) lo2 = m2; else hi2 = m2; }
      k = hi2;
    }
    return toHex(scaled(base, k));
  }

  function setGlow(hex) {
    if (!HEX.test(hex || "")) return;
    if (P.glow) P.glow.set(glowFor(hex));
  }

  var infoEl = null;
  var mainPhoto = null;
  var orderBtn = null;

  // Разные «ракурсы» заглушек: меняем угол и положение света в градиенте
  var VARIANTS = [
    { ang: "170deg", px: "28%", py: "18%" },
    { ang: "205deg", px: "72%", py: "24%" },
    { ang: "150deg", px: "30%", py: "72%" },
    { ang: "188deg", px: "62%", py: "58%" }
  ];

  function setTitle(text) { document.title = text + ". PRYSMERK"; }

  function ready() { document.body.classList.add("is-ready"); }

  // Выполнить функцию после первого кадра. Запасной таймер нужен для фоновых вкладок:
  // там браузер не вызывает requestAnimationFrame, и страница осталась бы недорисованной.
  function afterFirstFrame(fn) {
    var done = false;
    var run = function () { if (done) return; done = true; fn(); };
    window.requestAnimationFrame(run);
    window.setTimeout(run, 120);
  }

  function status(key) {
    P.hero.removeGhost();
    root.replaceChildren(
      h("p", { class: "product__status", "data-i18n": key }, [t(key)]),
      h("a", { class: "btn product__status-link", href: "section.html?s=men", "data-i18n": "product.notfound.link" }, [t("product.notfound.link")])
    );
    document.title = "PRYSMERK";
    ready();
  }

  function photo(variant, tone, isMain) {
    var ph = h("span", { class: "tile__ph", "aria-hidden": "true" });
    var el = h("div", { class: "photo" + (isMain ? " photo--main" : "") }, [ph]);
    el.style.setProperty("--tone", tone);
    el.style.setProperty("--ang", variant.ang);
    el.style.setProperty("--px", variant.px);
    el.style.setProperty("--py", variant.py);
    return el;
  }

  function chevron() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.25");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M15 5l-7 7 7 7");
    svg.appendChild(p);
    return svg;
  }

  /* Размерная сетка: заглушка. Для аксессуаров (один размер) не нужна. */
  function sizeChart(p) {
    if (p.sizes.length === 1 && p.sizes[0] === "one") return null;
    var rows = p.sizes.map(function (s) {
      return h("tr", {}, [
        h("th", { scope: "row", "data-i18n": "size." + s }, [t("size." + s)]),
        h("td", {}, ["—"]),
        h("td", {}, ["—"])
      ]);
    });
    return h("details", { class: "chart" }, [
      h("summary", { "data-i18n": "product.chart" }, [t("product.chart")]),
      h("table", {}, [
        h("thead", {}, [h("tr", {}, [
          h("th", { scope: "col", "data-i18n": "product.chart.size" }, [t("product.chart.size")]),
          h("th", { scope: "col", "data-i18n": "product.chart.chest" }, [t("product.chart.chest")]),
          h("th", { scope: "col", "data-i18n": "product.chart.length" }, [t("product.chart.length")])
        ])]),
        h("tbody", {}, rows)
      ]),
      h("p", { class: "chart__note", "data-i18n": "product.chart.note" }, [t("product.chart.note")])
    ]);
  }

  /* Правая часть: текст. Пересобирается при смене языка. */
  function buildInfo(p) {
    var sizes = h("ul", { class: "size-list" }, p.sizes.map(function (s) {
      return h("li", { "data-i18n": "size." + s }, [t("size." + s)]);
    }));

    var kids = [
      h("h1", { class: "product__name" }, [D.nameOf(p)]),
      h("p", { class: "product__price" }, [D.formatPrice(p)]),
      h("p", { class: "product__desc" }, [D.descOf(p)]),
      h("div", { class: "product__sizes" }, [
        h("p", { class: "product__label", "data-i18n": "product.sizes" }, [t("product.sizes")]),
        sizes
      ])
    ];
    var chart = sizeChart(p);
    if (chart) kids.push(chart);
    kids.push(orderBtn); // одна и та же кнопка: окно заказа возвращает на неё фокус
    return kids;
  }

  function renderInfo() {
    infoEl.replaceChildren.apply(infoEl, buildInfo(product));
    var cat = document.getElementById("back-label");
    if (cat) cat.textContent = t("cat." + product.category);
    var back = document.getElementById("back-link");
    if (back) back.setAttribute("aria-label", t("product.back") + ": " + t("cat." + product.category));
    setTitle(D.nameOf(product));
  }

  function init(data) {
    var p = data.products.filter(function (x) { return x.id === id; })[0];
    if (!p) { status("product.notfound"); return; }
    product = p;
    colorMap = data.colors;

    var toneRaw = data.colors[p.colors[0]];
    var tone = HEX.test(toneRaw || "") ? toneRaw : "#3b3b40";

    // Назад: на страницу раздела, к нужному ряду
    var back = h("a", {
      class: "product__back",
      id: "back-link",
      href: "section.html?s=" + encodeURIComponent(p.section) + "#" + encodeURIComponent(p.category)
    }, [chevron(), h("span", { id: "back-label" }, [t("cat." + p.category)])]);

    mainPhoto = photo(VARIANTS[0], tone, true);
    var gallery = h("div", { class: "gallery", role: "group", tabindex: "0", "data-i18n-aria": "product.gallery" },
      VARIANTS.slice(1, Math.min(4, p.photos || 4)).map(function (v) { return photo(v, tone, false); }));
    var media = h("div", { class: "product__media" }, [mainPhoto, gallery]);

    // Кнопка создаётся один раз. При смене языка пересобирается только текст вокруг неё,
    // иначе окно заказа «потеряет» кнопку, на которую должно вернуть фокус после закрытия.
    orderBtn = h("button", { class: "btn btn--wide", type: "button", "data-i18n": "product.order" }, [t("product.order")]);
    orderBtn.addEventListener("click", function () { P.order.open(product, orderBtn); });

    infoEl = h("div", { class: "product__info" });
    var layout = h("div", { class: "product" }, [media, infoEl]);

    // Кадр 1: только то, что видно сразу (кнопка назад и фото), и старт анимации открытия.
    root.replaceChildren(back, layout);
    if (heroData) P.hero.play(mainPhoto, id);

    // Кадр 2: текст, размеры, свет вещи, предзагрузка. Так сборка страницы не складывается
    // в один длинный кадр, который бы подвесил начало зума на слабом телефоне.
    afterFirstFrame(function () {
      renderInfo();
      i18n.apply(root);
      setGlow(tone);
      ready();
      prefetchBack(p);
    });
  }

  /* Предзагрузка: назад ведёт на страницу раздела, подгружаем её заранее, когда браузер свободен */
  function prefetchBack(p) {
    var urls = ["section.html?s=" + encodeURIComponent(p.section), "js/catalog.js"];
    var run = function () {
      urls.forEach(function (u) {
        var l = document.createElement("link");
        l.rel = "prefetch";
        l.href = u;
        document.head.appendChild(l);
      });
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 2500 });
    else window.setTimeout(run, 1500);
  }

  // Выбрали цвет в окне заказа: свет становится цветом этой вещи
  document.addEventListener("prysmerk:color", function (e) {
    if (e.detail && colorMap[e.detail.color]) setGlow(colorMap[e.detail.color]);
  });

  document.addEventListener("prysmerk:lang", function () {
    if (!product || !infoEl) return;
    renderInfo();
  });

  if (!id) {
    status("product.notfound");
  } else {
    // Данные уже в памяти вкладки: рисуем в этом же кадре. Иначе ждём сеть (файл уже качается через preload).
    var cachedData = D.cached();
    if (cachedData) {
      init(cachedData);
      D.load(); // в фоне проверит свежесть
    } else {
      D.load().then(init).catch(function () { status("product.error"); });
    }
  }
})();
