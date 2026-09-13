---
document_id: PUB-DEV-01
version: "1.0"
language: lv
translation_of: null
status: approved-for-v0.0
effective_from: TBD
last_reviewed: "2026-09-13"
controller: 'DzĪKS "Irlava 20"'
public: true
requires_acceptance: false
---

# IERĪCES DATU GLABĀŠANAS UN SĪKDATŅU PAZIŅOJUMS

**MVX sistēma — DzĪKS “Irlava 20”**

## 1. Paziņojuma mērķis

Šis paziņojums izskaidro, kā MVX izmanto tehniskos datu glabāšanas mehānismus lietotāja ierīcē un pārlūkprogrammā.

MVX var izmantot:

- sīkdatnes (cookies), ja tās tehniski nepieciešamas;
- `localStorage`;
- `sessionStorage`;
- PWA Service Worker kešatmiņu;
- citu pārlūkprogrammas nodrošinātu tehnisko glabāšanu, kas nepieciešama MVX darbībai.

MVX V0.0 nav paredzēts reklāmas, mārketinga vai uzvedības profilēšanas sīkdatņu izmantošanai.

## 2. Tehniski nepieciešamā datu glabāšana

MVX var saglabāt ierīcē vai pārlūkprogrammā informāciju, kas nepieciešama:

- lietotāja autentifikācijai un sesijas uzturēšanai;
- lietotāja izvēlēto iestatījumu saglabāšanai;
- valodas un saskarnes preferenču saglabāšanai;
- PWA darbībai;
- Service Worker kešatmiņai;
- drošai sistēmas darbībai;
- push paziņojumu funkcionalitātes nodrošināšanai, ja lietotājs to aktivizējis.

Šāda glabāšana tiek izmantota tikai tādā apjomā, kāds nepieciešams attiecīgās MVX funkcijas nodrošināšanai.

## 3. Sīkdatnes

MVX V0.0 nav paredzēts izmantot:

- reklāmas sīkdatnes;
- mārketinga sīkdatnes;
- uzvedības analītikas sīkdatnes;
- trešo personu reklāmas profilēšanu.

Ja sistēma izmanto sīkdatnes, kas ir tehniski nepieciešamas autentifikācijai, drošībai vai citai lietotāja pieprasītai funkcijai, tās var tikt izmantotas bez atsevišķas piekrišanas, ciktāl to pieļauj piemērojamie normatīvie akti.

MVX V0.0 tādēļ nav nepieciešams vispārīgs “Accept all cookies” mehānisms, ja netiek izmantotas tehnoloģijas, kurām nepieciešama lietotāja piekrišana.

## 4. Local Storage un Session Storage

MVX var izmantot pārlūkprogrammas `localStorage` un `sessionStorage`, lai saglabātu tehnisku informāciju, kas nepieciešama sistēmas darbībai.

Tajā var ietilpt, piemēram:

- lietotāja saskarnes iestatījumi;
- valodas izvēle;
- sesijas vai piekļuves nodrošināšanai nepieciešama tehniskā informācija;
- īslaicīgs sistēmas darbības stāvoklis.

Šie mehānismi netiek izmantoti reklāmas profilēšanai.

## 5. PWA un Service Worker

MVX var darboties kā Progressive Web App (PWA).

PWA Service Worker var saglabāt ierīcē lietojumprogrammas tehniskos resursus kešatmiņā, lai:

- paātrinātu sistēmas ielādi;
- uzlabotu darbības stabilitāti;
- nodrošinātu PWA tehnisko funkcionalitāti;
- kontrolētu programmatūras resursu atjaunināšanu.

Kešatmiņas saturs nav paredzēts lietotāja uzvedības profilēšanai.

## 6. Push paziņojumi

Push paziņojumi ir papildfunkcija.

Tie tiek izmantoti tikai tad, ja lietotājs savā ierīcē vai pārlūkprogrammā ir atļāvis paziņojumu saņemšanu.

Šīs funkcijas nodrošināšanai var tikt saglabāta tehniskā informācija, piemēram:

- push endpoint;
- nepieciešamās kriptogrāfiskās atslēgas;
- valodas vai tehniskie iestatījumi;
- piegādes statusa informācija.

Lietotājs var atcelt push paziņojumu atļauju savas ierīces vai pārlūkprogrammas iestatījumos.

## 7. Ārējie tehniskie resursi

Atsevišķas MVX funkcijas var izmantot ārējus tehniskos resursus vai pakalpojumus.

Šāda resursa pieprasījuma laikā pakalpojuma sniedzējam var kļūt pieejama standarta tehniskā informācija, piemēram:

- IP adrese;
- pieprasījuma laiks;
- pārlūkprogrammas vai ierīces tehniskā informācija;
- cita standarta tīkla savienojuma metadata.

MVX neizmanto šādu tehnisko mijiedarbību personas datu pārdošanai vai reklāmas profilēšanai.

## 8. Glabāšanas ilgums

Tehniskās informācijas glabāšanas ilgums ir atkarīgs no konkrētā mehānisma.

Daļa informācijas tiek dzēsta:

- pēc sesijas beigām;
- pēc noteikta tehniska termiņa;
- kad lietotājs izrakstās no sistēmas;
- kad lietotājs iztīra pārlūkprogrammas vai lietotnes datus;
- kad attiecīgais tehniskais ieraksts vairs nav nepieciešams.

PWA kešatmiņa var saglabāties ierīcē līdz tās atjaunināšanai, dzēšanai vai pārlūkprogrammas/PWA datu notīrīšanai.

## 9. Lietotāja kontrole

Lietotājs var izmantot pārlūkprogrammas vai ierīces iestatījumus, lai:

- dzēstu sīkdatnes un vietēji glabātos datus;
- notīrītu PWA kešatmiņu;
- atceltu push paziņojumu atļauju;
- noņemtu instalēto PWA.

Jāņem vērā, ka tehniski nepieciešamo datu dzēšana var:

- izrakstīt lietotāju no MVX;
- atiestatīt lietotāja iestatījumus;
- īslaicīgi ietekmēt sistēmas funkcionalitāti.

## 10. Piekrišana un nākotnes izmaiņas

Ja nākotnē MVX tiks ieviesta tehnoloģija, kuras izmantošanai saskaņā ar piemērojamiem normatīvajiem aktiem nepieciešama lietotāja piekrišana, šāda tehnoloģija netiks aktivizēta pirms atbilstošas izvēles iespējas nodrošināšanas.

Šādā gadījumā šis paziņojums tiks attiecīgi aktualizēts.

## 11. Saistītie dokumenti

Papildu informācija ir pieejama:

- **Personas datu apstrādes paziņojumā**;
- **Operatora un kontaktinformācijā**;
- **MVX lietošanas noteikumos**.

## 12. Kontaktinformācija

Jautājumus par MVX izmantotajiem tehniskās glabāšanas mehānismiem var adresēt:

**DzĪKS “Irlava 20”**  
E-pasts: **[e-pasts]**  
Tālrunis: **[tālrunis]**
