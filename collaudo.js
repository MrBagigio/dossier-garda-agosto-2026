/* Collaudo dell'interfaccia nuova.
 *
 * Non legge il codice: pilota la pagina vera dentro una cornice e controlla,
 * dopo ogni cambio di stato, che quello che si VEDE corrisponda a quello che
 * la pagina promette. Le verifiche sono invarianti - "non deve mai succedere
 * che..." - perche' un difetto vero si presenta quasi sempre come una
 * promessa smentita dallo schermo, non come un'eccezione.
 *
 * Tre trappole gia' pagate su questo stesso progetto, e per questo hanno un
 * controllo dedicato:
 *  - element.click() riesce anche su un elemento display:none, quindi
 *    premere non prova che un comando sia raggiungibile: si guarda lo stile
 *    calcolato (visibile(), giroRichiudibili);
 *  - legare un gestore per classe cattura i fratelli che condividono lo
 *    stile ma non l'attributo dati, e lo stato si avvelena in silenzio;
 *  - un dato riassunto che contraddice un dato specifico - la colazione
 *    "inclusa" dal tag mentre la nota dice 15 EUR a parte - non solleva
 *    errori: va confrontato esplicitamente (giroDati).
 *
 * L'interfaccia precedente vive in archivio.html e non e' piu' collaudata:
 * e' congelata, e il collaudo serve a proteggere cio' che cambia.
 */
(function (globale) {
  'use strict';

  function Banco(win, opzioni) {
    opzioni = opzioni || {};
    this.win = win;
    this.doc = win.document;
    this.rapido = !!opzioni.rapido;
    this.etichetta = opzioni.etichetta || '';
    this.stati = 0;
    this.problemi = [];
  }

  Banco.prototype.q = function (s) { return this.doc.querySelector(s); };
  Banco.prototype.qq = function (s) {
    return Array.prototype.slice.call(this.doc.querySelectorAll(s));
  };
  Banco.prototype.segnala = function (dove, elenco) {
    if (!elenco.length) return;
    var unici = {};
    elenco.forEach(function (x) { unici[x] = 1; });
    this.problemi.push(this.etichetta + dove + ' :: ' + Object.keys(unici).join(' ; '));
  };
  Banco.prototype.visibile = function (e) {
    if (!e || e.hidden) return false;
    var st = this.win.getComputedStyle(e);
    return st.display !== 'none' && st.visibility !== 'hidden';
  };
  Banco.prototype.euro = function (testo) {
    var m = String(testo).match(/(\d+)\s*€/);
    return m ? parseInt(m[1], 10) : null;
  };
  Banco.prototype.righe = function () { return this.qq('.casa'); };

  /* ---------------------------------------------------- struttura */

  Banco.prototype.giroStruttura = function () {
    var p = [], self = this;

    if (!this.doc.documentElement.lang) p.push('manca la lingua del documento');

    var visti = {}, doppi = [];
    this.qq('[id]').forEach(function (e) {
      if (visti[e.id]) doppi.push(e.id); else visti[e.id] = 1;
    });
    if (doppi.length) p.push('id duplicati: ' + doppi.slice(0, 4).join(', '));

    this.qq('a[target="_blank"]').forEach(function (a) {
      if ((a.getAttribute('rel') || '').indexOf('noopener') < 0) {
        p.push('link esterno senza rel=noopener');
      }
    });
    this.qq('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (h === '#' || h === '') p.push('collegamento che non porta da nessuna parte');
    });
    this.qq('button').forEach(function (b) {
      if (!self.visibile(b)) return;
      if (!b.textContent.trim() && !b.getAttribute('aria-label')) {
        p.push('comando senza nome leggibile: ' + (b.id || b.className || '?'));
      }
      var r = b.getBoundingClientRect();
      if (r.height && r.height < 40) {
        p.push('bersaglio troppo piccolo per un dito (' + Math.round(r.height) +
               ' px): ' + (b.id || b.className));
      }
    });
    if (this.doc.documentElement.scrollWidth > this.doc.documentElement.clientWidth + 1) {
      p.push('la pagina scorre di lato');
    }
    this.stati++;
    this.segnala('struttura', p);
  };

  /* Un pannello che nasconde contenuto senza un comando VISIBILE per
     riportarlo indietro non e' compatto: e' contenuto sparito. Non si scopre
     premendo, perche' click() riesce anche sull'invisibile. */
  Banco.prototype.giroRichiudibili = function () {
    var p = [], self = this;
    this.qq('.casa').forEach(function (c) {
      var cap = c.querySelector('.cap'), det = c.querySelector('.dett');
      if (!cap || !det) { p.push('scheda senza comando o senza dettaglio'); return; }
      if (!self.visibile(cap)) { p.push('scheda con comando invisibile'); return; }
      var prima = self.visibile(det);
      cap.click();
      if (self.visibile(det) === prima) p.push('aprire la scheda non mostra nulla di nuovo');
      if ((cap.getAttribute('aria-expanded') === 'true') !== self.visibile(det)) {
        p.push('aria-expanded non corrisponde a cio che si vede');
      }
      cap.click();
      if (self.visibile(det) !== prima) p.push('la scheda non si richiude');
      self.stati++;
    });
    this.segnala('richiudibili', p);
  };

  /* ---------------------------------------------------- zone */

  Banco.prototype.giroZone = function () {
    var p = [], self = this;
    var zone = this.qq('.zona');
    if (!zone.length) { p.push('nessuna zona mostrata'); this.segnala('zone', p); return; }

    zone.forEach(function (z) {
      var dichiarate = parseInt((z.textContent.match(/(\d+)\s+strutture/) || [])[1], 10);
      var daPrezzo = self.euro((z.querySelector('.zp') || {}).textContent || '');
      var nome = (z.querySelector('.zn') || {}).textContent || '';

      z.click();
      self.stati++;
      var righe = self.righe();
      if (isNaN(dichiarate)) {
        p.push('zona senza conteggio dichiarato');
      } else if (righe.length !== dichiarate) {
        p.push('la zona dice ' + dichiarate + ' strutture ma ne mostra ' + righe.length);
      }
      if (!righe.length) p.push('zona selezionata che non mostra nulla');

      var prezzi = righe.map(function (r) {
        return self.euro((r.querySelector('.cp') || {}).textContent || '');
      }).filter(function (x) { return x !== null; });
      if (prezzi.length && daPrezzo !== null) {
        var min = Math.min.apply(null, prezzi);
        if (min !== daPrezzo) {
          p.push('la zona promette da ' + daPrezzo + ' euro ma la piu economica costa ' + min);
        }
      }
      var tit = (self.q('#titoloLista') || {}).textContent || '';
      if (nome && tit.indexOf(nome) < 0) {
        p.push('il titolo non nomina la zona scelta: ' + tit.slice(0, 40));
      }
      z.click();
      self.stati++;
    });

    var tutte = this.righe().length, somma = 0;
    zone.forEach(function (z) {
      var n = parseInt((z.textContent.match(/(\d+)\s+strutture/) || [])[1], 10);
      if (!isNaN(n)) somma += n;
    });
    if (somma > tutte) {
      p.push('le zone sommano ' + somma + ' strutture ma in tutto sono ' + tutte +
             ': qualcuna e contata due volte');
    }
    this.segnala('zone', p);
  };

  /* ---------------------------------------------------- ordini e filtri */

  Banco.prototype.giroOrdini = function () {
    var p = [], self = this;

    this.qq('.ord[data-ord]').forEach(function (b) {
      b.click();
      self.stati++;
      var acceso = self.qq('.ord[data-ord][aria-pressed="true"]');
      if (acceso.length !== 1) {
        p.push('ordini accesi contemporaneamente: ' + acceso.length);
      }
      if (b.getAttribute('data-ord') === 'prezzo') {
        var v = self.righe().map(function (r) {
          return self.euro((r.querySelector('.cp') || {}).textContent || '');
        });
        for (var i = 1; i < v.length; i++) {
          if (v[i] < v[i - 1]) {
            p.push('ordine per prezzo non crescente: ' + v[i - 1] + ' poi ' + v[i]);
            break;
          }
        }
      }
    });

    var sc = this.q('#soloCol');
    if (!sc) {
      p.push('manca il filtro della colazione');
    } else {
      var prima = this.righe().length;
      sc.click();
      this.stati++;
      var dopo = this.righe();
      if (dopo.length > prima) p.push('un filtro che aumenta i risultati');
      if (!dopo.length) p.push('il filtro colazione non lascia nulla');
      dopo.forEach(function (r) {
        var t = (r.querySelector('.pill') || {}).textContent || '';
        if (t.indexOf('inclusa') < 0) {
          p.push('con il filtro attivo compare "' + t.slice(0, 30) + '"');
        }
      });
      sc.click();
      this.stati++;
      if (this.righe().length !== prima) p.push('togliendo il filtro non si torna come prima');
    }
    this.segnala('ordini e filtri', p);
  };

  /* ---------------------------------------------------- base e dintorni */

  Banco.prototype.giroIntorno = function () {
    var p = [], self = this;

    function distanze() {
      return self.qq('#intorno .luogo').map(function (l) {
        var m = (l.textContent || '').match(/([\d.]+)\s*km/);
        return m ? parseFloat(m[1]) : null;
      }).filter(function (x) { return x !== null; });
    }

    var d0 = distanze();
    if (!d0.length) p.push('la sezione dintorni nasce vuota');
    for (var i = 1; i < d0.length; i++) {
      if (d0[i] < d0[i - 1]) { p.push('i dintorni non sono in ordine di distanza'); break; }
    }

    /* i comandi "parti da qui" stanno dentro le schede: vanno aperte */
    this.righe().slice(0, this.rapido ? 3 : 8).forEach(function (r) {
      var cap = r.querySelector('.cap');
      if (cap) cap.click();
    });

    var basi = this.qq('.base').filter(function (b) {
      return self.visibile(b) && !b.disabled;
    });
    if (!basi.length) p.push('nessun comando visibile per scegliere la base');

    basi.slice(0, this.rapido ? 2 : 5).forEach(function (b) {
      var prima = distanze().join(',');
      var etPrima = (self.q('#intornoBase') || {}).textContent || '';
      b.click();
      self.stati++;
      var etDopo = (self.q('#intornoBase') || {}).textContent || '';
      if (etDopo === etPrima) p.push('cambiando base l etichetta non cambia');
      if (etDopo.indexOf('da ') !== 0) p.push('l etichetta della base non dice da dove');
      var dopo = distanze();
      if (dopo.join(',') === prima) p.push('cambiando base le distanze restano identiche');
      for (var j = 1; j < dopo.length; j++) {
        if (dopo[j] < dopo[j - 1]) { p.push('dopo il cambio base l ordine si rompe'); break; }
      }
    });

    var chip = this.qq('#catChips .chip');
    if (chip.length < 5) p.push('categorie mancanti: ' + chip.length);
    chip.forEach(function (c) {
      self.qq('#catChips .chip[aria-pressed="true"]').forEach(function (x) { x.click(); });
      c.click();
      self.stati++;
      var n = self.qq('#intorno .luogo').length;
      var t = (self.q('#intorno') || {}).textContent || '';
      if (!n && t.indexOf('Niente') < 0 && t.indexOf('Nessuna') < 0) {
        p.push('categoria senza risultati e senza spiegazione: ' + c.textContent);
      }
    });

    self.qq('#catChips .chip[aria-pressed="true"]').forEach(function (x) { x.click(); });
    self.stati++;
    if (((this.q('#intorno') || {}).textContent || '').indexOf('Nessuna categoria') < 0) {
      p.push('senza categorie la sezione resta muta invece di spiegarlo');
    }
    if (chip[0]) chip[0].click();

    this.qq('#ragChips .chip').forEach(function (r) {
      r.click();
      self.stati++;
      var lim = parseFloat(r.getAttribute('data-r')) || 0;
      if (!lim) return;
      distanze().forEach(function (km) {
        if (km > lim + 0.05) {
          p.push('con raggio ' + lim + ' km compare qualcosa a ' + km + ' km');
        }
      });
    });
    this.segnala('base e dintorni', p);
  };

  /* ---------------------------------------------------- dati */

  /* Un riassunto non deve contraddire il dato specifico, e un numero mostrato
     dev'essere plausibile. E' il difetto che sul tag della colazione e' gia'
     passato inosservato una volta. */
  Banco.prototype.giroDati = function () {
    var p = [], self = this;

    this.righe().forEach(function (r) {
      var nome = (r.querySelector('.cn') || {}).textContent || '?';
      var prezzo = self.euro((r.querySelector('.cp') || {}).textContent || '');
      if (prezzo === null) p.push('struttura senza prezzo: ' + nome);
      else if (prezzo < 80 || prezzo > 2000) p.push('prezzo implausibile per ' + nome + ': ' + prezzo);

      var pill = (r.querySelector('.pill') || {}).textContent || '';
      if (!pill) p.push('struttura senza stato della colazione: ' + nome);

      var cap = r.querySelector('.cap');
      if (cap) cap.click();
      var det = (r.querySelector('.dett') || {}).textContent || '';
      if (/colazione non inclusa|senza colazione/i.test(det) && pill.indexOf('inclusa') >= 0) {
        p.push('dice colazione inclusa ma la nota la smentisce: ' + nome);
      }
      if (/colazione\s*\d+\s*€/i.test(det) && pill.indexOf('inclusa') >= 0) {
        p.push('colazione a pagamento nella nota ma inclusa nella pastiglia: ' + nome);
      }
      var tutte = det.match(/(\d+)\s*min da Toscolano/g) || [];
      if (tutte.length > 1 && tutte[0] !== tutte[1]) {
        p.push('due distanze diverse nella stessa scheda: ' + nome);
      }
      var m = det.match(/(\d+)\s*min da Toscolano/);
      if (m && parseInt(m[1], 10) > 90) p.push('distanza implausibile per ' + nome);
      if (cap) cap.click();
      self.stati++;
    });
    this.segnala('dati', p);
  };

  Banco.prototype.esegui = function () {
    var avvio = Date.now();
    this.giroStruttura();
    this.giroRichiudibili();
    this.giroZone();
    this.giroOrdini();
    this.giroIntorno();
    this.giroDati();
    return {
      stati: this.stati,
      problemi: this.problemi,
      secondi: Math.round((Date.now() - avvio) / 100) / 10
    };
  };

  globale.Collaudo = function (win, opzioni) {
    return new Banco(win, opzioni).esegui();
  };
})(typeof window !== 'undefined' ? window : this);
