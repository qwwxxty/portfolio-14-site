/*
  Общий каркас сайта: кнопка меню, левое окно меню, футер.
  Они собираются здесь один раз и появляются на каждой странице.
  Так не нужно копировать одни и те же 60 строк HTML в каждый файл.
  Элементы создаются через createElement, без innerHTML.
*/
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  function h(tag, props, kids) {
    var el = document.createElement(tag);
    var k;
    props = props || {};
    for (k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
      if (k === "class") el.className = props[k];
      else el.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (kid) {
      el.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    });
    return el;
  }

  function icon(paths, size) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size || 24);
    svg.setAttribute("height", size || 24);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.25");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    paths.forEach(function (d) {
      var p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    });
    return svg;
  }

  var SECTIONS = [
    { id: "men", key: "nav.men", href: "section.html?s=men" },
    { id: "women", key: "nav.women", href: "section.html?s=women" },
    { id: "kids", key: "nav.kids", href: "section.html?s=kids" }
  ];

  var FOOTER_LINKS = [
    { key: "footer.privacy", href: "privacy.html" },
    { key: "footer.about", href: "about.html" },
    { key: "footer.delivery", href: "delivery.html" },
    { key: "footer.returns", href: "returns.html" },
    { key: "footer.contacts", href: "contacts.html" }
  ];

  var currentSection = document.body.getAttribute("data-section") || "home";
  var currentPage = (location.pathname.split("/").pop() || "index.html");

  /* ---------- Кнопка меню ---------- */
  var menuBtn = h("button", {
    class: "menu-btn glass-btn",
    type: "button",
    "aria-expanded": "false",
    "aria-controls": "site-drawer",
    "data-i18n-aria": "menu.open"
  }, [icon(["M4 9h16", "M4 15h10"])]);

  var topbar = h("header", { class: "topbar" }, [menuBtn]);

  /* ---------- Окно меню ---------- */
  var scrim = h("div", { class: "scrim", "aria-hidden": "true" });

  var closeBtn = h("button", {
    class: "drawer__close glass-btn",
    type: "button",
    "data-i18n-aria": "menu.close"
  }, [icon(["M6 6l12 12", "M18 6L6 18"], 22)]);

  var sectionItems = SECTIONS.map(function (s) {
    var a = h("a", { class: "drawer__link", href: s.href, "data-s": s.id }, [
      h("span", { "data-i18n": s.key })
    ]);
    if (currentSection === s.id) a.setAttribute("aria-current", "page");
    return h("li", {}, [a]);
  });

  var aboutLink = h("a", { class: "drawer__link drawer__link--quiet", href: "about.html" }, [
    h("span", { "data-i18n": "nav.about" })
  ]);
  if (currentPage === "about.html") aboutLink.setAttribute("aria-current", "page");

  var langGroup = h("div", { class: "lang", role: "group", "data-i18n-aria": "lang.label" }, [
    h("button", { type: "button", class: "lang__btn", "data-lang-set": "uk", lang: "uk", "aria-pressed": "false" }, [
      h("span", { "data-i18n": "lang.uk" })
    ]),
    h("button", { type: "button", class: "lang__btn", "data-lang-set": "en", lang: "en", "aria-pressed": "false" }, [
      h("span", { "data-i18n": "lang.en" })
    ])
  ]);

  var drawer = h("aside", {
    class: "drawer glass",
    id: "site-drawer",
    role: "dialog",
    "aria-modal": "true",
    "data-i18n-aria": "menu.title"
  }, [
    h("div", { class: "drawer__head" }, [closeBtn]),
    h("nav", { class: "drawer__nav", "data-i18n-aria": "menu.sections" }, [
      h("ul", { class: "drawer__list" }, sectionItems),
      h("div", { class: "drawer__rule", "aria-hidden": "true" }),
      aboutLink
    ]),
    h("div", { class: "drawer__foot" }, [langGroup])
  ]);
  drawer.setAttribute("inert", "");

  /* ---------- Футер ---------- */
  var footer = h("footer", { class: "footer" }, [
    h("p", { class: "footer__brand", lang: "en" }, ["PRYSMERK"]),
    h("nav", { class: "footer__nav", "data-i18n-aria": "footer.nav" }, [
      h("ul", {}, FOOTER_LINKS.map(function (l) {
        return h("li", {}, [h("a", { href: l.href, "data-i18n": l.key })]);
      }))
    ]),
    h("p", { class: "footer__note", "data-i18n": "footer.note" })
  ]);

  document.body.insertBefore(topbar, document.body.firstChild);
  document.body.appendChild(scrim);
  document.body.appendChild(drawer);
  document.body.appendChild(footer);

  /* ---------- Поведение меню ---------- */
  var lastFocus = null;

  function isOpen() { return document.body.classList.contains("menu-open"); }

  function openMenu() {
    if (isOpen()) return;
    lastFocus = document.activeElement;
    drawer.removeAttribute("inert");
    document.body.classList.add("menu-open");
    menuBtn.setAttribute("aria-expanded", "true");
    // небольшая пауза, чтобы фокус не прыгал во время выезда окна
    window.setTimeout(function () { closeBtn.focus({ preventScroll: true }); }, 60);
  }

  function closeMenu(returnFocus) {
    if (!isOpen()) return;
    document.body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
    drawer.setAttribute("inert", "");
    if (returnFocus !== false) {
      (lastFocus && lastFocus.focus ? lastFocus : menuBtn).focus({ preventScroll: true });
    }
  }

  menuBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", function () { closeMenu(); });
  scrim.addEventListener("click", function () { closeMenu(); });

  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") {
      closeMenu();
      return;
    }
    if (e.key === "Tab") {
      // фокус не должен уходить из открытого окна
      var f = drawer.querySelectorAll("a[href], button");
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Свайп влево закрывает окно
  var touchX = null;
  drawer.addEventListener("touchstart", function (e) {
    touchX = e.touches[0].clientX;
  }, { passive: true });
  drawer.addEventListener("touchmove", function (e) {
    if (touchX === null) return;
    if (e.touches[0].clientX - touchX < -60) {
      touchX = null;
      closeMenu();
    }
  }, { passive: true });
  drawer.addEventListener("touchend", function () { touchX = null; }, { passive: true });

  // Переход на другую страницу: окно закрываем без возврата фокуса
  document.addEventListener("prysmerk:leave", function () { closeMenu(false); });

  window.PRYSMERK = window.PRYSMERK || {};
  window.PRYSMERK.menu = { open: openMenu, close: closeMenu };

  if (window.PRYSMERK.i18n) window.PRYSMERK.i18n.apply(document);
})();
