---
document_id: LIA-04
version: "1.0"
language: lv
translation_of: null
status: approved-for-v0.0
effective_from: TBD
last_reviewed: "2026-09-13"
controller: 'DzĪKS "Irlava 20"'
public: false
requires_acceptance: false
---

# LEĢITĪMO INTEREŠU NOVĒRTĒJUMS
## LIA-04 — Pakalpojuma nepārtrauktība un atjaunošana

**Pārzinis:** DzĪKS “Irlava 20”  
**Sistēma:** MVX  
**Tiesiskais pamats:** GDPR 6. panta 1. punkta f) apakšpunkts papildus attiecīgās pamatapstrādes tiesiskajam pamatam

## 1. Apstrādes mērķis

Nodrošināt:

- datu pieejamību;
- rezerves kopiju izveidi;
- sistēmas atjaunošanu pēc kļūmes;
- kontrolētu rollback;
- sistēmas darbības nepārtrauktību;
- datu zuduma seku mazināšanu.

## 2. Leģitīmā interese

DzĪKS “Irlava 20” ir leģitīma interese nodrošināt, ka būtiska dzīvojamās mājas pārvaldīšanas informācija netiek neatgriezeniski zaudēta tehniskas kļūmes, operatora kļūdas, programmatūras incidenta vai citas ārkārtas situācijas dēļ.

## 3. Apstrādes raksturs

Rezerves kopijās var tikt ietverti:

- Main DB dati;
- šifrētā PII DB dati;
- saistīti R2 dokumenti.

Backup/recovery process var izmantot ārējo tehnisko infrastruktūru atbilstoši PROC-INV-01.

## 4. Nepieciešamības tests

Bez rezerves kopijām un atjaunošanas mehānisma pastāvētu nesamērīgs risks:

- zaudēt ūdens skaitītāju vēsturi;
- zaudēt lietotāju un dzīvokļu saites;
- zaudēt pārvaldīšanas dokumentus;
- nespēt atjaunot sistēmu pēc kritiskas kļūmes.

Alternatīva bez personas datu rezerves kopijām nenodrošinātu pilnvērtīgu sistēmas atjaunošanu.

## 5. Samērīguma tests

Backup tiek organizēts ar ierobežotu glabāšanas rotāciju.

V0.0 mērķis ir aptuveni pēdējās 13 veiksmīgās nedēļas kopijas.

Backup pakotnes tiek šifrētas pirms gala glabāšanas ārējā backup glabātuvē.

Rezerves kopijas nav paredzētas ikdienas operatīvai datu apskatei vai sekundārai datu izmantošanai.

## 6. OPS kontroles datubāze

MVX OPS datubāze satur restore/rollback kontroles stāvokli un žurnālu.

OPS DB netiek automātiski iekļauta tajā pašā iknedēļas backup arhīvā ar Main un PII datiem.

Tas ir apzināts drošības risinājums, jo novecojusi OPS stāvokļa atjaunošana varētu atjaunot neatbilstošu maintenance vai restore statusu.

OPS kontroles stāvoklis pilnīga zuduma gadījumā atjaunojams atsevišķi no drošas sākumkonfigurācijas vai ar īpašu procedūru.

## 7. Datu subjektu iespējamā ietekme

Galvenais risks ir tas, ka pēc datu dzēšanas aktīvajā sistēmā konkrēta vēsturiska backup kopija īslaicīgi vēl var saturēt iepriekšējo datu versiju.

Šis risks tiek mazināts ar ierobežotu backup rotāciju un noteikumu, ka pēc backup atjaunošanas atkārtoti piemērojamas aktuālās dzēšanas un labošanas prasības.

## 8. Aizsardzības pasākumi

- backup šifrēšana;
- ierobežots glabāšanas periods;
- kontrolēts restore process;
- restore/rollback žurnāls;
- maintenance režīms;
- fail-safe write blocking;
- integritātes pārbaudes;
- ārējo pakalpojumu inventarizācija;
- piekļuves ierobežošana.

## 9. Secinājums

Sistēmas nepārtrauktības un atjaunošanas mērķis ir būtisks un pamatots.

Ņemot vērā backup šifrēšanu, rotāciju un kontrolētu restore procesu, datu subjektu tiesību risks ir samērīgs.

**Rezultāts: BALANCE TEST — PASS.**
