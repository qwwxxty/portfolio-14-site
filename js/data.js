/*
  Общие данные: загрузка products.json и форматирование цен.
  Раньше это жило внутри catalog.js. Теперь им пользуются и страница раздела,
  и страница товара, и окно заказа, поэтому форматирование цены одно на всех.
*/
(function () {
  "use strict";

  var P = (window.PRYSMERK = window.PRYSMERK || {});
  var i18n = P.i18n;
  var cache = null;

  function load() {
    if (!cache) {
      cache = fetch("data/products.json").then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
      cache.catch(function () { cache = null; }); // при ошибке можно попробовать снова
    }
    return cache;
  }

  // Украинский: гривны. Английский: доллары. Обе цены лежат в products.json,
  // курс не считается.
  function priceKey() { return i18n.getLang() === "en" ? "usd" : "uah"; }

  var numberFormats = {};
  function formatAmount(n) {
    var lang = i18n.getLang();
    if (!numberFormats[lang]) {
      numberFormats[lang] = new Intl.NumberFormat(lang === "en" ? "en-US" : "uk-UA", { maximumFractionDigits: 0 });
    }
    var s = numberFormats[lang].format(n);
    return lang === "en" ? "$" + s : s + " ₴";
  }

  function formatPrice(p) { return formatAmount(p.price[priceKey()]); }
  function unitPrice(p) { return p.price[priceKey()]; }
  function nameOf(p) { return p.name[i18n.getLang()] || p.name.uk; }
  function descOf(p) { return p.description ? (p.description[i18n.getLang()] || p.description.uk) : ""; }

  P.data = {
    load: load,
    priceKey: priceKey,
    formatAmount: formatAmount,
    formatPrice: formatPrice,
    unitPrice: unitPrice,
    nameOf: nameOf,
    descOf: descOf
  };
})();
