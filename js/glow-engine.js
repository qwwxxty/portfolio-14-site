/*
  Движок свечения: собирает слои внутри блока .glow-layer и выставляет «фазу» анимации.

  Фаза нужна, чтобы при переходе на другую страницу слои не начинали плыть с нуля.
  Мы один раз запоминаем момент старта (sessionStorage) и на каждой странице считаем,
  сколько секунд прошло. Это число идёт в CSS-переменную --d, а там оно превращается
  в отрицательную animation-delay: «анимация уже идёт столько-то секунд».

    PRYSMERK.glowEngine.build(root)       создать слои внутри root
    PRYSMERK.glowEngine.applyPhase(root)  выставить фазу (вызывать после build)
*/
(function () {
  "use strict";

  var P = (window.PRYSMERK = window.PRYSMERK || {});
  var CLOCK_KEY = "prysmerk-glow-t0";
  // Разный сдвиг у слоёв: они не двигаются синхронно
  var OFFSETS = { haze: 7, sweep: 13, core: 3, dark: 21 };
  var NAMES = ["haze", "sweep", "core", "dark"];

  function startTime() {
    try {
      var v = sessionStorage.getItem(CLOCK_KEY);
      if (!v) { v = String(Date.now()); sessionStorage.setItem(CLOCK_KEY, v); }
      return +v;
    } catch (e) {
      return Date.now(); // без памяти работает, просто начинает с нуля
    }
  }

  function div(cls) {
    var el = document.createElement("div");
    el.className = cls;
    return el;
  }

  function build(root) {
    root.replaceChildren();
    NAMES.forEach(function (name) {
      var outer = div("gl gl--" + name);
      outer.setAttribute("data-layer", name);
      outer.appendChild(div("gl__in"));
      root.appendChild(outer);
    });
    root.appendChild(div("gl-noise"));
    applyPhase(root);
    return root;
  }

  function applyPhase(root) {
    var elapsed = (Date.now() - startTime()) / 1000;
    var layers = root.querySelectorAll(".gl");
    for (var i = 0; i < layers.length; i++) {
      var name = layers[i].getAttribute("data-layer");
      var inner = layers[i].querySelector(".gl__in");
      if (inner) inner.style.setProperty("--d", (elapsed + (OFFSETS[name] || 0)).toFixed(2));
    }
  }

  P.glowEngine = { build: build, applyPhase: applyPhase, names: NAMES, offsets: OFFSETS };
})();
