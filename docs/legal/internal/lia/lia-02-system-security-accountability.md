---
document_id: LIA-02
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
## LIA-02 — Sistēmas drošība un atbildība

**Pārzinis:** DzĪKS “Irlava 20”  
**Sistēma:** MVX  
**Tiesiskais pamats:** GDPR 6. panta 1. punkta f) apakšpunkts

## 1. Apstrādes mērķis

Nodrošināt MVX drošību, neatļautas piekļuves atklāšanu, incidentu izmeklēšanu un būtisku administratīvu darbību auditējamību.

Apstrāde var ietvert:

- autentifikācijas drošības ierakstus;
- rate-limit informāciju;
- administratīvo darbību auditu;
- PII piekļuves auditu;
- account recovery darbību reģistrēšanu;
- restore/rollback auditinformāciju;
- drošības incidentu tehniskos ierakstus.

## 2. Leģitīmā interese

Pārzinim ir leģitīma interese aizsargāt:

- personas datus;
- MVX infrastruktūru;
- lietotāju kontus;
- dzīvojamās mājas pārvaldīšanas informāciju;
- sistēmas pieejamību un integritāti.

Pārzinim nepieciešama arī iespēja pēc incidenta noteikt notikumu secību un pārbaudīt administratoru veiktās darbības.

## 3. Nepieciešamības tests

Bez atbilstošiem drošības un audita ierakstiem nebūtu iespējams pietiekami efektīvi:

- konstatēt ļaunprātīgu izmantošanu;
- izmeklēt incidentus;
- noteikt neatļautas piekļuves apjomu;
- pārbaudīt administratīvas darbības;
- pierādīt piemēroto drošības pasākumu darbību.

Apstrāde tiek ierobežota līdz tehniski un organizatoriski nepieciešamajam apjomam.

## 4. Samērīguma tests

Drošības audita informācija netiek izmantota lietotāju komerciālai profilēšanai vai uzvedības analīzei.

Glabāšanas termiņi ir ierobežoti.

Tipiski:

- rate-limit ieraksti — līdz 7 dienām;
- security audit — līdz 24 mēnešiem;
- PII access audit — līdz 24 mēnešiem;
- pabeigtu restore/rollback operāciju žurnāli — orientējoši līdz 24 mēnešiem.

## 5. Datu subjektu iespējamā ietekme

Ietekme galvenokārt saistīta ar to, ka sistēma reģistrē noteiktas lietotāju un administratoru darbības.

Šāda apstrāde ir paredzama drošas informācijas sistēmas izmantošanas kontekstā un tiek veikta tikai drošības un atbildības mērķiem.

## 6. Aizsardzības pasākumi

- ierobežots auditdatu apjoms;
- noteikti glabāšanas termiņi;
- lomu balstīta piekļuve;
- PII piekļuves reģistrēšana;
- PROD / TEST / DEMO nodalīšana;
- droša konta atjaunošanas procedūra;
- incidentu un restore procesu auditējamība.

## 7. Secinājums

MVX un tajā apstrādāto personas datu aizsardzība ir būtiska un pamatota leģitīma interese.

Tā kā apstrādes apjoms ir ierobežots un paredzēti atbilstoši aizsardzības pasākumi, datu subjektu intereses nepārsniedz Pārziņa nepieciešamību nodrošināt sistēmas drošību un atbildību.

**Rezultāts: BALANCE TEST — PASS.**
