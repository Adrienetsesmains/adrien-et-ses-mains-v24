export type PrestationTarif = {

id:
string;

categorie:
string;

prestation:
string;

unite:
string;

heuresUnite:
number;

prix220:
number;

// ConservÃ© uniquement pour compatibilitÃ© avec l'ancien code.
// Le tarif JÃ©rÃ©mie rÃ©el est dÃ©sormais calculÃ© dans page.tsx
// Ã  partir de prix220 Ã— 190 / 220.

prix190:
number;

rentabilite:
string;

action?:
string;

conditions?:
string;

detailsPdf:
string[];

typeTravaux?:
string;

tags?:
string[];

};

const
HEURES_PAR_JOUR = 7;

const
TARIF_JOUR_NORMAL = 220;

const
TARIF_HORAIRE_NORMAL = TARIF_JOUR_NORMAL
/ HEURES_PAR_JOUR;

const
arrondir2 = (n:
number) =>
Math.round(n
* 100) / 100;

const
prixDepuisTemps = (heures:
number) =>
arrondir2(heures
* TARIF_HORAIRE_NORMAL);

const
p = (

id:
string,

categorie:
string,

prestation:
string,

unite:
string,

heuresUnite:
number,

detailsPdf:
string[],

options:
{

  prixFixe?:
number;

  rentabilite?:
string;

  action?:
string;

  conditions?:
string;

  typeTravaux?:
string;

  tags?:
string[];

}
= {}

):
PrestationTarif =>
{

const
prix220
= options.prixFixe
?? prixDepuisTemps(heuresUnite);

return {

  id,

  categorie,

  prestation,

  unite,

  heuresUnite,

  prix220,

  prix190:
prix220,

  rentabilite:
options.rentabilite
?? "ðŸŸ¢ Base cohÃ©rente",

  action:
options.action
?? "Adapter au chantier si nÃ©cessaire",

  conditions:
options.conditions
?? "Hors fournitures sauf mention contraire.",

  detailsPdf,

  typeTravaux:
options.typeTravaux
?? "main_oeuvre",

  tags:
options.tags
?? [],

};

};

export const DETAILS_PDF_PAR_CATEGORIE: Record<string, string[]> = {

Nettoyage:
[

  "PrÃ©paration de la zone dâ€™intervention",

  "Nettoyage des surfaces concernÃ©es",

  "ContrÃ´le et remise en ordre de fin dâ€™intervention",

],

DÃ©barras:
[
  "RepÃ©rage des Ã©lÃ©ments concernÃ©s ; manutention et tri si nÃ©cessaire.",
  "Ã‰vacuation prÃ©vue au devis.",
  "Nettoyage sommaire de la zone.",
],

Sols:
[
  "ContrÃ´le du support existant ; prÃ©paration prÃ©vue au devis.",
  "Pose et dÃ©coupes courantes.",
  "Ajustements et finitions pÃ©riphÃ©riques.",
],

"Carrelage / FaÃ¯ence":
[
  "ContrÃ´le et prÃ©paration du support ; implantation et pose du revÃªtement.",
  "DÃ©coupes et ajustements courants.",
  "Finitions prÃ©vues au devis.",
],

Peinture:
[
  "Protection de la zone dâ€™intervention ; prÃ©paration du support selon son Ã©tat.",
  "Application des produits prÃ©vus.",
  "RÃ©alisation des finitions courantes.",
],

DÃ©co:
[
  "PrÃ©paration du support ; pose ou dÃ©pose du revÃªtement prÃ©vu.",
  "DÃ©coupes et ajustements courants.",
  "Nettoyage de fin dâ€™intervention.",
],

Placo:
[

  "ContrÃ´le de la zone dâ€™intervention",

  "Pose ou reprise des Ã©lÃ©ments prÃ©vus",

  "Ajustements et finitions courantes",

],

"Plomberie / Sanitaires":
[
  "DÃ©pose si prÃ©vue au devis ; pose ou remplacement de lâ€™Ã©quipement.",
  "Raccordement sur installation existante accessible.",
  "ContrÃ´le dâ€™Ã©tanchÃ©itÃ© et de fonctionnement.",
],

Ã‰lectricitÃ©:
[
  "Mise en sÃ©curitÃ© de lâ€™intervention ; pose ou remplacement sur installation existante.",
  "Raccordement courant.",
  "Essai de fonctionnement.",
],

Chauffage:
[
  "DÃ©pose de lâ€™Ã©quipement existant si prÃ©vue ; pose et fixation du nouvel Ã©quipement.",
  "Raccordement sur installation existante.",
  "Essai de fonctionnement.",
],

Ventilation:
[
  "ContrÃ´le de lâ€™installation existante ; dÃ©pose si nÃ©cessaire.",
  "Pose ou remplacement de lâ€™Ã©lÃ©ment prÃ©vu.",
  "Essai de fonctionnement.",
],

Cuisine:
[
  "Implantation de lâ€™Ã©lÃ©ment concernÃ© ; montage ou pose prÃ©vue au devis.",
  "DÃ©coupes et ajustements courants.",
  "ContrÃ´le des fixations et finitions.",
],

"Bricolage / Menuiserie lÃ©gÃ¨re":
[
  "RepÃ©rage et prÃ©paration ; montage, pose, rÃ©glage ou rÃ©paration prÃ©vue.",
  "Ajustements courants.",
  "ContrÃ´le final.",
],

"Terrasse bois":
[
  "Protection et prÃ©paration de la zone dâ€™intervention ; dÃ©pose des Ã©lÃ©ments prÃ©vus au devis.",
  "ContrÃ´le du support et de la structure existante ; pose, dÃ©coupes et ajustements des lames.",
  "Finitions pÃ©riphÃ©riques prÃ©vues au devis.",
],

Ã‰quipement:
[
  "PrÃ©paration de lâ€™emplacement ; mise en place de lâ€™Ã©quipement.",
  "Raccordement standard si prÃ©vu.",
  "Essai de fonctionnement.",
],

"ExtÃ©rieur / MÃ©tal":
[
  "PrÃ©paration de la zone dâ€™intervention ; contrÃ´le du support existant.",
  "RÃ©alisation de lâ€™intervention prÃ©vue.",
  "Ajustements et finitions courantes.",
],

"ExtÃ©rieur / ClÃ´ture":
[
  "Implantation et contrÃ´le des supports existants ; pose et fixation des Ã©lÃ©ments de clÃ´ture prÃ©vus.",
  "DÃ©coupes, adaptations et rÃ©glages courants.",
  "ContrÃ´le des fixations et nettoyage de fin dâ€™intervention.",
],

"Toiture lÃ©gÃ¨re":
[
  "ContrÃ´le visuel de la zone accessible ; intervention ponctuelle prÃ©vue au devis.",
  "Ajustements et finitions courantes.",
  "Hors travaux structurels et rÃ©fection complÃ¨te.",
],

Jardin:
[
  "PrÃ©paration de la zone ; rÃ©alisation de lâ€™entretien prÃ©vu.",
  "Ramassage si prÃ©vu.",
  "Nettoyage sommaire de fin dâ€™intervention.",
],

"DÃ©placement / logistique":
[

  "DÃ©placement aller-retour chantier",

  "Temps et organisation logistique",

],

};

export const TARIFS_PRESTATIONS: PrestationTarif[] = [
// ================= NETTOYAGE =================
p("NET-FIN-CHANTIER",
"Nettoyage",
"Nettoyage de fin de chantier / remise en Ã©tat",
"mÂ²",
0.06,
[

  "DÃ©poussiÃ©rage et nettoyage des surfaces accessibles",

  "Nettoyage courant des sols et Ã©quipements concernÃ©s",

  "ContrÃ´le et remise en ordre de la zone",

],
{ conditions:
"Hors gros gravats et nettoyage spÃ©cialisÃ©. Minimum chantier applicable.",
tags:
["nettoyage",
"fin chantier"]
}),

p("NET-VITRAGE",
"Nettoyage",
"Nettoyage de vitrages",
"mÂ²",
0.05,
[

  "Nettoyage des faces accessibles prÃ©vues au devis",

  "Essuyage et contrÃ´le visuel de finition",

],
{ conditions:
"Hors travail en hauteur ou accÃ¨s nÃ©cessitant un moyen spÃ©cifique.",
tags:
["vitre",
"vitrage"]
}),

p("NET-LOGEMENT",
"Nettoyage",
"Nettoyage / mÃ©nage de logement",
"h",
1,
[

  "Entretien courant des surfaces prÃ©vues",

  "Nettoyage des Ã©quipements accessibles",

  "Remise en ordre de fin dâ€™intervention",

],
{ conditions:
"Temps minimum et niveau de remise en Ã©tat Ã  prÃ©ciser selon le logement.",
tags:
["mÃ©nage",
"logement"]
}),

p("NET-EQUIPEMENT-LOCAL",
"Nettoyage",
"Nettoyage localisÃ© dâ€™un Ã©quipement intÃ©rieur",
"u",
0.3,
[

  "Nettoyage manuel des salissures sur les surfaces accessibles",

  "Essuyage et contrÃ´le visuel de finition",

],
{ conditions:
"Pour une intervention localisÃ©e sur un Ã©quipement existant. Hors dÃ©montage, dÃ©capage, traitement spÃ©cialisÃ© ou remise en peinture.",
tags:
["nettoyage",
"Ã©quipement",
"radiateur",
"salissures",
"entretien"]
}),
// ================= DEBARRAS =================
p("DEB-ENCOMBRANTS",
"DÃ©barras",
"DÃ©barras et manutention dâ€™encombrants",
"mÂ³",
0.5,
[

  "Manutention des encombrants prÃ©vus au devis",

  "Regroupement et chargement",

],
{ conditions:
"AccÃ¨s, Ã©tages, poids et volume Ã  contrÃ´ler avant devis. Hors frais de dÃ©chÃ¨terie.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["dÃ©barras",
"encombrants"]
}),

p("DEB-TRI",
"DÃ©barras",
"Tri et mise en sac",
"h",
1,
[

  "Tri des dÃ©chets ou Ã©lÃ©ments concernÃ©s",

  "Mise en sacs ou regroupement pour Ã©vacuation",

],
{ tags:
["tri",
"sac"]
}),

p("DEB-DECHETTERIE",
"DÃ©barras",
"Transport / Ã©vacuation en dÃ©chÃ¨terie",
"forfait",
2.5,
[

  "Chargement des dÃ©chets prÃ©parÃ©s",

  "Transport vers une filiÃ¨re adaptÃ©e",

  "DÃ©chargement et retour",

],
{ prixFixe:
80,
conditions:
"Forfait de base hors frais exceptionnels de traitement et hors volume important.",
rentabilite:
"ðŸŸ  Ã€ adapter",
typeTravaux:
"deplacement",
tags:
["dÃ©chÃ¨terie",
"transport"]
}),

p("DEB-GRAVATS",
"DÃ©barras",
"Manutention et Ã©vacuation de gravats",
"mÂ³",
2.5,
[

  "Manutention et chargement des gravats",

  "Ã‰vacuation vers une filiÃ¨re adaptÃ©e",

], { prixFixe: 80,
conditions: "Prix indicatif par mÂ³ Ã  ajuster selon poids, accÃ¨s, distance et coÃ»t de traitement.", rentabilite:
"ðŸŸ  Ã€ adapter", tags:
["gravats", "Ã©vacuation"]
}),
// ================= SOLS =================
p("SOL-DEPOSE",
"Sols",
"DÃ©pose dâ€™un revÃªtement de sol souple ou flottant",
"mÂ²",
0.14,
[

  "DÃ©pose du revÃªtement existant",

  "Retrait des Ã©lÃ©ments non adhÃ©rents accessibles",

  "Regroupement des dÃ©chets",

],
{ conditions:
"Hors dÃ©pose collÃ©e difficile et hors Ã©vacuation en dÃ©chÃ¨terie.",
tags:
["sol",
"dÃ©pose"]
}),

p("SOL-PREP-MECA",
"Sols",
"PrÃ©paration mÃ©canique dâ€™un support de sol",
"mÂ²",
0.18,
[

  "Grattage ou ponÃ§age localisÃ© du support",

  "Retrait des rÃ©sidus non adhÃ©rents",

  "Aspiration et prÃ©paration avant finition",

],
{ conditions:
"Niveau de prÃ©paration Ã  adapter Ã  lâ€™Ã©tat rÃ©el du support.",
tags:
["sol",
"prÃ©paration",
"ponÃ§age",
"colle"]
}),

p("SOL-RAGREAGE",
"Sols",
"RagrÃ©age autolissant du support",
"mÂ²",
0.22,
[
  "ContrÃ´le et dÃ©poussiÃ©rage du support ; application du primaire adaptÃ© si prÃ©vu.",
  "Mise en Å“uvre du ragrÃ©age autolissant.",
  "ContrÃ´le de la planÃ©itÃ© aprÃ¨s sÃ©chage.",
],
{ conditions:
"Ã‰paisseur courante. Hors reprise structurelle, forte Ã©paisseur ou support trÃ¨s dÃ©gradÃ©.",
tags:
["ragrÃ©age",
"sol"]
}),

p("SOL-SOUS-COUCHE",
"Sols",
"Pose dâ€™une sous-couche / pare-vapeur",
"mÂ²",
0.06,
[

  "DÃ©roulage et pose de la sous-couche",

  "DÃ©coupes et raccords courants",

],
{ tags:
["sous couche",
"pare vapeur"]
}),

p("SOL-FLOTTANT",
"Sols",
"Pose dâ€™un revÃªtement de sol flottant",
"mÂ²",
0.22,
[
  "Implantation du sens de pose ; pose flottante du revÃªtement.",
  "DÃ©coupes et jeux pÃ©riphÃ©riques.",
  "Finitions courantes.",
],
{ conditions:
"Support prÃªt. Minimum chantier applicable pour petite surface.",
tags:
["parquet",
"stratifiÃ©",
"flottant"]
}),

p("SOL-PARQUET-COLLE",
"Sols",
"Pose dâ€™un parquet massif collÃ©",
"mÂ²",
0.45,
[

  "Implantation et prÃ©paration de la pose",

  "Encollage et pose du parquet",

  "DÃ©coupes et ajustements pÃ©riphÃ©riques",

],
{ conditions:
"Support prÃªt et compatible. Hors fourniture de colle et reprise du support.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["parquet",
"massif",
"collÃ©"]
}),

p("SOL-PVC-CLIP",
"Sols",
"Pose dâ€™un sol PVC clipsable",
"mÂ²",
0.25,
[

  "Implantation du sens de pose",

  "Pose des lames ou dalles clipsables",

  "DÃ©coupes et ajustements pÃ©riphÃ©riques",

],
{ conditions:
"Support prÃªt. Hors ragrÃ©age.",
tags:
["PVC",
"vinyle",
"clipsable"]
}),

p("SOL-PVC-COLLE",
"Sols",
"Pose dâ€™un sol PVC collÃ©",
"mÂ²",
0.3,
[
  "Implantation du revÃªtement ; encollage et pose.",
  "DÃ©coupes et marouflage.",
  "Finitions pÃ©riphÃ©riques.",
],
{ conditions:
"Support plan, propre et prÃªt. Hors ragrÃ©age.",
tags:
["PVC",
"vinyle",
"collÃ©"]
}),

p("SOL-MOQUETTE",
"Sols",
"Pose dâ€™une moquette",
"mÂ²",
0.2,
[

  "Implantation et dÃ©coupe du revÃªtement",

  "Pose selon le systÃ¨me prÃ©vu",

  "Finitions pÃ©riphÃ©riques",

],
{ conditions:
"Support prÃªt. Hors prÃ©paration lourde.",
tags:
["moquette"]
}),

p("SOL-ROULEAU",
"Sols",
"Pose dâ€™un revÃªtement souple en rouleau",
"mÂ²",
0.22,
[

  "Implantation et dÃ©coupe du revÃªtement",

  "Pose et ajustement",

  "Finitions pÃ©riphÃ©riques",

],
{ conditions:
"Support prÃªt. Hors prÃ©paration lourde.",
tags:
["lino",
"rouleau",
"souple"]
}),

p("SOL-PLINTHE-DEPOSE",
"Sols",
"DÃ©pose de plinthes existantes",
"ml",
0.08,
[

  "DÃ©pose soignÃ©e des plinthes existantes",

  "Retrait des rÃ©sidus de fixation non adhÃ©rents",

  "Regroupement des Ã©lÃ©ments dÃ©posÃ©s",

],
{ conditions:
"Hors rÃ©paration importante du support et hors Ã©vacuation en dÃ©chÃ¨terie.",
tags:
["plinthe",
"dÃ©pose"]
}),

p("SOL-PLINTHE-BOIS",
"Sols",
"Pose de plinthes bois / MDF / PVC",
"ml",
0.13,
[

  "Mesure et dÃ©coupe des plinthes",

  "Pose et fixation",

  "Raccords et finitions courantes",

],
{ conditions:
"Angles et supports courants.",
tags:
["plinthe",
"MDF",
"PVC",
"bois"]
}),

p("SOL-PLINTHE-CARR",
"Sols",
"Pose de plinthes carrelÃ©es",
"ml",
0.26,
[

  "DÃ©coupe et implantation des plinthes",

  "Pose collÃ©e",

  "RÃ©alisation des joints courants",

],
{ tags:
["plinthe",
"carrelage"]
}),

p("SOL-PLINTHE-REFIX",
"Sols",
"Reprise de fixation de plinthes existantes",
"ml",
0.25,
[

  "Nettoyage localisÃ© des surfaces de collage accessibles",

  "Recollage, maintien et contrÃ´le de la fixation",

],
{ conditions:
"Pour plinthes existantes rÃ©utilisables et support sain. Hors remplacement, fabrication, reprise importante du mur ou finition de peinture.",
tags:
["plinthe",
"recollage",
"refixation",
"rÃ©paration"]
}),

p("SOL-PONCAGE-PARQUET",
"Sols",
"PonÃ§age dâ€™un parquet bois",
"mÂ²",
0.25,
[

  "PonÃ§age mÃ©canique du parquet",

  "Passes adaptÃ©es Ã  lâ€™Ã©tat du bois",

  "Aspiration des poussiÃ¨res",

],
{ conditions:
"Location de matÃ©riel spÃ©cifique et abrasifs Ã  chiffrer sÃ©parÃ©ment si nÃ©cessaire.",
tags:
["parquet",
"ponÃ§age"]
}),

p("SOL-FINITION-PARQUET",
"Sols",
"Application dâ€™une finition sur parquet",
"mÂ²",
0.18,
[

  "PrÃ©paration lÃ©gÃ¨re avant finition",

  "Application de la finition prÃ©vue",

  "Ã‰grenage intermÃ©diaire si nÃ©cessaire",

],
{ conditions:
"Produit et nombre de couches Ã  prÃ©ciser dans le devis.",
tags:
["parquet",
"huile",
"vernis"]
}),

p("SOL-DECOUPE-CPLX",
"Sols",
"DÃ©coupes complexes / adaptations particuliÃ¨res",
"forfait",
1.5,
[

  "RepÃ©rage des contraintes",

  "DÃ©coupes ou ajustements spÃ©cifiques prÃ©vus au devis",

], { conditions: "Forfait Ã  ajuster selon nombre dâ€™obstacles et complexitÃ©.",
rentabilite: "ðŸŸ  Ã€ adapter", tags:
["dÃ©coupe", "complexe"]
}),
// ================= CARRELAGE / FAIENCE =================
p("CAR-DEPOSE",
"Carrelage / FaÃ¯ence",
"DÃ©pose de carrelage ou faÃ¯ence",
"mÂ²",
0.5,
[

  "DÃ©pose du revÃªtement existant",

  "Grattage des rÃ©sidus non adhÃ©rents",

  "Regroupement des gravats",

],
{ conditions:
"Hors Ã©vacuation et hors remplacement complet du support.",
tags:
["carrelage",
"faÃ¯ence",
"dÃ©pose"]
}),

p("CAR-PREP",
"Carrelage / FaÃ¯ence",
"PrÃ©paration simple du support avant carrelage",
"mÂ²",
0.18,
[

  "Nettoyage et contrÃ´le du support",

  "Reprises localisÃ©es courantes",

  "DÃ©poussiÃ©rage avant pose",

],
{ conditions:
"Hors ragrÃ©age important ou reprise complÃ¨te du support.",
tags:
["carrelage",
"support"]
}),

p("CAR-SOL",
"Carrelage / FaÃ¯ence",
"Pose de carrelage au sol",
"mÂ²",
0.55,
[

  "Implantation et calepinage courant",

  "Pose collÃ©e du carrelage",

  "DÃ©coupes et ajustements courants",

],
{ conditions:
"Support prÃªt. Hors calepinage complexe et grands formats difficiles.",
tags:
["carrelage",
"sol"]
}),

p("CAR-COMPLEXE",
"Carrelage / FaÃ¯ence",
"Pose de carrelage avec calepinage complexe",
"mÂ²",
0.85,
[

  "Ã‰tude et implantation du calepinage",

  "Pose du revÃªtement",

  "DÃ©coupes et ajustements complexes",

],
{ conditions:
"Motifs, diagonales, nombreux angles ou contraintes particuliÃ¨res.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["carrelage",
"diagonale",
"calepinage"]
}),

p("CAR-FAIENCE",
"Carrelage / FaÃ¯ence",
"Pose de faÃ¯ence murale",
"mÂ²",
0.65,
[

  "Implantation et calepinage courant",

  "Pose collÃ©e de la faÃ¯ence",

  "DÃ©coupes et finitions courantes",

],
{ conditions:
"Hors Ã©tanchÃ©itÃ© sous carrelage et hors reprise importante du support.",
tags:
["faÃ¯ence",
"mur"]
}),

p("CAR-JOINT",
"Carrelage / FaÃ¯ence",
"RÃ©alisation des joints de carrelage / faÃ¯ence",
"mÂ²",
0.15,
[

  "PrÃ©paration et nettoyage des joints",

  "Application du mortier de jointoiement",

  "Nettoyage des parements",

],
{ tags:
["joint",
"carrelage",
"faÃ¯ence"]
}),

p("CAR-ETANCH",
"Carrelage / FaÃ¯ence",
"Protection Ã  lâ€™eau sous carrelage",
"mÂ²",
0.25,
[

  "Application du primaire adaptÃ© au support",

  "Pose des bandes dâ€™Ã©tanchÃ©itÃ© aux points singuliers",

  "Application du systÃ¨me de protection Ã  lâ€™eau",

],
{ conditions:
"Selon prescriptions du systÃ¨me retenu et temps de sÃ©chage.",
tags:
["SPEC",
"Ã©tanchÃ©itÃ©"]
}),

p("CAR-SILICONE",
"Carrelage / FaÃ¯ence",
"RÃ©alisation de joints silicone de finition",
"ml",
0.08,
[

  "PrÃ©paration et dÃ©graissage des zones concernÃ©es",

  "Application du joint silicone",

  "Lissage et nettoyage de finition",

],
{ tags:
["silicone",
"joint"]
}),

// ================= PLACO =================

p(
  "PLAC-FAUX-PLAFOND-DEPOSE",
  "Placo",
  "DÃ©pose de dalles de faux plafond dÃ©montables",
  "u",
  0.1,

    [
  "Mise en place dâ€™un accÃ¨s adaptÃ© Ã  la hauteur du plafond",
  "DÃ©pose soigneuse des dalles existantes",
  "Regroupement des dalles dÃ©posÃ©es sans dÃ©tÃ©rioration de lâ€™ossature",

  ],
  {
    conditions:
      "Pour dalle dÃ©montable sur ossature apparente existante et conservÃ©e. Hors intervention sur lâ€™ossature, lâ€™isolation, les rÃ©seaux ou les Ã©quipements prÃ©sents dans le plÃ©num.",
    tags: ["faux plafond", "plafond dÃ©montable", "dalle", "dÃ©pose"],
  }
),

p(
  "PLAC-FAUX-PLAFOND-POSE",
  "Placo",
  "Pose de dalles de faux plafond sur ossature existante",
  "u",
  0.15,
 [
  "ContrÃ´le visuel de lâ€™ossature et des emplacements",
  "PrÃ©sentation et mise en place des dalles neuves",
  "Ajustement et contrÃ´le de lâ€™alignement avec les dalles conservÃ©es",
],
  {
    conditions:
      "Pour dalle standard Ã  bord droit posÃ©e sur ossature apparente existante en bon Ã©tat. Hors fourniture, reprise dâ€™ossature et dÃ©coupe pour Ã©quipement encastrÃ©.",
    tags: [
      "faux plafond",
      "plafond dÃ©montable",
      "dalle",
      "pose",
      "remplacement",
    ],
  }
),

p(
  "PLAC-FAUX-PLAFOND-SPOT",
  "Placo",
  "DÃ©coupes de dalles de faux plafond pour spots encastrÃ©s",
  "u",
  0.35,
  [
  "RepÃ©rage et traÃ§age des emplacements des spots existants ; rÃ©alisation des dÃ©coupes circulaires dans les dalles neuves.",
  "DÃ©pose et repose des spots encastrÃ©s existants.",
  "ContrÃ´le de leur bonne tenue aprÃ¨s remise en place.",
],
  {
    conditions:
      "Pour repose du spot existant sur alimentation existante, sans crÃ©ation de point lumineux, modification du cÃ¢blage ni remplacement du luminaire.",
    tags: [
      "faux plafond",
      "dalle",
      "dÃ©coupe",
      "spot",
      "luminaire encastrÃ©",
    ],
  }
),

p(
  "PLAC-FAUX-PLAFOND-EVAC",
  "Placo",
  "Conditionnement et Ã©vacuation lÃ©gÃ¨re de dalles de faux plafond",
  "forfait",
  0.45,
  [
    "Conditionnement des dalles dÃ©posÃ©es",
    "Chargement et Ã©vacuation dâ€™une petite quantitÃ© de dÃ©chets",
    "Nettoyage courant de la zone dâ€™intervention",
  ],
  {
    conditions:
      "Forfait rÃ©servÃ© Ã  une petite quantitÃ© de dalles lÃ©gÃ¨res pouvant Ãªtre Ã©vacuÃ©e sans trajet spÃ©cifique. Pour un volume important ou une dÃ©chÃ¨terie dÃ©diÃ©e, utiliser la prestation dâ€™Ã©vacuation adaptÃ©e.",
    rentabilite: "ðŸŸ  Ã€ adapter",
    tags: [
      "faux plafond",
      "dalle",
      "dÃ©chets",
      "Ã©vacuation",
      "nettoyage",
    ],
  }
),

p("PLAC-OSSATURE",
"Placo",
"Pose dâ€™une ossature mÃ©tallique lÃ©gÃ¨re",
"mÂ²",
0.45,
[

  "TraÃ§age et implantation",

  "Pose de lâ€™ossature mÃ©tallique",

],
{ conditions:
"Travaux non structurels. Hauteur et configuration courantes.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["placo",
"ossature"]
}),

p("PLAC-PLAQUE",
"Placo",
"Pose de plaques de plÃ¢tre",
"mÂ²",
0.35,
[

  "DÃ©coupe et prÃ©sentation des plaques",

  "Pose et fixation sur support prÃ©vu",

],
{ conditions:
"Hors bandes, peinture et renforts spÃ©cifiques.",
tags:
["placo",
"BA13"]
}),

p("PLAC-DOUBLAGE",
"Placo",
"Pose dâ€™un doublage isolant lÃ©ger",
"mÂ²",
0.55,
[

  "Mise en place de lâ€™isolant prÃ©vu",

  "Pose du parement associÃ©",

],
{ conditions:
"Travaux intÃ©rieurs non structurels. Composition Ã  prÃ©ciser au devis.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["placo",
"isolant",
"doublage"]
}),

p("PLAC-BANDES",
"Placo",
"RÃ©alisation des bandes et joints",
"mÂ²",
0.4,
[

  "Pose des bandes",

  "Passes dâ€™enduit nÃ©cessaires",

  "PonÃ§age de finition courant",

],
{ conditions:
"Hors reprise de plaques mal posÃ©es et hors peinture.",
tags:
["placo",
"bandes",
"joints"]
}),

p("PLAC-REPARATION",
"Placo",
"RÃ©paration locale dâ€™une plaque de plÃ¢tre",
"u",
2,
[
  "DÃ©coupe de la zone endommagÃ©e si nÃ©cessaire ; mise en place dâ€™un renfort lÃ©ger.",
  "Pose de la piÃ¨ce de rÃ©paration.",
  "Reprise locale des joints.",
], { conditions: "Petite rÃ©paration non structurelle. Taille Ã  prÃ©ciser au devis.",
tags: ["placo",
"rÃ©paration"] }),
// ================= PEINTURE =================
p("PEINT-PROT",
"Peinture",
"Protection et prÃ©paration du chantier peinture",
"forfait",
1.5,
[

  "Protection des sols, Ã©quipements et zones conservÃ©es",

  "Mise en place du chantier peinture",

],
{ tags:
["peinture",
"protection"]
}),

p("PEINT-PREP-LEG",
"Peinture",
"PrÃ©paration lÃ©gÃ¨re dâ€™un support avant peinture",
"mÂ²",
0.1,
[

  "Grattage lÃ©ger des parties non adhÃ©rentes",

  "Rebouchages ponctuels",

  "PonÃ§age et dÃ©poussiÃ©rage",

],
{ conditions:
"Pour support globalement sain.",
tags:
["peinture",
"prÃ©paration"]
}),

p("PEINT-PREP-RENF",
"Peinture",
"PrÃ©paration renforcÃ©e / reprise dâ€™un support",
"mÂ²",
0.35,
[

  "Grattage des parties non adhÃ©rentes",

  "Rebouchage et reprise des dÃ©fauts",

  "PonÃ§age et dÃ©poussiÃ©rage avant finition",

],
{ conditions:
"Hors reprise structurelle ou traitement de la cause dâ€™une infiltration active.",
tags:
["peinture",
"reprise",
"enduit"]
}),

p("PEINT-RATISSAGE",
"Peinture",
"Ratissage complet et ponÃ§age",
"mÂ²",
0.4,
[

  "Application dâ€™un enduit de ratissage",

  "PonÃ§age aprÃ¨s sÃ©chage",

  "DÃ©poussiÃ©rage avant mise en peinture",

],
{ tags:
["ratissage",
"enduit",
"ponÃ§age"]
}),

p("PEINT-PRIMAIRE",
"Peinture",
"Application dâ€™un primaire dâ€™accrochage",
"mÂ²",
0.08,
[

  "PrÃ©paration lÃ©gÃ¨re du support",

  "Application du primaire adaptÃ©",

],
{ conditions:
"Produit Ã  adapter Ã  la nature du support.",
tags:
["primaire",
"accrochage"]
}),

p("PEINT-ISOLANT",
"Peinture",
"Application dâ€™un primaire isolant / bloqueur de taches",
"mÂ²",
0.12,
[

  "PrÃ©paration locale du support",

  "Application du primaire isolant adaptÃ©",

  "Blocage des taches ou remontÃ©es compatibles avec le produit retenu",

],
{ conditions:
"Hors traitement de la cause dâ€™une humiditÃ© ou infiltration active.",
tags:
["primaire",
"tache",
"isolant"]
}),

p(
  "PEINT-FACADE-PREP-LEG",
  "Peinture",
  "Nettoyage et prÃ©paration lÃ©gÃ¨re dâ€™une faÃ§ade",
  "mÂ²",
  0.1,
  [
    "Brossage et nettoyage courant du support extÃ©rieur",
    "Grattage localisÃ© des parties non adhÃ©rentes",
    "DÃ©poussiÃ©rage et prÃ©paration avant mise en peinture",
  ],
  {
    conditions:
      "Pour faÃ§ade globalement saine et accessible. Hors nettoyage haute pression, traitement curatif important des mousses, rÃ©paration de fissures, reprise dâ€™enduit et traitement dâ€™une humiditÃ© active.",
    tags: [
      "peinture",
      "faÃ§ade",
      "mur extÃ©rieur",
      "crÃ©pi",
      "nettoyage",
      "prÃ©paration",
    ],
  }
),

p(
  "PEINT-EXT-NET-HP",
  "Peinture",
  "Nettoyage haute pression dâ€™un support maÃ§onnÃ© extÃ©rieur",
  "mÂ²",
  0.1,
  [
  "Protection courante des Ã©lÃ©ments situÃ©s Ã  proximitÃ© ; nettoyage Ã  haute pression adaptÃ© Ã  la rÃ©sistance du support.",
  "Ã‰limination des salissures, dÃ©pÃ´ts et parties faiblement adhÃ©rentes.",
  "RinÃ§age et contrÃ´le visuel du support avant sÃ©chage.",
],
  {
    conditions:
      "Pour support maÃ§onnÃ© extÃ©rieur sain, accessible et compatible avec un nettoyage haute pression. Hors traitement curatif important des mousses, rÃ©paration de fissures, reprise dâ€™enduit, rÃ©cupÃ©ration des eaux souillÃ©es et traitement dâ€™une humiditÃ© active. Mise en peinture rÃ©alisÃ©e aprÃ¨s sÃ©chage suffisant du support.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "peinture",
      "extÃ©rieur",
      "faÃ§ade",
      "murette",
      "mur extÃ©rieur",
      "nettoyage haute pression",
      "prÃ©paration",
    ],
  }
),

p(
  "PEINT-FACADE-1C",
  "Peinture",
  "Mise en peinture dâ€™une faÃ§ade - 1 couche",
  "mÂ²",
  0.15,
  [
  "Application dâ€™une couche de peinture extÃ©rieure adaptÃ©e sur support prÃ©parÃ© ; rÃ©alisation des rÃ©champis autour des Ã©lÃ©ments conservÃ©s.",
  "Mise en peinture des faces, dessus et retours compris dans la surface indiquÃ©e.",
  "ContrÃ´le et finitions courantes.",
],
  {
    conditions:
      "Support sec, sain et prÃªt Ã  peindre. Protection gÃ©nÃ©rale, prÃ©paration, rÃ©parations, primaire spÃ©cifique et moyen dâ€™accÃ¨s particulier comptÃ©s sÃ©parÃ©ment. Une couche supplÃ©mentaire rendue nÃ©cessaire par un changement important de teinte, une absorption irrÃ©guliÃ¨re ou un dÃ©faut dâ€™opacitÃ© sera comptÃ©e sÃ©parÃ©ment.",
    tags: [
      "peinture",
      "faÃ§ade",
      "mur extÃ©rieur",
      "crÃ©pi",
      "1 couche",
      "une couche",
    ],
  }
),

p(
  "PEINT-FACADE-2C",
  "Peinture",
  "Mise en peinture dâ€™un support maÃ§onnÃ© extÃ©rieur - 2 couches",
  "mÂ²",
  0.28,
  [
  "Application dâ€™une premiÃ¨re couche de peinture extÃ©rieure adaptÃ©e sur support prÃ©parÃ© ; respect du temps de sÃ©chage nÃ©cessaire.",
  "Application dâ€™une deuxiÃ¨me couche de peinture extÃ©rieure ; rÃ©alisation des rÃ©champis autour des Ã©lÃ©ments conservÃ©s.",
  "Mise en peinture des faces, dessus et retours compris dans la surface indiquÃ©e ; contrÃ´le et finitions courantes.",
],
  {
    conditions:
      "Support sec, sain et prÃªt Ã  peindre. Protection gÃ©nÃ©rale, nettoyage, rÃ©parations, primaire spÃ©cifique et moyen dâ€™accÃ¨s particulier comptÃ©s sÃ©parÃ©ment. Une couche supplÃ©mentaire rendue nÃ©cessaire par un changement important de teinte, une absorption irrÃ©guliÃ¨re ou un dÃ©faut dâ€™opacitÃ© sera comptÃ©e sÃ©parÃ©ment.",
    tags: [
      "peinture",
      "extÃ©rieur",
      "faÃ§ade",
      "murette",
      "mur extÃ©rieur",
      "crÃ©pi",
      "2 couches",
      "deux couches",
    ],
  }
),

p(
  "PEINT-MURS",
  "Peinture",
  "Mise en peinture des murs - 1 couche",
  "mÂ²",
  0.15,
  [
    "Application dâ€™une couche de peinture murale sur support prÃ©parÃ©",
    "RÃ©alisation des rÃ©champis",
    "ContrÃ´le et finitions courantes",
  ],
  {
    conditions:
      "Support prÃªt Ã  peindre. Protection gÃ©nÃ©rale, prÃ©paration, rÃ©parations et primaire spÃ©cifique comptÃ©s sÃ©parÃ©ment.",
    tags: [
      "peinture",
      "mur",
      "1 couche",
      "une couche",
    ],
  }
),

p(
  "PEINT-MURS-2C",
  "Peinture",
  "Mise en peinture des murs - 2 couches",
  "mÂ²",
  0.27,
  [
  "Application dâ€™une premiÃ¨re couche de peinture murale sur support prÃ©parÃ© ; respect du temps de sÃ©chage nÃ©cessaire.",
  "Application dâ€™une deuxiÃ¨me couche de peinture murale ; rÃ©alisation des rÃ©champis.",
  "ContrÃ´le et finitions courantes.",
],
  {
    conditions:
      "Support prÃªt Ã  peindre. Protection gÃ©nÃ©rale, prÃ©paration, rÃ©parations et primaire spÃ©cifique comptÃ©s sÃ©parÃ©ment.",
    tags: [
      "peinture",
      "mur",
      "2 couches",
      "deux couches",
    ],
  }
),

p(
  "PEINT-FINITION-PAILLETTES",
  "Peinture",
  "RÃ©alisation dâ€™une finition pailletÃ©e sur peinture murale",
  "mÂ²",
  0.03,
  [
    "Incorporation des paillettes dÃ©coratives dans la couche de finition.",
    "Brassage rÃ©gulier et application homogÃ¨ne sur la surface prÃ©vue.",
    "ContrÃ´le visuel et finitions courantes.",
  ],
  {
    conditions:
      "Ã€ ajouter Ã  la prestation de mise en peinture. Support prÃªt et accessible. Hors fourniture de la peinture et des paillettes, essai prÃ©alable, motif dÃ©coratif particulier et reprise complÃ¨te en cas de rendu refusÃ© aprÃ¨s validation de lâ€™Ã©chantillon.",
    tags: [
      "peinture",
      "mur",
      "paillette",
      "paillettes",
      "dorÃ©",
      "argentÃ©",
      "dÃ©coratif",
      "finition",
    ],
  }
),

p(

 "PEINT-PLAFOND", "Peinture", "Mise en peinture dâ€™un plafond - 1 couche", "mÂ²", 0.25, [

   "Application dâ€™une couche de peinture sur support prÃ©parÃ©",

   "RÃ©alisation des rÃ©champis",

   "ContrÃ´le et finitions courantes",

 ],

 {

   conditions:

     "Support prÃªt Ã  peindre. Protection gÃ©nÃ©rale, prÃ©paration, rÃ©parations, primaire spÃ©cifique et travaux en grande hauteur comptÃ©s sÃ©parÃ©ment.",

   tags: [

     "peinture",

     "plafond",

     "1 couche",

     "une couche",

   ],

 }

),

p(

 "PEINT-PLAFOND-2C", "Peinture", "Mise en peinture dâ€™un plafond - 2 couches", "mÂ²", 0.45, [
  "Application dâ€™une premiÃ¨re couche de peinture sur support prÃ©parÃ© ; respect du temps de sÃ©chage nÃ©cessaire.",
  "Application dâ€™une deuxiÃ¨me couche de peinture ; rÃ©alisation des rÃ©champis.",
  "ContrÃ´le et finitions courantes.",
],

 {

   conditions:

     "Support prÃªt Ã  peindre. Protection gÃ©nÃ©rale, prÃ©paration, rÃ©parations, primaire spÃ©cifique et travaux en grande hauteur comptÃ©s sÃ©parÃ©ment.",

   tags: [

     "peinture",

     "plafond",

     "2 couches",

     "deux couches",

   ],

 }

),

p(

 "PEINT-TOILE-PLAFOND-POS", "Peinture", "Pose dâ€™une toile de rÃ©novation au plafond", "mÂ²", 0.45, [
  "ContrÃ´le et prÃ©paration courante du support prÃªt Ã  recevoir la toile ; encollage rÃ©gulier du plafond.",
  "Pose, marouflage et ajustement de la toile de rÃ©novation ; rÃ©alisation des dÃ©coupes et raccords courants.",
  "ContrÃ´le de lâ€™adhÃ©rence et nettoyage de fin dâ€™intervention.",
],

 {

   conditions:

     "Support sain, stable et accessible. Protection gÃ©nÃ©rale, dÃ©pose dâ€™un ancien revÃªtement, prÃ©paration renforcÃ©e, traitement dâ€™une infiltration, peinture de finition et travail en grande hauteur comptÃ©s sÃ©parÃ©ment.",

   tags: [

     "peinture",

     "toile de rÃ©novation",

     "toile tissÃ©e",

     "plafond",

     "pose",

   ],

 }

),

p(

 "PEINT-VOLET-BOIS-RENOV-2C", "Peinture", "RÃ©novation et mise en peinture dâ€™un volet bois - 2 couches", "u", 3, [
  "DÃ©pose du volet et installation sur une zone de travail adaptÃ©e ; grattage et ponÃ§age des parties non adhÃ©rentes.",
  "Nettoyage et dÃ©poussiÃ©rage du support ; application dâ€™un primaire sur les parties mises Ã  nu si nÃ©cessaire.",
  "Application de deux couches de peinture extÃ©rieure sur les deux faces et les chants ; repose du volet et contrÃ´le de son fonctionnement.",
],

 {

   conditions:

     "Pour volet bois courant pouvant Ãªtre dÃ©posÃ© sans rÃ©paration de ses fixations. Hors dÃ©capage intÃ©gral, remplacement de lame ou ferrure, rÃ©paration importante du bois, fourniture de peinture et moyen dâ€™accÃ¨s spÃ©cifique.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "peinture",

     "volet bois",

     "rÃ©novation",

     "extÃ©rieur",

     "2 couches",

     "dÃ©pose repose",

   ],

 }

),

p(

 "MAC-ENCADREMENT-OUVERTURE-REP", "MaÃ§onnerie lÃ©gÃ¨re", "Reprise maÃ§onnÃ©e dâ€™un encadrement dâ€™ouverture", "ml", 1.15, [
  "Piquage et retrait des parties non adhÃ©rentes strictement nÃ©cessaires ; dÃ©poussiÃ©rage et prÃ©paration du support.",
  "Rebouchage et reprise de lâ€™encadrement au mortier adaptÃ© ; dressage des arÃªtes et raccord avec le support existant.",
  "Finition courante avant mise en peinture.",
],

 {

   conditions:

     "Pour reprise localisÃ©e autour dâ€™une porte ou dâ€™une fenÃªtre sur support maÃ§onnÃ© sain. Hors reprise structurelle, linteau, infiltration active, ravalement complet, peinture de finition et moyen dâ€™accÃ¨s spÃ©cifique.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "maÃ§onnerie",

     "encadrement",

     "tableau extÃ©rieur",

     "fenÃªtre",

     "porte",

     "mortier",

     "faÃ§ade",

   ],

 }

),

p(

 "PEINT-ENCADREMENT-EXT-2C", "Peinture", "Mise en peinture dâ€™un encadrement extÃ©rieur - 2 couches", "ml", 0.35, [
  "PrÃ©paration lÃ©gÃ¨re et dÃ©poussiÃ©rage de lâ€™encadrement ; application dâ€™une premiÃ¨re couche de peinture extÃ©rieure adaptÃ©e.",
  "Respect du temps de sÃ©chage nÃ©cessaire ; application dâ€™une deuxiÃ¨me couche de peinture.",
  "RÃ©alisation des rÃ©champis et finitions courantes.",
],

 {

   conditions:

     "Support sec, stabilisÃ© et prÃªt Ã  peindre. Protection gÃ©nÃ©rale, rÃ©paration du support, primaire spÃ©cifique, traitement dâ€™une infiltration, ravalement complet et moyen dâ€™accÃ¨s spÃ©cifique comptÃ©s sÃ©parÃ©ment.",

   tags: [

     "peinture",

     "extÃ©rieur",

     "encadrement",

     "fenÃªtre",

     "porte",

     "faÃ§ade",

     "2 couches",

   ],

 }

),

p(

 "PEINT-BOIS-SURF", "Peinture", "Mise en peinture dâ€™un support bois - 1 couche", "mÂ²", 0.22,
[
  "Ã‰grenage ou prÃ©paration lÃ©gÃ¨re du support bois ; dÃ©poussiÃ©rage du support.",
  "Application dâ€™une couche de finition.",
  "ContrÃ´le et rÃ©alisation des finitions courantes.",
],

 {

   conditions:

     "Pour une surface bois rÃ©guliÃ¨re et accessible. Hors dÃ©capage, rÃ©paration importante et primaire spÃ©cifique, Ã  compter sÃ©parÃ©ment si nÃ©cessaire.",

   tags: [

     "peinture",

     "bois",

     "support bois",

     "surface bois",

     "1 couche",

     "une couche",

   ],

 }

),

p(

 "PEINT-BOIS-SURF-2C", "Peinture", "Mise en peinture dâ€™un support bois - 2 couches", "mÂ²",
0.38, [
  "Ã‰grenage ou prÃ©paration lÃ©gÃ¨re du support bois ; dÃ©poussiÃ©rage du support.",
  "Application dâ€™une premiÃ¨re couche de finition ; Ã©grenage intermÃ©diaire si nÃ©cessaire.",
  "Application dâ€™une deuxiÃ¨me couche de finition ; contrÃ´le et rÃ©alisation des finitions courantes.",
],

 {

   conditions:

     "Pour une surface bois rÃ©guliÃ¨re et accessible. Hors dÃ©capage, rÃ©paration importante et primaire spÃ©cifique, Ã  compter sÃ©parÃ©ment si nÃ©cessaire.",

   tags: [

     "peinture",

     "bois",

     "support bois",

     "surface bois",

     "2 couches",

     "deux couches",

   ],

 }

),

p(

 "PEINT-MENUISERIE", "Peinture", "Mise en peinture dâ€™une boiserie ou menuiserie - 1 couche", "u",
1.25, [
  "PrÃ©paration lÃ©gÃ¨re et Ã©grenage de la menuiserie ; dÃ©poussiÃ©rage du support.",
  "Application dâ€™une couche de finition.",
  "RÃ©alisation des rÃ©champis et finitions courantes.",
],

 {

   conditions:

     "Pour une menuiserie courante de dimensions standard. Temps Ã  adapter selon les dimensions, le nombre de faces, les moulures, les reliefs et lâ€™Ã©tat du support. Hors dÃ©capage, rÃ©paration importante et primaire spÃ©cifique.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "peinture",

     "porte",

     "boiserie",

     "menuiserie",

     "encadrement",

     "1 couche",

     "une couche",

   ],

 }

),

p(

 "PEINT-MENUISERIE-2C", "Peinture", "Mise en peinture dâ€™une boiserie ou menuiserie - 2 couches", "u",
2.25, [
  "PrÃ©paration lÃ©gÃ¨re et Ã©grenage de la menuiserie ; dÃ©poussiÃ©rage du support.",
  "Application dâ€™une premiÃ¨re couche de finition ; Ã©grenage intermÃ©diaire si nÃ©cessaire.",
  "Application dâ€™une deuxiÃ¨me couche de finition ; rÃ©alisation des rÃ©champis et finitions courantes.",
],

 {

   conditions:

     "Pour une menuiserie courante de dimensions standard. Temps Ã  adapter selon les dimensions, le nombre de faces, les moulures, les reliefs et lâ€™Ã©tat du support. Hors dÃ©capage, rÃ©paration importante et primaire spÃ©cifique.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "peinture",

     "porte",

     "boiserie",

     "menuiserie",

     "encadrement",

     "2 couches",

     "deux couches",

   ],

 }

),

p("PEINT-ACRYLIQUE",
"Peinture",
"RÃ©alisation dâ€™un joint acrylique de finition",
"ml",
0.08,
[

  "PrÃ©paration des supports",

  "Application et lissage du joint acrylique",

], { tags: ["joint",
"acrylique"] }),
// ================= DECO =================
p("DECO-DEPOSE-MURAL",
"DÃ©co",
"DÃ©pose dâ€™un revÃªtement mural",
"mÂ²",
0.18,
[

  "DÃ©pose du revÃªtement mural existant",

  "Grattage lÃ©ger des rÃ©sidus",

  "Nettoyage simple du support",

],
{ conditions:
"Hors colle trÃ¨s tenace et hors reprise lourde du support.",
tags:
["papier peint",
"revÃªtement mural",
"dÃ©pose"]
}),

p("DECO-POSE-MURAL",
"DÃ©co",
"Pose dâ€™un revÃªtement mural",
"mÂ²",
0.3,
[
  "PrÃ©paration simple du support ; application de la colle si nÃ©cessaire.",
  "Pose du revÃªtement.",
  "DÃ©coupes et ajustements courants.",
],
{ conditions:
"Motifs Ã  raccord ou revÃªtement technique : temps Ã  adapter.",
tags:
["papier peint",
"revÃªtement mural"]
}),

p("DECO-PREP-LEG",
"DÃ©co",
"PrÃ©paration lÃ©gÃ¨re dâ€™un support mural",
"mÂ²",
0.1,
[

  "Rebouchages ponctuels",

  "PonÃ§age et dÃ©poussiÃ©rage",

],
{ tags:
["mur",
"prÃ©paration"]
}),

p("DECO-PREP-RENF",
"DÃ©co",
"PrÃ©paration renforcÃ©e dâ€™un support mural",
"mÂ²",
0.35,
[

  "Grattage et reprise des dÃ©fauts",

  "Enduit localisÃ© ou gÃ©nÃ©ralisÃ© selon Ã©tat",

  "PonÃ§age et dÃ©poussiÃ©rage",

],
{ tags:
["mur",
"prÃ©paration",
"enduit"]
}),
// ================= ELECTRICITE =================
  p("ELEC-DIAG",
"Ã‰lectricitÃ©",
"Diagnostic simple dâ€™un Ã©quipement Ã©lectrique",
"forfait",
1.5,
[

  "ContrÃ´le visuel de lâ€™Ã©quipement et de ses connexions accessibles",

  "Essais simples de fonctionnement",

  "Identification dâ€™une anomalie apparente",

],
{ conditions:
"Ne remplace pas un diagnostic rÃ©glementaire ni une recherche spÃ©cialisÃ©e sur circuit.",
tags:
["diagnostic",
"Ã©lectrique"]
}),

p("ELEC-H",
"Ã‰lectricitÃ©",
"Intervention Ã©lectrique courante",
"h",
1,
[

  "Mise hors tension de la zone concernÃ©e",

  "Intervention sur appareillage existant",

  "Raccordement courant et essai",

],
{ conditions:
"Sur installation existante, sans crÃ©ation de circuit ni modification du tableau.",
tags:
["Ã©lectricitÃ©",
"main d'Å“uvre"]
}),

p("ELEC-PRISE",
"Ã‰lectricitÃ©",
"Remplacement dâ€™une prise existante",
"u",
0.5,
[
  "Mise hors tension ; dÃ©pose de la prise existante.",
  "Pose et raccordement de la nouvelle prise.",
  "Essai de fonctionnement.",
],
{ conditions:
"Sur cÃ¢blage existant en Ã©tat et conforme Ã  lâ€™intervention prÃ©vue.",
tags:
["prise"]
}),

p("ELEC-INT",
"Ã‰lectricitÃ©",
"Remplacement dâ€™un interrupteur existant",
"u",
0.5,
[
  "Mise hors tension ; dÃ©pose de lâ€™interrupteur existant.",
  "Pose et raccordement du nouvel appareillage.",
  "Essai de fonctionnement.",
],
{ tags:
["interrupteur"]
}),

p("ELEC-APP",
"Ã‰lectricitÃ©",
"Remplacement dâ€™un appareillage Ã©lectrique existant",
"u",
0.5,
[
  "Mise hors tension ; dÃ©pose de lâ€™appareillage existant.",
  "Pose et raccordement de lâ€™appareillage prÃ©vu.",
  "Essai de fonctionnement.",
],
{ conditions:
"Type dâ€™appareillage Ã  prÃ©ciser au devis.",
tags:
["appareillage"]
}),

p("ELEC-LUM",
"Ã‰lectricitÃ©",
"Pose / remplacement dâ€™un luminaire",
"u",
0.75,
[
  "DÃ©pose du luminaire existant si prÃ©vue ; montage et fixation du nouveau luminaire.",
  "Raccordement sur sortie existante.",
  "Essai de fonctionnement.",
],
{ conditions:
"Hors crÃ©ation de point lumineux ou modification du circuit.",
tags:
["luminaire"]
}),

p("ELEC-SORTIE",
"Ã‰lectricitÃ©",
"Remplacement dâ€™une sortie de cÃ¢ble / connexion existante",
"u",
0.5,
[

  "Mise hors tension",

  "Remplacement ou reprise simple de la connexion",

  "ContrÃ´le et essai",

],
{ conditions:
"Sur cÃ¢blage existant accessible.",
tags:
["sortie de cÃ¢ble",
"connexion"]
}),
// ================= CHAUFFAGE =================
p("CHAU-RADIATEUR",
"Chauffage",
"Pose / remplacement dâ€™un radiateur Ã©lectrique",
"u",
1.25,
[
  "DÃ©pose de lâ€™ancien radiateur si prÃ©vue ; implantation et fixation du nouvel appareil.",
  "Raccordement sur alimentation existante.",
  "RÃ©glage et essai de fonctionnement.",
],
{ conditions:
"Hors crÃ©ation ou modification du circuit Ã©lectrique et hors renfort important du support.",
tags:
["radiateur",
"chauffage"]
}),
// ================= VENTILATION =================
  p("VMC-NET",
"Ventilation",
"Nettoyage / entretien dâ€™une bouche de ventilation", "u",
0.35, [

  "DÃ©pose accessible de la bouche si nÃ©cessaire",

  "Nettoyage de lâ€™Ã©lÃ©ment",

  "Repose et contrÃ´le simple",

],
{ tags:
["VMC",
"nettoyage"]
}),

p("VMC-DIAG",
"Ventilation",
"Diagnostic simple dâ€™une ventilation existante",
"forfait",
1.5,
[

  "ContrÃ´le visuel des Ã©lÃ©ments accessibles",

  "Essai simple de fonctionnement",

  "Identification des anomalies apparentes",

],
{ conditions:
"Hors mesure rÃ©glementaire de dÃ©bit et Ã©tude de dimensionnement.",
tags:
["VMC",
"diagnostic"]
}),

p("VMC-GROUPE",
"Ventilation",
"Remplacement dâ€™un groupe VMC existant",
"u",
2,
[
  "DÃ©pose du groupe existant ; pose du nouveau groupe sur rÃ©seau existant.",
  "Raccordements accessibles.",
  "Essai de fonctionnement.",
],
{ conditions:
"Hors crÃ©ation ou modification importante du rÃ©seau de gaines.",
tags:
["VMC",
"groupe"]
}),

p("VMC-BOUCHE",
"Ventilation",
"Remplacement dâ€™une bouche de ventilation",
"u",
0.5,
[

  "DÃ©pose de la bouche existante",

  "Nettoyage simple de la zone",

  "Pose de la nouvelle bouche",

],
{ tags:
["VMC",
"bouche"]
}),

p("VMC-EXTRACTEUR",
"Ventilation",
"Pose dâ€™un extracteur dâ€™air individuel",
"u",
2,
[
  "Implantation et fixation de lâ€™extracteur ; raccordement au conduit de rejet existant ou crÃ©Ã© sÃ©parÃ©ment.",
  "Raccordement sur alimentation Ã©lectrique existante accessible.",
  "Essai de fonctionnement et finitions courantes.",
], { conditions: "Hors crÃ©ation de circuit Ã©lectrique, modification du tableau et rÃ©seau de gaines. Appareil adaptÃ© au volume de sÃ©curitÃ© de la piÃ¨ce humide.", rentabilite: "ðŸŸ  Ã€ contrÃ´ler", tags:
["ventilation", "extracteur",
"aÃ©rateur", "salle de bain"] }),

p("VMC-TRAVERSEE-MUR",
"Ventilation",
"CrÃ©ation dâ€™une traversÃ©e murale pour ventilation",
"u",
3.5,
[
  "RepÃ©rage et contrÃ´le de la zone de percement ; percement du mur au diamÃ¨tre prÃ©vu.",
  "Mise en place du conduit de traversÃ©e.",
  "Calfeutrement et finitions courantes autour du passage.",
],
{ conditions:
"Pour mur non porteur en matÃ©riau courant, accessible sur les deux faces et sans rÃ©seau dans la zone. Hors bÃ©ton armÃ©, pierre, amiante, travail en hauteur et reprise importante de faÃ§ade.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["ventilation",
"traversÃ©e murale",
"percement",
"brique"]
}),

p("VMC-ENTREE-AIR",
"Ventilation",
"Pose dâ€™une entrÃ©e dâ€™air simple",
"u",
0.5,
[
  "RepÃ©rage et traÃ§age de lâ€™emplacement ; dÃ©coupe courante du support accessible.",
  "Pose et fixation de lâ€™entrÃ©e dâ€™air.",
  "ContrÃ´le de lâ€™ouverture et nettoyage de la zone.",
],
{ conditions:
"Sur coffre de volet roulant ou menuiserie compatible et accessible. Dimensionnement, rÃ©servation et absence dâ€™obstacle Ã  contrÃ´ler avant intervention.",
tags:
["ventilation",
"entrÃ©e dâ€™air",
"hygrorÃ©glable",
"coffre volet roulant"]
}),

p("VMC-GRILLE-EXT",
"Ventilation",
"Pose dâ€™une grille extÃ©rieure de ventilation",
"u",
0.5,
[
  "PrÃ©sentation et ajustement de la grille ; fixation sur le support extÃ©rieur.",
  "Calfeutrement pÃ©riphÃ©rique courant.",
  "ContrÃ´le du passage dâ€™air.",
],
{ conditions:
"AccÃ¨s extÃ©rieur simple et sÃ©curisÃ©. Hors travail en hauteur ou reprise importante de faÃ§ade.",
tags:
["ventilation",
"grille extÃ©rieure",
"rejet extÃ©rieur"]
}),
// ================= PLOMBERIE / SANITAIRES =================
p("PLOMB-H",
"Plomberie / Sanitaires",
"Intervention de plomberie courante",
"h",
1,
[

  "Intervention sur Ã©lÃ©ments accessibles",

  "Raccordements courants prÃ©vus au devis",

  "ContrÃ´le dâ€™Ã©tanchÃ©itÃ©",

],
{ conditions:
"Sans crÃ©ation de rÃ©seau encastrÃ© ni modification lourde de lâ€™installation.",
tags:
["plomberie",
"main d'Å“uvre"]
}),

   p("PLOMB-RACC",
"Plomberie / Sanitaires",
"Raccordement sanitaire sur attentes existantes", "u",
1.5, [

  "Adaptation simple des raccordements accessibles",

  "Raccordement de lâ€™Ã©quipement prÃ©vu",

  "Essai dâ€™Ã©coulement et contrÃ´le dâ€™Ã©tanchÃ©itÃ©",

],
{ conditions:
"Sans crÃ©ation de rÃ©seau encastrÃ©.",
tags:
["raccordement",
"sanitaire"]
}),

p("PLOMB-FUITE-RECH",
"Plomberie / Sanitaires",
"Recherche de fuite apparente",
"forfait",
2,
[

  "ContrÃ´le visuel des Ã©lÃ©ments accessibles",

  "Recherche de lâ€™origine apparente de la fuite",

  "Compte rendu de lâ€™intervention",

],
{ conditions:
"Hors recherche destructive, camÃ©ra, rÃ©seau encastrÃ© ou diagnostic spÃ©cialisÃ©.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["fuite",
"recherche"]
}),

p("PLOMB-FUITE-REP",
"Plomberie / Sanitaires",
"RÃ©paration simple dâ€™une fuite accessible",
"forfait",
2,
[

  "Mise hors eau locale si nÃ©cessaire",

  "RÃ©paration ou remplacement simple de lâ€™Ã©lÃ©ment accessible",

  "Remise en eau et contrÃ´le dâ€™Ã©tanchÃ©itÃ©",

], { conditions: "Hors rÃ©seau encastrÃ© et hors remplacement important de canalisation.",
tags: ["fuite",
"rÃ©paration"] }),

p("PLOMB-ROBINET",
"Plomberie / Sanitaires",
"Pose / remplacement dâ€™un robinet ou mitigeur",
"u",
1.25,
[
  "DÃ©pose de lâ€™ancienne robinetterie si prÃ©vue ; pose de la nouvelle robinetterie.",
  "Raccordement sur arrivÃ©es existantes accessibles.",
  "ContrÃ´le dâ€™Ã©tanchÃ©itÃ©.",
],
{ conditions:
"Hors modification des alimentations encastrÃ©es.",
tags:
["robinet",
"mitigeur"]
}),

p("PLOMB-SIPHON",
"Plomberie / Sanitaires",
"Remplacement dâ€™un siphon / vidage",
"u",
0.75,
[

  "DÃ©pose du siphon ou vidage existant",

  "Pose et raccordement du nouvel Ã©lÃ©ment",

  "Essai dâ€™Ã©coulement et contrÃ´le dâ€™Ã©tanchÃ©itÃ©",

], { tags: ["siphon",
"vidage"] }),

p("PLOMB-DEPOSE-EQP",
"Plomberie / Sanitaires",
"DÃ©pose dâ€™un Ã©quipement sanitaire",
"u",
1.5,
[

  "DÃ©connexion des raccordements accessibles",

  "DÃ©pose de lâ€™Ã©quipement",

  "Mise en sÃ©curitÃ© provisoire si nÃ©cessaire",

], { conditions: "Hors Ã©vacuation en dÃ©chÃ¨terie.", tags:
["sanitaire", "dÃ©pose"]
}),

p("PLOMB-VASQUE",
"Plomberie / Sanitaires",
"Pose / remplacement dâ€™un lavabo ou dâ€™une vasque",
"u",
2.5,
[

  "DÃ©pose de lâ€™ancien Ã©quipement si prÃ©vue",

  "Mise en place et fixation",

  "Raccordement du vidage et des Ã©lÃ©ments accessibles",

],
{ tags:
["lavabo",
"vasque"]
}),

p("PLOMB-MEUBLE-VASQUE",
"Plomberie / Sanitaires",
"Pose / remplacement dâ€™un meuble vasque",
"u",
4,
[
  "Montage et implantation du meuble ; fixation au support.",
  "Pose de la vasque.",
  "Raccordements accessibles et finitions courantes.",
],
{ conditions:
"Hors modification lourde de plomberie et hors renfort structurel du support.",
tags:
["meuble vasque",
"lavabo"]
}),

p("PLOMB-MEUBLE-VASQUE-REEMPLOI",
"Plomberie / Sanitaires",
"Remplacement dâ€™un meuble sous-vasque avec rÃ©emploi des Ã©quipements",
"u",
5,
[
  "DÃ©connexion et dÃ©pose soigneuse de la vasque et de la robinetterie existantes ; dÃ©pose de lâ€™ancien meuble et montage du nouveau meuble.",
  "RÃ©installation de la vasque et de la robinetterie conservÃ©es.",
  "Fixation, raccordements accessibles et contrÃ´le dâ€™Ã©tanchÃ©itÃ©.",
],
{ conditions:
"Sous rÃ©serve du bon Ã©tat, de la compatibilitÃ© et des dimensions de la vasque et de la robinetterie conservÃ©es. Hors modification lourde de plomberie et renfort structurel.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["meuble vasque",
"rÃ©emploi",
"vasque",
"robinet"]
}),

p("PLOMB-POMME-HAUTE",
"Plomberie / Sanitaires",
"Pose dâ€™une pomme haute de douche",
"u",
1,
[
  "ContrÃ´le de la compatibilitÃ© avec lâ€™installation existante ; montage et fixation de la pomme haute et de son support.",
  "Raccordement sur la robinetterie existante accessible.",
  "Essai de fonctionnement et contrÃ´le dâ€™Ã©tanchÃ©itÃ©.",
],
{ conditions:
"Sur installation existante compatible, sans modification encastrÃ©e des alimentations.",
tags:
["douche",
"pomme haute",
"pomme de tÃªte"]
}),

 p(

 "PLOMB-WC", "Plomberie / Sanitaires",
"Remplacement Ã  neuf dâ€™un WC posÃ© au sol", "u",
2.5, [
  "Fermeture de lâ€™alimentation et vidange du rÃ©servoir ; dÃ©connexion et dÃ©pose de lâ€™ancien WC ; nettoyage et prÃ©paration courante de lâ€™emplacement.",
  "Mise en place et fixation du nouveau WC ; raccordement sur les attentes existantes accessibles.",
  "Remise en eau et essai de la chasse ; contrÃ´le dâ€™Ã©tanchÃ©itÃ© et de fonctionnement.",
],

 {

   conditions:

     "Pour remplacement par un WC posÃ© au sol compatible avec les raccordements existants. Hors modification des rÃ©seaux, rÃ©paration du support et Ã©vacuation de lâ€™ancien Ã©quipement.",

   tags: [

     "WC",

     "toilettes",

     "remplacement",

     "sanitaire",

   ],

 }

),

p(

 "PLOMB-WC-DEPOSE-REPOSE", "Plomberie / Sanitaires",
"DÃ©pose et repose dâ€™un WC existant", "u", 3,
[
  "Fermeture de lâ€™alimentation et vidange du rÃ©servoir ; dÃ©connexion et dÃ©pose soigneuse du WC existant ; stockage et protection temporaire de lâ€™Ã©quipement.",
  "Nettoyage courant de la zone de raccordement ; repose et fixation du WC conservÃ©.",
  "Raccordement sur les attentes existantes ; remise en eau et contrÃ´le dâ€™Ã©tanchÃ©itÃ© et de fonctionnement.",
],

 {

   conditions:

     "Sous rÃ©serve du bon Ã©tat du WC, des fixations et des raccordements conservÃ©s. Intervention sur le support, piÃ¨ces de remplacement et dÃ©placement supplÃ©mentaire comptÃ©s sÃ©parÃ©ment.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "WC",

     "toilettes",

     "dÃ©pose",

     "repose",

     "rÃ©emploi",

   ],

 }

),

p("PLOMB-WC-MECA",
"Plomberie / Sanitaires",
"Remplacement dâ€™un mÃ©canisme de WC",
"u",
1,
[

  "DÃ©pose du mÃ©canisme existant",

  "Pose et rÃ©glage du nouveau mÃ©canisme",

  "Essai et contrÃ´le dâ€™Ã©tanchÃ©itÃ©",

],
{ tags:
["WC",
"mÃ©canisme"]
}),

p("PLOMB-REC-DCH",
"Plomberie / Sanitaires",
"Pose dâ€™un receveur de douche",
"u",
7,
[
  "PrÃ©paration et contrÃ´le de lâ€™emplacement ; pose et calage du receveur.",
  "Pose de la bonde et raccordement accessible.",
  "ContrÃ´le de lâ€™Ã©coulement et finitions sanitaires.",
],
{ conditions:
"Dimensions, modÃ¨le et Ã©tat du support Ã  prÃ©ciser au devis. Hors crÃ©ation complÃ¨te du rÃ©seau.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["receveur",
"douche"]
}),

p("PLOMB-PAROI-DEP",
"Plomberie / Sanitaires",
"DÃ©pose dâ€™une paroi ou cabine de douche",
"u",
1.5,
[

  "DÃ©pose soigneuse de la paroi ou cabine",

  "Regroupement ou stockage des Ã©lÃ©ments selon devis",

],
{ conditions:
"RÃ©emploi dâ€™un Ã©quipement ancien sans garantie sur sa tenue au dÃ©montage.",
tags:
["paroi",
"douche",
"dÃ©pose"]
}),

p("PLOMB-PAROI-POS",
"Plomberie / Sanitaires",
"Pose dâ€™une paroi ou cabine de douche",
"u",
3,
[

  "Implantation et fixation",

  "RÃ©glage des profilÃ©s et ouvrants",

  "RÃ©alisation des joints sanitaires pÃ©riphÃ©riques",

],
{ conditions:
"Support adaptÃ© et modÃ¨le compatible avec lâ€™implantation.",
tags:
["paroi",
"douche"]
}),
// ================= CUISINE =================
p("CUI-MEUBLE-MONT",
"Cuisine",
"Montage dâ€™un meuble de cuisine",
"u",
1.25,
[

  "Assemblage du meuble",

  "RÃ©glage des Ã©lÃ©ments courants",

  "PrÃ©paration pour la pose",

],
{ tags:
["cuisine",
"meuble",
"montage"]
}),

p("CUI-MEUBLE-POS",
"Cuisine",
"Pose / fixation dâ€™un meuble de cuisine",
"u",
1,
[

  "Implantation et mise Ã  niveau",

  "Fixation au support",

  "RÃ©glage des portes ou faÃ§ades",

],
{ conditions:
"Support apte Ã  recevoir les fixations prÃ©vues.",
tags:
["cuisine",
"meuble",
"pose"]
}),

p("CUI-PLAN-DEPOSE",
"Cuisine",
"DÃ©pose dâ€™un plan de travail existant",
"ml",
0.4,
[
  "DÃ©connexion des Ã©quipements accessibles si prÃ©vue au devis ; dÃ©coupe des joints et dÃ©pose soigneuse du plan de travail.",
  "PrÃ©servation des meubles et revÃªtements muraux conservÃ©s.",
  "Regroupement des Ã©lÃ©ments dÃ©posÃ©s.",
],
{ conditions:
"Sous rÃ©serve dâ€™une dÃ©pose possible sans dÃ©tÃ©riorer la crÃ©dence ou les supports conservÃ©s. Hors Ã©vacuation en dÃ©chÃ¨terie et rÃ©paration des dommages cachÃ©s.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["plan de travail",
"dÃ©pose",
"crÃ©dence conservÃ©e"]
}),

p("CUI-PLAN",
"Cuisine",
"Pose dâ€™un plan de travail",
"ml",
0.75,
[
  "Mesure et prÃ©sentation du plan ; ajustements et mise Ã  niveau.",
  "Fixation sur meubles existants ou posÃ©s.",
  "Finitions courantes.",
],
{ conditions:
"DÃ©coupes dâ€™Ã©vier/plaque comptÃ©es sÃ©parÃ©ment si nÃ©cessaires.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["plan de travail"]
}),

p("CUI-DECOUPE",
"Cuisine",
"DÃ©coupe dâ€™un plan de travail",
"u",
1.25,
[

  "TraÃ§age de la dÃ©coupe",

  "DÃ©coupe pour lâ€™Ã©quipement prÃ©vu",

  "Protection et finition du chant dÃ©coupÃ© si nÃ©cessaire",

],
{ conditions:
"MatÃ©riau courant. Hors pierre, quartz ou matÃ©riaux nÃ©cessitant un atelier spÃ©cialisÃ©.",
tags:
["plan de travail",
"dÃ©coupe"]
}),

p("CUI-CREDENCE",
"Cuisine",
"Pose dâ€™une crÃ©dence",
"mÂ²",
0.55,
[
  "Implantation et prise de mesures ; dÃ©coupes courantes.",
  "Pose de la crÃ©dence.",
  "Finitions pÃ©riphÃ©riques.",
],
{ conditions:
"MatÃ©riau et systÃ¨me de pose Ã  prÃ©ciser au devis.",
tags:
["crÃ©dence"]
}),

p("CUI-EVIER-DEPOSE-REPOSE",
"Cuisine",
"DÃ©pose et repose dâ€™un Ã©vier existant",
"u",
3,
[
  "DÃ©connexion et dÃ©pose soigneuse de lâ€™Ã©vier et de la robinetterie ; nettoyage des Ã©lÃ©ments conservÃ©s et prÃ©paration de la repose.",
  "RÃ©installation, fixation et rÃ©alisation de lâ€™Ã©tanchÃ©itÃ© pÃ©riphÃ©rique.",
  "Raccordement du vidage et de la robinetterie puis contrÃ´le dâ€™Ã©tanchÃ©itÃ©.",
],
{ conditions:
"Sous rÃ©serve du bon Ã©tat et de la compatibilitÃ© des Ã©quipements conservÃ©s avec le nouveau plan de travail. DÃ©coupe du plan comptÃ©e sÃ©parÃ©ment.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["Ã©vier",
"dÃ©pose",
"repose",
"rÃ©emploi",
"robinetterie"]
}),

p("CUI-EVIER",
"Cuisine",
"Pose dâ€™un Ã©vier",
"u",
1.5,
[
  "Mise en place de lâ€™Ã©vier ; fixation et Ã©tanchÃ©itÃ© pÃ©riphÃ©rique.",
  "Raccordement du vidage accessible.",
  "ContrÃ´le dâ€™Ã©tanchÃ©itÃ©.",
],
{ conditions:
"DÃ©coupe du plan de travail comptÃ©e sÃ©parÃ©ment si nÃ©cessaire.",
tags:
["Ã©vier"]
}),

p("CUI-MITIGEUR",
"Cuisine",
"Pose dâ€™un mitigeur de cuisine",
"u",
1,
[

  "Pose de la robinetterie",

  "Raccordement sur alimentations existantes accessibles",

  "ContrÃ´le dâ€™Ã©tanchÃ©itÃ©",

],
{ tags:
["mitigeur",
"cuisine"]
}),

p("CUI-ENCASTRABLE",
"Cuisine",
"Pose dâ€™un Ã©quipement encastrable",
"u",
0.75,
[
  "Mise en place de lâ€™Ã©quipement ; fixation selon le systÃ¨me prÃ©vu.",
  "Raccordement standard sur attentes existantes si prÃ©vu.",
  "Essai de fonctionnement.",
],
{ conditions:
"Hors modification de meuble importante, plomberie ou circuit Ã©lectrique.",
tags:
["four",
"lave vaisselle",
"encastrable"]
}),

p("CUI-AJUST",
"Cuisine",
"Ajustement / finition de cuisine",
"h",
1,
[

  "RÃ©glages des Ã©lÃ©ments concernÃ©s",

  "Petits ajustements et finitions prÃ©vus au devis",

], { tags: ["cuisine",
"rÃ©glage", "finition"]
}),
// ================= EQUIPEMENT =================
p("EQP-DEPOSE",
"Ã‰quipement",
"DÃ©pose dâ€™un appareil existant",
"u",
0.5,
[

  "DÃ©connexion accessible de lâ€™appareil",

  "DÃ©pose et dÃ©placement dans la zone prÃ©vue",

],
{ conditions:
"Hors Ã©vacuation en dÃ©chÃ¨terie.",
tags:
["Ã©quipement",
"dÃ©pose"]
}),

p("EQP-ELECTRO",
"Ã‰quipement",
"Pose / remplacement dâ€™un appareil Ã©lectromÃ©nager",
"u",
0.75,
[

  "Mise en place et mise Ã  niveau",

  "Raccordement standard sur attentes existantes si prÃ©vu",

  "Essai de fonctionnement",

], { conditions: "Hors modification plomberie, Ã©lectricitÃ© ou meuble.", tags:
["Ã©lectromÃ©nager"] }),

// ================= BRICOLAGE / MENUISERIE LÃ‰GÃˆRE =================

p("BRI-H",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Intervention de bricolage courante",
"h",
1,
[

  "PrÃ©paration de lâ€™intervention",

  "RÃ©alisation du petit bricolage prÃ©vu",

  "ContrÃ´le et nettoyage sommaire",

],
{ conditions:
"Pour interventions simples relevant du multiservice.",
tags:
["bricolage"]
}),

p("BRI-MENUISERIE-H",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Petite rÃ©paration de menuiserie",
"h",
1,
[

  "Diagnostic simple de la rÃ©paration",

  "Reprise ou ajustement courant",

  "ContrÃ´le final",

], { conditions: "Hors rÃ©paration structurelle ou fabrication complexe.", tags:
["menuiserie", "rÃ©paration"]
}),

p("BRI-MEUBLE",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Montage dâ€™un meuble",
"u",
0.75,
[

  "DÃ©ballage et contrÃ´le des Ã©lÃ©ments",

  "Assemblage du meuble",

  "RÃ©glages courants",

],
{ conditions:
"Temps Ã  adapter selon dimensions et complexitÃ©.",
tags:
["meuble",
"montage"]
}),

p("BRI-FIX-MURAL",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Pose / fixation dâ€™un Ã©quipement mural",
"u",
1,
[

  "RepÃ©rage de lâ€™emplacement",

  "PerÃ§age et fixation adaptÃ©s au support accessible",

  "ContrÃ´le de lâ€™alignement et de la tenue",

],
{ conditions:
"Hors renfort structurel du support et hors Ã©quipement exceptionnellement lourd.",
tags:
["fixation",
"mur"]
}),

p("BRI-ETAGERE",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Pose dâ€™une Ã©tagÃ¨re",
"u",
0.75,
[

  "Implantation et traÃ§age",

  "PerÃ§age et fixation",

  "ContrÃ´le du niveau et de la tenue",

],
{ tags:
["Ã©tagÃ¨re"]
}),

p("BRI-TRINGLE",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Pose dâ€™une tringle ou dâ€™un store",
"u",
1,
[

  "Prise de mesures et implantation",

  "Pose des supports",

  "Montage et rÃ©glage de lâ€™Ã©quipement",

],
{ tags:
["tringle",
"store"]
}),

p("BRI-COULISSANTE",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"RÃ©glage dâ€™une porte coulissante",
"u",
0.75,
[

  "ContrÃ´le du rail et des galets",

  "RÃ©glage et alignement",

  "Essai de fonctionnement",

],
{ conditions:
"SystÃ¨me existant rÃ©parable sans remplacement complet.",
tags:
["porte coulissante",
"rÃ©glage"]
}),

p("BRI-PORTE-REG",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"RÃ©glage dâ€™une porte",
"u",
0.75,
[

  "ContrÃ´le des jeux et points de frottement",

  "RÃ©glage des paumelles ou Ã©lÃ©ments accessibles",

  "Essai de fonctionnement",

],
{ conditions:
"Hors remplacement complet du bloc-porte.",
tags:
["porte",
"rÃ©glage"]
}),

p("BRI-POIGNEE-PETITE-REP",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Resserrage / petite rÃ©paration de poignÃ©e ou quincaillerie",
"u",
0.2,
[

  "Resserrage ou remplacement dâ€™une petite fixation accessible",

  "RÃ©glage et essai de fonctionnement",

],
{ conditions:
"Pour rÃ©paration simple avec mÃ©canisme existant conservÃ©. Hors remplacement complet de poignÃ©e, serrure ou quincaillerie dÃ©fectueuse.",
tags:
["poignÃ©e",
"porte",
"vis",
"quincaillerie",
"resserrage",
"petite rÃ©paration"]
}),

p("BRI-RABOT",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Rabotage / ajustement dâ€™une porte",
"u",
1,
[
  "RepÃ©rage de la zone de frottement ; dÃ©pose si nÃ©cessaire.",
  "Rabotage ou ajustement.",
  "Repose et essai.",
],
{ tags:
["porte",
"rabotage"]
}),

p("BRI-FENETRE-REG",
"Bricolage / Menuiserie lÃ©gÃ¨re", "RÃ©glage / petite rÃ©paration dâ€™une fenÃªtre ou fenÃªtre de toit", "u",
0.75, [
  "ContrÃ´le de lâ€™ouvrant et des Ã©lÃ©ments accessibles ; dÃ©pose partielle si nÃ©cessaire Ã  lâ€™intervention.",
  "Resserrage, rÃ©glage ou reprise simple de la quincaillerie.",
  "Repose et essai de fonctionnement.",
],

  {

    conditions:

      "Pour intervention simple sur fenÃªtre ou fenÃªtre de toit existante. Hors remplacement complet de menuiserie, vitrage ou mÃ©canisme complexe.",

    tags: [

      "fenÃªtre",

      "fenÃªtre de toit",

      "Velux",

      "poignÃ©e",

"quincaillerie",

      "rÃ©glage",

      "resserrage",

      "rÃ©paration",
],  }),

p("BRI-BAL-DEPOSE-BLOC",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"DÃ©pose dâ€™un bloc de boÃ®tes aux lettres encastrÃ©es",
"forfait",
3.5,
[
  "Protection et prÃ©paration de la zone dâ€™intervention ; descellement et dÃ©pose de lâ€™ensemble de boÃ®tes aux lettres existant.",
  "DÃ©molition pÃ©riphÃ©rique strictement nÃ©cessaire Ã  la dÃ©pose.",
  "Regroupement des Ã©lÃ©ments dÃ©posÃ©s et gravats.",
],
{ conditions:
"Pour bloc existant encastrÃ© en maÃ§onnerie. Hors Ã©vacuation en dÃ©chÃ¨terie et hors reprise structurelle du mur.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["boÃ®te aux lettres",
"dÃ©pose",
"bloc",
"encastrÃ©"]
}),

p("BRI-BAL-PREP",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"PrÃ©paration / adaptation dâ€™une rÃ©servation pour boÃ®tes aux lettres",
"forfait",
2.5,
[

  "Piquage et reprises localisÃ©es nÃ©cessaires",

  "Adaptation courante de lâ€™ouverture au nouvel ensemble",

  "PrÃ©paration des supports avant scellement",

],
{ conditions:
"Hors modification structurelle, linteau ou reconstruction importante de maÃ§onnerie.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["boÃ®te aux lettres",
"maÃ§onnerie",
"rÃ©servation",
"prÃ©paration"]
}),

p("BRI-BAL-FIN-MAC",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Reprise de maÃ§onnerie pÃ©riphÃ©rique autour dâ€™un bloc de boÃ®tes aux lettres",
"forfait",
2.8,
[

  "Rebouchage et scellement pÃ©riphÃ©rique au mortier adaptÃ©",

  "Reprise localisÃ©e des parties dÃ©gradÃ©es autour du bloc",

  "Dressage et finition des raccords avec la maÃ§onnerie existante",

], { conditions: "Finition raccordÃ©e Ã  lâ€™existant, hors ravalement complet, peinture de faÃ§ade et reprise structurelle.", rentabilite:
"ðŸŸ  Ã€ contrÃ´ler", tags:
["boÃ®te aux lettres",
"maÃ§onnerie", "mortier",
"finition"] }),

p("BRI-BAL-POSE",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Pose et scellement dâ€™une boÃ®te aux lettres en ensemble",
"u",
0.65,
[
  "PrÃ©sentation et assemblage avec les boÃ®tes adjacentes ; calage, alignement et mise Ã  niveau.",
  "Fixation et scellement dans la rÃ©servation prÃ©parÃ©e.",
  "ContrÃ´le de lâ€™ouverture et du fonctionnement.",
],
{ conditions:
"BoÃ®te fournie sÃ©parÃ©ment. Pose en ensemble accessible, support prÃ©parÃ©. Temps Ã  adapter si fixation ou assemblage particulier.",
tags:
["boÃ®te aux lettres",
"pose",
"scellement",
"ensemble"]
}),

p("BRI-BAL-BARILLET",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Remplacement dâ€™un barillet de boÃ®te aux lettres",
"u",
0.5,
[
  "DÃ©pose du barillet existant ; pose dâ€™un barillet standard compatible.",
  "RÃ©glage du verrouillage.",
  "ContrÃ´le de la fermeture et essai avec les clÃ©s.",
],
{ conditions:
"Barillet et clÃ©s fournis sÃ©parÃ©ment. Pour boÃ®te aux lettres existante accessible et porte conservÃ©e. Hors perÃ§age dâ€™un barillet bloquÃ©, modification importante de la porte ou remplacement complet de la boÃ®te aux lettres.",
tags:
["boÃ®te aux lettres",
"barillet",
"serrure",
"clÃ©",
"remplacement"]
}),

p("BRI-BAL-PORTE-REG",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Redressage et rÃ©glage dâ€™une porte de boÃ®te aux lettres",
"u",
0.75,
[
  "ContrÃ´le de la porte, des jeux et de la fermeture ; dÃ©pose partielle si nÃ©cessaire.",
  "Redressage localisÃ© de la porte mÃ©tallique ; rÃ©glage de lâ€™alignement et de la fermeture.",
  "Repose et essai de fonctionnement.",
],
{ conditions:
"Pour dÃ©formation lÃ©gÃ¨re Ã  modÃ©rÃ©e permettant la conservation de la porte, du caisson et des charniÃ¨res. Hors remplacement de porte, remise en peinture ou remplacement complet de la boÃ®te aux lettres.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["boÃ®te aux lettres",
"porte",
"redressage",
"rÃ©glage",
"rÃ©paration"]
}),
// ================= FIXATIONS / MAINS COURANTES =================
p("BRI-MAIN-COURANTE-REP",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"RÃ©paration / reprise de fixations de main courante",
"h",
1,
[
  "ContrÃ´le des fixations existantes accessibles ; dÃ©pose des Ã©lÃ©ments nÃ©cessaires Ã  lâ€™intervention.",
  "Retrait des fixations dÃ©fectueuses ; reprise localisÃ©e des anciens points de fixation si nÃ©cessaire.",
  "CrÃ©ation de nouveaux points dâ€™ancrage adaptÃ©s au support ; repose, rÃ©glage et contrÃ´le de la tenue de la main courante.",
],

  {

    conditions:

      "MÃ©thode de fixation Ã  adapter Ã  la nature et Ã  lâ€™Ã©tat du support. Hors renforcement structurel de la paroi. Reprises de peinture comptÃ©es sÃ©parÃ©ment si nÃ©cessaires.",

    rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",

    tags:
[

      "main courante",

      "rambarde",

      "escalier",

      "fixation",

      "ancrage",

      "rÃ©paration",
],}
),

p("BRI-REB-FIX-MURAL",
"Bricolage / Menuiserie lÃ©gÃ¨re", "Rebouchage et reprise locale dâ€™anciens points de fixation",
"u",
0.25,
[

    "Purge et nettoyage du point de fixation dÃ©gradÃ©",

    "Rebouchage avec produit adaptÃ© au support",

    "PonÃ§age et prÃ©paration locale aprÃ¨s sÃ©chage",

  ],

  {

    conditions:

      "Pour reprises localisÃ©es courantes. Hors rÃ©paration structurelle du support et hors mise en peinture.",

    tags:
[

      "rebouchage",

      "fixation",

      "trou",

      "mur",

      "enduit",

      "rÃ©paration",
],}
),
p("BRI-CAISSON-CLIM-EXT",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Fabrication et pose dâ€™un caisson extÃ©rieur ventilÃ© pour unitÃ© de climatisation",
"forfait",
7,
[
  "Prise de mesures et fabrication de lâ€™ossature adaptÃ©e Ã  lâ€™emplacement ; crÃ©ation dâ€™un rangement infÃ©rieur Ã©quipÃ© de deux portes.",
  "Habillage extÃ©rieur avec les lames retenues pour le chantier ; rÃ©alisation dâ€™une faÃ§ade supÃ©rieure largement ajourÃ©e et dÃ©montable.",
  "Pose, rÃ©glage des ouvrants et contrÃ´le des finitions.",
],
{ conditions:
"Dimensions, profondeur, habillage et ventilation Ã  adapter au chantier. Lâ€™entrÃ©e et la sortie dâ€™air de lâ€™unitÃ© doivent rester dÃ©gagÃ©es conformÃ©ment Ã  la notice du fabricant. Hors dÃ©placement, dÃ©connexion, rÃ©paration ou modification de la climatisation.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["caisson",
"climatisation",
"unitÃ© extÃ©rieure",
"rangement",
"portes",
"ventilation",
"terrasse"]
}),
// ================= EXTERIEUR / METAL =================
p("EXT-METAL-PREP",
"ExtÃ©rieur / MÃ©tal",
"PrÃ©paration dâ€™un support mÃ©tallique",
"mÂ²",
0.35,
[

  "Grattage et Ã©limination des parties non adhÃ©rentes",

  "PonÃ§age ou prÃ©paration mÃ©canique lÃ©gÃ¨re",

  "DÃ©poussiÃ©rage avant finition",

],
{ conditions:
"Hors dÃ©capage lourd ou corrosion structurelle.",
tags:
["mÃ©tal",
"prÃ©paration"]
}),

p("EXT-METAL-REP-H",
"ExtÃ©rieur / MÃ©tal",
"RÃ©paration / reprise lÃ©gÃ¨re dâ€™un Ã©lÃ©ment mÃ©tallique",
"h",
1,
[

  "RepÃ©rage de la zone Ã  reprendre",

  "RÃ©paration ou renforcement lÃ©ger prÃ©vu",

  "Nettoyage de la zone",

],
{ conditions:
"Hors Ã©lÃ©ment structurel ou rÃ©paration nÃ©cessitant une certification spÃ©cifique.",
tags:
["mÃ©tal",
"rÃ©paration"]
}),

p("EXT-SOUDURE",
"ExtÃ©rieur / MÃ©tal",
"Reprise ponctuelle par soudure",
"u",
1,
[

  "PrÃ©paration de la zone",

  "Reprise ponctuelle de la soudure",

  "Nettoyage et contrÃ´le visuel",

],
{ conditions:
"Petite reprise accessible, hors ouvrage structurel ou soumis Ã  qualification spÃ©cifique.",
tags:
["soudure",
"mÃ©tal"]
}),

p("EXT-ANTIROUILLE",
"ExtÃ©rieur / MÃ©tal",
"Traitement anticorrosion",
"mÂ²",
0.15,
[

  "PrÃ©paration lÃ©gÃ¨re des zones concernÃ©es",

  "Application du traitement anticorrosion prÃ©vu",

],
{ conditions:
"Hors corrosion perforante ou structurelle.",
tags:
["antirouille",
"mÃ©tal"]
}),

p("EXT-METAL-PEINT",
"ExtÃ©rieur / MÃ©tal",
"Mise en peinture dâ€™un support mÃ©tallique",
"mÂ²",
0.25,
[

  "Application de la finition prÃ©vue",

  "RÃ©alisation des reprises et finitions courantes",

],
{ conditions:
"Support prÃ©parÃ©. Primaire anticorrosion Ã  ajouter si nÃ©cessaire.",
tags:
["mÃ©tal",
"peinture"]
}),
p("EXT-PERGOLA-ACIER-FAB",
"ExtÃ©rieur / MÃ©tal",
"Fabrication dâ€™une structure de pergola en acier",
"h",
1,
[
  "ContrÃ´le des dimensions et prÃ©paration du dÃ©bit des profilÃ©s ; dÃ©coupe, perÃ§age et assemblage des Ã©lÃ©ments de structure.",
  "Soudure des assemblages prÃ©vus et prÃ©paration des raccords.",
  "Meulage, Ã©bavurage et contrÃ´le visuel avant finition.",
],
{ conditions:
"Temps Ã  adapter aux dimensions, au nombre de poteaux et de traverses. Sections et ancrages Ã  valider avant fabrication. Hors Ã©tude de structure, couverture, finition, thermolaquage, transport spÃ©cialisÃ© et moyen de levage.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["pergola",
"acier",
"fabrication",
"soudure",
"structure extÃ©rieure"]
}),

p("EXT-PERGOLA-ACIER-POS",
"ExtÃ©rieur / MÃ©tal",
"Pose et fixation dâ€™une structure de pergola en acier",
"h",
1,
[
  "Implantation et repÃ©rage des points de fixation ; mise en place des poteaux, poutres et traverses.",
  "RÃ©alisation des ancrages au sol et au support mural prÃ©vus.",
  "RÃ©glage de lâ€™aplomb, contrÃ´le des assemblages et finitions de pose.",
],
{ conditions:
"Support sain, stable et compatible avec les ancrages prÃ©vus. Hors Ã©tude structurelle, terrassement important, reprise du support, couverture, Ã©tanchÃ©itÃ©, Ã©chafaudage et moyen de levage spÃ©cialisÃ©.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["pergola",
"acier",
"pose",
"fixation",
"ancrage"]
}),

p("EXT-PERGOLA-RENFORT-POSE",
"ExtÃ©rieur / MÃ©tal",
"Renfort ponctuel pour manutention et pose dâ€™une structure mÃ©tallique",
"forfait",
0,
[

  "PrÃ©sence ponctuelle dâ€™une seconde personne pour les manutentions lourdes",

  "Assistance Ã  la mise en place et au maintien des Ã©lÃ©ments de grande longueur",

  "SÃ©curisation des opÃ©rations de levage et de fixation accessibles",

],
{ prixFixe:
180,
conditions:
"Forfait Ã  adapter Ã  la durÃ©e et au poids des Ã©lÃ©ments. Hors grue, nacelle, Ã©chafaudage ou engin de levage.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["pergola",
"renfort",
"manutention",
"pose lourde",
"seconde personne"]
}),

p("EXT-THERMOLAQUAGE-LOG",
"ExtÃ©rieur / MÃ©tal",
"PrÃ©paration et manutention dâ€™Ã©lÃ©ments destinÃ©s au thermolaquage",
"h",
1,
[
  "RepÃ©rage et prÃ©paration des Ã©lÃ©ments avant traitement extÃ©rieur ; protection, chargement et manutention des piÃ¨ces.",
  "DÃ©pÃ´t et rÃ©cupÃ©ration auprÃ¨s du prestataire retenu.",
  "ContrÃ´le visuel de la finition avant pose.",
],
{ conditions:
"Le prix facturÃ© par le prestataire de thermolaquage, les rÃ©parations de finition et les transports exceptionnels sont comptÃ©s sÃ©parÃ©ment.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["thermolaquage",
"mÃ©tal",
"prÃ©paration",
"manutention",
"prestataire"]
}),

// ================= EXTERIEUR / CLOTURE =================
p(
  "EXT-CLOTURE-APPRO-MANUT",
  "ExtÃ©rieur / ClÃ´ture",
  "Approvisionnement et manutention dâ€™Ã©lÃ©ments de clÃ´ture",
  "forfait",
  2.5,
  [
  "PrÃ©paration de la liste des Ã©lÃ©ments nÃ©cessaires Ã  la pose ; chargement et transport courant des panneaux, poteaux et accessoires.",
  "DÃ©chargement et rÃ©partition des Ã©lÃ©ments sur la zone dâ€™intervention.",
  "Manutention courante des fournitures avant pose.",
],
  {
    conditions:
      "Pour approvisionnement local et Ã©lÃ©ments de dimensions courantes. Hors livraison facturÃ©e par le fournisseur, transport exceptionnel, manutention mÃ©canisÃ©e, stockage prolongÃ© et Ã©vacuation des emballages volumineux.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "clÃ´ture",
      "grillage rigide",
      "approvisionnement",
      "manutention",
      "panneau",
      "poteau",
    ],
  }
),

p(
  "EXT-CLOTURE-POTEAU-PLATINE",
  "ExtÃ©rieur / ClÃ´ture",
  "Pose dâ€™un poteau de clÃ´ture sur platine",
  "u",
  0.9,
  [
  "Implantation et repÃ©rage de la position du poteau ; perÃ§age du support et mise en place des fixations adaptÃ©es.",
  "Pose de la platine et du poteau ; rÃ©glage de lâ€™alignement, de lâ€™aplomb et du niveau.",
  "Serrage et contrÃ´le de la fixation.",
],
  {
    conditions:
      "Support maÃ§onnÃ© sain, stable, suffisamment large et rÃ©sistant aux efforts transmis par la clÃ´ture. Fixations et scellement adaptÃ©s comptÃ©s en fournitures. Hors rÃ©paration ou renforcement de la maÃ§onnerie, carottage important et Ã©tude de rÃ©sistance au vent.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "clÃ´ture",
      "grillage rigide",
      "poteau",
      "platine",
      "murette",
      "fixation",
      "scellement chimique",
    ],
  }
),

p(
  "EXT-CLOTURE-PANNEAU-POS",
  "ExtÃ©rieur / ClÃ´ture",
  "Pose de panneaux de clÃ´ture rigide",
  "ml",
  0.4,
  [
  "PrÃ©sentation des panneaux entre les poteaux prÃ©parÃ©s ; dÃ©coupes droites nÃ©cessaires Ã  lâ€™ajustement des longueurs.",
  "Pose et fixation des panneaux rigides ; rÃ©glage de lâ€™alignement et contrÃ´le de la tenue de lâ€™ensemble.",
  "Protection courante des coupes mÃ©talliques rÃ©alisÃ©es sur place.",
],
  {
    conditions:
      "Pour pose droite sur poteaux prÃ©parÃ©s et support accessible. Poteaux, platines, occultation, adaptation importante Ã  une pente, reprise de maÃ§onnerie et renforcement du support comptÃ©s sÃ©parÃ©ment.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "clÃ´ture",
      "grillage rigide",
      "panneau rigide",
      "pose",
      "dÃ©coupe",
      "extÃ©rieur",
    ],
  }
),

p(
  "EXT-CLOTURE-ADAPT-PENTE",
  "ExtÃ©rieur / ClÃ´ture",
  "Adaptation de panneaux de clÃ´ture Ã  une pente",
  "ml",
  0.3,
  [
  "RelevÃ© de la pente et traÃ§age des hauteurs nÃ©cessaires ; dÃ©coupe progressive des panneaux suivant la configuration.",
  "Ã‰bavurage et protection des coupes mÃ©talliques.",
  "Ajustement des panneaux et contrÃ´le de la continuitÃ© visuelle.",
],
  {
    conditions:
      "Ã€ ajouter Ã  la pose des panneaux lorsque la hauteur doit Ã©voluer suivant une pente ou une arase irrÃ©guliÃ¨re. Hors fabrication sur mesure en atelier, modification structurelle des poteaux et reprise du support maÃ§onnÃ©.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "clÃ´ture",
      "grillage rigide",
      "pente",
      "dÃ©coupe",
      "adaptation",
      "murette",
    ],
  }
),

p(
  "EXT-CLOTURE-OCCULT-PVC",
  "ExtÃ©rieur / ClÃ´ture",
  "Pose de lames occultantes PVC sur clÃ´ture rigide",
  "mÂ²",
  0.18,
  [
  "ContrÃ´le de la compatibilitÃ© entre les lames et les mailles des panneaux ; dÃ©coupe des lames occultantes aux hauteurs nÃ©cessaires.",
  "Mise en place des lames et des clips de maintien ; ajustement des extrÃ©mitÃ©s, des panneaux recoupÃ©s et des zones en pente.",
  "ContrÃ´le visuel et nettoyage de fin dâ€™intervention.",
],
  {
    conditions:
      "ClÃ´ture rigide posÃ©e, stable et compatible avec le systÃ¨me dâ€™occultation retenu. La rÃ©sistance de la murette, des poteaux, platines et fixations aux efforts supplÃ©mentaires dus au vent doit Ãªtre validÃ©e avant pose. Hors fourniture, renforcement du support et remplacement dâ€™un panneau inadaptÃ©.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "clÃ´ture",
      "grillage rigide",
      "occultation",
      "lame PVC",
      "brise-vue",
      "pente",
    ],
  }
),
// ================= TERRASSE BOIS =================
p("TERR-IMPLANT-GEOTEXTILE",
"Terrasse bois",
"Implantation et prÃ©paration du sol pour crÃ©ation dâ€™une terrasse",
"mÂ²",
0.2,
[
  "Implantation de lâ€™emprise et repÃ©rage des niveaux finis ; prÃ©paration courante et nettoyage de la zone dÃ©gagÃ©e.",
  "Pose du gÃ©otextile sur lâ€™emprise prÃ©vue.",
  "RepÃ©rage des futurs points dâ€™appui de la structure.",
],
{ conditions:
"Zone dÃ©gagÃ©e et ancienne terrasse dÃ©posÃ©e avant intervention. Hors terrassement important, dÃ©caissement, compactage mÃ©canique, drainage, Ã©vacuation de terre et traitement de rÃ©seaux enterrÃ©s.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"crÃ©ation",
"implantation",
"sol",
"gÃ©otextile"]
}),

p("TERR-POINTS-APPUI",
"Terrasse bois",
"RÃ©alisation et rÃ©glage des points dâ€™appui dâ€™une terrasse",
"mÂ²",
0.4,
[
  "RÃ©partition des appuis selon lâ€™ossature prÃ©vue ; mise en place des supports bÃ©ton ou dalles dâ€™appui nÃ©cessaires.",
  "Pose et rÃ©glage des pieds ou plots rÃ©glables.",
  "ContrÃ´le des niveaux, alignements et stabilitÃ© des appuis.",
],
{ conditions:
"QuantitÃ© et mÃ©thode Ã  confirmer aprÃ¨s contrÃ´le du terrain et de la hauteur disponible. Hors fondations profondes, dalle bÃ©ton complÃ¨te, Ã©tude de sol et reprise dâ€™un terrain instable.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"crÃ©ation",
"plot bÃ©ton",
"pied rÃ©glable",
"niveau",
"appui"]
}),

p("TERR-OSSATURE-NEUVE",
"Terrasse bois",
"CrÃ©ation dâ€™une structure porteuse neuve en lambourdes",
"mÂ²",
0.45,
[
  "Calepinage et dÃ©bit des lambourdes selon lâ€™emprise ; pose de la structure porteuse sur les appuis rÃ©glÃ©s.",
  "Renfort des pÃ©riphÃ©ries, aboutages et zones particuliÃ¨res ; rÃ©glage de la planÃ©itÃ©, fixation et contrÃ´le de la stabilitÃ©.",
  "Pose des bandes de protection prÃ©vues sur les lambourdes.",
],
{ conditions:
"Pour une structure courante de terrasse piÃ©tonne. Sections, entraxes et doubles lambourdes Ã  adapter aux lames choisies. Hors structure porteuse surÃ©levÃ©e, garde-corps, escalier et Ã©tude structurelle.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"crÃ©ation",
"structure neuve",
"lambourdes",
"ossature"]
}),

p("TERR-POSE-LAMES-NEUF",
"Terrasse bois",
"Pose de lames de terrasse sur structure neuve",
"mÂ²",
0.588636,
[
  "Implantation et calepinage courant des lames ; pose avec visserie inox ou clips adaptÃ©s au produit retenu.",
  "Respect des jeux, espacements et prescriptions de pose ; rÃ©alisation des coupes droites, rives et finitions pÃ©riphÃ©riques courantes.",
  "ContrÃ´le de lâ€™alignement, de la stabilitÃ© et nettoyage de fin de pose.",
],
{ conditions:
"Sur structure neuve plane, stable et compatible. Hors fourniture, traitement de finition, marches, trappes, motifs particuliers et coupes complexes facturÃ©es sÃ©parÃ©ment. Temps Ã  ajuster pour un systÃ¨me de fixation spÃ©cifique.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"crÃ©ation",
"lames",
"bois",
"composite",
"pose neuve",
"rives"]
}),

p("TERR-PROT-CHEMINEMENT",
"Terrasse bois",
"Protection du cheminement intÃ©rieur pour accÃ¨s au chantier",
"h",
1,
[

  "Protection des sols et des zones de passage concernÃ©es",

  "Mise en place dâ€™un cheminement adaptÃ© aux manutentions",

  "DÃ©pose des protections en fin dâ€™intervention",

],
{ conditions:
"Ã€ quantifier selon le nombre de piÃ¨ces, les Ã©tages, la longueur du cheminement et la fragilitÃ© des surfaces.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"protection",
"intÃ©rieur",
"cheminement",
"accÃ¨s"]
}),

p("TERR-DEPOSE-LAMES",
"Terrasse bois",
"DÃ©pose de lames de terrasse existantes",
"mÂ²",
0.25,
[

  "DÃ©pose mÃ©thodique des lames et de leurs fixations accessibles",

  "Regroupement des Ã©lÃ©ments dÃ©posÃ©s en vue de leur Ã©vacuation",

  "PrÃ©servation de la structure porteuse destinÃ©e Ã  Ãªtre conservÃ©e",

],
{ conditions:
"Pour des lames dÃ©montables sur une structure accessible. Hors dÃ©pose ou remplacement des lambourdes, Ã©vacuation et frais de traitement.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"dÃ©pose",
"lames",
"bois",
"composite"]
}),

p("TERR-MANUT-ACCES",
"Terrasse bois",
"Manutention en accÃ¨s difficile",
"h",
1,
[

  "Acheminement manuel des matÃ©riaux et de lâ€™outillage",

  "Manutention fractionnÃ©e adaptÃ©e aux contraintes dâ€™accÃ¨s",

  "Transport manuel des Ã©lÃ©ments dÃ©posÃ©s vers la zone de chargement",

],
{ conditions:
"Ã€ quantifier selon les Ã©tages, passages intÃ©rieurs, longueurs transportables, poids des matÃ©riaux et contraintes rÃ©elles dâ€™accÃ¨s. Hors moyen de levage, Ã©chafaudage et circulation sur une verriÃ¨re.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"manutention",
"accÃ¨s difficile",
"Ã©tage",
"transport manuel"]
}),

p("TERR-CONTROLE-SUPPORT",
"Terrasse bois",
"ContrÃ´le et prÃ©paration de la structure porteuse existante",
"mÂ²",
0.15,
[

  "ContrÃ´le visuel de la structure accessible aprÃ¨s dÃ©pose",

  "Nettoyage des appuis et retrait des fixations rÃ©siduelles",

  "Petits rÃ©glages nÃ©cessaires avant la pose des nouvelles lames",

],
{ conditions:
"Chiffrage Ã©tabli pour une structure existante saine, stable et compatible avec les nouvelles lames. Toute rÃ©paration importante ou tout remplacement de lambourdes est comptÃ© sÃ©parÃ©ment.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"support",
"structure",
"lambourdes",
"prÃ©paration"]
}),

p("TERR-POSE-LAMES-BOIS",
"Terrasse bois",
"Pose de lames de terrasse en bois sur structure existante",
"mÂ²",
0.65,
[
  "Implantation et calepinage courant des lames ; pose des lames avec fixations adaptÃ©es au bois retenu.",
  "Respect des jeux de dilatation et des espacements nÃ©cessaires.",
  "ContrÃ´le de lâ€™alignement et de la stabilitÃ© de lâ€™ensemble.",
],
{ conditions:
"Sur structure existante saine, plane, stable et compatible. Hors fourniture des lames et fixations, coupes complexes, finitions de rives, reprise de structure et traitement de finition.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"bois",
"lames",
"pose",
"cumaru",
"bois exotique"]
}),

p("TERR-COUPES-FINITIONS",
"Terrasse bois",
"Coupes complexes et finitions de terrasse",
"h",
1,
[

  "TraÃ§age et rÃ©alisation des coupes biaises ou particuliÃ¨res",

  "Ajustement autour des angles et dÃ©crochements",

  "RÃ©alisation des finitions de rives prÃ©vues au devis",

],
{ conditions:
"Prestation facturÃ©e selon le temps nÃ©cessaire. Les coupes droites courantes restent comprises dans la pose des lames.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"coupe biaise",
"dÃ©coupe",
"rive",
"finition"]
}),

p("TERR-TRI-EVAC",
"Terrasse bois",
"Tri, chargement et Ã©vacuation des Ã©lÃ©ments dÃ©posÃ©s",
"h",
1,
[

  "Tri et regroupement des lames et fixations dÃ©posÃ©es",

  "Chargement dans le vÃ©hicule",

  "Transport, dÃ©chargement et retour depuis une filiÃ¨re adaptÃ©e",

],
{ conditions:
"Ã€ quantifier selon le volume, le poids, lâ€™accÃ¨s et la distance. Hors frais exceptionnels de traitement et trajets supplÃ©mentaires.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
typeTravaux:
"deplacement",
tags:
["terrasse",
"tri",
"chargement",
"Ã©vacuation",
"dÃ©chÃ¨terie"]
}),

p("TERR-SATURATEUR",
"Terrasse bois",
"Application dâ€™un saturateur sur terrasse bois",
"mÂ²",
0.15,
[

  "DÃ©poussiÃ©rage et prÃ©paration lÃ©gÃ¨re des lames",

  "Application rÃ©guliÃ¨re du saturateur prÃ©vu",

  "Essuyage des Ã©ventuels excÃ©dents et contrÃ´le de finition",

],
{ conditions:
"Sur bois propre, sec et compatible avec le produit retenu. Nombre de couches, nettoyage approfondi, dÃ©grisage et renouvellement ultÃ©rieur Ã  adapter au chantier.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["terrasse",
"bois",
"saturateur",
"protection",
"entretien",
"uv"]
}),
// ================= TOITURE LEGERE =================
p("TOIT-DIAG",
"Toiture lÃ©gÃ¨re",
"Diagnostic visuel ponctuel dâ€™une couverture",
"forfait",
1.5,
[

  "ContrÃ´le visuel des Ã©lÃ©ments accessibles",

  "RepÃ©rage dâ€™une anomalie apparente",

  "Compte rendu de lâ€™observation",

],
{ conditions:
"AccÃ¨s sÃ©curisÃ© obligatoire. Ne remplace pas un diagnostic spÃ©cialisÃ©.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["toiture",
"diagnostic"]
}),

p("TOIT-ELEM",
"Toiture lÃ©gÃ¨re",
"Remplacement ponctuel dâ€™un Ã©lÃ©ment de couverture",
"u",
0.5,
[

  "DÃ©pose de lâ€™Ã©lÃ©ment endommagÃ© accessible",

  "Pose de lâ€™Ã©lÃ©ment de remplacement",

  "ContrÃ´le visuel de la zone",

],
{ conditions:
"Intervention ponctuelle uniquement, accÃ¨s sÃ©curisÃ©, hors rÃ©fection de couverture.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["tuile",
"couverture"]
}),

p("TOIT-FINITION",
"Toiture lÃ©gÃ¨re",
"Intervention lÃ©gÃ¨re de finition de couverture",
"ml",
0.3,
[

  "ContrÃ´le de la zone",

  "Pose ou reprise ponctuelle de lâ€™Ã©lÃ©ment de finition prÃ©vu",

  "Fixations et ajustements courants",

],
{ conditions:
"AccÃ¨s sÃ©curisÃ© obligatoire. Hors Ã©tanchÃ©itÃ© lourde et rÃ©fection complÃ¨te.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["rive",
"finition",
"toiture"]
}),
// ================= HABILLAGE SOUS-FACE =================
p("TOIT-HAB-DEPOSE-COMP",
"Toiture lÃ©gÃ¨re",
"DÃ©pose complÃ¨te dâ€™un habillage de sous-face",
"mÂ²",
0.22,
[
  "Protection et prÃ©paration de la zone dâ€™intervention ; dÃ©pose complÃ¨te de lâ€™habillage existant.",
  "Retrait des fixations accessibles devenues inutiles ; regroupement des Ã©lÃ©ments dÃ©posÃ©s.",
  "ContrÃ´le visuel du support rendu accessible.",
],

  {

    conditions:

      "Hors rÃ©paration ou remplacement des Ã©lÃ©ments porteurs dÃ©couverts aprÃ¨s dÃ©pose et hors Ã©vacuation en dÃ©chÃ¨terie.",

    rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",

    tags:
[

      "lambris",

      "sous-face",

      "sous toiture",

      "dÃ©pose",

      "habillage",
],}
),

p("TOIT-HABILLAGE",
"Toiture lÃ©gÃ¨re",
"Pose / remplacement dâ€™un habillage sous toiture",
"mÂ²",
0.45,
[

  "DÃ©pose locale si prÃ©vue",

  "DÃ©coupe et pose de lâ€™habillage",

  "Ajustements et finitions courantes",

],
{ conditions:
"Hors intervention structurelle sur charpente.",
tags:
["lambris",
"sous toiture"]
}),

p(
  "TOIT-HAB-REPOSE",
  "Toiture lÃ©gÃ¨re",
  "Repose dâ€™un habillage de sous-face existant",
  "mÂ²",
  0.45,
  [
  "ContrÃ´le visuel des Ã©lÃ©ments dÃ©posÃ©s et du support accessible ; remise en place de lâ€™habillage existant conservÃ©.",
  "Remplacement ou complÃ©ment des fixations courantes si nÃ©cessaire ; ajustements et finitions pÃ©riphÃ©riques courantes.",
  "ContrÃ´le visuel de la bonne tenue de lâ€™ensemble.",
],
  {
    conditions:
      "Repose sous rÃ©serve de lâ€™Ã©tat des Ã©lÃ©ments existants et du support aprÃ¨s dÃ©pose. Les Ã©lÃ©ments dÃ©tÃ©riorÃ©s, dÃ©formÃ©s ou ne permettant pas une repose correcte ne sont pas compris et feront lâ€™objet dâ€™un accord complÃ©mentaire. Hors rÃ©paration de charpente, structure ou infiltration.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "lambris",
      "sous-face",
      "sous toiture",
      "habillage",
      "repose",
      "rÃ©emploi",
      "existant",
    ],
  }
),

p("TOIT-HAB-PVC",
"Toiture lÃ©gÃ¨re",
"Pose dâ€™un habillage PVC de sous-face",
"mÂ²",
0.5,
[
  "ContrÃ´le du support existant accessible ; implantation de lâ€™habillage.",
  "Pose des profils de dÃ©part et de finition ; dÃ©coupe et pose des lames PVC.",
  "Fixation sur support adaptÃ© ; ajustements et finitions pÃ©riphÃ©riques.",
],

  {

    conditions:

      "Support existant sain, stable et apte Ã  recevoir lâ€™habillage. Fourniture PVC adaptÃ©e Ã  lâ€™usage prÃ©vu. Hors rÃ©paration de charpente, structure ou infiltration.",

    rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",

    tags:
[

      "PVC",

      "lambris PVC",

      "sous-face",

      "sous toiture",

      "habillage",

      "extÃ©rieur",
], }),

// ================= JARDIN - REMISE EN Ã‰TAT =================

p("JAR-TONTE",
"Jardin", "Tonte dâ€™entretien dâ€™une pelouse",
"mÂ²", 0.01, [

   "PrÃ©paration et contrÃ´le de la zone accessible",

   "Tonte de la surface prÃ©vue au devis",

   "RÃ©alisation des finitions courantes",

 ],

 {

   conditions:

     "Pour une pelouse rÃ©guliÃ¨rement entretenue, sur terrain courant, dÃ©gagÃ© et accessible. Herbe haute, dÃ©broussaillage, ramassage et Ã©vacuation comptÃ©s sÃ©parÃ©ment.",

   tags: [

     "jardin",

     "tonte",

     "pelouse",

     "entretien", ], }),

p("JAR-DEBROU",
"Jardin", "DÃ©broussaillage lÃ©ger", "mÂ²",
0.02, [

   "PrÃ©paration et contrÃ´le de la zone accessible",

   "DÃ©broussaillage lÃ©ger de la surface prÃ©vue",

   "Regroupement sommaire des dÃ©chets verts",

 ],

 {

   conditions:

     "Pour une vÃ©gÃ©tation lÃ©gÃ¨re et un terrain accessible. Hors vÃ©gÃ©tation trÃ¨s dense, ronces importantes, coupe mÃ©canisÃ©e lourde, ramassage complet et Ã©vacuation.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "jardin",

     "dÃ©broussaillage",

     "herbe haute",

     "vÃ©gÃ©tation",  ],}),

p(
"JAR-HAIE", "Jardin", "Taille dâ€™entretien dâ€™une haie", "ml", 0.15, [
  "PrÃ©paration de la zone dâ€™intervention ; taille dâ€™entretien des faces accessibles.",
  "Taille du dessus de la haie lorsquâ€™il est accessible ; rÃ©alisation des finitions courantes.",
  "Regroupement des dÃ©chets de taille.",
],

 {

   conditions:

     "Pour une haie courante jusquâ€™Ã  environ 2 m de hauteur, accessible et rÃ©guliÃ¨rement entretenue. Tarif Ã  adapter selon hauteur, largeur, densitÃ© et difficultÃ©s dâ€™accÃ¨s. Ramassage complet et Ã©vacuation comptÃ©s sÃ©parÃ©ment.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "jardin",

     "haie",

     "taille",

     "entretien", ], }),

p(
"JAR-ARBUSTE", "Jardin", "Taille et entretien dâ€™arbustes", "h", 1, [
  "RepÃ©rage des vÃ©gÃ©taux concernÃ©s ; taille dâ€™entretien des arbustes prÃ©vus.",
  "RÃ©alisation des finitions accessibles.",
  "Regroupement sommaire des dÃ©chets verts.",
],

 {

   conditions:

     "Prestation facturÃ©e selon le temps nÃ©cessaire. Hors Ã©lagage spÃ©cialisÃ©, abattage et travail nÃ©cessitant un dÃ©placement dans lâ€™arbre. Ramassage complet et Ã©vacuation comptÃ©s sÃ©parÃ©ment.",

   tags: [

     "jardin",

     "arbuste",

     "taille",

     "entretien", ], }),

p("JAR-RAMASSAGE",
"Jardin", "Ramassage des dÃ©chets verts", "mÂ²",
0.008, [

   "Ramassage des dÃ©chets verts issus de lâ€™intervention",

   "Regroupement des dÃ©chets dans la zone prÃ©vue",

   "PrÃ©paration pour stockage sur place ou Ã©vacuation",

 ],

 {

   conditions:

     "Ã€ utiliser lorsque le ramassage complet nâ€™est pas dÃ©jÃ  compris dans une prestation facturÃ©e au temps. Hors transport et frais de traitement.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "jardin",

     "dÃ©chets verts",

     "ramassage",

     "nettoyage", ], }),

p("JAR-NET-H",
"Jardin", "Ramassage et nettoyage extÃ©rieur",
"h", 1, [
  "Ramassage des dÃ©chets vÃ©gÃ©taux ou salissures courantes ; nettoyage des bordures et zones accessibles.",
  "Regroupement des dÃ©chets.",
  "Nettoyage sommaire de fin dâ€™intervention.",
],

 {

   conditions:

     "Prestation facturÃ©e selon le temps nÃ©cessaire. Hors nettoyage spÃ©cialisÃ©, enlÃ¨vement dâ€™encombrants et Ã©vacuation en dÃ©chÃ¨terie.",

   tags: [

     "jardin",

     "extÃ©rieur",

     "nettoyage",

     "ramassage", ], }),

p(
"JAR-EVAC", "Jardin", "Ã‰vacuation de dÃ©chets verts", "forfait", 2, [
  "Chargement des dÃ©chets verts prÃ©parÃ©s ; transport vers une filiÃ¨re adaptÃ©e.",
  "DÃ©chargement des dÃ©chets.",
  "Retour de lâ€™intervention.",
],

 {

   prixFixe: 70,

   conditions:

     "Forfait de base Ã  adapter selon le volume, le poids, la distance, le nombre de trajets et les Ã©ventuels frais de traitement.",

   typeTravaux: "deplacement",

   rentabilite: "ðŸŸ  Ã€ adapter",

   tags: [

     "jardin",

     "dÃ©chets verts",

     "Ã©vacuation",

     "transport",

     "dÃ©chÃ¨terie", ],} ),

p("JAR-H",
"Jardin", "Intervention courante dâ€™entretien extÃ©rieur", "h", 1, [
  "PrÃ©paration de la zone dâ€™intervention ; rÃ©alisation de lâ€™entretien extÃ©rieur prÃ©vu au devis.",
  "Regroupement sommaire des dÃ©chets produits.",
  "Nettoyage courant de fin dâ€™intervention.",
],

 {

   conditions:

     "Pour une intervention extÃ©rieure courante ne correspondant pas Ã  une prestation plus prÃ©cise du catalogue. Ã‰vacuation comptÃ©e sÃ©parÃ©ment.",

   tags: [

     "jardin",

     "extÃ©rieur",

     "entretien",

     "intervention courante", ], } ),

p("JAR-REMISE-ETAT",
"Jardin", "Remise en Ã©tat dâ€™un espace vert",
"h", 1, [
  "PrÃ©paration et contrÃ´le de la zone dâ€™intervention ; tonte ou dÃ©broussaillage selon lâ€™Ã©tat de la vÃ©gÃ©tation.",
  "Taille lÃ©gÃ¨re des arbustes prÃ©vue au devis ; nettoyage des bordures et zones accessibles.",
  "Ramassage et regroupement des dÃ©chets verts ; nettoyage sommaire de fin dâ€™intervention.",
],

 {

   conditions:

     "Prestation globale facturÃ©e selon le temps nÃ©cessaire. Ã€ utiliser lorsque plusieurs travaux dâ€™entretien sont mÃ©langÃ©s. Ne pas cumuler avec les lignes dÃ©taillÃ©es pour les mÃªmes travaux. Hors Ã©lagage spÃ©cialisÃ©, abattage et Ã©vacuation.",

   rentabilite: "ðŸŸ  Ã€ contrÃ´ler",

   tags: [

     "jardin",

     "remise en Ã©tat",

     "espace vert",

     "tonte",

     "dÃ©broussaillage",

     "arbuste",

     "nettoyage",  ],} ),
// ================= DEPLACEMENT / LOGISTIQUE =================
p("deplacement_premier_jour_chantier",
"DÃ©placement / logistique",
"DÃ©placement premier jour chantier",
"km",
0,
[

  "DÃ©placement aller-retour chantier",

  "Temps de trajet et usure du vÃ©hicule",

],
{ prixFixe:
0.75,
conditions:
"Tarif par kilomÃ¨tre aller-retour, premier passage chantier.",
typeTravaux:
"deplacement",
tags:
["dÃ©placement",
"km"]
}),

p("deplacement_jours_suivants",
"DÃ©placement / logistique",
"DÃ©placement jours suivants",
"km",
0,
[

  "DÃ©placement aller-retour chantier",

  "Trajet journalier",

],
{ prixFixe:
0.7,conditions:
"Tarif par kilomÃ¨tre aller-retour aprÃ¨s le premier jour.",
typeTravaux:
"deplacement",
tags:
["dÃ©placement",
"km"]
}),

p("forfait_mise_en_place_chantier",
"DÃ©placement / logistique",
"Forfait mise en place chantier",
"forfait",
0,
[

  "Organisation du chantier",

  "Chargement du matÃ©riel",

  "Temps logistique de mise en place",

],
{ prixFixe:
20,
conditions:
"Forfait logistique chantier.",
typeTravaux:
"deplacement",
tags:
["logistique",
"mise en place"]
}),

p(
  "LOG-ACCES-MOBILE-HAUTEUR",
  "DÃ©placement / logistique",
  "Mise en place dâ€™un accÃ¨s mobile pour travail en hauteur",
  "forfait",
  2,
  [
    "Installation et sÃ©curisation du moyen dâ€™accÃ¨s adaptÃ© Ã  la hauteur prÃ©vue.",
    "DÃ©placements nÃ©cessaires pendant lâ€™intervention.",
    "Repli et rangement du matÃ©riel en fin de travaux.",
  ],
  {
    conditions:
      "Pour intervention intÃ©rieure sur sol stable et dÃ©gagÃ©, avec Ã©chafaudage roulant ou Ã©quipement Ã©quivalent. Hors location ou fourniture du matÃ©riel, nacelle, montage complexe, protection renforcÃ©e du sol et intervention au-dessus dâ€™un vide.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "logistique",
      "accÃ¨s",
      "hauteur",
      "Ã©chafaudage roulant",
      "travail en hauteur",
      "intÃ©rieur",
    ],
  }
),


// ================= CLOISONS / PLACO - COMPLEMENTS =================

p(
  "MAC-CLOISON-CARREAUX-PLATRE",
  "MaÃ§onnerie lÃ©gÃ¨re",
  "CrÃ©ation dâ€™une cloison en carreaux de plÃ¢tre",
  "mÂ²",
  1.05,
  [
  "Implantation et traÃ§age de la cloison ; prÃ©paration des liaisons avec les supports existants.",
  "Montage des carreaux de plÃ¢tre avec liant adaptÃ© ; rÃ©alisation des dÃ©coupes et ajustements courants.",
  "CrÃ©ation des rÃ©servations prÃ©vues au devis ; dressage et prÃ©paration courante des raccords avant finition.",
],
  {
    conditions:
      "Surface calculÃ©e sur une face de cloison finie. Ã‰paisseur et type de carreaux Ã  adapter au chantier. Hors fourniture, bloc-porte, dÃ©pose de lâ€™existant, Ã©vacuation des gravats, reprise structurelle, rÃ©seaux intÃ©grÃ©s, ratissage gÃ©nÃ©ralisÃ© et peinture. Pour une sÃ©paration de logement vers palier ou partie commune, la composition retenue doit Ãªtre compatible avec les exigences applicables au bÃ¢timent.",
    rentabilite: "ðŸŸ  Ã€ contrÃ´ler",
    tags: [
      "maÃ§onnerie",
      "cloison",
      "carreau de plÃ¢tre",
      "carreaux de plÃ¢tre",
      "Promonta",
      "caroplatre",
      "sÃ©paration",
      "mur intÃ©rieur",
    ],
  }
),

p("PLAC-CLOISON-DEPOSE",
"Placo",
"DÃ©pose dâ€™une cloison lÃ©gÃ¨re existante",
"mÂ²",
0.3,
[
  "Protection de la zone dâ€™intervention ; dÃ©pose mÃ©thodique de la cloison existante.",
  "Retrait des Ã©lÃ©ments de fixation accessibles.",
  "Regroupement des Ã©lÃ©ments dÃ©posÃ©s et gravats.",
],
{ conditions:
"Pour cloison lÃ©gÃ¨re non porteuse de type carreaux de plÃ¢tre, Promonta ou plaques de plÃ¢tre. Hors dÃ©pose de bloc-porte, Ã©vacuation en dÃ©chÃ¨terie, dÃ©samiantage, reprise structurelle et rÃ©seaux intÃ©grÃ©s.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["cloison","dÃ©pose","dÃ©molition","carreaux de plÃ¢tre","Promonta","placo"]
}),

p("PLAC-CLOISON-BA13",
"Placo",
"CrÃ©ation dâ€™une cloison sur ossature mÃ©tallique avec plaques de plÃ¢tre",
"mÂ²",
0.8,
[
  "Implantation et traÃ§age de la cloison ; pose des rails et montants mÃ©talliques.",
  "Mise en place des renforts courants nÃ©cessaires ; dÃ©coupe et pose des plaques de plÃ¢tre sur les deux faces.",
  "RÃ©alisation des ajustements pÃ©riphÃ©riques.",
],
{ conditions:
"Surface calculÃ©e sur une face de cloison finie, plaques sur les deux faces comprises. Hors isolant, bandes et enduits, peinture, renfort spÃ©cifique pour charge lourde et crÃ©ation ou modification de rÃ©seaux.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["placo","cloison","BA13","ossature mÃ©tallique","crÃ©ation"]
}),

p("PLAC-CLOISON-RENFORT-PORTE",
"Placo",
"Renforcement dâ€™une cloison pour intÃ©gration dâ€™un bloc-porte",
"u",
1.5,
[
  "Implantation de lâ€™ouverture ; renforcement de lâ€™ossature au droit du bloc-porte.",
  "CrÃ©ation du chevÃªtre et des montants nÃ©cessaires.",
  "ContrÃ´le de lâ€™aplomb et des dimensions de rÃ©servation.",
],
{ conditions:
"Pour intÃ©gration dâ€™un bloc-porte courant dans une cloison lÃ©gÃ¨re neuve. Hors fourniture et pose du bloc-porte.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["placo","cloison","porte","bloc-porte","renfort","chevÃªtre"]
}),


p("PLAC-CLOISON-SEPARATIVE-RENF",
"Placo",
"CrÃ©ation dâ€™une cloison sÃ©parative renforcÃ©e sur ossature mÃ©tallique",
"mÂ²",
1.15,
[
  "Implantation et traÃ§age de la cloison ; pose dâ€™une ossature mÃ©tallique renforcÃ©e adaptÃ©e Ã  la configuration.",
  "Mise en place dâ€™un isolant dans lâ€™ossature ; pose de parements adaptÃ©s sur les deux faces.",
  "DÃ©coupes et ajustements pÃ©riphÃ©riques ; traitement courant des raccords avec les supports existants.",
],
{ conditions:
"Surface calculÃ©e sur une face de cloison finie, parements sur les deux faces et isolant compris. Prestation destinÃ©e notamment aux sÃ©parations entre un logement et une circulation, un palier ou une partie commune. Composition exacte des parements, de lâ€™isolant et de lâ€™ossature Ã  adapter aux exigences applicables au bÃ¢timent, notamment acoustiques et de rÃ©sistance au feu. Hors bandes et enduits de finition, peinture, bloc-porte, renfort spÃ©cifique de bloc-porte, modification de rÃ©seaux et travaux structurels.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["placo","cloison","sÃ©parative","renforcÃ©e","logement","palier","partie commune","acoustique","feu","isolation"]
}),

// ================= BRICOLAGE / MENUISERIE LEGERE - COMPLEMENTS =================
p("BRI-BLOC-PORTE-DEPOSE",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"DÃ©pose soignÃ©e dâ€™un bloc-porte existant Ã  conserver",
"u",
1.5,
[
  "Protection de la zone dâ€™intervention ; dÃ©pose de lâ€™ouvrant.",
  "DÃ©pose soigneuse de lâ€™huisserie ou du dormant ; retrait des fixations accessibles.",
  "Stockage provisoire des Ã©lÃ©ments conservÃ©s.",
],
{ conditions:
"Pour bloc-porte existant destinÃ© Ã  Ãªtre reposÃ©. Hors rÃ©paration importante, remplacement du bloc-porte et dÃ©molition de la cloison.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["porte","bloc-porte","dÃ©pose","huisserie","conservation"]
}),

p("BRI-BLOC-PORTE-REPOSE",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Repose et rÃ©glage dâ€™un bloc-porte existant",
"u",
2,
[
  "Mise en place du bloc-porte conservÃ© ; contrÃ´le de lâ€™aplomb, du niveau et des jeux.",
  "Fixation adaptÃ©e au support ; repose de lâ€™ouvrant.",
  "RÃ©glage et essais de fonctionnement.",
],
{ conditions:
"Pour repose dâ€™un bloc-porte existant en Ã©tat compatible avec sa rÃ©utilisation. Hors rÃ©paration importante du bloc-porte, fourniture de quincaillerie et reprises importantes du support.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["porte","bloc-porte","repose","huisserie","rÃ©glage"]
}),

p("BRI-POIGNEE-FENETRE-REMPL",
"Bricolage / Menuiserie lÃ©gÃ¨re",
"Remplacement dâ€™une poignÃ©e de fenÃªtre",
"u",
0.5,
[
  "DÃ©pose de la poignÃ©e existante ; contrÃ´le de la fixation et du mÃ©canisme accessible.",
  "Pose de la nouvelle poignÃ©e.",
  "RÃ©glage et essai de fonctionnement.",
],
{ conditions:
"Pour remplacement simple dâ€™une poignÃ©e compatible avec la menuiserie existante. Hors remplacement ou rÃ©paration du mÃ©canisme de fermeture.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["fenÃªtre","poignÃ©e","remplacement","quincaillerie"]
}),

// ================= SOLS - COMPLEMENT =================
p("SOL-SEUIL-PORTE",
"Sols",
"Pose dâ€™une barre de seuil",
"u",
0.5,
[
  "Prise de mesure et repÃ©rage ; dÃ©coupe de la barre de seuil.",
  "Pose et fixation adaptÃ©es au support.",
  "ContrÃ´le et finitions courantes.",
],
{ conditions:
"Pour barre de seuil droite de dimensions courantes. Hors reprise importante du sol ou diffÃ©rence de niveau nÃ©cessitant un profil spÃ©cifique.",
rentabilite:
"ðŸŸ  Ã€ contrÃ´ler",
tags:
["sol","seuil","barre de seuil","inox","porte"]
}),

];