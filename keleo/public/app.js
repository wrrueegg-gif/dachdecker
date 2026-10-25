/* Keleo – kleines Hilfs-Script: Bestätigungen, wachsende Textfelder, Positionen-Editor mit Live-Summen */
(function () {
  'use strict';

  function parseNum(v) {
    v = String(v == null ? '' : v).replace(/['’\s]/g, '').replace(',', '.');
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function fmt(r) {
    var neg = r < 0;
    r = Math.abs(Math.round(r));
    var f = Math.floor(r / 100), c = r % 100;
    return (neg ? '-' : '') + String(f).replace(/\B(?=(\d{3})+(?!\d))/g, "'") + '.' + (c < 10 ? '0' : '') + c;
  }
  function fmtQty(q) {
    return Number.isInteger(q) ? String(q) : q.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  // Bestätigungsdialoge für Formulare mit data-confirm
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.dataset && f.dataset.confirm && !window.confirm(f.dataset.confirm)) e.preventDefault();
  });

  // Textareas automatisch in der Höhe anpassen
  function autosize(t) {
    t.style.height = 'auto';
    t.style.height = Math.max(t.scrollHeight + 2, 36) + 'px';
  }
  document.querySelectorAll('textarea[data-autosize]').forEach(autosize);
  document.addEventListener('input', function (e) {
    if (e.target && e.target.matches && e.target.matches('textarea[data-autosize]')) autosize(e.target);
  });

  // Flash-Meldungen nach einigen Sekunden ausblenden
  document.querySelectorAll('.flash-success').forEach(function (el) {
    setTimeout(function () { el.classList.add('fade'); }, 4000);
  });

  // ---- Positionen-Editor ----
  var form = document.querySelector('[data-document-form]');
  if (!form) return;
  var tbody = form.querySelector('[data-items] tbody');
  var tpl = document.getElementById('item-row-template');
  var totals = form.querySelector('[data-totals]');
  var vat = totals.dataset.vat === '1';
  var currencySel = form.querySelector('select[name=currency]');

  function recalc() {
    var rows = tbody.querySelectorAll('tr.item-row');
    var subtotal = 0;
    var byRate = {};
    rows.forEach(function (row, i) {
      row.querySelector('.pos').textContent = i + 1;
      var qty = parseNum(row.querySelector('[data-qty]').value);
      var price = Math.round(parseNum(row.querySelector('[data-price]').value) * 100);
      var amount = Math.round(qty * price);
      row.querySelector('.row-amount').textContent = fmt(amount);
      subtotal += amount;
      if (vat) {
        var rate = parseNum(row.querySelector('[data-vat]').value);
        if (rate > 0) byRate[rate] = (byRate[rate] || 0) + amount;
      }
    });
    var discountPct = parseNum(form.querySelector('[data-discount]').value);
    var discount = discountPct > 0 ? Math.round((subtotal * discountPct) / 100) : 0;
    var factor = subtotal ? (subtotal - discount) / subtotal : 1;
    var vatSum = 0;
    var vatRows = totals.querySelector('[data-vat-rows]');
    if (vatRows) {
      vatRows.innerHTML = '';
      Object.keys(byRate).map(Number).sort(function (a, b) { return a - b; }).forEach(function (rate) {
        var base = Math.round(byRate[rate] * factor);
        var amt = Math.round((base * rate) / 100);
        vatSum += amt;
        var div = document.createElement('div');
        div.className = 'totals-row';
        div.innerHTML = '<span>MwSt ' + fmtQty(rate) + ' % von ' + fmt(base) + '</span><span>' + fmt(amt) + '</span>';
        vatRows.appendChild(div);
      });
    }
    var net = subtotal - discount + vatSum;
    var cur = currencySel ? currencySel.value : 'CHF';
    var total = cur === 'CHF' ? Math.round(net / 5) * 5 : net;
    totals.querySelector('[data-subtotal]').textContent = fmt(subtotal);
    totals.querySelector('[data-discount-amount]').textContent = discount ? '- ' + fmt(discount) : '0.00';
    totals.querySelector('[data-rounding]').textContent = fmt(total - net);
    totals.querySelector('[data-total]').textContent = cur + ' ' + fmt(total);
  }

  form.addEventListener('input', recalc);
  form.addEventListener('change', recalc);

  form.querySelector('[data-add-row]').addEventListener('click', function () {
    tbody.appendChild(tpl.content.cloneNode(true));
    var last = tbody.querySelector('tr.item-row:last-child');
    recalc();
    var ta = last.querySelector('textarea');
    if (ta) { autosize(ta); ta.focus(); }
  });

  tbody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-row]');
    if (!btn) return;
    var row = btn.closest('tr');
    if (tbody.querySelectorAll('tr.item-row').length <= 1) {
      row.querySelectorAll('input, textarea').forEach(function (el) {
        if (el.name === 'item_qty[]') el.value = '1';
        else if (el.name === 'item_price[]') el.value = '0.00';
        else if (el.type !== 'hidden') el.value = '';
      });
    } else {
      row.remove();
    }
    recalc();
  });

  // Enter in einem Eingabefeld der Positionen soll nicht das Formular absenden
  tbody.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
  });

  recalc();
})();
