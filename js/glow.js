/*
  Цвет свечения («Свет вещи») без тяжёлых перерисовок.

  Раньше цвет менялся переходом самой переменной цвета. Браузер не умеет делать такие
  переходы на видеокарте, поэтому каждый кадр перерисовывал огромный слой свечения
  в главном потоке, ровно в момент зума фото, и кадры пропускались.

  Теперь иначе: рядом с обычным свечением лежат один или два слоя «окраски» с готовым
  цветом. Мы лишь меняем прозрачность слоёв (opacity). Это самое дешёвое действие,
  его целиком делает видеокарта. Цвет внутри слоя не меняется и не перерисовывается.

    P.glow.set("#rrggbb")  плавно перетечь в этот цвет
    P.glow.clear()         плавно вернуться к обычному графиту

  Запоминаем последний цвет в sessionStorage: на следующей странице свечение начинает
  с него и плавно возвращается к графиту, а не «щёлкает».
*/
(function () {
  "use strict";

  var P = (window.PRYSMERK = window.PRYSMERK || {});
  var layer = document.querySelector(".glow-layer");
  if (!layer) return;

  var STORE = "prysmerk-glow";
  var HEX = /^#[0-9a-f]{6}$/i;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tints = [];
  var current = -1;

  function make() {
    var el = document.createElement("div");
    el.className = "glow glow--tint";
    el.setAttribute("aria-hidden", "true");
    layer.appendChild(el);
    return el;
  }

  function remember(color) {
    try {
      if (color) sessionStorage.setItem(STORE, color);
      else sessionStorage.removeItem(STORE);
    } catch (e) { /* ничего */ }
  }

  // Мгновенно (без плавности) выполнить действие, потом вернуть плавность
  function withoutTransition(fn) {
    layer.classList.add("no-tr");
    fn();
    void layer.offsetWidth;
    layer.classList.remove("no-tr");
  }

  function set(color, instant) {
    if (!HEX.test(color || "")) return;
    while (tints.length < 2) tints.push(make());
    var next = (current + 1) % 2;
    var apply = function () {
      tints[next].style.setProperty("--tint", color);
      layer.classList.add("has-tint");
      tints[next].classList.add("is-on");
      if (current >= 0) tints[current].classList.remove("is-on");
    };
    if (instant) withoutTransition(apply); else apply();
    current = next;
    remember(color);
  }

  function clear() {
    if (current < 0) return;
    tints[current].classList.remove("is-on");
    layer.classList.remove("has-tint");
    current = -1;
    remember(null);
    window.setTimeout(function () {
      if (current >= 0) return;
      tints.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
      tints = [];
    }, 1000);
  }

  P.glow = { set: set, clear: clear };

  /* Пришли со страницы товара: стартуем с её цвета и плавно возвращаемся к графиту.
     На самой странице товара ничего не делаем: цвет там поставит product.js. */
  var stored = null;
  try { stored = sessionStorage.getItem(STORE); sessionStorage.removeItem(STORE); } catch (e) { /* ничего */ }
  if (stored && HEX.test(stored) && !reduce && !document.querySelector(".product-page")) {
    set(stored, true);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { clear(); });
    });
  }
})();
