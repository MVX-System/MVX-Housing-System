---
document_id: LIA-01
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
## LIA-01 — Droša digitālā piekļuve

**Pārzinis:** DzĪKS “Irlava 20”  
**Sistēma:** MVX  
**Tiesiskais pamats:** GDPR 6. panta 1. punkta f) apakšpunkts

## 1. Apstrādes mērķis

Nodrošināt lietotājiem drošu un kontrolētu digitālo piekļuvi MVX funkcijām atbilstoši viņu lomai, tiesībām un saistībai ar konkrētu dzīvokli vai pārvaldīšanas funkciju.

Apstrāde ietver:

- lietotāju kontu izveidi;
- Nick izmantošanu autentifikācijai;
- lietotāju lomu piešķiršanu;
- piekļuves tiesību pārvaldību;
- lietotāju sasaisti ar dzīvokļiem;
- autentifikāciju;
- sesiju pārvaldību;
- neatļautas piekļuves novēršanu.

## 2. Leģitīmā interese

DzĪKS “Irlava 20” ir leģitīma interese nodrošināt drošu, efektīvu un auditējamu piekļuvi digitālajiem dzīvojamās mājas pārvaldīšanas pakalpojumiem.

Bez lietotāja identifikācijas un piekļuves kontroles nebūtu iespējams nodrošināt, ka lietotājs redz un izmanto tikai viņam paredzēto informāciju un funkcijas.

## 3. Nepieciešamības tests

Apstrāde ir nepieciešama, jo mazāk ierobežojošs risinājums, kas vienlaikus nodrošinātu:

- individuālu piekļuves kontroli;
- lomu nodalīšanu;
- dzīvokļu sasaisti;
- atbildību par veiktajām darbībām;
- piekļuves atsaukšanu;
- sistēmas drošību;

praktiski nenodrošinātu līdzvērtīgu aizsardzības līmeni.

## 4. Samērīguma tests

Apstrādāto datu apjoms tiek ierobežots līdz nepieciešamajam minimumam.

MVX izmanto:

- Nick kā ikdienas autentifikācijas identifikatoru;
- lomu balstītu piekļuves kontroli;
- tieši identificējošas informācijas nodalīšanu no galvenās operatīvās datubāzes, kur tas ir tehniski saprātīgi;
- šifrētu tiešo identifikatoru glabāšanu;
- sesiju kontroli;
- piekļuves tiesību atsaukšanas mehānismus.

Lietotājam ir saprātīgas gaidas, ka digitālajai mājas pārvaldīšanas sistēmai būs droša individuāla piekļuve.

## 5. Datu subjektu iespējamā ietekme

Iespējamie riski:

- neatļauta piekļuve kontam;
- pārmērīgu piekļuves tiesību piešķiršana;
- konta sasaistes kļūda;
- citas personas datu aplūkošana.

Riski tiek mazināti ar piekļuves kontroli, administratīvu pārvaldību, auditēšanu, paroļu aizsardzību un drošības mehānismiem.

## 6. Aizsardzības pasākumi

Tiek piemēroti, cita starpā:

- datu minimizēšana;
- lomu un piekļuves tiesību nodalīšana;
- droši paroļu atvasinājumi;
- sesiju kontrole;
- administratīvo darbību auditēšana;
- atsevišķa PII glabāšana;
- PII šifrēšana;
- rate limiting;
- konta piekļuves atjaunošanas kontrole.

## 7. Secinājums

DzĪKS “Irlava 20” leģitīmā interese nodrošināt drošu digitālo piekļuvi ir reāla un nepieciešama.

Ņemot vērā datu minimizēšanu, drošības pasākumus un datu subjektu saprātīgās gaidas, apstrāde nav uzskatāma par tādu, kur datu subjekta intereses vai pamattiesības prevalētu pār Pārziņa leģitīmo interesi.

**Rezultāts: BALANCE TEST — PASS.**
