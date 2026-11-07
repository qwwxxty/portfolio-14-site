/*
  Общие данные: загрузка products.json и форматирование цен.
  Раньше это жило внутри catalog.js. Теперь им пользуются и страница раздела,
  и страница товара, и окно заказа, поэтому форматирование цены одно на всех.
*/
(function () {
  "use strict";

  var P = (window.PRYSMERK = window.PRYSMERK || {});
  var i18n = P.i18n;
  var STORE_KEY = "prysmerk-data-v1";
  var promise = null;

  /* Данные из памяти вкладки (sessionStorage). Если они уже есть, страницу можно
     нарисовать сразу, в том же кадре, без ожидания сети. */
  var memo = null; // уже разобранные данные: JSON.parse нужен один раз на страницу
  function cached() {
    if (memo) return memo;
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      memo = raw ? JSON.parse(raw) : null;
    } catch (e) {
      memo = null;
    }
    return memo;
  }

  function fetchFresh() {
    return fetch("data/products.json").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { /* без кэша работает по-старому */ }
      return d;
    });
  }

  /* load() возвращает данные. Если в памяти вкладки они есть, отдаёт их сразу, а свежую
     копию в это время проверяет в фоне (она пригодится на следующей странице).
     Запрос на файл уже запущен тегом <link rel="preload"> в HTML, поэтому ждать почти нечего. */
  function load() {
    if (promise) return promise;
    var c = cached();
    if (c) {
      promise = Promise.resolve(c);
      fetchFresh().catch(function () { /* офлайн: остаёмся на кэше */ });
    } else {
      promise = fetchFresh();
      promise.catch(function () { promise = null; });
    }
    return promise;
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
    cached: cached,
    priceKey: priceKey,
    formatAmount: formatAmount,
    formatPrice: formatPrice,
    unitPrice: unitPrice,
    nameOf: nameOf,
    descOf: descOf
  };
})();
