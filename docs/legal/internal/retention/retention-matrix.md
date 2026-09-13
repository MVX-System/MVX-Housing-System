---
document_id: RET-01
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

# DATU GLABĀŠANAS UN DZĒŠANAS MATRICA

## 1. Mērķis

Šī matrica nosaka personas datu un ar MVX darbību saistītās informācijas glabāšanas pamatprincipus.

Dati netiek glabāti ilgāk, nekā nepieciešams attiecīgajam apstrādes nolūkam, juridiskajam pienākumam, drošības vajadzībām vai pamatotai tiesisko interešu aizsardzībai.

## 2. Glabāšanas matrica

| Datu kategorija | Glabāšanas termiņš / kritērijs |
|---|---|
| Dzīvokļi, sekcijas, stāvi, stāvvadi un ēkas tehniskā struktūra | Kamēr objekts tiek pārvaldīts un informācija ir aktuāla mājas lietai |
| Ūdens skaitītāji un to tehniskā vēsture | Kamēr informācija nepieciešama mājas lietai un skaitītāju vēsturei |
| Ūdens skaitītāju rādījumi | Atbilstoši mājas lietas un pārvaldīšanas dokumentācijas nepieciešamībai |
| Skaitītāju sertifikāti | Kamēr nepieciešami tehniskajai vēsturei |
| Lietotāja konts, loma, dzīvokļa saistība | Kamēr lietotājam nepieciešama piekļuve; pēc tam deaktivizācija un dzēšana/minimizācija |
| Vārds, uzvārds, e-pasts, tālrunis | Kamēr pastāv attiecības vai cits tiesisks pamats |
| PII meklēšanas tokeni | Tikpat ilgi kā atbilstošā PII informācija |
| Aktīvās sesijas | Līdz termiņa beigām vai atsaukšanai |
| Nederīgas/atsauktas sesijas | Parasti līdz 30 dienām |
| Rate-limit ieraksti | Parasti līdz 7 dienām |
| Recovery kods | Maksimāli 60 minūtes |
| Security audit | Parasti līdz 24 mēnešiem |
| PII access audit | Parasti līdz 24 mēnešiem |
| Aktīva push abonēšana | Kamēr funkcija tiek izmantota |
| Neaktīva push abonēšana | Parasti līdz 180 dienām |
| Push piegādes vēsture | Parasti līdz 180 dienām |
| Paziņojumi | Kamēr operatīvi vai dokumentāri nepieciešami |
| Rezerves kopijas | Mērķis: pēdējās ~13 veiksmīgās nedēļas kopijas |
| Backup izpildes metadata | Parasti līdz 24 mēnešiem |
| Restore/rollback žurnāls | Aktīvs līdz operācijas pabeigšanai; pabeigtais orientējoši līdz 24 mēnešiem |
| Grāmatvedības dokumenti, ja vēlāk tiek apstrādāti | Atbilstoši piemērojamajiem normatīvajiem aktiem |
| Ar strīdu vai prasījumu saistīti ieraksti | Kamēr nepieciešami konkrētā strīda vai prasījuma izskatīšanai |

## 3. Backup īpašais noteikums

Datu dzēšana no aktīvās sistēmas pati par sevi neizraisa tūlītēju visu vēsturisko rezerves kopiju pārrakstīšanu.

Dzēstie dati var saglabāties šifrētā backup līdz attiecīgās kopijas parastā rotācijas termiņa beigām.

Ja šāda kopija tiek atjaunota, aktīvajā sistēmā atkārtoti piemēro aktuālās dzēšanas un labošanas prasības.

## 4. Izņēmuma glabāšana

Datus var saglabāt ilgāk tikai tad, ja tas nepieciešams:

- incidenta izmeklēšanai;
- juridiskam strīdam;
- normatīva pienākuma izpildei;
- aktīvai sistēmas atjaunošanai;
- tiesību aizsardzībai.

Šāds izņēmums ir dokumentējams.
