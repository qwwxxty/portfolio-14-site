/*
  Плавные переходы между страницами.

  1) Свечение. Новая страница стартует с цветом прошлой и за 0,7 с перетекает
     в свой. Главная (фиолетовое) в «Чоловічий» (синее): фиолетовый плавно
     становится синим. «Чоловічий» в «Жіночий»: синий становится бордовым.
     Так же работает подсветка, подчёркивание и цена: у них те же переменные.
  2) Кнопки «Назад» и «Вперёд» в браузере. Страница возвращается из памяти
     браузера (bfcache) и скрипт не запускается заново, поэтому цвет
     перетекает по событию pageshow.
  3) Уход. Перед переходом содержимое мягко гаснет, а свечение остаётся.

  Запоминаем, на какой странице были в последний раз (sessionStorage).
*/
(function () {
  "use strict";

  var KEY = "prysmerk-section";
  var LEAVE_MS = 380;
  var body = document.body;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Какой раздел показывает эта страница. Для section.html он берётся из адреса
  // (body.data-section на время смены цвета временно подменяется).
  var target = body.getAttribute("data-section") || "home";

  function readPrev() {
    try { return sessionStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writePrev(v) {
    try { sessionStorage.setItem(KEY, v); } catch (e) { /* ничего */ }
  }

  /* Плавно перевести цвета из раздела `from` в раздел `to`. */
  function morph(from, to) {
    // 1. Мгновенно (без анимации) ставим цвет, с которого начинаем
    body.classList.add("no-tr");
    body.setAttribute("data-section", from);
    void getComputedStyle(body).getPropertyValue("--c-main");
    body.classList.remove("no-tr");
    void getComputedStyle(body).getPropertyValue("--c-main");
    // 2. В следующем кадре включаем настоящий цвет: запускается плавный переход
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        body.setAttribute("data-section", to);
      });
    });
  }

  // Первая загрузка страницы
  var previous = readPrev();
  if (!reduce && previous && previous !== target) morph(previous, target);
  writePrev(target);

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

  // «Назад» и «Вперёд»: страница вернулась из памяти браузера
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    body.classList.remove("is-leaving");
    var prev = readPrev();
    if (!reduce && prev && prev !== target) morph(prev, target);
    else body.setAttribute("data-section", target);
    writePrev(target);
  });
})();
