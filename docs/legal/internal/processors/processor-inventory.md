---
document_id: PROC-INV-01
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

# APSTRĀDĀTĀJU, APAKŠAPSTRĀDĀTĀJU UN DATU NODOŠANAS INVENTĀRS

## 1. Mērķis

Inventārs dokumentē būtiskos ārējos tehniskos pakalpojumus, kas var būt iesaistīti MVX personas datu apstrādē.

Konkrētas juridiskās lomas periodiski jāpārskata atbilstoši faktiskajai datu plūsmai un līgumiskajam modelim.

## 2. Galvenās lomas

**Pārzinis:** DzĪKS “Irlava 20”.

**MVX tehniskais pakalpojuma sniedzējs:** Apstrādātājs attiecībā uz personas datiem, ko tas apstrādā DzĪKS “Irlava 20” uzdevumā.

## 3. Ārējie pakalpojumi

### 3.1. Cloudflare

**Funkcija:** Worker, Pages, D1, R2 un saistītā infrastruktūra.

**Datu kategorijas:** MVX produkcijas dati, tehniskie dati un faili atbilstoši izmantotajam servisam.

**Loma:** apakšapstrādātājs / infrastruktūras pakalpojuma sniedzējs atbilstoši līgumiskajam modelim.

**Pārsūtīšana ārpus EEZ:** iespējama atbilstoši pakalpojuma infrastruktūrai un piemērojamajiem datu nodošanas mehānismiem.

**Statuss:** aktīvs.

### 3.2. GitHub

**Funkcija 1:** programmatūras koda glabāšana un versiju kontrole.

Produkcijas personas datus repozitorijā glabāt nav paredzēts.

**Funkcija 2:** GitHub Actions backup/recovery automatizācija.

Backup/recovery procesā GitHub-hosted runner var īslaicīgi apstrādāt produkcijas datus pirms gala backup pakotnes šifrēšanas.

**Statuss:** aktīvs V0.0 pilotā.

**V0.0 riska piezīme:** izmantotā GitHub konta/plāna līgumiskā atbilstība produkcijas datu apstrādei ir atkārtoti izvērtējama pirms MVX komerciālas ieviešanas jaunam klientam.

### 3.3. MEGA

**Funkcija:** šifrētu off-site rezerves kopiju glabāšana.

**Konts V0.0 pilotā:** tehniskā pakalpojuma sniedzēja pārvaldīts maksas konts.

**Dati:** šifrēta backup pakotne.

**Statuss:** aktīvs V0.0 pilotā.

**V0.0 riska piezīme:** līgumiskā/DPA piemērotība ir atkārtoti izvērtējama pirms komerciālas ieviešanas jaunam klientam.

### 3.4. Web Push infrastruktūra

**Funkcija:** push paziņojumu nogādāšana gala ierīcē.

**Iespējamie sniedzēji:** pārlūkprogrammas vai operētājsistēmas push infrastruktūras nodrošinātāji.

**Dati:** push endpoint, kriptogrāfiskā/tehniskā piegādes informācija un standarta tīkla metadata.

**Statuss:** tikai lietotājiem, kuri aktivizējuši push.

### 3.5. SheetJS CDN

**Funkcija:** XLSX bibliotēkas tehniskā ielāde pārlūkā Monthly Report funkcionalitātei.

**Dati:** pakalpojuma serverim var būt pieejama standarta HTTP/network metadata; MVX atskaites saturs nav paredzēts nosūtīšanai SheetJS.

**Statuss:** aktīvs pašreizējā arhitektūrā.

## 4. Pārskatīšanas punkti

Inventārs jāpārskata:

- pievienojot jaunu ārējo pakalpojumu;
- mainoties backup arhitektūrai;
- pirms jauna komerciāla klienta;
- mainoties pakalpojuma plānam vai līgumiskajiem noteikumiem;
- ja mainās datu nodošana ārpus EEZ.
