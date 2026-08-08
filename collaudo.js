/* Banco di prova del dossier Garda.
 *
 * Pilota l'interfaccia vera dentro un iframe e controlla degli invarianti dopo
 * ogni cambio di stato. Non verifica che il codice faccia quello che dice il
 * codice: verifica che il RISULTATO A SCHERMO sia coerente con quello che la
 * pagina promette all'utente. Per esempio, con il filtro "piscina o spa"
 * attivo, ogni riga mostrata deve davvero portare quella dotazione — non basta
 * che il conteggio torni.
 *
 * Tre difetti veri sono usciti proprio da qui:
 *  - un clic su "tema" scriveva data-win="null" e azzerava la rosa;
 *  - una casa a Calvagese veniva contata a Salo', e da li' le distanze dei
 *    dintorni erano sbagliate di quasi dieci chilometri;
 *  - ventidue tabelle su venticinque non avevano un <thead>.
 *
 * Uso: apri collaudo.html. Aggiungi ?rapido per il giro breve.
 */
(function (globale) {
  'use strict';

  var DOTAZIONI = {
    w: 'piscina o spa', l: 'sul lago', p: 'centro a piedi',
    k: 'cucina', b: 'colazione', a: 'posto auto'
  };
  var CHIAVI = ['w', 'l', 'p', 'k', 'b', 'a', 'hi'];
  var CATEGORIE = ['M', 'B', 'S', 'P', 'V', 'X', 'W'];
  var RAGGI = [['1.5', 1.5], ['10', 10], ['20', 20], ['0', 0]];
  var FINESTRE = ['1', '2', '3'];
  var ORDINI = ['price', 'score', 'town'];

  function Banco(win, opzioni) {
    opzioni = opzioni || {};
    this.win = win;
    this.doc = win.document;
    this.rapido = !!opzioni.rapido;
    this.etichetta = opzioni.etichetta || '';
    this.stati = 0;
    this.problemi = [];
  }

  Banco.prototype.q = function (sel) { return this.doc.querySelector(sel); };
  Banco.prototype.qq = function (sel) {
    return Array.prototype.slice.call(this.doc.querySelectorAll(sel));
  };
  Banco.prototype.segnala = function (dove, elenco) {
    if (!elenco.length) return;
    var unici = {};
    elenco.forEach(function (x) { unici[x] = 1; });
    this.problemi.push(this.etichetta + dove + ' :: ' + Object.keys(unici).join(' ; '));
  };

  /* ---------------------------------------------------------- comandi */

  Banco.prototype.chipAcceso = function (k) {
    var b = this.q('.fchip[data-f="' + k + '"]');
    return !!b && b.getAttribute('aria-pressed') === 'true';
  };
  Banco.prototype.imponi = function (k, valore) {
    if (this.chipAcceso(k) !== valore) this.q('.fchip[data-f="' + k + '"]').click();
  };
  Banco.prototype.applicaMaschera = function (m) {
    var self = this;
    CHIAVI.forEach(function (k, i) { self.imponi(k, !!(m & (1 << i))); });
  };
  Banco.prototype.finestra = function (w) {
    this.q('.switcher button[data-win="' + w + '"]').click();
  };
  Banco.prototype.ordina = function (idSelect, valore) {
    var s = this.doc.getElementById(idSelect);
    if (!s) return;
    s.value = valore;
    s.dispatchEvent(new this.win.Event('change', { bubbles: true }));
  };
  Banco.prototype.paese = function (nome) {
    var chip = this.doc.getElementById('townChip');
    if (chip && !chip.hidden) chip.click();
    if (nome) {
      this.q('.lakemap g[data-town="' + nome + '"]')
        .dispatchEvent(new this.win.MouseEvent('click', { bubbles: true }));
    }
  };
  Banco.prototype.espandi = function (id) {
    var b = this.doc.getElementById(id);
    if (b) b.click();
  };

  /* ------------------------------------------------------- invarianti */

  Banco.prototype.verificaRosa = function (dove, maschera, paeseAtteso) {
    var p = [], self = this;
    var w = this.doc.documentElement.getAttribute('data-win');
    if (!{ '1': 1, '2': 1, '3': 1 }[w]) p.push('data-win non valido: ' + w);

    var vuoto = !!this.q('#rosaBody td.empty');
    var righe = vuoto ? [] : this.qq('#rosaBody tr:not(.more)');
    var cap = this.doc.getElementById('rosaCap');
    var m = cap && cap.textContent.match(/^(\d+)/);
    var dichiarate = m ? +m[1] : -1;

    if (!vuoto && righe.length > dichiarate) {
      p.push('mostrate ' + righe.length + ' ma dichiarate ' + dichiarate);
    }
    if (dichiarate === 0 && !vuoto) p.push('zero strutture senza messaggio di vuoto');
    if (dichiarate > 0 && vuoto) p.push('messaggio di vuoto con ' + dichiarate + ' dichiarate');

    righe.forEach(function (tr) {
      /* otto celle da quando c'e' la colonna della distanza radiale: e' sempre
         nel DOM, nascosta finche' non si sceglie un punto di partenza */
      if (tr.querySelectorAll('td').length !== 8) p.push('riga con celle mancanti');

      var tag = Array.prototype.slice.call(tr.querySelectorAll('.tag'))
        .map(function (x) { return x.textContent.trim(); });
      CHIAVI.forEach(function (k, i) {
        if (!(maschera & (1 << i)) || k === 'hi') return;
        if (tag.indexOf(DOTAZIONI[k]) < 0) p.push('filtro "' + DOTAZIONI[k] + '" ma riga senza quella dotazione');
      });

      if (maschera & 64) {
        var cella = tr.querySelector('td[data-l="voto"]');
        var s = cella ? cella.textContent : '';
        var voto = parseFloat((s.match(/([\d,]+)/) || [0, '0'])[1].replace(',', '.'));
        var rec = parseInt((s.match(/\((\d+)\)/) || [0, '0'])[1], 10);
        var soglia = s.indexOf('/5') >= 0 ? 4.85 : 9;
        if (!(voto >= soglia) || !(rec >= 20)) p.push('"voto alto e collaudato" ma ' + voto + ' su ' + rec + ' recensioni');
      }

      if (paeseAtteso) {
        var dove2 = tr.querySelector('td.meta');
        if (dove2 && dove2.textContent.trim().indexOf(paeseAtteso) !== 0) {
          p.push('riga fuori dal comune ' + paeseAtteso);
        }
      }
    });

    this.testoPulito('#rosaBody', p);
    if (this.scorreDiLato()) p.push('la pagina scorre di lato');

    this.stati++;
    this.segnala(dove, p);
  };

  /* La soglia non e' un pixel: dentro una cornice la barra di scorrimento
     compare dopo il primo layout e sposta il bordo destro di frazioni di
     pixel. Con la soglia a uno questo controllo segnalava migliaia di
     scorrimenti che su un telefono vero non esistono. Tre pixel separano
     l'assestamento del rendering da un vero sbordamento, che parte sempre
     da decine. */
  Banco.prototype.scorreDiLato = function () {
    var d = this.doc.documentElement;
    return d.scrollWidth > d.clientWidth + 3;
  };

  Banco.prototype.testoPulito = function (sel, p) {
    var el = this.q(sel);
    if (!el) return;
    var t = el.textContent;
    ['undefined', 'NaN', '[object'].forEach(function (b) {
      if (t.indexOf(b) >= 0) p.push('testo sporco: ' + b);
    });
  };

  Banco.prototype.verificaDintorni = function (dove, raggio, perDistanza) {
    var p = [];
    var vuoto = !!this.q('#poiBody td.empty');
    var righe = vuoto ? [] : this.qq('#poiBody tr:not(.more)');
    var c = this.doc.getElementById('poiCount');
    var m = c && c.textContent.match(/^(\d+)/);
    var dichiarati = m ? +m[1] : -1;

    if (!vuoto && righe.length > dichiarati) p.push('mostrati ' + righe.length + ' ma dichiarati ' + dichiarati);
    if (dichiarati === 0 && !vuoto) p.push('zero luoghi senza messaggio di vuoto');
    if (dichiarati > 0 && vuoto) p.push('messaggio di vuoto con ' + dichiarati + ' dichiarati');

    var precedente = -1;
    righe.forEach(function (tr) {
      var s = (tr.querySelector('td.dist') || {}).textContent || '';
      var km = s.match(/([\d,]+)\s*km/), metri = s.match(/(\d+)\s*m\b/);
      var d = km ? parseFloat(km[1].replace(',', '.')) : (metri ? +metri[1] / 1000 : null);
      if (d === null) { p.push('distanza illeggibile'); return; }
      if (raggio === 1.5 && d > 1.55) p.push('oltre il raggio "due passi": ' + d + ' km');
      if (raggio === 10 || raggio === 20) {
        var min = s.match(/(\d+)′/);
        if (min && s.indexOf('auto') >= 0 && +min[1] > raggio) p.push('oltre ' + raggio + ' minuti: ' + min[1]);
      }
      /* l'ordine per distanza vale solo quando e' quello scelto: ordinando
         per voto o prezzo le distanze sono giustamente sparse */
      if (perDistanza) {
        if (precedente >= 0 && d + 0.06 < precedente) p.push('ordine per distanza rotto');
        precedente = d;
      }
    });

    this.testoPulito('#poiBody', p);
    if (this.scorreDiLato()) p.push('la pagina scorre di lato');

    this.stati++;
    this.segnala(dove, p);
  };

  /* ------------------------------------------------------------ giri */

  Banco.prototype.giroFiltri = function () {
    var self = this;
    var ordini = this.rapido ? ['price'] : ORDINI;
    var passo = this.rapido ? 8 : 1;
    FINESTRE.forEach(function (w) {
      self.finestra(w);
      ordini.forEach(function (o) {
        self.ordina('rosaSort', o);
        for (var m = 0; m < 128; m += passo) {
          self.applicaMaschera(m);
          self.espandi('rosaMore');
          self.verificaRosa('filtri finestra ' + w + ' ordine ' + o + ' maschera ' + m, m, null);
        }
      });
    });
    this.applicaMaschera(0);
  };

  Banco.prototype.giroPaesi = function () {
    var self = this;
    var paesi = this.qq('.lakemap g[data-town]').map(function (g) { return g.getAttribute('data-town'); });
    var finestre = this.rapido ? ['3'] : FINESTRE;
    var passo = this.rapido ? 16 : 1;
    finestre.forEach(function (w) {
      self.finestra(w);
      paesi.forEach(function (nome) {
        self.paese(nome);
        for (var m = 0; m < 128; m += passo) {
          self.applicaMaschera(m);
          self.espandi('rosaMore');
          self.verificaRosa('paese ' + nome + ' finestra ' + w + ' maschera ' + m, m, nome);
        }
        self.applicaMaschera(0);
      });
      self.paese(null);
    });
  };

  Banco.prototype.giroDintorni = function () {
    var self = this;
    var sel = this.doc.getElementById('baseSel');
    if (!sel) { this.problemi.push('dintorni: elenco delle basi assente'); return; }
    var basi = [];
    for (var i = 0; i < sel.options.length; i++) basi.push(i);
    if (this.rapido) basi = basi.filter(function (i) { return i % 12 === 0; });

    basi.forEach(function (i) {
      sel.selectedIndex = i;
      sel.dispatchEvent(new self.win.Event('change', { bubbles: true }));
      var nome = sel.options[i].text.slice(0, 20);
      CATEGORIE.forEach(function (cat) {
        self.q('#catChips .fchip[data-c="' + cat + '"]').click();
        RAGGI.forEach(function (r) {
          self.q('#rangeChips .fchip[data-r="' + r[0] + '"]').click();
          ['dist', 'score', 'price'].forEach(function (o) {
            self.ordina('poiSort', o);
            self.espandi('poiMore');
            self.verificaDintorni(
              'dintorni ' + nome + ' ' + cat + ' raggio ' + r[0] + ' ordine ' + o,
              r[1], o === 'dist');
          });
        });
      });
    });
  };

  Banco.prototype.giroSequenze = function () {
    var self = this, p = [];

    /* confronto: il tetto dichiarato e' quattro */
    this.applicaMaschera(0);
    this.paese(null);
    this.espandi('rosaMore');
    var pin = this.qq('#rosaBody .pin[data-pick]');
    for (var i = 0; i < 6 && i < pin.length; i++) pin[i].click();
    var scelte = this.qq('#rosaBody .pin[data-pick][aria-pressed="true"]').length;
    if (scelte > 4) p.push('confronto: ' + scelte + ' selezionate, il tetto e\' quattro');
    var colonne = this.qq('.cmp thead th').length - 1;
    if (colonne >= 0 && colonne !== scelte) p.push('confronto: ' + colonne + ' colonne per ' + scelte + ' selezionate');
    var x = this.q('.cmpx');
    if (x) {
      x.click();
      var dopo = this.qq('#rosaBody .pin[data-pick][aria-pressed="true"]').length;
      if (dopo !== scelte - 1) p.push('togliere dal confronto: da ' + scelte + ' a ' + dopo);
    }
    var svuota = this.qq('button').filter(function (b) { return b.textContent.trim() === 'svuota'; })[0];
    if (svuota) {
      svuota.click();
      if (this.qq('#rosaBody .pin[data-pick][aria-pressed="true"]').length) p.push('svuota non svuota');
    }

    /* archivio: bottone, titolo, e link dall'indice */
    ['matrice', 'canali', 'diretto', 'scartati', 'airbnb', 'logistica', 'quando'].forEach(function (id) {
      var s = self.doc.getElementById(id);
      if (!s) { p.push('sezione assente: ' + id); return; }
      var b = s.querySelector('.archbtn');
      if (!b) { p.push('bottone archivio assente: ' + id); return; }
      b.click();
      if (!s.classList.contains('open')) p.push(id + ': il bottone non apre');
      if (b.getAttribute('aria-expanded') !== 'true') p.push(id + ': aria-expanded non aggiornato');
      b.click();
      if (s.classList.contains('open')) p.push(id + ': il bottone non chiude');
      s.querySelector('h2').click();
      if (!s.classList.contains('open')) p.push(id + ': il titolo non apre');
      s.querySelector('h2').click();
      var link = self.q('nav.toc a[href="#' + id + '"]');
      if (link) {
        link.click();
        if (!s.classList.contains('open')) p.push(id + ': il link dell\'indice non apre la sezione');
      }
    });

    /* il tema non deve toccare la finestra: qui c'era il difetto peggiore */
    var tema = this.qq('.switcher button').filter(function (b) { return /tema/i.test(b.textContent); })[0];
    if (tema) {
      for (var t = 0; t < 4; t++) {
        var prima = this.doc.documentElement.getAttribute('data-win');
        tema.click();
        var poi = this.doc.documentElement.getAttribute('data-win');
        if (prima !== poi) p.push('il tema ha cambiato la finestra: ' + prima + ' -> ' + poi);
      }
    }
    var esporta = this.doc.getElementById('csvBtn');
    if (esporta) {
      var w0 = this.doc.documentElement.getAttribute('data-win');
      /* l'export scarica davvero: neutralizzo il clic sull'ancora */
      var vero = this.win.HTMLAnchorElement.prototype.click;
      this.win.HTMLAnchorElement.prototype.click = function () {
        if (this.hasAttribute('download')) return;
        return vero.apply(this, arguments);
      };
      esporta.click();
      this.win.HTMLAnchorElement.prototype.click = vero;
      if (this.doc.documentElement.getAttribute('data-win') !== w0) p.push('l\'esportazione ha cambiato la finestra');
    }

    /* hash: validi, di sezione, e spazzatura */
    ['#14-16', '#17-19', '#21-23', '#mappa', '#pippo', '#', '#21-23'].forEach(function (h) {
      self.win.location.hash = h;
      self.win.dispatchEvent(new self.win.HashChangeEvent('hashchange'));
      var w = self.doc.documentElement.getAttribute('data-win');
      if (!{ '1': 1, '2': 1, '3': 1 }[w]) p.push('hash ' + h + ' porta data-win a ' + w);
      if (!self.qq('#rosaBody tr').length) p.push('hash ' + h + ' lascia la rosa vuota');
    });

    this.stati++;
    this.segnala('sequenze', p);
  };

  Banco.prototype.giroStruttura = function () {
    var p = [];
    var teste = this.qq('table thead').length, tabelle = this.qq('table').length;
    if (teste < tabelle) p.push(tabelle - teste + ' tabelle su ' + tabelle + ' senza <thead>');
    if (this.doc.body.innerHTML.indexOf('scope="col"ead') >= 0) p.push('tag <thead> corrotto nel sorgente');
    if (this.qq('th tr').length) p.push('<tr> annidato dentro <th>');

    var visti = {}, doppi = [];
    this.qq('[id]').forEach(function (e) {
      if (visti[e.id]) doppi.push(e.id); else visti[e.id] = 1;
    });
    if (doppi.length) p.push('id duplicati: ' + doppi.slice(0, 4).join(', '));

    this.qq('a[target="_blank"]').forEach(function (a) {
      if ((a.getAttribute('rel') || '').indexOf('noopener') < 0) p.push('link esterno senza rel=noopener');
    });
    this.qq('img').forEach(function (i) {
      if (!i.hasAttribute('alt')) p.push('immagine senza alt');
    });
    var self = this;
    this.qq('button').forEach(function (b) {
      /* un bottone nascosto non e' esposto: il chip del comune nasce vuoto
         e si riempie quando serve */
      if (b.hidden || self.win.getComputedStyle(b).display === 'none') return;
      if (!b.textContent.trim() && !b.getAttribute('aria-label')) {
        p.push('bottone senza nome accessibile: ' + (b.id || b.className || '?'));
      }
    });
    if (!this.doc.documentElement.lang) p.push('manca la lingua del documento');

    /* nessuna struttura deve stare in un comune che non e' il suo */
    var comuni = this.qq('.lakemap g[data-town]').map(function (g) { return g.getAttribute('data-town'); });
    this.espandi('rosaMore');
    this.qq('#rosaBody td.meta').forEach(function (td) {
      var pre = td.textContent.trim().split(' · ')[0];
      var ok = comuni.some(function (c) { return pre.indexOf(c) === 0; });
      if (!ok) p.push('struttura fuori dai comuni della mappa: ' + pre.slice(0, 30));
    });

    this.stati++;
    this.segnala('struttura', p);
  };

  Banco.prototype.visibile = function (e) {
    if (!e || e.hidden) return false;
    var st = this.win.getComputedStyle(e);
    return st.display !== 'none' && st.visibility !== 'hidden';
  };

  /* Un pannello che si chiude senza un comando VISIBILE per riaprirlo non e'
     compatto: e' contenuto sparito. E non si scopre premendo, perche'
     element.click() riesce anche su un elemento display:none - va guardato
     lo stile calcolato. E' successo davvero: la regola che nasconde i
     pulsanti stava dopo la media query, stessa specificita', quindi vinceva
     lei e sul telefono schede e note si chiudevano per sempre. */
  Banco.prototype.giroRichiudibili = function () {
    var p = [], self = this;

    this.qq('.chiusa').forEach(function (e) {
      var dentro = Array.prototype.filter.call(e.querySelectorAll('button'), function (b) {
        return self.visibile(b);
      });
      var fuori = e.id
        ? self.qq('[aria-controls="' + e.id + '"]').filter(function (b) { return self.visibile(b); })
        : [];
      if (!dentro.length && !fuori.length) {
        p.push('chiuso senza comando visibile per riaprirlo: ' +
               (e.id || e.className || e.tagName).toString().slice(0, 40));
      }
    });

    /* ogni comando che dichiara di aprire qualcosa deve davvero aprirlo */
    this.qq('[aria-expanded]').forEach(function (b) {
      if (!self.visibile(b)) return;
      var id = b.getAttribute('aria-controls'), bersaglio = id && self.doc.getElementById(id);
      if (id && !bersaglio) { p.push('aria-controls punta a un id che non esiste: ' + id); return; }
      var prima = b.getAttribute('aria-expanded');
      b.click();
      if (b.getAttribute('aria-expanded') === prima) {
        p.push('comando che non cambia stato: ' + (b.id || b.className));
      }
      if (bersaglio && self.visibile(bersaglio) !== (b.getAttribute('aria-expanded') === 'true')) {
        p.push('aria-expanded non corrisponde a cio che si vede: ' + (b.id || b.className));
      }
      b.click();
      if (b.getAttribute('aria-expanded') !== prima) {
        p.push('comando che non torna com era: ' + (b.id || b.className));
      }
    });

    /* i comandi del verdetto: premere deve cambiare cio che si VEDE */
    this.qq('#verdetto .apri').forEach(function (b) {
      if (!self.visibile(b)) { p.push('comando "apri" presente ma invisibile'); return; }
      var scheda = b.parentElement, elenco = scheda.querySelector('ul');
      if (!elenco) return;
      var prima = self.visibile(elenco);
      b.click();
      if (self.visibile(elenco) === prima) p.push('"apri" non mostra il contenuto della scheda');
      b.click();
      if (self.visibile(elenco) !== prima) p.push('"apri" non richiude la scheda');
    });
    this.qq('#verdetto .notaApri').forEach(function (b) {
      if (!self.visibile(b)) p.push('titolo di nota presente ma invisibile');
    });

    this.stati++;
    this.segnala('richiudibili', p);
  };

  Banco.prototype.esegui = function () {
    var avvio = Date.now();
    this.giroStruttura();
    this.giroRichiudibili();
    this.giroFiltri();
    this.giroPaesi();
    this.giroDintorni();
    this.giroSequenze();
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
