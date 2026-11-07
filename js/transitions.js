/*
  Плавные переходы между страницами.

  Цветов по разделам больше нет, поэтому менять цвет свечения при переходе не нужно.
  Осталось:
  1) Уход. Перед переходом содержимое мягко гаснет, а свечение остаётся на месте.
  2) Возврат кнопками «Назад» и «Вперёд»: страница приходит из памяти браузера
     (bfcache) уже погасшей, поэтому убираем состояние ухода.
  3) Отметка «уже были на сайте» (sessionStorage). По ней главная не включает
     вступительное нарастание свечения заново, когда мы пришли с другой страницы.
*/
(function () {
  "use strict";

  var KEY = "prysmerk-section";
  var LEAVE_MS = 380;
  var body = document.body;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try { sessionStorage.setItem(KEY, body.getAttribute("data-section") || "home"); } catch (e) { /* ничего */ }

  function isInternalPageLink(a, e) {
    if (!a || !a.href) return false;
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return false; }
    if (url.origin !== location.origin) return false;
    // переход внутри той же страницы (якорь) не гасим
    if (url.pathname === location.pathname && url.search === location.search) return false;
    return true;
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!isInternalPageLink(a, e)) return;
    if (reduce) return; // без анимации: обычный переход
    e.preventDefault();
    var href = a.href;
    document.dispatchEvent(new CustomEvent("prysmerk:leave"));
    body.classList.add("is-leaving");
    window.setTimeout(function () { location.href = href; }, LEAVE_MS);
  });

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) body.classList.remove("is-leaving");
  });
})();
