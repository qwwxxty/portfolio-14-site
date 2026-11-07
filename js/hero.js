/*
  Анимация открытия товара: плашка растворяется, фото плавно увеличивается к центру.

  Как это устроено (без видео-магии, простыми словами):
  1. На странице раздела по клику все плашки кроме выбранной, заголовки и шапка гаснут,
     а у выбранной гаснет стеклянная подпись. Само фото остаётся на месте.
  2. Мы запоминаем, где именно было фото (положение и размер на экране).
  3. На странице товара главное фото сначала ставится ровно туда же и потом плавно
     едет и растёт на своё место. Эта техника называется FLIP:
     «измерили, откуда стартуем, и проиграли разницу».
  4. Пока страница товара ещё грузит данные, на её месте стоит «призрак»: копия фото
     в том же месте. Так в момент перехода не видно пустого экрана.
  Если включено «уменьшить движение» или страница открыта напрямую, этого нет:
  работает обычный плавный переход.
*/
(function () {
  "use strict";

  var P = (window.PRYSMERK = window.PRYSMERK || {});
  var KEY = "prysmerk-hero";
  var LEAVE_MS = 420;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function productIdFromHref(href) {
    try { return new URL(href, location.href).searchParams.get("id"); } catch (e) { return null; }
  }

  /* ---------- Страница раздела: старт ---------- */
  function start(tile) {
    var href = tile.href;
    var id = productIdFromHref(href);
    var r = tile.getBoundingClientRect();
    var tone = tile.style.getPropertyValue("--tone") || "";
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ id: id, x: r.left, y: r.top, w: r.width, h: r.height, tone: tone }));
    } catch (e) { /* без памяти анимации не будет, переход всё равно сработает */ }

    document.dispatchEvent(new CustomEvent("prysmerk:leave"));
    tile.classList.add("is-chosen");
    document.body.classList.add("is-hero-leaving");
    window.setTimeout(function () { location.href = href; }, LEAVE_MS);
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

  /* Призрак: копия фото в том же месте, пока грузятся данные */
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
    var dx = d.x - n.left;
    var dy = d.y - n.top;
    var anim = photoEl.animate([
      { transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")", borderRadius: 22 / s + "px" },
      { transform: "none", borderRadius: "22px" }
    ], { duration: 950, easing: "cubic-bezier(0.22, 1, 0.36, 1)", transformOrigin: "0 0" });
    photoEl.style.transformOrigin = "0 0";
    removeGhost(); // тот же кадр: призрак исчезает, фото уже стоит на его месте
    anim.onfinish = function () { photoEl.style.transformOrigin = ""; };
    return true;
  }

  P.hero = { start: start, showGhost: showGhost, removeGhost: removeGhost, play: play, available: function () { return !reduce; } };
})();
