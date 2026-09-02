"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { jsPDF } from "jspdf";

import {
  TARIFS_PRESTATIONS as TARIFS_PRESTATIONS_BASE,
  DETAILS_PDF_PAR_CATEGORIE,
} from "../data/TARIFS_PRESTATIONS";

import { supabase } from "./lib/supabaseClient";

const VERSION_APPLICATION = "V25";
const CLE_SAUVEGARDE_V25 = "tableauDeBordEntrepriseV25";
const CLE_SAUVEGARDE_V24 = "tableauDeBordEntrepriseV24";
const CLE_BACKUPS_V25 = "backupHistoriqueV25";
const CLE_BACKUPS_V24 = "backupHistoriqueV24";

// Le catalogue officiel est lâ€™unique source des temps, tarifs, unitÃ©s et dÃ©tails PDF.
// Les packs ne conservent que des identifiants et des quantitÃ©s de dÃ©part.
// Toute modification dâ€™une prestation du catalogue actualise donc automatiquement les packs.
const TARIFS_PRESTATIONS = TARIFS_PRESTATIONS_BASE;

const PACKS_PRESTATIONS_V25 = [
  {
    id: "PACK-SDB-DOUCHE",
    nom: "RÃ©fection dâ€™un espace douche",
    description:
      "DÃ©pose de la paroi et de la faÃ¯ence, reprise du support, protection Ã  lâ€™eau, faÃ¯ence et finitions.",
    lignes: [
      ["PEINT-PROT", 1],
      ["PLOMB-PAROI-DEP", 1],
      ["CAR-DEPOSE", 1],
      ["CAR-PREP", 1],
      ["CAR-ETANCH", 1],
      ["CAR-FAIENCE", 1],
      ["CAR-JOINT", 1],
      ["CAR-SILICONE", 1],
      ["PLOMB-PAROI-POS", 1],
      ["DEB-DECHETTERIE", 1],
      ["NET-FIN-CHANTIER", 1],
    ] as [string, number][],
  },
  {
    id: "PACK-SDB-RENOVATION",
    nom: "RÃ©novation complÃ¨te dâ€™une salle de bain",
    description:
      "Base complÃ¨te : dÃ©poses, douche, faÃ¯ence, sol PVC, peintures, meuble vasque et finitions.",
    lignes: [
      ["PEINT-PROT", 1],
      ["PLOMB-PAROI-DEP", 1],
      ["PLOMB-DEPOSE-EQP", 1],
      ["CAR-DEPOSE", 1],
      ["DEB-DECHETTERIE", 1],
      ["CAR-PREP", 1],
      ["PLOMB-REC-DCH", 1],
      ["CAR-ETANCH", 1],
      ["CAR-FAIENCE", 1],
      ["CAR-JOINT", 1],
      ["CAR-SILICONE", 1],
      ["SOL-PREP-MECA", 1],
      ["SOL-PVC-CLIP", 1],
      ["SOL-PLINTHE-BOIS", 1],
      ["PEINT-PREP-RENF", 1],
      ["PEINT-MURS-2C", 1],
      ["PEINT-PLAFOND-2C", 1],
      ["PLOMB-MEUBLE-VASQUE", 1],
      ["PLOMB-ROBINET", 1],
      ["PLOMB-PAROI-POS", 1],
      ["NET-FIN-CHANTIER", 1],
    ] as [string, number][],
  },
  {
    id: "PACK-PEINT-PIECE",
    nom: "Remise en peinture complÃ¨te dâ€™une piÃ¨ce",
    description:
      "Protection, prÃ©paration lÃ©gÃ¨re, deux couches sur murs et plafond, joints acryliques et nettoyage.",
    lignes: [
      ["PEINT-PROT", 1],
      ["PEINT-PREP-LEG", 1],
      ["PEINT-MURS-2C", 1],
      ["PEINT-PLAFOND-2C", 1],
      ["PEINT-ACRYLIQUE", 1],
      ["NET-FIN-CHANTIER", 1],
    ] as [string, number][],
  },
  {
    id: "PACK-SOL-PVC",
    nom: "Pose complÃ¨te dâ€™un sol PVC clipsable",
    description:
      "DÃ©pose Ã©ventuelle, prÃ©paration du support, sous-couche, sol PVC, plinthes et nettoyage.",
    lignes: [
      ["SOL-DEPOSE", 1],
      ["SOL-PREP-MECA", 1],
      ["SOL-SOUS-COUCHE", 1],
      ["SOL-PVC-CLIP", 1],
      ["SOL-PLINTHE-BOIS", 1],
      ["NET-FIN-CHANTIER", 1],
    ] as [string, number][],
  },
  {
    id: "PACK-BOITES-LETTRES",
    nom: "Remplacement dâ€™un bloc de boÃ®tes aux lettres",
    description:
      "DÃ©pose du bloc, prÃ©paration de la rÃ©servation, pose des boÃ®tes, scellement et Ã©vacuation.",
    lignes: [
      ["BRI-BAL-DEPOSE-BLOC", 1],
      ["BRI-BAL-PREP", 1],
      ["BRI-BAL-POSE", 1],
      ["BRI-BAL-FIN-MAC", 1],
      ["DEB-DECHETTERIE", 1],
      ["NET-FIN-CHANTIER", 1],
    ] as [string, number][],
  },
  {
    id: "PACK-SOUS-FACE-PVC",
    nom: "Remplacement dâ€™une sous-face par du lambris PVC",
    description:
      "DÃ©pose complÃ¨te de lâ€™habillage existant, pose du PVC, Ã©vacuation et nettoyage.",
    lignes: [
      ["TOIT-HAB-DEPOSE-COMP", 1],
      ["TOIT-HAB-PVC", 1],
      ["DEB-DECHETTERIE", 1],
      ["NET-FIN-CHANTIER", 1],
    ] as [string, number][],
  },
  {
    id: "PACK-JARDIN-REMISE-ETAT",
    nom: "Remise en Ã©tat dâ€™un jardin",
    description:
      "Entretien global dâ€™un espace vert laissÃ© sans entretien, avec nettoyage et Ã©vacuation.",
    lignes: [
      ["JAR-REMISE-ETAT", 1],
      ["JAR-EVAC", 1],
    ] as [string, number][],
  },
  {
    id: "PACK-LOGEMENT-RELOCATION",
    nom: "Remise en Ã©tat dâ€™un logement avant relocation",
    description:
      "Base adaptable : dÃ©barras, peinture, rÃ©novation du sol et nettoyage gÃ©nÃ©ral du logement.",
    lignes: [
      ["DEB-ENCOMBRANTS", 1],
      ["DEB-DECHETTERIE", 1],
      ["PEINT-PROT", 1],
      ["PEINT-PREP-LEG", 1],
      ["PEINT-MURS-2C", 1],
      ["PEINT-PLAFOND-2C", 1],
      ["SOL-DEPOSE", 1],
      ["SOL-PREP-MECA", 1],
      ["SOL-PVC-CLIP", 1],
      ["SOL-PLINTHE-BOIS", 1],
      ["NET-LOGEMENT", 1],
    ] as [string, number][],
  },
];

const formatDateInputVersFr = (dateIso: string) => {
  if (!dateIso) return "";

  const [annee, mois, jour] = dateIso.split("-");
  return `${jour}/${mois}/${annee}`;
};

const formatDateFrVersInput = (dateFr: string) => {
  if (!dateFr) return "";

  if (dateFr.includes("-")) return dateFr;

  const [jour, mois, annee] = dateFr.split("/");
  if (!jour || !mois || !annee) return "";

  return `${annee}-${mois.padStart(2, "0")}-${jour.padStart(2, "0")}`;
};

const trouverPrestationDepuisTableau = (nomPrestation: string) => {
  return TARIFS_PRESTATIONS.find((item: any) => {
    const libelle = item.prestation || item.nom || "";
    return libelle === nomPrestation || item.id === nomPrestation;
  });
};

const getNomPrestation = (prestation: any) => {
  return prestation.prestation || prestation.nom || "";
};

const getPrixPrestation = (prestation: any, modeClient: string) => {
  if (!prestation) return 0;

  // ================= TARIF NORMAL =================
  // CompatibilitÃ© ancien + nouveau catalogue.
  let prixNormal = Number(
    prestation.prix220 ??
    prestation.prixMo220 ??
    prestation.prixNormal ??
    0
  );

  // SÃ©curitÃ© :
  // si aucun prix n'est stockÃ© mais qu'un temps existe,
  // calcul automatique sur la base 220 â‚¬ / journÃ©e de 7 h.
  if (
    (!prixNormal || prixNormal <= 0) &&
    Number(prestation.heuresUnite || 0) > 0
  ) {
    prixNormal =
      Number(prestation.heuresUnite || 0) * (220 / 7);
  }

  prixNormal = Math.round(prixNormal * 100) / 100;

  // ================= CLIENT NORMAL =================
  if (modeClient !== "jeremie") {
    return prixNormal;
  }

  // ================= DEPLACEMENT =================
  // Aucun coefficient JÃ©rÃ©mie sur les frais de dÃ©placement.
  if (
    prestation.typeTravaux === "deplacement" ||
    prestation.categorie === "DÃ©placement / logistique"
  ) {
    return prixNormal;
  }

  // ================= JEREMIE =================
  // 190 â‚¬/jour au lieu de 220 â‚¬/jour.
  return Math.round(prixNormal * (190 / 220) * 100) / 100;
};

const parseDateFr = (date: string) => {
  if (!date) return null;

  if (date.includes("/")) {
    const [jour, mois, annee] = date.split("/");
    return new Date(Number(annee), Number(mois) - 1, Number(jour));
  }

  if (date.includes("-")) {
    const [annee, mois, jour] = date.split("-");
    return new Date(Number(annee), Number(mois) - 1, Number(jour));
  }

  return null;
};

type LigneTravaux = {
  id: number;
  type: string;
  q1: number;
  q2: number;
  r1: number;
  r2: number;
  option: number;

  tarifId?: string;
  prestationNom?: string;
  unite?: string;
  prixUnitaire?: number;
  prixUnitaireAuto?: number;
  prixManuel?: boolean;
  heuresUnite?: number;
heuresUniteManuel?: boolean;
  detailsPdfPersonnalises?: string[];
  detailsPdfOuvert?: boolean;

  offert?: boolean;
};

type Depense = {
  id: number;
  date: string;
  categorie: string;
  description: string;
  montant: number;
  modePaiement: string;
};

type TypeEvenement = "devis" | "rdv" | "chantier" | "rappel";

type Dossier = {
  id: number;

  // ================= TYPE DE DOSSIER / EVENEMENT =================
  typeEvenement?: TypeEvenement;

  // ================= CLIENT =================
  client: string;
  telephone: string;
  email: string;
  adresse: string;
  adresseAgence: string;
  complementAdresse: string;
  notes: string;
  modeClient: string;

  clientFinalNom?: string;
  clientFinalTelephone?: string;
  clientFinalAdresse?: string;

  locataire: string;
  telephoneLocataire: string;
  proprietaire: string;
  telephoneProprietaire: string;
  agence: string;
  referenceChantier: string;

  // ================= DEVIS / FACTURE =================
  lignesTravaux: LigneTravaux[];
  numeroDevis: string;
  numeroFacture: string;
  estBrouillonAuto?: boolean;
  total: number;
  acompte: number;
  reste: number;

  // Montant total encaissÃ© actuellement sur le dossier
  montantEncaisse?: number;

  // MÃ©moire sÃ©parÃ©e de l'acompte rÃ©ellement reÃ§u
  montantAcompteEncaisse?: number;

  pourcentageAcompte?: number;
  facturePayee: boolean;

  statutDevis: string;
  statutChantier: string;

  factureSap?: boolean;
  numeroSap?: string;

  // ================= DATES =================
  date: string;
  dateChantier?: string;
  heureChantier?: string;

  // Planning chantier multi-jours libres :
  // exemple : lundi mardi Eiffes, mercredi Blanc, jeudi vendredi Eiffes
  planningChantier?: string[];

  dateRdv?: string;
  heureRdv?: string;
  motifRdv?: string;
  typeRdv?: string;
  observationRdv?: string;

  // Date du dernier paiement / paiement complet
  datePaiement?: string;

  // Date rÃ©elle Ã  laquelle l'acompte a Ã©tÃ© reÃ§u
  dateAcompte?: string;

  // ================= RAPPELS =================
  dateRappel?: string;
  heureRappel?: string;
  texteRappel?: string;

  // ================= FOURNITURES / DEPLACEMENT =================
  kmAller?: number;
  fraisDeplacementManuelActif?: boolean;
fraisDeplacementManuel?: number;
  achatFournitures?: number;
  coefficientFournitures?: number;
  fournituresClient?: boolean;
  detailsFournitures?: string;
  reventeFournitures?: number;
  margeFournitures?: number;

  priorite?: string;
};

const prestations = TARIFS_PRESTATIONS;

const categories = Array.from(
  new Set(prestations.map((p) => p.categorie))
);

const getPrestationsByCategorie = (categorie: string) => {
  return prestations.filter((p) => p.categorie === categorie);
};

const calculerPrix = (prestation: any, quantite: number) => {
  if (prestation.unite === "mÂ²") return prestation.prix220 * quantite;
  if (prestation.unite === "ml") return prestation.prix220 * quantite;
  if (prestation.unite === "h") return prestation.prix220 * quantite;
  if (prestation.unite === "u") return prestation.prix220 * quantite;
  if (prestation.unite === "mÂ³") return prestation.prix220 * quantite;

  if (prestation.unite === "forfait") return prestation.prix220;

  return 0;
};

const calculerTemps = (prestation: any, quantite: number) => {
  return prestation.heuresUnite * quantite;
};

const typesTravaux = [
  ["plafond", "Plafond dÃ©gÃ¢t des eaux"],
  ["peinture", "Peinture murs / plafonds"],
  ["parquet", "Parquet / sol PVC"],
  ["cuisine", "Cuisine simple"],
  ["wc", "WC / petite plomberie"],
  ["vmc", "VMC simple flux"],
  ["placo", "Placo / doublage lÃ©ger"],
  ["gouttiere", "GouttiÃ¨re / descente"],
];

const clientsBase = [
  {
  nom: "SAS Meurisse Couverture",
  telephone: "06 50 95 10 89",
  email: "meurissecouverture@gmail.com",
  adresse: "7 route de la Jasse 31250 Revel",
  adresseAgence: "",
  complementAdresse: "",
  notes:
    "Sous-traitance JÃ©rÃ©mie â€” base 190 â‚¬/jour â€” hors fournitures.\n\nMail : contact.meurissecouverture@gmail.com     Tel secrÃ©tariat: 05 64 72 22 98",
  modeClient: "jeremie",
  agence: "",
},
  {
    nom: "Tony Ferreira",
    telephone: "06 66 40 71 32",
    email: "t.ferreira1988@gmail.com",
    adresse: "Naves",
    adresseAgence: "",
    complementAdresse: "",
    notes: "Particulier â€” ami proche â€” aime le travail parfait.",
    modeClient: "normal",
    agence: "",
  },
  {
  nom: "Patrimoine Occitan",
  telephone: "06 76 04 77 19",
  email: "gestion@patrimoine-occitan.fr",
  adresse: "",
  adresseAgence: "PO, 1 Gal du Midi - 31250 Revel",
  complementAdresse: "",
  agence: "Patrimoine Occitan",
  notes: "05 61 27 72 77 Agence Patrimoine Occitan â€” devis serrÃ©s et rapides.",
  modeClient: "agence",
},
  {
    nom: "Karine - Foncia",
    telephone: "07 84 51 78 21",
    email: "karine.ceresoli@foncia.com",
    adresse: "Castres",
    adresseAgence: "34 Bd des docteurs Sicard - 81100 Castres",
    complementAdresse: "",
    agence: "Foncia",
    notes: "05 63 71 81 31 Agence Foncia â€” Ãªtre rÃ©actif sur devis et travaux.",
    modeClient: "agence",
  },
];
type ClientEnregistre = {
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  adresseAgence: string;
  complementAdresse: string;
  notes: string;
  modeClient: string;
  agence?: string;
};
function normaliserTexte(valeur: string) {
  return valeur
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normaliserTelephone(valeur: string) {
  return valeur.replace(/\D/g, "");
}
function formatTelephone(valeur: string) {
  const chiffres = valeur.replace(/\D/g, "").slice(0, 10);

  return chiffres.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}
function formatNumero(prefix: string, numero: number) {
  return `${prefix}-2026-${String(numero).padStart(3, "0")}`;
}

// NumÃ©ros de dÃ©part validÃ©s au 02/09/2026.
// Math.max empÃªche une ancienne sauvegarde locale ou cloud de faire reculer
// les compteurs, tout en conservant automatiquement une valeur plus Ã©levÃ©e.
const PROCHAIN_NUMERO_DEVIS = 36;
const PROCHAIN_NUMERO_FACTURE = 17;

function compteurDevisValide(valeur: unknown) {
  const numero = Number(valeur);
  return Number.isFinite(numero)
    ? Math.max(PROCHAIN_NUMERO_DEVIS, Math.trunc(numero))
    : PROCHAIN_NUMERO_DEVIS;
}

function compteurFactureValide(valeur: unknown) {
  const numero = Number(valeur);
  return Number.isFinite(numero)
    ? Math.max(PROCHAIN_NUMERO_FACTURE, Math.trunc(numero))
    : PROCHAIN_NUMERO_FACTURE;
}

function nomTravaux(type: string) {
  return typesTravaux.find((t) => t[0] === type)?.[1] || "Travaux";
}

function champsTravaux(type: string) {
  if (type === "peinture") return ["Murs mÂ²", "Plafonds mÂ²", "Reprises mÂ²", "Joints ml", "Portes/finitions"];
  if (type === "plafond") return ["Plafond 1 mÂ²", "Plafond 2 mÂ²", "TÃ¢ches mÂ²", "Bande ml", "Placo mÂ²"];
  if (type === "parquet") return ["Sol mÂ²", "Plinthes ml", "Seuils", "PrÃ©pa support", "DÃ©pose mÂ²"];
  if (type === "cuisine") return ["Ã‰lÃ©ments", "Plan travail ml", "DÃ©coupes", "Ã‰lectromÃ©nager", "Raccords"];
  if (type === "wc") return ["Intervention", "Support", "Raccords", "Silicone", "DÃ©pose"];
  if (type === "vmc") return ["Groupe VMC", "Bouches", "Gaines ml", "Ã‰lectricitÃ©", "Test"];
  if (type === "placo") return ["Placo mÂ²", "Bandes ml", "Isolation mÂ²", "DÃ©coupes", "DÃ©pose"];
  if (type === "gouttiere") return ["GouttiÃ¨re ml", "Descente ml", "Coudes", "DÃ©pose", "AccÃ¨s"];
  return ["Q1", "Q2", "R1", "R2", "Option"];
}
function detailsTravaux(ligne: LigneTravaux): string[] {
  if (
    ligne.detailsPdfPersonnalises &&
    ligne.detailsPdfPersonnalises.length > 0 &&
    ligne.detailsPdfPersonnalises.some((d) => d.trim() !== "")
  ) {
    return ligne.detailsPdfPersonnalises.filter((d) => d.trim() !== "");
  }

  const tarifAssocie = TARIFS_PRESTATIONS.find(
    (t) => t.id === ligne.tarifId
  );

  if (tarifAssocie?.detailsPdf && tarifAssocie.detailsPdf.length > 0) {
    return tarifAssocie.detailsPdf;
  }

  if (tarifAssocie?.categorie && DETAILS_PDF_PAR_CATEGORIE[tarifAssocie.categorie]) {
    return DETAILS_PDF_PAR_CATEGORIE[tarifAssocie.categorie];
  }

  const d: string[] = [];

  if (ligne.type === "peinture") {
    if (ligne.q1 > 0) d.push("PrÃ©paration et peinture des murs");
    if (ligne.q2 > 0) d.push("PrÃ©paration et peinture des plafonds");
    if (ligne.r1 > 0) d.push("Reprises localisÃ©es et enduits");
    if (ligne.r2 > 0) d.push("RÃ©alisation des joints acryliques");
    if (ligne.option > 0) d.push("Finitions complÃ©mentaires");
  }

  if (ligne.type === "plafond") {
    if (ligne.q1 > 0) d.push("PrÃ©paration et peinture plafond zone 1");
    if (ligne.q2 > 0) d.push("PrÃ©paration et peinture plafond zone 2");
    if (ligne.r1 > 0) d.push("Traitement des taches visibles");
    if (ligne.r2 > 0) d.push("Reprise de bande Ã  joint");
    if (ligne.option > 0) d.push("Reprise placo localisÃ©e");
  }

  if (ligne.type === "parquet") {
    if (ligne.q1 > 0) d.push("Pose du revÃªtement de sol prÃ©vu");
    if (ligne.q2 > 0) d.push("Pose des plinthes");
    if (ligne.r1 > 0) d.push("Pose des seuils");
    if (ligne.r2 > 0) d.push("PrÃ©paration du support");
    if (ligne.option > 0) d.push("DÃ©pose de lâ€™ancien revÃªtement");
  }

  if (ligne.type === "cuisine") {
    if (ligne.q1 > 0) d.push("Pose des Ã©lÃ©ments de cuisine");
    if (ligne.q2 > 0) d.push("Pose du plan de travail");
    if (ligne.r1 > 0) d.push("DÃ©coupes techniques prÃ©vues");
    if (ligne.r2 > 0) d.push("Mise en place Ã©lectromÃ©nager");
    if (ligne.option > 0) d.push("Raccordements simples");
  }

  if (ligne.type === "wc") {
    if (ligne.q1 > 0) d.push("Intervention sur WC");
    if (ligne.q2 > 0) d.push("Reprise du support de fixation");
    if (ligne.r1 > 0) d.push("Raccordements accessibles");
    if (ligne.r2 > 0) d.push("Joint silicone");
    if (ligne.option > 0) d.push("DÃ©pose ancien Ã©quipement");
  }

  if (ligne.type === "vmc") {
    if (ligne.q1 > 0) d.push("Pose ou remplacement du groupe VMC");
    if (ligne.q2 > 0) d.push("Pose des bouches prÃ©vues");
    if (ligne.r1 > 0) d.push("Passage ou raccordement des gaines");
    if (ligne.r2 > 0) d.push("Raccordement Ã©lectrique simple");
    if (ligne.option > 0) d.push("Mise en service et test");
  }

  if (ligne.type === "placo") {
    if (ligne.q1 > 0) d.push("Pose ou reprise placo");
    if (ligne.q2 > 0) d.push("Bandes et joints");
    if (ligne.r1 > 0) d.push("Isolation prÃ©vue");
    if (ligne.r2 > 0) d.push("DÃ©coupes et ajustements");
    if (ligne.option > 0) d.push("DÃ©pose partielle");
  }

  if (ligne.type === "gouttiere") {
    if (ligne.q1 > 0) d.push("Pose de gouttiÃ¨re");
    if (ligne.q2 > 0) d.push("Pose de descente");
    if (ligne.r1 > 0) d.push("Raccords et coudes");
    if (ligne.r2 > 0) d.push("DÃ©pose ancienne installation");
    if (ligne.option > 0) d.push("AccÃ¨s et travail en hauteur");
  }

  if (d.length > 0) return d;

  return [
    "RÃ©alisation de la prestation prÃ©vue au devis",
    "Ajustements simples",
    "Finitions standards",
    "Nettoyage de fin dâ€™intervention",
  ];
}
function prixLigne(ligne: LigneTravaux, modeClient: string) {
  const c = modeClient === "jeremie" ? 190 / 220 : 1;

  if (ligne.type === "peinture") {
    return Math.round(ligne.q1 * 9 * c + ligne.q2 * 12 * c + ligne.r1 * 18 * c + ligne.r2 * 2.5 * c + ligne.option * 20 * c);
  }

  if (ligne.type === "plafond") {
    return Math.round(ligne.q1 * 18 * c + ligne.q2 * 18 * c + ligne.r1 * 40 * c + ligne.r2 * 18 * c + ligne.option * 130 * c);
  }

  if (ligne.type === "parquet") {
    return Math.round(ligne.q1 * 18 * c + ligne.q2 * 8 * c + ligne.r1 * 20 * c + ligne.r2 * 40 * c + ligne.option * 8 * c);
  }

  if (ligne.type === "cuisine") {
    return Math.round(ligne.q1 * 70 * c + ligne.q2 * 70 * c + ligne.r1 * 35 * c + ligne.r2 * 45 * c + ligne.option * 35 * c);
  }

  if (ligne.type === "wc") {
    return Math.round(ligne.q1 * 180 * c + ligne.q2 * 80 * c + ligne.r1 * 35 * c + ligne.r2 * 8 * c + ligne.option * 45 * c);
  }

  if (ligne.type === "vmc") {
    return Math.round(ligne.q1 * 180 * c + ligne.q2 * 45 * c + ligne.r1 * 12 * c + ligne.r2 * 60 * c + ligne.option * 45 * c);
  }

  if (ligne.type === "placo") {
    return Math.round(ligne.q1 * 45 * c + ligne.q2 * 12 * c + ligne.r1 * 18 * c + ligne.r2 * 25 * c + ligne.option * 60 * c);
  }

  if (ligne.type === "gouttiere") {
    return Math.round(ligne.q1 * 28 * c + ligne.q2 * 35 * c + ligne.r1 * 20 * c + ligne.r2 * 35 * c + ligne.option * 80 * c);
  }

  return 0;
}
function montantLigne(ligne: LigneTravaux, modeClient: string) {
  if (ligne.offert) {
    return 0;
  }

  if (ligne.prixUnitaire) {
    return Math.round(ligne.prixUnitaire * (ligne.q1 || 1));
  }

  return prixLigne(ligne, modeClient);
}
  export default function Home() {
   const restaurerBackup = (index: number) => {
  const backups = JSON.parse(
    localStorage.getItem(CLE_BACKUPS_V25) ||
      localStorage.getItem(CLE_BACKUPS_V24) ||
      "[]"
  );

  const sauvegarde = backups[index];
  if (!sauvegarde) return;

  const d = sauvegarde.data;

  setHistorique(d.historique || []);
  setDepenses(d.depenses || []);
  setClientsEnregistres(d.clientsEnregistres || clientsBase);
  setCompteurDevis(compteurDevisValide(d.compteurDevis));
  setCompteurFacture(compteurFactureValide(d.compteurFacture));
  setNumeroDevis(d.numeroDevis || "");
setNumeroFacture(d.numeroFacture || "");

setFactureSap(d.factureSap || false);
setNumeroSap(d.numeroSap || "");


  setMoisSelectionne(d.moisSelectionne ?? new Date().getMonth());
  setAnneeSelectionnee(d.anneeSelectionnee ?? new Date().getFullYear());

  if (d.brouillon) {
    const b = d.brouillon;

    setIdDossierActuel(b.idDossierActuel ?? null);
    setClient(b.client || "");
    setTelephone(b.telephone || "");
    setEmail(b.email || "");
    setAdresse(b.adresse || "");
    setAdresseAgence(b.adresseAgence || "");
    setNotes(b.notes || "");
    setModeClient(b.modeClient || "normal");
    setClientFinalNom(b.clientFinalNom || "");
setClientFinalTelephone(b.clientFinalTelephone || "");
setClientFinalAdresse(b.clientFinalAdresse || "");

setKmAller(b.kmAller ?? 0);
setFraisDeplacementManuelActif(b.fraisDeplacementManuelActif ?? false);
setFraisDeplacementManuel(b.fraisDeplacementManuel ?? 0);

setAchatFournitures(b.achatFournitures ?? 0);
setCoefficientFournitures(b.coefficientFournitures ?? 1.22);
setFournituresClient(b.fournituresClient ?? true);
setDetailsFournitures(b.detailsFournitures || "");
    setLignesTravaux(b.lignesTravaux || []);

    setMontantEncaisse(b.montantEncaisse ?? 0);

    setAcompteManuelActif(
  b.acompteManuelActif ?? false
);

setAcompteManuel(
  b.acompteManuel ?? 0
);

    setFactureSap(b.factureSap || false);
setNumeroSap(b.numeroSap || "");

    setDateChantier(b.dateChantier || "");
    setDatePaiement(b.datePaiement || "");
    setHeureChantier(b.heureChantier || "");
setDateRdv(b.dateRdv || "");
setHeureRdv(b.heureRdv || "");
setMotifRdv(b.motifRdv || "");
setTypeRdv(b.typeRdv || "visite");
    setPriorite(b.priorite || "normale");
    setStatutDevis(b.statutDevis || "envoye");
    setStatutChantier(b.statutChantier || "a_planifier");
    setFacturePayee(b.facturePayee || false);

    setLocataire(b.locataire || "");
    setTelephoneLocataire(b.telephoneLocataire || "");
    setProprietaire(b.proprietaire || "");
    setTelephoneProprietaire(b.telephoneProprietaire || "");
    setAgence(b.agence || "");
    setReferenceChantier(b.referenceChantier || "");
    setComplementAdresse(b.complementAdresse || "");
  }

  alert("âœ… Sauvegarde restaurÃ©e");
}; 
  
const appliquerSauvegardeComplete = (data: any) => {
  if (!data) return;

  setHistorique(data.historique || []);
  setDepenses(data.depenses || []);
  setClientsEnregistres(data.clientsEnregistres || clientsBase);

  setCompteurDevis(compteurDevisValide(data.compteurDevis));
  setCompteurFacture(compteurFactureValide(data.compteurFacture));

  setNumeroDevis(data.numeroDevis || "");
  setNumeroFacture(data.numeroFacture || "");

  setMoisSelectionne(data.moisSelectionne ?? new Date().getMonth());
  setAnneeSelectionnee(data.anneeSelectionnee ?? new Date().getFullYear());

  setRibTitulaire(data.ribTitulaire || "");
  setRibIban(data.ribIban || "");
  setRibBic(data.ribBic || "");
  setRibBanque(data.ribBanque || "");

  setFactureSap(data.factureSap || false);
  setNumeroSap(data.numeroSap || "");

  if (data.brouillon) {
    const b = data.brouillon;

    setIdDossierActuel(b.idDossierActuel ?? null);

    setClient(b.client || "");
    setTelephone(b.telephone || "");
    setEmail(b.email || "");
    setAdresse(b.adresse || "");
    setAdresseAgence(b.adresseAgence || "");
    setComplementAdresse(b.complementAdresse || "");
    setNotes(b.notes || "");

    setModeClient(b.modeClient || "normal");

    setClientFinalNom(b.clientFinalNom || "");
    setClientFinalTelephone(b.clientFinalTelephone || "");
    setClientFinalAdresse(b.clientFinalAdresse || "");

    setLignesTravaux(b.lignesTravaux || []);

    setKmAller(b.kmAller ?? 0);
    setFraisDeplacementManuelActif(b.fraisDeplacementManuelActif ?? false);
    setFraisDeplacementManuel(b.fraisDeplacementManuel ?? 0);

    setAchatFournitures(b.achatFournitures ?? 0);
    setCoefficientFournitures(b.coefficientFournitures ?? 1.22);
    setFournituresClient(b.fournituresClient ?? true);
    setDetailsFournitures(b.detailsFournitures || "");

    setMontantEncaisse(b.montantEncaisse ?? 0);
    setPourcentageAcompte(b.pourcentageAcompte ?? 30);

    setFactureSap(b.factureSap || false);
    setNumeroSap(b.numeroSap || "");

    setStatutDevis(b.statutDevis || "en_cours");
    setStatutChantier(b.statutChantier || "a_planifier");
    setFacturePayee(b.facturePayee || false);

    setDateChantier(b.dateChantier || "");
    setHeureChantier(b.heureChantier || "");
    setDatePaiement(b.datePaiement || "");

    setDateRdv(b.dateRdv || "");
    setHeureRdv(b.heureRdv || "");
    setMotifRdv(b.motifRdv || "");
    setTypeRdv(b.typeRdv || "visite");

    setPriorite(b.priorite || "normale");

    setLocataire(b.locataire || "");
    setTelephoneLocataire(b.telephoneLocataire || "");
    setProprietaire(b.proprietaire || "");
    setTelephoneProprietaire(b.telephoneProprietaire || "");

    setAgence(b.agence || "");
    setReferenceChantier(b.referenceChantier || "");
  }
};

const envoyerCloud = async () => {
  const data = construireSauvegardeComplete();

  const { error } = await supabase
    .from("dashboard_data")
    .upsert([
      {
        id: "global",
        data,
        updated_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    console.error("Erreur cloud :", error);
    alert("âŒ Erreur envoi cloud");
    return;
  }

  localStorage.setItem(CLE_SAUVEGARDE_V25, JSON.stringify(data));

  alert("âœ… DonnÃ©es complÃ¨tes envoyÃ©es au cloud");
};

const recupererCloud = async () => {
  const { data, error } = await supabase
    .from("dashboard_data")
    .select("*")
    .eq("id", "global")
    .single();

  if (error) {
    console.error("Erreur rÃ©cupÃ©ration :", error);
    alert("âŒ Erreur rÃ©cupÃ©ration cloud");
    return;
  }

  if (!data?.data) {
    alert("Aucune donnÃ©e cloud trouvÃ©e");
    return;
  }

  appliquerSauvegardeComplete(data.data);

  localStorage.setItem(
    CLE_SAUVEGARDE_V25,
    JSON.stringify(data.data)
  );

  alert("âœ… DonnÃ©es complÃ¨tes rÃ©cupÃ©rÃ©es depuis le cloud");
};

  const importRef = useRef<HTMLInputElement | null>(null);
const actionsRef = useRef<HTMLDivElement | null>(null);
const inputClientRef = useRef<HTMLInputElement | null>(null);
const ficheClientRef = useRef<HTMLDivElement | null>(null);
const lignesTravauxRef = useRef<HTMLDivElement | null>(null);
const derniereLigneRef = useRef<HTMLDivElement | null>(null);
  const [montantEncaisse, setMontantEncaisse] = useState(0);
const [datePaiement, setDatePaiement] = useState("");
const [saisieDateAcompteOuverte, setSaisieDateAcompteOuverte] = useState(false);
const [saisieDatePaiementCompletOuverte, setSaisieDatePaiementCompletOuverte] = useState(false);
const [dateChantier, setDateChantier] = useState("");
const [heureChantier, setHeureChantier] = useState("");
const [dateRdv, setDateRdv] = useState("");
const [heureRdv, setHeureRdv] = useState("");
const [motifRdv, setMotifRdv] = useState("");
const [typeRdv, setTypeRdv] = useState("visite");
  const [priorite, setPriorite] = useState("normale");
  const [historique, setHistorique] = useState<Dossier[]>([]);
  const [dateSelectionnee, setDateSelectionnee] = useState<Date | null>(null);
const [showPopupCalendrier, setShowPopupCalendrier] = useState(false);
const [ficheOuverte, setFicheOuverte] = useState(false);
const [rdvEnCours, setRdvEnCours] = useState<Dossier | null>(null);
const [ajoutRdvOuvert, setAjoutRdvOuvert] = useState(false);
  const [rechercheHistorique, setRechercheHistorique] = useState("");
  const [rechercheCalendrier, setRechercheCalendrier] = useState("");
const [clientsEnregistres, setClientsEnregistres] = useState<ClientEnregistre[]>(clientsBase);
  const [compteurDevis, setCompteurDevis] = useState(PROCHAIN_NUMERO_DEVIS);
  const [compteurFacture, setCompteurFacture] = useState(PROCHAIN_NUMERO_FACTURE);

  const [factureSap, setFactureSap] = useState(false);
const [numeroSap, setNumeroSap] = useState("");


// ================= RIB ENTREPRISE =================
const [ribTitulaire, setRibTitulaire] = useState("");
const [ribIban, setRibIban] = useState("");
const [ribBic, setRibBic] = useState("");
const [ribBanque, setRibBanque] = useState("");

  const [client, setClient] = useState("JÃ©rÃ©mie Meurisse");
  const [telephone, setTelephone] = useState("06 50 95 10 89");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("Revel");
  const [adresseAgence, setAdresseAgence] = useState("");
  const [complementAdresse, setComplementAdresse] = useState("");
  const [notes, setNotes] = useState("Sous-traitance JÃ©rÃ©mie â€” base 190 â‚¬/jour â€” hors fournitures.");
  const [locataire, setLocataire] = useState("");
const [telephoneLocataire, setTelephoneLocataire] = useState("");
const [proprietaire, setProprietaire] = useState("");
const [telephoneProprietaire, setTelephoneProprietaire] = useState("");
const [agence, setAgence] = useState("");
const [referenceChantier, setReferenceChantier] = useState("");

  const [modeClient, setModeClient] = useState("jeremie");
  const [clientFinalNom, setClientFinalNom] = useState("");
const [clientFinalTelephone, setClientFinalTelephone] = useState("");
const [clientFinalAdresse, setClientFinalAdresse] = useState("");

const [depenses, setDepenses] = useState<Depense[]>([]);
const [depenseDate, setDepenseDate] = useState(new Date().toLocaleDateString("fr-FR"));
const [depenseCategorie, setDepenseCategorie] = useState("Fournitures");
const [depenseDescription, setDepenseDescription] = useState("");
const [depenseMontant, setDepenseMontant] = useState(0);
const [depenseModePaiement, setDepenseModePaiement] = useState("CB");
const [prestationSelectionnee, setPrestationSelectionnee] = useState("");
const [categorieSelectionnee, setCategorieSelectionnee] = useState("");

const [recherchePrestation, setRecherchePrestation] = useState("");
const [packSelectionne, setPackSelectionne] = useState("");

const [afficherFavorisSeulement, setAfficherFavorisSeulement] =
  useState(false);

const [prestationsFavorites, setPrestationsFavorites] = useState<string[]>(
  []
);

const [numeroDevis, setNumeroDevis] = useState("");
const [numeroFacture, setNumeroFacture] = useState("");

  const [lignesTravaux, setLignesTravaux] = useState<LigneTravaux[]>([]);

const [idDossierActuel, setIdDossierActuel] = useState<number | null>(null);
  const [kmAller, setKmAller] = useState(37);
  const [fraisDeplacementManuelActif, setFraisDeplacementManuelActif] = useState(false);
const [fraisDeplacementManuel, setFraisDeplacementManuel] = useState(0);
  const [achatFournitures, setAchatFournitures] = useState(0);
  const [coefficientFournitures, setCoefficientFournitures] = useState(1.22);
  const [fournituresClient, setFournituresClient] = useState(true);
  const [detailsFournitures, setDetailsFournitures] = useState("");

  const [statutDevis, setStatutDevis] = useState("envoye");
  const [pourcentageAcompte, setPourcentageAcompte] = useState(30);
  const [acompteManuelActif, setAcompteManuelActif] = useState(false);
const [acompteManuel, setAcompteManuel] = useState(0);
  const [statutChantier, setStatutChantier] = useState("a_planifier");
  const [facturePayee, setFacturePayee] = useState(false);
  const today = new Date();

const [moisSelectionne, setMoisSelectionne] = useState(today.getMonth());
const [anneeSelectionnee, setAnneeSelectionnee] = useState(today.getFullYear());
const [sauvegardePrete, setSauvegardePrete] = useState(false);
const [sauvegardesOuvertes, setSauvegardesOuvertes] = useState(false);
const [detailsEncaissementsOuverts, setDetailsEncaissementsOuverts] = useState(false);
const [listeBackups, setListeBackups] = useState<any[]>([]);

useEffect(() => {
  if (!dateChantier) return;

  const dateChantierObj = parseDateFr(dateChantier);
  if (!dateChantierObj) return;

  const aujourdHui = new Date();

  const memeJour =
    dateChantierObj.getDate() === aujourdHui.getDate() &&
    dateChantierObj.getMonth() === aujourdHui.getMonth() &&
    dateChantierObj.getFullYear() === aujourdHui.getFullYear();

  if (memeJour && statutChantier !== "en_cours") {
    setStatutChantier("en_cours");
  }
}, [dateChantier, statutChantier]);

useEffect(() => {
  // Migration sans perte : au premier lancement de la V25, on reprend la
  // sauvegarde V24 si aucune sauvegarde V25 n'existe encore.
  const sauvegardeV25 = localStorage.getItem(CLE_SAUVEGARDE_V25);
  const sauvegardeV24 = localStorage.getItem(CLE_SAUVEGARDE_V24);
  const sauvegarde = sauvegardeV25 || sauvegardeV24;

  if (!sauvegardeV25 && sauvegardeV24) {
    localStorage.setItem(CLE_SAUVEGARDE_V25, sauvegardeV24);
  }

  if (sauvegarde) {
    try {
      const d = JSON.parse(sauvegarde);

      setRibTitulaire(d.ribTitulaire || "");
setRibIban(d.ribIban || "");
setRibBic(d.ribBic || "");
setRibBanque(d.ribBanque || "");

      setHistorique(d.historique || []);
      setDepenses(d.depenses || []);
setClientsEnregistres(d.clientsEnregistres || clientsBase);
      setCompteurDevis(compteurDevisValide(d.compteurDevis));
      setCompteurFacture(compteurFactureValide(d.compteurFacture));
      setNumeroDevis(d.numeroDevis || "");
setNumeroFacture(d.numeroFacture || "");

      setMoisSelectionne(new Date().getMonth());
setAnneeSelectionnee(new Date().getFullYear());

      if (d.brouillon) {
        const b = d.brouillon;

        setIdDossierActuel(b.idDossierActuel ?? null);
        setClient(b.client || "");
        setTelephone(b.telephone || "");
        setEmail(b.email || "");
        setAdresse(b.adresse || "");
        setAdresseAgence(b.adresseAgence || "");
        setNotes(b.notes || "");
        setModeClient(b.modeClient || "normal");
        setClientFinalNom(b.clientFinalNom || "");
setClientFinalTelephone(b.clientFinalTelephone || "");
setClientFinalAdresse(b.clientFinalAdresse || "");

setKmAller(b.kmAller ?? 0);
setFraisDeplacementManuelActif(b.fraisDeplacementManuelActif ?? false);
setFraisDeplacementManuel(b.fraisDeplacementManuel ?? 0);

setAchatFournitures(b.achatFournitures ?? 0);
setCoefficientFournitures(b.coefficientFournitures ?? 1.22);
setFournituresClient(b.fournituresClient ?? true);
setDetailsFournitures(b.detailsFournitures || "");
        setLignesTravaux(b.lignesTravaux || [
          { id: Date.now(), type: "plafond", q1: 0, q2: 0, r1: 0, r2: 0, option: 0 },
        ]);

        setMontantEncaisse(b.montantEncaisse ?? 0);
        setDateChantier(b.dateChantier || "");
        setDatePaiement(b.datePaiement || "");
        setHeureChantier(b.heureChantier || "");
setDateRdv(b.dateRdv || "");
setHeureRdv(b.heureRdv || "");
setMotifRdv(b.motifRdv || "");
setTypeRdv(b.typeRdv || "visite");
        setPriorite(b.priorite || "normale");
        setStatutDevis(b.statutDevis || "envoye");
        setStatutChantier(b.statutChantier || "a_planifier");
        setFacturePayee(b.facturePayee || false);

        setLocataire(b.locataire || "");
        setTelephoneLocataire(b.telephoneLocataire || "");
        setProprietaire(b.proprietaire || "");
        setTelephoneProprietaire(b.telephoneProprietaire || "");
        setAgence(b.agence || "");
        setReferenceChantier(b.referenceChantier || "");
        setComplementAdresse(b.complementAdresse || "");
      }
    } catch (error) {
      console.error("Erreur chargement sauvegarde :", error);
    }
  }

  // Ã€ chaque nouvelle ouverture de lâ€™application, on conserve lâ€™historique
  // chargÃ© mais on repart volontairement sur une fiche Nouveau vide.
  nouveauDossier();
  setSauvegardePrete(true);
}, []);

// ================= FAVORIS PRESTATIONS V25 =================

useEffect(() => {
  try {
    const favorisSauvegardes = JSON.parse(
      localStorage.getItem("prestationsFavoritesV25") || "[]"
    );

    if (Array.isArray(favorisSauvegardes)) {
      setPrestationsFavorites(favorisSauvegardes);
    }
  } catch (error) {
    console.error(
      "Erreur pendant le chargement des prestations favorites :",
      error
    );

    setPrestationsFavorites([]);
  }
}, []);

useEffect(() => {
  localStorage.setItem(
    "prestationsFavoritesV25",
    JSON.stringify(prestationsFavorites)
  );
}, [prestationsFavorites]);

useEffect(() => {
  if (!sauvegardePrete) return;

  const donnees = construireSauvegardeComplete();
  localStorage.setItem(CLE_SAUVEGARDE_V25, JSON.stringify(donnees));
}, [
  sauvegardePrete,
  historique,
  compteurDevis,
  compteurFacture,
  numeroDevis,
  numeroFacture,
  moisSelectionne,
  anneeSelectionnee,
  idDossierActuel,
  client,
  telephone,
  email,
  adresse,
  adresseAgence,
  notes,
  modeClient,
  lignesTravaux,
  montantEncaisse,

  factureSap,
numeroSap,

  dateChantier,
  datePaiement,
  priorite,
  statutDevis,
  statutChantier,
  facturePayee,
  locataire,
  telephoneLocataire,
  proprietaire,
  telephoneProprietaire,
  agence,
  referenceChantier,
  complementAdresse,
  fraisDeplacementManuelActif,
fraisDeplacementManuel,
  clientsEnregistres,
heureChantier,
dateRdv,
heureRdv,
motifRdv,
typeRdv,
kmAller,

fraisDeplacementManuelActif,
fraisDeplacementManuel,

achatFournitures,
coefficientFournitures,
fournituresClient,
detailsFournitures,
ribTitulaire,
ribIban,
ribBic,
ribBanque,
]);
// ðŸ”’ BACKUP AUTOMATIQUE (historique sÃ©curisÃ© avec versions)

useEffect(() => {
  if (!sauvegardePrete) return;

 const donnees = construireSauvegardeComplete();

  // ðŸ” historique des sauvegardes
  const backupsV25 = localStorage.getItem(CLE_BACKUPS_V25);
  const backupsV24 = localStorage.getItem(CLE_BACKUPS_V24);
  const backups = JSON.parse(backupsV25 || backupsV24 || "[]");

  const maintenant = new Date();
  const horodatage = `${maintenant.getDate()}-${maintenant.getMonth() + 1}-${maintenant.getFullYear()}_${maintenant.getHours()}h${maintenant.getMinutes()}`;

  backups.push({
    date: horodatage,
    data: donnees,
  });

  // ðŸ”’ garde seulement les 10 derniÃ¨res sauvegardes
  const backupsLimites = backups.slice(-10);

  localStorage.setItem(CLE_BACKUPS_V25, JSON.stringify(backupsLimites));

}, [
  sauvegardePrete,
  historique,
  compteurDevis,
  compteurFacture,
  numeroDevis,
  numeroFacture,
  moisSelectionne,
  anneeSelectionnee,
  idDossierActuel,
  client,
  telephone,
  email,
  adresse,
  adresseAgence,
  notes,
  modeClient,
  lignesTravaux,
  montantEncaisse,
  dateChantier,
  datePaiement,
  priorite,
  statutDevis,
  statutChantier,
  facturePayee,
  locataire,
  telephoneLocataire,
  proprietaire,
  telephoneProprietaire,
  agence,
  referenceChantier,
  complementAdresse,
  ribTitulaire,
ribIban,
ribBic,
ribBanque,
]);

const construireSauvegardeComplete = () => {
  return {
    historique,
    depenses,
    clientsEnregistres,

    compteurDevis,
    compteurFacture,

    numeroDevis,
    numeroFacture,

    moisSelectionne,
    anneeSelectionnee,

    ribTitulaire,
    ribIban,
    ribBic,
    ribBanque,

    factureSap,
    numeroSap,

    brouillon: {
      idDossierActuel,

      client,
      telephone,
      email,
      adresse,
      adresseAgence,
      complementAdresse,
      notes,

      modeClient,

      clientFinalNom,
      clientFinalTelephone,
      clientFinalAdresse,

      lignesTravaux,

     kmAller,
fraisDeplacementManuelActif,
fraisDeplacementManuel,
achatFournitures,
      coefficientFournitures,
      fournituresClient,
      detailsFournitures,

     montantEncaisse,
pourcentageAcompte,

acompteManuelActif,
acompteManuel,

      factureSap,
      numeroSap,

      statutDevis,
      statutChantier,
      facturePayee,

      dateChantier,
      heureChantier,

      datePaiement,

      dateRdv,
      heureRdv,
      motifRdv,
      typeRdv,

      priorite,

      locataire,
      telephoneLocataire,

      proprietaire,
      telephoneProprietaire,

      agence,
      referenceChantier,
    },
  };
};

  const calcul = useMemo(() => {
  const totalTravaux = lignesTravaux.reduce(
    (somme, ligne) => somme + montantLigne(ligne, modeClient),
    0
  );

  const dossierVide =
    lignesTravaux.length === 0 &&
    achatFournitures === 0 &&
    kmAller === 0;

  const kmAR = kmAller * 2;

  // ================= TEMPS CHANTIER =================
  const totalHeuresChantier = lignesTravaux.reduce((somme, ligne) => {
    const heures = ligne.heuresUnite || 0;
    const quantite = ligne.q1 || 1;

    return somme + heures * quantite;
  }, 0);

  const nombreJoursChantier =
    totalHeuresChantier <= 0
      ? 1
      : Math.ceil(totalHeuresChantier / 7);

  // ================= DEPLACEMENT INTELLIGENT =================
  const prestationPremierJour = TARIFS_PRESTATIONS.find(
    (p) => p.id === "deplacement_premier_jour_chantier"
  );

  const prestationJoursSuivants = TARIFS_PRESTATIONS.find(
    (p) => p.id === "deplacement_jours_suivants"
  );

  const prestationMiseEnPlace = TARIFS_PRESTATIONS.find(
    (p) => p.id === "forfait_mise_en_place_chantier"
  );

  const prixPremierJour =
    kmAR * (prestationPremierJour?.prix220 || 0) +
    (prestationMiseEnPlace?.prix220 || 0);

  const prixJoursSuivants =
    Math.max(0, nombreJoursChantier - 1) *
    (kmAR * (prestationJoursSuivants?.prix220 || 0));

const fraisLogistiqueAuto =
  dossierVide || kmAR <= 0
    ? 0
    : Math.round(prixPremierJour + prixJoursSuivants);

const fraisLogistique =
  fraisDeplacementManuelActif
    ? Math.round(fraisDeplacementManuel)
    : fraisLogistiqueAuto;

  // ================= FOURNITURES =================
 const reventeFournitures = fournituresClient
  ? 0
  : Math.round(achatFournitures * coefficientFournitures * 100) / 100;

const margeFournitures =
  fournituresClient || achatFournitures === 0
    ? 0
    : Math.round((reventeFournitures - achatFournitures) * 100) / 100;

  let total = totalTravaux + fraisLogistique + reventeFournitures;

  // ================= MINIMUM CHANTIER =================
  const minimumChantier = 80;

  if (!dossierVide && total < minimumChantier) {
    total = minimumChantier;
  }

  const acompte = acompteManuelActif
  ? Number(acompteManuel || 0)
  : Math.round(total * (pourcentageAcompte / 100));

  const reste = total - acompte;
  const resteReel = total - montantEncaisse;

  let rentabilite = "ðŸŸ¢ Correcte";
  if (total < 600 && modeClient === "jeremie") rentabilite = "ðŸŸ  Ã€ surveiller";
  if (total < 450) rentabilite = "ðŸ”´ Trop bas";

  // ================= ESTIMATION RAPIDE =================
  const chantierARisque = lignesTravaux.some((l) =>
    ["placo", "wc", "vmc", "gouttiere"].includes(l.type) ||
    l.prestationNom?.toLowerCase().includes("fuite") ||
    l.prestationNom?.toLowerCase().includes("depose") ||
    l.prestationNom?.toLowerCase().includes("dÃ©pose") ||
    l.prestationNom?.toLowerCase().includes("ragrÃ©age")
  );

  const chantierSimple = lignesTravaux.every((l) =>
    ["peinture", "parquet"].includes(l.type) &&
    !l.prestationNom?.toLowerCase().includes("depose") &&
    !l.prestationNom?.toLowerCase().includes("dÃ©pose") &&
    !l.prestationNom?.toLowerCase().includes("reprise")
  );

  const margeBasse = chantierARisque ? 0.9 : chantierSimple ? 0.9 : 0.85;
  const margeHaute = chantierARisque ? 1.35 : chantierSimple ? 1.15 : 1.25;

  const estimationBasse = Math.round(total * margeBasse);
  const estimationHaute = Math.round(total * margeHaute);
  const prixConseille = Math.ceil(estimationHaute / 10) * 10;

  
return {
  resteReel,
  totalTravaux,
  kmAR,
  totalHeuresChantier,
  nombreJoursChantier,
  fraisLogistique,
  reventeFournitures,
  margeFournitures,
  total,
  acompte,
  reste,
  rentabilite,
  estimationBasse,
  estimationHaute,
  prixConseille,

 };
}, [
  lignesTravaux,
  modeClient,
  kmAller,
  fournituresClient,
  achatFournitures,
  coefficientFournitures,
  montantEncaisse,
  pourcentageAcompte,

  acompteManuelActif,
  acompteManuel,

  fraisDeplacementManuelActif,
  fraisDeplacementManuel,


]);

const joursCalendrier = useMemo(() => {
  const premierJour = new Date(anneeSelectionnee, moisSelectionne, 1);
  const dernierJour = new Date(anneeSelectionnee, moisSelectionne + 1, 0);

  const decalage = (premierJour.getDay() + 6) % 7;
  const totalCases = Math.ceil((decalage + dernierJour.getDate()) / 7) * 7;

  const memeDate = (dateA: Date | null, dateB: Date) => {
    if (!dateA) return false;

    return (
      dateA.getDate() === dateB.getDate() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getFullYear() === dateB.getFullYear()
    );
  };

  return Array.from({ length: totalCases }, (_, index) => {
    const numeroJour = index - decalage + 1;

    if (numeroJour < 1 || numeroJour > dernierJour.getDate()) {
      return null;
    }

    const dateCase = new Date(anneeSelectionnee, moisSelectionne, numeroJour);

    const dossiersJour = historique.filter((d) => {
      const dateRdvObj = parseDateFr(d.dateRdv || "");
      const dateChantierObj = parseDateFr(d.dateChantier || "");
      const datePaiementObj = parseDateFr(d.datePaiement || "");
      const dateRappelObj = parseDateFr(d.dateRappel || "");

      const memeJourRdv = memeDate(dateRdvObj, dateCase);
      const memeJourChantier = memeDate(dateChantierObj, dateCase);
      const memeJourPaiement = memeDate(datePaiementObj, dateCase);
      const memeJourRappel = memeDate(dateRappelObj, dateCase);

      const memeJourPlanningChantier =
        d.planningChantier?.some((datePlanning) =>
          memeDate(parseDateFr(datePlanning), dateCase)
        ) || false;

      return (
        memeJourRdv ||
        memeJourChantier ||
        memeJourPaiement ||
        memeJourRappel ||
        memeJourPlanningChantier
      );
    });

    return {
      numeroJour,
      dateCase,
      dossiersJour,
    };
  });
}, [historique, moisSelectionne, anneeSelectionnee]);

 const chargerClient = (nom: string) => {
  const fiche = clientsEnregistres.find((c) => c.nom === nom);
  if (!fiche) return;

  setClient(fiche.nom);
  setTelephone(fiche.telephone || "");
  setEmail(fiche.email || "");
  setNotes(fiche.notes || "");
  setModeClient(fiche.modeClient || "normal");
  setAgence(fiche.agence || "");

  if (fiche.modeClient === "agence") {
    setAdresse("");
    setComplementAdresse("");
    setAdresseAgence(fiche.adresseAgence || "");
    setReferenceChantier("");
    setLocataire("");
    setTelephoneLocataire("");
    setProprietaire("");
    setTelephoneProprietaire("");
  } else {
    setAdresse(fiche.adresse || "");
    setComplementAdresse(fiche.complementAdresse || "");
    setAdresseAgence("");
  }
};

const supprimerClientEnregistre = (nomClient: string) => {
  if (!nomClient.trim()) return;

  const clientExiste = clientsEnregistres.some(
    (c) => normaliserTexte(c.nom) === normaliserTexte(nomClient)
  );

  if (!clientExiste) {
    alert("Ce client n'est pas enregistrÃ©.");
    return;
  }

  const confirmation = window.confirm(
    `Supprimer le client enregistrÃ© "${nomClient}" ?`
  );

  if (!confirmation) return;

  setClientsEnregistres((anciens) =>
    anciens.filter(
      (c) => normaliserTexte(c.nom) !== normaliserTexte(nomClient)
    )
  );

  alert("Client supprimÃ© des clients enregistrÃ©s.");
};
const ajouterLigne = () => {
  const nouvelleLigne: LigneTravaux = {
    id: Date.now(),
    type: "plafond",
    q1: 0,
    q2: 0,
    r1: 0,
    r2: 0,
    option: 0,
    tarifId: "",
    prestationNom: "",
    unite: "",
    prixUnitaire: 0,
    prixUnitaireAuto: 0,
    prixManuel: false,
    heuresUniteManuel: false,
    heuresUnite: 0,
    detailsPdfPersonnalises: [],
    detailsPdfOuvert: false,
    offert: false,
  };

  setLignesTravaux((ancien) => [...ancien, nouvelleLigne]);
};

const modifierLigne = (
  id: number,
  champ: keyof LigneTravaux,
  valeur: string | number
) => {
  setLignesTravaux((anciennesLignes) =>
    anciennesLignes.map((l) => {
      if (l.id !== id) return l;

      const champsNumeriques: (keyof LigneTravaux)[] = [
        "q1",
        "q2",
        "r1",
        "r2",
        "option",
        "prixUnitaire",
        "heuresUnite",
      ];

      if (champsNumeriques.includes(champ)) {
        const valeurNumerique =
          valeur === "" || valeur === null || Number.isNaN(Number(valeur))
            ? 0
            : Number(valeur);

  const ligneModifiee: LigneTravaux = {
  ...l,
  [champ]: valeurNumerique,
};

if (
  champ === "heuresUnite" &&
  !l.prixManuel &&
  l.heuresUnite &&
  l.heuresUnite > 0
) {
  const ancienPrix =
    l.prixUnitaire ||
    l.prixUnitaireAuto ||
    montantLigne(l, modeClient);

  const tauxHoraireLigne = ancienPrix / l.heuresUnite;

  ligneModifiee.prixUnitaire =
    Math.round(tauxHoraireLigne * valeurNumerique * 100) / 100;

  ligneModifiee.prixUnitaireAuto =
    Math.round(tauxHoraireLigne * valeurNumerique * 100) / 100;

  ligneModifiee.heuresUniteManuel = true;
}

return ligneModifiee;

      }

      return {
        ...l,
        [champ]: valeur,
      };
    })
  );
};

const modifierDetailPdf = (id: number, index: number, valeur: string) => {
  setLignesTravaux((ancien) =>
    ancien.map((l) => {
      if (l.id !== id) return l;

      const nouveauxDetails = [...(l.detailsPdfPersonnalises || [])];
      nouveauxDetails[index] = valeur;

      return {
        ...l,
        detailsPdfPersonnalises: nouveauxDetails,
      };
    })
  );
}; 

  const supprimerLigne = (id: number) => {
  setLignesTravaux(lignesTravaux.filter((l) => l.id !== id));
};

  const nouveauDossier = () => {
 setFicheOuverte(true);
  setIdDossierActuel(null);

  setClient("");
  setTelephone("");
  setEmail("");
  setAdresse("");
  setAdresseAgence("");
  setComplementAdresse("");
  setNotes("");

  setLocataire("");
  setTelephoneLocataire("");
  setProprietaire("");
  setTelephoneProprietaire("");
  setAgence("");
  setReferenceChantier("");

  setModeClient("normal");
  setClientFinalNom("");
setClientFinalTelephone("");
setClientFinalAdresse("");

  setNumeroDevis("");
setNumeroFacture("");

  setLignesTravaux([]);

  setKmAller(0);
  setFraisDeplacementManuelActif(false);
setFraisDeplacementManuel(0);
  setAchatFournitures(0);
  setCoefficientFournitures(1.22);
  setFournituresClient(true);
  setDetailsFournitures("");

  setMontantEncaisse(0);
  setPourcentageAcompte(30);

  setAcompteManuelActif(false);
setAcompteManuel(0);

  setFactureSap(false);
setNumeroSap("");


  setStatutDevis("en_cours");
  setStatutChantier("a_planifier");
  setFacturePayee(false);

  setPriorite("normale");
  setDatePaiement("");
  setDateChantier("");
  setHeureChantier("");
  setDateRdv("");
  setHeureRdv("");
  setMotifRdv("");
  setTypeRdv("visite");
  setPackSelectionne("");

  setTimeout(() => {
  inputClientRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  inputClientRef.current?.focus();
}, 150);
};

const creerRDVDepuisCalendrier = (date: Date) => {
  const dateFormatee = date.toLocaleDateString("fr-FR");

  setFicheOuverte(true);
  setIdDossierActuel(null);

  // ================= RDV CLIENT =================
  setClient("");
  setTelephone("");
  setEmail("");
  setAdresse("");
  setAdresseAgence("");
  setComplementAdresse("");
  setNotes("Observation RDV : ");

  setModeClient("normal");

  setLocataire("");
  setTelephoneLocataire("");
  setProprietaire("");
  setTelephoneProprietaire("");
  setAgence("");
  setReferenceChantier("");

  // ================= IMPORTANT : PAS DE DEVIS =================
  setNumeroDevis("");
  setNumeroFacture("");
  setLignesTravaux([]);
  setMontantEncaisse(0);
  setPourcentageAcompte(0);

  setKmAller(0);
  setAchatFournitures(0);
  setFournituresClient(true);
  setCoefficientFournitures(1.22);
  setDetailsFournitures("");

  setFactureSap(false);
  setNumeroSap("");

  // Le RDV est un Ã©vÃ©nement, pas un devis
  setStatutDevis("rdv");
  setStatutChantier("rdv_client");
  setFacturePayee(false);

  setDateRdv(dateFormatee);
  setHeureRdv("");
  setMotifRdv("Visite chantier / RDV client");
  setTypeRdv("visite");

  setDateChantier("");
  setHeureChantier("");
  setDatePaiement("");

  setPriorite("normale");

  setTimeout(() => {
    inputClientRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    inputClientRef.current?.focus();
  }, 150);
};

const enregistrerDossier = (
  silencieux = false,
  persisterImmediatement = false
) => {
  const numeroDevisFinal = numeroDevis;
  const numeroFactureFinal = numeroFacture;
  const idFinal = idDossierActuel ?? Date.now();

  const estRdv =
    statutDevis === "rdv" ||
    statutChantier === "rdv_client";

  const estRappel =
    statutDevis === "rappel" ||
    statutChantier === "rappel";

  const estEvenementSimple = estRdv || estRappel;

  const typeEvenementFinal: TypeEvenement = estRdv
    ? "rdv"
    : estRappel
    ? "rappel"
    : "devis";

  const item: Dossier = {
    id: idFinal,

    typeEvenement: typeEvenementFinal,

    factureSap: estEvenementSimple ? false : factureSap,
    numeroSap: estEvenementSimple ? "" : numeroSap,

      montantEncaisse: estEvenementSimple ? 0 : montantEncaisse,

    // On conserve la mÃ©moire de l'acompte dÃ©jÃ  enregistrÃ©.
    // Important : ne pas la perdre lorsqu'on rÃ©enregistre le dossier.
    montantAcompteEncaisse: estEvenementSimple
      ? 0
      : historique.find((d) => d.id === idFinal)?.montantAcompteEncaisse ?? 0,

    pourcentageAcompte: estEvenementSimple ? 0 : pourcentageAcompte,

    kmAller: estEvenementSimple ? 0 : kmAller,
    fraisDeplacementManuelActif:
  estEvenementSimple
    ? false
    : fraisDeplacementManuelActif,

fraisDeplacementManuel:
  estEvenementSimple
    ? 0
    : fraisDeplacementManuel,
    achatFournitures: estEvenementSimple ? 0 : achatFournitures,
    coefficientFournitures,
    fournituresClient,
    detailsFournitures: estEvenementSimple ? "" : detailsFournitures,
    reventeFournitures: estEvenementSimple ? 0 : calcul.reventeFournitures,
    margeFournitures: estEvenementSimple ? 0 : calcul.margeFournitures,

    dateChantier: estEvenementSimple ? "" : dateChantier,
    heureChantier: estEvenementSimple ? "" : heureChantier,

    planningChantier: [],

    datePaiement: estEvenementSimple ? "" : datePaiement,

    // Conservation permanente de la vraie date d'acompte
    dateAcompte: estEvenementSimple
      ? ""
      : historique.find((d) => d.id === idFinal)?.dateAcompte ?? "",

    dateRdv,
    heureRdv,
    motifRdv,
    typeRdv,
    observationRdv: notes,

    dateRappel: estRappel ? dateRdv : "",
    heureRappel: estRappel ? heureRdv : "",
    texteRappel: estRappel ? notes : "",

    priorite,

    client,
    telephone,
    email,
    adresse,
    adresseAgence,
    complementAdresse,
    notes,
    modeClient,

    clientFinalNom,
    clientFinalTelephone,
    clientFinalAdresse,

    lignesTravaux: estEvenementSimple ? [] : lignesTravaux,

    numeroDevis: estEvenementSimple ? "" : numeroDevisFinal,
    numeroFacture: estEvenementSimple ? "" : numeroFactureFinal,
    estBrouillonAuto:
      !estEvenementSimple &&
      !numeroDevisFinal &&
      !numeroFactureFinal,

    total: estEvenementSimple ? 0 : calcul.total,
    acompte: estEvenementSimple ? 0 : calcul.acompte,
    reste: estEvenementSimple ? 0 : Math.max(0, calcul.total - montantEncaisse),

    statutDevis: estRdv ? "rdv" : estRappel ? "rappel" : statutDevis,
    statutChantier: estRdv ? "rdv_client" : estRappel ? "rappel" : statutChantier,

    facturePayee: estEvenementSimple ? false : facturePayee,

    date: new Date().toLocaleDateString("fr-FR"),

    locataire,
    telephoneLocataire,
    proprietaire,
    telephoneProprietaire,
    agence,
    referenceChantier,
  };

  // ================= MEMOIRE CLIENT =================
  // MÃªme un RDV enregistre la fiche client pour pouvoir faire le devis plus tard.
  if (client.trim()) {
    const ficheClient: ClientEnregistre = {
      nom: client.trim(),
      telephone,
      email,
      adresse,
      adresseAgence,
      complementAdresse,
      notes,
      modeClient,
      agence,
    };

    setClientsEnregistres((anciens) => {
      const existe = anciens.some(
        (c) => c.nom.toLowerCase() === ficheClient.nom.toLowerCase()
      );

      if (existe) {
        return anciens.map((c) =>
          c.nom.toLowerCase() === ficheClient.nom.toLowerCase()
            ? ficheClient
            : c
        );
      }

      return [ficheClient, ...anciens];
    });
  }

  const existeDeja = historique.some((d) => d.id === idFinal);
  const historiqueMisAJour = existeDeja
    ? historique.map((d) => (d.id === idFinal ? item : d))
    : [item, ...historique];

  setHistorique(historiqueMisAJour);

  setIdDossierActuel(idFinal);

  if (persisterImmediatement) {
    const donnees = construireSauvegardeComplete();

    localStorage.setItem(
      CLE_SAUVEGARDE_V25,
      JSON.stringify({
        ...donnees,
        historique: historiqueMisAJour,
        brouillon: null,
      })
    );
  }

  if (!silencieux) {
    alert(
      estRdv
        ? "RDV enregistrÃ©"
        : estRappel
        ? "Rappel enregistrÃ©"
        : "Dossier enregistrÃ©"
    );
  }
};

const enregistrer = () => {
  enregistrerDossier(false, false);
};

useEffect(() => {
  const sauvegarderAvantFermeture = () => {
    if (!sauvegardePrete) return;

    const dossierCommence = Boolean(
      client.trim() ||
      numeroDevis ||
      numeroFacture ||
      lignesTravaux.length > 0 ||
      notes.trim() ||
      dateRdv ||
      dateChantier
    );

    if (!dossierCommence) {
      const donnees = construireSauvegardeComplete();

      localStorage.setItem(
        CLE_SAUVEGARDE_V25,
        JSON.stringify({
          ...donnees,
          brouillon: null,
        })
      );

      return;
    }

    enregistrerDossier(true, true);
  };

  window.addEventListener("pagehide", sauvegarderAvantFermeture);

  return () => {
    window.removeEventListener("pagehide", sauvegarderAvantFermeture);
  };
});

const rechargerDossier = (d: Dossier) => {
 
 setFicheOuverte(true);
  setIdDossierActuel(d.id);

  setClient(d.client);
  setTelephone(d.telephone);
  setEmail(d.email);
  setAdresse(d.adresse);
  setAdresseAgence(d.adresseAgence || "");
  setNotes(d.notes);
  setModeClient(d.modeClient);
  setClientFinalNom(d.clientFinalNom || "");
setClientFinalTelephone(d.clientFinalTelephone || "");
setClientFinalAdresse(d.clientFinalAdresse || "");

  setLignesTravaux(
    d.lignesTravaux || [
      {
        id: Date.now(),
        type: "plafond",
        q1: 0,
        q2: 0,
        r1: 0,
        r2: 0,
        option: 0,
      },
    ]
  );

  setNumeroDevis(d.numeroDevis);
  setNumeroFacture(d.numeroFacture);
  setStatutDevis(d.statutDevis);
  setStatutChantier(d.statutChantier);
  setFacturePayee(d.facturePayee);

  setMontantEncaisse(d.montantEncaisse ?? 0);
  setPourcentageAcompte(d.pourcentageAcompte ?? 30);

  setAcompteManuelActif(
  (d as any).acompteManuelActif ?? false
);

setAcompteManuel(
  (d as any).acompteManuel ?? 0
);

  setFactureSap(d.factureSap || false);
setNumeroSap(d.numeroSap || "");

  setKmAller(d.kmAller ?? 0);
  setFraisDeplacementManuelActif(
  d.fraisDeplacementManuelActif ?? false
);

setFraisDeplacementManuel(
  d.fraisDeplacementManuel ?? 0
);
setAchatFournitures(d.achatFournitures ?? 0);
setCoefficientFournitures(d.coefficientFournitures ?? 1.22);
setFournituresClient(d.fournituresClient ?? true);
setDetailsFournitures(d.detailsFournitures || "");
  setDateChantier(d.dateChantier || "");
  setHeureChantier(d.heureChantier || "");
  setDatePaiement(d.datePaiement || "");
  setDateRdv(d.dateRdv || "");
setHeureRdv(d.heureRdv || "");
setMotifRdv(d.motifRdv || "");
setTypeRdv(d.typeRdv || "visite");
if (d.typeEvenement === "rdv") {
  setStatutDevis("rdv");
  setStatutChantier("rdv_client");
}
  setPriorite(d.priorite || "normale");

  setLocataire(d.locataire || "");
  setTelephoneLocataire(d.telephoneLocataire || "");
  setProprietaire(d.proprietaire || "");
  setTelephoneProprietaire(d.telephoneProprietaire || "");
  setAgence(d.agence || "");
  setReferenceChantier(d.referenceChantier || "");
  setComplementAdresse(d.complementAdresse || "");

  // La fiche doit d'abord Ãªtre rendue aprÃ¨s setFicheOuverte(true), puis on
  // remonte prÃ©cisÃ©ment sur le bloc client du dossier ouvert.
  setTimeout(() => {
    ficheClientRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
};

const transformerRdvEnDevis = (d: Dossier) => {
  rechargerDossier(d);

  setStatutDevis("en_cours");
  setStatutChantier("a_planifier");
  setNumeroDevis("");
  setNumeroFacture("");
  setLignesTravaux([]);

  setDateRdv(d.dateRdv || "");
  setHeureRdv(d.heureRdv || "");
  setMotifRdv(d.motifRdv || "");
  setTypeRdv(d.typeRdv || "visite");

  setTimeout(() => {
    lignesTravauxRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 150);
};

const deplacerEvenementCalendrier = (
  dossier: Dossier,
  type: "rdv" | "chantier" | "paiement" | "rappel"
) => {
  const nouvelleDate = window.prompt(
    "Nouvelle date au format JJ/MM/AAAA :"
  );

  if (!nouvelleDate) return;

  setHistorique((ancien) =>
    ancien.map((d) => {
      if (d.id !== dossier.id) return d;

      if (type === "rdv") {
        return { ...d, dateRdv: nouvelleDate };
      }

      if (type === "chantier") {
        return { ...d, dateChantier: nouvelleDate };
      }

      if (type === "paiement") {
        return { ...d, datePaiement: nouvelleDate };
      }

      if (type === "rappel") {
        return { ...d, dateRappel: nouvelleDate };
      }

      return d;
    })
  );
};

const ajouterJourChantier = (dossier: Dossier) => {
  const nouvelleDate = window.prompt(
    "Date Ã  ajouter au planning chantier au format JJ/MM/AAAA :"
  );

  if (!nouvelleDate) return;

  setHistorique((ancien) =>
    ancien.map((d) => {
      if (d.id !== dossier.id) return d;

      const planningActuel = d.planningChantier || [];

      if (planningActuel.includes(nouvelleDate)) {
        alert("Cette date est dÃ©jÃ  prÃ©vue pour ce chantier.");
        return d;
      }

      return {
        ...d,
        typeEvenement: "chantier",
        planningChantier: [...planningActuel, nouvelleDate],
      };
    })
  );
};

const supprimerJourChantier = (dossier: Dossier, dateASupprimer: string) => {
  setHistorique((ancien) =>
    ancien.map((d) => {
      if (d.id !== dossier.id) return d;

      return {
        ...d,
        planningChantier: (d.planningChantier || []).filter(
          (date) => date !== dateASupprimer
        ),
      };
    })
  );
};

const creerRappelDepuisCalendrier = (date: Date) => {
  const dateFormatee = date.toLocaleDateString("fr-FR");

  const texte = window.prompt(
    "Note / rappel Ã  enregistrer :\nExemple : acheter peinture, rappeler client, commander fournitures..."
  );

  if (!texte) return;

  const nouveauRappel: Dossier = {
    id: Date.now(),

    typeEvenement: "rappel",

    client: "Rappel",
    telephone: "",
    email: "",
    adresse: "",
    adresseAgence: "",
    complementAdresse: "",
    notes: texte,
    modeClient: "normal",

    clientFinalNom: "",
    clientFinalTelephone: "",
    clientFinalAdresse: "",

    locataire: "",
    telephoneLocataire: "",
    proprietaire: "",
    telephoneProprietaire: "",
    agence: "",
    referenceChantier: "",

    lignesTravaux: [],
    numeroDevis: "",
    numeroFacture: "",
    total: 0,
    acompte: 0,
    reste: 0,
    montantEncaisse: 0,
    pourcentageAcompte: 0,
    facturePayee: false,

    statutDevis: "rappel",
    statutChantier: "rappel",

    factureSap: false,
    numeroSap: "",

    date: new Date().toLocaleDateString("fr-FR"),

    dateRappel: dateFormatee,
    heureRappel: "",
    texteRappel: texte,

    dateRdv: "",
    heureRdv: "",
    motifRdv: "",
    typeRdv: "",

    dateChantier: "",
    heureChantier: "",
    planningChantier: [],

    datePaiement: "",

    kmAller: 0,
    achatFournitures: 0,
    coefficientFournitures: 1.22,
    fournituresClient: true,
    detailsFournitures: "",
    reventeFournitures: 0,
    margeFournitures: 0,

    priorite: "normale",
  };

  setHistorique((ancien) => [nouveauRappel, ...ancien]);
};

const supprimerDossier = (id: number) => {
  const confirmation = window.confirm(
    "Voulez-vous vraiment supprimer ce dossier ? Cette action est dÃ©finitive."
  );

  if (!confirmation) return;

  setHistorique((ancien) => ancien.filter((d) => d.id !== id));

  if (idDossierActuel === id) {
    setIdDossierActuel(null);
  }
};

const marquerPayee = (id: number) => {
  setHistorique(
    historique.map((d) =>
      d.id === id
        ? {
            ...d,
            montantEncaisse: d.total,
            reste: 0,
            facturePayee: true,
            statutChantier: "facture_payee",
          }
        : d
    )
  );
};

const construireObjetMail = (type: "devis" | "facture") => {
  const numero = type === "facture" ? numeroFacture : numeroDevis;
  const libelle = type === "facture" ? "Facture" : "Devis";

  if (modeClient === "agence") {
    return [
      `${libelle} ${numero}`,
      referenceChantier,
      locataire,
      `${adresse}${complementAdresse ? ", " + complementAdresse : ""}`,
    ]
      .filter((v) => v && v.trim() !== "")
      .join(" - ");
  }

  const nomAffiche =
    clientFinalNom?.trim() ||
    client?.trim();

  return [
    `${libelle} ${numero}`,
    nomAffiche,
    `${adresse}${complementAdresse ? ", " + complementAdresse : ""}`,
  ]
    .filter((v) => v && v.trim() !== "")
    .join(" - ");
};

const ouvrirGoogleCalendar = ({
  titre,
  description,
  lieu,
  date,
}: {
  titre: string;
  description: string;
  lieu: string;
  date: string;
}) => {
  if (!date) {
    alert("Date manquante pour crÃ©er l'Ã©vÃ©nement Google");
    return;
  }

  const dateObj = parseDateFr(date);
  if (!dateObj) return;

  const formatGoogleDate = (d: Date) => {
    return d
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0] + "Z";
  };

  const debut = new Date(dateObj);
  debut.setHours(9, 0);

  const fin = new Date(dateObj);
  fin.setHours(10, 0);

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE
&text=${encodeURIComponent(titre)}
&details=${encodeURIComponent(description)}
&location=${encodeURIComponent(lieu)}
&dates=${formatGoogleDate(debut)}/${formatGoogleDate(fin)}`;

  window.open(url, "_blank");
};

const envoyerDevisMail = () => {
  const sujet = construireObjetMail("devis");

  const corps = `Bonjour ${client},

Veuillez trouver ci-joint le devis ${numeroDevis} concernant votre demande de travaux.

Ce devis reste valable 30 jours.

Je reste disponible pour toute question ou ajustement si nÃ©cessaire.

Belle journÃ©e,

Merci pour la confiance accordÃ©e`;

  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    sujet
  )}&body=${encodeURIComponent(corps)}`;

  window.location.href = mailto;
};


const envoyerFactureMail = () => {
  const sujet = construireObjetMail("facture");

  const corps = `Bonjour ${client},

Veuillez trouver ci-joint la facture ${numeroFacture} concernant les travaux rÃ©alisÃ©s.

Le reste Ã  payer est de ${Math.max(0, calcul.total - montantEncaisse)} â‚¬.

Je reste disponible si besoin.

Belle journÃ©e,

Merci pour la confiance accordÃ©e`;

  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    sujet
  )}&body=${encodeURIComponent(corps)}`;

  window.location.href = mailto;
};


const preparerRelance = async (d: Dossier) => {
  const pdfBase64 = await genererPDF("facture");

  const sujet = `Relance facture ${d.numeroFacture}`;

  const corps = `Bonjour ${d.client},

Je me permets de revenir vers vous concernant la facture ${d.numeroFacture}, Ã©tablie suite au devis signÃ© ${d.numeroDevis}.

Le rÃ¨glement prÃ©vu pour un montant restant de ${d.reste} â‚¬ semble ne pas avoir encore Ã©tÃ© rÃ©ceptionnÃ©.

Sauf erreur de ma part, pouvez-vous me confirmer la date de rÃ¨glement prÃ©vue ?

Je reste bien entendu disponible si besoin.

Belle journÃ©e,

Merci pour la confiance accordÃ©e`;

  const reponse = await fetch("/api/envoyer-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: d.email,
      subject: sujet,
      text: corps,
      pdfBase64,
      filename: `${d.numeroFacture || "facture"}-${d.client || "client"}.pdf`,
    }),
  });

  if (!reponse.ok) {
    alert("âŒ Erreur lors de lâ€™envoi de la relance.");
    return;
  }

  alert("âœ… Relance envoyÃ©e avec la facture en piÃ¨ce jointe.");
};

const moisActuel = moisSelectionne;
const anneeActuelle = anneeSelectionnee;

const tableauMensuel = useMemo(() => {
  const dossiersDuMois = historique.filter((d) => {
    const dateReference =
      parseDateFr(d.datePaiement || "") ||
      parseDateFr(d.date || "");

    if (!dateReference) return false;

    return (
      dateReference.getMonth() === moisSelectionne &&
      dateReference.getFullYear() === anneeSelectionnee
    );
  });

  const depensesDuMois = depenses.filter((d) => {
    const dateReference = parseDateFr(d.date);
    if (!dateReference) return false;

    return (
      dateReference.getMonth() === moisSelectionne &&
      dateReference.getFullYear() === anneeSelectionnee
    );
  });

  const facturesDuMois = dossiersDuMois.filter(
    (d) => d.numeroFacture && (d.montantEncaisse || 0) > 0
  );

  const devisDuMoisSansFacture = dossiersDuMois.filter((d) => {
    if (!d.numeroDevis || d.numeroFacture) return false;
    if ((d.montantEncaisse || 0) <= 0) return false;

    const factureLieeExiste = historique.some(
      (f) => f.numeroFacture && f.numeroDevis === d.numeroDevis
    );

    return !factureLieeExiste;
  });

  const encaissementsUniques = [...facturesDuMois, ...devisDuMoisSansFacture].map(
    (d) => ({
      cle: `${d.numeroFacture || d.numeroDevis}-${d.montantEncaisse}`,
      numero: d.numeroFacture || d.numeroDevis || "Sans numÃ©ro",
      client:
        d.clientFinalNom ||
        d.locataire ||
        d.proprietaire ||
        d.client ||
        "Client non renseignÃ©",
      chantier:
        d.clientFinalAdresse ||
        d.adresse ||
        d.complementAdresse ||
        d.referenceChantier ||
        "",
      date: d.datePaiement || d.date || "",
      montant: d.montantEncaisse || 0,
    })
  );

  const totalEncaisse = encaissementsUniques.reduce(
    (somme, e) => somme + e.montant,
    0
  );

  const totalDepenses = depensesDuMois.reduce(
    (somme, d) => somme + (d.montant || 0),
    0
  );

  const soldeReel = totalEncaisse - totalDepenses;

  const resteAEncaisser = dossiersDuMois.reduce(
    (somme, d) =>
      somme + Math.max(0, (d.total || 0) - (d.montantEncaisse || 0)),
    0
  );

  const totalRelance = dossiersDuMois.reduce((somme, d) => {
    const datePaiement = parseDateFr(d.datePaiement || "");

    if (datePaiement && datePaiement < new Date() && !d.facturePayee) {
      return somme + Math.max(0, (d.total || 0) - (d.montantEncaisse || 0));
    }

    return somme;
  }, 0);

  const estimationUrssaf = Math.round(totalEncaisse * 0.212);
  const objectifMensuel = 4000;

  return {
    totalEncaisse,
    totalDepenses,
    soldeReel,
    resteAEncaisser,
    totalRelance,
    estimationUrssaf,
    objectifMensuel,
    encaissementsUniques,
    alerteFaible: totalEncaisse < objectifMensuel,
  };
}, [historique, depenses, moisSelectionne, anneeSelectionnee]);

<div className="rounded-xl border border-slate-200 bg-white p-3">
  <button
    type="button"
    onClick={() => setDetailsEncaissementsOuverts(!detailsEncaissementsOuverts)}
    className="flex w-full items-center justify-between text-left font-semibold text-slate-800"
  >
    <span>DÃ©tail des encaissements</span>
    <span>{detailsEncaissementsOuverts ? "â–² Masquer" : "â–¼ Afficher"}</span>
  </button>

  {detailsEncaissementsOuverts && (
    <div className="mt-3 space-y-2 text-sm">
      {tableauMensuel.encaissementsUniques.length === 0 ? (
        <p className="text-slate-500">Aucun encaissement ce mois-ci.</p>
      ) : (
        tableauMensuel.encaissementsUniques.map((e: any) => (
          <div
            key={e.cleDoublon}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2"
          >
            <p className="font-semibold text-slate-900">
              {e.numero} â€” {e.montant} â‚¬
            </p>
            <p className="text-slate-600">{e.client}</p>
            <p className="text-slate-500">{e.chantier}</p>
            <p className="text-slate-400">Date : {e.date}</p>
          </div>
        ))
      )}
    </div>
  )}
</div>

const depensesTriees = useMemo(() => {
  return [...depenses].sort((a, b) => {
    const dateA = parseDateFr(a.date)?.getTime() || 0;
    const dateB = parseDateFr(b.date)?.getTime() || 0;
    return dateB - dateA;
  });
}, [depenses]);

const resumeDepenses = useMemo(() => {
  const depensesDuMois = depenses.filter((depense) => {
    const dateDepense = parseDateFr(depense.date);
    if (!dateDepense) return false;

    return (
      dateDepense.getMonth() === moisSelectionne &&
      dateDepense.getFullYear() === anneeSelectionnee
    );
  });

  const depensesAnnee = depenses.filter((depense) => {
    const dateDepense = parseDateFr(depense.date);
    if (!dateDepense) return false;

    return dateDepense.getFullYear() === anneeSelectionnee;
  });

  return {
    totalMois: depensesDuMois.reduce(
      (somme, d) => somme + (d.montant || 0),
      0
    ),
    totalAnnee: depensesAnnee.reduce(
      (somme, d) => somme + (d.montant || 0),
      0
    ),
    nombreTotal: depenses.length,
  };
}, [depenses, moisSelectionne, anneeSelectionnee]);

const alertesIntelligentes = useMemo(() => {
  const aujourdHui = new Date();

  const devisARelancer = historique.filter((d) => {
    return d.statutDevis === "envoye" && !d.facturePayee;
  });

  const chantiersAPlanifier = historique.filter((d) => {
    return d.statutDevis === "accepte" && d.statutChantier === "a_planifier";
  });

  const facturesEnRetard = historique.filter((d) => {
    const datePaiement = parseDateFr(d.datePaiement || "");

    return (
      datePaiement &&
      datePaiement < aujourdHui &&
      !d.facturePayee &&
      Math.max(0, (d.total || 0) - (d.montantEncaisse || 0)) > 0
    );
  });

  const chantiersEnCours = historique.filter((d) => {
    return d.statutChantier === "en_cours";
  });

  return {
    devisARelancer,
    chantiersAPlanifier,
    facturesEnRetard,
    chantiersEnCours,
    totalAlertes:
      devisARelancer.length +
      chantiersAPlanifier.length +
      facturesEnRetard.length +
      chantiersEnCours.length,
  };
}, [historique]);
const donneesGraphique = useMemo(() => {
  const aujourdHui = new Date();

  const data: {
    label: string;
    encaissements: number;
    depenses: number;
    resultat: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const dateMois = new Date(
      aujourdHui.getFullYear(),
      aujourdHui.getMonth() - i,
      1
    );

    const mois = dateMois.getMonth();
    const annee = dateMois.getFullYear();

    // ============================================================
    // ENCAISSEMENTS RÃ‰ELS DU MOIS
    //
    // Chaque dossier peut maintenant gÃ©nÃ©rer :
    //
    // 1 - un acompte Ã  sa vraie date
    // 2 - un solde Ã  sa vraie date
    //
    // montantEncaisse reste le TOTAL encaissÃ© sur le dossier.
    // On ne modifie donc pas le fonctionnement actuel.
    // ============================================================

    let encaissements = 0;

    historique.forEach((d) => {
      if ((d.montantEncaisse || 0) <= 0) {
        return;
      }

      // ==========================================================
      // ACOMPTE
      // ==========================================================

      let montantAcompteReel =
        Number(d.montantAcompteEncaisse || 0);

      let dateAcompteReelle =
        parseDateFr(d.dateAcompte || "");

      /*
       * COMPATIBILITÃ‰ AVEC LES DOSSIERS EXISTANTS :
       *
       * Si le dossier n'est pas encore totalement payÃ©,
       * mais possÃ¨de dÃ©jÃ  un montant encaissÃ© et une datePaiement,
       * il s'agit trÃ¨s probablement de l'acompte enregistrÃ©
       * avec l'ancien systÃ¨me.
       *
       * On peut donc encore le rÃ©cupÃ©rer automatiquement.
       */
      if (
        montantAcompteReel <= 0 &&
        !d.facturePayee &&
        (d.montantEncaisse || 0) > 0 &&
        d.datePaiement
      ) {
        montantAcompteReel =
          Number(d.montantEncaisse || 0);

        dateAcompteReelle =
          parseDateFr(d.datePaiement || "");
      }

      // Ajout de l'acompte dans SON mois rÃ©el
      if (
        montantAcompteReel > 0 &&
        dateAcompteReelle &&
        dateAcompteReelle.getMonth() === mois &&
        dateAcompteReelle.getFullYear() === annee
      ) {
        encaissements += montantAcompteReel;
      }

      // ==========================================================
      // SOLDE / PAIEMENT COMPLET
      // ==========================================================

      if (d.facturePayee && d.datePaiement) {
        const dateSolde =
          parseDateFr(d.datePaiement || "");

        /*
         * montantEncaisse contient le total reÃ§u.
         *
         * Si acompte :
         * 1500 total encaissÃ©
         * - 500 acompte
         * = 1000 solde
         *
         * Si aucun acompte :
         * 1500 - 0
         * = 1500 paiement complet
         */
        const montantSolde = Math.max(
          0,
          Number(d.montantEncaisse || 0) -
            montantAcompteReel
        );

        if (
          montantSolde > 0 &&
          dateSolde &&
          dateSolde.getMonth() === mois &&
          dateSolde.getFullYear() === annee
        ) {
          encaissements += montantSolde;
        }
      }
    });

    // ============================================================
    // DÃ‰PENSES RÃ‰ELLES DU MOIS
    // ============================================================

    const depensesDuMois = depenses.filter((depense) => {
      const dateDepense =
        parseDateFr(depense.date || "");

      if (!dateDepense) {
        return false;
      }

      return (
        dateDepense.getMonth() === mois &&
        dateDepense.getFullYear() === annee
      );
    });

    const totalDepenses = depensesDuMois.reduce(
      (somme, depense) =>
        somme + Number(depense.montant || 0),
      0
    );

    // ============================================================
    // RÃ‰SULTAT
    // ============================================================

    const resultat =
      encaissements - totalDepenses;

    data.push({
      label: dateMois.toLocaleString("fr-FR", {
        month: "short",
        year: "2-digit",
      }),

      encaissements:
        Math.round(encaissements * 100) / 100,

      depenses:
        Math.round(totalDepenses * 100) / 100,

      resultat:
        Math.round(resultat * 100) / 100,
    });
  }

  return data;
}, [historique, depenses]);

const dossierActuel = useMemo(() => {
  return historique.find((d) => d.id === idDossierActuel) || null;
}, [historique, idDossierActuel]);

const resumeExpress = useMemo(() => {
  const totalDevis = calcul.total || dossierActuel?.total || 0;
  const dejaEncaisse = montantEncaisse || dossierActuel?.montantEncaisse || 0;
  const resteReel = Math.max(0, totalDevis - dejaEncaisse);

  return {
    clientEnCours: client || dossierActuel?.client || "-",
    totalDevis,
    dejaEncaisse,
    resteReel,
    prioriteActuelle: priorite || dossierActuel?.priorite || "normale",
    paiementPrevu: datePaiement || dossierActuel?.datePaiement || "-",
  };
}, [client, calcul.total, montantEncaisse, priorite, datePaiement, dossierActuel]);
const historiqueFiltre = useMemo(() => {
  const q = normaliserTexte(rechercheHistorique);

  if (!q) return historique;

  return historique.filter((d) =>
    normaliserTexte(`
      ${d.client || ""}
      ${d.telephone || ""}
      ${d.email || ""}
      ${d.numeroDevis || ""}
      ${d.numeroFacture || ""}
      ${d.clientFinalNom || ""}
      ${d.clientFinalTelephone || ""}
      ${d.clientFinalAdresse || ""}
      ${d.locataire || ""}
      ${d.telephoneLocataire || ""}
      ${d.proprietaire || ""}
      ${d.telephoneProprietaire || ""}
      ${d.referenceChantier || ""}
      ${d.adresse || ""}
      ${d.complementAdresse || ""}
      ${d.agence || ""}
    `).includes(q)
  );
}, [historique, rechercheHistorique]);

const resultatsCalendrier = useMemo(() => {
  const q = normaliserTexte(rechercheCalendrier);

  if (!q) return [];

  return historique.filter((d) =>
    normaliserTexte(`
      ${d.client || ""}
      ${d.telephone || ""}
      ${d.email || ""}
      ${d.adresse || ""}
      ${d.complementAdresse || ""}
      ${d.numeroDevis || ""}
      ${d.numeroFacture || ""}
      ${d.referenceChantier || ""}
      ${d.locataire || ""}
      ${d.proprietaire || ""}
      ${d.clientFinalNom || ""}
      ${d.clientFinalAdresse || ""}
    `).includes(q)
  );
}, [historique, rechercheCalendrier]);

// ================= RECHERCHE PRESTATIONS V25 =================

const normaliserRecherchePrestation = (valeur: string) => {
  return valeur
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const prestationEstFavorite = (idPrestation: string) => {
  return prestationsFavorites.includes(idPrestation);
};

const basculerPrestationFavorite = (idPrestation: string) => {
  setPrestationsFavorites((favorisActuels) => {
    if (favorisActuels.includes(idPrestation)) {
      return favorisActuels.filter(
        (idFavorite) => idFavorite !== idPrestation
      );
    }

    return [...favorisActuels, idPrestation];
  });
};

const prestationsFiltrees = useMemo(() => {
  const rechercheNormalisee =
    normaliserRecherchePrestation(recherchePrestation);

  return TARIFS_PRESTATIONS.filter((prestation: any) => {
    const correspondCategorie =
      !categorieSelectionnee ||
      prestation.categorie === categorieSelectionnee;

    const correspondFavori =
      !afficherFavorisSeulement ||
      prestationsFavorites.includes(prestation.id);

    const textePrestation = normaliserRecherchePrestation(
      [
        getNomPrestation(prestation),
        prestation.categorie,
        prestation.unite,
        prestation.action,
        prestation.conditions,
        ...(prestation.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
    );

    const correspondRecherche =
      !rechercheNormalisee ||
      textePrestation.includes(rechercheNormalisee);

    return (
      correspondCategorie &&
      correspondFavori &&
      correspondRecherche
    );
  }).sort((a: any, b: any) => {
    const aFavori =
      prestationsFavorites.includes(a.id);

    const bFavori =
      prestationsFavorites.includes(b.id);

    if (aFavori !== bFavori) {
      return aFavori ? -1 : 1;
    }

    return getNomPrestation(a).localeCompare(
      getNomPrestation(b),
      "fr"
    );
  });
}, [
  categorieSelectionnee,
  recherchePrestation,
  afficherFavorisSeulement,
  prestationsFavorites,
]);

const ajouterPrestationAuDevis = (
  idPrestation?: string
) => {
  const idAUtiliser =
    idPrestation || prestationSelectionnee;

  const prestationTrouvee: any =
    TARIFS_PRESTATIONS.find(
      (prestation: any) =>
        prestation.id === idAUtiliser
    );

  if (!prestationTrouvee) {
    alert(
      "Choisis une prestation avant d'ajouter une ligne."
    );
    return;
  }

  const prixClient = getPrixPrestation(
    prestationTrouvee,
    modeClient
  );

  const detailsBase =
    prestationTrouvee.detailsPdf &&
    prestationTrouvee.detailsPdf.length > 0
      ? prestationTrouvee.detailsPdf
      : DETAILS_PDF_PAR_CATEGORIE[
          prestationTrouvee.categorie
        ] || [
          "RÃ©alisation de la prestation prÃ©vue au devis",
          "Ajustements simples",
          "Finitions standards",
          "Nettoyage de fin dâ€™intervention",
        ];

  setLignesTravaux((lignesActuelles) => [
    ...lignesActuelles,
    {
      id: Date.now() + Math.floor(Math.random() * 1000),

      type:
        prestationTrouvee.typeTravaux ||
        "prestation_tableau",

      q1: 1,
      q2: 0,
      r1: 0,
      r2: 0,
      option: 0,

      tarifId: prestationTrouvee.id,

      prestationNom:
        getNomPrestation(prestationTrouvee),

      unite: prestationTrouvee.unite,

      prixUnitaire: prixClient,
      prixUnitaireAuto: prixClient,
      prixManuel: false,

      heuresUnite:
        prestationTrouvee.heuresUnite || 0,

      detailsPdfPersonnalises: [...detailsBase],
      detailsPdfOuvert: false,
    },
  ]);

  setPrestationSelectionnee("");

  setTimeout(() => {
    derniereLigneRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
};

const ajouterPackAuDevis = (idPack: string) => {
  const pack = PACKS_PRESTATIONS_V25.find(
    (packDisponible) => packDisponible.id === idPack
  );

  if (!pack) return;

  const maintenant = Date.now();

  const nouvellesLignes = pack.lignes
    .map(([idPrestation, quantite], index) => {
      const prestation: any = TARIFS_PRESTATIONS.find(
        (element: any) => element.id === idPrestation
      );

      if (!prestation) return null;

      const prixClient = getPrixPrestation(prestation, modeClient);
      const detailsBase =
        prestation.detailsPdf?.length > 0
          ? prestation.detailsPdf
          : DETAILS_PDF_PAR_CATEGORIE[prestation.categorie] || [];

      return {
        id: maintenant + index + Math.floor(Math.random() * 1000),
        type: prestation.typeTravaux || "prestation_tableau",
        q1: quantite,
        q2: 0,
        r1: 0,
        r2: 0,
        option: 0,
        tarifId: prestation.id,
        prestationNom: getNomPrestation(prestation),
        unite: prestation.unite,
        prixUnitaire: prixClient,
        prixUnitaireAuto: prixClient,
        prixManuel: false,
        heuresUnite: prestation.heuresUnite || 0,
        detailsPdfPersonnalises: [...detailsBase],
        detailsPdfOuvert: false,
        offert: false,
      } as LigneTravaux;
    })
    .filter(Boolean) as LigneTravaux[];

  const premiereNouvelleLigneId = nouvellesLignes[0]?.id;

  if (!premiereNouvelleLigneId) return;

  setLignesTravaux((lignesActuelles) => [
    ...lignesActuelles,
    ...nouvellesLignes,
  ]);

  setTimeout(() => {
    document
      .getElementById(`ligne-travaux-${premiereNouvelleLigneId}`)
      ?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
};

const reinitialiserApplicationComplete = () => {
  const confirmation = window.confirm(
    "âš ï¸ Voulez-vous vraiment rÃ©initialiser toute lâ€™application ?\n\nCela va supprimer le brouillon actuel, lâ€™historique, les clients enregistrÃ©s, les dÃ©penses et les compteurs."
  );

  if (!confirmation) return;

  const confirmationFinale = window.confirm(
    "DerniÃ¨re confirmation : cette action est dÃ©finitive si vous nâ€™avez pas exportÃ© de sauvegarde."
  );

  if (!confirmationFinale) return;

  localStorage.removeItem(CLE_SAUVEGARDE_V25);
  localStorage.removeItem(CLE_SAUVEGARDE_V24);
  localStorage.removeItem(CLE_BACKUPS_V25);
  localStorage.removeItem(CLE_BACKUPS_V24);

  setHistorique([]);
  setDepenses([]);
  setClientsEnregistres(clientsBase);

  setCompteurDevis(PROCHAIN_NUMERO_DEVIS);
  setCompteurFacture(PROCHAIN_NUMERO_FACTURE);
  setNumeroDevis("");
  setNumeroFacture("");

  setIdDossierActuel(null);
  setClient("");
  setTelephone("");
  setEmail("");
  setAdresse("");
  setAdresseAgence("");
  setComplementAdresse("");
  setNotes("");

  setLocataire("");
  setTelephoneLocataire("");
  setProprietaire("");
  setTelephoneProprietaire("");
  setAgence("");
  setReferenceChantier("");

  setModeClient("normal");
  setClientFinalNom("");
  setClientFinalTelephone("");
  setClientFinalAdresse("");

  setLignesTravaux([]);

  setKmAller(0);
  setFraisDeplacementManuelActif(false);
setFraisDeplacementManuel(0);
  setAchatFournitures(0);
  setCoefficientFournitures(1.22);
  setFournituresClient(true);
  setDetailsFournitures("");

  setMontantEncaisse(0);
  setPourcentageAcompte(30);

  setStatutDevis("en_cours");
  setStatutChantier("a_planifier");
  setFacturePayee(false);

  setDateChantier("");
  setHeureChantier("");
  setDatePaiement("");
  setDateRdv("");
  setHeureRdv("");
  setMotifRdv("");
  setTypeRdv("visite");

  setRibTitulaire("");
  setRibIban("");
  setRibBic("");
  setRibBanque("");

  setListeBackups([]);
  setSauvegardesOuvertes(false);

  alert("âœ… Application rÃ©initialisÃ©e");
};

  const exporter = () => {
 const donnees = construireSauvegardeComplete();

  const blob = new Blob([JSON.stringify(donnees, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sauvegarde-dashboard-adrien-v25.json";
  a.click();
  URL.revokeObjectURL(url);
};

const importer = (event: React.ChangeEvent<HTMLInputElement>) => {
  const confirmation = window.confirm(
    "Importer une sauvegarde remplacera l'historique actuel. Continuer ?"
  );

  if (!confirmation) return;

  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));

      setHistorique(data.historique || []);
      setDepenses(data.depenses || []);
      setClientsEnregistres(data.clientsEnregistres || clientsBase);

      setCompteurDevis(compteurDevisValide(data.compteurDevis));
      setCompteurFacture(compteurFactureValide(data.compteurFacture));

      setNumeroDevis(data.numeroDevis || "");
      setNumeroFacture(data.numeroFacture || "");

      setMoisSelectionne(data.moisSelectionne ?? new Date().getMonth());
      setAnneeSelectionnee(data.anneeSelectionnee ?? new Date().getFullYear());

      setRibTitulaire(data.ribTitulaire || "");
      setRibIban(data.ribIban || "");
      setRibBic(data.ribBic || "");
      setRibBanque(data.ribBanque || "");

      if (data.brouillon) {
        const b = data.brouillon;

        setIdDossierActuel(b.idDossierActuel ?? null);

        setClient(b.client || "");
        setTelephone(b.telephone || "");
        setEmail(b.email || "");
        setAdresse(b.adresse || "");
        setAdresseAgence(b.adresseAgence || "");
        setComplementAdresse(b.complementAdresse || "");
        setNotes(b.notes || "");

        setModeClient(b.modeClient || "normal");

        setClientFinalNom(b.clientFinalNom || "");
        setClientFinalTelephone(b.clientFinalTelephone || "");
        setClientFinalAdresse(b.clientFinalAdresse || "");

        setLignesTravaux(b.lignesTravaux || []);

        setKmAller(b.kmAller ?? 0);
        setFraisDeplacementManuelActif(
  b.fraisDeplacementManuelActif ?? false
);

setFraisDeplacementManuel(
  b.fraisDeplacementManuel ?? 0
);
        setAchatFournitures(b.achatFournitures ?? 0);
        setCoefficientFournitures(b.coefficientFournitures ?? 1.22);
        setFournituresClient(b.fournituresClient ?? true);
        setDetailsFournitures(b.detailsFournitures || "");

        setMontantEncaisse(b.montantEncaisse ?? 0);
        setPourcentageAcompte(b.pourcentageAcompte ?? 30);

        setStatutDevis(b.statutDevis || "en_cours");
        setStatutChantier(b.statutChantier || "a_planifier");
        setFacturePayee(b.facturePayee || false);

        setDateChantier(b.dateChantier || "");
        setHeureChantier(b.heureChantier || "");

        setDatePaiement(b.datePaiement || "");

        setDateRdv(b.dateRdv || "");
        setHeureRdv(b.heureRdv || "");
        setMotifRdv(b.motifRdv || "");
        setTypeRdv(b.typeRdv || "visite");

        setPriorite(b.priorite || "normale");

        setLocataire(b.locataire || "");
        setTelephoneLocataire(b.telephoneLocataire || "");

        setProprietaire(b.proprietaire || "");
        setTelephoneProprietaire(b.telephoneProprietaire || "");

        setAgence(b.agence || "");
        setReferenceChantier(b.referenceChantier || "");
      }

      event.target.value = "";

      alert("âœ… Import rÃ©ussi : sauvegarde complÃ¨te restaurÃ©e");
    } catch (error) {
      console.error("Erreur import :", error);
      alert("âŒ Erreur import : le fichier ne semble pas compatible.");
    }
  };

  reader.readAsText(file);
};

  const lignesPDF = (): [string, number][] => {
  // 1. lignes de base
  const lignesTravauxPDF = lignesTravaux.map((l) => ({
    designation: l.prestationNom || nomTravaux(l.type),
    montant: montantLigne(l, modeClient),
  }));

  const totalTravaux = lignesTravauxPDF.reduce(
    (s, l) => s + l.montant,
    0
  );

  const frais = calcul.fraisLogistique || 0;

  // 2. Si pas de travaux â†’ on affiche rien de spÃ©cial
  if (totalTravaux === 0) {
    return lignesTravauxPDF.map((l) => [l.designation, l.montant]);
  }

// 1. SÃ©parer lignes travaux / fournitures
const lignesTravauxSeules = lignesTravauxPDF.filter(
  (l) => !l.designation.toLowerCase().includes("fourniture")
);

const totalTravauxSansFourniture = lignesTravauxSeules.reduce(
  (s, l) => s + l.montant,
  0
);

// 2. RÃ©partition uniquement sur travaux
const lignesAvecFrais = lignesTravauxPDF.map((l) => {
  const estFourniture = l.designation.toLowerCase().includes("fourniture");

  if (estFourniture || totalTravauxSansFourniture === 0) {
    return l; // pas de rÃ©partition
  }

  const ratio = l.montant / totalTravauxSansFourniture;
  const partFrais = Math.round(frais * ratio);

  return {
    designation: l.designation,
    montant: l.montant + partFrais,
  };
});

  // 4. Ajustement pour Ã©viter perte Ã  cause des arrondis
  const totalApres = lignesAvecFrais.reduce((s, l) => s + l.montant, 0);

const totalAttendu =
  totalTravaux + calcul.fraisLogistique;

const ecart = totalAttendu - totalApres;

  if (Math.abs(ecart) > 0 && lignesAvecFrais.length > 0) {
    lignesAvecFrais[0].montant += ecart;
  }

  // 5. Fournitures (inchangÃ©)
  if (!fournituresClient && calcul.reventeFournitures > 0) {
    lignesAvecFrais.push({
      designation: "Fournitures et approvisionnement",
      montant: calcul.reventeFournitures,
    });
  }

  return lignesAvecFrais.map((l) => [l.designation, l.montant]);
};

const genererPDF = async (type: "devis" | "facture") => {
  const doc = new jsPDF();

  const titre = type === "devis" ? "DEVIS" : "FACTURE";

let numero = type === "devis" ? numeroDevis : numeroFacture;

if (type === "devis" && !numeroDevis) {
  numero = formatNumero("D", compteurDevis);
  setNumeroDevis(numero);
  setCompteurDevis((ancien) => ancien + 1);

  if (idDossierActuel !== null) {
    setHistorique((ancien) =>
      ancien.map((d) =>
        d.id === idDossierActuel ? { ...d, numeroDevis: numero } : d
      )
    );
  }
}
if (type === "devis") {
  setStatutDevis("envoye");

  if (idDossierActuel !== null) {
    setHistorique((ancien) =>
      ancien.map((d) =>
        d.id === idDossierActuel
          ? { ...d, statutDevis: "envoye" }
          : d
      )
    );
  }
}
if (type === "facture" && !numeroFacture) {
  numero = formatNumero("F", compteurFacture);
  setNumeroFacture(numero);
  setCompteurFacture((ancien) => ancien + 1);

  if (idDossierActuel !== null) {
    setHistorique((ancien) =>
      ancien.map((d) =>
        d.id === idDossierActuel ? { ...d, numeroFacture: numero } : d
      )
    );
  }
}

  let page = 1;
let y = modeClient === "agence" || modeClient === "jeremie" ? 160 : 138;  

  const enteteTableau = () => {
    doc.setFillColor(52, 63, 79);
    doc.rect(15, y, 180, 11, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Designation", 20, y + 7);
    doc.text("Montant", 165, y + 7);

    doc.setTextColor(0, 0, 0);
    y += 16;
  };

  const nouvellePageTableau = () => {
    doc.addPage();
    page += 1;
    y = 25;
    enteteTableau();
  };

  const verifierPlace = (hauteur: number) => {
    if (y + hauteur > 292) {
      nouvellePageTableau();
    }
  };

  try {
    doc.addImage("/Logo banderole.png", "PNG", 0, 0, 210, 42);
  } catch {
    doc.setFontSize(18);
    doc.text("Adrien et ses mains", 20, 20);
  }

  doc.setFontSize(24);
doc.text(titre, 105, 58, { align: "center" });

if (type === "facture") {
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
console.log("numeroDevis PDF =", numeroDevis);

  doc.text(
    `Facture Ã©tablie suite au devis signÃ© nÂ° ${numeroDevis}`,
    105,
    65,
    { align: "center" }
  );

  doc.text(
    `Ã‰chÃ©ance de paiement : ${datePaiement || "Ã€ rÃ©ception de facture"}`,
    105,
    70,
    { align: "center" }
  );

  doc.setTextColor(0, 0, 0);
}

doc.setDrawColor(190, 145, 55);
doc.line(92, 60, 118, 60);

  doc.setFontSize(11);
  doc.text(`NÂ° ${numero}`, 160, 58);
  doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 160, 66);

  // ================= CADRES CLIENT / CHANTIER PREMIUM PRESTIGE =================

const xClient = 15;
const xChantier = 105;
const yCadres = 80;

const largeurClient = 85;
const largeurChantier = 90;

const hauteurEnteteCadre = 12;
const interligne = 5;

type LigneBloc = {
  label: string;
  valeur: string;
  icone?: string;
};

const dessinerCadreInfos = (
  titre: string,
  x: number,
  yDepart: number,
  largeur: number,
  lignes: LigneBloc[],
  decalageValeur: number
) => {
  const lignesFiltrees = lignes.filter(
    (ligne) => ligne.valeur && ligne.valeur.trim() !== ""
  );

  // Dans les champs CLIENT / CHANTIER, au moins deux espaces consÃ©cutifs
  // indiquent volontairement un retour Ã  la ligne dans le PDF.
  const preparerValeurPDF = (valeur: string) =>
    valeur.replace(/[ \t]{2,}/g, "\n").trim();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);

  // Largeur rÃ©ellement disponible entre le dÃ©but des valeurs
  // et la marge droite du cadre.
  const largeurTexte = largeur - decalageValeur - 5;

  let hauteurTexte = 0;

  lignesFiltrees.forEach((ligne) => {
    const valeurPreparee = preparerValeurPDF(ligne.valeur);
    const texteCoupe = doc.splitTextToSize(valeurPreparee, largeurTexte);
    hauteurTexte += Math.max(1, texteCoupe.length) * interligne + 1.8;
  });

  // 10 mm entre le bandeau et la premiÃ¨re ligne, puis 5 mm de marge basse.
  const hauteurBloc = Math.max(
    48,
    hauteurEnteteCadre + 10 + hauteurTexte + 5
  );

  // Ombre lÃ©gÃ¨re
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(x + 1.2, yDepart + 1.2, largeur, hauteurBloc, 3, 3, "F");

  // Fond blanc + contour dorÃ©
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(190, 145, 55);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, yDepart, largeur, hauteurBloc, 3, 3, "FD");

  // Bandeau bleu foncÃ©
  doc.setFillColor(52, 63, 79);
  doc.roundedRect(x, yDepart, largeur, hauteurEnteteCadre, 3, 3, "F");

 
  // Pastille titre
  doc.setFillColor(190, 145, 55);
  doc.circle(x + 7.5, yDepart + 6, 2.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text(titre, x + 16, yDepart + 7.5);

  let yTexte = yDepart + hauteurEnteteCadre + 10;

  lignesFiltrees.forEach((ligne) => {
    // Petite pastille ligne
    doc.setFillColor(52, 63, 79);
    doc.circle(x + 7.5, yTexte - 1.4, 1.7, "F");

    doc.setTextColor(190, 145, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(ligne.icone || "â€¢", x + 7.5, yTexte - 0.6, { align: "center" });

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.6);
    doc.setTextColor(25, 35, 48);
    doc.text(`${ligne.label} :`, x + 14, yTexte);

    // Valeur placÃ©e aprÃ¨s la plus longue Ã©tiquette du bloc.
    const valeurPreparee = preparerValeurPDF(ligne.valeur);
    const texteCoupe = doc.splitTextToSize(valeurPreparee, largeurTexte);
    const nbLignes = Math.max(1, texteCoupe.length);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.setTextColor(35, 35, 35);
    doc.text(texteCoupe, x + decalageValeur, yTexte);

    yTexte += nbLignes * interligne + 1.8;
  });

  return hauteurBloc;
};

const lignesClient: LigneBloc[] = [
  { label: "Nom", valeur: client || "", icone: "N" },
  { label: "TÃ©l.", valeur: telephone || "", icone: "T" },
  { label: "Email", valeur: email || "", icone: "@" },
  {
    label: modeClient === "agence" ? "Agence" : "Adresse",
    valeur: modeClient === "agence" ? adresseAgence || "" : adresse || "",
    icone: "A",
  },
];

let lignesChantier: LigneBloc[] = [];

if (modeClient === "jeremie") {
  lignesChantier = [
    { label: "Client", valeur: clientFinalNom || client || "", icone: "C" },
    { label: "TÃ©l.", valeur: clientFinalTelephone || telephone || "", icone: "T" },
    { label: "Adresse", valeur: clientFinalAdresse || adresse || "", icone: "A" },
  ];
} else if (modeClient === "agence") {
  lignesChantier = [
    { label: "RÃ©f.", valeur: referenceChantier || "", icone: "R" },
    { label: "Locataire", valeur: locataire || "", icone: "L" },
    { label: "TÃ©l. loc.", valeur: telephoneLocataire || "", icone: "T" },
    { label: "Proprio.", valeur: proprietaire || "", icone: "P" },
    { label: "TÃ©l. prop.", valeur: telephoneProprietaire || "", icone: "T" },
    {
      label: "Adresse",
      valeur: `${adresse || ""} ${complementAdresse || ""}`.trim(),
      icone: "A",
    },
  ];
} else {
  lignesChantier = [
    {
      label: "Adresse",
      valeur: `${adresse || ""} ${complementAdresse || ""}`.trim(),
      icone: "A",
    },
  ];
}

const hauteurClientAuto = dessinerCadreInfos(
  "CLIENT",
  xClient,
  yCadres,
  largeurClient,
  lignesClient,
  31
);

const hauteurChantierAuto = dessinerCadreInfos(
  "CHANTIER",
  xChantier,
  yCadres,
  largeurChantier,
  lignesChantier,
  modeClient === "agence" ? 35 : 31
);

doc.setFont("helvetica", "normal");
doc.setTextColor(0, 0, 0);

y = yCadres + Math.max(hauteurClientAuto, hauteurChantierAuto) + 10;

enteteTableau();

// ================= TABLEAU COMPACT =================

let lignesDevisPDF = lignesPDF();

// ðŸ”¥ CAS SPÃ‰CIAL FACTURE JÃ‰RÃ‰MIE / SAS MEURISSE COUVERTURE
if (modeClient === "jeremie" && type === "facture") {
  lignesDevisPDF = [
    [
      "Prestation de service Main d'Å“uvre uniquement\nForfait main d'Å“uvre global",
      calcul.total,
    ],
  ];
}

lignesDevisPDF.forEach(([designationBrute, montant], index) => {
  const ligneSource = lignesTravaux[index];

  const designation = designationBrute;

  const detailsLimites =
  ligneSource
    ? detailsTravaux(ligneSource)
    : designationBrute.includes("dÃ©placement")
    ? [`DÃ©placement aller-retour estimÃ© : ${calcul.kmAR} km`]
    : [];

  const detail = detailsLimites.map((t) => `â€¢ ${t}`).join("\n");

  const designationCoupe = doc.splitTextToSize(designation, 100);
  const detailCoupe = doc.splitTextToSize(detail, 145);

  const hauteur = 4 + designationCoupe.length * 4 + detailCoupe.length * 3 + 2;

  if (y + hauteur > 292) {
    doc.addPage();
    page += 1;
    y = 35;
    enteteTableau();
  }

  doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(0);
doc.text(designationCoupe, 15, y);

// ðŸ‘‰ PRIX UNIQUE propre
doc.setFont("helvetica", "normal");
doc.setFontSize(9.5);
doc.text(`${montant.toFixed(2)} â‚¬`, 190, y, { align: "right" });

 y += designationCoupe.length * 3.5;

  if (detailCoupe.length > 0) {
    doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(120);
doc.text(detailCoupe, 20, y);

y += detailCoupe.length * 3.5;
  }

  doc.setDrawColor(230);
  doc.line(15, y - 2, 195, y - 2);

  y += 2;
});

// ================= BLOC TOTAL COMPACT =================
if (y + 38 > 292) {
  doc.addPage();
  page += 1;
  y = 35;
}

const formatEuroPDF = (valeur: number) => {
  return `${(Math.round((valeur || 0) * 100) / 100).toFixed(2)} â‚¬`;
};

const montantTotalPDF = Math.round((calcul.total || 0) * 100) / 100;

const montantAcompteOuEncaissePDF =
  type === "devis"
    ? Math.round((calcul.acompte || 0) * 100) / 100
    : Math.round((montantEncaisse || 0) * 100) / 100;

const resteAPayerPDF = Math.max(
  0,
  Math.round((montantTotalPDF - montantAcompteOuEncaissePDF) * 100) / 100
);

doc.setFillColor(248, 244, 236);
doc.setDrawColor(190, 145, 55);
doc.roundedRect(95, y, 100, 34, 3, 3, "FD");

doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(0, 0, 0);

doc.text("Montant total", 103, y + 10);
doc.text(formatEuroPDF(montantTotalPDF), 188, y + 10, { align: "right" });

doc.text(type === "devis" ? "Acompte demandÃ©" : "DÃ©jÃ  encaissÃ©", 103, y + 19);
doc.text(formatEuroPDF(montantAcompteOuEncaissePDF), 188, y + 19, {
  align: "right",
});

doc.setDrawColor(180);
doc.line(103, y + 23, 190, y + 23);

doc.setFont("helvetica", "bold");
doc.text("Reste Ã  payer", 103, y + 31);
doc.text(formatEuroPDF(resteAPayerPDF), 188, y + 31, { align: "right" });

y += 42;


// ================= CONDITIONS + SIGNATURE PREMIUM COMPACT =================
// Le pied de page de la derniÃ¨re page commence Ã  256 mm.
// On arrÃªte donc tous les blocs de contenu Ã  250 mm pour garder une marge sÃ»re.
const limiteBasseContenu = 250;

if (y + 72 > limiteBasseContenu) {
  doc.addPage();
  page += 1;
  y = 35;
}


const yConditions = y;

doc.setDrawColor(60);
doc.roundedRect(15, yConditions, 180, 72, 2, 2);

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(0, 0, 0);
doc.text("CONDITIONS PARTICULIERES ET PROTECTIONS CHANTIER", 25, yConditions + 8);

doc.setDrawColor(190, 145, 55);
doc.line(25, yConditions + 12, 67, yConditions + 12);

const conditions = [
  "Le prÃ©sent devis est Ã©tabli sous rÃ©serve de lâ€™Ã©tat rÃ©el des supports existants.",
  "Toute dÃ©gradation cachÃ©e, humiditÃ©, support friable ou anomalie non visible pourra entraÃ®ner un ajustement.",
  "Les travaux supplÃ©mentaires non prÃ©vus feront lâ€™objet dâ€™un accord prÃ©alable du client.",
  "Les fournitures non mentionnÃ©es au devis ne sont pas incluses.",
  "Le client reconnaÃ®t que les quantitÃ©s et prix sont basÃ©s sur les Ã©lÃ©ments visibles au moment de lâ€™estimation.",
];

let cy = yConditions + 19;
doc.setFont("helvetica", "normal");
doc.setFontSize(8.2);
doc.setTextColor(50, 50, 50);

conditions.forEach((ligne) => {
  doc.setDrawColor(190, 145, 55);
  doc.circle(22, cy - 1.5, 1.8);
  doc.line(21.2, cy - 1.5, 22, cy - 0.3);
  doc.line(22, cy - 0.3, 23.3, cy - 3);

  const coupe = doc.splitTextToSize(ligne, 105);
  doc.text(coupe, 28, cy);
  cy += coupe.length * 3.7 + 2;
});

if (type === "devis" || type === "facture") {
  doc.setDrawColor(80);
  doc.line(140, yConditions + 15, 140, yConditions + 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
 doc.text("Bon pour accord", 167, yConditions + 20, { align: "center" });
doc.text("Date :        /        / 2026", 150, yConditions + 27);

doc.rect(148, yConditions + 31, 40, 13);

doc.setFontSize(8);
doc.text("Signature client", 168, yConditions + 50, { align: "center" });
}

// Le cadre conditions mesure rÃ©ellement 72 mm de haut.
// On repart aprÃ¨s ses 72 mm + 8 mm de marge.
y = yConditions + 72 + 8;

// ================= RIB / MODALITES DE PAIEMENT PREMIUM =================
if (ribIban || ribTitulaire || ribBic || ribBanque) {
  // PrÃ©paration des lignes avant de dessiner le cadre afin d'en calculer
  // la hauteur exacte, notamment lorsque l'IBAN passe sur deux lignes.
  const ibanCoupe = ribIban ? doc.splitTextToSize(ribIban, 56) : [];
  const nombreLignesRib =
    (ribTitulaire ? 1 : 0) +
    (ribBanque ? 1 : 0) +
    ibanCoupe.length +
    (ribBic ? 1 : 0);

  const hauteurBlocRib = Math.max(36, 14 + nombreLignesRib * 6);

  if (y + hauteurBlocRib > limiteBasseContenu) {
    doc.addPage();
    page += 1;
    y = 35;
  }

  doc.setDrawColor(190, 145, 55);
  doc.setFillColor(248, 244, 236);
  doc.roundedRect(15, y, 180, hauteurBlocRib, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(52, 63, 79);
  doc.text("MODALITES DE PAIEMENT", 25, y + 8);

  doc.setDrawColor(190, 145, 55);
  doc.line(25, y + 11, 72, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  doc.text("RÃ¨glement par virement bancaire :", 25, y + 19);

  if (type === "devis") {
    doc.text("Paiement selon les modalitÃ©s indiquÃ©es sur le document.", 25, y + 25);
  } else {
    doc.text("Paiement Ã  rÃ©ception de facture.", 25, y + 25);
  }

  doc.setDrawColor(220);
  doc.line(102, y + 6, 102, y + hauteurBlocRib - 6);

  let ribY = y + 8;

  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  if (ribTitulaire) {
    doc.setFont("helvetica", "bold");
    doc.text("Titulaire :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ribTitulaire, 132, ribY);
    ribY += 6;
  }

  if (ribBanque) {
    doc.setFont("helvetica", "bold");
    doc.text("Banque :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ribBanque, 132, ribY);
    ribY += 6;
  }

  if (ribIban) {
    doc.setFont("helvetica", "bold");
    doc.text("IBAN :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ibanCoupe, 132, ribY);
    ribY += ibanCoupe.length * 6;
  }

  if (ribBic) {
    doc.setFont("helvetica", "bold");
    doc.text("BIC :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ribBic, 132, ribY);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  y += hauteurBlocRib + 4;
}

const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Page ${i}/${totalPages}`, 190, 294, { align: "right" });
  }

  doc.setPage(totalPages);

  doc.setDrawColor(190, 145, 55);
  doc.rect(15, 262, 180, 8);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
doc.setTextColor(90, 90, 90);

doc.text(
  "En cas de retard de paiement, des pÃ©nalitÃ©s calculÃ©es au taux lÃ©gal en vigueur seront appliquÃ©es,",
  105,
  256,
  { align: "center" }
);

doc.text(
  "ainsi quâ€™une indemnitÃ© forfaitaire de 40 â‚¬ pour frais de recouvrement (article L441-10 du Code de commerce).",
  105,
  259,
  { align: "center" }
);

doc.setTextColor(0, 0, 0);
  doc.text("TVA NON APPLICABLE - ARTICLE 293 B DU CGI", 105, 267.5, {
    align: "center",
  });

  doc.setFillColor(52, 63, 79);
  doc.rect(15, 274, 180, 16, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(
    "Adrien et ses mains   -   06 71 17 11 76   -   adrienetsesmains@gmail.com",
    105,
    281,
    { align: "center" }
  );
  doc.text("Siret : 93518474700019 - Auto-entrepreneur", 105, 287, {
    align: "center",
  });

  const nomFichier = `${numero}-${client || "client"}.pdf`;

// âœ… garde le tÃ©lÃ©chargement PDF normal
doc.save(nomFichier);

// âœ… crÃ©e aussi le PDF pour la piÃ¨ce jointe mail
const pdfBlob = doc.output("blob");

return new Promise<string>((resolve) => {
  const reader = new FileReader();

  reader.onloadend = () => {
    const base64 = (reader.result as string).split(",")[1];
    resolve(base64);
  };

  reader.readAsDataURL(pdfBlob);
});

return new Promise<string>((resolve) => {
  const reader = new FileReader();

  reader.onloadend = () => {
    const base64 = (reader.result as string).split(",")[1];
    resolve(base64);
  };

  reader.readAsDataURL(pdfBlob);
});
};

// ðŸ”¥ FERMETURE PROPRE DE LA FONCTION genererPDF

const genererFicheChantier = () => {
  if (lignesTravaux.length === 0) {
    alert("Ajoute au moins une prestation avant de gÃ©nÃ©rer la fiche chantier.");
    return;
  }

  const doc = new jsPDF();
  const largeurPage = 210;
  const marge = 15;
  const largeurUtile = largeurPage - marge * 2;
  let y = 18;

  // La dÃ©tection du matÃ©riel et des vigilances repose uniquement sur le nom
  // des prestations. Les dÃ©tails PDF peuvent contenir des mots gÃ©nÃ©riques
  // (SPEC, carrelage, douche...) qui dÃ©clenchaient auparavant des conseils
  // sans rapport avec le chantier rÃ©el.
  const textePrestations = normaliserTexte(
    lignesTravaux.map((ligne) => ligne.prestationNom || "").join(" ")
  );

  const ajouterPiedDePage = () => {
    const totalPages = doc.getNumberOfPages();

    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      doc.setDrawColor(203, 213, 225);
      doc.line(marge, 285, largeurPage - marge, 285);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Fiche chantier interne - ${numeroDevis || "Devis non numÃ©rotÃ©"}`,
        marge,
        290
      );
      doc.text(`Page ${page}/${totalPages}`, largeurPage - marge, 290, {
        align: "right",
      });
    }
  };

  const nouvellePageSiBesoin = (hauteurNecessaire = 18) => {
    if (y + hauteurNecessaire <= 281) return;

    doc.addPage();
    y = 18;
  };

  const ajouterTitreSection = (titre: string) => {
    nouvellePageSiBesoin(16);
    doc.setFillColor(52, 63, 79);
    doc.roundedRect(marge, y, largeurUtile, 9, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(titre.toUpperCase(), marge + 4, y + 6);
    y += 12;
  };

  const ajouterTexte = (
    texte: string,
    options?: { gras?: boolean; retrait?: number; taille?: number; couleur?: number[] }
  ) => {
    const retrait = options?.retrait || 0;
    const taille = options?.taille || 9;
    const lignes = doc.splitTextToSize(texte || "-", largeurUtile - retrait);
    const hauteur = lignes.length * 4.1 + 0.7;

    nouvellePageSiBesoin(hauteur);
    doc.setFont("helvetica", options?.gras ? "bold" : "normal");
    doc.setFontSize(taille);
    const couleur = options?.couleur || [30, 41, 59];
    doc.setTextColor(couleur[0], couleur[1], couleur[2]);
    doc.text(lignes, marge + retrait, y);
    y += hauteur;
  };

  const ajouterTexteAvecCase = (
    texte: string,
    options?: { gras?: boolean; taille?: number }
  ) => {
    const taille = options?.taille || 8.2;
    const lignes = doc.splitTextToSize(texte || "-", largeurUtile - 8);
    const hauteur = Math.max(4.5, lignes.length * 4.1 + 0.7);

    nouvellePageSiBesoin(hauteur);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.35);
    doc.rect(marge + 1, y - 3.2, 3.2, 3.2);
    doc.setFont("helvetica", options?.gras ? "bold" : "normal");
    doc.setFontSize(taille);
    doc.setTextColor(30, 41, 59);
    doc.text(lignes, marge + 7, y);
    y += hauteur;
  };

  const ajouterListe = (elements: string[]) => {
    elements.filter(Boolean).forEach((element) => {
      ajouterTexteAvecCase(element, { taille: 8.2 });
    });
  };

  doc.setFillColor(52, 63, 79);
  doc.rect(0, 0, largeurPage, 31, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FICHE CHANTIER", marge, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Adrien et ses mains - Document interne", marge, 22);
  doc.text(numeroDevis || "Devis non numÃ©rotÃ©", largeurPage - marge, 14, {
    align: "right",
  });
  doc.text(new Date().toLocaleDateString("fr-FR"), largeurPage - marge, 22, {
    align: "right",
  });
  y = 41;

  ajouterTitreSection("Identification du chantier");
  ajouterTexte(`Client / agence : ${client || agence || "Non renseignÃ©"}`, {
    gras: true,
  });
  if (clientFinalNom) ajouterTexte(`Client final : ${clientFinalNom}`);
  if (proprietaire) ajouterTexte(`PropriÃ©taire : ${proprietaire}`);
  if (locataire) ajouterTexte(`Locataire : ${locataire}`);
  if (adresseAgence || adresse) {
    ajouterTexte(`Adresse agence / client : ${adresseAgence || adresse}`);
  }
  ajouterTexte(
    `Adresse chantier : ${clientFinalAdresse || complementAdresse || adresse || "Non renseignÃ©e"}`
  );
  if (referenceChantier) ajouterTexte(`RÃ©fÃ©rence : ${referenceChantier}`);
  if (dateChantier) ajouterTexte(`Date prÃ©vue : ${dateChantier}${heureChantier ? ` Ã  ${heureChantier}` : ""}`);
  if (telephoneLocataire) ajouterTexte(`TÃ©lÃ©phone sur place : ${telephoneLocataire}`);

  ajouterTexte(
    `Trajet : ${Number(kmAller || 0).toFixed(1)} km aller / ${Number(calcul.kmAR || 0).toFixed(1)} km aller-retour   |   DÃ©placement total : ${Number(calcul.fraisLogistique || 0).toFixed(2)} â‚¬`,
    { gras: true, taille: 8.5 }
  );
  ajouterTexte(
    `Temps prÃ©vu : ${Number(calcul.totalHeuresChantier || 0).toFixed(1)} h   |   DurÃ©e estimÃ©e : ${calcul.nombreJoursChantier} jour${calcul.nombreJoursChantier > 1 ? "s" : ""}   |   Achat fournitures : ${Number(achatFournitures || 0).toFixed(2)} â‚¬ TTC`,
    { gras: true, taille: 8.5 }
  );

  ajouterTitreSection("Travaux prÃ©vus");
  lignesTravaux.forEach((ligne, index) => {
    const quantite = ligne.q1 || 1;
    ajouterTexteAvecCase(
      `${index + 1}. ${ligne.prestationNom || "Prestation personnalisÃ©e"} - ${quantite} ${ligne.unite || "u"}`,
      { gras: true, taille: 9.2 }
    );
    ajouterListe(
      (ligne.detailsPdfPersonnalises?.length
        ? ligne.detailsPdfPersonnalises
        : detailsTravaux(ligne)
      ).filter((detail) => detail.trim())
    );
    y += 1;
  });

  ajouterTitreSection("Fournitures et approvisionnement");
  if (fournituresClient) {
    ajouterTexte("Fournitures Ã  la charge du client.", { gras: true });
  } else {
    ajouterTexte(`CoÃ»t dâ€™achat total : ${Number(achatFournitures || 0).toFixed(2)} â‚¬ TTC`, {
      gras: true,
    });
    const lignesFournitures = (detailsFournitures?.trim() || "")
      .split(/\r?\n/)
      .map((ligne) => ligne.trim())
      .filter(Boolean)
      .map((ligne) =>
        ligne
          .replace(/(\d+)â‚¬(\d{2})\b/g, "$1,$2 â‚¬")
          .replace(/(\d+(?:[.,]\d+)?)\s*â‚¬/g, "$1 â‚¬")
      );

    if (lignesFournitures.length > 0) {
      ajouterListe(lignesFournitures);
    } else {
      ajouterTexteAvecCase("VÃ©rifier la liste, les quantitÃ©s, les rÃ©fÃ©rences et la disponibilitÃ© avant le dÃ©part.");
    }
  }

  const outils = new Set<string>([
    "Protections, bÃ¢ches, ruban de masquage et sacs Ã  gravats",
    "MÃ¨tre, crayon, niveau et petit outillage Ã  main",
    "Aspirateur de chantier et matÃ©riel de nettoyage",
  ]);

  if (/faience|carrelage|spec|etancheite|receveur/.test(textePrestations)) {
    outils.add("Perforateur, burineur et Ã©quipements de protection");
    outils.add("Coupe-carreaux, meuleuse, peignes, croisillons et malaxeur");
    outils.add("Rouleaux, pinceaux et accessoires dâ€™application du SPEC");
  }
  if (/plomberie|receveur|vasque|robinet|mitigeur|siphon|vidage|evacuation/.test(textePrestations)) {
    outils.add("ClÃ©s de plomberie, pince multiprise et matÃ©riel de raccordement");
    outils.add("MatÃ©riel de contrÃ´le dâ€™Ã©coulement et dâ€™Ã©tanchÃ©itÃ©");
  }
  if (/peinture|enduit|ratissage|poncage/.test(textePrestations)) {
    outils.add("Couteaux Ã  enduire, ponceuse, abrasifs, rouleaux et pinceaux");
  }
  if (/sol pvc|revetement de sol|plinthe/.test(textePrestations)) {
    outils.add("Cutter, rÃ¨gle, cale de frappe et outils de dÃ©coupe du revÃªtement");
  }
  if (/plan de travail/.test(textePrestations)) {
    outils.add("Scie circulaire, scie sauteuse, trÃ©teaux, serre-joints et guide de coupe");
  }
  if (/ventilation|entree d air|grille exterieure|traversee murale/.test(textePrestations)) {
    outils.add("Perforateur, scie-cloche ou carotteuse adaptÃ©e au support");
    outils.add("DÃ©tecteur de matÃ©riaux et matÃ©riel de calfeutrement");
  }

  ajouterTitreSection("Outils et matÃ©riel Ã  prÃ©voir");
  ajouterListe(Array.from(outils));

  const vigilance = new Set<string>([
    "Photographier les lieux et les Ã©quipements avant toute intervention",
    "Confirmer lâ€™accÃ¨s, le stationnement et la prÃ©sence dâ€™eau et dâ€™Ã©lectricitÃ©",
    "ProtÃ©ger les circulations et les Ã©lÃ©ments conservÃ©s",
    "Faire valider toute anomalie ou prestation supplÃ©mentaire avant exÃ©cution",
  ]);

  if (/faience|carrelage|spec|etancheite|receveur/.test(textePrestations)) {
    vigilance.add("ContrÃ´ler lâ€™humiditÃ©, la soliditÃ© et la planÃ©itÃ© des supports aprÃ¨s dÃ©pose");
    vigilance.add("Respecter les temps de sÃ©chage du support, du SPEC, de la colle et des joints");
    vigilance.add("Soigner les angles, traversÃ©es, liaisons avec le receveur et joints sanitaires");
  }
  if (/paroi|cabine/.test(textePrestations)) {
    vigilance.add("Manipuler les vitrages Ã  deux personnes et contrÃ´ler les piÃ¨ces avant rÃ©emploi");
  }
  if (/peinture/.test(textePrestations)) {
    vigilance.add("VÃ©rifier le fonctionnement de la ventilation avant remise en peinture");
  }
  if (/plan de travail/.test(textePrestations)) {
    vigilance.add("ContrÃ´ler les dimensions, lâ€™Ã©querrage, les dÃ©coupes et la position de lâ€™Ã©vier avant coupe");
    vigilance.add("ProtÃ©ger et Ã©tancher soigneusement tous les chants dÃ©coupÃ©s");
  }
  if (/ventilation|entree d air|grille exterieure|traversee murale/.test(textePrestations)) {
    vigilance.add("ContrÃ´ler lâ€™absence de rÃ©seau dans la zone avant tout percement");
    vigilance.add("VÃ©rifier le diamÃ¨tre, la pente vers lâ€™extÃ©rieur et lâ€™Ã©tanchÃ©itÃ© du passage");
  }

  ajouterTitreSection("Points de vigilance");
  ajouterListe(Array.from(vigilance));

  ajouterTitreSection("ContrÃ´les du chantier");
  ajouterListe([
    "Photos avant travaux rÃ©alisÃ©es",
    "Implantation et dimensions contrÃ´lÃ©es",
    "Fournitures et consommables vÃ©rifiÃ©s",
    "Protections mises en place",
    "Essais et contrÃ´les de fin dâ€™intervention rÃ©alisÃ©s",
    "Photos de fin de chantier rÃ©alisÃ©es",
    "DÃ©chets Ã©vacuÃ©s et zone nettoyÃ©e",
  ]);

  ajouterTitreSection("Suivi rÃ©el et imprÃ©vus");
  ajouterTexte(`Heures rÃ©ellement effectuÃ©es : ____________________`, { taille: 8.5 });
  ajouterTexte(`Travaux supplÃ©mentaires validÃ©s : ______________________________________________`, { taille: 8.5 });
  ajouterTexte(`ImprÃ©vus / anomalies constatÃ©s : _______________________________________________`, { taille: 8.5 });
  ajouterTexte(`______________________________________________________________________________`, { taille: 8.5 });

  if (notes?.trim()) {
    ajouterTitreSection("Notes du dossier");
    ajouterTexte(notes.trim());
  }

  ajouterPiedDePage();

  const nomClientFichier = (clientFinalNom || locataire || client || "chantier")
   .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim();

  doc.save(
    `FICHE-${numeroDevis || "CHANTIER"}-${nomClientFichier || "chantier"}.pdf`
  );
};

return (
  <main className="min-h-screen bg-slate-100 p-3 text-slate-900 md:p-4">
<div className="sticky top-0 z-40 mb-2 rounded-xl border border-blue-200 bg-white/95 p-2 shadow-sm backdrop-blur">
  <input
    ref={importRef}
    type="file"
    accept="application/json"
    className="hidden"
    onChange={importer}
  />

  {/* VERSION ORDINATEUR */}
  <div className="hidden space-y-2 md:block">
    <div className="grid grid-cols-6 gap-1">
      {[
        ["Client", resumeExpress.clientEnCours || "-"],
        ["Total", `${resumeExpress.totalDevis} â‚¬`],
        ["EncaissÃ©", `${resumeExpress.dejaEncaisse} â‚¬`],
        ["Reste", `${resumeExpress.resteReel} â‚¬`],
        ["Paiement", resumeExpress.paiementPrevu || "-"],
        ["PrioritÃ©", resumeExpress.prioriteActuelle || "-"],
      ].map(([titre, valeur]) => (
        <div key={titre} className="rounded-lg border bg-white px-2 py-1">
          <p className="text-[10px] font-semibold text-slate-500">{titre}</p>
          <p className="truncate text-sm font-bold text-slate-900">{valeur}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1 xl:grid-cols-[repeat(14,minmax(0,1fr))]">
      <button onClick={envoyerCloud} className="btn-blue px-2 py-1 text-[11px]">
        â˜ï¸ Sauv. cloud
      </button>

      <button onClick={recupererCloud} className="btn-emerald px-2 py-1 text-[11px]">
        ðŸ“¥ Charger
      </button>

      <button
        onClick={() => {
          setFicheOuverte(true);
          setStatutDevis("estimation_rapide");
          setNumeroDevis("");
          setNumeroFacture("");
        }}
        className="btn-orange px-2 py-1 text-[11px]"
      >
        âš¡ Esti.
      </button>

      <button onClick={nouveauDossier} className="btn-dark px-2 py-1 text-[11px]">
        Nouveau
      </button>

      <button onClick={enregistrer} className="btn-amber px-2 py-1 text-[11px]">
        Enregistrer
      </button>

      <button onClick={() => genererPDF("devis")} className="btn-blue px-2 py-1 text-[11px]">
        PDF devis
      </button>

      <button
        onClick={genererFicheChantier}
        className="btn-outline px-2 py-1 text-[11px]"
      >
        Fiche chantier
      </button>

      <button onClick={() => genererPDF("facture")} className="btn-emerald px-2 py-1 text-[11px]">
        PDF facture
      </button>

      <button onClick={envoyerDevisMail} className="btn-green px-2 py-1 text-[11px]">
        Mail devis
      </button>

      <button onClick={envoyerFactureMail} className="btn-green px-2 py-1 text-[11px]">
        Mail facture
      </button>

     
      <button onClick={exporter} className="btn-purple px-2 py-1 text-[11px]">
        Export
      </button>

      <button onClick={() => importRef.current?.click()} className="btn-outline px-2 py-1 text-[11px]">
        Import
      </button>

      <button
        onClick={reinitialiserApplicationComplete}
        className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700"
      >
        RAZ appli
      </button>
    </div>
  </div>

  {/* VERSION TÃ‰LÃ‰PHONE */}
  <div className="space-y-1 md:hidden">
    <div className="grid grid-cols-6 gap-1">
      {[
        ["Client", resumeExpress.clientEnCours || "-"],
        ["Total", `${resumeExpress.totalDevis} â‚¬`],
        ["Enc.", `${resumeExpress.dejaEncaisse} â‚¬`],
        ["Reste", `${resumeExpress.resteReel} â‚¬`],
        ["Pay.", resumeExpress.paiementPrevu || "-"],
        ["Prio", resumeExpress.prioriteActuelle || "-"],
      ].map(([titre, valeur]) => (
        <div key={titre} className="rounded-md border bg-white px-1 py-1">
          <p className="text-[8px] leading-none text-slate-500">{titre}</p>
          <p className="truncate text-[10px] font-bold leading-tight text-slate-900">
            {valeur}
          </p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-6 gap-1">
      <button
        onClick={() => {
          setFicheOuverte(true);
          setStatutDevis("estimation_rapide");
          setNumeroDevis("");
          setNumeroFacture("");
        }}
        className="rounded-md border border-orange-200 bg-orange-50 px-1 py-1 text-[10px] font-bold text-orange-800"
      >
        Estim.
      </button>

      <button
        onClick={nouveauDossier}
        className="rounded-md border border-slate-300 bg-slate-100 px-1 py-1 text-[10px] font-bold text-slate-800"
      >
        Nouveau
      </button>

<button
        onClick={enregistrer}
        className="rounded-md border border-amber-200 bg-amber-50 px-1 py-1 text-[10px] font-bold text-amber-800"
      >
        Enreg.
      </button>

      <button
        onClick={envoyerCloud}
        className="rounded-md border border-blue-200 bg-blue-50 px-1 py-1 text-[10px] font-bold text-blue-800"
      >   
        Sauv.
      </button>

      <button
        onClick={recupererCloud}
        className="rounded-md border border-emerald-200 bg-emerald-50 px-1 py-1 text-[10px] font-bold text-emerald-800"
      >
        Charger
      </button>

      <button
        onClick={genererFicheChantier}
        className="rounded-md border border-violet-200 bg-violet-50 px-1 py-1 text-[10px] font-bold text-violet-800"
      >
        Fiche
      </button>

      
      
    </div>
  </div>
</div>
    <style jsx>{`

  .btn-green {
    background:#dcfce7;
    color:#166534;
    border:1px solid #bbf7d0;
    padding:12px;
    border-radius:12px;
    font-weight:700;
  }

  .btn-orange {
    background:#ffedd5;
    color:#9a3412;
    border:1px solid #fed7aa;
    padding:12px;
    border-radius:12px;
    font-weight:700;
  }

  .btn-dark {
    background:#e2e8f0;
    color:#1e293b;
    border:1px solid #cbd5e1;
    padding:12px;
    border-radius:12px;
    font-weight:700;
  }

  .btn-amber {
    background:#fef3c7;
    color:#92400e;
    border:1px solid #fde68a;
    padding:12px;
    border-radius:12px;
    font-weight:700;
  }

  .btn-blue {
    background:#dbeafe;
    color:#1e40af;
    border:1px solid #bfdbfe;
    padding:12px;
    border-radius:12px;
    font-weight:700;
  }

  .btn-emerald {
    background:#d1fae5;
    color:#065f46;
    border:1px solid #a7f3d0;
    padding:12px;
    border-radius:12px;
    font-weight:700;
  }

  .btn-purple {
    background:#f3e8ff;
    color:#6b21a8;
    border:1px solid #e9d5ff;
    padding:12px;
    border-radius:12px;
    font-weight:700;
  }

  .btn-outline {
    background:#f8fafc;
    color:#334155;
    border:1px solid #cbd5e1;
    padding:12px;
    border-radius:12px;
    font-weight:700;
  }

  .btn-green:hover,
  .btn-orange:hover,
  .btn-dark:hover,
  .btn-amber:hover,
  .btn-blue:hover,
  .btn-emerald:hover,
  .btn-purple:hover,
  .btn-outline:hover {
    filter: brightness(0.97);
  }
`}</style>
      <div className="mx-auto max-w-7xl space-y-3">
        <section className="rounded-xl bg-slate-800 px-4 py-3 text-white shadow-sm">

<div className="rounded-lg border bg-slate-50 p-3">
  <button
    type="button"
    onClick={() => {
      const backups = JSON.parse(
        localStorage.getItem(CLE_BACKUPS_V25) ||
          localStorage.getItem(CLE_BACKUPS_V24) ||
          "[]"
      );
      setListeBackups(backups);
      setSauvegardesOuvertes(!sauvegardesOuvertes);
    }}
    className="flex w-full items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800"
  >
    ðŸ” Sauvegardes de sÃ©curitÃ©
    <span>{sauvegardesOuvertes ? "â–²" : "â–¼"}</span>
  </button>

  {sauvegardesOuvertes && (
    <div className="mt-2 space-y-2">
      {listeBackups
        .slice()
        .reverse()
        .map((b: any, i: number) => (
          <button
            key={i}
            onClick={() => {
              const confirmation = window.confirm(
                `Restaurer la sauvegarde du ${b.date} ?`
              );
              if (!confirmation) return;

              const backups = JSON.parse(
                localStorage.getItem(CLE_BACKUPS_V25) ||
                  localStorage.getItem(CLE_BACKUPS_V24) ||
                  "[]"
              );

              restaurerBackup(backups.length - 1 - i);
            }}
            className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-amber-50"
          >
            {b.date}
          </button>
        ))}
    </div>
  )}
</div>

          <p className="text-sm text-amber-300">Adrien et ses mains</p>
          <h1 className="mt-1 text-2xl font-bold">
            Tableau de bord entreprise {VERSION_APPLICATION}
          </h1>
          <p className="mt-1 text-sm text-slate-200">
          Devis multi-lignes : plusieurs types de travaux dans un mÃªme devis.</p>
        {statutDevis === "estimation_rapide" && (
  <div className="mt-4 inline-block rounded-xl bg-yellow-400 px-4 py-2 font-bold text-slate-900">
    ðŸŸ¡ MODE ESTIMATION RAPIDE
  </div>
)}
        </section>
<BlocRepliable titre="Tableau de bord mensuel" ouvertParDefaut={false}>

  <div className="flex items-center justify-between">
    <button
      onClick={() => {
        if (moisSelectionne === 0) {
          setMoisSelectionne(11);
          setAnneeSelectionnee(anneeSelectionnee - 1);
        } else {
          setMoisSelectionne(moisSelectionne - 1);
        }
      }}
      className="rounded bg-slate-200 px-3 py-1"
    >
      â†
    </button>

    <span className="font-semibold">
      {new Date(anneeSelectionnee, moisSelectionne).toLocaleString("fr-FR", {
        month: "long",
        year: "numeric",
      })}
    </span>

    <button
      onClick={() => {
        if (moisSelectionne === 11) {
          setMoisSelectionne(0);
          setAnneeSelectionnee(anneeSelectionnee + 1);
        } else {
          setMoisSelectionne(moisSelectionne + 1);
        }
      }}
      className="rounded bg-slate-200 px-3 py-1"
    >
      â†’
    </button>
  </div>

  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 mt-3">

    <MiniResult titre="Encaisse" valeur={`${tableauMensuel.totalEncaisse} â‚¬`} couleur="text-green-700" />
    <MiniResult titre="Reste" valeur={`${tableauMensuel.resteAEncaisser} â‚¬`} couleur="text-orange-600" />
    <MiniResult titre="Relance" valeur={`${tableauMensuel.totalRelance} â‚¬`} couleur="text-red-600" />
    <MiniResult titre="DÃ©penses" valeur={`${tableauMensuel.totalDepenses} â‚¬`} couleur="text-red-700" />
<MiniResult titre="Solde rÃ©el" valeur={`${tableauMensuel.soldeReel} â‚¬`} couleur="text-blue-700" />
<MiniResult titre="URSSAF" valeur={`${tableauMensuel.estimationUrssaf} â‚¬`} />
  </div>

  {tableauMensuel.alerteFaible && (
    <div className="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm font-semibold text-orange-700">
      âš  Objectif non atteint â€” vigilance trÃ©sorerie
    </div>
  )}

  <BlocRepliable titre="Graphique mensuel" ouvertParDefaut={false}>
    <GraphiqueCourbe donnees={donneesGraphique} />
  </BlocRepliable>

</BlocRepliable>

<Bloc titre="DÃ©penses entreprise">
  <div className="grid gap-2 md:grid-cols-3">
    <MiniResult
      titre="DÃ©penses du mois"
      valeur={`${resumeDepenses.totalMois.toFixed(2)} â‚¬`}
      couleur="text-red-700"
    />

    <MiniResult
      titre="DÃ©penses annÃ©e"
      valeur={`${resumeDepenses.totalAnnee.toFixed(2)} â‚¬`}
      couleur="text-orange-700"
    />

    <MiniResult
      titre="Nombre dÃ©penses"
      valeur={`${resumeDepenses.nombreTotal}`}
      couleur="text-slate-900"
    />
  </div>

  <div className="grid gap-3 md:grid-cols-5">
    <DateInput label="Date dÃ©pense" value={depenseDate} onChange={setDepenseDate} />

    <Select
      label="CatÃ©gorie"
      value={depenseCategorie}
      onChange={setDepenseCategorie}
      options={[
        ["Fournitures", "Fournitures"],
        ["Essence", "Essence"],
        ["MatÃ©riel", "MatÃ©riel"],
        ["Assurance", "Assurance"],
        ["Banque", "Banque"],
        ["Sous-traitance", "Sous-traitance"],
        ["Autre", "Autre"],
      ]}
    />

    <Input label="Description" value={depenseDescription} onChange={setDepenseDescription} />
    <NumberInput label="Montant TTC" value={depenseMontant} onChange={setDepenseMontant} />

    <Select
      label="Paiement"
      value={depenseModePaiement}
      onChange={setDepenseModePaiement}
      options={[
        ["CB", "CB"],
        ["EspÃ¨ces", "EspÃ¨ces"],
        ["Virement", "Virement"],
        ["ChÃ¨que", "ChÃ¨que"],
        ["Autre", "Autre"],
      ]}
    />
  </div>

  <button
    type="button"
    onClick={() => {
      if (!depenseMontant || depenseMontant <= 0) {
        alert("Indique un montant de dÃ©pense.");
        return;
      }

      setDepenses([
        {
          id: Date.now(),
          date: depenseDate,
          categorie: depenseCategorie,
          description: depenseDescription,
          montant: depenseMontant,
          modePaiement: depenseModePaiement,
        },
        ...depenses,
      ]);

      setDepenseDescription("");
      setDepenseMontant(0);
    }}
    className="btn-orange"
  >
    Ajouter dÃ©pense
  </button>

  <BlocRepliable titre={`Historique dÃ©penses (${depenses.length})`} ouvertParDefaut={false}>
    {depensesTriees.length === 0 ? (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Aucune dÃ©pense enregistrÃ©e.
      </p>
    ) : (
      <div className="space-y-2">
        {depensesTriees.map((depense) => (
          <div key={depense.id} className="rounded-xl border bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">
                  {depense.date} â€” {depense.categorie}
                </p>

                <p className="text-slate-600">
                  {depense.description || "Sans description"} Â· {depense.modePaiement}
                </p>
              </div>

              <p className="font-bold text-red-700">
                {(depense.montant || 0).toFixed(2)} â‚¬
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const nouvelleDate = window.prompt("Date de la dÃ©pense :", depense.date);
                  if (nouvelleDate === null) return;

                  const nouvelleCategorie = window.prompt("CatÃ©gorie :", depense.categorie);
                  if (nouvelleCategorie === null) return;

                  const nouvelleDescription = window.prompt("Description :", depense.description);
                  if (nouvelleDescription === null) return;

                  const nouveauMontantTexte = window.prompt("Montant TTC :", String(depense.montant));
                  if (nouveauMontantTexte === null) return;

                  const nouveauMontant = Number(nouveauMontantTexte.replace(",", "."));

                  if (Number.isNaN(nouveauMontant) || nouveauMontant < 0) {
                    alert("Montant invalide.");
                    return;
                  }

                  const nouveauModePaiement = window.prompt("Mode de paiement :", depense.modePaiement);
                  if (nouveauModePaiement === null) return;

                  setDepenses((anciennes) =>
                    anciennes.map((d) =>
                      d.id === depense.id
                        ? {
                            ...d,
                            date: nouvelleDate,
                            categorie: nouvelleCategorie,
                            description: nouvelleDescription,
                            montant: Math.round(nouveauMontant * 100) / 100,
                            modePaiement: nouveauModePaiement,
                          }
                        : d
                    )
                  );
                }}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
              >
                Modifier
              </button>

              <button
                type="button"
                onClick={() => {
                  const confirmation = window.confirm("Supprimer cette dÃ©pense ?");
                  if (!confirmation) return;

                  setDepenses((anciennes) => anciennes.filter((d) => d.id !== depense.id));
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </BlocRepliable>
</Bloc>

<BlocRepliable titre="Calendrier chantier" ouvertParDefaut={false}>
  <div className="rounded-xl border bg-slate-50 p-3 space-y-3">
    <Input
      label="Recherche planning / client / devis / facture"
      value={rechercheCalendrier}
      onChange={setRechercheCalendrier}
    />

    {rechercheCalendrier && (
      <div className="space-y-2">
        {resultatsCalendrier.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun dossier trouvÃ©.</p>
        ) : (
          resultatsCalendrier.map((d) => (
            <div key={d.id} className="rounded-xl border bg-white p-3 space-y-2">
              <p className="font-bold text-slate-800">
  {d.modeClient === "jeremie"
    ? d.clientFinalNom || d.client || "Client non renseignÃ©"
    : d.modeClient === "agence"
    ? d.locataire || d.proprietaire || d.client || "Client non renseignÃ©"
    : d.client || "Client non renseignÃ©"}
</p>
              <p className="text-sm text-slate-600">ðŸ“ž {d.telephone || "TÃ©lÃ©phone non renseignÃ©"}</p>
              <p className="text-sm text-slate-600">
  ðŸ“{" "}
  {d.modeClient === "jeremie"
    ? d.clientFinalAdresse || d.adresse || "Adresse non renseignÃ©e"
    : d.modeClient === "agence"
    ? `${d.adresse || ""} ${d.complementAdresse || ""}`.trim() ||
      "Adresse chantier non renseignÃ©e"
    : d.adresse || "Adresse non renseignÃ©e"}
</p>

              <button
                onClick={() => {
                  rechargerDossier(d);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="btn-dark"
              >
                Ouvrir dossier
              </button>
            </div>
          ))
        )}
      </div>
    )}
  </div>

  <div className="flex items-center justify-between mb-3">
    <button
      onClick={() => {
        if (moisSelectionne === 0) {
          setMoisSelectionne(11);
          setAnneeSelectionnee(anneeSelectionnee - 1);
        } else {
          setMoisSelectionne(moisSelectionne - 1);
        }
      }}
      className="btn-outline"
    >
      â†
    </button>

    <p className="font-bold text-slate-800">
      {new Date(anneeSelectionnee, moisSelectionne).toLocaleString("fr-FR", {
        month: "long",
        year: "numeric",
      })}
    </p>

    <button
      onClick={() => {
        if (moisSelectionne === 11) {
          setMoisSelectionne(0);
          setAnneeSelectionnee(anneeSelectionnee + 1);
        } else {
          setMoisSelectionne(moisSelectionne + 1);
        }
      }}
      className="btn-outline"
    >
      â†’
    </button>
  </div>

  <div className="grid grid-cols-7 gap-2 text-xs font-bold text-slate-500 text-center">
    <div>Lun</div>
    <div>Mar</div>
    <div>Mer</div>
    <div>Jeu</div>
    <div>Ven</div>
    <div>Sam</div>
    <div>Dim</div>
  </div>

  <div className="grid grid-cols-7 gap-2 mt-2">
    {joursCalendrier.map((jour, index) => (
      <div
        key={index}
        onClick={() => {
          if (!jour) return;
          setDateSelectionnee(jour.dateCase);
          setAjoutRdvOuvert(false);
          setShowPopupCalendrier(true);
        }}
        className={`min-h-[90px] rounded-lg border p-2 cursor-pointer transition hover:bg-emerald-50 ${
          jour ? "bg-white" : "bg-slate-50"
        }`}
      >
        {jour && (
          <>
            <p className="text-xs font-bold text-slate-700">{jour.numeroJour}</p>

            {jour.dossiersJour.length === 0 && (
              <p className="text-[10px] text-slate-400">+ ajouter</p>
            )}

            <div className="space-y-1 mt-1">
              {jour.dossiersJour.map((d) => (
                <div key={d.id} className="rounded-md border bg-blue-50 px-1 py-1 text-[10px] text-blue-800">
                  <div className="font-bold">{d.heureRdv || d.heureChantier || ""}</div>
                  <div>{d.client || "Client"}</div>
                  <div className="italic">{d.motifRdv || d.lignesTravaux?.[0]?.prestationNom || "RDV / chantier"}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    ))}
  </div>
</BlocRepliable>


  
        {ficheOuverte && (
<section ref={ficheClientRef} className="grid gap-6 lg:grid-cols-2">
  <Bloc titre="Client">
            <Select
  label="Client enregistrÃ©"
  value={client}
  onChange={(v) => {
    if (v === "") {
      setClient("");
      setTelephone("");
      setEmail("");
      setAdresse("");
      setAdresseAgence("");
      setNotes("");
      setAgence("");
      return;
    }

    chargerClient(v);
  }}
  options={[
    ["", "-- Nouveau client --"],
    ...clientsEnregistres.map((c) => [c.nom, c.nom]),
  ]}
/>
            <div>
  <div className="flex items-center justify-between gap-3">
    <label className="text-sm font-medium">Client</label>

    {clientsEnregistres.some(
      (c) => normaliserTexte(c.nom) === normaliserTexte(client)
    ) && (
      <button
        type="button"
        onClick={() => supprimerClientEnregistre(client)}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
      >
        Supprimer ce client
      </button>
    )}
  </div>

  <input
    ref={inputClientRef}
    className="mt-2 w-full rounded-xl border p-3"
    value={client}
    list="liste-clients-enregistres"
    placeholder="Tape le nom du client..."
    onChange={(e) => {
      const valeur = e.target.value;
      setClient(valeur);

      const clientTrouve = clientsEnregistres.find(
        (c) => normaliserTexte(c.nom) === normaliserTexte(valeur)
      );

      if (clientTrouve) {
        chargerClient(clientTrouve.nom);
      }
    }}
    onBlur={() => {
      const clientTrouve = clientsEnregistres.find(
        (c) => normaliserTexte(c.nom) === normaliserTexte(client)
      );

      if (clientTrouve) {
        chargerClient(clientTrouve.nom);
      }
    }}
  />

  <datalist id="liste-clients-enregistres">
    {clientsEnregistres
      .filter((c) =>
        normaliserTexte(c.nom).includes(normaliserTexte(client))
      )
      .map((c) => (
        <option key={c.nom} value={c.nom} />
      ))}
  </datalist>
</div>
            <div>
  <label className="text-sm font-medium">TÃ©lÃ©phone</label>

  <input
    className="mt-2 w-full rounded-xl border p-3"
    value={telephone}
    list="liste-telephones-clients"
    placeholder="Tape le numÃ©ro du client..."
    onChange={(e) => {
      const valeurFormatee = formatTelephone(e.target.value);
      setTelephone(valeurFormatee);

      const telTape = normaliserTelephone(valeurFormatee);

      const clientTrouve = clientsEnregistres.find((c) =>
        normaliserTelephone(c.telephone || "").includes(telTape)
      );

      if (clientTrouve && telTape.length >= 6) {
        chargerClient(clientTrouve.nom);
      }
    }}
    onBlur={() => {
      const telTape = normaliserTelephone(telephone);

      const clientTrouve = clientsEnregistres.find(
        (c) => normaliserTelephone(c.telephone || "") === telTape
      );

      if (clientTrouve) {
        chargerClient(clientTrouve.nom);
      }
    }}
  />

  <datalist id="liste-telephones-clients">
    {clientsEnregistres
      .filter((c) =>
        normaliserTelephone(c.telephone || "").includes(
          normaliserTelephone(telephone)
        )
      )
      .map((c) => (
        <option
          key={`${c.nom}-${c.telephone}`}
          value={c.telephone}
          label={c.nom}
        />
      ))}
  </datalist>
</div>
            <Input label="Email" value={email} onChange={setEmail} />
 {modeClient === "agence" ? (
  <>
    <Input
      label="Adresse de lâ€™agence"
      value={adresseAgence}
      onChange={setAdresseAgence}
    />
    <TextArea label="Notes agence" value={notes} onChange={setNotes} />
  </>
) : (
  <>
    <Input
      label="Adresse client / chantier"
      value={adresse}
      onChange={setAdresse}
    />
    <Input
      label="ComplÃ©ment dâ€™adresse / Ã©tage / appartement / bÃ¢timent"
      value={complementAdresse}
      onChange={setComplementAdresse}
    />
    <TextArea label="Notes" value={notes} onChange={setNotes} />
  </>
)}
          </Bloc>

          <Bloc titre="Dossier">
            <NumberInput
  label="Montant dÃ©jÃ  encaissÃ©"
  value={montantEncaisse}
  onChange={setMontantEncaisse}
/>
            <Input label="NumÃ©ro devis" value={numeroDevis} onChange={setNumeroDevis} />
            <Input label="NumÃ©ro facture" value={numeroFacture} onChange={setNumeroFacture} />

   
            <Select label="Type client" value={modeClient} onChange={setModeClient} options={[["jeremie", "JÃ©rÃ©mie"], ["normal", "Particulier"], ["agence", "Agence immobiliÃ¨re"]]} />
{(modeClient === "agence" || modeClient === "jeremie") && (
  <div className="space-y-4 rounded-2xl border bg-slate-50 p-4">
   {modeClient === "agence" && (
  <>
    <Input label="Nom de lâ€™agence" value={agence} onChange={setAgence} />
    <Input label="RÃ©fÃ©rence chantier agence" value={referenceChantier} onChange={setReferenceChantier} />
    <Input label="Adresse chantier / appartement" value={adresse} onChange={setAdresse} />
    <Input label="ComplÃ©ment dâ€™adresse / Ã©tage / appartement / bÃ¢timent" value={complementAdresse} onChange={setComplementAdresse} />
        <Input label="Locataire" value={locataire} onChange={setLocataire} />
        <Input
          label="TÃ©lÃ©phone locataire"
          value={telephoneLocataire}
          onChange={(v) => setTelephoneLocataire(formatTelephone(v))}
        />
        <Input label="PropriÃ©taire" value={proprietaire} onChange={setProprietaire} />
        <Input
          label="TÃ©lÃ©phone propriÃ©taire"
          value={telephoneProprietaire}
          onChange={(v) => setTelephoneProprietaire(formatTelephone(v))}
        />
      </>
    )}

    {modeClient === "jeremie" && (
      <>
        <Input
          label="Client final de JÃ©rÃ©mie"
          value={clientFinalNom}
          onChange={setClientFinalNom}
        />

        <Input
          label="TÃ©lÃ©phone client final"
          value={clientFinalTelephone}
          onChange={(v) => setClientFinalTelephone(formatTelephone(v))}
        />

        <Input
          label="Adresse intervention client final"
          value={clientFinalAdresse}
          onChange={setClientFinalAdresse}
        />
      </>
    )}
  </div>
)}
            <Select
  label="Statut devis"
  value={statutDevis}
  onChange={setStatutDevis}
  options={[
    ["estimation_rapide", "Estimation rapide (client)"],
    ["en_cours", "Devis en cours"],
    ["envoye", "Devis envoyÃ©"],
    ["accepte", "Devis acceptÃ©"],
    ["refuse", "Devis refusÃ©"]
  ]}
/>
            <DateInput
  label="Date chantier prÃ©vue"
  value={dateChantier}
  onChange={(v) => {
    setDateChantier(v);

    const dateChantierObj = parseDateFr(v);
    const aujourdHui = new Date();

    if (!v) {
      setStatutChantier("a_planifier");
      return;
    }

    const memeJour =
      dateChantierObj &&
      dateChantierObj.getDate() === aujourdHui.getDate() &&
      dateChantierObj.getMonth() === aujourdHui.getMonth() &&
      dateChantierObj.getFullYear() === aujourdHui.getFullYear();

    if (memeJour) {
      setStatutChantier("en_cours");
    } else {
      setStatutChantier("a_preparer");
    }
  }}
/>

<div>
  <label className="text-xs font-semibold text-slate-700">
    Heure chantier prÃ©vue
  </label>

  <input
    type="time"
    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
    value={heureChantier}
    onChange={(e) => setHeureChantier(e.target.value)}
  />
</div>

<DateInput
  label="Date de paiement prÃ©vue"
  value={datePaiement}
  onChange={(v) => {
    const dateChantierObj = parseDateFr(dateChantier);
    const datePaiementObj = parseDateFr(v);

    if (
      dateChantierObj &&
      datePaiementObj &&
      datePaiementObj < dateChantierObj
    ) {
      alert(
        "âš ï¸ IncohÃ©rence : la date de paiement du solde ne peut pas Ãªtre avant la date du chantier.\n\nSi câ€™est un acompte, indique-le plutÃ´t dans 'Montant dÃ©jÃ  encaissÃ©'."
      );
      return;
    }

    setDatePaiement(v);
  }}
/>
          <Select
  label="PrioritÃ© dossier"
  value={priorite}
  onChange={setPriorite}
  options={[
    ["normale", "Normale"],
    ["urgente", "Urgente"],
    ["tres_urgente", "TrÃ¨s urgente"],
  ]}
/>
          </Bloc>
        </section>
)}
<BlocRepliable titre="Lignes de travaux" ouvertParDefaut={true}>
<div
  ref={lignesTravauxRef}
  className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"
>
  <div className="mb-4">
    <h3 className="text-base font-bold text-slate-800">
      Ajouter une prestation
    </h3>

    <p className="mt-1 text-sm text-slate-500">
      Recherche directement une prestation ou
      sÃ©lectionne une catÃ©gorie.
    </p>
  </div>

  <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
    <div className="mb-3">
      <p className="text-sm font-bold text-blue-900">
        Packs de prestations V25
      </p>
      <p className="mt-1 text-xs text-blue-700">
        Les packs utilisent toujours les tarifs et les dÃ©tails actuels du catalogue. Adapte les quantitÃ©s au chantier aprÃ¨s lâ€™ajout.
      </p>
    </div>

    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <select
        value={packSelectionne}
        onChange={(event) => setPackSelectionne(event.target.value)}
        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800"
      >
        <option value="">Choisir un pack de prestations</option>
        {PACKS_PRESTATIONS_V25.map((pack) => (
          <option key={pack.id} value={pack.id}>
            {pack.nom}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!packSelectionne}
        onClick={() => {
          if (!packSelectionne) return;
          ajouterPackAuDevis(packSelectionne);
          setPackSelectionne("");
        }}
        className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        + Ajouter le pack
      </button>
    </div>

    {packSelectionne && (
      <p className="mt-3 text-xs text-slate-600">
        {
          PACKS_PRESTATIONS_V25.find(
            (pack) => pack.id === packSelectionne
          )?.description
        }
      </p>
    )}
  </div>

  <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
    <div>
      <label className="text-xs font-semibold text-slate-700">
        Rechercher une prestation
      </label>

      <input
        type="text"
        value={recherchePrestation}
        onChange={(event) => {
          setRecherchePrestation(
            event.target.value
          );

          setPrestationSelectionnee("");
        }}
        placeholder="Ex. robinet, parquet, peinture plafond..."
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>

    <Select
      label="CatÃ©gorie"
      value={categorieSelectionnee}
      onChange={(valeur) => {
        setCategorieSelectionnee(valeur);
        setPrestationSelectionnee("");
      }}
      options={[
        ["", "Toutes les catÃ©gories"],
        ...categories.map((categorie) => [
          categorie,
          categorie,
        ]),
      ]}
    />

    <div className="flex items-end">
      <button
        type="button"
        onClick={() =>
          setAfficherFavorisSeulement(
            (valeurActuelle) =>
              !valeurActuelle
          )
        }
        className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
          afficherFavorisSeulement
            ? "border-amber-400 bg-amber-100 text-amber-900"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        }`}
      >
        {afficherFavorisSeulement
          ? "â­ Favoris affichÃ©s"
          : "â˜† Voir mes favoris"}
      </button>
    </div>
  </div>

  {(recherchePrestation ||
    categorieSelectionnee ||
    afficherFavorisSeulement) && (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          {prestationsFiltrees.length} prestation
          {prestationsFiltrees.length > 1
            ? "s"
            : ""}{" "}
          trouvÃ©e
          {prestationsFiltrees.length > 1
            ? "s"
            : ""}
        </p>

        <button
          type="button"
          onClick={() => {
            setRecherchePrestation("");
            setCategorieSelectionnee("");
            setPrestationSelectionnee("");
            setAfficherFavorisSeulement(false);
          }}
          className="text-xs font-semibold text-blue-700 hover:underline"
        >
          Effacer les filtres
        </button>
      </div>

      {prestationsFiltrees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
          Aucune prestation ne correspond Ã 
          cette recherche.
        </div>
      ) : (
        <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
          {prestationsFiltrees.map(
            (prestation: any) => {
              const favorite =
                prestationEstFavorite(
                  prestation.id
                );

              const prixClient =
                getPrixPrestation(
                  prestation,
                  modeClient
                );

              return (
                <div
                  key={prestation.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-800">
                          {getNomPrestation(
                            prestation
                          )}
                        </p>

                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                          {
                            prestation.categorie
                          }
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-semibold text-blue-700">
                        {Number(
                          prixClient || 0
                        ).toFixed(2)}{" "}
                        â‚¬
                        {prestation.unite !==
                        "forfait"
                          ? ` / ${prestation.unite}`
                          : " / forfait"}
                      </p>

                      {prestation.conditions && (
                        <p className="mt-1 text-xs text-slate-500">
                          {
                            prestation.conditions
                          }
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        basculerPrestationFavorite(
                          prestation.id
                        )
                      }
                      className={`shrink-0 rounded-lg border px-3 py-2 text-lg ${
                        favorite
                          ? "border-amber-300 bg-amber-100 text-amber-700"
                          : "border-slate-200 bg-white text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                      }`}
                      title={
                        favorite
                          ? "Retirer des favoris"
                          : "Ajouter aux favoris"
                      }
                    >
                      {favorite ? "â˜…" : "â˜†"}
                    </button>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        ajouterPrestationAuDevis(
                          prestation.id
                        )
                      }
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                    >
                      + Ajouter au devis
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  )}

  {!recherchePrestation &&
    !categorieSelectionnee &&
    !afficherFavorisSeulement && (
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
        Commence Ã  Ã©crire le nom dâ€™une
        prestation ou sÃ©lectionne une
        catÃ©gorie.
      </div>
    )}
</div>

  <div className="space-y-5">
    {lignesTravaux.map((ligne, index) => {
  const labels = champsTravaux(ligne.type);

  const tarifAssocie = TARIFS_PRESTATIONS.find(
  (t: any) => t.id === ligne.tarifId
);
  

  return (
    <div
      key={ligne.id}
      id={`ligne-travaux-${ligne.id}`}
      ref={index === lignesTravaux.length - 1 ? derniereLigneRef : null}
      className="rounded-2xl border bg-slate-50 p-5 space-y-4"
    >
          <div className="flex items-center justify-between gap-3">
          <div>
  <h3 className="font-semibold text-slate-800">
    {ligne.prestationNom
      ? `${index + 1} â€” ${ligne.prestationNom}`
      : `${index + 1} â€” Prestation personnalisÃ©e`}
  </h3>

</div>

           <div className="flex gap-2">
  <button
    type="button"
    onClick={() =>
      setLignesTravaux(
        lignesTravaux.map((l) =>
          l.id === ligne.id ? { ...l, offert: !l.offert } : l
        )
      )
    }
    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
      ligne.offert
        ? "bg-green-100 text-green-800 border-green-300"
        : "bg-white text-slate-700"
    }`}
  >
    {ligne.offert ? "Offert âœ“" : "Offrir"}
  </button>

  <button
    onClick={() => supprimerLigne(ligne.id)}
    className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold"
  >
    Supprimer
  </button>
</div> 
</div>
          <div className="rounded-xl bg-white p-4 space-y-4">
           {ligne.tarifId ? (
  <div className="space-y-3">
    <NumberInput
      label={`QuantitÃ© (${ligne.unite || "u"})`}
      value={ligne.q1}
      onChange={(v) => modifierLigne(ligne.id, "q1", v)}
    />

    <Check
      label="Modifier le prix manuellement"
      checked={ligne.prixManuel || false}
      onChange={(checked) =>
        setLignesTravaux(
          lignesTravaux.map((l) =>
            l.id === ligne.id
              ? {
                  ...l,
                  prixManuel: checked,
                  prixUnitaire: checked
                    ? l.prixUnitaire
                    : l.prixUnitaireAuto || l.prixUnitaire,
                }
              : l
          )
        )
      }
    />
<Check
  label="Personnaliser les dÃ©tails affichÃ©s dans le devis"
  checked={ligne.detailsPdfOuvert || false}
  onChange={(checked) =>
    setLignesTravaux(
      lignesTravaux.map((l) =>
        l.id === ligne.id
          ? {
              ...l,
              detailsPdfOuvert: checked,
              detailsPdfPersonnalises:
  l.detailsPdfPersonnalises && l.detailsPdfPersonnalises.length > 0
    ? l.detailsPdfPersonnalises
    : [...detailsTravaux(l)],
            }
          : l
      )
    )
  }
/>

{ligne.detailsPdfOuvert && (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
    <div>
      <p className="text-sm font-bold text-amber-900">
        DÃ©tails visibles dans le devis
      </p>
      <p className="text-xs text-amber-700">
        Une ligne par dÃ©tail. Ces textes apparaÃ®tront sous la prestation dans le PDF.
      </p>
    </div>

 <textarea
  className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-amber-500"
  value={(ligne.detailsPdfPersonnalises || []).join("\n")}
  onKeyDown={(event) => {
    event.stopPropagation();
  }}
  onChange={(event) => {
    const lignes = event.target.value.split("\n");

    setLignesTravaux((ancien) =>
      ancien.map((l) =>
        l.id === ligne.id
          ? {
              ...l,
              detailsPdfPersonnalises: lignes,
            }
          : l
      )
    );
  }}
/>

    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs font-bold text-slate-600">
        AperÃ§u PDF :
      </p>

      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {(ligne.detailsPdfPersonnalises || detailsTravaux(ligne)).map(
          (detail, detailIndex) => (
            <li key={detailIndex}>â€¢ {detail}</li>
          )
        )}
      </ul>
    </div>

    <button
      type="button"
      onClick={() =>
        setLignesTravaux(
          lignesTravaux.map((l) =>
            l.id === ligne.id
              ? {
                  ...l,
                  detailsPdfPersonnalises: undefined,
                  detailsPdfOuvert: false,
                }
              : l
          )
        )
      }
      className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-700"
    >
      RÃ©initialiser les dÃ©tails automatiques
    </button>
  </div>
)}
    {ligne.prixManuel && (
      <NumberInput
        label={`Prix unitaire manuel (â‚¬ / ${ligne.unite || "u"})`}
        value={ligne.prixUnitaire || 0}
        onChange={(v) =>
          setLignesTravaux(
            lignesTravaux.map((l) =>
              l.id === ligne.id ? { ...l, prixUnitaire: v } : l
            )
          )
        }
      />
    )}

    {!ligne.prixManuel && (
      <p className="text-xs text-slate-500">
        Prix automatique du tableau : {ligne.prixUnitaireAuto || ligne.prixUnitaire} â‚¬ / {ligne.unite}
      </p>
    )}
  </div>
) : (
              <>
                <Select
                  label="Type de travaux"
                  value={ligne.type}
                  onChange={(v) => modifierLigne(ligne.id, "type", v)}
                  options={typesTravaux}
                />

                <div className="grid gap-4 md:grid-cols-5">
                  <NumberInput label={labels[0]} value={ligne.q1} onChange={(v) => modifierLigne(ligne.id, "q1", v)} />
                  <NumberInput label={labels[1]} value={ligne.q2} onChange={(v) => modifierLigne(ligne.id, "q2", v)} />
                  <NumberInput label={labels[2]} value={ligne.r1} onChange={(v) => modifierLigne(ligne.id, "r1", v)} />
                  <NumberInput label={labels[3]} value={ligne.r2} onChange={(v) => modifierLigne(ligne.id, "r2", v)} />
                  <NumberInput label={labels[4]} value={ligne.option} onChange={(v) => modifierLigne(ligne.id, "option", v)} />
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 space-y-2">
            <Card
  titre="Prix ligne"
  valeur={ligne.offert ? "Offert" : `${montantLigne(ligne, modeClient)} â‚¬`}
/>

            {tarifAssocie && (
              <>
                <Card
                  titre="RentabilitÃ©"
                  valeur={`${tarifAssocie.rentabilite} ${tarifAssocie.action}`}
                />

                {tarifAssocie.conditions && (
                  <p className="text-sm text-slate-500">
                    {tarifAssocie.conditions}
                  </p>
                )}
              </>
            )}

            {ligne.prixUnitaire && ligne.unite && (
              <p className="text-sm text-slate-500">
                Tarif appliquÃ© : {ligne.prixUnitaire} â‚¬ / {ligne.unite}
              </p>
            )}
          </div>
        </div>
      );
    })}
  </div>
</BlocRepliable>


  <Bloc titre="ðŸ“ˆ RÃ©sultat devis">
  <p className="text-xs text-slate-500">
    Estimation et analyse en temps rÃ©el.
  </p>
<div className="grid gap-3 md:grid-cols-2">
 {/* DÃ©placement */}
<div className="rounded-lg border bg-slate-50 px-3 py-2 space-y-2">
  <h3 className="text-sm font-bold text-slate-800">
    ðŸšš DÃ©placement
  </h3>

  <NumberInput
    label="KM aller"
    value={kmAller}
    onChange={setKmAller}
  />

  <label className="flex items-center gap-2 text-sm font-semibold">
    <input
      type="checkbox"
      checked={fraisDeplacementManuelActif}
      onChange={(e) => {
        setFraisDeplacementManuelActif(e.target.checked);
        if (e.target.checked) {
          setFraisDeplacementManuel(calcul.fraisLogistique);
        }
      }}
    />
    Modifier le prix du dÃ©placement
  </label>

  {fraisDeplacementManuelActif && (
    <NumberInput
      label="Prix dÃ©placement manuel"
      value={fraisDeplacementManuel}
      onChange={setFraisDeplacementManuel}
    />
  )}

  <p className="text-xs text-slate-500">
    {calcul.kmAR} km A/R â†’ {calcul.fraisLogistique} â‚¬
  </p>
</div>

 {/* Fournitures */}
<div className="rounded-lg border bg-slate-50 px-3 py-2 space-y-2">
  <h3 className="text-sm font-bold text-slate-800">
    ðŸ“¦ Fournitures
  </h3>

  <label className="flex items-center gap-2 text-sm font-semibold">
    <input
      type="checkbox"
      checked={fournituresClient}
      onChange={(e) => setFournituresClient(e.target.checked)}
    />
    Fournitures Ã  la charge du client
  </label>

  {!fournituresClient && (
    <div className="space-y-2">
      <NumberInput
        label="Prix achat fournitures TTC"
        value={achatFournitures}
        onChange={setAchatFournitures}
      />

      <NumberInput
        label="Coefficient revente"
        value={coefficientFournitures}
        onChange={setCoefficientFournitures}
      />

<div className="flex gap-2 flex-wrap">
  <button
    type="button"
    onClick={() => setCoefficientFournitures(1.22)}
    className="px-3 py-1 rounded-lg bg-green-50 text-green-800 border border-green-200 text-xs font-semibold"
  >
    x1.22
  </button>

  <button
    type="button"
    onClick={() => setCoefficientFournitures(1.4)}
    className="px-3 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold"
  >
    x1.4
  </button>

  <button
    type="button"
    onClick={() => setCoefficientFournitures(1.6)}
    className="px-3 py-1 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 text-xs font-semibold"
  >
    x1.6
  </button>
  <TextArea
  label="DÃ©tail des fournitures incluses / exclues"
  value={detailsFournitures}
  onChange={setDetailsFournitures}
/>
</div>

      <div className="grid gap-2 md:grid-cols-3">
        <MiniResult titre="Achat" valeur={`${achatFournitures} â‚¬`} />
        <MiniResult titre="Revente" valeur={`${calcul.reventeFournitures.toFixed(2)} â‚¬`} couleur="text-blue-700" />
        <MiniResult titre="Marge" valeur={`${calcul.margeFournitures.toFixed(2)} â‚¬`} couleur="text-green-700" />
      </div>

      <p className="text-xs text-slate-500">
        Minimum conseillÃ© : coefficient 1.22. IdÃ©al selon chantier : jusquâ€™Ã  1.6.
      </p>
    </div>
  )}

  {fournituresClient && (
    <p className="text-xs text-slate-500">
      Les fournitures ne sont pas ajoutÃ©es au devis.
    </p>
  )}
</div>

  {/* ESTIMATIONS */}
  {statutDevis === "estimation_rapide" && (
    <>
      <MiniResult titre="Basse" valeur={`${calcul.estimationBasse} â‚¬`} couleur="text-green-700" />
      <MiniResult titre="Haute" valeur={`${calcul.estimationHaute} â‚¬`} couleur="text-orange-600" />

      <div className="col-span-2 rounded-lg border border-purple-300 bg-purple-50 px-4 py-2">
        <p className="text-xs text-purple-600">ðŸ’¬ Prix Ã  annoncer</p>
        <p className="text-xl font-bold text-purple-800">
          {calcul.prixConseille} â‚¬
        </p>
      </div>
    </>
  )}

</div>

  {statutDevis === "estimation_rapide" && (
    <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2">
      <p className="text-sm font-bold text-red-700">Analyse chantier</p>

      {calcul.estimationBasse < 400 && (
        <p className="text-sm font-semibold text-red-600">
          ðŸ”´ Trop bas : dÃ©placement + temps non rentables.
        </p>
      )}

      {calcul.estimationBasse >= 400 && calcul.estimationBasse < 800 && (
        <p className="text-sm font-semibold text-orange-600">
          ðŸŸ  Vigilance : marge serrÃ©e.
        </p>
      )}

      {calcul.estimationBasse >= 800 && (
        <p className="text-sm font-semibold text-green-700">
          ðŸŸ¢ Estimation cohÃ©rente et rentable.
        </p>
      )}
    </div>
  )}

  <div className="rounded-lg border bg-white px-3 py-2 space-y-2">
    <h3 className="text-sm font-bold text-slate-800">ðŸ§¾ RÃ©sumÃ© financier</h3>

    <div className="grid gap-2 md:grid-cols-4">
      <MiniResult titre="Travaux" valeur={`${calcul.totalTravaux} â‚¬`} />
      <MiniResult titre="DÃ©placement" valeur={`${calcul.fraisLogistique} â‚¬`} />
      <MiniResult
  titre="Temps chantier"
  valeur={`${calcul.totalHeuresChantier.toFixed(1)} h`}
/>

<MiniResult
  titre="Jours calculÃ©s"
  valeur={`${calcul.nombreJoursChantier} j`}
/>
      <MiniResult titre="Fournitures" valeur={`${calcul.reventeFournitures} â‚¬`} />
      <MiniResult titre="Total" valeur={`${calcul.total} â‚¬`} couleur="text-blue-700" />
    </div>

    <div className="rounded-lg bg-slate-50 px-3 py-2 space-y-1 text-xs">
      <div className="flex justify-between">
        <span>DÃ©placement ({calcul.kmAR} km)</span>
        <strong>{calcul.fraisLogistique} â‚¬</strong>
      </div>

      <div className="flex justify-between">
        <span>Fournitures</span>
        <strong>{calcul.reventeFournitures.toFixed(2)} â‚¬</strong>
      </div>

      <div className="border-t pt-1 flex justify-between font-bold text-blue-700">
        <span>Total devis</span>
        <span>{calcul.total} â‚¬</span>
      </div>
    </div>
  </div>

  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
    <p className="text-xs font-medium text-blue-800">
      â„¹ï¸ Estimation indicative selon les Ã©lÃ©ments visibles lors de la visite.
    </p>
    <p className="text-xs text-blue-700">
      Ajustable aprÃ¨s Ã©tude dÃ©taillÃ©e et validation technique.
    </p>
  </div>

  <div className="rounded-lg border bg-slate-50 px-3 py-2 space-y-2">
    <h3 className="text-sm font-bold text-slate-800">Acompte et encaissement</h3>

   <Select
  label="Acompte (%)"
  value={String(pourcentageAcompte)}
  onChange={(v) => setPourcentageAcompte(Number(v))}
  options={[
    ["0", "0 % â€” pas dâ€™acompte"],
    ["30", "30 %"],
    ["40", "40 %"],
    ["50", "50 %"],
  ]}
/>
<div className="mt-3 border rounded-lg p-3 bg-slate-50">
  <label className="flex items-center gap-2 text-sm font-medium">
    <input
      type="checkbox"
      checked={acompteManuelActif}
      onChange={(e) => setAcompteManuelActif(e.target.checked)}
    />
    Acompte manuel
  </label>

  {acompteManuelActif && (
    <div className="mt-2">
      <input
        type="number"
        value={acompteManuel}
        onChange={(e) => setAcompteManuel(Number(e.target.value))}
        className="w-full border rounded px-2 py-1"
        placeholder="Montant de l'acompte"
      />
    </div>
  )}
</div>

<div className="grid gap-2 md:grid-cols-3">
  <MiniResult titre="Acompte" valeur={`${calcul.acompte} â‚¬`} />
  <MiniResult titre="EncaissÃ©" valeur={`${montantEncaisse} â‚¬`} />
  <MiniResult
    titre="Reste"
    valeur={`${Math.max(0, calcul.total - montantEncaisse)} â‚¬`}
    couleur="text-blue-700"
  />
</div>


{saisieDateAcompteOuverte && (
  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
    <label className="block text-sm font-medium text-slate-700">
      Date rÃ©elle de rÃ©ception de lâ€™acompte
    </label>
    <input
      type="date"
      value={formatDateFrVersInput(datePaiement)}
      onChange={(e) => setDatePaiement(formatDateInputVersFr(e.target.value))}
      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
    />
  </div>
)}

{saisieDatePaiementCompletOuverte && (
  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
    <label className="block text-sm font-medium text-slate-700">
      Date rÃ©elle du paiement complet
    </label>
    <input
      type="date"
      value={formatDateFrVersInput(datePaiement)}
      onChange={(e) => setDatePaiement(formatDateInputVersFr(e.target.value))}
      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
    />
  </div>
)}

<div className="flex flex-wrap gap-2">
  {/* ================= ACOMPTE REÃ‡U ================= */}
  <button
    onClick={() => {
      setSaisieDatePaiementCompletOuverte(false);

      if (!saisieDateAcompteOuverte) {
        setSaisieDateAcompteOuverte(true);
        return;
      }

      if (!datePaiement) {
        alert("SÃ©lectionne la date rÃ©elle de rÃ©ception de lâ€™acompte.");
        return;
      }

      const montantAcompteRecu = calcul.acompte;

      setMontantEncaisse(montantAcompteRecu);

      setHistorique((ancien) =>
        ancien.map((d) =>
          d.id === idDossierActuel
            ? {
                ...d,

                // Fonctionnement actuel conservÃ©
                montantEncaisse: montantAcompteRecu,
                reste: Math.max(
                  0,
                  calcul.total - montantAcompteRecu
                ),
                total: calcul.total,
                acompte: calcul.acompte,
                facturePayee: false,

                // On conserve datePaiement pour ne rien casser
                // dans le fonctionnement actuel de l'application
                datePaiement,

                // NOUVEAU :
                // mÃ©moire indÃ©pendante et permanente de l'acompte
                dateAcompte: datePaiement,
                montantAcompteEncaisse: montantAcompteRecu,
              }
            : d
        )
      );

      setSaisieDateAcompteOuverte(false);
    }}
    className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
  >
    {saisieDateAcompteOuverte
      ? "Valider acompte"
      : "Acompte reÃ§u"}
  </button>

  {/* ================= PAIEMENT COMPLET ================= */}
  <button
    onClick={() => {
      setSaisieDateAcompteOuverte(false);

      if (!saisieDatePaiementCompletOuverte) {
        setSaisieDatePaiementCompletOuverte(true);
        return;
      }

      if (!datePaiement) {
        alert("SÃ©lectionne la date rÃ©elle du paiement complet.");
        return;
      }

      setMontantEncaisse(calcul.total);

      setHistorique((ancien) =>
        ancien.map((d) => {
          if (d.id !== idDossierActuel) {
            return d;
          }

          /*
           * IMPORTANT :
           * dateAcompte et montantAcompteEncaisse ne sont
           * volontairement PAS modifiÃ©s ici.
           *
           * Le paiement complet ne doit plus effacer
           * l'historique de l'acompte.
           */

          return {
            ...d,

            montantEncaisse: calcul.total,
            reste: 0,
            total: calcul.total,
            acompte: calcul.acompte,
            facturePayee: true,

            // date rÃ©elle du paiement final
            datePaiement,
          };
        })
      );

      setSaisieDatePaiementCompletOuverte(false);
    }}
    className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"
  >
    {saisieDatePaiementCompletOuverte
      ? "Valider paiement complet"
      : "Paiement complet"}
  </button>

  {/* ================= REMISE Ã€ ZÃ‰RO ================= */}
  <button
    onClick={() => {
      setMontantEncaisse(0);
      setDatePaiement("");

      setSaisieDateAcompteOuverte(false);
      setSaisieDatePaiementCompletOuverte(false);

      setHistorique((ancien) =>
        ancien.map((d) =>
          d.id === idDossierActuel
            ? {
                ...d,

                montantEncaisse: 0,
                montantAcompteEncaisse: 0,

                reste: calcul.total,
                total: calcul.total,
                acompte: calcul.acompte,

                facturePayee: false,

                datePaiement: "",
                dateAcompte: "",
              }
            : d
        )
      );
    }}
    className="rounded-lg border px-3 py-2 text-sm font-semibold"
  >
    RAZ
  </button>
</div>
</div>
</Bloc>


        <Bloc titre="Recherche historique">
          <Input label="Recherche client / devis / facture" value={rechercheHistorique} onChange={setRechercheHistorique} />
        </Bloc>

<BlocRepliable titre="Historique" ouvertParDefaut={false}>
  {(() => {
    const extraireNumero = (numero?: string) => {
      if (!numero) return 0;
      const match = numero.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    };

    const historiqueDocuments = historiqueFiltre
      .filter(
        (item) =>
          item.typeEvenement !== "rdv" &&
          item.typeEvenement !== "rappel" &&
          (
            item.numeroDevis ||
            item.numeroFacture ||
            item.estBrouillonAuto
          )
      )
      .sort((a, b) => {
        const aEstBrouillon =
          !a.numeroFacture && !a.numeroDevis;
        const bEstBrouillon =
          !b.numeroFacture && !b.numeroDevis;

        // Les travaux commencÃ©s sans numÃ©ro restent tout en haut afin dâ€™Ãªtre
        // retrouvÃ©s immÃ©diatement Ã  la prochaine ouverture de lâ€™application.
        if (aEstBrouillon !== bEstBrouillon) {
          return aEstBrouillon ? -1 : 1;
        }

        if (aEstBrouillon && bEstBrouillon) {
          return (b.id || 0) - (a.id || 0);
        }

        const aEstFacture = Boolean(a.numeroFacture);
        const bEstFacture = Boolean(b.numeroFacture);

        // Toutes les factures passent avant les devis non encore facturÃ©s.
        if (aEstFacture !== bEstFacture) {
          return aEstFacture ? -1 : 1;
        }

        // Dans le groupe des factures, seul le numÃ©ro de facture dÃ©termine
        // lâ€™ordre : le numÃ©ro de devis peut Ãªtre prÃ©sent ou totalement absent.
        if (aEstFacture && bEstFacture) {
          const numeroFactureA = extraireNumero(a.numeroFacture);
          const numeroFactureB = extraireNumero(b.numeroFacture);

          if (numeroFactureA !== numeroFactureB) {
            return numeroFactureB - numeroFactureA;
          }
        }

        // Dans le second groupe, les devis non facturÃ©s sont classÃ©s du plus
        // rÃ©cent au plus ancien selon leur propre numÃ©ro de devis.
        if (!aEstFacture && !bEstFacture) {
          const numeroDevisA = extraireNumero(a.numeroDevis);
          const numeroDevisB = extraireNumero(b.numeroDevis);

          if (numeroDevisA !== numeroDevisB) {
            return numeroDevisB - numeroDevisA;
          }
        }

        // SÃ©curitÃ© en cas de numÃ©ro identique ou absent : le dernier dossier
        // enregistrÃ© reste affichÃ© en premier.
        return (b.id || 0) - (a.id || 0);
      });

    if (historiqueDocuments.length === 0) {
      return (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Aucun devis ou facture enregistrÃ©.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {historiqueDocuments.map((item) => {
          const factureEnRetard =
            item.datePaiement &&
            !item.facturePayee &&
            parseDateFr(item.datePaiement) &&
            parseDateFr(item.datePaiement)! < new Date();

          const estBrouillon =
            !item.numeroFacture && !item.numeroDevis;

          const badgePastel = estBrouillon
            ? "bg-slate-100 text-slate-700 border-slate-300"
            : item.facturePayee
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : factureEnRetard
            ? "bg-red-100 text-red-800 border-red-200"
            : item.numeroFacture
            ? "bg-blue-100 text-blue-800 border-blue-200"
            : "bg-amber-100 text-amber-800 border-amber-200";

          const libelleStatut = estBrouillon
            ? "Brouillon"
            : item.facturePayee
            ? "PayÃ©e"
            : factureEnRetard
            ? "Retard"
            : item.numeroFacture
            ? "Facture"
            : "Devis";

          const nomChantier =
            item.modeClient === "jeremie"
              ? item.clientFinalAdresse ||
                item.adresse ||
                "Chantier non renseignÃ©"
              : item.modeClient === "agence"
              ? `${item.adresse || ""} ${item.complementAdresse || ""}`.trim() ||
                item.referenceChantier ||
                "Chantier non renseignÃ©"
              : item.complementAdresse ||
                item.adresse ||
                "Chantier non renseignÃ©";

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    
              {item.modeClient === "jeremie"
  ? `${item.client || "SAS Meurisse Couverture"}${
      item.clientFinalNom ? " / " + item.clientFinalNom : ""
    }`
  : item.modeClient === "agence"
  ? `${item.agence || item.client || "Agence immobiliÃ¨re"}${
      item.locataire
        ? " / " + item.locataire
        : item.proprietaire
        ? " / " + item.proprietaire
        : item.clientFinalNom
        ? " / " + item.clientFinalNom
        : ""
    }`
  : item.client || "Client non renseignÃ©"}
                  </p>

                  <div className="space-y-1 text-sm text-slate-500">
                    <p>
                      {item.numeroDevis || "Aucun devis"} /{" "}
                      {item.numeroFacture || "Aucune facture"}
                    </p>
                    <p>{nomChantier}</p>
                  </div>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgePastel}`}
                >
                  {libelleStatut}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <MiniResult
                  titre="Total"
                  valeur={`${item.total || 0} â‚¬`}
                  couleur="text-slate-900"
                />

                <MiniResult
                  titre="Acompte"
                  valeur={`${item.acompte || 0} â‚¬`}
                  couleur="text-amber-700"
                />

                <MiniResult
                  titre="EncaissÃ©"
                  valeur={`${item.montantEncaisse || 0} â‚¬`}
                  couleur="text-emerald-700"
                />

                <MiniResult
                  titre="Reste"
                  valeur={`${Math.max(
                    0,
                    (item.total || 0) - (item.montantEncaisse || 0)
                  )} â‚¬`}
                  couleur={factureEnRetard ? "text-red-700" : "text-slate-900"}
                />
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <p>ðŸ“… Chantier : {item.dateChantier || "Non planifiÃ©"}</p>
                <p>ðŸ’³ Paiement : {item.datePaiement || "Non renseignÃ©"}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
  <button
    onClick={() => rechargerDossier(item)}
    className="btn-blue"
  >
    Ouvrir
  </button>

  <button
    onClick={() => {
      rechargerDossier(item);

      setIdDossierActuel(null);

      setNumeroDevis("");
      setNumeroFacture("");

      setStatutDevis("en_cours");
      setStatutChantier("a_planifier");
      setFacturePayee(false);

      setLignesTravaux(
        item.lignesTravaux.map((ligne) => ({
          ...ligne,
          id: Date.now() + Math.random(),
        }))
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }}
    className="btn-purple"
  >
    Dupliquer
  </button>

  <button
    onClick={() => supprimerDossier(item.id)}
    className="btn-orange"
  >
    Supprimer
  </button>
</div>
            </div>
          );
        })}
      </div>
    );
  })()}
</BlocRepliable>

<BlocRepliable titre="ParamÃ¨tres entreprise / RIB" ouvertParDefaut={false}>
  <div className="grid gap-3 md:grid-cols-2">
    <Input label="Titulaire" value={ribTitulaire} onChange={setRibTitulaire} />
    <Input label="Banque" value={ribBanque} onChange={setRibBanque} />
    <Input label="IBAN" value={ribIban} onChange={setRibIban} />
    <Input label="BIC" value={ribBic} onChange={setRibBic} />
  </div>
</BlocRepliable>

{showPopupCalendrier && dateSelectionnee && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">

      <h2 className="text-xl font-bold text-slate-800">
        Planning du jour
      </h2>

      <p className="text-slate-500">
        {dateSelectionnee.toLocaleDateString("fr-FR")}
      </p>

      {(() => {
        const dateStr = dateSelectionnee.toLocaleDateString("fr-FR");

        const evenementsJour = historique.filter((d) => {
          const dansPlanningChantier =
            d.planningChantier?.includes(dateStr) || false;

          return (
            d.dateRdv === dateStr ||
            d.dateChantier === dateStr ||
            d.datePaiement === dateStr ||
            d.dateRappel === dateStr ||
            dansPlanningChantier
          );
        });

        if (evenementsJour.length === 0) {
          return (
            <div className="bg-slate-100 rounded-xl p-4 text-slate-500 text-sm">
              Aucun Ã©vÃ©nement prÃ©vu pour cette journÃ©e.
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {evenementsJour.map((d) => {
              const estRdv = d.dateRdv === dateStr || d.typeEvenement === "rdv";
              const estRappel = d.dateRappel === dateStr || d.typeEvenement === "rappel";
              const estPaiement = d.datePaiement === dateStr && !d.facturePayee;
              const estChantier =
                d.dateChantier === dateStr ||
                (d.planningChantier || []).includes(dateStr);

              const badge = estRappel
                ? "ðŸ“ Rappel"
                : estRdv
                ? "ðŸ“… RDV client"
                : estPaiement
                ? "ðŸ’³ Paiement / relance"
                : estChantier
                ? "ðŸ› ï¸ Chantier"
                : "ðŸ“Œ Ã‰vÃ©nement";

              const couleurCarte = estRappel
                ? "border-amber-200 bg-amber-50"
                : estRdv
                ? "border-blue-200 bg-blue-50"
                : estPaiement
                ? "border-red-200 bg-red-50"
                : estChantier
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-white";

              return (
                <div
                  key={d.id}
                  className={`rounded-xl border p-4 space-y-2 ${couleurCarte}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-800">
                      {estRappel
                        ? d.texteRappel || d.notes || "Rappel"
                        : d.client || "Client non renseignÃ©"}
                    </p>

                    <span className="text-xs rounded-full border bg-white px-2 py-1 text-slate-700">
                      {badge}
                    </span>
                  </div>

                  {!estRappel && (
                    <>
                      <p className="text-sm text-slate-600">
                        ðŸ“ž {d.telephone || "Non renseignÃ©"}
                      </p>

                      <p className="text-sm text-slate-600">
                        ðŸ“ {d.adresse || "Adresse non renseignÃ©e"}
                      </p>

                      {d.email && (
                        <p className="text-sm text-slate-600">
                          âœ‰ï¸ {d.email}
                        </p>
                      )}
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <span>
                      â±ï¸{" "}
                      {estRdv
                        ? d.heureRdv || "-"
                        : estChantier
                        ? d.heureChantier || "-"
                        : estRappel
                        ? d.heureRappel || "-"
                        : "-"}
                    </span>

                    <span>
                      ðŸ“„ {d.numeroDevis || "Pas de devis"}
                    </span>

                    <span>
                      ðŸ§¾ {d.numeroFacture || "-"}
                    </span>

                    <span>
                      ðŸ’¶ {estPaiement ? `${d.reste || 0} â‚¬ Ã  suivre` : "-"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">
                    {estRappel
                      ? d.texteRappel || d.notes
                      : estRdv
                      ? d.motifRdv || d.notes || "RDV client"
                      : estChantier
                      ? d.lignesTravaux?.[0]?.prestationNom ||
                        nomTravaux(d.lignesTravaux?.[0]?.type || "") ||
                        "Chantier planifiÃ©"
                      : estPaiement
                      ? "Paiement prÃ©vu / retard Ã  surveiller"
                      : d.notes}
                  </p>

                  {estChantier && d.planningChantier && d.planningChantier.length > 0 && (
                    <div className="text-xs text-slate-600 bg-white/70 rounded-lg p-2">
                      <p className="font-semibold mb-1">Jours chantier prÃ©vus :</p>

                      <div className="flex flex-wrap gap-1">
                        {d.planningChantier.map((jour) => (
                          <button
                            key={jour}
                            onClick={() => supprimerJourChantier(d, jour)}
                            className="rounded-full border px-2 py-1 bg-white hover:bg-red-50"
                            title="Cliquer pour supprimer ce jour"
                          >
                            {jour} âœ•
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {!estRappel && (
                      <button
                        onClick={() => {
                          rechargerDossier(d);
                          setShowPopupCalendrier(false);
                        }}
                        className="btn-dark"
                      >
                        Ouvrir
                      </button>
                    )}

                    {estRdv && (
                      <button
                        onClick={() => {
                          transformerRdvEnDevis(d);
                          setShowPopupCalendrier(false);
                        }}
                        className="btn-green"
                      >
                        Transformer en devis
                      </button>
                    )}

                    {estChantier && (
                      <button
                        onClick={() => ajouterJourChantier(d)}
                        className="btn-emerald"
                      >
                        Ajouter jour chantier
                      </button>
                    )}

                    {estRdv && (
                      <button
                        onClick={() => deplacerEvenementCalendrier(d, "rdv")}
                        className="btn-blue"
                      >
                        DÃ©placer RDV
                      </button>
                    )}

                    {estChantier && (
                      <button
                        onClick={() => deplacerEvenementCalendrier(d, "chantier")}
                        className="btn-blue"
                      >
                        DÃ©placer chantier
                      </button>
                    )}

                    {estPaiement && (
                      <button
                        onClick={() => deplacerEvenementCalendrier(d, "paiement")}
                        className="btn-orange"
                      >
                        DÃ©placer paiement
                      </button>
                    )}

                    {estRappel && (
                      <button
                        onClick={() => deplacerEvenementCalendrier(d, "rappel")}
                        className="btn-blue"
                      >
                        DÃ©placer rappel
                      </button>
                    )}
<button
  onClick={() => {
    ouvrirGoogleCalendar({
      titre: estRappel
        ? `Rappel - ${d.texteRappel || "Note"}`
        : estRdv
        ? `RDV client - ${d.client}`
        : estChantier
        ? `Chantier - ${d.client} - ${d.numeroDevis || ""}`
        : `Ã‰vÃ©nement - ${d.client}`,

      lieu: d.adresse || "",

      date:
        d.dateRappel ||
        d.dateRdv ||
        d.dateChantier ||
        d.planningChantier?.[0] ||
        "",

      description: estRappel
        ? d.texteRappel || ""
        : `Client : ${d.client}
TÃ©lÃ©phone : ${d.telephone}
Email : ${d.email}

${d.notes || ""}`,
    });
  }}
  className="btn-purple"
>
  ðŸ“… Google
</button>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer cet Ã©vÃ©nement du calendrier ?")) {
                          setHistorique((prev) =>
                            prev.map((item) =>
                              item.id === d.id
                                ? {
                                    ...item,
                                    dateRdv: estRdv ? "" : item.dateRdv,
                                    heureRdv: estRdv ? "" : item.heureRdv,
                                    motifRdv: estRdv ? "" : item.motifRdv,

                                    dateChantier: estChantier ? "" : item.dateChantier,
                                    heureChantier: estChantier ? "" : item.heureChantier,
                                    planningChantier: estChantier ? [] : item.planningChantier,

                                    datePaiement: estPaiement ? "" : item.datePaiement,

                                    dateRappel: estRappel ? "" : item.dateRappel,
                                    heureRappel: estRappel ? "" : item.heureRappel,
                                    texteRappel: estRappel ? "" : item.texteRappel,
                                  }
                                : item
                            )
                          );
                        }
                      }}
                      className="btn-orange"
                    >
                      Supprimer du calendrier
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
        <button
  onClick={() => {
    const nom = window.prompt("Nom du client :");
    if (!nom) return;

    const tel = window.prompt("TÃ©lÃ©phone :") || "";
    const adresseRdv = window.prompt("Adresse du RDV :") || "";
    const mail = window.prompt("Email :") || "";
    const observation = window.prompt("Observation / note du RDV :") || "";

    const dateFormatee = dateSelectionnee.toLocaleDateString("fr-FR");

    const nouveauRdv: Dossier = {
      id: Date.now(),
      typeEvenement: "rdv",

      client: nom,
      telephone: tel,
      email: mail,
      adresse: adresseRdv,
      adresseAgence: "",
      complementAdresse: "",
      notes: observation,
      modeClient: "normal",

      clientFinalNom: "",
      clientFinalTelephone: "",
      clientFinalAdresse: "",

      locataire: "",
      telephoneLocataire: "",
      proprietaire: "",
      telephoneProprietaire: "",
      agence: "",
      referenceChantier: "",

      lignesTravaux: [],
      numeroDevis: "",
      numeroFacture: "",
      total: 0,
      acompte: 0,
      reste: 0,
      montantEncaisse: 0,
      pourcentageAcompte: 0,
      facturePayee: false,

      statutDevis: "rdv",
      statutChantier: "rdv_client",

      factureSap: false,
      numeroSap: "",

      date: new Date().toLocaleDateString("fr-FR"),

      dateRdv: dateFormatee,
      heureRdv: "",
      motifRdv: "RDV client",
      typeRdv: "visite",
      observationRdv: observation,

      dateChantier: "",
      heureChantier: "",
      planningChantier: [],

      datePaiement: "",

      dateRappel: "",
      heureRappel: "",
      texteRappel: "",

      kmAller: 0,
      achatFournitures: 0,
      coefficientFournitures: 1.22,
      fournituresClient: true,
      detailsFournitures: "",
      reventeFournitures: 0,
      margeFournitures: 0,

      priorite: "normale",
    };

    setHistorique((ancien) => [nouveauRdv, ...ancien]);

    setClientsEnregistres((anciens) => {
const ficheClient: ClientEnregistre = {
  nom: client.trim(),
  telephone,
  email,
  adresse: modeClient === "agence" ? "" : adresse,
  adresseAgence: modeClient === "agence" ? adresseAgence : "",
  complementAdresse: modeClient === "agence" ? "" : complementAdresse,
  notes,
  modeClient,
  agence: modeClient === "agence" ? agence : "",
};

      const existe = anciens.some(
        (c) => c.nom.toLowerCase() === nom.toLowerCase()
      );

      if (existe) {
        return anciens.map((c) =>
          c.nom.toLowerCase() === nom.toLowerCase() ? ficheClient : c
        );
      }

      return [ficheClient, ...anciens];
    });

    setShowPopupCalendrier(false);
    alert("RDV client enregistrÃ©");
  }}
  className="btn-green"
>
  âž• CrÃ©er RDV client
</button>

        <button
          onClick={() => {
            creerRappelDepuisCalendrier(dateSelectionnee);
          }}
          className="btn-amber"
        >
          ðŸ“ CrÃ©er rappel / note
        </button>

        
      </div>

      <button
        onClick={() => setShowPopupCalendrier(false)}
        className="w-full btn-outline"
      >
        Fermer
      </button>
    </div>
  </div>
)}
      </div>
    </main>
    
  );

}
let blocsRepliablesOuvertsGlobal: string[] = [];

function BlocRepliable({
  titre,
  children,
  ouvertParDefaut = false,
}: {
  titre: string;
  children: ReactNode;
  ouvertParDefaut?: boolean;
}) {
  const idBloc = titre;
  const [ouvert, setOuvert] = useState(ouvertParDefaut);

  useEffect(() => {
    const fermerBloc = (event: Event) => {
      const detail = (event as CustomEvent).detail;

      if (detail?.idBloc === idBloc) {
        setOuvert(false);
      }
    };

    window.addEventListener("fermer-bloc-repliable", fermerBloc);

    return () => {
      window.removeEventListener("fermer-bloc-repliable", fermerBloc);
    };
  }, [idBloc]);

  const basculerBloc = () => {
    if (ouvert) {
      blocsRepliablesOuvertsGlobal = blocsRepliablesOuvertsGlobal.filter(
        (id) => id !== idBloc
      );

      setOuvert(false);
      return;
    }

    blocsRepliablesOuvertsGlobal = blocsRepliablesOuvertsGlobal.filter(
      (id) => id !== idBloc
    );

    blocsRepliablesOuvertsGlobal.push(idBloc);

    if (blocsRepliablesOuvertsGlobal.length > 2) {
      const blocAFermer = blocsRepliablesOuvertsGlobal.shift();

      if (blocAFermer) {
        window.dispatchEvent(
          new CustomEvent("fermer-bloc-repliable", {
            detail: { idBloc: blocAFermer },
          })
        );
      }
    }

    setOuvert(true);
  };

  return (
    <section className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={basculerBloc}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h2 className="text-base font-bold text-slate-900">{titre}</h2>
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {ouvert ? "â–² Masquer" : "â–¼ Afficher"}
        </span>
      </button>

      {ouvert && <div className="mt-3 space-y-3">{children}</div>}
    </section>
  );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-slate-900">{titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Card({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-slate-900">
      <p className="text-xs text-slate-500">{titre}</p>
      <p className="text-lg font-bold text-slate-900">{valeur}</p>
    </div>
  );
}

function MiniResult({
  titre,
  valeur,
  couleur = "text-slate-900",
}: {
  titre: string;
  valeur: string;
  couleur?: string;
}) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <p className="text-xs text-slate-500">{titre}</p>
      <p className={`text-lg font-bold ${couleur}`}>{valeur}</p>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700">{label}</label>

      <input
        type="date"
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        value={formatDateFrVersInput(value)}
        onChange={(e) => onChange(formatDateInputVersFr(e.target.value))}
      />

      {value && (
        <p className="mt-1 text-xs text-slate-500">
          Date sÃ©lectionnÃ©e : {value}
        </p>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <input
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <textarea
        className="mt-1 min-h-[70px] w-full rounded-lg border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [valeurTexte, setValeurTexte] = useState(
    value === 0 ? "0" : String(value)
  );

  useEffect(() => {
    setValeurTexte(value === 0 ? "0" : String(value));
  }, [value]);

  return (
    <div>
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        value={valeurTexte}
        onFocus={() => {
          if (valeurTexte === "0") {
            setValeurTexte("");
          }
        }}
        onChange={(e) => {
          const brut = e.target.value.replace(",", ".");

          if (brut === "") {
            setValeurTexte("");
            onChange(0);
            return;
          }

          if (!/^\d*\.?\d{0,2}$/.test(brut)) return;

          setValeurTexte(brut);

          const nombre = Number(brut);
          if (!Number.isNaN(nombre)) {
            onChange(nombre);
          }
        }}
        onBlur={() => {
          const nombre = Number(valeurTexte);

          if (!valeurTexte || Number.isNaN(nombre)) {
            setValeurTexte("0");
            onChange(0);
            return;
          }

          const arrondi = Math.round(nombre * 100) / 100;
          setValeurTexte(String(arrondi));
          onChange(arrondi);
        }}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[][];
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <select
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function GraphiqueCourbe({
  donnees,
}: {
  donnees: {
    label: string;
    encaissements: number;
    depenses: number;
    resultat: number;
  }[];
}) {
  const largeur = 960;
  const hauteur = 340;

  const margeGauche = 70;
  const margeDroite = 30;
  const margeHaut = 45;
  const margeBas = 55;

  const largeurGraphique =
    largeur - margeGauche - margeDroite;

  const hauteurGraphique =
    hauteur - margeHaut - margeBas;

  const toutesLesValeurs = donnees.flatMap((donnee) => [
    donnee.encaissements,
    donnee.depenses,
    donnee.resultat,
  ]);

  const valeurMaximum = Math.max(
    ...toutesLesValeurs,
    0,
    1
  );

  const valeurMinimum = Math.min(
    ...toutesLesValeurs,
    0
  );

  const amplitude = Math.max(
    valeurMaximum - valeurMinimum,
    1
  );

  const positionX = (index: number) => {
    if (donnees.length <= 1) {
      return margeGauche + largeurGraphique / 2;
    }

    return (
      margeGauche +
      (index * largeurGraphique) /
        (donnees.length - 1)
    );
  };

  const positionY = (valeur: number) => {
    return (
      margeHaut +
      ((valeurMaximum - valeur) / amplitude) *
        hauteurGraphique
    );
  };

  const positionZero = positionY(0);

  const creerPoints = (
    cle: "encaissements" | "depenses" | "resultat"
  ) => {
    return donnees.map((donnee, index) => ({
      x: positionX(index),
      y: positionY(donnee[cle]),
      valeur: donnee[cle],
      label: donnee.label,
    }));
  };

  const creerChemin = (
    points: {
      x: number;
      y: number;
    }[]
  ) => {
    return points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");
  };

  const pointsEncaissements =
    creerPoints("encaissements");

  const pointsDepenses =
    creerPoints("depenses");

  const pointsResultat =
    creerPoints("resultat");

  const cheminEncaissements =
    creerChemin(pointsEncaissements);

  const cheminDepenses =
    creerChemin(pointsDepenses);

  const cheminResultat =
    creerChemin(pointsResultat);

  const formaterMontant = (montant: number) => {
    return `${new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(montant)} â‚¬`;
  };

  const graduations = Array.from(
    { length: 5 },
    (_, index) => {
      const valeur =
        valeurMaximum -
        (index * amplitude) / 4;

      return {
        valeur,
        y: positionY(valeur),
      };
    }
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            ActivitÃ© financiÃ¨re sur 12 mois
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Comparaison des encaissements, des dÃ©penses
            payÃ©es et du rÃ©sultat rÃ©el.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <div className="flex items-center gap-2 text-blue-700">
            <span className="h-3 w-3 rounded-full bg-blue-600" />
            Encaissements
          </div>

          <div className="flex items-center gap-2 text-red-700">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            DÃ©penses
          </div>

          <div className="flex items-center gap-2 text-emerald-700">
            <span className="h-3 w-3 rounded-full bg-emerald-600" />
            RÃ©sultat
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${largeur} ${hauteur}`}
          className="min-w-[900px]"
          role="img"
          aria-label="Graphique des encaissements, dÃ©penses et rÃ©sultats sur douze mois"
        >
          {/* ================= GRILLE HORIZONTALE ================= */}

          {graduations.map((graduation, index) => (
            <g key={`graduation-${index}`}>
              <line
                x1={margeGauche}
                y1={graduation.y}
                x2={largeur - margeDroite}
                y2={graduation.y}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="5 5"
              />

              <text
                x={margeGauche - 10}
                y={graduation.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#64748B"
              >
                {formaterMontant(graduation.valeur)}
              </text>
            </g>
          ))}

          {/* ================= AXE VERTICAL ================= */}

          <line
            x1={margeGauche}
            y1={margeHaut}
            x2={margeGauche}
            y2={hauteur - margeBas}
            stroke="#CBD5E1"
            strokeWidth="2"
          />

          {/* ================= LIGNE ZÃ‰RO ================= */}

          <line
            x1={margeGauche}
            y1={positionZero}
            x2={largeur - margeDroite}
            y2={positionZero}
            stroke="#94A3B8"
            strokeWidth="2"
          />

          {/* ================= COURBE ENCAISSEMENTS ================= */}

          <path
            d={cheminEncaissements}
            fill="none"
            stroke="#2563EB"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ================= COURBE DÃ‰PENSES ================= */}

          <path
            d={cheminDepenses}
            fill="none"
            stroke="#DC2626"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ================= COURBE RÃ‰SULTAT ================= */}

          <path
            d={cheminResultat}
            fill="none"
            stroke="#059669"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ================= POINTS ET LIBELLÃ‰S ================= */}

          {donnees.map((donnee, index) => {
            const x = positionX(index);

            const yEncaissements = positionY(
              donnee.encaissements
            );

            const yDepenses = positionY(
              donnee.depenses
            );

            const yResultat = positionY(
              donnee.resultat
            );

            return (
              <g key={`${donnee.label}-${index}`}>
                <circle
                  cx={x}
                  cy={yEncaissements}
                  r="5"
                  fill="#2563EB"
                >
                  <title>
                    {`${donnee.label} â€” Encaissements : ${formaterMontant(
                      donnee.encaissements
                    )}`}
                  </title>
                </circle>

                <circle
                  cx={x}
                  cy={yDepenses}
                  r="5"
                  fill="#DC2626"
                >
                  <title>
                    {`${donnee.label} â€” DÃ©penses : ${formaterMontant(
                      donnee.depenses
                    )}`}
                  </title>
                </circle>

                <circle
                  cx={x}
                  cy={yResultat}
                  r="5"
                  fill="#059669"
                >
                  <title>
                    {`${donnee.label} â€” RÃ©sultat : ${formaterMontant(
                      donnee.resultat
                    )}`}
                  </title>
                </circle>

                <text
                  x={x}
                  y={hauteur - 18}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#475569"
                >
                  {donnee.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="font-semibold text-blue-800">
            Encaissements
          </div>

          <div className="mt-1 text-xs text-blue-700">
            Sommes rÃ©ellement reÃ§ues.
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="font-semibold text-red-800">
            DÃ©penses
          </div>

          <div className="mt-1 text-xs text-red-700">
            Achats payÃ©s pendant le mois, y compris le
            stock utilisÃ© sur plusieurs chantiers.
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="font-semibold text-emerald-800">
            RÃ©sultat rÃ©el
          </div>

          <div className="mt-1 text-xs text-emerald-700">
            Encaissements moins dÃ©penses.
          </div>
        </div>
      </div>
    </div>
  );
}

