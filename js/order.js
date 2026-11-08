/*
  Окно заказа. Три шага:
    1. Размер, цвет, количество. Без них дальше не пускает, показывается предупреждение.
    2. Имя, фамилия, телефон, способ оплаты.
    3. Экран «Замовлення прийнято (демо)».

  Форма ТОЛЬКО визуальная:
    - у <form> нет action и method, запросов в сеть нет;
    - данные нигде не сохраняются и не выводятся в консоль;
    - полей для номера карты нет вообще. «Онлайн карткою» это просто выбор;
    - проверка выполняется в браузере;
    - введённый текст в страницу как разметка не попадает: только textContent.
*/
(function () {
  "use strict";

  var P = window.PRYSMERK;
  var i18n = P.i18n;
  var t = i18n.t;
  var h = P.dom.h;
  var D = P.data;

  function $(id) { return document.getElementById(id); }

  var modal = $("order");
  var form = $("order-form");
  var body = $("order-body");

  var sizeBox = $("size-radios");
  var colorBox = $("color-radios");
  var grpColor = $("grp-color");
  var qtyValue = $("qty-value");
  var qtyMinus = $("qty-minus");
  var qtyPlus = $("qty-plus");
  var totalEl = $("order-total");
  var productLine = $("order-product");

  var inFirst = $("f-first");
  var inLast = $("f-last");
  var inPhone = $("f-phone");
  var payRadios = form.querySelectorAll('input[name="pay"]');

  var QTY_MAX = 10;
  var state = { product: null, step: 1, size: null, color: null, qty: 0, pay: null };

  /* ---------- Правила проверки ----------
     Имя и фамилия: украинские и английские буквы, внутри слова можно одинарный
     апостроф (' ’ ʼ) и дефис. Диапазон А-Я брать нельзя: в нём есть ы, э, ъ, ё,
     которых нет в украинском. Поэтому буквы перечислены точно. */
  var LETTERS = "A-Za-zА-ЩЬЮЯа-щьюяҐґЄєІіЇї";
  var NAME_RE = new RegExp("^[" + LETTERS + "]+(?:['’ʼ-][" + LETTERS + "]+)*$");
  var PHONE_RE = /^\+380\d{9}$/;

  // Возвращает ключ ошибки или null, если всё хорошо
  function checkName(raw, requiredKey) {
    // NFC склеивает «і + знак» в одну букву «ї»: некоторые клавиатуры вводят так
    var v = String(raw).trim().normalize("NFC");
    if (!v) return requiredKey;
    if (v.length < 2 || v.length > 40) return "err.name.length";
    if (!NAME_RE.test(v)) return "err.name.invalid";
    return null;
  }

  function checkPhone(raw) {
    var v = String(raw).replace(/[\s\-()]/g, "");
    if (!v) return "err.phone.required";
    if (!PHONE_RE.test(v)) return "err.phone.invalid";
    return null;
  }

  /* ---------- Показ и сброс ошибок ----------
     Текст ошибки хранится как ключ в data-i18n. Поэтому при смене языка
     сообщение, которое уже на экране, переводится само. */
  function showError(errEl, key, inputEl) {
    errEl.setAttribute("data-i18n", key);
    errEl.textContent = t(key);
    errEl.hidden = false;
    if (inputEl) inputEl.setAttribute("aria-invalid", "true");
  }
  function clearError(errEl, inputEl) {
    errEl.hidden = true;
    errEl.removeAttribute("data-i18n");
    errEl.textContent = "";
    if (inputEl) inputEl.removeAttribute("aria-invalid");
  }

  /* ---------- Радио-кнопки в виде «чипов» (только текст, без цветных кружков) ---------- */
  function radioChip(name, value, i18nKey, onChange) {
    var input = h("input", { type: "radio", name: name, value: value });
    input.addEventListener("change", function () { if (input.checked) onChange(value); });
    return h("label", { class: "chip-radio" }, [input, h("span", { "data-i18n": i18nKey }, [t(i18nKey)])]);
  }

  /* ---------- Сводка и сумма ---------- */
  function updateProductLine() {
    if (!state.product) return;
    productLine.textContent = D.nameOf(state.product) + ", " + D.formatPrice(state.product);
  }

  function updateTotal() {
    if (!state.product || state.qty < 1) { totalEl.hidden = true; return; }
    var unit = D.unitPrice(state.product);
    totalEl.textContent = t("order.total") + ": " + state.qty + "\u00a0×\u00a0" + D.formatAmount(unit) + "\u00a0=\u00a0" + D.formatAmount(unit * state.qty);
    totalEl.hidden = false;
  }

  function setQty(n) {
    state.qty = Math.max(0, Math.min(QTY_MAX, n));
    qtyValue.textContent = String(state.qty);
    qtyMinus.disabled = state.qty <= 0;
    qtyPlus.disabled = state.qty >= QTY_MAX;
    if (state.qty > 0) clearError($("err-qty"));
    updateTotal();
  }

  /* ---------- Шаги ---------- */
  function showStep(n, moveFocus) {
    state.step = n;
    [1, 2, 3].forEach(function (i) { $("step-" + i).hidden = i !== n; });
    $("btn-back").hidden = n !== 2;
    $("btn-next").hidden = n !== 1;
    $("btn-submit").hidden = n !== 2;
    $("order-foot").hidden = n === 3;
    productLine.hidden = n === 3;
    body.scrollTop = 0;
    // Фокус на заголовок нового шага: иначе он остался бы на скрытой кнопке
    if (moveFocus) $("step-" + n + "-title").focus({ preventScroll: true });
  }

  /* ---------- Открытие окна ---------- */
  function reset() {
    var p = state.product;
    state.step = 1; state.size = null; state.color = null; state.qty = 0; state.pay = null;

    // размеры
    sizeBox.replaceChildren.apply(sizeBox, p.sizes.map(function (s) {
      return radioChip("size", s, "size." + s, function (v) { state.size = v; clearError($("err-size")); });
    }));
    // цвета: если цвет у вещи один, выбор скрыт и цвет выбран сам
    colorBox.replaceChildren.apply(colorBox, p.colors.map(function (c) {
      return radioChip("color", c, "color." + c, function (v) {
        state.color = v;
        clearError($("err-color"));
        document.dispatchEvent(new CustomEvent("prysmerk:color", { detail: { color: v } }));
      });
    }));
    if (p.colors.length === 1) { grpColor.hidden = true; state.color = p.colors[0]; }
    else grpColor.hidden = false;
    // один размер: выбирать нечего, он отмечается сам
    if (p.sizes.length === 1) {
      var only = sizeBox.querySelector("input");
      only.checked = true;
      state.size = p.sizes[0];
    }

    setQty(0);
    ["err-size", "err-color", "err-qty", "err-pay"].forEach(function (id) { clearError($(id)); });
    [[inFirst, "err-first"], [inLast, "err-last"], [inPhone, "err-phone"]].forEach(function (pair) {
      pair[0].value = "";
      clearError($(pair[1]), pair[0]);
    });
    Array.prototype.forEach.call(payRadios, function (r) { r.checked = false; });
    $("order-summary").replaceChildren();

    updateProductLine();
    i18n.apply(modal);
    showStep(1, false);
  }

  function open(product, opener) {
    state.product = product;
    reset();
    P.modal.open(modal, opener);
  }

  /* ---------- Шаг 1: проверка ---------- */
  function focusFirst(el) { if (el && el.focus) el.focus({ preventScroll: false }); }

  function validateStep1() {
    var first = null;
    if (!state.size) {
      showError($("err-size"), "err.size");
      first = first || sizeBox.querySelector("input");
    }
    if (!state.color) {
      showError($("err-color"), "err.color");
      first = first || colorBox.querySelector("input");
    }
    if (state.qty < 1) {
      showError($("err-qty"), "err.qty");
      first = first || (qtyPlus.disabled ? qtyMinus : qtyPlus);
    }
    if (first) { focusFirst(first); return false; }
    return true;
  }

  /* ---------- Шаг 2: проверка ---------- */
  function validateField(input, errId, key) {
    var err = $(errId);
    if (key) { showError(err, key, input); return false; }
    clearError(err, input);
    return true;
  }

  function validateStep2() {
    var firstBad = null;
    if (!validateField(inFirst, "err-first", checkName(inFirst.value, "err.first.required"))) firstBad = firstBad || inFirst;
    if (!validateField(inLast, "err-last", checkName(inLast.value, "err.last.required"))) firstBad = firstBad || inLast;
    if (!validateField(inPhone, "err-phone", checkPhone(inPhone.value))) firstBad = firstBad || inPhone;
    if (!state.pay) {
      showError($("err-pay"), "err.pay");
      firstBad = firstBad || payRadios[0];
    }
    if (firstBad) { focusFirst(firstBad); return false; }
    return true;
  }

  // После первой ошибки поле проверяется заново при вводе, ошибка уходит сразу
  function liveCheck(input, errId, fn) {
    input.addEventListener("input", function () {
      if (!$(errId).hidden) validateField(input, errId, fn(input.value));
    });
    input.addEventListener("blur", function () {
      if (input.value !== "") validateField(input, errId, fn(input.value));
    });
  }
  liveCheck(inFirst, "err-first", function (v) { return checkName(v, "err.first.required"); });
  liveCheck(inLast, "err-last", function (v) { return checkName(v, "err.last.required"); });
  liveCheck(inPhone, "err-phone", checkPhone);

  Array.prototype.forEach.call(payRadios, function (r) {
    r.addEventListener("change", function () {
      if (r.checked) { state.pay = r.value; clearError($("err-pay")); }
    });
  });

  /* ---------- Экран «готово» ---------- */
  function buildSummary() {
    var p = state.product;
    var unit = D.unitPrice(p);
    var rows = [
      [t("order.item"), D.nameOf(p)],
      [t("order.size"), t("size." + state.size)],
      [t("order.color"), t("color." + state.color)],
      [t("order.qty"), String(state.qty)],
      [t("order.total"), D.formatAmount(unit * state.qty)],
      [t("order.pay"), t(state.pay === "card" ? "order.pay.card" : "order.pay.cod")]
    ];
    var dl = $("order-summary");
    var kids = [];
    rows.forEach(function (r) {
      kids.push(h("dt", {}, [r[0]]));
      kids.push(h("dd", {}, [r[1]]));
    });
    dl.replaceChildren.apply(dl, kids);
  }

  function finish() {
    buildSummary();
    // Личные данные не хранятся: очищаем поля сразу
    inFirst.value = ""; inLast.value = ""; inPhone.value = "";
    showStep(3, true);
  }

  /* ---------- Кнопки ---------- */
  qtyMinus.addEventListener("click", function () { setQty(state.qty - 1); });
  qtyPlus.addEventListener("click", function () { setQty(state.qty + 1); });

  $("btn-next").addEventListener("click", function () {
    if (validateStep1()) showStep(2, true);
  });
  $("btn-back").addEventListener("click", function () { showStep(1, true); });

  // Enter в полях тоже отправляет форму; отправки в сеть нет
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.step === 1) { if (validateStep1()) showStep(2, true); return; }
    if (state.step === 2 && validateStep2()) finish();
  });

  /* ---------- Смена языка ----------
     Подписи с data-i18n переводит i18n.js. Здесь обновляем то, что собрано кодом. */
  document.addEventListener("prysmerk:lang", function () {
    if (!state.product) return;
    updateProductLine();
    updateTotal();
    if (state.step === 3) buildSummary();
  });

  P.order = { open: open };
})();
