---
document_id: DOC-REG-01
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

# MVX LEGAL DOCUMENT REGISTER
## Dokumentu reģistrs un versiju kontrole

**Sistēma:** MVX  
**Objekts:** Irlavas iela 20, Rīga  
**Pārzinis:** DzĪKS “Irlava 20”

## 1. Dokumentu versiju princips

MVX juridiskie un datu aizsardzības dokumenti tiek pārvaldīti ar kontrolētu versiju numerāciju.

Pamatprincips:

- **1.0** — pirmā apstiprinātā V0.0 dokumenta versija;
- **1.1, 1.2, ...** — nebūtiski vai redakcionāli grozījumi;
- **2.0, 3.0, ...** — būtiski grozījumi, kas maina dokumenta saturu, lomas, tiesisko pamatu, datu plūsmu vai būtiskas lietotāja tiesības.

Latviešu valodas versija ir master versija.

EN un RU publisko dokumentu versijas ir LV master tulkojumi.

## 2. Publicējamie dokumenti

| ID | Dokuments | LV | EN | RU | Public |
|---|---|---:|---:|---:|---:|
| PUB-PRIV-01 | Personas datu apstrādes paziņojums | 1.0 | 1.0 | 1.0 | Jā |
| PUB-DEV-01 | Ierīces datu glabāšanas un sīkdatņu paziņojums | 1.0 | 1.0 | 1.0 | Jā |
| PUB-OP-01 | Operatora un kontaktinformācija | 1.0 | 1.0 | 1.0 | Jā |
| PUB-RULES-01 | MVX lietošanas noteikumi | 1.0 | 1.0 | 1.0 | Jā |

Publiskajiem dokumentiem `effective_from` tiek aizpildīts pirms faktiskās V0.0 publicēšanas.

## 3. Iekšējie datu aizsardzības dokumenti

| ID | Dokuments | Versija | Public |
|---|---|---:|---:|
| ROPA-01 | Pārziņa apstrādes darbību reģistrs | 1.0 | Nē |
| PROC-ROPA-01 | Apstrādātāja apstrādes darbību reģistrs | 1.0 | Nē |
| RET-01 | Datu glabāšanas un dzēšanas matrica | 1.0 | Nē |
| PROC-INV-01 | Apstrādātāju/apakšapstrādātāju/datu nodošanas inventārs | 1.0 | Nē |
| LIA-01 | Droša digitālā piekļuve | 1.0 | Nē |
| LIA-02 | Sistēmas drošība un atbildība | 1.0 | Nē |
| LIA-03 | Pakalpojuma komunikācija | 1.0 | Nē |
| LIA-04 | Pakalpojuma nepārtrauktība un atjaunošana | 1.0 | Nē |
| DOC-REG-01 | Dokumentu reģistrs un versiju kontrole | 1.0 | Nē |

## 4. Līgumiskie dokumenti

PR-4 ietvaros paredzēti arī:

| ID | Dokuments | Glabāšana |
|---|---|---|
| PILOT-AGR-01 | MVX Pilot Use, Licence and Support Agreement | Drošs juridiskais arhīvs ārpus publiskā application repo |
| DPA-01 | GDPR Article 28 Data Processing Agreement | Drošs juridiskais arhīvs ārpus publiskā application repo |

Parakstītie `.edoc`, PDF ar kvalificētu e-parakstu vai citi juridiski nozīmīgi oriģināli netiek glabāti publiskajā MVX application Git repozitorijā.

## 5. Dokumentu statuss

Atļautie statusi:

- `draft`;
- `approved-for-v0.0`;
- `effective`;
- `superseded`;
- `withdrawn`.

`approved-for-v0.0` nozīmē, ka dokumenta saturs ir apstiprināts V0.0 release sagatavošanai, bet faktiskā spēkā stāšanās vēl var nebūt notikusi.

`effective` tiek izmantots pēc faktiskā spēkā stāšanās datuma noteikšanas.

## 6. Effective date

Kamēr konkrēta V0.0 spēkā stāšanās diena nav pieņemta, metadata laukā tiek izmantots:

`effective_from: TBD`

Pirms publicēšanas šis lauks jāaizstāj ar faktisko datumu visos attiecīgajos dokumentos.

## 7. Pārskatīšanas gadījumi

Dokumentus pārskata:

- pirms MVX V0.0 publicēšanas;
- būtiski mainoties MVX funkcionalitātei;
- mainoties personas datu plūsmām;
- pievienojot jaunu ārējo pakalpojumu;
- mainoties Controller / Processor modelim;
- pirms jauna komerciāla klienta;
- pēc būtiska personas datu aizsardzības vai drošības incidenta;
- mainoties piemērojamam tiesiskajam regulējumam.

## 8. Īpašie pirmskomercializācijas pārskatīšanas punkti

Pirms MVX tiek piedāvāts komerciālam klientam, atkārtoti jāizvērtē vismaz:

- GitHub izmantotais plāns un līgumiskie datu apstrādes nosacījumi;
- GitHub Actions izmantošana produkcijas backup/recovery procesā;
- MEGA pakalpojuma līgumiskā un DPA piemērotība;
- Cloudflare aktuālie līgumiskie un starptautisko datu nodošanas nosacījumi;
- Web Push piegādes pakalpojumu lomas;
- ārējā SheetJS CDN izmantošana;
- backup arhitektūra;
- Processor/Subprocessor inventārs;
- DPA un klienta līguma redakcija.

## 9. Repo un juridisko oriģinālu nodalīšana

Git repozitorijā var glabāt:

- publisko informatīvo dokumentu avota tekstus;
- iekšējos compliance dokumentus;
- versiju vēsturi.

Publiskajā application repo nav jāglabā:

- parakstīti līgumu oriģināli;
- parakstīti DPA;
- personas dokumenti;
- konfidenciāli reģistrācijas dokumenti;
- privātas atslēgas;
- paroles;
- slepeni konfigurācijas dati.

## 10. Atbildība par dokumentu aktualitāti

Par dokumentu atbilstības pārskatīšanu V0.0 pilotā atbild Pārzinis sadarbībā ar MVX tehnisko pakalpojuma sniedzēju atbilstoši katras puses faktiskajai lomai.
