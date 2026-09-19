---
document_id: MAN-RES-01
version: "1.0"
language: lv
translation_of: null
status: draft
applies_to: "MVX V0.0"
mode: resident
source_revision: TBD
last_reviewed: TBD
public: false
requires_acceptance: false
---

# MVX V0.0 iedzīvotāja režīma rokasgrāmata

## 1. Par šo rokasgrāmatu

Šī rokasgrāmata izskaidro MVX V0.0 funkcijas, kas pieejamas **Iedzīvotāja režīmā**. Tā ir paredzēta lietotājiem ar tehnisko lomu `resident` vai `owner`.

MVX palīdz apskatīt ar lietotāja dzīvokli saistīto informāciju, iesniegt ūdens skaitītāju rādījumus, lasīt paziņojumus, atvērt lietotājiem pieejamos dokumentus un pārvaldīt personīgos iestatījumus.

Rokasgrāmata apraksta tikai MVX V0.0 redzamās lietotāja darbības. Tā neaizstāj juridiskos dokumentus un neapraksta plānotas nākamo versiju funkcijas.

## 2. MVX atvēršana un valodas izvēle

Atveriet savam objektam paredzēto MVX adresi. Pieslēgšanās lapā pārbaudiet:

- objekta nosaukumu;
- vidi, ja tiek rādīta atzīme **TEST** vai **DEMO**;
- sadaļā **Adrese un kontakti** norādīto objekta adresi un aktuālo kontaktinformāciju.

Valodu var izvēlēties laukā **Valoda**. MVX V0.0 ir pieejama latviešu, angļu un krievu valoda. Valodas maiņa nemaina lietotāja datus vai piekļuves tiesības.

> **Svarīgi:** izmantojiet tikai jums paredzētās vides adresi. TEST un DEMO vide nav produkcijas vide, un tajās izmantotie dati var būt sintētiski.

## 3. Pieslēgšanās un iziešana

### 3.1. Pieslēgšanās

1. Pieslēgšanās formā laukā **Nick** ievadiet savu lietotāja identifikatoru.
2. Laukā **Parole** ievadiet paroli.
3. Izvēlieties **Pieslēgties**.

Pēc sekmīgas pieslēgšanās MVX atver lietotājam pieejamo režīmu. Ja kontam ir pieejams gan Iedzīvotāja režīms, gan Administratora režīms, režīmu var izvēlēties sānu izvēlnē.

### 3.2. Iziešana

Lai pabeigtu darbu, sānu izvēlnē izvēlieties **Iziet**. Koplietojamā ierīcē pēc darba vienmēr izejiet no MVX un aizveriet pārlūkprogrammas logu.

## 4. Pagaidu parole un piekļuves atjaunošana

### 4.1. Pagaidu paroles nomaiņa

Ja administrators ir piešķīris pagaidu paroli, MVX pirms citu sadaļu izmantošanas pieprasa to nomainīt.

1. Atveriet **Iestatījumi**, ja šī lapa nav atvērta automātiski.
2. Laukā **Pašreizējā parole** ievadiet pagaidu paroli.
3. Laukā **Jaunā parole** ievadiet jaunu paroli, kurā ir vismaz 8 rakstzīmes.
4. Laukā **Atkārtojiet jauno paroli** ievadiet to pašu jauno paroli.
5. Izvēlieties **Mainīt paroli**.

Jaunajai parolei jāatšķiras no pašreizējās paroles. Līdz sekmīgai nomaiņai pārējā MVX navigācija nav pieejama.

### 4.2. Ja aizmirsts Nick vai parole

Pieslēgšanās lapā izvēlieties **Aizmirsāt Nick vai paroli?**. MVX parāda aktuālo informāciju saziņai ar MVX administratoru.

Administrators var pārbaudīt lietotāja kontu un izsniegt vienreiz izmantojamu atjaunošanas kodu. Neizpaudiet paroli vai atjaunošanas kodu citām personām.

### 4.3. Piekļuves atjaunošana ar Recovery Code

1. Pieslēgšanās lapā izvēlieties **Man ir Recovery Code**.
2. Lapā **Piekļuves atjaunošana** ievadiet savu **Nick**.
3. Ievadiet administratora izsniegto **Recovery Code**.
4. Ievadiet un atkārtojiet jauno paroli.
5. Izvēlieties **Mainīt paroli**.

Ja atjaunošana ir sekmīga, iepriekšējās aktīvās sesijas tiek slēgtas. Pieslēdzieties vēlreiz ar jauno paroli.

## 5. Iedzīvotāja režīma navigācija un piekļuves robežas

Iedzīvotāja režīma sānu izvēlnē ir pieejamas šādas sadaļas:

- **Informācijas panelis**;
- **Ūdens skaitītāji**;
- **Paziņojumi**;
- **Dokumenti**;
- **Iestatījumi**.

Mazā ekrānā sānu izvēlni atver ar izvēlnes pogu. Datora skatā izvēlni var sakļaut un atkal atvērt.

Lomas `resident` un `owner` izmanto vienu un to pašu Iedzīvotāja režīmu. Citu tehnisko lomu nosaukumi nenozīmē, ka MVX V0.0 tām ir atsevišķs lietotāja režīms.

Lietotājs redz tikai kontam piešķirtās funkcijas un ar kontu saistītos datus. Ja vajadzīgais dzīvoklis, skaitītājs vai sadaļa nav redzama, sazinieties ar MVX administratoru.

## 6. Informācijas panelis

Sadaļa **Informācijas panelis** apkopo lietotājam svarīgāko informāciju vienā skatā.

Atkarībā no kontam piešķirtajiem datiem panelī var būt redzams:

- **Mans dzīvoklis** — dzīvokļa profils un mājokļa informācija;
- **Rādījumi** — jaunākie ūdens skaitītāju rādījumi un pieejamais patēriņa salīdzinājums;
- **Paziņojumi** — aktuālie objekta paziņojumi;
- administrācijas kontaktinformācija.

Ja dzīvoklis vai aktīvs ūdens skaitītājs nav piesaistīts, MVX parāda atbilstošu paziņojumu, nevis tukšus izdomātus datus.

## 7. Ūdens skaitītāju rādījumi

### 7.1. Iesniegšanas perioda statuss

Atveriet **Ūdens skaitītāji**. Lapas augšdaļā MVX parāda ūdens skaitītāju rādījumu iesniegšanas statusu:

- **Ūdens skaitītāju rādījumu iesniegšana ir atvērta** — rādījumu var iesniegt līdz ekrānā norādītajam datumam un laikam;
- **Ūdens skaitītāju rādījumu iesniegšana ir slēgta** — ievades lauki un iesniegšanas darbība nav pieejama;
- ja perioda informāciju neizdodas ielādēt, MVX parāda kļūdas vai nepieejamības paziņojumu.

Izmantojiet MVX parādīto datumu un laiku. Rokasgrāmatā nav noteikts pastāvīgs iesniegšanas periods.

### 7.2. Skaitītāja kartīte

Skaitītāji ir sakārtoti pa dzīvokļiem. Kartītē var būt redzams:

- **Aukstais ūdens** vai **Karstais ūdens**;
- skaitītāja atrašanās vieta;
- **Stāvvads**;
- **Sērijas numurs**;
- **Pašreizējais rādījums**;
- pēdējās iesniegšanas datums.

Pirms iesniegšanas pārbaudiet dzīvokli, ūdens veidu, atrašanās vietu un sērijas numuru, lai rādījums netiktu ievadīts citam skaitītājam.

### 7.3. Jauna rādījuma iesniegšana

1. Pārliecinieties, ka iesniegšanas periods ir atvērts.
2. Atrodiet pareizo skaitītāju.
3. Laukā **Jaunais rādījums, m³** ievadiet pilnu skaitītāja rādījumu, nevis mēneša patēriņu.
4. Ievadiet ne vairāk kā trīs ciparus aiz decimālatdalītāja. MVX pieņem komatu vai punktu, piemēram, `123,456` vai `123.456`.
5. Vēlreiz salīdziniet ievadīto vērtību ar skaitītāju.
6. Izvēlieties **Iesniegt**.

Cipari pirms decimālatdalītāja ir kubikmetri, bet trīs cipari aiz tā — litri. Vērtība nedrīkst būt negatīva. Vienam skaitītājam vienā pārskata periodā nevar atkārtoti izveidot otru aktīvu iesniegumu.

Pēc sekmīgas iesniegšanas kartīte tiek atjaunināta. Ja MVX rādījumu nepieņem, pārbaudiet perioda statusu, skaitītāju un ievades formātu.

### 7.4. Skaitītāja vēsture

Izvēlieties **Skatīt vēsturi**, lai atvērtu konkrētā skaitītāja vēsturi. Tajā ir redzams rādījuma datums, rādījums un, ja aprēķināms, patēriņš.

Ja vēsturē ir pieejama darbība **Labot**, tā attiecas uz jaunāko labojamo rādījumu. Ievadiet pilnu laboto rādījumu, izvēlieties labošanas iemeslu un saglabājiet labojumu. Ja darbība nav pieejama vai MVX labojumu nepieņem, sazinieties ar MVX administratoru.

## 8. Paziņojumi

Sadaļā **Paziņojumi** ir redzama aktuālā informācija no objekta administrācijas.

Paziņojumam var būt prioritāte **Svarīgi**, **Informācija** vai **Parasts**. Lai izlasītu visu tekstu:

1. atveriet paziņojuma priekšskatījumu, ja tas ir sakļauts;
2. izvēlieties **Atvērt paziņojumu →**;
3. pēc izlasīšanas izvēlieties **← Atpakaļ uz paziņojumiem**.

Ja aktuālu un tieši šim lietotājam paredzētu paziņojumu nav, MVX parāda **Pašlaik nav aktuālu paziņojumu.**

## 9. Dokumenti un juridiskā informācija

Atveriet **Dokumenti** un sadaļu **Juridiskā informācija**. MVX V0.0 nodrošina piekļuvi šādiem publiskiem dokumentiem:

- **Personas datu apstrādes paziņojums**;
- **Ierīces datu glabāšanas un sīkdatņu paziņojums**;
- **Operatora un kontaktinformācija**;
- **MVX lietošanas noteikumi**.

Izvēlieties dokumenta nosaukumu, lai to atvērtu. Dokumenta lapā izmantojiet **Atpakaļ uz dokumentiem**, lai atgrieztos sarakstā.

Šī rokasgrāmata neatkārto un neaizstāj juridisko dokumentu saturu. Vienmēr izmantojiet MVX redzamo aktuālo dokumenta versiju.

## 10. Personīgie iestatījumi

### 10.1. Paroles maiņa

Sadaļas **Iestatījumi** blokā **Drošība** var mainīt paroli:

1. ievadiet **Pašreizējā parole**;
2. ievadiet **Jaunā parole**;
3. ievadiet **Atkārtojiet jauno paroli**;
4. izvēlieties **Mainīt paroli**.

Jaunajai parolei jābūt vismaz 8 rakstzīmes garai, tai jāatšķiras no pašreizējās paroles, un abiem jaunās paroles ierakstiem jāsakrīt.

### 10.2. Steidzamie paziņojumi

Blokā **Paziņojumi** var ieslēgt vai izslēgt **Steidzami paziņojumi** šajā ierīcē.

Lai tos ieslēgtu:

1. izvēlieties **Ieslēgt steidzamos paziņojumus**;
2. pārlūkprogrammas vai operētājsistēmas pieprasījumā atļaujiet paziņojumus;
3. pārbaudiet, ka MVX parāda ieslēgtu statusu.

Atļauja attiecas uz konkrēto pārlūkprogrammu un ierīci. Ja paziņojumi ir bloķēti pārlūkprogrammas vai operētājsistēmas iestatījumos, MVX tos nevar ieslēgt pats.

## 11. Mobilā lietošana, PWA instalēšana un push paziņojumi

MVX var izmantot pārlūkprogrammā. Atbalstītā ierīcē to var pievienot arī kā PWA ātrākai piekļuvei.

Ja pieslēgšanās lapā parādās piedāvājums **Instalēt MVX šajā ierīcē?**, izvēlieties **Instalēt** un izpildiet parādīto instrukciju. Izvēloties **Ne tagad**, instalēšanu var atlikt.

### 11.1. iPhone vai iPad

1. Atveriet MVX Safari pārlūkā.
2. Nospiediet **Kopīgot**.
3. Izvēlieties **Pievienot sākuma ekrānam** un pēc tam **Pievienot**.
4. Aizveriet iepriekš atvērto MVX cilni Safari.
5. Turpmāk atveriet MVX no jaunās MVX ikonas sākuma ekrānā.

iPhone vai iPad ierīcē push paziņojumiem vispirms pievienojiet MVX sākuma ekrānam un atveriet to no šīs ikonas.

### 11.2. Android, Mac un citas datora ierīces

- Android pārlūka izvēlnē izmantojiet **Install app** vai **Add to Home screen**.
- Mac Safari izvēlnē **File** izmantojiet **Add to Dock**.
- Citā atbalstītā datora pārlūkprogrammā izmantojiet **Install MVX** vai **Install app**.

Pieejamās komandas un paziņojumu atbalsts ir atkarīgs no ierīces, operētājsistēmas, pārlūkprogrammas un tā iestatījumiem.

## 12. Problēmu novēršana

| Problēma | Pārbaudāmā darbība |
|---|---|
| Nevar pieslēgties | Pārbaudiet MVX adresi, **Nick**, paroli un izvēlēto vidi. Ja piekļuve joprojām nav iespējama, izmantojiet **Aizmirsāt Nick vai paroli?** |
| Pieejami tikai Iestatījumi | Nomainiet pagaidu paroli, kā aprakstīts 4.1. sadaļā. |
| Nav redzams dzīvoklis vai skaitītājs | Pārbaudiet, vai izvēlēts Iedzīvotāja režīms, un sazinieties ar MVX administratoru par konta piesaisti. |
| Rādījumu nevar iesniegt | Pārbaudiet iesniegšanas perioda statusu, pareizo skaitītāju un ievades formātu. |
| Paziņojumus nevar ieslēgt | Pārbaudiet pārlūkprogrammas un operētājsistēmas atļaujas. iPhone vai iPad atveriet instalēto MVX no sākuma ekrāna. |
| Lapa neielādē datus | Pārbaudiet interneta savienojumu, atjaunojiet lapu un mēģiniet vēlreiz. Neveiciet atkārtotu iesniegšanu, ja nav skaidrs, vai iepriekšējā darbība jau saglabāta. |

## 13. Atbalsts un MVX V0.0 ierobežojumi

Aktuālie palīdzības kontakti ir pieejami pieslēgšanās lapas sadaļā **Adrese un kontakti** un logā **Aizmirsāt Nick vai paroli?** Rokasgrāmatā kontaktinformācija netiek dublēta, jo to var mainīt objekta administrators.

Sazinoties ar administratoru, norādiet:

- izmantoto vidi vai MVX adresi;
- savu **Nick**, bet nekad ne paroli;
- sadaļu, kurā radās problēma;
- redzamo kļūdas tekstu un aptuveno laiku.

MVX V0.0 funkcijas ir atkarīgas no lietotāja lomām, konta piesaistēm, objekta iestatījumiem, pārskata perioda stāvokļa, ierīces un pārlūkprogrammas iespējām. Apple Watch nav atsevišķa MVX lietotne; operētājsistēma var tikai spoguļot saderīgus paziņojumus no iPhone.
