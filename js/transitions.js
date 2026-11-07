/*
  Плавные переходы между страницами.
  1) Свечение. Новая страница стартует с цветом прошлой и за 0,7 с
     перетекает в свой. Так при переходе из главной в «Чоловічий»
     оранжевый плавно становится синим, а не мигает.
  2) Уход. Перед переходом содержимое мягко гаснет.
*/
(function () {
  "use strict";

  var KEY = "prysmerk-section";
  var LEAVE_MS = 380;
  var body = document.body;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var target = body.getAttribute("data-section") || "home";
  var previous = null;
  try { previous = sessionStorage.getItem(KEY); } catch (e) { /* ничего */ }

  if (!reduce && previous && previous !== target) {
    // 1. ставим цвет прошлой страницы
    body.setAttribute("data-section", previous);
    // 2. заставляем браузер «увидеть» его
    void getComputedStyle(body).getPropertyValue("--glow");
    // 3. в следующем кадре включаем настоящий цвет: запускается плавный переход
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        body.setAttribute("data-section", target);
      });
    });
  }
  try { sessionStorage.setItem(KEY, target); } catch (e) { /* ничего */ }

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

  // Кнопка «назад» может показать страницу из памяти браузера уже погасшей
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) body.classList.remove("is-leaving");
  });
})();
