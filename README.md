# Dossier Garda — agosto 2026

Ricerca alloggi sul Lago di Garda (sponda bresciana) per **2 persone, 2 notti**, su tre finestre:
**14–16**, **17–19** e **21–23 agosto 2026**.

**→ [Apri il dossier](https://mrbagigio.github.io/dossier-garda-agosto-2026/)**

Funziona da telefono. In alto scegli la finestra di date e si aggiornano insieme prezzi,
disponibilità, verdetto, mappa e link di prenotazione. Le preferenze restano sul dispositivo.

## Cosa sa fare

- **Filtro per data** — tre finestre; l'URL porta la scelta (`#17-19`), quindi il link è condivisibile
- **Filtri per dotazioni** — piscina o spa, sul lago, centro a piedi, cucina, colazione, posto auto,
  più *voto alto e collaudato* (9+ su almeno 20 recensioni)
- **Ordinamento** per prezzo, paese, o voto **pesato sul numero di recensioni** — un 10 su una
  recensione non deve battere un 9,6 su 188
- **Confronto** affiancato fino a quattro strutture, con i prezzi su **tutte e tre le finestre**:
  serve a vedere se una struttura conviene su una data diversa da quella che stai guardando
- **Mappa** in scala reale della sponda: il pallino di ogni paese cresce con gli alloggi
  liberi, e toccarlo filtra la rosa su quel comune
- **Cosa c'è intorno** — scegli dove dormi e la pagina si riordina intorno a quel punto:
  **130 posti** fra ristoranti, gelaterie e bar, spiagge, passeggiate, cose da vedere,
  noleggi e centri benessere, con voto, numero di recensioni, fascia di prezzo, distanza
  e link alle indicazioni stradali che partono dalla casa scelta
- **Esporta** la rosa filtrata in CSV
- **Barra freschezza** — l'età dei dati calcolata sul giorno in cui apri, con i link ai canali live
- **Si installa e si apre senza campo** — «Aggiungi a schermata Home» dal telefono; la pagina
  resta salvata sul dispositivo, e una barra in basso avvisa quando stai leggendo la copia
  offline invece dei dati aggiornati
- Tema chiaro, scuro o automatico · foglio di stampa dedicato

## Cosa contiene

Circa **90 strutture** su otto comuni — Toscolano Maderno, Gardone Riviera, Salò, Gargnano,
San Felice del Benaco, Manerba, Puegnago, Tignale — con prezzi incrociati su **Booking, Airbnb,
Trivago, Agoda, Vrbo, Super.com, eDreams** e sui **motori di prenotazione ufficiali**.
Per ognuna: il canale dove costa meno, quanto si risparmia rispetto a Booking, e il link diretto
con date e ospiti già impostati.

Più meteo, eventi, spiagge e parcheggi, traghetti, Isola del Garda e ristoranti con i giorni di chiusura.

## Note sui dati

Prezzi rilevati il **4–5 agosto 2026**, totali per 2 persone e 2 notti. Le tariffe di agosto si
muovono di giorno in giorno: i link portano alla pagina viva del canale, quindi verifica sempre
prima di confermare. La pagina stessa ti dice quanto sono vecchi i dati e diventa gialla dopo tre
giorni, rossa dopo sette.

Le **dotazioni sono indicate solo dove osservate durante la ricerca**: dieci strutture restano
senza tag, e resta scritto «non verificate» invece di un'ipotesi.

Nei dintorni, voti e fasce di prezzo vengono da Google (5 agosto 2026). Le distanze sono in
linea d'aria e i minuti sono **stime**, non tempi calcolati su un percorso. Di 39 alloggi su 59
non ho la posizione esatta: lì il punto di partenza è il centro del paese, la distanza è
arrotondata e porta il segno di circa.

Due tariffe non sono verificabili da remoto: **Camping Toscolano** e **Regina del Garda Suite**
(gruppo Horstmann, `0365 641584`), il cui motore non accetta il numero di ospiti via URL.

## Aggiornamento automatico

Un'attività pianificata (`dossier-garda-prezzi`, ogni mattina) riapre Booking con il browser,
riconfronta i prezzi delle tre finestre, aggiorna `index.html` e riassume cosa è cambiato.
Gira **in locale, mentre l'app Claude è aperta**: se il computer è spento, recupera al primo
avvio successivo. Booking non è leggibile senza browser — una richiesta HTTP semplice torna un
guscio da 4 KB senza prezzi — quindi l'automatismo non può girare in cloud.

L'attività ricontrolla **solo i prezzi Booking**. Airbnb, trivago e i motori ufficiali restano
alla rilevazione manuale, e il rapporto lo dichiara ogni volta.

## Struttura

Pagina singola, HTML statico, nessuna dipendenza esterna: tutto in `index.html`.
`sw.js` tiene la copia offline, `manifest.webmanifest` e le `icona-*.png` servono
all'installazione, `anteprima.png` è l'immagine mostrata quando il link viene condiviso.

Il service worker prende la pagina **dalla rete quando c'è**, con un tetto di 4 secondi, e
ricade sulla copia salvata solo se la rete manca: è un documento di prezzi, servire una copia
vecchia a un telefono che ha campo sarebbe un danno.
