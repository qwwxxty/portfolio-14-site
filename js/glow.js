/*
  Свечение фона на странице: собирает слои, выбирает композицию и меняет цвет.
  Сами слои и их устройство описаны в css/glow.css и js/glow-engine.js.

  Что здесь делается:
  1. Строит слои внутри .glow-layer.
  2. Выбирает композицию (где ядро) по странице: home, men, women, kids, product, info.
  3. Плавный переезд при смене раздела. Если прошлая страница была с другой композицией,
     новая начинает с неё и за 0,7 с переезжает на свою. Двигается только transform.
  4. «Свет вещи» на странице товара: рядом кладётся копия слоёв с цветом вещи, и мы меняем
     только прозрачность (как кроссфейд). Цвет градиента не перерисовывается.
       P.glow.set("#rrggbb")  плавно перетечь в цвет
       P.glow.clear()         вернуться к графиту
  5. Фаза плавания слоёв считается по общему времени из sessionStorage (см. glow-engine.js),
     поэтому на следующей странице слои продолжают с того же места.
*/
(function () {
  "use strict";

  var P = (window.PRYSMERK = window.PRYSMERK || {});
  var layer = document.querySelector(".glow-layer");
  if (!layer || !P.glowEngine) return;

  var COMP_KEY = "prysmerk-glow-g";
  var COLOR_KEY = "prysmerk-glow";
  var HEX = /^#[0-9a-f]{6}$/i;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;

  /* ---------- 1. Слои ---------- */
  var base = document.createElement("div");
  base.className = "glow-root";
  layer.appendChild(base);
  P.glowEngine.build(base);

  /* ---------- 2. Композиция ---------- */
  function compositionFor() {
    if (document.querySelector(".product-page")) return "product";
    var s = body.getAttribute("data-section") || "home";
    return ["home", "men", "women", "kids"].indexOf(s) !== -1 ? s : "info";
  }
  var comp = compositionFor();

  var prev = null;
  try { prev = sessionStorage.getItem(COMP_KEY); } catch (e) { /* ничего */ }

  function withoutTransition(fn) {
    layer.classList.add("no-tr");
    fn();
    void layer.offsetWidth;
    layer.classList.remove("no-tr");
  }

  /* ---------- 3. Плавный переезд ---------- */
  if (!reduce && prev && prev !== comp) {
    withoutTransition(function () { layer.setAttribute("data-g", prev); });
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { layer.setAttribute("data-g", comp); });
    });
    // страховка для фоновых вкладок, где кадры не идут
    window.setTimeout(function () { layer.setAttribute("data-g", comp); }, 150);
  } else {
    layer.setAttribute("data-g", comp);
  }
  try { sessionStorage.setItem(COMP_KEY, comp); } catch (e) { /* ничего */ }

  /* ---------- 4. «Свет вещи» ----------
     На каждую смену цвета создаётся копия слоёв с новым цветом и плавно проявляется.
     Прежняя копия гаснет и через секунду удаляется. Так в покое на странице не больше двух
     наборов слоёв (основной скрыт полностью и не рисуется). */
  var tint = null;

  function makeTint(color) {
    var t = base.cloneNode(true);
    t.classList.add("glow-root--tint");
    t.style.setProperty("--g-c", color);
    P.glowEngine.applyPhase(t); // копия должна быть в той же фазе, что и основной корень
    layer.appendChild(t);
    return t;
  }

  function dropLater(el) {
    window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
  }

  function remember(color) {
    try {
      if (color) sessionStorage.setItem(COLOR_KEY, color);
      else sessionStorage.removeItem(COLOR_KEY);
    } catch (e) { /* ничего */ }
  }

  function set(color, instant) {
    if (!HEX.test(color || "")) return;
    var old = tint;
    var show = function () {
      tint = makeTint(color);
      layer.classList.add("has-tint");
      void tint.offsetWidth; // чтобы браузер увидел прозрачность 0 до включения
      tint.classList.add("is-on");
      if (old) { old.classList.remove("is-on"); dropLater(old); }
    };
    if (instant) withoutTransition(show); else show();
    remember(color);
  }

  function clear() {
    if (!tint) return;
    var old = tint;
    tint = null;
    old.classList.remove("is-on");
    layer.classList.remove("has-tint");
    dropLater(old);
    remember(null);
  }

  P.glow = { set: set, clear: clear };

  // Пришли со страницы товара: стартуем с цвета вещи и плавно возвращаемся к графиту
  var stored = null;
  try { stored = sessionStorage.getItem(COLOR_KEY); sessionStorage.removeItem(COLOR_KEY); } catch (e) { /* ничего */ }
  if (stored && HEX.test(stored) && !reduce && !document.querySelector(".product-page")) {
    set(stored, true);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { clear(); });
    });
  }
})();
