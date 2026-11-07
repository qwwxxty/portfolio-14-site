/*
  Анимация открытия товара: плашка растворяется, фото плавно увеличивается к центру.

  Как это устроено (простыми словами):
  1. Клик. Переход на страницу товара начинается СРАЗУ. В это время (параллельно, 0,2 с)
     всё вокруг выбранной плашки гаснет, а у неё гаснет стеклянная подпись.
  2. Запоминаем, где было фото: положение и размер на экране.
  3. На странице товара главное фото сначала ставится туда же, а потом плавно едет и
     растёт на своё место. Такая техника называется FLIP: «измерили, откуда стартуем,
     и проиграли только разницу».

  Что сделано, чтобы не было рывков:
  - анимируется ТОЛЬКО transform. Любое другое свойство (например border-radius) заставило бы
    браузер считать каждый кадр в главном потоке, и при его занятости кадры пропускались бы;
  - will-change: transform включается на время движения и потом снимается;
  - перед стартом фото стоит на месте плашки два кадра: за это время слой успевает
    отрисоваться, и первый кадр движения не «заикается»;
  - кривая cubic-bezier(0.4, 0, 0.2, 1) без резкого старта, 650 мс.

  Если включено «уменьшить движение»: зума нет, только затухание. Если страница открыта
  напрямую: обычное проявление.
*/
(function () {
  "use strict";

  var P = (window.PRYSMERK = window.PRYSMERK || {});
  var KEY = "prysmerk-hero";
  var DURATION = 650;
  var EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function productIdFromHref(href) {
    try { return new URL(href, location.href).searchParams.get("id"); } catch (e) { return null; }
  }

  /* ---------- Страница раздела: старт ---------- */
  function start(tile) {
    var href = tile.href;
    var r = tile.getBoundingClientRect();
    var tone = tile.style.getPropertyValue("--tone") || "";
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ id: productIdFromHref(href), x: r.left, y: r.top, w: r.width, h: r.height, tone: tone }));
    } catch (e) { /* без памяти анимации не будет, переход всё равно сработает */ }

    document.dispatchEvent(new CustomEvent("prysmerk:leave"));
    tile.classList.add("is-chosen");
    document.body.classList.add("is-hero-leaving");
    location.href = href; // без паузы: затухание идёт, пока грузится следующая страница
  }

  /* Возврат кнопкой «Назад»: страница раздела вернулась из памяти уже погасшей */
  function reset() {
    document.body.classList.remove("is-hero-leaving");
    var chosen = document.querySelectorAll(".tile.is-chosen");
    for (var i = 0; i < chosen.length; i++) chosen[i].classList.remove("is-chosen");
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted) reset(); });

  /* ---------- Страница товара: приём ---------- */
  function read(id) {
    if (reduce) return null;
    var raw = null, data = null;
    try { raw = sessionStorage.getItem(KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { data = JSON.parse(raw); } catch (e) { return null; }
    if (!data || data.id !== id || !(data.w > 0) || !(data.h > 0)) return null;
    return data;
  }

  function clear() {
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ничего */ }
  }

  /* Призрак: копия фото в том же месте. Закрывает пустоту, пока грузятся данные,
     и пока настоящее фото отрисовывается. */
  var ghost = null;
  function showGhost(id) {
    var d = read(id);
    if (!d) return null;
    ghost = document.createElement("div");
    ghost.className = "hero-ghost";
    ghost.setAttribute("aria-hidden", "true");
    var ph = document.createElement("span");
    ph.className = "tile__ph";
    ghost.appendChild(ph);
    if (/^#[0-9a-f]{6}$/i.test(d.tone.trim())) ghost.style.setProperty("--tone", d.tone.trim());
    ghost.style.left = d.x + "px";
    ghost.style.top = d.y + "px";
    ghost.style.width = d.w + "px";
    ghost.style.height = d.h + "px";
    document.body.appendChild(ghost);
    return d;
  }
  function removeGhost() {
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    ghost = null;
  }

  /* Проиграть: главное фото едет из прежнего места на своё */
  function play(photoEl, id) {
    var d = read(id);
    clear();
    if (!d || !photoEl.animate) { removeGhost(); return false; }

    var n = photoEl.getBoundingClientRect();
    if (!(n.width > 0)) { removeGhost(); return false; }

    var s = d.w / n.width;
    var from = "translate(" + (d.x - n.left) + "px," + (d.y - n.top) + "px) scale(" + s + ")";

    // Ставим фото на место плашки (пока без движения) и готовим слой
    photoEl.style.transformOrigin = "0 0";
    photoEl.style.willChange = "transform";
    photoEl.style.transform = from;

    // Два кадра ждём: слой отрисован, призрак ещё закрывает экран. Потом он уходит, а фото стартует.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        removeGhost();
        var anim = photoEl.animate(
          [{ transform: from }, { transform: "none" }],
          { duration: DURATION, easing: EASING, fill: "both" }
        );
        photoEl.style.transform = ""; // дальше значение держит анимация
        var done = function () {
          anim.cancel();
          photoEl.style.willChange = "";
          photoEl.style.transformOrigin = "";
        };
        anim.onfinish = done;
        anim.oncancel = function () { photoEl.style.willChange = ""; photoEl.style.transformOrigin = ""; };
      });
    });
    return true;
  }

  P.hero = {
    start: start,
    showGhost: showGhost,
    removeGhost: removeGhost,
    play: play,
    available: function () { return !reduce; }
  };
})();
