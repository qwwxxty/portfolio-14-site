/*
  Переключение языка.
  Выбор хранится в localStorage (память браузера), поэтому на других
  страницах сайт открывается на том же языке.
  Тексты ставятся через textContent, не через innerHTML: так в страницу
  не попадёт чужая разметка.
*/
(function () {
  "use strict";

  var STORAGE_KEY = "prysmerk-lang";
  var SUPPORTED = ["uk", "en"];
  var dict = window.PRYSMERK_I18N || {};

  function readSaved() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.indexOf(v) !== -1 ? v : null;
    } catch (e) {
      return null; // приватный режим или запрет хранения
    }
  }

  function save(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* без сохранения сайт продолжает работать */
    }
  }

  var current = readSaved() || "uk";

  function t(key) {
    var d = dict[current];
    if (d && Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    if (dict.uk && Object.prototype.hasOwnProperty.call(dict.uk, key)) return dict.uk[key];
    return key;
  }

  function apply(root) {
    root = root || document;
    var i, nodes;

    nodes = root.querySelectorAll("[data-i18n]");
    for (i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
    }

    nodes = root.querySelectorAll("[data-i18n-aria]");
    for (i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute("aria-label", t(nodes[i].getAttribute("data-i18n-aria")));
    }

    nodes = root.querySelectorAll("[data-lang-set]");
    for (i = 0; i < nodes.length; i++) {
      var on = nodes[i].getAttribute("data-lang-set") === current;
      nodes[i].setAttribute("aria-pressed", on ? "true" : "false");
    }

    document.documentElement.lang = current;

    var titleKey = document.documentElement.getAttribute("data-title-key");
    if (titleKey) document.title = t(titleKey);
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1 || lang === current) return;
    current = lang;
    save(lang);
    apply(document);
    document.dispatchEvent(new CustomEvent("prysmerk:lang", { detail: { lang: lang } }));
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-lang-set]") : null;
    if (btn) setLang(btn.getAttribute("data-lang-set"));
  });

  window.PRYSMERK = window.PRYSMERK || {};
  window.PRYSMERK.i18n = {
    t: t,
    apply: apply,
    setLang: setLang,
    getLang: function () { return current; }
  };
})();
