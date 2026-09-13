---
document_id: ROPA-01
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

# PERSONAS DATU APSTRĀDES DARBĪBU REĢISTRS
## RECORD OF PROCESSING ACTIVITIES — ROPA

**Sistēma:** MVX  
**Pārzinis:** DzĪKS “Irlava 20”  
**Objekts:** Irlavas iela 20, Rīga

## 1. Pārzinis

**DzĪKS “Irlava 20”**  
Reģistrācijas Nr.: [reģistrācijas numurs]  
Juridiskā adrese: [juridiskā adrese]  
E-pasts: [e-pasts]  
Tālrunis: [tālrunis]

Datu aizsardzības speciālists: **nav norīkots, ja vien nepastāv normatīvajos aktos noteikts pienākums to iecelt.**

## 2. Apstrādes darbība — lietotāju konti un piekļuves pārvaldība

**Nolūks:** lietotāju identificēšana, kontu izveide, lomu un piekļuves tiesību pārvaldība, drošas piekļuves nodrošināšana.

**Datu subjektu kategorijas:** dzīvokļu īpašnieki, iedzīvotāji, kooperatīva biedri, valdes locekļi, pārvaldnieks, darbinieki, citas pilnvarotas personas.

**Personas datu kategorijas:** lietotāja ID, Nick, loma, saistība ar dzīvokli, vārds, uzvārds, e-pasts, tālrunis, konta statuss, piekļuves tiesības.

**Tiesiskais pamats:** GDPR 6. panta 1. punkta f) apakšpunkts; piemērojamajos gadījumos arī c) apakšpunkts.

**Saņēmēji:** Pārziņa pilnvarotas personas; MVX tehniskais pakalpojuma sniedzējs; mākoņdatošanas infrastruktūras pakalpojumu sniedzēji.

**Glabāšana:** kamēr nepieciešama piekļuve MVX vai pastāv cits tiesisks pamats.

## 3. Apstrādes darbība — ūdens skaitītāji un rādījumi

**Nolūks:** ūdens patēriņa uzskaite, individuālo skaitītāju pārvaldība, dzīvojamās mājas pārvaldīšanas pienākumu izpilde un mājas lietas kārtošana.

**Datu subjektu kategorijas:** dzīvokļu īpašnieki un iedzīvotāji.

**Personas datu kategorijas:** dzīvokļa identifikators, skaitītāja identifikācijas dati, tips, rādījumi, iesniegšanas laiks, iesniedzēja lietotāja ID, labošanas un verifikācijas dati.

**Tiesiskais pamats:** GDPR 6. panta 1. punkta c) apakšpunkts.

**Glabāšana:** atbilstoši dzīvojamās mājas pārvaldīšanas un mājas lietas dokumentācijas nepieciešamībai.

## 4. Apstrādes darbība — paziņojumi un saziņa

**Nolūks:** ar dzīvojamās mājas pārvaldīšanu saistītas informācijas izplatīšana.

**Dati:** lietotāja ID, loma, dzīvoklis, mājas sekcija, kontaktinformācija, paziņojuma mērķauditorija, tehniskā piegādes informācija.

**Tiesiskais pamats:** GDPR 6. panta 1. punkta c) un/vai f) apakšpunkts atkarībā no konkrētā paziņojuma.

## 5. Apstrādes darbība — autentifikācija un sesijas

**Nolūks:** autentifikācija, drošas sesijas uzturēšana, neatļautas piekļuves novēršana.

**Dati:** lietotāja ID, paroles drošs atvasinājums, sesijas identifikators, sesijas izveides/derīguma/atsaukšanas laiks un cita nepieciešamā tehniskā informācija.

**Tiesiskais pamats:** GDPR 6. panta 1. punkta f) apakšpunkts.

**Glabāšana:** aktīvās sesijas līdz termiņa beigām vai atsaukšanai; nederīgas/atsauktas sesijas parasti līdz 30 dienām.

## 6. Apstrādes darbība — konta piekļuves atjaunošana

**Nolūks:** droša lietotāja konta piekļuves atjaunošana.

**Dati:** lietotāja ID, konta identifikācijas informācija, atjaunošanas koda kriptogrāfisks atvasinājums, derīguma termiņš, mēģinājumu skaits, izmantots/atsaukts statuss.

**Tiesiskais pamats:** GDPR 6. panta 1. punkta f) apakšpunkts.

**Glabāšana:** atjaunošanas kods derīgs 60 minūtes.

## 7. Apstrādes darbība — sistēmas drošība un audits

**Nolūks:** neatļautas piekļuves konstatēšana, incidentu izmeklēšana, personas datu piekļuves kontrole un atbildības nodrošināšana.

**Dati:** lietotāja ID, darbības veids, piekļuves laiks, rezultāts, auditētais subjekts un tehniskā drošības informācija.

**Tiesiskais pamats:** GDPR 6. panta 1. punkta f) apakšpunkts.

**Glabāšana:** security un PII-access audit ieraksti parasti līdz 24 mēnešiem; rate-limit ieraksti parasti līdz 7 dienām.

## 8. Apstrādes darbība — PII meklēšana un administratīvā piekļuve

**Nolūks:** pilnvarotu personu iespēja atrast konkrēta lietotāja informāciju, neglabājot tieši identificējošus datus atklātā veidā operatīvajā datubāzē.

**Dati:** šifrēta identifikācijas/kontaktinformācija, deterministiski kriptogrāfiski meklēšanas indeksi, lietotāja ID.

**Glabāšana:** meklēšanas indeksi seko attiecīgās PII informācijas dzīves ciklam.

## 9. Apstrādes darbība — push paziņojumi

**Nolūks:** lietotāja izvēlētas operatīvās informācijas piegāde ierīcē.

**Dati:** push endpoint, kriptogrāfiskās atslēgas, valodas iestatījums, ierīces/pārlūkprogrammas tehniskā informācija, piegādes statuss.

**Tiesiskais pamats:** GDPR 6. panta 1. punkta f) apakšpunkts.

**Glabāšana:** aktīva abonēšana kamēr funkcija tiek izmantota; neaktīvas abonēšanas un piegādes vēsture parasti līdz 180 dienām.

## 10. Apstrādes darbība — rezerves kopijas un sistēmas atjaunošana

**Nolūks:** datu pieejamība, sistēmas nepārtrauktība, avārijas atjaunošana, datu zuduma seku mazināšana.

**Dati:** Main DB, PII DB un saistīto R2 objektu saturs nepieciešamajā apjomā.

**Tiesiskais pamats:** attiecīgās pamatapstrādes tiesiskais pamats; drošības/nepārtrauktības mērķim — GDPR 6. panta 1. punkta f) apakšpunkts.

**Glabāšana:** rotācijas kārtībā; V0.0 mērķis — aptuveni pēdējās 13 veiksmīgās nedēļas kopijas.

## 11. Apstrādes darbība — restore / rollback vadība

**Nolūks:** kontrolēta atjaunošana, rollback un auditējamība.

**Dati:** administratora ID, operācijas ID, statusi, laika zīmogi, restore/rollback tehniskā informācija.

**Glabāšana:** aktīvais stāvoklis līdz operācijas pabeigšanai; pabeigtu operāciju žurnāls orientējoši līdz 24 mēnešiem.

## 12. Apstrādes darbība — ūdens skaitītāju sertifikāti un saistītie dokumenti

**Nolūks:** skaitītāju tehniskās vēstures, verifikācijas un pārvaldīšanas dokumentācijas uzturēšana.

**Tiesiskais pamats:** GDPR 6. panta 1. punkta c) apakšpunkts.

**Glabāšana:** kamēr dokumenti nepieciešami skaitītāja tehniskajai vēsturei, mājas lietai vai citu pārvaldīšanas pienākumu izpildei.

## 13. Datu nodošana ārpus EEZ

Atsevišķu ārējo tehnisko pakalpojumu infrastruktūras dēļ noteikta tehniskā informācija vai personas dati var tikt apstrādāti ārpus EEZ.

Ja apstrāde kvalificējas kā personas datu nodošana trešai valstij, piemēro GDPR V nodaļas prasības un attiecīgo datu nodošanas mehānismu.

## 14. Vispārīgs drošības pasākumu apraksts

MVX izmanto, cita starpā:

- datu minimizēšanu;
- lomu un piekļuves tiesību nodalīšanu;
- tieši identificējošas informācijas loģisku nodalīšanu;
- tieši identificējošu personas datu šifrētu glabāšanu;
- drošus paroļu atvasinājumus;
- sesiju un piekļuves kontroli;
- administratīvo un PII piekļuves darbību auditēšanu;
- rate limiting;
- rezerves kopiju šifrēšanu;
- atsevišķas PROD / TEST / DEMO vides;
- sintētiskus lietojumprogrammas datus TEST un DEMO;
- kontrolētu restore/rollback procesu.

## 15. Reģistra pārskatīšana

Reģistru pārskata pie būtiskām izmaiņām apstrādē, arhitektūrā, ārējos apstrādātājos, pirms komerciālas ieviešanas jaunam klientam un pēc būtiska drošības incidenta.
