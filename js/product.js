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

  function status(key) {
    P.hero.removeGhost();
    root.replaceChildren(
      h("p", { class: "product__status", "data-i18n": key }, [t(key)]),
      h("a", { class: "btn product__status-link", href: "section.html?s=men", "data-i18n": "product.notfound.link" }, [t("product.notfound.link")])
    );
    document.title = "PRYSMERK";
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

    root.replaceChildren(back, layout);
    renderInfo();
    i18n.apply(root);

    // Открытие с плашки: главное фото едет из прежнего места на своё
    if (heroData) P.hero.play(mainPhoto, id);
  }

  document.addEventListener("prysmerk:lang", function () {
    if (!product || !infoEl) return;
    renderInfo();
  });

  if (!id) {
    status("product.notfound");
  } else {
    D.load().then(init).catch(function () { status("product.error"); });
  }
})();
