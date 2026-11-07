/*
  Общее окно (модальное): панель сортировки и фильтров, позже окно заказа.
  Что делает:
  - плавно показывает и скрывает окно;
  - не даёт фокусу клавиатуры уйти за окно;
  - закрывает по Esc, по тёмному фону и по любой кнопке с атрибутом data-close;
  - после закрытия возвращает фокус туда, откуда окно открыли.
*/
(function () {
  "use strict";

  var openModal = null;
  var lastFocus = null;

  function focusables(root) {
    return root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }

  function open(modal, opener) {
    if (!modal || openModal === modal) return;
    if (openModal) close(openModal, false);
    lastFocus = opener || document.activeElement;
    modal.removeAttribute("inert");
    // кадр на то, чтобы браузер увидел исходное состояние: тогда сработает плавность
    window.requestAnimationFrame(function () {
      modal.classList.add("is-open");
    });
    document.body.classList.add("modal-open");
    openModal = modal;
    window.setTimeout(function () {
      var first = modal.querySelector("[data-autofocus]") || focusables(modal)[0];
      if (first) first.focus({ preventScroll: true });
    }, 80);
  }

  function close(modal, returnFocus) {
    modal = modal || openModal;
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("inert", "");
    document.body.classList.remove("modal-open");
    if (openModal === modal) openModal = null;
    if (returnFocus !== false && lastFocus && lastFocus.focus) {
      lastFocus.focus({ preventScroll: true });
    }
  }

  document.addEventListener("click", function (e) {
    var closer = e.target.closest ? e.target.closest("[data-close]") : null;
    if (closer && openModal && openModal.contains(closer)) close(openModal);
  });

  document.addEventListener("keydown", function (e) {
    if (!openModal) return;
    if (e.key === "Escape") {
      close(openModal);
      return;
    }
    if (e.key === "Tab") {
      var f = focusables(openModal);
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener("prysmerk:leave", function () { close(openModal, false); });

  window.PRYSMERK = window.PRYSMERK || {};
  window.PRYSMERK.modal = { open: open, close: close };
})();
