---
document_id: MAN-ADM-01
version: "1.0"
language: lv
translation_of: null
status: draft
applies_to: "MVX V0.0"
mode: admin
source_revision: TBD
last_reviewed: TBD
public: false
requires_acceptance: false
---

# MVX V0.0 administratora režīma rokasgrāmata

## 1. Par šo rokasgrāmatu

Šī rokasgrāmata izskaidro MVX V0.0 funkcijas, kas pieejamas **Administratora režīmā**. Tā ir paredzēta lietotājiem ar tehnisko lomu `admin`.

Administratora režīmā var pārvaldīt lietotājus un dzīvokļus, ūdens skaitītājus un rādījumus, paziņojumus, mēneša pārskatus, lietotājiem redzamo kontaktinformāciju un citus sistēmas iestatījumus.

Rokasgrāmata apraksta tikai MVX V0.0 redzamās lietotāja darbības. Tā neaizstāj juridiskos dokumentus, incidentu novēršanas procedūras vai tehnisko infrastruktūras dokumentāciju un neapraksta plānotas nākamo versiju funkcijas.

> **Svarīgi:** administratora darbības var ietekmēt vairākus lietotājus un vēsturiskos datus. Pirms saglabāšanas vienmēr pārbaudiet izvēlēto objektu, lietotāju, dzīvokli, skaitītāju, periodu un vidi.

## 2. MVX atvēršana un valodas izvēle

Atveriet administrējamajam objektam paredzēto MVX adresi. Pieslēgšanās lapā pārbaudiet:

- objekta nosaukumu;
- vidi, ja tiek rādīta atzīme **TEST** vai **DEMO**;
- sadaļā **Adrese un kontakti** norādīto objekta adresi un aktuālo kontaktinformāciju.

Valodu var izvēlēties laukā **Valoda**. MVX V0.0 ir pieejama latviešu, angļu un krievu valoda. Valodas maiņa nemaina datus, aktīvo vidi vai piekļuves tiesības.

> **Svarīgi:** TEST un DEMO vide nav produkcijas vide. Pirms administratīvas darbības pārbaudiet, vai atvērta pareizā vide. Testa vidē izmantotie dati var būt sintētiski.

## 3. Pieslēgšanās un iziešana

### 3.1. Pieslēgšanās

1. Pieslēgšanās formā laukā **Nick** ievadiet savu lietotāja identifikatoru.
2. Laukā **Parole** ievadiet paroli.
3. Izvēlieties **Pieslēgties**.

Pēc sekmīgas pieslēgšanās MVX atver lietotājam pieejamo režīmu. Ja kontam ir pieejams gan Iedzīvotāja režīms, gan Administratora režīms, sānu izvēlnē izvēlieties **Administratora režīms**.

### 3.2. Iziešana

Lai pabeigtu darbu, sānu izvēlnē izvēlieties **Iziet**. Koplietojamā ierīcē pēc darba vienmēr izejiet no MVX un aizveriet pārlūkprogrammas logu.

## 4. Pagaidu parole un personīgā konta drošība

Ja kontam piešķirta pagaidu parole, MVX pirms citu sadaļu izmantošanas pieprasa to nomainīt.

1. Atveriet **Iestatījumi**, ja šī lapa nav atvērta automātiski.
2. Laukā **Pašreizējā parole** ievadiet pagaidu paroli.
3. Laukā **Jaunā parole** ievadiet jaunu paroli, kurā ir vismaz 8 rakstzīmes.
4. Laukā **Atkārtojiet jauno paroli** ievadiet to pašu jauno paroli.
5. Izvēlieties **Mainīt paroli**.

Jaunajai parolei jāatšķiras no pašreizējās paroles. Līdz sekmīgai nomaiņai pārējā MVX navigācija nav pieejama.

Administratora paroli nedrīkst koplietot ar citu personu. Nelūdziet lietotājiem nosūtīt viņu paroles. Lietotāja piekļuves atjaunošanai izmantojiet tikai 7.6. sadaļā aprakstīto atjaunošanas koda procesu.

## 5. Tehniskās lomas, Administratora režīms un piekļuves robežas

Atsevišķs Administratora režīms MVX V0.0 ir pieejams tehniskajai lomai `admin`. Lomas `resident` un `owner` izmanto Iedzīvotāja režīmu.

Tehniskās lomas `cooperative_member`, `board_member`, `manager`, `accountant` un `worker` pastāv datu modelī, bet MVX V0.0 tām nav atsevišķu lomu režīmu. Lomas nosaukums pats par sevi nepiešķir Administratora režīmu.

Administratora režīma sānu izvēlnē ir pieejamas šādas sadaļas:

- **Informācijas panelis**;
- **Lietotāji**;
- **Dzīvokļi**;
- **Ūdens skaitītāju pārvaldība**;
- **Ūdens rādījumu vēsture**;
- **Paziņojumi**;
- **Mēneša pārskats**;
- **Dokumenti**;
- **Iestatījumi**.

Mazā ekrānā sānu izvēlni atver ar izvēlnes pogu. Datora skatā izvēlni var sakļaut un atkal atvērt.

## 6. Informācijas panelis

Sadaļa **Informācijas panelis** parāda objekta kopsavilkumu.

Blokā **Ēkas kopsavilkums** var būt redzams:

- dzīvokļu skaits;
- lietotāju vai iedzīvotāju skaits;
- kopējā dzīvojamā platība;
- kopējā nedzīvojamā platība;
- kopējā apkurināmā platība.

Kopsavilkuma vērtības ir atkarīgas no sistēmā saglabātajiem aktīvajiem datiem. Ja skaitlis šķiet nepareizs, vispirms pārbaudiet sadaļas **Dzīvokļi** un **Lietotāji**, nevis veidojiet dublējošu ierakstu.

## 7. Lietotāji

### 7.1. Meklēšana un lietotāja informācija

Atveriet **Lietotāji**. Sarakstu var filtrēt pēc statusa **Visi**, **Aktīvs** vai **Neaktīvs** un meklēt pēc Nick, vārda, e-pasta, tālruņa vai dzīvokļa.

Izvēlieties **Skatīt**, lai atvērtu viena lietotāja informāciju, konta statusu un piekļuves atjaunošanas stāvokli. Personas datus izmantojiet tikai administrēšanas uzdevumam un neatstājiet tos redzamus nepiederošām personām.

### 7.2. Lietotāja izveide

1. Izvēlieties **+ Pievienot lietotāju**.
2. Ievadiet **Nick**.
3. Ievadiet lietotāja vārdu un uzvārdu.
4. Ievadiet e-pasta adresi un, ja nepieciešams, tālruņa numuru.
5. Ievadiet **Pagaidu parole**.
6. Izvēlieties **Izveidot lietotāju**.

Pagaidu paroli nododiet pārbaudītajam lietotājam pa saskaņotu drošu kanālu. Pirmajā pieslēgšanās reizē lietotājam tā būs jānomaina.

### 7.3. Lietotāja datu rediģēšana

Izvēlieties **Rediģēt**, mainiet nepieciešamos laukus un izvēlieties **Saglabāt izmaiņas**. Pirms saglabāšanas pārbaudiet, vai tiek rediģēts pareizais Nick.

### 7.4. Statusa maiņa

Rediģēšanas logā izvēlieties **Mainīt statusu**, pēc tam **Iestatīt aktīvu** vai **Iestatīt neaktīvu**.

> **Brīdinājums:** statusa maiņa lietotāju neizdzēš. Visi ieraksti un dzīvokļu piesaistes vēsture paliek sistēmā. Pirms deaktivizēšanas pārbaudiet lietotāja identitāti un pārliecinieties, ka piekļuves bloķēšana ir pamatota.

### 7.5. Dzīvokļu piesaistes

1. Lietotāja kartītē izvēlieties **Piesaistes**.
2. Izvēlieties dzīvokli.
3. Laukā **Saistība** izvēlieties **Īpašnieks** vai **Iedzīvotājs**.
4. Izvēlieties **Pievienot piesaisti**.

Esošu piesaisti var noņemt ar darbību **Noņemt**. Pirms noņemšanas pārbaudiet dzīvokļa numuru un saistības veidu, jo piesaiste nosaka, kādus dzīvokļa datus lietotājs redz Iedzīvotāja režīmā.

### 7.6. Administratora palīdzība konta atjaunošanā

Lietotāja informācijas loga blokā **Konta atjaunošana** var pārbaudīt atjaunošanas koda statusu.

Lai izsniegtu kodu:

1. pirms darbības pārbaudiet lietotāja identitāti pa organizācijā apstiprinātu kanālu;
2. izvēlieties **Izsniegt atjaunošanas kodu**;
3. apstipriniet darbību;
4. nekavējoties nokopējiet parādīto kodu;
5. nosūtiet to pārbaudītajam lietotājam pa saskaņoto manuālo kanālu.

> **Svarīgi:** atjaunošanas kods tiek parādīts tikai vienu reizi. Ja tiek izsniegts jauns kods, iepriekšējais aktīvais kods tiek atsaukts. Kodu var izsniegt tikai aktīvam lietotājam.

Aktīvu kodu var atsaukt ar **Atsaukt atjaunošanas kodu**. Neprasiet lietotājam nosūtīt jums jauno paroli un nesaglabājiet Recovery Code ārpus apstiprinātā atbalsta procesa.

## 8. Dzīvokļi

### 8.1. Meklēšana un pārskats

Atveriet **Dzīvokļi**. Dzīvokli var meklēt pēc numura vai lietotāja Nick, kā arī atlasīt pēc ēkas sekcijas un stāva.

Dzīvokļa skatā var būt redzama pamatinformācija, platības, istabu un iedzīvotāju skaits, līmeņu skaits, karstā ūdens stāvvadu skaits, alternatīvās apkures pazīme, piezīmes, īpašnieki un iedzīvotāji.

Izvēloties saistītu lietotāju, var pāriet uz sadaļu **Lietotāji**. Atgriešanās darbība saglabā darba kontekstu, ja to atbalsta atvērtais skats.

### 8.2. Dzīvokļa izveide

1. Izvēlieties **+ Pievienot dzīvokli**.
2. Ievadiet dzīvokļa numuru, sekciju un stāvu.
3. Ievadiet istabu, iedzīvotāju, karstā ūdens stāvvadu un līmeņu skaitu.
4. Ievadiet dzīvojamo, nedzīvojamo, apkurināmo, alternatīvās apkures un zemes nodokļa platību kvadrātmetros.
5. Ja attiecināms, atzīmējiet **Alternatīvā apkure** un pievienojiet piezīmes.
6. Izvēlieties **Saglabāt dzīvokli**.

Pirms saglabāšanas pārbaudiet dzīvokļa numuru un sekciju. Neveidojiet otru dzīvokļa ierakstu, lai labotu jau esoša dzīvokļa lietotāja piesaisti.

## 9. Ūdens skaitītāju pārvaldība

### 9.1. Saraksts un filtri

Atveriet **Ūdens skaitītāju pārvaldība**. Kopsavilkuma kartītes parāda skaitītājus ar derīgu kalibrēšanu, drīz beigu termiņu, beigušos termiņu vai bez kalibrēšanas.

Sarakstu var meklēt un filtrēt pēc ūdens veida, aktīvā statusa un kalibrēšanas statusa. Pirms darbības salīdziniet dzīvokli, ūdens veidu, atrašanās vietu, sērijas numuru un stāvvadu.

### 9.2. Skaitītāja pievienošana

1. Izvēlieties **Pievienot skaitītāju**.
2. Izvēlieties dzīvokli un stāvvadu.
3. Izvēlieties ūdens veidu un ievadiet sērijas numuru.
4. Ja informācija ir pieejama, ievadiet ražotāju un modeli.
5. Norādiet uzstādīšanas datumu un **Sākotnējais rādījums, m³**.
6. Norādiet, vai kalibrēšanas sertifikāts ir pieejams.
7. Ja sertifikāts ir pieejams, ievadiet kalibrēšanas datumu, derīguma termiņu, sertifikāta numuru, laboratoriju un pievienojiet dokumentu.
8. Pārbaudiet ievadītos datus un izvēlieties **Pievienot ūdens skaitītāju**.

Sākotnējais rādījums ir pilns skaitītāja rādījums. Ievadiet ne vairāk kā trīs ciparus aiz decimālatdalītāja. MVX pieņem komatu vai punktu.

Kalibrēšanas dokumentam atbalstītie formāti ir PDF, eDoc un ASiC-E; maksimālais izmērs ir 10 MB. Ja sertifikāts nav pieejams, MVX pirms skaitītāja reģistrēšanas bez dokumenta pieprasa atsevišķu apstiprinājumu.

### 9.3. Skaitītāja rediģēšana

Izvēlieties **Rediģēt**, mainiet nepieciešamos skaitītāja datus un izvēlieties **Saglabāt izmaiņas**.

Ja tiek mainīts sākotnējais rādījums vai tā datums, laukā **Labošanas iemesls** jānorāda pamatojums. Šāda maiņa ietekmē rādījumu audita vēsturi; pirms saglabāšanas pārbaudiet vērtību, datumu un iemeslu.

### 9.4. Kalibrēšanas vēsture

Skaitītāja skatā atveriet **Kalibrēšanas vēsture**. Tajā var apskatīt iepriekšējos ierakstus un kalibrēšanas dokumentus. Ja nepieciešams, izvēlieties **Pievienot kalibrēšanu**, ievadiet jaunos datus un pievienojiet dokumentu.

### 9.5. Skaitītāja deaktivizēšana

1. Izvēlieties **Deaktivizēt**.
2. Atlasiet vienu vai vairākus aktīvus skaitītājus.
3. Katram skaitītājam izvēlieties iemeslu, piemēram, nomaiņa, bojājums vai noņemšana.
4. Pārbaudiet atlasi un apstipriniet deaktivizēšanu.

> **Brīdinājums:** deaktivizēts skaitītājs vairs nav izmantojams jaunai rādījumu iesniegšanai, bet tā vēsturiskie rādījumi tiek saglabāti. Pirms darbības pārbaudiet sērijas numuru un dzīvokli.

## 10. Ūdens rādījumu vēsture

Sadaļa **Ūdens rādījumu vēsture** ir iesniegto, laboto un aizstāto ūdens skaitītāju rādījumu audita pārskats.

Kopsavilkumā ir redzams visu, aktīvo, aizstāto un administrācijas saņemto ierakstu skaits. Ierakstus var:

- meklēt pēc dzīvokļa, sērijas numura vai lietotāja;
- filtrēt pēc pārskata perioda, ūdens veida, avota un statusa;
- pārskatīt pēc datuma, dzīvokļa, skaitītāja, rādījuma, avota, iesniedzēja un labošanas informācijas;
- eksportēt ar **Eksportēt XLSX**.

Avots var būt Iedzīvotāja portāls, papīra pieraksts, e-pasts, tālrunis vai administratora manuāla ievade. Statuss **Aizstāts** nozīmē, ka ieraksta vietā ir izveidots jaunāks audita ieraksts; vēsturisko ierakstu nedrīkst interpretēt kā pašreizējo aktīvo rādījumu.

Filtri ietekmē arī eksportējamo ierakstu kopu. Ja atlasītajiem filtriem nav ierakstu, MVX neizveido tukšu eksportu.

## 11. Mēneša pārskats un administratīva rādījumu saņemšana

### 11.1. Pārskata izvēle un kopsavilkums

Atveriet **Mēneša pārskats** un izvēlieties pārskata periodu. MVX parāda perioda statusu, rādījumu iesniegšanas sākuma un beigu laiku, dzīvokļu un skaitītāju iesniegšanas kopsavilkumu un aprēķināmo ūdens patēriņu.

Bloks **Dzīvokļi, kuriem jāpievērš uzmanība** parāda dzīvokļus, kuros trūkst viena vai vairāku aktīvo skaitītāju rādījumu. Blokā **Skaitītāju dati** var pārskatīt iepriekšējo un pašreizējo rādījumu, patēriņu un datu statusu.

Izvēlieties **Lejupielādēt XLSX**, lai saglabātu izvēlētā perioda pārskatu. Pirms faila izmantošanas pārbaudiet periodu un izveidošanas laiku.

### 11.2. Administratīva rādījumu saņemšana

Administrators drīkst ievadīt rādījumu, ko administrācija faktiski saņēmusi ārpus Iedzīvotāja portāla.

1. Pareizā dzīvokļa kartītē izvēlieties **Saņemt rādījumus**.
2. Ievadiet pilnu rādījumu vismaz vienam parādītajam skaitītājam.
3. Norādiet **Rādījuma datums**.
4. Laukā **Avots** izvēlieties faktisko saņemšanas kanālu.
5. Laukā **Piezīme par avotu** ierakstiet pārbaudāmu īsu paskaidrojumu.
6. Izvēlieties **Saglabāt rādījumus**.

> **Svarīgi:** neizmantojiet administratīvu ievadi, lai izdomātu vai novērtētu lietotāja rādījumu. Saglabājiet tikai faktiski saņemto pilno skaitītāja vērtību un patieso avotu.

Ja pārskata periods ir slēgts, MVX pieprasa atzīmēt **Šis pārskata periods ir slēgts. Es apstiprinu šo novēloto administratīvo ievadi.** Novēlotu ievadi veiciet tikai pēc tam, kad pārbaudīts periods, skaitītājs, saņemšanas datums, avots un pamatojums.

## 12. Paziņojumu pārvaldība

### 12.1. Paziņojuma izveide

Atveriet **Paziņojumi**. Lapā **Paziņojumu pārvaldība**:

1. ievadiet paziņojuma virsrakstu un tekstu;
2. izvēlieties prioritāti;
3. ja nepieciešams, norādiet **Redzams no** un **Redzams līdz**;
4. sadaļā **Saņēmēji** izvēlieties visus lietotājus, sekcijas, dzīvokļus, lomas vai konkrētus lietotājus;
5. izvēlieties **Saglabāt melnrakstu** vai **Saglabāt un publicēt**.

Izvēle **Visiem** aizstāj citus saņēmējus. Beigu datums nevar būt agrāks par sākuma datumu.

> **Brīdinājums:** pirms publicēšanas vēlreiz pārbaudiet tekstu, prioritāti, redzamības laiku un saņēmējus. Publicēšana var nekavējoties padarīt paziņojumu redzamu un izraisīt push paziņojumu nosūtīšanu atbilstošajām ierīcēm.

### 12.2. Rediģēšana, publicēšana un arhivēšana

Sarakstu var filtrēt pēc statusa un prioritātes. Izvēlieties **Rediģēt**, lai mainītu paziņojumu, vai **Publicēt**, lai publicētu saglabātu melnrakstu.

Izvēlieties **Arhivēt**, lai noņemtu paziņojumu no iedzīvotājiem redzamā aktuālā satura. Arhivēšana nav jāizmanto kā pagaidu paslēpšana bez iepriekšējas pārbaudes.

## 13. Dokumenti un juridiskā informācija

Atveriet **Dokumenti** un sadaļu **Juridiskā informācija**. MVX V0.0 nodrošina piekļuvi šādiem publiskiem dokumentiem:

- **Personas datu apstrādes paziņojums**;
- **Ierīces datu glabāšanas un sīkdatņu paziņojums**;
- **Operatora un kontaktinformācija**;
- **MVX lietošanas noteikumi**.

Izvēlieties dokumenta nosaukumu, lai to atvērtu. Dokumenta lapā izmantojiet **Atpakaļ uz dokumentiem**, lai atgrieztos sarakstā.

Šī rokasgrāmata neatkārto un neaizstāj juridisko dokumentu saturu. Vienmēr izmantojiet MVX redzamo aktuālo dokumenta versiju.

## 14. Administratīvie iestatījumi

Administratīvie bloki ir redzami sadaļā **Iestatījumi**, ja aktīvs Administratora režīms, kontam ir loma `admin` un nav nepabeigtas pagaidu paroles nomaiņas.

### 14.1. Publiskā kontaktinformācija

Blokā **Publiskā kontaktinformācija** var mainīt **MVX administratora kontakti** — e-pastu un tālruni, kas lietotājiem tiek rādīti, ja nepieciešama palīdzība ar pieslēgšanos.

Pēc datu pārbaudes izvēlieties **Saglabāt kontaktinformāciju**. Neievadiet privātu vai neapstiprinātu kontaktinformāciju.

### 14.2. Rādījumu iesniegšanas periods

Blokā **Ūdens skaitītāju rādījumi** var iestatīt, cik dienas pirms un pēc mēneša pēdējās dienas iedzīvotāji drīkst iesniegt rādījumus, kā arī pārbaudīt laika joslu, pārvaldāmo mēnesi, pašreizējo statusu un aprēķināto periodu.

Mainiet tikai nepieciešamās vērtības un izvēlieties **Saglabāt perioda iestatījumus**. Pirms saglabāšanas novērtējiet, vai izmaiņa neatver vai neaizver rādījumu iesniegšanu neparedzētā laikā.

### 14.3. Rezerves kopiju pārvaldība

Blokā **Rezerves kopiju pārvaldība** var pārskatīt aizsardzības stāvokli, automātiskās rezerves kopijas statusu, pēdējo veiksmīgo kopiju un pēdējos izpildes rezultātus.

Atkarībā no vides un sistēmas stāvokļa var būt pieejamas darbības:

- ieslēgt vai izslēgt automātisko rezerves kopiju;
- izvēlēties **Izveidot rezerves kopiju tagad**;
- atjaunināt parādīto statusu.

> **Brīdinājums:** izslēdzot automātisko rezerves kopiju, plānotās kopijas var tikt izlaistas. Dariet to tikai apstiprināta iemesla dēļ un pēc tam pārbaudiet, kad aizsardzība ir atjaunota. Manuālas kopijas pieprasījuma pieņemšana vēl nenozīmē, ka kopija jau ir sekmīgi pabeigta.

Ja rezerves kopiju pārvaldība konkrētajā vidē ir atspējota, neuzskatiet to par kļūdu un nemēģiniet apiet vides ierobežojumu.

### 14.4. Atjaunošanas un kontrolētas atcelšanas pārvaldība

Blokā **Atjaunošanas pārvaldība** var pārskatīt pieejamos atjaunošanas punktus un to gatavību. Parastās atjaunošanas darbības MVX V0.0 saskarnē var būt pieejamas tikai lasīšanai.

Ja pēc atjaunošanas sistēma konstatē aizsargātu atcelšanas scenāriju, var parādīties bloks **Atcelšanas pārvaldība** un tikai konkrētajam stāvoklim atļautās darbības. Darbībām var būt nepieciešama pašreizējā parole un precīza ekrānā parādītā apstiprinājuma frāze.

> **Kritisks brīdinājums:** kontrolēta atcelšana var mainīt sistēmas datus un pakalpojuma stāvokli. Nesāciet atcelšanu, atkārtotu mēģinājumu, stāvokļa atiestatīšanu vai nenoteikta pieprasījuma atbrīvošanu bez apstiprināta incidenta atjaunošanas lēmuma un atbildīgās personas pilnvarojuma. Pirms darbības pārbaudiet aktuālo rezerves kopiju, atjaunošanas punktu, vidi un ekrānā redzamo stāvokli.

Šī lietotāja rokasgrāmata nepublicē apstiprinājuma frāzes un neaizstāj tehnisko incidentu atjaunošanas procedūru. Ja nav skaidrs, kura darbība ir atļauta, pārtrauciet darbu un izmantojiet apstiprināto atbalsta ceļu.

## 15. Personīgie iestatījumi

### 15.1. Paroles maiņa

Sadaļas **Iestatījumi** blokā **Drošība** var mainīt administratora personīgo paroli:

1. ievadiet **Pašreizējā parole**;
2. ievadiet **Jaunā parole**;
3. ievadiet **Atkārtojiet jauno paroli**;
4. izvēlieties **Mainīt paroli**.

Jaunajai parolei jābūt vismaz 8 rakstzīmes garai, tai jāatšķiras no pašreizējās paroles, un abiem jaunās paroles ierakstiem jāsakrīt.

### 15.2. Steidzamie paziņojumi

Blokā **Paziņojumi** var ieslēgt vai izslēgt **Steidzami paziņojumi** šajā ierīcē.

Lai tos ieslēgtu, izvēlieties **Ieslēgt steidzamos paziņojumus**, atļaujiet paziņojumus pārlūkprogrammas vai operētājsistēmas pieprasījumā un pārbaudiet ieslēgto statusu.

Atļauja attiecas uz konkrēto pārlūkprogrammu un ierīci. Ja paziņojumi ir bloķēti pārlūkprogrammas vai operētājsistēmas iestatījumos, MVX tos nevar ieslēgt pats.

## 16. Mobilā lietošana, PWA instalēšana un push paziņojumi

MVX var izmantot pārlūkprogrammā. Atbalstītā ierīcē to var pievienot arī kā PWA ātrākai piekļuvei.

Ja pieslēgšanās lapā parādās piedāvājums **Instalēt MVX šajā ierīcē?**, izvēlieties **Instalēt** un izpildiet parādīto instrukciju. Izvēloties **Ne tagad**, instalēšanu var atlikt.

### 16.1. iPhone vai iPad

1. Atveriet MVX Safari pārlūkā.
2. Nospiediet **Kopīgot**.
3. Izvēlieties **Pievienot sākuma ekrānam** un pēc tam **Pievienot**.
4. Aizveriet iepriekš atvērto MVX cilni Safari.
5. Turpmāk atveriet MVX no jaunās MVX ikonas sākuma ekrānā.

iPhone vai iPad ierīcē push paziņojumiem vispirms pievienojiet MVX sākuma ekrānam un atveriet to no šīs ikonas.

### 16.2. Android, Mac un citas datora ierīces

- Android pārlūka izvēlnē izmantojiet **Install app** vai **Add to Home screen**.
- Mac Safari izvēlnē **File** izmantojiet **Add to Dock**.
- Citā atbalstītā datora pārlūkprogrammā izmantojiet **Install MVX** vai **Install app**.

Administratora režīmu mobilajā ierīcē izmantojiet īpaši piesardzīgi: pirms apstiprināšanas pārbaudiet pilnu ieraksta identifikāciju un nepieļaujiet, ka administratīvie dati paliek redzami citām personām.

## 17. Problēmu novēršana

| Problēma | Pārbaudāmā darbība |
|---|---|
| Nevar pieslēgties | Pārbaudiet MVX adresi, **Nick**, paroli un izvēlēto vidi. Ja nepieciešams, izmantojiet **Aizmirsāt Nick vai paroli?** un sazinieties ar citu pilnvarotu MVX administratoru. |
| Pieejami tikai Iestatījumi | Nomainiet pagaidu paroli, kā aprakstīts 4. sadaļā. |
| Nav pieejams Administratora režīms | Pārbaudiet, vai kontam ir tehniskā loma `admin`. Lomas nosaukums citā sistēmā nepiešķir MVX piekļuvi. |
| Nevar atrast lietotāju | Pārbaudiet meklēšanas tekstu un statusa filtru. Meklējot personas datus, izmantojiet tikai administrēšanas uzdevumam nepieciešamo informāciju. |
| Nav redzams dzīvoklis vai skaitītājs | Pārbaudiet sekcijas, stāva un statusa filtrus, pēc tam atjauniniet datus. Neveidojiet dublikātu, pirms nav pārbaudīts esošais ieraksts. |
| Nevar saglabāt rādījumu | Pārbaudiet skaitītāju, pilnā rādījuma formātu, rādījuma datumu, avotu, avota piezīmi un perioda statusu. Slēgtam periodam nepieciešams atsevišķs apstiprinājums. |
| XLSX fails netiek izveidots | Pārbaudiet, vai atlasītajam periodam vai filtriem ir eksportējami dati, un mēģiniet vēlreiz. |
| Paziņojumus nevar ieslēgt | Pārbaudiet pārlūkprogrammas un operētājsistēmas atļaujas. iPhone vai iPad atveriet instalēto MVX no sākuma ekrāna. |
| Rezerves kopijas vai atjaunošanas bloks nav pieejams | Pārbaudiet, vai aktīvs Administratora režīms un pareizā vide. Dažās vidēs pārvaldība ir apzināti atspējota vai pieejama tikai lasīšanai. |
| Lapa neielādē datus | Pārbaudiet interneta savienojumu, atjaunojiet lapu un mēģiniet vēlreiz. Neatkārtojiet augstas ietekmes darbību, ja nav skaidrs, vai iepriekšējais pieprasījums jau pieņemts. |

## 18. Atbalsts un MVX V0.0 ierobežojumi

Aktuālie palīdzības kontakti ir pieejami pieslēgšanās lapas sadaļā **Adrese un kontakti** un logā **Aizmirsāt Nick vai paroli?** Rokasgrāmatā kontaktinformācija netiek dublēta, jo to var mainīt objekta administrators.

Sazinoties ar atbalstu, norādiet:

- izmantoto vidi vai MVX adresi;
- savu **Nick**, bet nekad ne paroli;
- sadaļu un ierakstu, ar kuru tika veikta darbība;
- redzamo kļūdas tekstu un aptuveno laiku;
- vai darbība varēja mainīt datus.

MVX V0.0 funkcijas ir atkarīgas no lietotāja lomas, aktīvā režīma, konta piesaistēm, objekta un vides iestatījumiem, pārskata perioda stāvokļa, aizsardzības kontroles, ierīces un pārlūkprogrammas iespējām.

Apple Watch nav atsevišķa MVX lietotne; operētājsistēma var tikai spoguļot saderīgus paziņojumus no iPhone. Administratora darbības Apple Watch ierīcē nav pieejamas.
