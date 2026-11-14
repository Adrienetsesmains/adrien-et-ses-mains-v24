"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { jsPDF } from "jspdf";

import {
  TARIFS_PRESTATIONS as TARIFS_PRESTATIONS_BASE,
  DETAILS_PDF_PAR_CATEGORIE,
} from "../data/TARIFS_PRESTATIONS";

import { supabase } from "./lib/supabaseClient";

// Affichage monétaire commun : virgule française et deux décimales.
function formatMontant(valeur: number | null | undefined): string {
  const nombre = Number(valeur ?? 0);
  return (Number.isFinite(nombre) ? nombre : 0).toLocaleString("fr-FR", {
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const VERSION_APPLICATION = "V26";
const CHEMIN_BANNIERE_V26 = "/banniere-v26.png";

// Les clés V25 sont volontairement conservées : la V26 reprend ainsi toutes
// les données, l'historique, les compteurs et les favoris sans migration risquée.
const CLE_SAUVEGARDE_V25 = "tableauDeBordEntrepriseV25";
const CLE_SAUVEGARDE_V24 = "tableauDeBordEntrepriseV24";
const CLE_BACKUPS_V25 = "backupHistoriqueV25";
const CLE_BACKUPS_V24 = "backupHistoriqueV24";
const CLE_DERNIERE_SYNCHRO_CLOUD_V26 = "derniereSynchronisationCloudV26";
const CLE_DERNIERE_MODIFICATION_LOCALE_V26 = "derniereModificationLocaleV26";

// Une facture PDF peut remplir le petit quota local du navigateur.
// Réduire uniquement les anciennes copies automatiques, jamais les dossiers actifs.
function estErreurQuotaStockage(erreur: unknown): boolean {
  const e = erreur as { name?: string; code?: number } | null;
  return Boolean(e && (
    e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 || e.code === 1014
  ));
}

function ecrireStockageLocal(cle: string, valeur: string): void {
  let derniereErreur: unknown;
  const essayer = (texte: string) => {
    try {
      localStorage.setItem(cle, texte);
      return true;
    } catch (erreur) {
      if (!estErreurQuotaStockage(erreur)) throw erreur;
      derniereErreur = erreur;
      return false;
    }
  };
  if (essayer(valeur)) return;

  const clesCopies = [CLE_BACKUPS_V24, CLE_BACKUPS_V25];
  // Si ce sont les copies que l'on écrit, adapter le nombre à la place disponible.
  // La plus récente reste toujours présente ; le maximum habituel reste dix.
  if (clesCopies.includes(cle)) {
    let copies: unknown;
    try { copies = JSON.parse(valeur); } catch { throw derniereErreur; }
    if (Array.isArray(copies)) {
      const restantes = copies.slice();
      while (restantes.length > 1) {
        restantes.shift();
        valeur = JSON.stringify(restantes);
        if (essayer(valeur)) return;
      }
    }
  }

  // Libérer progressivement les versions les plus anciennes, avec au moins
  // une copie conservée par génération de sauvegarde.
  for (const cleCopies of clesCopies) {
    if (cleCopies === cle) continue;
    const texte = localStorage.getItem(cleCopies);
    if (!texte) continue;
    let copies: unknown;
    try { copies = JSON.parse(texte); } catch { continue; }
    if (!Array.isArray(copies)) continue;
    const restantes = copies.slice();
    while (restantes.length > 1) {
      restantes.shift();
      localStorage.setItem(cleCopies, JSON.stringify(restantes));
      if (essayer(valeur)) return;
    }
  }
  throw derniereErreur;
}

// Le catalogue officiel est l’unique source des temps, tarifs, unités et détails PDF.
// Les packs ne conservent que des identifiants et des quantités de départ.
// Toute modification d’une prestation du catalogue actualise donc automatiquement les packs.
const TARIFS_PRESTATIONS = TARIFS_PRESTATIONS_BASE;

const PACKS_PRESTATIONS_V26: Array<{
  id: string; nom: string; famille: string; description: string; lignes: [string, number][];
}> = [
  {
    "id": "PACK-LOGEMENT-RELOCATION",
    "nom": "Remise en état d’un logement avant relocation",
    "famille": "Rénovation de logement",
    "description": "Base adaptable : débarras, peinture, rénovation du sol et nettoyage général du logement.",
    "lignes": [
      [
        "DEB-ENCOMBRANTS",
        1.0
      ],
      [
        "DEB-DECHETTERIE",
        1.0
      ],
      [
        "PEINT-PROT",
        1.0
      ],
      [
        "SOL-DEPOSE",
        1.0
      ],
      [
        "SOL-PREP-MECA",
        1.0
      ],
      [
        "PEINT-PREP-LEG",
        1.0
      ],
      [
        "PEINT-PLAFOND-2C",
        1.0
      ],
      [
        "PEINT-MURS-2C",
        1.0
      ],
      [
        "SOL-PVC-CLIP",
        1.0
      ],
      [
        "SOL-PLINTHE-BOIS",
        1.0
      ],
      [
        "NET-LOGEMENT",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-SOUS-FACE-PVC",
    "nom": "Remplacement d’une sous-face par du lambris PVC",
    "famille": "Toiture et sous-faces",
    "description": "Dépose complète de l’habillage existant, pose du PVC, évacuation et nettoyage.",
    "lignes": [
      [
        "TOIT-HAB-DEPOSE-COMP",
        1.0
      ],
      [
        "TOIT-HAB-PVC",
        1.0
      ],
      [
        "DEB-DECHETTERIE",
        1.0
      ],
      [
        "NET-FIN-CHANTIER",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-SDB-DOUCHE",
    "nom": "Réfection d’un espace douche",
    "famille": "Salle de bain",
    "description": "Dépose de la paroi et de la faïence, reprise du support, protection à l’eau, faïence et finitions.",
    "lignes": [
      [
        "PEINT-PROT",
        1.0
      ],
      [
        "PLOMB-PAROI-DEP",
        1.0
      ],
      [
        "CAR-DEPOSE",
        1.0
      ],
      [
        "DEB-DECHETTERIE",
        1.0
      ],
      [
        "CAR-PREP",
        1.0
      ],
      [
        "CAR-ETANCH",
        1.0
      ],
      [
        "CAR-FAIENCE",
        1.0
      ],
      [
        "CAR-JOINT",
        1.0
      ],
      [
        "PLOMB-PAROI-POS",
        1.0
      ],
      [
        "CAR-SILICONE",
        1.0
      ],
      [
        "NET-FIN-CHANTIER",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-SDB-RENOVATION",
    "nom": "Rénovation complète d’une salle de bain",
    "famille": "Salle de bain",
    "description": "Déposes, douche, faïence, sol au choix (PVC ou carrelage), peintures, meuble vasque et finitions. Les quantités sont à adapter au chantier.",
    "lignes": [
      [
        "PEINT-PROT",
        1.0
      ],
      [
        "PLOMB-PAROI-DEP",
        1.0
      ],
      [
        "PLOMB-DEPOSE-EQP",
        1.0
      ],
      [
        "CAR-DEPOSE",
        1.0
      ],
      [
        "DEB-DECHETTERIE",
        1.0
      ],
      [
        "CAR-PREP",
        1.0
      ],
      [
        "SOL-PREP-MECA",
        1.0
      ],
      [
        "PLOMB-REC-DCH",
        1.0
      ],
      [
        "CAR-ETANCH",
        1.0
      ],
      [
        "CAR-FAIENCE",
        1.0
      ],
      [
        "CAR-SOL",
        1
      ],
      [
        "CAR-JOINT",
        1.0
      ],
      [
        "PEINT-PREP-RENF",
        1.0
      ],
      [
        "PEINT-PLAFOND-2C",
        1.0
      ],
      [
        "PEINT-MURS-2C",
        1.0
      ],
      [
        "SOL-PVC-CLIP",
        1.0
      ],
      [
        "SOL-PLINTHE-BOIS",
        1.0
      ],
      [
        "PLOMB-MEUBLE-VASQUE",
        1.0
      ],
      [
        "PLOMB-ROBINET",
        1.0
      ],
      [
        "PLOMB-PAROI-POS",
        1.0
      ],
      [
        "CAR-SILICONE",
        1.0
      ],
      [
        "SOL-PLINTHE-CARR",
        1
      ],
      [
        "NET-FIN-CHANTIER",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-PEINT-PIECE",
    "nom": "Remise en peinture complète d’une pièce",
    "famille": "Revêtements intérieurs",
    "description": "Protection, préparation légère, deux couches sur murs et plafond, joints acryliques et nettoyage.",
    "lignes": [
      [
        "PEINT-PROT",
        1.0
      ],
      [
        "PEINT-PREP-LEG",
        1.0
      ],
      [
        "PEINT-ACRYLIQUE",
        1.0
      ],
      [
        "PEINT-PLAFOND-2C",
        1.0
      ],
      [
        "PEINT-MURS-2C",
        1.0
      ],
      [
        "NET-FIN-CHANTIER",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-SOL-PVC",
    "nom": "Pose complète d’un sol PVC clipsable",
    "famille": "Revêtements intérieurs",
    "description": "Dépose éventuelle, préparation du support, sous-couche, sol PVC, plinthes et nettoyage.",
    "lignes": [
      [
        "SOL-DEPOSE",
        1.0
      ],
      [
        "SOL-PREP-MECA",
        1.0
      ],
      [
        "SOL-SOUS-COUCHE",
        1.0
      ],
      [
        "SOL-PVC-CLIP",
        1.0
      ],
      [
        "SOL-PLINTHE-BOIS",
        1.0
      ],
      [
        "NET-FIN-CHANTIER",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-CUISINE-SIMPLE-REMPLACEMENT",
    "nom": "Remplacement d’une cuisine simple",
    "famille": "Équipements intérieurs",
    "description": "Dépose, montage et pose des meubles, remplacement du plan de travail, évier et mitigeur sur réseaux existants, évacuation et nettoyage. Quantités de départ à adapter : nombre de meubles, mètres de plan et surface nettoyée. Fournitures à renseigner séparément ; hors électroménager, crédence et modification des réseaux. Adapter la manutention aux étages. Ne pas cumuler les mêmes déposes ou raccordements avec un forfait global.",
    "lignes": [
      [
        "PEINT-PROT",
        1
      ],
      [
        "PLOMB-DEPOSE-EQP",
        1
      ],
      [
        "CUI-PLAN-DEPOSE",
        1
      ],
      [
        "CUI-MEUBLE-DEPOSE",
        1
      ],
      [
        "CUI-MEUBLE-MONT",
        1
      ],
      [
        "CUI-MEUBLE-POS",
        1
      ],
      [
        "CUI-PLAN",
        1
      ],
      [
        "CUI-DECOUPE",
        1
      ],
      [
        "CUI-EVIER",
        1
      ],
      [
        "CUI-MITIGEUR",
        1
      ],
      [
        "CUI-AJUST",
        1
      ],
      [
        "DEB-DECHETTERIE",
        1
      ],
      [
        "NET-FIN-CHANTIER",
        1
      ]
    ]
  },
  {
    "id": "PACK-BOITES-LETTRES",
    "nom": "Remplacement d’un bloc de boîtes aux lettres",
    "famille": "Équipements extérieurs",
    "description": "Dépose du bloc, préparation de la réservation, pose des boîtes, scellement et évacuation.",
    "lignes": [
      [
        "BRI-BAL-DEPOSE-BLOC",
        1.0
      ],
      [
        "BRI-BAL-PREP",
        1.0
      ],
      [
        "BRI-BAL-POSE",
        1.0
      ],
      [
        "BRI-BAL-FIN-MAC",
        1.0
      ],
      [
        "DEB-DECHETTERIE",
        1.0
      ],
      [
        "NET-FIN-CHANTIER",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-TERRASSE-BOIS",
    "nom": "Rénovation d’une terrasse en bois",
    "famille": "Terrasses",
    "description": "Dépose des lames existantes, contrôle du support, pose des nouvelles lames, finitions et évacuation. Le saturateur reste une prestation optionnelle à ajouter séparément.",
    "lignes": [
      [
        "TERR-PROT-CHEMINEMENT",
        1.0
      ],
      [
        "TERR-MANUT-ACCES",
        1.0
      ],
      [
        "TERR-DEPOSE-LAMES",
        1.0
      ],
      [
        "TERR-CONTROLE-SUPPORT",
        1.0
      ],
      [
        "TERR-POSE-LAMES-BOIS",
        1.0
      ],
      [
        "TERR-COUPES-FINITIONS",
        1.0
      ],
      [
        "TERR-TRI-EVAC",
        1.0
      ],
      [
        "NET-FIN-CHANTIER",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-TERRASSE-BOIS-CREATION",
    "nom": "Création complète d’une terrasse en bois",
    "famille": "Terrasses",
    "description": "Création sur terrain dégagé : implantation, géotextile, points d’appui, structure neuve en lambourdes, pose des lames et finitions courantes. Renseigner la surface réelle sur chaque ligne.",
    "lignes": [
      [
        "TERR-IMPLANT-GEOTEXTILE",
        1.0
      ],
      [
        "TERR-POINTS-APPUI",
        1.0
      ],
      [
        "TERR-OSSATURE-NEUVE",
        1.0
      ],
      [
        "TERR-POSE-LAMES-NEUF",
        1.0
      ]
    ]
  },
  {
    "id": "PACK-PERGOLA-ACIER-PEINTE",
    "nom": "Pergola acier ouverte — finition peinte",
    "famille": "Pergolas",
    "description": "Base adaptable pour une pergola acier ouverte d’environ 4 × 4 m : fabrication, pose, renfort de manutention, préparation, anticorrosion et peinture. Sans couverture.",
    "lignes": [
      [
        "EXT-PERGOLA-ACIER-FAB",
        17.5
      ],
      [
        "EXT-METAL-PREP",
        11.05
      ],
      [
        "EXT-ANTIROUILLE",
        11.05
      ],
      [
        "EXT-METAL-PEINT",
        11.05
      ],
      [
        "EXT-PERGOLA-RENFORT-POSE",
        1.0
      ],
      [
        "EXT-PERGOLA-ACIER-POS",
        10.5
      ]
    ]
  },
  {
    "id": "PACK-JARDIN-REMISE-ETAT",
    "nom": "Remise en état d’un jardin",
    "famille": "Jardin",
    "description": "Entretien global d’un espace vert laissé sans entretien, avec nettoyage et évacuation.",
    "lignes": [
      [
        "JAR-REMISE-ETAT",
        1.0
      ],
      [
        "JAR-EVAC",
        1.0
      ]
    ]
  }
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
  // Compatibilité ancien + nouveau catalogue.
  let prixNormal = Number(
    prestation.prix220 ??
    prestation.prixMo220 ??
    prestation.prixNormal ??
    0
  );

  // Sécurité :
  // si aucun prix n'est stocké mais qu'un temps existe,
  // calcul automatique sur la base 220 € / journée de 7 h.
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
  // Aucun coefficient Jérémie sur les frais de déplacement.
  if (
    prestation.typeTravaux === "deplacement" ||
    prestation.categorie === "Déplacement / logistique"
  ) {
    return prixNormal;
  }

  // ================= JEREMIE =================
  // 190 €/jour au lieu de 220 €/jour.
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
  coefficientPenibilite?: number;
heuresUniteManuel?: boolean;
  detailsPdfPersonnalises?: string[];
  detailsPdfOuvert?: boolean;

  // Petite fourniture rattachée directement à cette prestation.
  fournitureIncluse?: boolean;
  prixFournitureInclus?: number;

  offert?: boolean;
  packInstanceId?: string;
  packNom?: string;
  travauxSupplementaires?: boolean;
};

// Corrections de statistiques uniquement : aucune écriture dans les factures.
type CorrectionsEncaissementsMensuels = Record<string, number>;
const cleMoisStatistiques = (annee: number, mois: number) =>
  `${annee}-${String(mois + 1).padStart(2, "0")}`;

function normaliserCorrectionsMensuelles(valeur: unknown): CorrectionsEncaissementsMensuels {
  if (!valeur || typeof valeur !== "object" || Array.isArray(valeur)) return {};
  const resultat: CorrectionsEncaissementsMensuels = {};
  for (const [cle, montant] of Object.entries(valeur)) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(cle) &&
        typeof montant === "number" && Number.isFinite(montant) && montant >= 0) {
      resultat[cle] = Math.round(montant * 100) / 100;
    }
  }
  return resultat;
}

function lireMontantCorrection(texte: string): number | null {
  const nettoye = texte.trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(nettoye)) return null;
  const montant = Number(nettoye);
  return Number.isFinite(montant) && montant >= 0
    ? Math.round(montant * 100) / 100 : null;
}

type Depense = {
  id: number;
  date: string;
  categorie: string;
  description: string;
  montant: number;
  modePaiement: string;
};

type MoisDepensesGraphique = {
  label: string; essence: number; fournitures: number; materiel: number;
};
const SERIES_DEPENSES = [
  { cle: "essence", nom: "Essence", couleur: "#b29a70" },
  { cle: "fournitures", nom: "Fournitures", couleur: "#698d9b" },
  { cle: "materiel", nom: "Matériel", couleur: "#9a8ba5" },
] as const;

function calculerGraphiqueDepenses(depenses: Depense[], annee: number): MoisDepensesGraphique[] {
  const mois = Array.from({ length: 12 }, (_, index) => ({
    label: new Date(annee, index, 1).toLocaleString("fr-FR", { month: "short" }),
    essence: 0, fournitures: 0, materiel: 0,
  }));
  for (const depense of depenses) {
    const date = parseDateFr(depense.date || "");
    const montant = Number(depense.montant);
    if (!date || !Number.isFinite(date.getTime()) || date.getFullYear() !== annee ||
        !Number.isFinite(montant)) continue;
    const categorie = (depense.categorie || "").trim().toLocaleLowerCase("fr-FR")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cle = categorie === "essence" ? "essence"
      : categorie === "fournitures" ? "fournitures"
      : categorie === "materiel" ? "materiel" : null;
    if (cle) mois[date.getMonth()][cle] += Math.round(montant * 100);
  }
  return mois.map((ligne) => ({ ...ligne,
    essence: ligne.essence / 100,
    fournitures: ligne.fournitures / 100,
    materiel: ligne.materiel / 100,
  }));
}

type TypeEvenement = "devis" | "rdv" | "chantier" | "rappel";

type BaseFacturation = {
  lignes: LigneTravaux[];
  montantsPDF: number[];
  frais: number;
  heures: number;
  jours: number;
  total: number;
  fournitures: number;
  modeClient: string;
};

type FactureIntermediaire = {
  numero: string;
  date: string;
  montant: number;
  cumulFacture: number;
  totalDevis: number;
  description: string;
  dateTravaux: string;
  pdfBase64: string;
  nomFichier: string;
  // Une facture émise n'est pas un encaissement : seule cette date valide son règlement.
  datePaiement?: string;
};
type TypeDocumentPDF = "devis" | "facture" | "acompte" | "situation";

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
  // Document émis conservé à l'identique, distinct du paiement reçu.
  factureAcompte?: {
    numero: string;
    date: string;
    montant: number;
    totalDevis: number;
    pdfBase64: string;
    nomFichier: string;
  };
  facturesIntermediaires?: FactureIntermediaire[];
  conditionsGeneralesDevis?: string;
  conditionsChantier?: string;
  commentaireFournitures?: string;
  estBrouillonAuto?: boolean;
  // La copie de facturation garde le numéro et l'identité du devis original.
  devisOrigineId?: number;
  baseFacturation?: BaseFacturation;
  total: number;
  acompte: number;
  reste: number;

  // Montant total encaissé actuellement sur le dossier
  montantEncaisse?: number;

  // Mémoire séparée de l'acompte réellement reçu
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

  // Date réelle à laquelle l'acompte a été reçu
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

function repartirFraisDevis(lignes: LigneTravaux[], mode: string, frais: number): number[] {
  const montants = lignes.map((l) => montantLigne(l, mode));
  const total = montants.reduce((s, n) => s + n, 0);
  if (total === 0) return montants;
  const estTravail = (l: LigneTravaux) => !(l.prestationNom || nomTravaux(l.type)).toLowerCase().includes("fourniture");
  const base = lignes.reduce((s, l, i) => s + (estTravail(l) ? montants[i] : 0), 0);
  const resultat = montants.map((n, i) => n + (estTravail(lignes[i]) && base !== 0 ? Math.round(frais * n / base) : 0));
  if (resultat.length) resultat[0] += total + frais - resultat.reduce((s, n) => s + n, 0);
  return resultat;
}

// Répartition au centime, uniquement sur les prestations payantes.
function integrerMinimumPDF(lignes: LigneTravaux[], montants: number[], complement: number) {
  const resultat = [...montants];
  const indices = lignes.map((l, i) => i).filter((i) =>
    !lignes[i].offert && resultat[i] > 0 &&
    !(lignes[i].prestationNom || nomTravaux(lignes[i].type)).toLowerCase().includes("fourniture")
  );
  const poids = indices.reduce((s, i) => s + resultat[i], 0);
  let reste = Math.max(0, Math.round(complement * 100));
  const centimes = reste;
  indices.forEach((i, position) => {
    const part = position === indices.length - 1
      ? reste : Math.floor(centimes * resultat[i] / poids);
    resultat[i] = Math.round(resultat[i] * 100 + part) / 100;
    reste -= part;
  });
  return { montants: resultat, nonReparti: reste / 100 };
}

function creerBaseFacturation(devis: Dossier): BaseFacturation {
  const lignes: LigneTravaux[] = JSON.parse(JSON.stringify(devis.lignesTravaux || []));
  const heures = lignes.reduce((s, l) => s + (l.heuresUnite || 0) * (l.q1 || 1), 0);
  const jours = Math.max(1, Math.ceil(heures / 7));
  const kmAR = (devis.kmAller || 0) * 2;
  const tarif = (id: string) => TARIFS_PRESTATIONS.find((p) => p.id === id)?.prix220 || 0;
  const vide = !lignes.length && !devis.achatFournitures && !devis.kmAller;
  const frais = devis.fraisDeplacementManuelActif
    ? Math.round(devis.fraisDeplacementManuel || 0)
    : vide || kmAR <= 0 ? 0 : Math.round(
        kmAR * tarif("deplacement_premier_jour_chantier") + tarif("forfait_mise_en_place_chantier") +
        Math.max(0, jours - 1) * kmAR * tarif("deplacement_jours_suivants")
      );
  return {
    lignes, montantsPDF: repartirFraisDevis(lignes, devis.modeClient, frais), frais,
    heures, jours, total: devis.total || 0, fournitures: devis.reventeFournitures || 0,
    modeClient: devis.modeClient,
  };
}

// La répartition des frais supplémentaires n'utilise jamais les lignes du devis.
function calculerSupplementsFacture(base: BaseFacturation, lignes: LigneTravaux[], mode: string, kmAR: number, tarifJourSuivant: number) {
  const idsOrigine = new Set(base.lignes.map((l) => l.id));
  const nouvelles = lignes.filter((l) => !idsOrigine.has(l.id));
  const heuresSup = nouvelles.reduce((s, l) => s + (l.heuresUnite || 0) * (l.q1 || 1), 0);
  const jours = Math.max(base.jours, Math.ceil((base.heures + heuresSup) / 7));
  const joursSup = Math.max(0, jours - base.jours);
  const fraisSup = Math.round(joursSup * Math.max(0, kmAR) * tarifJourSuivant * 100) / 100;
  const eligibles = nouvelles.filter((l) => montantLigne(l, mode) > 0 &&
    !(l.prestationNom || nomTravaux(l.type)).toLowerCase().includes("fourniture"));
  const poids = eligibles.reduce((s, l) => s + montantLigne(l, mode), 0);
  const parts = new Map<number, number>();
  let resteCentimes = Math.round(fraisSup * 100);
  eligibles.forEach((l, i) => {
    const part = i === eligibles.length - 1 ? resteCentimes : Math.floor(fraisSup * 100 * montantLigne(l, mode) / poids);
    parts.set(l.id, part / 100);
    resteCentimes -= part;
  });
  const montants = lignes.map((l) => {
    const i = base.lignes.findIndex((origine) => origine.id === l.id);
    return i >= 0 ? base.montantsPDF[i] : Math.round((montantLigne(l, mode) + (parts.get(l.id) || 0)) * 100) / 100;
  });
  return { montants, jours, joursSup, fraisSup, heures: base.heures + heuresSup,
    fraisNonRepartis: eligibles.length ? 0 : fraisSup,
    travauxSup: nouvelles.reduce((s, l) => s + montantLigne(l, mode), 0) };
}

const prestations = TARIFS_PRESTATIONS;

const categories = Array.from(
  new Set(prestations.map((p) => p.categorieChantier || p.categorie))
);

const getPrestationsByCategorie = (categorie: string) => {
  return prestations.filter((p) => (p.categorieChantier || p.categorie) === categorie);
};

const calculerPrix = (prestation: any, quantite: number) => {
  if (prestation.unite === "m²") return prestation.prix220 * quantite;
  if (prestation.unite === "ml") return prestation.prix220 * quantite;
  if (prestation.unite === "h") return prestation.prix220 * quantite;
  if (prestation.unite === "u") return prestation.prix220 * quantite;
  if (prestation.unite === "m³") return prestation.prix220 * quantite;

  if (prestation.unite === "forfait") return prestation.prix220;

  return 0;
};

const calculerTemps = (prestation: any, quantite: number) => {
  return prestation.heuresUnite * quantite;
};

const typesTravaux = [
  ["plafond", "Plafond dégât des eaux"],
  ["peinture", "Peinture murs / plafonds"],
  ["parquet", "Parquet / sol PVC"],
  ["cuisine", "Cuisine simple"],
  ["wc", "WC / petite plomberie"],
  ["vmc", "VMC simple flux"],
  ["placo", "Placo / doublage léger"],
  ["gouttiere", "Gouttière / descente"],
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
    "Sous-traitance Jérémie — base 190 €/jour — hors fournitures.\n\nMail : contact.meurissecouverture@gmail.com     Tel secrétariat: 05 64 72 22 98",
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
    notes: "Particulier — ami proche — aime le travail parfait.",
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
  notes: "05 61 27 72 77 Agence Patrimoine Occitan — devis serrés et rapides.",
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
    notes: "05 63 71 81 31 Agence Foncia — être réactif sur devis et travaux.",
    modeClient: "agence",
  },
];
// Repères prestations de services vérifiés sur impots.gouv.fr.
// TVA : https://www.impots.gouv.fr/professionnel/questions/je-suis-micro-entrepreneur-ou-la-tete-dune-micro-entreprise-ai-je-des
// Micro : https://www.impots.gouv.fr/professionnel/questions/pour-rester-micro-entrepreneur-quel-montant-de-chiffre-daffaires-ou-de
const SEUILS_CA_SERVICES: Record<number, { tva: number; tvaMajore: number; micro: number }> = {
  2025: { tva: 37500, tvaMajore: 41250, micro: 77700 },
  2026: { tva: 37500, tvaMajore: 41250, micro: 83600 },
};

function decompteFacturation(dossier: Pick<Dossier,
  "factureAcompte" | "facturesIntermediaires" | "montantAcompteEncaisse" |
  "montantEncaisse" | "facturePayee" | "total"
>) {
  const intermediaires = dossier.facturesIntermediaires || [];
  const centimes = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100);
  const facturesAvant = centimes(dossier.factureAcompte?.montant || 0) +
    intermediaires.reduce((somme, f) => somme + centimes(f.montant), 0);
  const intermediairesRecus = intermediaires.filter((f) => f.datePaiement)
    .reduce((somme, f) => somme + centimes(f.montant), 0);
  let acompteRecu = centimes(dossier.montantAcompteEncaisse || 0);
  if (acompteRecu <= 0 && !dossier.facturePayee) {
    acompteRecu = Math.max(0, centimes(dossier.montantEncaisse || 0) - intermediairesRecus);
  }
  const encaisseFinal = Math.max(0, centimes(dossier.montantEncaisse || 0) - acompteRecu - intermediairesRecus);
  const montantFinal = Math.max(0, centimes(dossier.total || 0) - facturesAvant);
  return { dejaFacture: facturesAvant / 100, intermediairesRecus: intermediairesRecus / 100,
    acompteRecu: acompteRecu / 100, montantFinal: montantFinal / 100,
    encaisseFinal: encaisseFinal / 100, resteFinal: Math.max(0, montantFinal - encaisseFinal) / 100 };
}

// Une entrée par règlement réel, commune au détail, au graphique et au suivi annuel.
function encaissementsDuMois(dossiers: Dossier[], annee: number, mois: number) {
  const devisArchives = new Set(dossiers.map((d) => d.devisOrigineId).filter((id) => id !== undefined));
  const resultat: { cle: string; dossierId: number; numero: string; devis: string;
    client: string; chantier: string; date: string; nature: string; montant: number }[] = [];
  for (const d of dossiers) {
    if (devisArchives.has(d.id)) continue;
    const encaisse = Number(d.montantEncaisse || 0);
    if (!Number.isFinite(encaisse) || encaisse <= 0) continue;
    const intermediaires = d.facturesIntermediaires || [];
    const intermediairesRecus = intermediaires.filter((f) => f.datePaiement)
      .reduce((somme, f) => somme + Math.round(f.montant * 100), 0) / 100;
    let acompte = Number(d.montantAcompteEncaisse || 0);
    let dateAcompte = d.dateAcompte || "";
    if (acompte <= 0 && !d.facturePayee && d.datePaiement) {
      acompte = Math.max(0, Math.round((encaisse - intermediairesRecus) * 100) / 100);
      dateAcompte = d.datePaiement;
    }
    const ajouter = (nature: string, montant: number, date: string, numero: string) => {
      const dateReelle = parseDateFr(date);
      if (!Number.isFinite(montant) || montant <= 0 || !dateReelle ||
        dateReelle.getFullYear() !== annee || dateReelle.getMonth() !== mois) return;
      resultat.push({ cle: `${d.id}-${nature}-${numero}`, dossierId: d.id,
        numero: numero || d.numeroDevis || "Sans numéro", devis: d.numeroDevis || "",
        client: d.client || d.clientFinalNom || "Client non renseigné",
        chantier: [d.referenceChantier, d.clientFinalNom || d.locataire || d.proprietaire,
          d.clientFinalAdresse || d.adresse, d.complementAdresse].filter(Boolean).join(" — "),
        date, nature, montant: Math.round(montant * 100) / 100 });
    };
    ajouter("Acompte", acompte, dateAcompte, d.factureAcompte?.numero || "");
    for (const f of intermediaires) {
      if (f.datePaiement) ajouter("Facture intermédiaire", f.montant, f.datePaiement, f.numero);
    }
    if (d.facturePayee && Number.isFinite(acompte)) {
      ajouter(acompte > 0 ? "Solde" : "Paiement complet", Math.max(0, Math.round((encaisse - acompte - intermediairesRecus) * 100) / 100),
        d.datePaiement || "", d.numeroFacture || "");
    }
  }
  return resultat.sort((a, b) => (parseDateFr(a.date)?.getTime() || 0) - (parseDateFr(b.date)?.getTime() || 0));
}

function calculerSuiviAnnuelCA(
  dossiers: Dossier[], corrections: CorrectionsEncaissementsMensuels,
  annee: number, aujourdHui = new Date()
) {
  const dernierMois = annee < aujourdHui.getFullYear() ? 11
    : annee === aujourdHui.getFullYear() ? aujourdHui.getMonth() : -1;
  const mois = Array.from({ length: Math.max(0, dernierMois + 1) }, (_, index) => {
    const centimes = encaissementsDuMois(dossiers, annee, index)
      .reduce((somme, e) => somme + Math.round(e.montant * 100), 0);
    const correction = corrections[cleMoisStatistiques(annee, index)];
    return { mois: index, montant: correction ?? centimes / 100, corrige: correction !== undefined };
  });
  const total = mois.reduce((somme, ligne) => somme + Math.round(ligne.montant * 100), 0) / 100;
  return { total, mois, seuils: SEUILS_CA_SERVICES[annee] ?? null };
}

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

// Numéros de départ mis à jour au 18/09/2026.
// Math.max empêche une ancienne sauvegarde locale ou cloud de faire reculer
// les compteurs, tout en conservant automatiquement une valeur plus élevée.
const PROCHAIN_NUMERO_DEVIS = 53;
const PROCHAIN_NUMERO_FACTURE = 17;
const CLE_RATTRAPAGE_DEVIS_053 = "rattrapageDevis053EffectueV26";
const CLE_RATTRAPAGE_FACTURE_017 = "rattrapageFacture017EffectueV25";

const CONDITIONS_GENERALES_DEVIS_DEFAUT = [
  "Le présent devis est établi sous réserve de l’état réel des supports existants.",
  "Toute dégradation cachée, humidité, support friable ou anomalie non visible pourra entraîner un ajustement.",
  "Les travaux supplémentaires non prévus feront l’objet d’un accord préalable du client.",
  "Les fournitures non mentionnées au devis ne sont pas incluses.",
  "Le client reconnaît que les quantités et prix sont basés sur les éléments visibles au moment de l’estimation.",
].join("\n");

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
  if (type === "peinture") return ["Murs m²", "Plafonds m²", "Reprises m²", "Joints ml", "Portes/finitions"];
  if (type === "plafond") return ["Plafond 1 m²", "Plafond 2 m²", "Tâches m²", "Bande ml", "Placo m²"];
  if (type === "parquet") return ["Sol m²", "Plinthes ml", "Seuils", "Prépa support", "Dépose m²"];
  if (type === "cuisine") return ["Éléments", "Plan travail ml", "Découpes", "Électroménager", "Raccords"];
  if (type === "wc") return ["Intervention", "Support", "Raccords", "Silicone", "Dépose"];
  if (type === "vmc") return ["Groupe VMC", "Bouches", "Gaines ml", "Électricité", "Test"];
  if (type === "placo") return ["Placo m²", "Bandes ml", "Isolation m²", "Découpes", "Dépose"];
  if (type === "gouttiere") return ["Gouttière ml", "Descente ml", "Coudes", "Dépose", "Accès"];
  return ["Q1", "Q2", "R1", "R2", "Option"];
}
function detailsTravaux(ligne: LigneTravaux): string[] {
  const completerAvecFourniture = (details: string[]) => {
    const detailsSansMentionAutomatique = details.filter(
      (detail) => detail.trim().toLowerCase() !== "fournitures incluses"
    );

    return ligne.fournitureIncluse
      ? [...detailsSansMentionAutomatique, "Fournitures incluses"]
      : detailsSansMentionAutomatique;
  };

  if (
    ligne.detailsPdfPersonnalises &&
    ligne.detailsPdfPersonnalises.length > 0 &&
    ligne.detailsPdfPersonnalises.some((d) => d.trim() !== "")
  ) {
    return completerAvecFourniture(
      ligne.detailsPdfPersonnalises.filter((d) => d.trim() !== "")
    );
  }

  const tarifAssocie = TARIFS_PRESTATIONS.find(
    (t) => t.id === ligne.tarifId
  );

  if (tarifAssocie?.detailsPdf && tarifAssocie.detailsPdf.length > 0) {
    return completerAvecFourniture(tarifAssocie.detailsPdf);
  }

  if (tarifAssocie?.categorie && DETAILS_PDF_PAR_CATEGORIE[tarifAssocie.categorie]) {
    return completerAvecFourniture(
      DETAILS_PDF_PAR_CATEGORIE[tarifAssocie.categorie]
    );
  }

  const d: string[] = [];

  if (ligne.type === "peinture") {
    if (ligne.q1 > 0) d.push("Préparation et peinture des murs");
    if (ligne.q2 > 0) d.push("Préparation et peinture des plafonds");
    if (ligne.r1 > 0) d.push("Reprises localisées et enduits");
    if (ligne.r2 > 0) d.push("Réalisation des joints acryliques");
    if (ligne.option > 0) d.push("Finitions complémentaires");
  }

  if (ligne.type === "plafond") {
    if (ligne.q1 > 0) d.push("Préparation et peinture plafond zone 1");
    if (ligne.q2 > 0) d.push("Préparation et peinture plafond zone 2");
    if (ligne.r1 > 0) d.push("Traitement des taches visibles");
    if (ligne.r2 > 0) d.push("Reprise de bande à joint");
    if (ligne.option > 0) d.push("Reprise placo localisée");
  }

  if (ligne.type === "parquet") {
    if (ligne.q1 > 0) d.push("Pose du revêtement de sol prévu");
    if (ligne.q2 > 0) d.push("Pose des plinthes");
    if (ligne.r1 > 0) d.push("Pose des seuils");
    if (ligne.r2 > 0) d.push("Préparation du support");
    if (ligne.option > 0) d.push("Dépose de l’ancien revêtement");
  }

  if (ligne.type === "cuisine") {
    if (ligne.q1 > 0) d.push("Pose des éléments de cuisine");
    if (ligne.q2 > 0) d.push("Pose du plan de travail");
    if (ligne.r1 > 0) d.push("Découpes techniques prévues");
    if (ligne.r2 > 0) d.push("Mise en place électroménager");
    if (ligne.option > 0) d.push("Raccordements simples");
  }

  if (ligne.type === "wc") {
    if (ligne.q1 > 0) d.push("Intervention sur WC");
    if (ligne.q2 > 0) d.push("Reprise du support de fixation");
    if (ligne.r1 > 0) d.push("Raccordements accessibles");
    if (ligne.r2 > 0) d.push("Joint silicone");
    if (ligne.option > 0) d.push("Dépose ancien équipement");
  }

  if (ligne.type === "vmc") {
    if (ligne.q1 > 0) d.push("Pose ou remplacement du groupe VMC");
    if (ligne.q2 > 0) d.push("Pose des bouches prévues");
    if (ligne.r1 > 0) d.push("Passage ou raccordement des gaines");
    if (ligne.r2 > 0) d.push("Raccordement électrique simple");
    if (ligne.option > 0) d.push("Mise en service et test");
  }

  if (ligne.type === "placo") {
    if (ligne.q1 > 0) d.push("Pose ou reprise placo");
    if (ligne.q2 > 0) d.push("Bandes et joints");
    if (ligne.r1 > 0) d.push("Isolation prévue");
    if (ligne.r2 > 0) d.push("Découpes et ajustements");
    if (ligne.option > 0) d.push("Dépose partielle");
  }

  if (ligne.type === "gouttiere") {
    if (ligne.q1 > 0) d.push("Pose de gouttière");
    if (ligne.q2 > 0) d.push("Pose de descente");
    if (ligne.r1 > 0) d.push("Raccords et coudes");
    if (ligne.r2 > 0) d.push("Dépose ancienne installation");
    if (ligne.option > 0) d.push("Accès et travail en hauteur");
  }

  if (d.length > 0) return completerAvecFourniture(d);

  return completerAvecFourniture([
    "Réalisation de la prestation prévue au devis",
    "Ajustements simples",
    "Finitions standards",
    "Nettoyage de fin d’intervention",
  ]);
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
const ID_INTERVENTION_GLOBALE = "BRI-REMISE-ETAT-LOCAUX-MOBILIER";

function prixInterventionGlobale(ligne: LigneTravaux, modeClient: string) {
  const heures = Math.max(0, Number(ligne.heuresUnite) || 0);
  const coefficient = Math.max(1, Number(ligne.coefficientPenibilite) || 1);
  const tarifJour = modeClient === "jeremie" ? 190 : 220;
  return Math.round(heures * (tarifJour / 7) * coefficient * 100) / 100;
}

function montantLigne(ligne: LigneTravaux, modeClient: string) {
  if (ligne.offert) {
    return 0;
  }

  const montantFourniture = ligne.fournitureIncluse
    ? Math.max(0, Number(ligne.prixFournitureInclus) || 0)
    : 0;

  if (ligne.tarifId === ID_INTERVENTION_GLOBALE) {
    const prix = ligne.prixManuel
      ? Math.max(0, Number(ligne.prixUnitaire) || 0)
      : prixInterventionGlobale(ligne, modeClient);
    return Math.round((prix + montantFourniture) * 100) / 100;
  }

  let montantPrestation = 0;

  if (ligne.prixUnitaire) {
    montantPrestation = ligne.prixUnitaire * (ligne.q1 || 1);
  } else {
    montantPrestation = prixLigne(ligne, modeClient);
  }

  return (
    Math.round((montantPrestation + montantFourniture) * 100) / 100
  );
}
// Ventilation interne des montants facturés ; les prix des lignes et du PDF restent inchangés.
function totalFournituresIncluses(lignes: LigneTravaux[], modeClient: string): number {
  const centimes = lignes.reduce((somme, ligne) => {
    if (ligne.offert || !ligne.fournitureIncluse) return somme;
    const montant = Math.max(0, Number(ligne.prixFournitureInclus) || 0);
    const facture = Math.max(0, montantLigne(ligne, modeClient));
    return somme + Math.round(Math.min(montant, facture) * 100);
  }, 0);
  return centimes / 100;
}

// ================= PLANNING DES CHANTIERS =================
type PlanningEdition = {
  client?: string; prestation?: string; heures?: number; montant?: number;
  acompte?: number; dateAcompte?: string; numero?: string; valide?: boolean;
  commentaire?: string; pasAvant?: string; fixe?: string; termine?: boolean;
};
type PlanningLibre = PlanningEdition & { id: string };
type PlanningDonnees = {
  editions: Record<string, PlanningEdition>; libres: PlanningLibre[]; ordre: string[];
  debut: string; heuresJour: number; heuresMois: number; indisponibles: string[];
};
type PlanningLigne = Required<Pick<PlanningEdition, "client" | "prestation" | "heures" | "montant" | "acompte" | "dateAcompte" | "numero" | "valide" | "commentaire" | "pasAvant" | "fixe" | "termine">> & {
  id: string; manuel: boolean; dossierId?: number; encaisse: number;
};
type PlanningCreneau = { date: string; heures: number; id: string };
const planningISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const planningDate = (date: string) => new Date(`${date}T12:00:00`);
const planningDateValide = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(planningDate(v).getTime()) && planningISO(planningDate(v)) === v;
const planningNombre = (v: unknown, defaut = 0) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : defaut;
function normaliserPlanning(v: any): PlanningDonnees {
  const nettoyer = (e: any): PlanningEdition => {
    const r: PlanningEdition = {};
    if (!e || typeof e !== "object") return r;
    for (const k of ["client","prestation","numero","commentaire"] as const) if (typeof e[k] === "string") r[k] = e[k];
    for (const k of ["heures","montant","acompte"] as const) if (typeof e[k] === "number" && Number.isFinite(e[k])) r[k] = planningNombre(e[k]);
    for (const k of ["valide","termine"] as const) if (typeof e[k] === "boolean") r[k] = e[k];
    for (const k of ["dateAcompte","pasAvant","fixe"] as const) if (e[k] === "" || planningDateValide(e[k])) r[k] = e[k];
    return r;
  };
  return {
    editions: Object.fromEntries(Object.entries(v?.editions || {}).filter(([k]) => /^d-\d+$/.test(k)).map(([k,e]) => [k,nettoyer(e)])),
    libres: Array.isArray(v?.libres) ? v.libres.filter((e: any) => typeof e?.id === "string" && e.id.startsWith("m-")).map((e: any) => ({...nettoyer(e), id:e.id})) : [],
    ordre: Array.isArray(v?.ordre) ? Array.from(new Set<string>(v.ordre.filter((s: unknown) => typeof s === "string"))) : [],
    debut: planningDateValide(v?.debut) ? v.debut : planningISO(new Date()),
    heuresJour: Math.min(12,Math.max(0.5,planningNombre(v?.heuresJour,7))),
    heuresMois: Math.min(300,Math.max(1,planningNombre(v?.heuresMois,105))),
    indisponibles: Array.isArray(v?.indisponibles) ? Array.from(new Set<string>(v.indisponibles.filter(planningDateValide))) : [],
  };
}
function construireLignesPlanning(historique: Dossier[], p: PlanningDonnees): PlanningLigne[] {
  const resultat: PlanningLigne[] = [];
  const groupes = new Map<string,Dossier[]>();
  for (const d of historique) {
    if (!d.numeroDevis || ["rdv","rappel"].includes(d.typeEvenement || "") || ["rdv","rappel","estimation_rapide"].includes(d.statutDevis)) continue;
    const k = String(d.devisOrigineId ?? d.id);
    groupes.set(k,[...(groupes.get(k) || []), d]);
  }
  for (const [racine, groupe] of groupes) {
    const origine = historique.find(d => String(d.id) === racine) || groupe[0];
    const courant = groupe.find(d => d.devisOrigineId !== undefined) || origine;
    if (origine.statutDevis === "refuse") continue;
    const id = `d-${racine}`, e = p.editions[id] || {};
    const acompte = Math.max(planningNombre(origine.montantAcompteEncaisse),planningNombre(courant.montantAcompteEncaisse));
    resultat.push({
      id, manuel:false, dossierId:origine.id,
      client:e.client ?? nomClientHistorique(origine), prestation:e.prestation ?? "",
      heures:e.heures ?? (courant.lignesTravaux || []).reduce((s,l) => s + planningNombre(l.heuresUnite) * (l.q1 || 1),0),
      montant:e.montant ?? origine.total ?? 0, acompte:e.acompte ?? acompte,
      dateAcompte:e.dateAcompte ?? origine.dateAcompte ?? courant.dateAcompte ?? "",
      numero:e.numero ?? origine.numeroDevis,
      valide:e.valide ?? (acompte > 0 || origine.statutDevis === "accepte" || courant.facturePayee),
      commentaire:e.commentaire ?? "", pasAvant:e.pasAvant ?? "", fixe:e.fixe ?? "",
      termine:e.termine ?? (courant.statutChantier === "termine" || Boolean(courant.facturePayee && courant.numeroFacture)),
      encaisse:Math.max(planningNombre(courant.montantEncaisse),planningNombre(origine.montantEncaisse)),
    });
  }
  for (const e of p.libres) resultat.push({id:e.id,manuel:true,client:e.client === "Nouveau client" ? "" : e.client ?? "",prestation:e.prestation ?? "",heures:e.heures ?? 7,montant:e.montant ?? 0,acompte:e.acompte ?? 0,dateAcompte:e.dateAcompte ?? "",numero:e.numero ?? "",valide:e.valide ?? (planningNombre(e.acompte)>0),commentaire:e.commentaire ?? "",pasAvant:e.pasAvant ?? "",fixe:e.fixe ?? "",termine:e.termine ?? false,encaisse:e.acompte ?? 0});
  const rang = new Map(p.ordre.map((id,i) => [id,i]));
  return resultat.sort((a,b) => (rang.get(a.id) ?? 1e9) - (rang.get(b.id) ?? 1e9) || (a.dossierId ?? 0) - (b.dossierId ?? 0));
}
function calculerPlanning(lignes: PlanningLigne[], p: PlanningDonnees, aujourdhui = planningISO(new Date())) {
  const creneaux: PlanningCreneau[] = [], alertes: string[] = [];
  const jourUtilise = new Map<string,number>(), moisUtilise = new Map<string,number>();
  const indisponibles = new Set(p.indisponibles);
  const debut = p.debut < aujourdhui ? aujourdhui : p.debut;
  const limite = planningDate(debut); limite.setFullYear(limite.getFullYear()+10);
  const dernierJour = planningISO(limite);
  const ouvrable = (date: string) => { const j = planningDate(date).getDay(); return j >= 1 && j <= 4 && !indisponibles.has(date); };
  const reserver = (l: PlanningLigne, date: string, heures: number) => {
    creneaux.push({id:l.id,date,heures});
    jourUtilise.set(date,(jourUtilise.get(date)||0)+heures);
    const m = date.slice(0,7); moisUtilise.set(m,(moisUtilise.get(m)||0)+heures);
  };
  const actives = lignes.filter(l => l.valide && !l.termine);
  // Les dates fixes sont réservées avant de placer les chantiers flexibles.
  for (const l of actives.filter(l => l.fixe)) {
    if (!l.heures) { alertes.push(`${l.client} : renseigner les heures prévues.`); continue; }
    if (l.fixe < debut) alertes.push(`${l.client} : date fixe antérieure au début du planning.`);
    if (!ouvrable(l.fixe)) alertes.push(`${l.client} : date fixe sur un jour non travaillé.`);
    if (l.pasAvant && l.fixe < l.pasAvant) alertes.push(`${l.client} : date fixe avant la disponibilité indiquée.`);
    let reste = l.heures, d = planningDate(l.fixe), n = 0;
    while (reste > 0.001 && n++ < 3660) {
      const date = planningISO(d);
      if (n === 1 || ouvrable(date)) {
        const h = Math.min(p.heuresJour,reste); reserver(l,date,h); reste -= h;
      }
      d.setDate(d.getDate()+1);
    }
    if (reste > 0.001) alertes.push(`${l.client} : durée supérieure à l'horizon de dix ans.`);
  }
  // La file garde son ordre, avec partage possible d'une journée entre deux petits chantiers.
  let curseur = debut;
  for (const l of actives.filter(l => !l.fixe)) {
    if (!l.heures) { alertes.push(`${l.client} : renseigner les heures prévues.`); continue; }
    let reste = l.heures, d = planningDate(l.pasAvant && l.pasAvant > curseur ? l.pasAvant : curseur);
    while (reste > 0.001 && planningISO(d) <= dernierJour) {
      const date = planningISO(d), mois = date.slice(0,7);
      const place = Math.min(p.heuresJour-(jourUtilise.get(date)||0),p.heuresMois-(moisUtilise.get(mois)||0));
      if (ouvrable(date) && place > 0.001) {
        const h = Math.min(place,reste); reserver(l,date,h); reste -= h; curseur = date;
      }
      if (reste > 0.001) d.setDate(d.getDate()+1);
    }
    if (reste > 0.001) alertes.push(`${l.client} : placement incomplet, horizon de dix ans atteint.`);
  }
  for (const [date,h] of jourUtilise) if (h > p.heuresJour+0.001) alertes.push(`${date} : chevauchement des dates fixes (${h.toFixed(1)} h).`);
  for (const [mois,h] of moisUtilise) if (h > p.heuresMois+0.001) alertes.push(`${mois} : dates fixes au-delà de la capacité mensuelle (${h.toFixed(1)} h).`);
  const dates = creneaux.map(c => c.date).filter(d => d >= debut).sort();
  return {creneaux,alertes,fin:dates.at(-1) || "",jourUtilise,moisUtilise};
}

// Même libellé dans l'historique et le planning, sans tronquer le bénéficiaire.
function nomClientHistorique(d: Dossier): string {
  if (d.modeClient === "jeremie") return `${d.client || "SAS Meurisse Couverture"}${d.clientFinalNom ? " / " + d.clientFinalNom : ""}`;
  if (d.modeClient === "agence") {
    const beneficiaire = d.locataire || d.proprietaire || d.clientFinalNom;
    return `${d.agence || d.client || "Agence immobilière"}${beneficiaire ? " / " + beneficiaire : ""}`;
  }
  return d.client || "Client non renseigné";
}

function PlanningTexteAuto({value,onChange,ariaLabel,placeholder,className}: {
  value:string; onChange:(v:string)=>void; ariaLabel:string; placeholder?:string; className?:string;
}) {
  const ref = useRef<HTMLTextAreaElement|null>(null);
  useEffect(()=>{
    const champ=ref.current;
    if(!champ) return;
    const ajuster=()=>{champ.style.height="0px";champ.style.height=`${Math.max(28,champ.scrollHeight)}px`;};
    ajuster();
    if(typeof ResizeObserver==="undefined") return;
    let largeur=champ.clientWidth;
    const observer=new ResizeObserver(()=>{if(champ.clientWidth!==largeur){largeur=champ.clientWidth;ajuster();}});
    observer.observe(champ);return()=>observer.disconnect();
  },[value]);
  return <textarea ref={ref} aria-label={ariaLabel} placeholder={placeholder} rows={1} value={value}
    className={className} style={{resize:"none",overflow:"hidden",minHeight:28,lineHeight:"18px",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}
    onChange={e=>onChange(e.target.value)}/>;
}

function PlanningNombre({valeur,onChange,ariaLabel,className}: {
  valeur:number; onChange:(n:number)=>void; ariaLabel:string; className?:string;
}) {
  const [actif,setActif]=useState(false);
  const [saisie,setSaisie]=useState("");
  return <input aria-label={ariaLabel} type="text" inputMode="decimal" autoComplete="off" className={className}
    value={actif?saisie:String(valeur).replace(".",",")}
    onFocus={e=>{setActif(true);setSaisie(valeur===0?"":String(valeur).replace(".",","));if(valeur!==0)e.currentTarget.select();}}
    onChange={e=>{const texte=e.target.value;if(!/^\d*(?:[.,]\d*)?$/.test(texte))return;setSaisie(texte);const n=Number(texte.replace(",","."));if(Number.isFinite(n))onChange(Math.max(0,n));}}
    onBlur={()=>setActif(false)}/>;
}

type TriPlanning = "ordre" | "client" | "prestation" | "numero" | "heures" | "acompte" | "dateAcompte" | "montant" | "pasAvant" | "fixe" | "prevision";
const optionsTriPlanning = [
  ["ordre","Ordre du planning"],["client","Client (A–Z)"],["prestation","Prestation"],["numero","N° devis"],
  ["heures","Heures restantes"],["montant","Total du devis"],["acompte","Acompte reçu"],
  ["dateAcompte","Date de l’acompte"],["pasAvant","Pas avant"],["fixe","Date fixe"],["prevision","Début prévu"],
] as const;

function filtrerTrierPlanning(lignes:PlanningLigne[],creneaux:PlanningCreneau[],options:{
  archives:boolean; recherche:string; statut:string; origine:string; acompte:string; tri:TriPlanning; inverse:boolean;
}):PlanningLigne[] {
  const texte=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");
  const q=texte(options.recherche.trim());
  const resultat=lignes.filter(l=>{
    if(options.statut==="termine") {if(!l.termine)return false;}
    else {
      if(!options.archives&&l.termine)return false;
      if(options.statut==="valide"&&(!l.valide||l.termine))return false;
      if(options.statut==="en_cours"&&(l.valide||l.termine))return false;
    }
    if(options.origine==="manuel"&&!l.manuel||options.origine==="appli"&&l.manuel)return false;
    if(options.acompte==="recu"&&l.acompte<=0||options.acompte==="aucun"&&l.acompte>0)return false;
    return !q||texte(`${l.client} ${l.prestation} ${l.numero}`).includes(q);
  });
  if(options.tri==="ordre")return resultat;
  const debuts=new Map<string,string>();
  for(const c of creneaux)if(!debuts.has(c.id)||c.date<debuts.get(c.id)!)debuts.set(c.id,c.date);
  const cle=(l:PlanningLigne):string|number=>options.tri==="prevision"?debuts.get(l.id)||"":l[options.tri as Exclude<TriPlanning,"ordre"|"prevision">];
  return resultat.sort((a,b)=>{
    const av=cle(a),bv=cle(b);
    if(av===""||bv==="")return av===bv?0:av===""?1:-1;
    const cmp=typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv),"fr",{numeric:true,sensitivity:"base"});
    return options.inverse?-cmp:cmp;
  });
}

function PlanningChantiers({historique,donnees,onChange,ouvrir}: {
  historique:Dossier[]; donnees:PlanningDonnees; onChange:(p:PlanningDonnees)=>void; ouvrir:(d:Dossier)=>void;
}) {
  const [ouvert,setOuvert] = useState(false);
  const [vue,setVue] = useState<"tableau"|"annee"|"mois">("tableau");
  const [annee,setAnnee] = useState(new Date().getFullYear());
  const [mois,setMois] = useState(new Date().getMonth());
  const [blocage,setBlocage] = useState("");
  const [recherche,setRecherche] = useState("");
  const [archives,setArchives] = useState(false);
  const [filtreStatut,setFiltreStatut] = useState("tous");
  const [filtreOrigine,setFiltreOrigine] = useState("tous");
  const [filtreAcompte,setFiltreAcompte] = useState("tous");
  const [triPlanning,setTriPlanning] = useState<TriPlanning>("ordre");
  const [triInverse,setTriInverse] = useState(false);
  const [selection,setSelection] = useState("");
  const [glisse,setGlisse] = useState<string|null>(null);
  const [precedent,setPrecedent] = useState<PlanningDonnees|null>(null);
  const lignes = useMemo(()=>construireLignesPlanning(historique,donnees),[historique,donnees]);
  const calcul = useMemo(()=>calculerPlanning(lignes,donnees),[lignes,donnees]);
  const modifier = (p:PlanningDonnees) => {setPrecedent(donnees);onChange(p);};
  const editer = (id:string,patch:PlanningEdition) => modifier(id.startsWith("m-")
    ? {...donnees,libres:donnees.libres.map(l=>l.id===id?{...l,...patch}:l)}
    : {...donnees,editions:{...donnees.editions,[id]:{...donnees.editions[id],...patch}}});
  const deplacer = (id:string,cible:string) => {
    if(id===cible) return;
    const ordre=lignes.map(l=>l.id), a=ordre.indexOf(id), b=ordre.indexOf(cible);
    if(a<0||b<0) return;
    ordre.splice(a,1);ordre.splice(b,0,id);modifier({...donnees,ordre});
  };
  const euros=(n:number)=>`${formatMontant(n)} €`;
  const heures=(n:number)=>n.toLocaleString("fr-FR",{maximumFractionDigits:1});
  const dateFR=(d:string)=>d?planningDate(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
  const periode=(l:PlanningLigne)=>{
    const dates=calcul.creneaux.filter(c=>c.id===l.id).map(c=>c.date).sort();
    return dates.length ? `${dateFR(dates[0])}${dates.at(-1)!==dates[0]?` → ${dateFR(dates.at(-1)!)}`:""}${l.fixe?" · fixe":" · estimé"}` : l.termine?"Terminé":l.valide?"À renseigner":"En attente d’accord";
  };
  const aFaire=lignes.filter(l=>l.valide&&!l.termine);
  const totalH=aFaire.reduce((s,l)=>s+l.heures,0);
  const total=aFaire.reduce((s,l)=>s+l.montant,0);
  const dejaRecu=aFaire.reduce((s,l)=>s+Math.max(l.encaisse,l.acompte),0);
  const solde=aFaire.reduce((s,l)=>s+Math.max(0,l.montant-Math.max(l.encaisse,l.acompte)),0);
  const filtrees=useMemo(()=>filtrerTrierPlanning(lignes,calcul.creneaux,{
    archives,recherche,statut:filtreStatut,origine:filtreOrigine,acompte:filtreAcompte,tri:triPlanning,inverse:triInverse,
  }),[lignes,calcul.creneaux,archives,recherche,filtreStatut,filtreOrigine,filtreAcompte,triPlanning,triInverse]);
  const calendrierJour = (date:string) => calcul.creneaux.filter(c=>c.date===date);
  const couleur=(l:PlanningLigne)=>l.manuel?"#fff0da":l.fixe?"#ede9fe":"#dceee9";
  const resumeDate = (date:string) => calendrierJour(date).map(c=>{
    const l=lignes.find(l=>l.id===c.id)!;return `${l.client} — ${l.prestation || l.numero} (${heures(c.heures)} h)`;
  }).join("\n");
  const moisCalendrier=(m:number,compact=false)=>{
    const nb=new Date(annee,m+1,0).getDate(), decalage=(new Date(annee,m,1).getDay()+6)%7;
    return <div key={m} className="planning-month rounded-xl border bg-white p-3">
      <button type="button" className="mb-2 font-bold capitalize" onClick={()=>{setMois(m);setVue("mois");}}>{new Date(annee,m,1).toLocaleDateString("fr-FR",{month:"long"})} {annee}</button>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500">{["L","M","M","J","V","S","D"].map((j,i)=><span key={i}>{j}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">{Array.from({length:decalage},(_,i)=><span key={`vide-${i}`}/>)}
      {Array.from({length:nb},(_,i)=>{
        const date=`${annee}-${String(m+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
        const cs=calendrierJour(date), ferme=planningDate(date).getDay()===5||[0,6].includes(planningDate(date).getDay())||donnees.indisponibles.includes(date);
        const manuel=cs.some(c=>lignes.find(l=>l.id===c.id)?.manuel), fixe=cs.some(c=>lignes.find(l=>l.id===c.id)?.fixe);
        const surcharge=(calcul.jourUtilise.get(date)||0)>donnees.heuresJour+.001;
        return <button type="button" key={date} title={resumeDate(date)|| (ferme?"Indisponible / hors chantier":"Disponible")}
          onClick={()=>setSelection(date)} style={{background:surcharge?"#fee2e2":cs.length?(manuel?"#fff0da":fixe?"#ede9fe":"#dceee9"):ferme?"#f1f5f9":"white",outline:selection===date?"2px solid #0f766e":undefined}}
          className={`rounded border p-1 text-left ${compact?"min-h-7 text-[10px]":"min-h-24 text-xs"}`}>
          <span className="font-semibold">{i+1}</span>
          {!compact&&cs.map((c,k)=>{const l=lignes.find(l=>l.id===c.id)!;return <div key={k} className="mt-1 break-words rounded px-1" style={{background:couleur(l)}}>{l.client}<br/>{heures(c.heures)} h {l.fixe?"· fixe":""}</div>;})}
          {compact&&cs.length>0&&<span className="block text-[8px]">{heures(cs.reduce((s,c)=>s+c.heures,0))}h</span>}
        </button>;
      })}</div>
      <p className="mt-2 text-xs text-slate-500">{heures(calcul.moisUtilise.get(`${annee}-${String(m+1).padStart(2,"0")}`)||0)} / {donnees.heuresMois} h</p>
    </div>;
  };
  const imprimer=()=>{
    const textePDF=(t:string)=>t.replace(/[\u202f\u00a0]/g," ").replace(/→/g,"au");
    const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const titre=()=>{doc.setFontSize(16);doc.setTextColor(20,70,65);doc.text("Adrien et ses mains — Planning des chantiers",10,13);doc.setFontSize(9);doc.setTextColor(60);doc.text(`Édité le ${dateFR(planningISO(new Date()))} · ${donnees.heuresJour} h/j · lundi à jeudi · ${donnees.heuresMois} h/mois`,10,20);};
    titre();doc.setFontSize(10);doc.text(`${aFaire.length} chantiers validés · ${heures(totalH)} h · ${euros(total)} · Reste à encaisser : ${euros(solde)}`,10,28);
    doc.text(`Fin prévisionnelle : ${dateFR(calcul.fin)}. Les dates estimées peuvent évoluer.`,10,34);
    const largeurs=[35,36,12,17,26,23,27,22,31,48];
    const entetes=["Client","Prestation","Heures","Statut","Devis","Total","Acompte reçu","Date acompte","Période prévue","Commentaire"];
    let y=41;
    const entete=()=>{let x=10;doc.setFillColor(25,80,75);doc.rect(10,y,277,8,"F");doc.setTextColor(255);doc.setFontSize(8);entetes.forEach((t,i)=>{doc.text(t,x+1,y+5);x+=largeurs[i];});doc.setTextColor(30);y+=8;};
    entete();
    for(const l of filtrees){
      const valeurs=[l.client,l.prestation,heures(l.heures),l.termine?"Terminé":l.valide?"Validé":"En cours",l.numero,euros(l.montant),euros(l.acompte),dateFR(l.dateAcompte),periode(l),l.commentaire];
      const textes=valeurs.map((v,i)=>doc.splitTextToSize(textePDF(v||"—"),largeurs[i]-2));
      const nbLignes=Math.max(...textes.map(t=>t.length));
      let ligneTexte=0;
      while(ligneTexte<nbLignes){
        if(y+9>197){doc.addPage();titre();y=27;entete();}
        const capacite=Math.max(1,Math.floor((197-y-3)/3.4));
        const prises=Math.min(capacite,nbLignes-ligneTexte),hauteur=Math.max(9,prises*3.4+3);
        doc.setFillColor(l.manuel?255:245,l.manuel?240:249,l.manuel?218:248);doc.rect(10,y,277,hauteur,"F");
        let x=10;doc.setFontSize(8);textes.forEach((t,i)=>{const part=t.slice(ligneTexte,ligneTexte+prises);if(part.length)doc.text(part,x+1,y+4);x+=largeurs[i];});y+=hauteur;ligneTexte+=prises;
      }
    }
    if(vue==="annee"){
      doc.addPage();titre();doc.setFontSize(12);doc.text(`Calendrier annuel ${annee}`,10,29);
      doc.setFontSize(8);doc.text("Vert : prévisionnel. Orange : hors application. Violet : date fixe. Détail des clients dans le tableau.",10,35);
      for(let m=0;m<12;m++){
        const x0=10+(m%4)*70,y0=41+Math.floor(m/4)*51,w=9.3,h=5.5;
        doc.setTextColor(25,80,75);doc.setFontSize(9);doc.text(new Date(annee,m,1).toLocaleDateString("fr-FR",{month:"long"}),x0,y0);
        doc.setFontSize(6);doc.setTextColor(70);["L","M","M","J","V","S","D"].forEach((j,i)=>doc.text(j,x0+i*w+2,y0+5));
        const decal=(new Date(annee,m,1).getDay()+6)%7,nb=new Date(annee,m+1,0).getDate();
        for(let n=1;n<=nb;n++){
          const k=decal+n-1,x=x0+(k%7)*w,yc=y0+7+Math.floor(k/7)*h,date=`${annee}-${String(m+1).padStart(2,"0")}-${String(n).padStart(2,"0")}`;
          const cs=calendrierJour(date),ls=cs.map(c=>lignes.find(l=>l.id===c.id)!);
          const ferme=[0,5,6].includes(planningDate(date).getDay())||donnees.indisponibles.includes(date);
          if(ls.some(l=>l.manuel))doc.setFillColor(255,240,218);else if(ls.some(l=>l.fixe))doc.setFillColor(237,233,254);else if(cs.length)doc.setFillColor(220,238,233);else doc.setFillColor(ferme?238:255,ferme?238:255,ferme?238:255);
          doc.rect(x,yc,w-.5,h-.5,"F");doc.setTextColor(35);doc.text(String(n),x+1,yc+3.5);
        }
      }
    }
    if(vue==="mois"){
      const lesMois=[mois];
      for(const m of lesMois){doc.addPage();titre();doc.setFontSize(14);doc.text(new Date(annee,m,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),10,31);
        const depart=(new Date(annee,m,1).getDay()+6)%7, nb=new Date(annee,m+1,0).getDate();
        const rangs=Math.ceil((depart+nb)/7), h=150/rangs,w=277/7;
        doc.setFontSize(9);["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"].forEach((j,i)=>doc.text(j,11+i*w,39));
        for(let n=1;n<=nb;n++){const k=depart+n-1,x=10+(k%7)*w,yc=43+Math.floor(k/7)*h,date=`${annee}-${String(m+1).padStart(2,"0")}-${String(n).padStart(2,"0")}`;
          doc.setDrawColor(210);doc.rect(x,yc,w,h);doc.setFontSize(9);doc.text(String(n),x+1,yc+4);
          const texte=resumeDate(date);doc.setFontSize(7);const ls=doc.splitTextToSize(texte,w-3);doc.text(ls.slice(0,Math.floor((h-7)/3)),x+1,yc+8);
        }
      }
    }
    if(calcul.alertes.length){doc.addPage();titre();doc.setFontSize(10);let ay=30;for(const a of calcul.alertes){const t=doc.splitTextToSize(a,270);if(ay+t.length*5>195){doc.addPage();titre();ay=30;}doc.text(t,10,ay);ay+=t.length*5+3;}}
    doc.save(`Planning-chantiers-${planningISO(new Date())}.pdf`);
  };
  const input="w-full min-w-0 rounded border border-slate-200 bg-white/80 px-1.5 py-1 text-xs text-slate-900";
  const bouton="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-35";
  return <section className="planning-chantiers my-3 rounded-2xl border border-teal-200 bg-slate-50 p-3">
    <button type="button" onClick={()=>setOuvert(!ouvert)} className="flex w-full items-center justify-between text-left"><span className="text-lg font-bold text-teal-950">Planning des chantiers <span className="ml-2 text-xs font-normal">{aFaire.length} validés · {heures(totalH)} h</span></span><span>{ouvert?"Masquer ▲":"Afficher ▼"}</span></button>
    {ouvert&&<div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{[
        ["Travaux validés à réaliser",euros(total)],["Déjà encaissé",euros(dejaRecu)],["Reste à encaisser",euros(solde)],["Charge restante",`${heures(totalH)} h · ${heures(totalH/donnees.heuresJour)} j`],["Fin prévisionnelle",dateFR(calcul.fin)]
      ].map(([t,v])=><div key={t} className="rounded-xl border bg-white p-3"><p className="text-[11px] text-slate-500">{t}</p><p className="mt-1 text-base font-bold text-teal-950">{v}</p></div>)}</div>
      <p className="text-xs text-slate-600">Charge : environ {heures(totalH/donnees.heuresMois)} mois de capacité. Les encaissements restent prévisionnels et dépendent des règlements clients. Orange : hors application. Violet : date fixe. Vert : estimé.</p>
      <details className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">Disponibilités et réglages</summary><div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="text-xs">Début des prévisions<input aria-label="Début des prévisions" type="date" value={donnees.debut} className={input} onChange={e=>{if(planningDateValide(e.target.value))modifier({...donnees,debut:e.target.value});}}/></label>
        <label className="text-xs">Heures par jour<PlanningNombre ariaLabel="Heures par jour" valeur={donnees.heuresJour} className={input} onChange={v=>modifier({...donnees,heuresJour:Math.min(12,Math.max(.5,v||7))})}/></label>
        <label className="text-xs">Capacité mensuelle (h)<PlanningNombre ariaLabel="Capacité mensuelle" valeur={donnees.heuresMois} className={input} onChange={v=>modifier({...donnees,heuresMois:Math.min(300,Math.max(1,v||105))})}/></label>
        <label className="text-xs">Bloquer une journée<input type="date" value={blocage} className={input} onChange={e=>setBlocage(e.target.value)}/><button type="button" disabled={!blocage} className={bouton} onClick={()=>{modifier({...donnees,indisponibles:Array.from(new Set([...donnees.indisponibles,blocage]))});setBlocage("");}}>Ajouter l’absence</button></label>
      </div><p className="mt-2 text-xs text-slate-500">Chantiers du lundi au jeudi. Vendredi réservé aux devis. Week-ends exclus. Les prévisions flexibles partent au plus tôt d’aujourd’hui. Les rendez-vous de l’ancien calendrier ne bloquent pas automatiquement une journée : ajoute ici tes indisponibilités.</p>
      <div className="mt-2 flex flex-wrap gap-2">{[...donnees.indisponibles].sort().map(d=><button key={d} className={bouton} onClick={()=>modifier({...donnees,indisponibles:donnees.indisponibles.filter(x=>x!==d)})}>{dateFR(d)} · Libérer</button>)}</div></details>
      <div className="flex flex-wrap items-center gap-2">
        {(["tableau","annee","mois"] as const).map(v=><button key={v} className={`${bouton} ${vue===v?"!bg-teal-800 !text-white":""}`} onClick={()=>setVue(v)}>{v==="tableau"?"Tableau":v==="annee"?"Calendrier annuel":"Vue mensuelle"}</button>)}
        <button className={bouton} onClick={()=>{const id=`m-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;modifier({...donnees,libres:[...donnees.libres,{id,client:"",prestation:"",heures:7,valide:false}],ordre:[...lignes.map(l=>l.id),id]});setVue("tableau");}}>+ Ligne hors application</button>
        <button className={bouton} onClick={imprimer}>PDF / Imprimer</button>
        <button className={bouton} disabled={!precedent} onClick={()=>{if(precedent){onChange(precedent);setPrecedent(null);}}}>Annuler</button>
        <label className="text-xs"><input type="checkbox" checked={archives} onChange={e=>setArchives(e.target.checked)}/> Afficher les terminés</label>
      </div>
      {calcul.alertes.length>0&&<div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">{calcul.alertes.map((a,i)=><p key={i}>{a}</p>)}</div>}
      {vue==="tableau"?<>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[230px] flex-1 text-[11px] font-semibold">Recherche<input aria-label="Rechercher dans le planning" placeholder="Client, prestation ou devis…" value={recherche} onChange={e=>setRecherche(e.target.value)} className={input}/></label>
          <label className="text-[11px] font-semibold">Statut<select aria-label="Filtrer par statut" className={input} value={filtreStatut} onChange={e=>setFiltreStatut(e.target.value)}><option value="tous">Tous les statuts</option><option value="valide">Validés</option><option value="en_cours">En cours</option><option value="termine">Terminés</option></select></label>
          <label className="text-[11px] font-semibold">Origine<select aria-label="Filtrer par origine" className={input} value={filtreOrigine} onChange={e=>setFiltreOrigine(e.target.value)}><option value="tous">Toutes les lignes</option><option value="appli">Devis de l’application</option><option value="manuel">Hors application</option></select></label>
          <label className="text-[11px] font-semibold">Acompte<select aria-label="Filtrer par acompte" className={input} value={filtreAcompte} onChange={e=>setFiltreAcompte(e.target.value)}><option value="tous">Avec ou sans acompte</option><option value="recu">Acompte reçu</option><option value="aucun">Sans acompte</option></select></label>
          <label className="text-[11px] font-semibold">Trier par<select aria-label="Trier le planning" className={input} value={triPlanning} onChange={e=>{setTriPlanning(e.target.value as TriPlanning);if(e.target.value==="ordre")setTriInverse(false);}}>{optionsTriPlanning.map(([k,t])=><option key={k} value={k}>{t}</option>)}</select></label>
          <button type="button" className={bouton} disabled={triPlanning==="ordre"} onClick={()=>setTriInverse(!triInverse)}>{triInverse?"Décroissant ↓":"Croissant ↑"}</button>
          <button type="button" className={bouton} onClick={()=>{setRecherche("");setFiltreStatut("tous");setFiltreOrigine("tous");setFiltreAcompte("tous");setTriPlanning("ordre");setTriInverse(false);setArchives(false);}}>Réinitialiser les filtres</button>
        </div>
        <p className="text-xs text-slate-500">{filtrees.length} ligne{filtrees.length>1?"s":""} affichée{filtrees.length>1?"s":""}. {triPlanning==="ordre"?"Déplace les chantiers avec ↥ / ↧ ou la poignée ⋮⋮.":"Le tri change uniquement l’affichage. Choisis « Ordre du planning » pour déplacer les chantiers."} Les champs restent modifiables. « Auto » rétablit les valeurs du devis.</p>
        <div className="planning-table-wrap overflow-x-auto rounded-xl border bg-white">
          <table className="planning-table w-full table-fixed text-xs" style={{minWidth:1300}}>
            <colgroup>{[58,82,56,56,94,112,98,170,112,112,170,110].map((w,i)=><col key={i} style={{width:w}}/>)}</colgroup>
            <thead><tr>{[
              ["Ordre","ordre"],["Heures restantes","heures"],["En cours",""],["Validé",""],["Acompte reçu","acompte"],["Date acompte","dateAcompte"],["Total devis","montant"],["Commentaire",""],["Pas avant","pasAvant"],["Début fixe","fixe"],["Prévision","prevision"],["Actions",""]
            ].map(([t,k])=><th key={t} className="px-2 py-2 text-left font-semibold" style={{background:"#173e42",color:"#ffffff"}}>{k?<button type="button" style={{color:"#ffffff"}} className="text-left" onClick={()=>{if(k==="ordre"){setTriPlanning("ordre");setTriInverse(false);}else if(triPlanning===k)setTriInverse(!triInverse);else{setTriPlanning(k as TriPlanning);setTriInverse(false);}}}>{t}{triPlanning===k?(triInverse?" ↓":" ↑"):" ↕"}</button>:t}</th>)}</tr></thead>
            {filtrees.map((l,index)=>{
              const rangVisible=filtrees.map(l=>l.id), deplacementPossible=triPlanning==="ordre";
              const fond=l.termine?"#f1f5f9":l.manuel?"#fff1d9":"#f0f7f7";
              return <tbody key={l.id} data-planning-id={l.id} className={glisse===l.id?"opacity-50":""}
                onDragOver={e=>{if(deplacementPossible)e.preventDefault();}} onDrop={e=>{e.preventDefault();if(glisse&&deplacementPossible)deplacer(glisse,l.id);setGlisse(null);}}>
                <tr className="planning-identity" style={{background:fond}}>
                  <td rowSpan={2} className="border-b border-slate-300 px-1 py-2 align-top text-center">
                    <span draggable={deplacementPossible} onDragStart={e=>{setGlisse(l.id);e.dataTransfer.setData("text/plain",l.id);}} onDragEnd={()=>setGlisse(null)} className={deplacementPossible?"cursor-grab":"opacity-40"} title="Déplacer ce chantier">⋮⋮</span>
                    <div className="flex justify-center gap-1"><button type="button" aria-label={`Monter ${l.id}`} disabled={!deplacementPossible||index===0} className="disabled:opacity-25" onClick={()=>deplacer(l.id,rangVisible[index-1])}>↥</button><button type="button" aria-label={`Descendre ${l.id}`} disabled={!deplacementPossible||index===filtrees.length-1} className="disabled:opacity-25" onClick={()=>deplacer(l.id,rangVisible[index+1])}>↧</button></div>
                  </td>
                  <td colSpan={11} className="px-2 pb-0.5 pt-1.5">
                    <div className="grid items-start gap-2" style={{gridTemplateColumns:"minmax(340px,1.2fr) minmax(260px,1fr) 155px"}}>
                      <PlanningTexteAuto ariaLabel={`Client ${l.id}`} placeholder="Nouveau client" value={l.client} onChange={v=>editer(l.id,{client:v})} className={`${input} font-semibold`} />
                      <PlanningTexteAuto ariaLabel={`Prestation ${l.id}`} placeholder="À renseigner" value={l.prestation} onChange={v=>editer(l.id,{prestation:v})} className={input}/>
                      <input aria-label={`Numéro devis ${l.id}`} placeholder="N° devis" value={l.numero} className={input} onChange={e=>editer(l.id,{numero:e.target.value})}/>
                    </div>
                  </td>
                </tr>
                <tr className="planning-values border-b border-slate-300 align-top" style={{background:l.termine?"#f1f5f9":l.manuel?"#fff8ec":"white"}}>
                  <td className="px-1 pb-1.5 pt-0.5"><PlanningNombre ariaLabel={`Heures ${l.id}`} valeur={l.heures} className={input} onChange={v=>editer(l.id,{heures:v})}/></td>
                  <td className="px-1 py-2 text-center"><input aria-label={`En cours ${l.id}`} type="checkbox" checked={!l.valide} onChange={e=>editer(l.id,{valide:!e.target.checked})}/></td>
                  <td className="px-1 py-2 text-center"><input aria-label={`Validé ${l.id}`} type="checkbox" checked={l.valide} onChange={e=>editer(l.id,{valide:e.target.checked})}/></td>
                  <td className="px-1 pb-1.5 pt-0.5"><PlanningNombre ariaLabel={`Acompte ${l.id}`} valeur={l.acompte} className={input} onChange={v=>editer(l.id,{acompte:v})}/></td>
                  <td className="px-1 pb-1.5 pt-0.5"><input aria-label={`Date acompte ${l.id}`} type="date" value={l.dateAcompte} className={input} onChange={e=>editer(l.id,{dateAcompte:e.target.value})}/></td>
                  <td className="px-1 pb-1.5 pt-0.5"><PlanningNombre ariaLabel={`Montant ${l.id}`} valeur={l.montant} className={input} onChange={v=>editer(l.id,{montant:v})}/></td>
                  <td className="px-1 pb-1.5 pt-0.5"><PlanningTexteAuto ariaLabel={`Commentaire ${l.id}`} value={l.commentaire} onChange={v=>editer(l.id,{commentaire:v})} className={input}/></td>
                  <td className="px-1 pb-1.5 pt-0.5"><input aria-label={`Pas avant ${l.id}`} type="date" value={l.pasAvant} className={input} onChange={e=>editer(l.id,{pasAvant:e.target.value})}/></td>
                  <td className="px-1 pb-1.5 pt-0.5"><input aria-label={`Date fixe ${l.id}`} title="Effacer cette date pour déverrouiller le chantier" type="date" value={l.fixe} className={input} onChange={e=>editer(l.id,{fixe:e.target.value})}/></td>
                  <td className="px-2 py-1 text-[11px] font-medium text-teal-900">{periode(l)}</td>
                  <td className="px-1 py-1 text-[11px]"><label className="block whitespace-nowrap"><input aria-label={`Terminé ${l.id}`} type="checkbox" checked={l.termine} onChange={e=>editer(l.id,{termine:e.target.checked})}/> Terminé</label>{l.manuel?<button type="button" className="text-red-700" onClick={()=>{if(window.confirm(`Supprimer la ligne manuelle ${l.client} ?`))modifier({...donnees,libres:donnees.libres.filter(e=>e.id!==l.id),ordre:donnees.ordre.filter(id=>id!==l.id)});}}>Supprimer</button>:<div className="flex gap-2"><button type="button" className="text-teal-800 underline" onClick={()=>{const d=historique.find(d=>d.id===l.dossierId);if(d)ouvrir(d);}}>Ouvrir</button><button type="button" className="underline" title="Rétablir les valeurs du devis en conservant prestation, notes et dates du planning" onClick={()=>{const e=donnees.editions[l.id]||{};modifier({...donnees,editions:{...donnees.editions,[l.id]:{prestation:e.prestation,commentaire:e.commentaire,pasAvant:e.pasAvant,fixe:e.fixe,termine:e.termine}}});}}>Auto</button></div>}</td>
                </tr>
              </tbody>;
            })}
          </table>
          {!filtrees.length&&<p className="p-5 text-sm text-slate-500">Aucun chantier ne correspond aux filtres.</p>}
        </div>

      </>:<><div className="flex items-center gap-3"><button className={bouton} onClick={()=>setAnnee(annee-1)}>←</button><span className="font-bold">{annee}</span><button className={bouton} onClick={()=>setAnnee(annee+1)}>→</button>{vue==="mois"&&<select className={input+" max-w-44"} value={mois} onChange={e=>setMois(Number(e.target.value))}>{Array.from({length:12},(_,m)=><option key={m} value={m}>{new Date(annee,m,1).toLocaleDateString("fr-FR",{month:"long"})}</option>)}</select>}</div>
        <div className={vue==="annee"?"grid gap-3 sm:grid-cols-2 xl:grid-cols-4":""}>{vue==="annee"?Array.from({length:12},(_,m)=>moisCalendrier(m,true)):moisCalendrier(mois)}</div>
        {selection&&<div className="rounded-xl border bg-white p-3"><p className="font-bold">{dateFR(selection)}</p><p className="whitespace-pre-line text-sm">{resumeDate(selection)||"Aucun chantier prévu."}</p></div>}
      </>}
    </div>}
  </section>;
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
  planningModifieRef.current = false;
  setPlanningDonnees(normaliserPlanning(d.planningDonnees));
  setDepenses(d.depenses || []);
  setCorrectionsEncaissementsMensuels(normaliserCorrectionsMensuelles(d.correctionsEncaissementsMensuels));
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
setCoefficientFournitures(b.coefficientFournitures ?? 1.3);
setFournituresClient(b.fournituresClient ?? true);
setDetailsFournitures(b.detailsFournitures || "");
setConditionsGeneralesDevis(
  b.conditionsGeneralesDevis ?? CONDITIONS_GENERALES_DEVIS_DEFAUT
);
setConditionsChantier(b.conditionsChantier || "");
setCommentaireFournitures(b.commentaireFournitures || "");
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

  alert("✅ Sauvegarde restaurée");
}; 
  
const appliquerSauvegardeComplete = (data: any) => {
  if (!data) return;

  setHistorique(data.historique || []);
  planningModifieRef.current = false;
  setPlanningDonnees(normaliserPlanning(data.planningDonnees));
  setDepenses(data.depenses || []);
  setCorrectionsEncaissementsMensuels(normaliserCorrectionsMensuelles(data.correctionsEncaissementsMensuels));
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
    setCoefficientFournitures(b.coefficientFournitures ?? 1.3);
    setFournituresClient(b.fournituresClient ?? true);
    setDetailsFournitures(b.detailsFournitures || "");
    setConditionsGeneralesDevis(
      b.conditionsGeneralesDevis ?? CONDITIONS_GENERALES_DEVIS_DEFAUT
    );
    setConditionsChantier(b.conditionsChantier || "");
    setCommentaireFournitures(b.commentaireFournitures || "");

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

const envoyerDonneesCloud = async (
  data: any,
  afficherConfirmation = true
) => {
  const dateSynchronisation = new Date().toISOString();
  const { error } = await supabase
    .from("dashboard_data")
    .upsert([
      {
        id: "global",
        data,
        updated_at: dateSynchronisation,
      },
    ]);

  if (error) {
    console.error("Erreur cloud :", error);
    if (afficherConfirmation) {
      alert("❌ Erreur envoi cloud");
    }
    return false;
  }

  ecrireStockageLocal(CLE_SAUVEGARDE_V25, JSON.stringify(data));
  ecrireStockageLocal(
    CLE_DERNIERE_SYNCHRO_CLOUD_V26,
    dateSynchronisation
  );
  ecrireStockageLocal(
    CLE_DERNIERE_MODIFICATION_LOCALE_V26,
    dateSynchronisation
  );

  if (afficherConfirmation) {
    alert("✅ Données complètes envoyées au cloud");
  }

  return true;
};

const envoyerCloud = async () => {
  const data = construireSauvegardeComplete();
  await envoyerDonneesCloud(data, true);
};

const recupererCloud = async () => {
  const { data, error } = await supabase
    .from("dashboard_data")
    .select("*")
    .eq("id", "global")
    .single();

  if (error) {
    console.error("Erreur récupération :", error);
    alert("❌ Erreur récupération cloud");
    return;
  }

  if (!data?.data) {
    alert("Aucune donnée cloud trouvée");
    return;
  }

  applicationCloudEnCoursRef.current = true;
  appliquerSauvegardeComplete(data.data);

  ecrireStockageLocal(
    CLE_SAUVEGARDE_V25,
    JSON.stringify(data.data)
  );
  const dateSynchronisation =
    data.updated_at || new Date().toISOString();
  ecrireStockageLocal(
    CLE_DERNIERE_SYNCHRO_CLOUD_V26,
    dateSynchronisation
  );
  ecrireStockageLocal(
    CLE_DERNIERE_MODIFICATION_LOCALE_V26,
    dateSynchronisation
  );

  window.setTimeout(() => {
    applicationCloudEnCoursRef.current = false;
  }, 300);

  alert("✅ Données complètes récupérées depuis le cloud");
};

const recupererCloudAutomatiquement = async () => {
  if (synchronisationCloudEnCoursRef.current) return;

  synchronisationCloudEnCoursRef.current = true;

  try {
    const { data, error } = await supabase
      .from("dashboard_data")
      .select("data, updated_at")
      .eq("id", "global")
      .single();

    if (error || !data?.data) {
      if (error) {
        console.error("Erreur synchronisation automatique :", error);
      }
      return;
    }

    const dateCloud = data.updated_at || "";
    const dateDerniereSynchro =
      localStorage.getItem(CLE_DERNIERE_SYNCHRO_CLOUD_V26) || "";

    if (
      dateCloud &&
      dateDerniereSynchro &&
      new Date(dateCloud).getTime() <=
        new Date(dateDerniereSynchro).getTime()
    ) {
      return;
    }

    const dateModificationLocale =
      localStorage.getItem(CLE_DERNIERE_MODIFICATION_LOCALE_V26) || "";
    const travailLocalNonSynchronise =
      dateModificationLocale &&
      (!dateDerniereSynchro ||
        new Date(dateModificationLocale).getTime() >
          new Date(dateDerniereSynchro).getTime());

    if (travailLocalNonSynchronise) {
      const chargerVersionCloud = window.confirm(
        "Une version plus récente existe dans le cloud, mais cet appareil contient aussi des modifications non enregistrées.\n\nOK : charger la version cloud\nAnnuler : conserver le travail de cet appareil"
      );

      if (!chargerVersionCloud) return;
    }

    applicationCloudEnCoursRef.current = true;
    appliquerSauvegardeComplete(data.data);
    ecrireStockageLocal(
      CLE_SAUVEGARDE_V25,
      JSON.stringify(data.data)
    );

    const dateSynchronisation = dateCloud || new Date().toISOString();
    ecrireStockageLocal(
      CLE_DERNIERE_SYNCHRO_CLOUD_V26,
      dateSynchronisation
    );
    ecrireStockageLocal(
      CLE_DERNIERE_MODIFICATION_LOCALE_V26,
      dateSynchronisation
    );

    window.setTimeout(() => {
      applicationCloudEnCoursRef.current = false;
    }, 300);
  } finally {
    synchronisationCloudEnCoursRef.current = false;
  }
};

  const importRef = useRef<HTMLInputElement | null>(null);
const actionsRef = useRef<HTMLDivElement | null>(null);
const generationPDFEnCoursRef = useRef(false);
const [generationPDFEnCours, setGenerationPDFEnCours] = useState(false);
const inputClientRef = useRef<HTMLInputElement | null>(null);
const ficheClientRef = useRef<HTMLDivElement | null>(null);
const lignesTravauxRef = useRef<HTMLDivElement | null>(null);
const derniereLigneRef = useRef<HTMLFieldSetElement | null>(null);
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
  const [planningDonnees, setPlanningDonnees] = useState<PlanningDonnees>(() => normaliserPlanning(null));
  const planningModifieRef = useRef(false);
  const sauvegardePlanningRef = useRef<() => any>(() => null);
  const [etatPlanningCloud, setEtatPlanningCloud] = useState("");
  const [dateSelectionnee, setDateSelectionnee] = useState<Date | null>(null);
const [showPopupCalendrier, setShowPopupCalendrier] = useState(false);
const [ficheOuverte, setFicheOuverte] = useState(true);
const [versionParcoursDevis, setVersionParcoursDevis] = useState(0);
const [ongletsDevis, setOngletsDevis] = useState({
  client: false, prestations: false, resultat: false, conditions: false, acompte: false,
});
const progressionDevisRef = useRef({ resultat: false, conditions: false, acompte: false });
const reglerOngletDevis = (cle: keyof typeof ongletsDevis, ouvert: boolean) => {
  setOngletsDevis((actuels) => ({ ...actuels, [cle]: ouvert }));
};
const avancerParcoursDevis = (etape: "resultat" | "conditions" | "acompte") => {
  // Une seule ouverture automatique par étape : ensuite, le choix manuel prime.
  if (progressionDevisRef.current[etape]) return;
  progressionDevisRef.current[etape] = true;
  reglerOngletDevis(etape, true);
};
const reinitialiserParcoursDevis = () => {
  setHistoriqueOuvert(false);
  progressionDevisRef.current = { resultat: false, conditions: false, acompte: false };
  setOngletsDevis({ client: true, prestations: true, resultat: false, conditions: false, acompte: false });
  setVersionParcoursDevis((version) => version + 1);
};
const [rdvEnCours, setRdvEnCours] = useState<Dossier | null>(null);
const [ajoutRdvOuvert, setAjoutRdvOuvert] = useState(false);
  const [rechercheHistorique, setRechercheHistorique] = useState("");
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
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

  const [client, setClient] = useState("Jérémie Meurisse");
  const [telephone, setTelephone] = useState("06 50 95 10 89");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("Revel");
  const [adresseAgence, setAdresseAgence] = useState("");
  const [complementAdresse, setComplementAdresse] = useState("");
  const [notes, setNotes] = useState("Sous-traitance Jérémie — base 190 €/jour — hors fournitures.");
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
const [correctionsEncaissementsMensuels, setCorrectionsEncaissementsMensuels] =
  useState<CorrectionsEncaissementsMensuels>({});
const [correctionMensuelleEnCours, setCorrectionMensuelleEnCours] = useState(false);

const [depenseDate, setDepenseDate] = useState(new Date().toLocaleDateString("fr-FR"));
const [depenseCategorie, setDepenseCategorie] = useState("Fournitures");
const [anneeGraphiqueDepenses, setAnneeGraphiqueDepenses] = useState(new Date().getFullYear());
const donneesGraphiqueDepenses = useMemo(
  () => calculerGraphiqueDepenses(depenses, anneeGraphiqueDepenses),
  [depenses, anneeGraphiqueDepenses]
);

const [depenseDescription, setDepenseDescription] = useState("");
const [depenseMontant, setDepenseMontant] = useState(0);
const [depenseModePaiement, setDepenseModePaiement] = useState("CB");
const [prestationSelectionnee, setPrestationSelectionnee] = useState("");
const [categorieSelectionnee, setCategorieSelectionnee] = useState("");
const [sousCategorieSelectionnee, setSousCategorieSelectionnee] = useState("");
const [solSalleDeBain, setSolSalleDeBain] = useState<"pvc" | "carrelage">("pvc");
const sousCategoriesDisponibles = useMemo(() => Array.from(new Set(
  TARIFS_PRESTATIONS.filter((p) => !categorieSelectionnee ||
    (p.categorieChantier || p.categorie) === categorieSelectionnee)
    .map((p) => p.sousCategorie).filter((nom): nom is string => Boolean(nom))
)), [categorieSelectionnee]);

const [recherchePrestation, setRecherchePrestation] = useState("");
const [packSelectionne, setPackSelectionne] = useState("");
const [insertionApresId, setInsertionApresId] = useState<number | null>(null);
// État visuel uniquement : une prestation ouverte à la fois.
const [ligneTravauxOuverteId, setLigneTravauxOuverteId] = useState<number | null>(null);

const [afficherFavorisSeulement, setAfficherFavorisSeulement] =
  useState(false);

const [prestationsFavorites, setPrestationsFavorites] = useState<string[]>(
  []
);

const [numeroDevis, setNumeroDevis] = useState("");
const [numeroFacture, setNumeroFacture] = useState("");

  const [lignesTravaux, setLignesTravaux] = useState<LigneTravaux[]>([]);
  useEffect(() => {
    const prestationRenseignee = lignesTravaux.some((ligne) =>
      Boolean(ligne.tarifId?.trim() || ligne.prestationNom?.trim()) ||
      Number(ligne.q1 || 0) > 0 || Number(ligne.prixUnitaire || 0) > 0
    );
    if (prestationRenseignee) avancerParcoursDevis("resultat");
    else progressionDevisRef.current.resultat = false;
  }, [lignesTravaux]);

  // Historique d'annulation limité au devis courant (prestations et conditions).
  const [historiqueAnnulation, setHistoriqueAnnulation] = useState<Array<{lignes: LigneTravaux[]; generales: string; chantier: string}>>([]);
  const annulationEnCoursRef = useRef(false);
  const precedentAnnulationRef = useRef<string | null>(null);
  const annulerDerniereModification = () => {
    const precedent = historiqueAnnulation[historiqueAnnulation.length - 1];
    if (!precedent) return;
    annulationEnCoursRef.current = true;
    setHistoriqueAnnulation(h => h.slice(0, -1));
    setLignesTravaux(precedent.lignes);
    setConditionsGeneralesDevis(precedent.generales);
    setConditionsChantier(precedent.chantier);
  };


const [idDossierActuel, setIdDossierActuel] = useState<number | null>(null);
  useEffect(() => {
    setInsertionApresId(null);
    setLigneTravauxOuverteId(null);
  }, [idDossierActuel]);
  useEffect(() => {
    if (insertionApresId !== null && !lignesTravaux.some(l => l.id === insertionApresId)) {
      setInsertionApresId(null);
    }
  }, [lignesTravaux, insertionApresId]);
  const [kmAller, setKmAller] = useState(37);
  const [fraisDeplacementManuelActif, setFraisDeplacementManuelActif] = useState(false);
const [fraisDeplacementManuel, setFraisDeplacementManuel] = useState(0);
  const [achatFournitures, setAchatFournitures] = useState(0);
  const [coefficientFournitures, setCoefficientFournitures] = useState(1.3);
  const [fournituresClient, setFournituresClient] = useState(true);
  const [detailsFournitures, setDetailsFournitures] = useState("");
  const [conditionsGeneralesDevis, setConditionsGeneralesDevis] = useState(
    CONDITIONS_GENERALES_DEVIS_DEFAUT
  );
  const [conditionsChantier, setConditionsChantier] = useState("");
  const [commentaireFournitures, setCommentaireFournitures] = useState("");

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
const [estAndroid, setEstAndroid] = useState(false);
const [sauvegardesOuvertes, setSauvegardesOuvertes] = useState(false);
const [detailsEncaissementsOuverts, setDetailsEncaissementsOuverts] = useState(false);
const [montantSituation, setMontantSituation] = useState(0);
const [descriptionSituation, setDescriptionSituation] = useState("");
const [dateTravauxSituation, setDateTravauxSituation] = useState("");
const [reglementSituationNumero, setReglementSituationNumero] = useState("");
const [dateReglementSituation, setDateReglementSituation] = useState("");
useEffect(() => {
  setMontantSituation(0);
  setDescriptionSituation("");
  setDateTravauxSituation("");
  setReglementSituationNumero("");
  setDateReglementSituation("");
}, [idDossierActuel]);
const [listeBackups, setListeBackups] = useState<any[]>([]);
const applicationCloudEnCoursRef = useRef(false);
const synchronisationCloudEnCoursRef = useRef(false);
const premiereSauvegardeLocaleRef = useRef(true);

useEffect(() => {
  if (!sauvegardePrete) return;
  const actuel = JSON.stringify({ lignes: lignesTravaux, generales: conditionsGeneralesDevis, chantier: conditionsChantier });
  const precedent = precedentAnnulationRef.current;
  precedentAnnulationRef.current = actuel;
  if (annulationEnCoursRef.current) { annulationEnCoursRef.current = false; return; }
  if (precedent !== null && precedent !== actuel) {
    setHistoriqueAnnulation(h => [...h.slice(-29), JSON.parse(precedent)]);
  }
}, [lignesTravaux, conditionsGeneralesDevis, conditionsChantier, sauvegardePrete]);

useEffect(() => {
  setEstAndroid(/Android/i.test(window.navigator.userAgent));
}, []);

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
    ecrireStockageLocal(CLE_SAUVEGARDE_V25, sauvegardeV24);
  }

  if (sauvegarde) {
    try {
      const d = JSON.parse(sauvegarde);

      setRibTitulaire(d.ribTitulaire || "");
setRibIban(d.ribIban || "");
setRibBic(d.ribBic || "");
setRibBanque(d.ribBanque || "");

      setHistorique(d.historique || []);
  planningModifieRef.current = false;
  setPlanningDonnees(normaliserPlanning(d.planningDonnees));
      setDepenses(d.depenses || []);
      setCorrectionsEncaissementsMensuels(normaliserCorrectionsMensuelles(d.correctionsEncaissementsMensuels));
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
setCoefficientFournitures(b.coefficientFournitures ?? 1.3);
setFournituresClient(b.fournituresClient ?? true);
setDetailsFournitures(b.detailsFournitures || "");
setConditionsGeneralesDevis(
  b.conditionsGeneralesDevis ?? CONDITIONS_GENERALES_DEVIS_DEFAUT
);
setConditionsChantier(b.conditionsChantier || "");
setCommentaireFournitures(b.commentaireFournitures || "");
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

  // À chaque nouvelle ouverture de l’application, on conserve l’historique
  // chargé mais on repart volontairement sur une fiche Nouveau vide.
  nouveauDossier();
  // Sur téléphone, démarrer avec tous les onglets masqués.
  // Le bouton Nouveau conserve ensuite l’ouverture habituelle du client et des prestations.
  if (window.matchMedia("(max-width: 767px)").matches) {
    setOngletsDevis({ client: false, prestations: false, resultat: false, conditions: false, acompte: false });
  }
  setSauvegardePrete(true);
}, []);

// Synchronisation automatique au démarrage et lorsque l'application revient
// au premier plan. Les boutons manuels restent disponibles en secours.
useEffect(() => {
  if (!sauvegardePrete) return;

  const synchroniserSiNecessaire = () => {
    if (document.visibilityState === "visible") {
      void recupererCloudAutomatiquement();
    }
  };

  void recupererCloudAutomatiquement();
  window.addEventListener("focus", synchroniserSiNecessaire);
  document.addEventListener("visibilitychange", synchroniserSiNecessaire);

  return () => {
    window.removeEventListener("focus", synchroniserSiNecessaire);
    document.removeEventListener(
      "visibilitychange",
      synchroniserSiNecessaire
    );
  };
}, [sauvegardePrete]);

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
  ecrireStockageLocal(
    "prestationsFavoritesV25",
    JSON.stringify(prestationsFavorites)
  );
}, [prestationsFavorites]);

useEffect(() => {
  if (!sauvegardePrete) return;

  const donnees = construireSauvegardeComplete();
  ecrireStockageLocal(CLE_SAUVEGARDE_V25, JSON.stringify(donnees));

  if (premiereSauvegardeLocaleRef.current) {
    premiereSauvegardeLocaleRef.current = false;
  } else if (!applicationCloudEnCoursRef.current) {
    ecrireStockageLocal(
      CLE_DERNIERE_MODIFICATION_LOCALE_V26,
      new Date().toISOString()
    );
  }
}, [
  sauvegardePrete,
  planningDonnees,
  correctionsEncaissementsMensuels,
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
conditionsGeneralesDevis,
conditionsChantier,
commentaireFournitures,
ribTitulaire,
ribIban,
ribBic,
ribBanque,
]);
// 🔒 BACKUP AUTOMATIQUE (historique sécurisé avec versions)

useEffect(() => {
  if (!sauvegardePrete) return;

 const donnees = construireSauvegardeComplete();

  // 🔁 historique des sauvegardes
  const backupsV25 = localStorage.getItem(CLE_BACKUPS_V25);
  const backupsV24 = localStorage.getItem(CLE_BACKUPS_V24);
  const backups = JSON.parse(backupsV25 || backupsV24 || "[]");

  const maintenant = new Date();
  const horodatage = `${maintenant.getDate()}-${maintenant.getMonth() + 1}-${maintenant.getFullYear()}_${maintenant.getHours()}h${maintenant.getMinutes()}`;

  backups.push({
    date: horodatage,
    data: donnees,
  });

  // 🔒 garde seulement les 10 dernières sauvegardes
  const backupsLimites = backups.slice(-10);

  try {
    ecrireStockageLocal(CLE_BACKUPS_V25, JSON.stringify(backupsLimites));
  } catch (erreur) {
    // La sauvegarde courante est déjà écrite par l'effet précédent.
    // En cas de quota, conserver l'ancienne copie plutôt que bloquer l'application.
    if (!estErreurQuotaStockage(erreur)) throw erreur;
    console.warn("Copie automatique différée : stockage local plein. La sauvegarde courante est conservée.");
  }

}, [
  sauvegardePrete,
  planningDonnees,
  correctionsEncaissementsMensuels,
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
  conditionsGeneralesDevis,
  conditionsChantier,
  commentaireFournitures,
  ribTitulaire,
ribIban,
ribBic,
ribBanque,
]);

const construireSauvegardeComplete = () => {
  return {
    planningDonnees,
    historique,
    depenses,
    correctionsEncaissementsMensuels,
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
      conditionsGeneralesDevis,
      conditionsChantier,
      commentaireFournitures,

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

// Seules les saisies du planning déclenchent cet envoi différé : une restauration
// locale/cloud ne doit jamais réexpédier un état vide au démarrage.
sauvegardePlanningRef.current = construireSauvegardeComplete;
useEffect(() => {
  if (!sauvegardePrete || !planningModifieRef.current) return;
  const timer = window.setTimeout(() => {
    planningModifieRef.current = false;
    setEtatPlanningCloud("Synchronisation du planning…");
    void envoyerDonneesCloud(sauvegardePlanningRef.current(), false)
      .then(ok => setEtatPlanningCloud(ok ? "Planning enregistré et synchronisé" : "Planning enregistré sur cet appareil. Synchronisation à réessayer."))
      .catch(() => setEtatPlanningCloud("Planning enregistré sur cet appareil. Synchronisation à réessayer."));
  }, 1500);
  return () => window.clearTimeout(timer);
}, [planningDonnees, sauvegardePrete]);


  const baseFacturation = useMemo(() => {
    const courant = historique.find((d) => d.id === idDossierActuel);
    if (courant?.devisOrigineId === undefined) return null;
    if (courant.baseFacturation) return courant.baseFacturation;
    const origine = historique.find((d) => d.id === courant.devisOrigineId);
    return origine ? creerBaseFacturation(origine) : null;
  }, [historique, idDossierActuel]);

  useEffect(() => {
    if (!baseFacturation) return;
    setLignesTravaux((actuelles) => {
      const initiales: LigneTravaux[] = JSON.parse(JSON.stringify(baseFacturation.lignes));
      const nouvelles = actuelles.filter((l) => !initiales.some((origine) => origine.id === l.id));
      const resultat = [...initiales, ...nouvelles];
      return JSON.stringify(resultat) === JSON.stringify(actuelles) ? actuelles : resultat;
    });
  }, [baseFacturation]);

  const calcul = useMemo(() => {
  let totalTravaux = lignesTravaux.reduce(
    (somme, ligne) => somme + montantLigne(ligne, modeClient),
    0
  );

  const dossierVide =
    lignesTravaux.length === 0 &&
    achatFournitures === 0 &&
    kmAller === 0;

  const kmAR = kmAller * 2;

  // ================= TEMPS CHANTIER =================
  let totalHeuresChantier = lignesTravaux.reduce((somme, ligne) => {
    const heures = ligne.heuresUnite || 0;
    const quantite = ligne.q1 || 1;

    return somme + heures * quantite;
  }, 0);

  let nombreJoursChantier =
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

let fraisLogistique =
  fraisDeplacementManuelActif
    ? Math.round(fraisDeplacementManuel)
    : fraisLogistiqueAuto;

  const supplements = baseFacturation ? calculerSupplementsFacture(
    baseFacturation, lignesTravaux, modeClient, kmAR, prestationJoursSuivants?.prix220 || 0
  ) : null;
  if (baseFacturation && supplements) {
    fraisLogistique = baseFacturation.frais + supplements.fraisSup;
    totalHeuresChantier = supplements.heures;
    nombreJoursChantier = supplements.jours;
    totalTravaux = baseFacturation.lignes.reduce((s, l) => s + montantLigne(l, baseFacturation.modeClient), 0) + supplements.travauxSup;
  }

  // ================= FOURNITURES =================
 let reventeFournitures = fournituresClient
  ? 0
  : Math.round(achatFournitures * coefficientFournitures * 100) / 100;

if (baseFacturation) reventeFournitures = Math.max(baseFacturation.fournitures, reventeFournitures);

const margeFournitures =
  fournituresClient || achatFournitures === 0
    ? 0
    : Math.round((reventeFournitures - achatFournitures) * 100) / 100;

  let total = Math.round((totalTravaux + fraisLogistique + reventeFournitures) * 100) / 100;

  if (baseFacturation && supplements) {
    // Le total accepté est préservé ; seuls les ajouts font évoluer la facture.
    total = Math.round((baseFacturation.total + supplements.travauxSup + supplements.fraisSup +
      reventeFournitures - baseFacturation.fournitures) * 100) / 100;
  }

  // Distinguer les fournitures intégrées aux lignes sans modifier le total client.
  // En facture, conserver la ventilation du devis accepté et ajouter les nouvelles lignes.
  const idsLignesInitiales = new Set(baseFacturation?.lignes.map((ligne) => ligne.id) ?? []);
  const fournituresIncluses = baseFacturation
    ? Math.round((
        totalFournituresIncluses(baseFacturation.lignes, baseFacturation.modeClient) +
        totalFournituresIncluses(
          lignesTravaux.filter((ligne) => !idsLignesInitiales.has(ligne.id)), modeClient
        )
      ) * 100) / 100
    : totalFournituresIncluses(lignesTravaux, modeClient);
  const mainOeuvreHorsFournitures = Math.round((totalTravaux - fournituresIncluses) * 100) / 100;
  const totalFournituresFacturees = Math.round((fournituresIncluses + reventeFournitures) * 100) / 100;

  // ================= MINIMUM CHANTIER =================
  const minimumChantier = 80;

  const complementMinimum = !dossierVide && total < minimumChantier
    ? Math.round((minimumChantier - total) * 100) / 100 : 0;

  if (!dossierVide && total < minimumChantier) {
    total = minimumChantier;
  }

  const acompte = acompteManuelActif
  ? Number(acompteManuel || 0)
  : Math.round(total * (pourcentageAcompte / 100));

  const reste = Math.round((total - acompte) * 100) / 100;
  const resteReel = Math.round((total - montantEncaisse) * 100) / 100;

  let rentabilite = "🟢 Correcte";
  if (total < 600 && modeClient === "jeremie") rentabilite = "🟠 À surveiller";
  if (total < 450) rentabilite = "🔴 Trop bas";

  // ================= ESTIMATION RAPIDE =================
  const chantierARisque = lignesTravaux.some((l) =>
    ["placo", "wc", "vmc", "gouttiere"].includes(l.type) ||
    l.prestationNom?.toLowerCase().includes("fuite") ||
    l.prestationNom?.toLowerCase().includes("depose") ||
    l.prestationNom?.toLowerCase().includes("dépose") ||
    l.prestationNom?.toLowerCase().includes("ragréage")
  );

  const chantierSimple = lignesTravaux.every((l) =>
    ["peinture", "parquet"].includes(l.type) &&
    !l.prestationNom?.toLowerCase().includes("depose") &&
    !l.prestationNom?.toLowerCase().includes("dépose") &&
    !l.prestationNom?.toLowerCase().includes("reprise")
  );

  const margeBasse = chantierARisque ? 0.9 : chantierSimple ? 0.9 : 0.85;
  const margeHaute = chantierARisque ? 1.35 : chantierSimple ? 1.15 : 1.25;

  const estimationBasse = Math.round(total * margeBasse);
  const estimationHaute = Math.round(total * margeHaute);
  const prixConseille = Math.ceil(estimationHaute / 10) * 10;

  
return {
  resteReel,
  complementMinimum,
  montantsFacture: supplements?.montants,
  joursSupplementaires: supplements?.joursSup || 0,
  fraisSupplementaires: supplements?.fraisSup || 0,
  fraisNonRepartis: supplements?.fraisNonRepartis || 0,
  totalTravaux,
  mainOeuvreHorsFournitures,
  fournituresIncluses,
  totalFournituresFacturees,
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
  baseFacturation,
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

    const dossiersJour = historique.filter((d) => !historique.some((f) => f.devisOrigineId === d.id)).filter((d) => {
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
    alert("Ce client n'est pas enregistré.");
    return;
  }

  const confirmation = window.confirm(
    `Supprimer le client enregistré "${nomClient}" ?`
  );

  if (!confirmation) return;

  setClientsEnregistres((anciens) =>
    anciens.filter(
      (c) => normaliserTexte(c.nom) !== normaliserTexte(nomClient)
    )
  );

  alert("Client supprimé des clients enregistrés.");
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
    travauxSupplementaires: historique.some((d) => d.id === idDossierActuel && d.devisOrigineId !== undefined),
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
    fournitureIncluse: false,
    prixFournitureInclus: 0,
    offert: false,
  };

  setLignesTravaux((ancien) => [...ancien, nouvelleLigne]);
  setLigneTravauxOuverteId(nouvelleLigne.id);
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
        "prixFournitureInclus",
        "heuresUnite",
        "coefficientPenibilite",
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
  l.tarifId === ID_INTERVENTION_GLOBALE &&
  (champ === "heuresUnite" || champ === "coefficientPenibilite")
) {
  ligneModifiee.heuresUnite = Math.max(0, Number(ligneModifiee.heuresUnite) || 0);
  ligneModifiee.coefficientPenibilite = Math.max(1, Number(ligneModifiee.coefficientPenibilite) || 1);
  ligneModifiee.prixUnitaireAuto = prixInterventionGlobale(ligneModifiee, modeClient);
  if (!l.prixManuel) ligneModifiee.prixUnitaire = ligneModifiee.prixUnitaireAuto;
  ligneModifiee.heuresUniteManuel = true;
  return ligneModifiee;
}

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
  if (baseFacturation?.lignes.some((l) => l.id === id)) return;
  setLignesTravaux(lignesTravaux.filter((l) => l.id !== id));
};

  const nouveauDossier = () => {
  reinitialiserParcoursDevis();
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
  setCoefficientFournitures(1.3);
  setFournituresClient(true);
  setDetailsFournitures("");
  setConditionsGeneralesDevis(CONDITIONS_GENERALES_DEVIS_DEFAUT);
  setConditionsChantier("");
  setCommentaireFournitures("");

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
  reinitialiserParcoursDevis();
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
  setCoefficientFournitures(1.3);
  setDetailsFournitures("");
  setConditionsGeneralesDevis(CONDITIONS_GENERALES_DEVIS_DEFAUT);
  setConditionsChantier("");
  setCommentaireFournitures("");

  setFactureSap(false);
  setNumeroSap("");

  // Le RDV est un événement, pas un devis
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
    devisOrigineId: historique.find((d) => d.id === idFinal)?.devisOrigineId,
    factureAcompte: historique.find((d) => d.id === idFinal)?.factureAcompte,
    facturesIntermediaires: historique.find((d) => d.id === idFinal)?.facturesIntermediaires,
    baseFacturation: baseFacturation || undefined,

    typeEvenement: typeEvenementFinal,

    factureSap: estEvenementSimple ? false : factureSap,
    numeroSap: estEvenementSimple ? "" : numeroSap,

      montantEncaisse: estEvenementSimple ? 0 : montantEncaisse,

    // On conserve la mémoire de l'acompte déjà enregistré.
    // Important : ne pas la perdre lorsqu'on réenregistre le dossier.
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
    conditionsGeneralesDevis: estEvenementSimple ? "" : conditionsGeneralesDevis,
    conditionsChantier: estEvenementSimple ? "" : conditionsChantier,
    commentaireFournitures: estEvenementSimple ? "" : commentaireFournitures,
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
  // Même un RDV enregistre la fiche client pour pouvoir faire le devis plus tard.
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

  // Construction immédiate avec le dossier qui vient d'être enregistré.
  // Cela évite d'envoyer au cloud l'ancien historique pendant que React
  // termine encore la mise à jour de l'état local.
  const donneesCourantes = construireSauvegardeComplete();
  const donneesAvecDossier = {
    ...donneesCourantes,
    historique: historiqueMisAJour,
    brouillon: {
      ...donneesCourantes.brouillon,
      idDossierActuel: idFinal,
    },
  };

  if (persisterImmediatement) {
    ecrireStockageLocal(
      CLE_SAUVEGARDE_V25,
      JSON.stringify({
        ...donneesAvecDossier,
        brouillon: null,
      })
    );
  }

  const donneesSynchronisees = persisterImmediatement
    ? { ...donneesAvecDossier, brouillon: null }
    : donneesAvecDossier;

  // Ordinateur et Android envoient désormais chaque enregistrement au cloud.
  // L'autre appareil récupérera automatiquement cette version à l'ouverture
  // ou dès qu'il reviendra au premier plan.
  void envoyerDonneesCloud(donneesSynchronisees, false).then((succes) => {
    if (!silencieux) {
      alert(
        succes
          ? estRdv
            ? "✅ RDV enregistré et synchronisé"
            : estRappel
            ? "✅ Rappel enregistré et synchronisé"
            : "✅ Dossier enregistré et synchronisé"
          : estAndroid
          ? "⚠️ Dossier enregistré sur Android, mais la synchronisation cloud a échoué"
          : "⚠️ Dossier enregistré sur l'ordinateur, mais la synchronisation cloud a échoué"
      );
    }
  });
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
      conditionsChantier.trim() ||
      commentaireFournitures.trim() ||
      dateRdv ||
      dateChantier
    );

    if (!dossierCommence) {
      const donnees = construireSauvegardeComplete();

      ecrireStockageLocal(
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
  reinitialiserParcoursDevis();
 
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

  const origine = d.devisOrigineId !== undefined ? historique.find((item) => item.id === d.devisOrigineId) : undefined;
  const base = d.baseFacturation || (origine ? creerBaseFacturation(origine) : null);
  const lignesRechargees = base ? [
    ...JSON.parse(JSON.stringify(base.lignes)),
    ...(d.lignesTravaux || []).filter((l) => !base.lignes.some((originale) => originale.id === l.id))
      .map((l) => ({ ...l, travauxSupplementaires: true })),
  ] : d.lignesTravaux;
  setLignesTravaux(
    lignesRechargees || [
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
setCoefficientFournitures(d.coefficientFournitures ?? 1.3);
setFournituresClient(d.fournituresClient ?? true);
setDetailsFournitures(d.detailsFournitures || "");
setConditionsGeneralesDevis(
  d.conditionsGeneralesDevis ?? CONDITIONS_GENERALES_DEVIS_DEFAUT
);
setConditionsChantier(d.conditionsChantier || "");
setCommentaireFournitures(d.commentaireFournitures || "");
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

  // La fiche doit d'abord être rendue après setFicheOuverte(true), puis on
  // remonte précisément sur le bloc client du dossier ouvert.
  setTimeout(() => {
    ficheClientRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
};

const preparerFactureDepuisDevis = (devis: Dossier) => {
  if (!devis.numeroDevis || devis.numeroFacture || devis.devisOrigineId !== undefined) return;
  const factureExistante = historique.find(
    (d) => d.devisOrigineId === devis.id ||
      (d.numeroFacture && d.numeroDevis === devis.numeroDevis)
  );
  if (factureExistante) {
    rechargerDossier(factureExistante);
    return;
  }

  // Copie profonde : modifier les prestations ne touche jamais le devis accepté.
  const copie: Dossier = {
    ...JSON.parse(JSON.stringify(devis)),
    id: Math.max(Date.now(), ...historique.map((d) => d.id + 1)),
    devisOrigineId: devis.id,
    baseFacturation: creerBaseFacturation(devis),
    numeroFacture: "",
    estBrouillonAuto: false,
    facturePayee: false,
    date: new Date().toLocaleDateString("fr-FR"),
    fraisDeplacementManuelActif: false,
    fraisDeplacementManuel: 0,
  };
  // Sauvegarder la copie et le brouillon ensemble dès cette action.
  const donnees = construireSauvegardeComplete();
  const donneesMisesAJour = {
    ...donnees,
    historique: [copie, ...historique],
    numeroDevis: copie.numeroDevis,
    numeroFacture: "",
    brouillon: null,
  };
  ecrireStockageLocal(CLE_SAUVEGARDE_V25, JSON.stringify(donneesMisesAJour));
  setHistorique(donneesMisesAJour.historique);
  rechargerDossier(copie);
  void envoyerDonneesCloud(donneesMisesAJour, false);
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
    "Date à ajouter au planning chantier au format JJ/MM/AAAA :"
  );

  if (!nouvelleDate) return;

  setHistorique((ancien) =>
    ancien.map((d) => {
      if (d.id !== dossier.id) return d;

      const planningActuel = d.planningChantier || [];

      if (planningActuel.includes(nouvelleDate)) {
        alert("Cette date est déjà prévue pour ce chantier.");
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
    "Note / rappel à enregistrer :\nExemple : acheter peinture, rappeler client, commander fournitures..."
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
    coefficientFournitures: 1.3,
    fournituresClient: true,
    detailsFournitures: "",
    conditionsGeneralesDevis: "",
    conditionsChantier: "",
    commentaireFournitures: "",
    reventeFournitures: 0,
    margeFournitures: 0,

    priorite: "normale",
  };

  setHistorique((ancien) => [nouveauRappel, ...ancien]);
};

const supprimerDossier = (id: number) => {
  const confirmation = window.confirm(
    "Voulez-vous vraiment supprimer ce dossier ? Cette action est définitive."
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
    alert("Date manquante pour créer l'événement Google");
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

Je reste disponible pour toute question ou ajustement si nécessaire.

Belle journée,

Merci pour la confiance accordée`;

  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    sujet
  )}&body=${encodeURIComponent(corps)}`;

  window.location.href = mailto;
};


const envoyerFactureMail = () => {
  const sujet = construireObjetMail("facture");

  const corps = `Bonjour ${client},

Veuillez trouver ci-joint la facture ${numeroFacture} concernant les travaux réalisés.

Le reste à payer est de ${formatMontant(facturesIntermediairesCourantes.length ? decompteCourant.resteFinal : Math.max(0, calcul.total - montantEncaisse))} €.

Je reste disponible si besoin.

Belle journée,

Merci pour la confiance accordée`;

  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    sujet
  )}&body=${encodeURIComponent(corps)}`;

  window.location.href = mailto;
};


// Utilise les valeurs du dossier visé, même si un autre dossier est ouvert.
const preparerRelance = (d: Pick<Dossier,
  "numeroFacture" | "numeroDevis" | "client" | "email" | "total" |
  "montantEncaisse" | "facturePayee" | "referenceChantier" |
  "adresse" | "complementAdresse" | "factureAcompte" | "facturesIntermediaires" | "montantAcompteEncaisse"
>) => {
  const resteDu = d.facturesIntermediaires?.length ? decompteFacturation(d).resteFinal
    : Math.max(0, Math.round(((d.total || 0) - (d.montantEncaisse || 0)) * 100) / 100);

  if (!d.numeroFacture?.trim()) {
    alert("Créez d’abord la facture avant de préparer une relance.");
    return;
  }
  if (d.facturePayee || resteDu <= 0) {
    alert("Cette facture est déjà réglée : aucune relance à préparer.");
    return;
  }
  const destinataire = d.email?.trim();
  if (!destinataire || /[\r\n?&#]/.test(destinataire)) {
    alert("Renseignez une adresse email valide dans le dossier, puis réessayez.");
    return;
  }

  const chantier = [d.adresse, d.complementAdresse].filter(Boolean).join(", ");
  const sujet = [
    `Relance de paiement – Facture ${d.numeroFacture}`,
    d.referenceChantier,
    chantier,
  ].filter(Boolean).join(" - ");
  const coordonneesBancaires = ribIban.trim()
    ? [
        "Pour un règlement par virement :",
        ribTitulaire.trim() ? `Titulaire : ${ribTitulaire.trim()}` : "",
        `IBAN : ${ribIban.trim()}`,
        ribBic.trim() ? `BIC : ${ribBic.trim()}` : "",
        `Référence à indiquer : ${d.numeroFacture}`,
      ].filter(Boolean).join("\n")
    : "";
  const corps = [
    d.client?.trim() ? `Bonjour ${d.client.trim()},` : "Bonjour,",
    `Je me permets de revenir vers vous concernant la facture ${d.numeroFacture}${d.numeroDevis ? `, relative au devis ${d.numeroDevis}` : ""}${chantier ? `, pour les travaux réalisés au ${chantier}` : ""}.`,
    `Sauf erreur de ma part, le solde restant à régler s’élève à ${formatMontant(resteDu)} €.`,
    "Pouvez-vous procéder au règlement ou me confirmer la date de paiement prévue ?",
    "Si votre règlement a été effectué entre-temps, je vous remercie de ne pas tenir compte de ce message.",
    coordonneesBancaires,
    "Je reste disponible pour toute question.",
    "Merci pour votre confiance.\n\nBien cordialement,\nAdrien Tournier\nAdrien et ses mains\n06 71 17 11 76\nadrienetsesmains@gmail.com",
  ].filter(Boolean).join("\n\n");

  // Ouvre un brouillon à vérifier : aucun envoi automatique ni PDF joint.
  window.location.href = `mailto:${encodeURIComponent(destinataire)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
};


const moisActuel = moisSelectionne;
const anneeActuelle = anneeSelectionnee;

// Un devis conservé pour référence ne doit pas doubler les montants ou le planning.
const dossiersActifs = useMemo(() => {
  const devisArchives = new Set(
    historique.map((d) => d.devisOrigineId).filter((id) => id !== undefined)
  );
  return historique.filter((d) => !devisArchives.has(d.id));
}, [historique]);

const suiviAnnuelCA = useMemo(
  () => calculerSuiviAnnuelCA(dossiersActifs, correctionsEncaissementsMensuels, anneeSelectionnee),
  [dossiersActifs, correctionsEncaissementsMensuels, anneeSelectionnee]
);

const tableauMensuel = useMemo(() => {
  const dossiersDuMois = dossiersActifs.filter((d) => {
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

  const encaissementsUniques = encaissementsDuMois(dossiersActifs, anneeSelectionnee, moisSelectionne);
  const totalEncaisseAutomatique = encaissementsUniques.reduce(
    (somme, e) => somme + Math.round(e.montant * 100), 0
  ) / 100;

  const totalDepenses = depensesDuMois.reduce(
    (somme, d) => somme + (d.montant || 0),
    0
  );

  const correctionEncaissement = correctionsEncaissementsMensuels[
    cleMoisStatistiques(anneeSelectionnee, moisSelectionne)
  ];
  const totalEncaisse = correctionEncaissement ?? totalEncaisseAutomatique;

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

  const estimationUrssaf = Math.round(totalEncaisse * 0.215);
  const objectifMensuel = 4000;

  return {
    totalEncaisse,
    totalEncaisseAutomatique,
    correctionManuelle: correctionEncaissement !== undefined,
    totalDepenses,
    soldeReel,
    resteAEncaisser,
    totalRelance,
    estimationUrssaf,
    objectifMensuel,
    encaissementsUniques,
    alerteFaible: totalEncaisse < objectifMensuel,
  };
}, [dossiersActifs, depenses, moisSelectionne, anneeSelectionnee, correctionsEncaissementsMensuels]);


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

  const devisARelancer = dossiersActifs.filter((d) => {
    return d.statutDevis === "envoye" && !d.facturePayee;
  });

  const chantiersAPlanifier = dossiersActifs.filter((d) => {
    return d.statutDevis === "accepte" && d.statutChantier === "a_planifier";
  });

  const facturesEnRetard = dossiersActifs.filter((d) => {
    const datePaiement = parseDateFr(d.datePaiement || "");

    return (
      datePaiement &&
      datePaiement < aujourdHui &&
      !d.facturePayee &&
      Math.max(0, (d.total || 0) - (d.montantEncaisse || 0)) > 0
    );
  });

  const chantiersEnCours = dossiersActifs.filter((d) => {
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
}, [dossiersActifs]);
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

    let encaissements = encaissementsDuMois(dossiersActifs, annee, mois)
      .reduce((somme, e) => somme + Math.round(e.montant * 100), 0) / 100;

    // ============================================================
    // DÉPENSES RÉELLES DU MOIS
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
    // RÉSULTAT
    // ============================================================

    encaissements = correctionsEncaissementsMensuels[
      cleMoisStatistiques(annee, mois)
    ] ?? encaissements;

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
}, [dossiersActifs, depenses, correctionsEncaissementsMensuels]);

const enregistrerCorrectionMensuelle = async (montant: number | null) => {
  if (correctionMensuelleEnCours) return;
  const cle = cleMoisStatistiques(anneeSelectionnee, moisSelectionne);
  const prochaines = { ...correctionsEncaissementsMensuels };
  if (montant === null) delete prochaines[cle];
  else prochaines[cle] = montant;
  setCorrectionMensuelleEnCours(true);
  let sauvegardeLocaleEffectuee = false;
  try {
    const donnees = {
      ...construireSauvegardeComplete(),
      correctionsEncaissementsMensuels: prochaines,
    };
    ecrireStockageLocal(CLE_SAUVEGARDE_V25, JSON.stringify(donnees));
    ecrireStockageLocal(CLE_DERNIERE_MODIFICATION_LOCALE_V26, new Date().toISOString());
    sauvegardeLocaleEffectuee = true;
    setCorrectionsEncaissementsMensuels(prochaines);
    const succes = await envoyerDonneesCloud(donnees, false);
    if (!succes) alert("Correction enregistrée sur cet appareil. La synchronisation a échoué : utilisez Forcer la sauvegarde cloud lorsque la connexion revient.");
  } catch (erreur) {
    console.error("Erreur sauvegarde correction mensuelle :", erreur);
    alert(sauvegardeLocaleEffectuee
      ? "Correction conservée sur cet appareil, mais synchronisation impossible. Réessayez la sauvegarde cloud."
      : "La correction n’a pas pu être enregistrée. Réessayez.");
  } finally {
    setCorrectionMensuelleEnCours(false);
  }
};

const dossierActuel = useMemo(() => {
  return historique.find((d) => d.id === idDossierActuel) || null;
}, [historique, idDossierActuel]);

// Le devis original reste la source de la facture d'acompte pour les deux fiches.
const dossierOrigineAcompte = dossierActuel?.devisOrigineId !== undefined
  ? historique.find((d) => d.id === dossierActuel.devisOrigineId) || dossierActuel
  : dossierActuel;
const factureAcompteCourante = dossierOrigineAcompte?.factureAcompte || dossierActuel?.factureAcompte;
const facturesIntermediairesCourantes = dossierOrigineAcompte?.facturesIntermediaires || dossierActuel?.facturesIntermediaires || [];
const decompteCourant = decompteFacturation({
  total: calcul.total, montantEncaisse, facturePayee,
  montantAcompteEncaisse: dossierActuel?.montantAcompteEncaisse || dossierOrigineAcompte?.montantAcompteEncaisse,
  factureAcompte: factureAcompteCourante, facturesIntermediaires: facturesIntermediairesCourantes,
});
const montantSituationCentimes = Math.round(montantSituation * 100);
const cumulSituationCentimes = Math.round(decompteCourant.dejaFacture * 100) + montantSituationCentimes;
const resteSituationCentimes = Math.round(calcul.total * 100) - cumulSituationCentimes;

const telechargerDocumentEmis = (documentEmis: { pdfBase64: string; nomFichier: string }) => {
  const donnees = Uint8Array.from(atob(documentEmis.pdfBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([donnees], { type: "application/pdf" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = documentEmis.nomFichier;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Les documents et règlements restent attachés au même chantier, sans nouvelle fiche.
const sauvegarderFacturesIntermediaires = (
  facturesIntermediaires: FactureIntermediaire[],
  nouveauMontantEncaisse?: number,
  prochainCompteur?: number,
  reglementFinal?: { date: string; remiseAZero?: boolean }
) => {
  if (!dossierOrigineAcompte) throw new Error("Ouvre d'abord un devis enregistré.");
  const historiqueMisAJour = historique.map((d) =>
    d.id === dossierOrigineAcompte.id || d.devisOrigineId === dossierOrigineAcompte.id
      ? { ...d, facturesIntermediaires,
          ...(reglementFinal ? { facturePayee: !reglementFinal.remiseAZero,
            datePaiement: reglementFinal.date,
            ...(reglementFinal.remiseAZero ? { montantAcompteEncaisse: 0, dateAcompte: "" } : {}),
          } : {}),
          ...(nouveauMontantEncaisse === undefined ? {} : {
            montantEncaisse: nouveauMontantEncaisse,
            reste: Math.max(0, Math.round((d.total - nouveauMontantEncaisse) * 100) / 100),
          }) } : d);
  const donnees = construireSauvegardeComplete();
  const sauvegarde = { ...donnees, historique: historiqueMisAJour,
    compteurFacture: prochainCompteur ?? compteurFacture,
    brouillon: donnees.brouillon && nouveauMontantEncaisse !== undefined
      ? { ...donnees.brouillon, montantEncaisse: nouveauMontantEncaisse,
          ...(reglementFinal ? { facturePayee: !reglementFinal.remiseAZero, datePaiement: reglementFinal.date } : {}),
        } : donnees.brouillon,
  };
  ecrireStockageLocal(CLE_SAUVEGARDE_V25, JSON.stringify(sauvegarde));
  ecrireStockageLocal(CLE_DERNIERE_MODIFICATION_LOCALE_V26, new Date().toISOString());
  setHistorique(historiqueMisAJour);
  if (nouveauMontantEncaisse !== undefined) setMontantEncaisse(nouveauMontantEncaisse);
  if (prochainCompteur !== undefined) setCompteurFacture(prochainCompteur);
  void envoyerDonneesCloud(sauvegarde, false);
};

const enregistrerReglementSituation = () => {
  const facture = facturesIntermediairesCourantes.find((f) => f.numero === reglementSituationNumero);
  const dateReelle = parseDateFr(dateReglementSituation);
  if (!facture || facture.datePaiement || !dateReelle || Number.isNaN(dateReelle.getTime())) {
    alert("Sélectionne la date réelle de réception du règlement."); return;
  }
  const nouveauMontant = Math.round((montantEncaisse + facture.montant) * 100) / 100;
  if (facturePayee || nouveauMontant > calcul.total + 0.001) {
    alert("Ce règlement dépasserait le total du chantier. Vérifie les sommes déjà encaissées."); return;
  }
  try {
    sauvegarderFacturesIntermediaires(facturesIntermediairesCourantes.map((f) =>
      f.numero === facture.numero ? { ...f, datePaiement: dateReglementSituation } : f), nouveauMontant);
    setReglementSituationNumero("");
    setDateReglementSituation("");
  } catch (erreur) {
    console.error(erreur);
    alert("Le règlement n'a pas pu être enregistré. Réessaie avant de poursuivre.");
  }
};

const prochainNumeroFactureDisponible = () => {
  const numeros = historique.flatMap((d) => [d.numeroFacture, d.factureAcompte?.numero,
    ...(d.facturesIntermediaires || []).map((f) => f.numero)])
    .concat(numeroFacture)
    .map((n) => /^F-2026-(\d+)$/.exec(n || ""))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => Number(m[1]) + 1);
  return Math.max(compteurFactureValide(compteurFacture), ...numeros);
};

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
      ${(d.facturesIntermediaires || []).map((f) => f.numero).join(" ")}
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
      ${(d.facturesIntermediaires || []).map((f) => f.numero).join(" ")}
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
      (prestation.categorieChantier || prestation.categorie) === categorieSelectionnee;
    const correspondSousCategorie = !sousCategorieSelectionnee ||
      prestation.sousCategorie === sousCategorieSelectionnee;

    const correspondFavori =
      !afficherFavorisSeulement ||
      prestationsFavorites.includes(prestation.id);

    const textePrestation = normaliserRecherchePrestation(
      [
        getNomPrestation(prestation),
        prestation.categorie,
        prestation.categorieChantier,
        prestation.sousCategorie,
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
      correspondSousCategorie &&
      correspondFavori &&
      correspondRecherche
    );
  }).sort((a: any, b: any) => {
    const ordre = (a.ordreCatalogue ?? 9999) - (b.ordreCatalogue ?? 9999);
    return ordre || getNomPrestation(a).localeCompare(getNomPrestation(b), "fr");
  });
}, [
  categorieSelectionnee,
  sousCategorieSelectionnee,
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
          "Réalisation de la prestation prévue au devis",
          "Ajustements simples",
          "Finitions standards",
          "Nettoyage de fin d’intervention",
        ];

  const nouvelleLigne: LigneTravaux = {
      id: Date.now() + Math.floor(Math.random() * 1000),

      type:
        prestationTrouvee.typeTravaux ||
        "prestation_tableau",

      q1: 1,
      q2: 0,
      r1: 0,
      r2: 0,
      option: 0,

      travauxSupplementaires: dossierActuel?.devisOrigineId !== undefined,
      tarifId: prestationTrouvee.id,

      prestationNom:
        getNomPrestation(prestationTrouvee),

      unite: prestationTrouvee.unite,

      prixUnitaire: prixClient,
      prixUnitaireAuto: prixClient,
      prixManuel: false,
      coefficientPenibilite: 1,

      heuresUnite:
        prestationTrouvee.heuresUnite || 0,

      detailsPdfPersonnalises: [...detailsBase],
      detailsPdfOuvert: false,
      fournitureIncluse: false,
      prixFournitureInclus: 0,
    };
  setLignesTravaux((lignesActuelles) => {
    const indexInsertion = insertionApresId === null
      ? -1
      : lignesActuelles.findIndex(l => l.id === insertionApresId);
    const position = indexInsertion < 0 ? lignesActuelles.length : indexInsertion + 1;
    return [
      ...lignesActuelles.slice(0, position),
      nouvelleLigne,
      ...lignesActuelles.slice(position),
    ];
  });
  setInsertionApresId(null);
  setLigneTravauxOuverteId(nouvelleLigne.id);

  setPrestationSelectionnee("");

  setTimeout(() => {
    document.getElementById(`ligne-travaux-${nouvelleLigne.id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
};

const ajouterPackAuDevis = (idPack: string) => {
  const pack = PACKS_PRESTATIONS_V26.find(
    (packDisponible) => packDisponible.id === idPack
  );

  if (!pack) return;

  const maintenant = Date.now();
  const instancePack = `${idPack}-${maintenant}-${Math.random().toString(36).slice(2)}`;

  const lignesChoisies = pack.lignes.filter(([idPrestation]) => {
    if (pack.id !== "PACK-SDB-RENOVATION") return true;
    return solSalleDeBain === "carrelage"
      ? !["SOL-PVC-CLIP", "SOL-PLINTHE-BOIS"].includes(idPrestation)
      : !["CAR-SOL", "SOL-PLINTHE-CARR"].includes(idPrestation);
  });
  const nouvellesLignes = lignesChoisies
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
        travauxSupplementaires: dossierActuel?.devisOrigineId !== undefined,
        tarifId: prestation.id,
        prestationNom: getNomPrestation(prestation),
        unite: prestation.unite,
        prixUnitaire: prixClient,
        prixUnitaireAuto: prixClient,
        prixManuel: false,
        heuresUnite: prestation.heuresUnite || 0,
        detailsPdfPersonnalises: [...detailsBase],
        detailsPdfOuvert: false,
        fournitureIncluse: false,
        prixFournitureInclus: 0,
        offert: false,
        packInstanceId: instancePack,
        packNom: pack.nom,
      } as LigneTravaux;
    })
    .filter(Boolean) as LigneTravaux[];

  const premiereNouvelleLigneId = nouvellesLignes[0]?.id;

  if (!premiereNouvelleLigneId) return;
  setLigneTravauxOuverteId(premiereNouvelleLigneId);

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

const supprimerPackDuDevis = (instanceId: string) => {
  const lignesDuPack = lignesTravaux.filter(l => l.packInstanceId === instanceId);
  if (baseFacturation?.lignes.some((l) => l.packInstanceId === instanceId)) {
    alert("Ce pack appartient au devis initial et reste conservé. Ajoute de nouvelles prestations pour les suppléments.");
    return;
  }
  if (!lignesDuPack.length) return;
  if (!window.confirm(`Supprimer ce pack et ses ${lignesDuPack.length} prestations du devis ?`)) return;
  setLignesTravaux(ancien => ancien.filter(l => l.packInstanceId !== instanceId));
};

const reinitialiserApplicationComplete = () => {
  const confirmation = window.confirm(
    "⚠️ Voulez-vous vraiment réinitialiser toute l’application ?\n\nCela va supprimer le brouillon actuel, l’historique, les clients enregistrés, les dépenses et les compteurs."
  );

  if (!confirmation) return;

  const confirmationFinale = window.confirm(
    "Dernière confirmation : cette action est définitive si vous n’avez pas exporté de sauvegarde."
  );

  if (!confirmationFinale) return;

  localStorage.removeItem(CLE_SAUVEGARDE_V25);
  localStorage.removeItem(CLE_SAUVEGARDE_V24);
  localStorage.removeItem(CLE_BACKUPS_V25);
  localStorage.removeItem(CLE_BACKUPS_V24);

  setHistorique([]);
  setPlanningDonnees(normaliserPlanning(null));
  planningModifieRef.current = false;
  setDepenses([]);
  setCorrectionsEncaissementsMensuels({});
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
  setCoefficientFournitures(1.3);
  setFournituresClient(true);
  setDetailsFournitures("");
  setConditionsGeneralesDevis(CONDITIONS_GENERALES_DEVIS_DEFAUT);
  setConditionsChantier("");
  setCommentaireFournitures("");

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

  alert("✅ Application réinitialisée");
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
  planningModifieRef.current = false;
  setPlanningDonnees(normaliserPlanning(data.planningDonnees));
      setDepenses(data.depenses || []);
      setCorrectionsEncaissementsMensuels(normaliserCorrectionsMensuelles(data.correctionsEncaissementsMensuels));
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
        setCoefficientFournitures(b.coefficientFournitures ?? 1.3);
        setFournituresClient(b.fournituresClient ?? true);
        setDetailsFournitures(b.detailsFournitures || "");
        setConditionsGeneralesDevis(
          b.conditionsGeneralesDevis ?? CONDITIONS_GENERALES_DEVIS_DEFAUT
        );
        setConditionsChantier(b.conditionsChantier || "");
        setCommentaireFournitures(b.commentaireFournitures || "");

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

      alert("✅ Import réussi : sauvegarde complète restaurée");
    } catch (error) {
      console.error("Erreur import :", error);
      alert("❌ Erreur import : le fichier ne semble pas compatible.");
    }
  };

  reader.readAsText(file);
};

  const lignesPDF = (): [string, number][] => {
  if (baseFacturation && calcul.montantsFacture) {
    // Le minimum du devis initial est intégré à ses seules prestations.
    // Les nouvelles lignes gardent leurs propres frais supplémentaires.
    const manqueInitial = Math.max(0, Math.round((baseFacturation.total -
      baseFacturation.montantsPDF.reduce((s, n) => s + n, 0) -
      baseFacturation.fournitures) * 100) / 100);
    const initial = integrerMinimumPDF(baseFacturation.lignes,
      baseFacturation.montantsPDF, manqueInitial);
    const resultat: [string, number][] = lignesTravaux.map((l, i) => {
      const origine = baseFacturation.lignes.findIndex((b) => b.id === l.id);
      return [l.prestationNom || nomTravaux(l.type),
        origine >= 0 ? initial.montants[origine] : calcul.montantsFacture![i]];
    });
    if (initial.nonReparti > 0) resultat.push(["Forfait d’intervention du devis initial", initial.nonReparti]);
    if (baseFacturation.fournitures > 0) {
      resultat.push(["Fournitures et approvisionnement", baseFacturation.fournitures]);
    }
    const fournituresSup = Math.round((calcul.reventeFournitures - baseFacturation.fournitures) * 100) / 100;
    if (fournituresSup > 0) resultat.push(["Fournitures supplémentaires", fournituresSup]);
    if (calcul.fraisNonRepartis > 0) resultat.push(["Déplacement pour jours supplémentaires", calcul.fraisNonRepartis]);
    // Cas d'un ancien devis accepté sous le minimum actuel : seuls les ajouts
    // éventuels peuvent recevoir le complément, jamais les lignes initiales.
    if (calcul.complementMinimum > 0) {
      const eligibles = lignesTravaux.map((l) => baseFacturation.lignes.some((b) => b.id === l.id)
        ? { ...l, offert: true } : l);
      const reparti = integrerMinimumPDF(eligibles, resultat.slice(0, lignesTravaux.length).map((l) => l[1]), calcul.complementMinimum);
      lignesTravaux.forEach((_, i) => { resultat[i][1] = reparti.montants[i]; });
      if (reparti.nonReparti > 0) resultat.push(["Forfait d’intervention", reparti.nonReparti]);
    }
    return resultat;
  }
  const montantsAvecFrais = repartirFraisDevis(lignesTravaux, modeClient, calcul.fraisLogistique);
  const repartition = integrerMinimumPDF(lignesTravaux, montantsAvecFrais, calcul.complementMinimum);
  const resultat: [string, number][] = lignesTravaux.map((l, i) => [
    l.prestationNom || nomTravaux(l.type), Math.round(repartition.montants[i] * 100) / 100
  ]);
  if (calcul.totalTravaux === 0 && calcul.fraisLogistique !== 0) {
    resultat.push(["Déplacement et mise en place", calcul.fraisLogistique]);
  }
  if (calcul.reventeFournitures > 0) resultat.push(["Fournitures et approvisionnement", calcul.reventeFournitures]);
  // En l'absence de prestation payante, ne jamais majorer une ligne offerte
  // ou de fournitures : le forfait constitue alors une prestation distincte.
  if (repartition.nonReparti > 0) resultat.push(["Forfait d’intervention", repartition.nonReparti]);
  return resultat;
};

const chargerBanniereV26 = async () => {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        // jsPDF peut échouer avec certains PNG transparents volumineux.
        // Le passage par un canvas produit un JPEG fiable sans modifier
        // le fichier original présent dans le dossier public.
        const largeurCanvas = 1600;
        const hauteurCanvas = Math.round(
          largeurCanvas * (image.naturalHeight / image.naturalWidth)
        );
        const canvas = document.createElement("canvas");
        canvas.width = largeurCanvas;
        canvas.height = hauteurCanvas;

        const contexte = canvas.getContext("2d");

        if (!contexte) {
          reject(new Error("Impossible de préparer la bannière V26."));
          return;
        }

        contexte.fillStyle = "#ffffff";
        contexte.fillRect(0, 0, largeurCanvas, hauteurCanvas);
        contexte.drawImage(image, 0, 0, largeurCanvas, hauteurCanvas);

        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () =>
      reject(new Error("Bannière V26 introuvable dans le dossier public."));

    // Le paramètre évite de réutiliser une ancienne image conservée en cache.
    image.src = `${CHEMIN_BANNIERE_V26}?version=26`;
  });
};

const genererPDF = async (type: TypeDocumentPDF) => {
  if (generationPDFEnCoursRef.current) return "";
  generationPDFEnCoursRef.current = true;
  setGenerationPDFEnCours(true);
  try {
    return await fabriquerPDF(type);
  } catch (erreur) {
    console.error("Création du PDF impossible :", erreur);
    const detail = erreur instanceof Error ? erreur.message : String(erreur);
    alert(estErreurQuotaStockage(erreur)
      ? "Le stockage réservé à l'application dans ce navigateur est encore plein. La facture n'a pas pu être enregistrée. Fais un export de tes données et transmets-moi ce message ; ne vide pas les données du site."
      : `Le PDF n'a pas pu être créé. Détail : ${detail}`);
    return "";
  } finally {
    generationPDFEnCoursRef.current = false;
    setGenerationPDFEnCours(false);
  }
};

const fabriquerPDF = async (type: TypeDocumentPDF) => {
  // Sur Android, aucun devis ni aucune facture ne doit être finalisé :
  // pas de PDF et surtout aucune attribution de numéro.
  if (estAndroid) {
    alert(
      "La création des PDF devis et factures est réservée à la version ordinateur. Le dossier Android reste enregistré sans numéro."
    );
    return "";
  }

  if (type === "devis" && dossierActuel?.devisOrigineId !== undefined) {
    alert("Cette fiche prépare la facture. Pour retrouver le devis accepté, ouvre le devis original dans l’historique.");
    return "";
  }

  const estAcompte = type === "acompte";
  const estSituation = type === "situation";
  const estDocumentPartiel = estAcompte || estSituation;
  const estSoldeAvecSituations = type === "facture" && facturesIntermediairesCourantes.length > 0;
  if (estSituation) {
    if (!numeroDevis || !dossierActuel || !client.trim()) {
      alert("Ouvre le devis enregistré du client avant de créer une facture intermédiaire."); return "";
    }
    if (numeroFacture || facturePayee || historique.some((d) =>
      d.numeroDevis === numeroDevis && Boolean(d.numeroFacture))) {
      alert("Une facture finale existe déjà ou le chantier est soldé."); return "";
    }
    if (!Number.isFinite(montantSituation) || montantSituationCentimes <= 0 || resteSituationCentimes < 0) {
      alert("Indique un montant positif qui ne dépasse pas le reste à facturer."); return "";
    }
    const dateTravaux = parseDateFr(dateTravauxSituation);
    if (!descriptionSituation.trim() || !dateTravaux || Number.isNaN(dateTravaux.getTime())) {
      alert("Renseigne les travaux réalisés et leur date pour cette facture intermédiaire."); return "";
    }
    if (Math.round(calcul.total * 100) !== Math.round(dossierActuel.total * 100)) {
      alert("Enregistre d'abord les modifications du devis avant de créer cette facture intermédiaire."); return "";
    }
    if (montantEncaisse > decompteCourant.dejaFacture + 0.001) {
      alert("Des sommes déjà reçues n'ont pas encore de facture. Crée d'abord leur facture d'acompte."); return "";
    }
  }
  if (estSoldeAvecSituations && decompteCourant.dejaFacture > calcul.total + 0.001) {
    alert("Les factures déjà émises dépassent le total actuel du chantier. Vérifie le devis avant de créer le solde."); return "";
  }
  if (estAcompte && factureAcompteCourante) {
    telechargerDocumentEmis(factureAcompteCourante);
    return factureAcompteCourante.pdfBase64;
  }
  if (estAcompte && (!numeroDevis || !dossierActuel || !client.trim())) {
    alert("Ouvre le devis enregistré du client avant de créer sa facture d'acompte.");
    return "";
  }
  if (estAcompte && (numeroFacture || historique.some((d) =>
    d.numeroDevis === numeroDevis && Boolean(d.numeroFacture)))) {
    alert("Une facture finale existe déjà pour ce devis. Ouvre-la pour suivre son règlement.");
    return "";
  }
  const montantDocumentAcompte = Math.round(calcul.acompte * 100) / 100;
  if (estAcompte && (!Number.isFinite(montantDocumentAcompte) ||
    montantDocumentAcompte <= 0 || montantDocumentAcompte > calcul.total)) {
    alert("Indique un acompte supérieur à 0 € et inférieur ou égal au total du devis.");
    return "";
  }
  const dateDocument = new Date().toLocaleDateString("fr-FR");
  const numeroSuivantAcompte = estDocumentPartiel ? prochainNumeroFactureDisponible() : 0;
  const doc = new jsPDF({ compress: true });

  const titre = type === "devis" ? "DEVIS" : "FACTURE";
  const estFactureMeurisse = modeClient === "jeremie" && type === "facture";

let numero = estDocumentPartiel ? formatNumero("F", numeroSuivantAcompte)
  : type === "devis" ? numeroDevis : numeroFacture;

if (type === "devis" && !numeroDevis) {
  // Rattrapage demandé le 18/09/2026 : le prochain nouveau devis doit
  // obligatoirement prendre le numéro D-2026-053 une seule fois, même si
  // une ancienne sauvegarde contient momentanément un compteur plus élevé.
  const rattrapageDevis053DejaEffectue =
    localStorage.getItem(CLE_RATTRAPAGE_DEVIS_053) === "oui";
  const numeroDevisAUtiliser = rattrapageDevis053DejaEffectue
    ? compteurDevis
    : PROCHAIN_NUMERO_DEVIS;

  numero = formatNumero("D", numeroDevisAUtiliser);
  setNumeroDevis(numero);
  setCompteurDevis(numeroDevisAUtiliser + 1);

  if (!rattrapageDevis053DejaEffectue) {
    ecrireStockageLocal(CLE_RATTRAPAGE_DEVIS_053, "oui");
  }

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
  // Les factures finales et d'acompte partagent une numérotation continue.
  const rattrapageFacture017DejaEffectue =
    localStorage.getItem(CLE_RATTRAPAGE_FACTURE_017) === "oui";
  // Acomptes et factures finales utilisent le même compteur, sans doublon.
  const numeroFactureAUtiliser = prochainNumeroFactureDisponible();

  numero = formatNumero("F", numeroFactureAUtiliser);
  setNumeroFacture(numero);
  setCompteurFacture(numeroFactureAUtiliser + 1);

  if (!rattrapageFacture017DejaEffectue) {
    ecrireStockageLocal(CLE_RATTRAPAGE_FACTURE_017, "oui");
  }

  if (idDossierActuel !== null) {
    setHistorique((ancien) =>
      ancien.map((d) =>
        d.id === idDossierActuel ? { ...d, numeroFacture: numero } : d
      )
    );
  }
}

  let page = 1;
  let y = 0;

  const enteteTableau = () => {
    doc.setFillColor(20, 57, 72);
    doc.roundedRect(15, y, 180, 7.2, 1.6, 1.6, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.text("Désignation", 20, y + 4.9);
    doc.text("Montant", 188, y + 4.9, { align: "right" });

    doc.setTextColor(0, 0, 0);
    y += 10.8;
  };

  const nouvellePageTableau = () => {
    doc.addPage();
    page += 1;
    y = 25;
    enteteTableau();
  };

  const verifierPlace = (hauteur: number) => {
    if (y + hauteur > 278) {
      nouvellePageTableau();
    }
  };

  try {
    // Bannière finale 2026 : uniquement sur la première page, centrée.
    // Hauteur corrigée pour rendre le cercle du logo réellement rond.
    const banniereV26 = await chargerBanniereV26();
    const largeurBanniere = 190;
    const hauteurBanniere = 62.5;
    doc.addImage(
      banniereV26,
      "JPEG",
      10,
      7,
      largeurBanniere,
      hauteurBanniere,
      "banniere-v26",
      "FAST"
    );
  } catch (error) {
    console.error("Erreur de chargement de la bannière V26 :", error);
    // Secours lisible si le fichier image n'a pas encore été copié dans /public.
    doc.setFillColor(20, 57, 72);
    doc.roundedRect(10, 7, 190, 32, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Adrien et ses mains", 105, 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Une personne de confiance pour votre maison", 105, 30, {
      align: "center",
    });
  }

// Cartouche fin et léger sous la bannière.
const yCartoucheDocument = 72;
const hauteurCartoucheDocument = 9.5;

doc.setFillColor(250, 248, 243);
doc.setDrawColor(218, 164, 73);
doc.setLineWidth(0.3);
doc.roundedRect(
  15,
  yCartoucheDocument,
  180,
  hauteurCartoucheDocument,
  2.5,
  2.5,
  "FD"
);

// Petite capsule de titre, plus douce que l'ancien grand bandeau plein.
doc.setFillColor(20, 57, 72);
doc.roundedRect(18, yCartoucheDocument + 1.25, 30, 7, 3.5, 3.5, "F");
doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold");
doc.setFontSize(10.5);
doc.setFontSize(estDocumentPartiel ? 7.2 : 10.5);
doc.text(estSituation ? "Facture partielle" : estAcompte ? "Facture d'acompte" : type === "devis" ? "Devis" : "Facture", 33, yCartoucheDocument + 6, {
  align: "center",
});

doc.setTextColor(20, 57, 72);
doc.setFont("helvetica", "bold");
doc.setFontSize(8.4);
doc.text(`N° ${numero}`, 188, yCartoucheDocument + 4, { align: "right" });
doc.setFont("helvetica", "normal");
doc.setFontSize(6.8);
doc.text(
  `Date : ${new Date().toLocaleDateString("fr-FR")}`,
  188,
  yCartoucheDocument + 7.6,
  { align: "right" }
);
doc.setTextColor(0, 0, 0);

if (type === "facture" || estDocumentPartiel) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);

  doc.text(
    estSituation ? `Facture intermédiaire n° ${facturesIntermediairesCourantes.length + 1} sur devis ${numeroDevis}`
      : estAcompte ? `Facture d'acompte sur devis n° ${numeroDevis}`
      : numeroDevis ? `Facture suivant devis n° ${numeroDevis}` : "Facture de travaux réalisés",
    105,
    86,
    { align: "center" }
  );

  doc.text(
    `Échéance de paiement : ${estDocumentPartiel || estSoldeAvecSituations ? "À réception de facture" : datePaiement || "À réception de facture"}`,
    105,
    90,
    { align: "center" }
  );

  doc.setTextColor(0, 0, 0);
}

  // ================= CADRES CLIENT / CHANTIER PREMIUM PRESTIGE =================

const xClient = 15;
const xChantier = 105;
const yCadres = type === "facture" || estDocumentPartiel ? 95 : 85.5;

const largeurClient = estFactureMeurisse ? 180 : 85;
const largeurChantier = 90;

const hauteurEnteteCadre = 7.2;
const interligne = 4.1;

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

  // Dans les champs CLIENT / CHANTIER, au moins deux espaces consécutifs
  // indiquent volontairement un retour à la ligne dans le PDF.
  const preparerValeurPDF = (valeur: string) =>
    valeur.replace(/[ \t]{2,}/g, "\n").trim();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);

  // Largeur réellement disponible entre le début des valeurs
  // et la marge droite du cadre.
  const largeurTexte = largeur - decalageValeur - 5;

  // Figer le découpage en police normale avant de dessiner les labels en gras.
  // La mesure et le rendu utilisent exactement les mêmes lignes.
  const lignesPreparees = lignesFiltrees.map((ligne) => ({
    ...ligne,
    texteCoupe: doc.splitTextToSize(
      preparerValeurPDF(ligne.valeur), largeurTexte
    ) as string[],
  }));
  const nombreLignesVisuelles = lignesPreparees.reduce(
    (total, ligne) => total + Math.max(1, ligne.texteCoupe.length), 0
  );

  // Calcul exact jusqu'à la dernière ligne, sans interligne ajouté dessous.
  const hauteurTexte =
    Math.max(0, nombreLignesVisuelles - 1) * interligne +
    Math.max(0, lignesFiltrees.length - 1) * 0.4;

  // Cadre très compact tout en restant lisible à l'impression.
  const hauteurBloc = Math.max(
    24,
    hauteurEnteteCadre + 3.8 + hauteurTexte + 3
  );

  // Ombre très discrète.
  doc.setFillColor(238, 238, 238);
  doc.roundedRect(x + 0.5, yDepart + 0.5, largeur, hauteurBloc, 3, 3, "F");

  // Fond blanc + contour doré
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(218, 164, 73);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, yDepart, largeur, hauteurBloc, 3, 3, "FD");

  // Bandeau bleu pétrole plus fin.
  doc.setFillColor(20, 57, 72);
  doc.roundedRect(x, yDepart, largeur, hauteurEnteteCadre, 3, 3, "F");
  doc.rect(x, yDepart + hauteurEnteteCadre - 3, largeur, 3, "F");

  // Petit repère doré, plus léger que l'ancienne grande pastille.
  doc.setFillColor(218, 164, 73);
  doc.circle(x + 6, yDepart + 3.6, 1.1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(255, 255, 255);
  doc.text(titre, x + 10, yDepart + 4.9);

  let yTexte = yDepart + hauteurEnteteCadre + 3.8;

  lignesPreparees.forEach((ligne) => {
    // Repère de ligne minimaliste.
    doc.setFillColor(218, 164, 73);
    doc.circle(x + 6, yTexte - 1, 0.55, "F");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(20, 57, 72);
    doc.text(`${ligne.label} :`, x + 9, yTexte);

    // Valeur placée après la plus longue étiquette du bloc.
    const texteCoupe = ligne.texteCoupe;
    const nbLignes = Math.max(1, texteCoupe.length);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(35, 35, 35);
    texteCoupe.forEach((texte: string, index: number) => {
      doc.text(texte, x + decalageValeur, yTexte + index * interligne);
    });

    yTexte += nbLignes * interligne + 0.4;
  });

  return hauteurBloc;
};

const lignesClient: LigneBloc[] = [
  { label: "Nom", valeur: client || "", icone: "N" },
  { label: "Tél.", valeur: telephone || "", icone: "T" },
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
    { label: "Tél.", valeur: clientFinalTelephone || telephone || "", icone: "T" },
    { label: "Adresse", valeur: clientFinalAdresse || adresse || "", icone: "A" },
  ];
} else if (modeClient === "agence") {
  lignesChantier = [
    { label: "Réf.", valeur: referenceChantier || "", icone: "R" },
    { label: "Locataire", valeur: locataire || "", icone: "L" },
    { label: "Tél. loc.", valeur: telephoneLocataire || "", icone: "T" },
    { label: "Proprio.", valeur: proprietaire || "", icone: "P" },
    { label: "Tél. prop.", valeur: telephoneProprietaire || "", icone: "T" },
    {
      label: "Adresse",
      valeur: [adresse?.trim(), complementAdresse?.trim()].filter(Boolean).join("\n"),
      icone: "A",
    },
  ];
} else {
  lignesChantier = [
    {
      label: "Adresse",
      valeur: [adresse?.trim(), complementAdresse?.trim()].filter(Boolean).join("\n"),
      icone: "A",
    },
  ];
}

const hauteurClientAuto = dessinerCadreInfos(
  "Client",
  xClient,
  yCadres,
  largeurClient,
  lignesClient,
  27
);

const hauteurChantierAuto = estFactureMeurisse
  ? 0
  : dessinerCadreInfos(
      "Chantier",
      xChantier,
      yCadres,
      largeurChantier,
      lignesChantier,
      modeClient === "agence" ? 31 : 27
    );

doc.setFont("helvetica", "normal");
doc.setTextColor(0, 0, 0);

y = yCadres + Math.max(hauteurClientAuto, hauteurChantierAuto) + 5.5;

enteteTableau();

// ================= TABLEAU COMPACT =================

let lignesDevisPDF = lignesPDF();
if (estAcompte) {
  lignesDevisPDF = [[
    `Acompte sur devis n° ${numeroDevis} — ${formatMontant(calcul.total)} € au total`,
    montantDocumentAcompte,
  ]];
}

if (estSituation) {
  lignesDevisPDF = [[
    `Travaux réalisés à ce jour selon devis ${numeroDevis} (cumul)`,
    cumulSituationCentimes / 100,
  ]];
}
// Cas sous-traitance : même décompte de facturation, avec une ligne de main d'œuvre.
if (estFactureMeurisse) lignesDevisPDF = [["Main d'œuvre sous-traitance", calcul.total]];
if (estSituation || estSoldeAvecSituations) {
  if (factureAcompteCourante) lignesDevisPDF.push([
    `À déduire : facture d'acompte ${factureAcompteCourante.numero} du ${factureAcompteCourante.date}`,
    -factureAcompteCourante.montant,
  ]);
  for (const f of facturesIntermediairesCourantes) lignesDevisPDF.push([
    `À déduire : facture intermédiaire ${f.numero} du ${f.date}`, -f.montant,
  ]);
}

lignesDevisPDF.forEach(([designationBrute, montant], index) => {
  const ligneSource = estDocumentPartiel ? undefined : lignesTravaux[index];
  const estSupplement = type === "facture" && !estFactureMeurisse && Boolean(
    ligneSource?.travauxSupplementaires ||
    (!ligneSource && /supplémentaires/i.test(designationBrute))
  );
  const precisionsSituation = estSituation && index === 0;
  const detailsLimites = estFactureMeurisse || estDocumentPartiel ? []
    : ligneSource ? detailsTravaux(ligneSource)
    : designationBrute.includes("déplacement")
      ? [`Déplacement aller-retour estimé : ${calcul.kmAR} km`] : [];

  // Mesurer avec la police réellement utilisée, puis avancer d'un interligne explicite.
  // Aucun tableau de lignes n'est dessiné avec l'interligne implicite de jsPDF.
  const tailleTitre = estSupplement ? 9.5 : 10;
  const interligneTitre = 4.3;
  const tailleDetail = precisionsSituation ? 9 : 8;
  const interligneDetail = precisionsSituation ? 3.9 : 3.6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(tailleTitre);
  const designationCoupe: string[] = doc.splitTextToSize(designationBrute, 145);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(tailleDetail);
  const texteDetail = precisionsSituation ? descriptionSituation.trim()
    : detailsLimites.map((t) => `• ${t}`).join("\n");
  const detailCoupe: string[] = texteDetail ? texteDetail.split(/\r?\n/).flatMap((paragraphe) =>
    paragraphe ? doc.splitTextToSize(paragraphe, precisionsSituation ? 174 : 169) : [""]
  ) : [];
  const hauteur = (estSupplement ? 9 : 0) + designationCoupe.length * interligneTitre +
    (detailCoupe.length ? 2 + detailCoupe.length * interligneDetail : 0) + 4;
  const debutPageTableau = 35 + 10.8;
  const nouvellePageLigne = () => {
    doc.addPage(); page += 1; y = 35; enteteTableau();
  };
  if (y + hauteur > 250 && y > debutPageTableau + 0.1) nouvellePageLigne();

  if (estSupplement) {
    if (y + 9 + interligneTitre > 250) nouvellePageLigne();
    doc.setFillColor(238, 244, 245);
    doc.roundedRect(15, y, 45, 5.2, 1.3, 1.3, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.setTextColor(51, 88, 100);
    doc.text("TRAVAUX SUPPLÉMENTAIRES", 17, y + 3.4);
    y += 9;
  }
  designationCoupe.forEach((texte, numeroLigne) => {
    if (y + interligneTitre > 250) nouvellePageLigne();
    doc.setFont("helvetica", "bold"); doc.setFontSize(tailleTitre); doc.setTextColor(0);
    doc.text(texte, 15, y);
    if (numeroLigne === 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      doc.text(`${formatMontant(montant)} €`, 190, y, { align: "right" });
    }
    y += interligneTitre;
  });
  if (detailCoupe.length) {
    y += 2;
    detailCoupe.forEach((texte) => {
      if (y + interligneDetail > 250) nouvellePageLigne();
      doc.setFont("helvetica", "normal"); doc.setFontSize(tailleDetail);
      doc.setTextColor(precisionsSituation ? 55 : 120);
      if (texte) doc.text(texte, precisionsSituation ? 15 : 20, y);
      y += interligneDetail;
    });
  }
  // Séparateur après le dernier texte, puis marge avant la prochaine désignation.
  doc.setDrawColor(230);
  doc.line(15, y + 0.5, 195, y + 0.5);
  y += 4;
});

// ================= BLOC TOTAL MIS EN VALEUR =================
// On garde aussi une marge basse imprimable pour éviter tout chevauchement.
if (y + 37 > 250) {
  doc.addPage();
  page += 1;
  y = 35;
}

const formatEuroPDF = (valeur: number) => {
  return `${formatMontant((Math.round((valeur || 0) * 100) / 100))} €`;
};

const montantTotalPDF = estSituation ? montantSituationCentimes / 100
  : estAcompte ? montantDocumentAcompte
  : estSoldeAvecSituations ? decompteCourant.montantFinal : Math.round((calcul.total || 0) * 100) / 100;

const montantAcompteOuEncaissePDF =
  estSituation ? 0
  : estSoldeAvecSituations ? Math.min(decompteCourant.montantFinal, decompteCourant.encaisseFinal)
  : estAcompte ? Math.min(montantDocumentAcompte, Math.max(0, montantEncaisse))
  : type === "devis"
    ? Math.round((calcul.acompte || 0) * 100) / 100
    : Math.round((montantEncaisse || 0) * 100) / 100;

const resteAPayerPDF = Math.max(
  0,
  Math.round((montantTotalPDF - montantAcompteOuEncaissePDF) * 100) / 100
);

const xBlocTotal = 103;
const largeurBlocTotal = 92;
const hauteurBlocTotal = 29;

doc.setFillColor(250, 248, 243);
doc.setDrawColor(218, 164, 73);
doc.setLineWidth(0.3);
doc.roundedRect(
  xBlocTotal,
  y,
  largeurBlocTotal,
  hauteurBlocTotal,
  3,
  3,
  "FD"
);

// Bandeau principal : le montant total est volontairement le plus visible.
doc.setFillColor(20, 57, 72);
doc.roundedRect(xBlocTotal, y, largeurBlocTotal, 9.5, 3, 3, "F");
doc.rect(xBlocTotal, y + 6.5, largeurBlocTotal, 3, "F");

doc.setFont("helvetica", "bold");
doc.setFontSize(7.3);
doc.setTextColor(255, 255, 255);
doc.text(
  type === "devis" ? "Montant total du devis" : "Total de la facture",
  xBlocTotal + 7,
  y + 6.3
);

doc.setFontSize(10.3);
doc.text(formatEuroPDF(montantTotalPDF), 188, y + 6.6, { align: "right" });

doc.setFont("helvetica", "normal");
doc.setFontSize(7.5);
doc.setTextColor(35, 35, 35);
doc.text(
  type === "devis" ? "Acompte demandé" : "Déjà encaissé",
  xBlocTotal + 7,
  y + 16
);
doc.text(formatEuroPDF(montantAcompteOuEncaissePDF), 188, y + 16, {
  align: "right",
});

doc.setDrawColor(220, 210, 190);
doc.line(xBlocTotal + 7, y + 19.8, 188, y + 19.8);

doc.setFont("helvetica", "bold");
doc.setFontSize(8);
doc.setTextColor(20, 57, 72);
doc.text(
  type === "devis" ? "Solde après acompte" : "Reste à payer",
  xBlocTotal + 7,
  y + 25.5
);
doc.text(formatEuroPDF(resteAPayerPDF), 188, y + 25.5, { align: "right" });

y += hauteurBlocTotal + 5;
if (type === "facture" && factureAcompteCourante && !estSoldeAvecSituations) {
  const referenceAcompte = doc.splitTextToSize(
    `Facture d'acompte n° ${factureAcompteCourante.numero} du ${factureAcompteCourante.date} : ${formatMontant(factureAcompteCourante.montant)} €. Les sommes reçues sont déduites ci-dessus.`, 174);
  if (y + referenceAcompte.length * 3.5 > 250) {
    doc.addPage(); y = 35;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(referenceAcompte, 18, y + 3);
  y += referenceAcompte.length * 3.5 + 6;
}

if (estSituation || estSoldeAvecSituations) {
  const notesFacturation = [
    ...(estSituation ? [`Date des travaux réalisés : ${dateTravauxSituation}.`] : []),
    `Total du chantier : ${formatMontant(calcul.total)} €. Cumul facturé : ${formatMontant(estSituation ? cumulSituationCentimes / 100 : calcul.total)} €.`,
    ...(estSituation ? [`Travaux restant à facturer ultérieurement : ${formatMontant(resteSituationCentimes / 100)} €. Chantier non terminé.`]
      : ["Les factures précédentes sont déduites ci-dessus ; celles non réglées restent dues séparément."]),
  ];
  for (const note of notesFacturation) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(60);
    const lignes = doc.splitTextToSize(note, 174);
    if (y + lignes.length * 3.8 + 4 > 250) { doc.addPage(); y = 35; }
    doc.text(lignes, 18, y + 3);
    y += lignes.length * 3.8 + 3;
  }
}

// ================= FOURNITURES + CONDITIONS MODIFIABLES =================
// Le pied de page de la dernière page commence à 256 mm.
// On arrête donc tous les blocs de contenu à 250 mm pour garder une marge sûre.
const limiteBasseContenu = 250;

const preparerListePDF = (texte: string) =>
  texte
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter(Boolean);

const commentaireFournituresPDF = commentaireFournitures.trim();

if (type === "devis" && commentaireFournituresPDF) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const lignesFournituresCommentaire = commentaireFournituresPDF
    .split(/\r?\n/)
    .flatMap((paragraphe) => {
      const texte = paragraphe.trim();
      return texte ? doc.splitTextToSize(texte, 164) : [""];
    });

  const hauteurCommentaireFournitures = Math.max(
    25,
    18 + Math.max(1, lignesFournituresCommentaire.length) * 4.2
  );

  if (y + hauteurCommentaireFournitures > limiteBasseContenu) {
    doc.addPage();
    page += 1;
    y = 35;
  }

  doc.setFillColor(248, 244, 236);
  doc.setDrawColor(190, 145, 55);
  doc.roundedRect(15, y, 180, hauteurCommentaireFournitures, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(52, 63, 79);
  doc.text("INFORMATION FOURNITURES", 23, y + 8);

  doc.setDrawColor(190, 145, 55);
  doc.line(23, y + 11, 64, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(45, 45, 45);
  doc.text(lignesFournituresCommentaire, 23, y + 18);

  y += hauteurCommentaireFournitures + 8;
}

// ================= CONDITIONS + SIGNATURE PREMIUM COMPACT =================
if (!estDocumentPartiel) {
doc.setFont("helvetica", "normal");
doc.setFontSize(8.2);

const conditions = preparerListePDF(conditionsGeneralesDevis);
const conditionsPropresChantier = preparerListePDF(conditionsChantier);

const hauteurListeConditions = (liste: string[]) =>
  liste.reduce((hauteur, ligne) => {
    const coupe = doc.splitTextToSize(ligne, 105);
    return hauteur + coupe.length * 3.3 + 1.2;
  }, 0);

// Cadre fortement compacté par défaut, toujours extensible automatiquement.
const hauteurConditions = Math.max(
  47,
  15 +
    hauteurListeConditions(conditions) +
    (conditionsPropresChantier.length > 0
      ? 7 + hauteurListeConditions(conditionsPropresChantier)
      : 0)
);

if (y + hauteurConditions > limiteBasseContenu) {
  doc.addPage();
  page += 1;
  y = 35;
}


const yConditions = y;

doc.setDrawColor(60);
doc.roundedRect(15, yConditions, 180, hauteurConditions, 2, 2);

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(0, 0, 0);
doc.text("CONDITIONS PARTICULIERES ET PROTECTIONS CHANTIER", 25, yConditions + 8);

doc.setDrawColor(190, 145, 55);
doc.line(25, yConditions + 12, 67, yConditions + 12);

let cy = yConditions + 18;
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
  cy += coupe.length * 3.3 + 1.2;
});

if (conditionsPropresChantier.length > 0) {
  cy += 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.setTextColor(52, 63, 79);
  doc.text("CONDITIONS PROPRES A CE CHANTIER", 28, cy);
  cy += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(50, 50, 50);

  conditionsPropresChantier.forEach((ligne) => {
    doc.setDrawColor(190, 145, 55);
    doc.circle(22, cy - 1.5, 1.8);
    doc.line(21.2, cy - 1.5, 22, cy - 0.3);
    doc.line(22, cy - 0.3, 23.3, cy - 3);

    const coupe = doc.splitTextToSize(ligne, 105);
    doc.text(coupe, 28, cy);
    cy += coupe.length * 3.3 + 1.2;
  });
}

if (type === "devis" || type === "facture") {
  doc.setDrawColor(80);
  doc.line(
    140,
    yConditions + 12,
    140,
    yConditions + hauteurConditions - 5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
 doc.text("Bon pour accord", 167, yConditions + 15.5, { align: "center" });
doc.text("Date :        /        / 2026", 150, yConditions + 21);

doc.rect(148, yConditions + 24.5, 40, 13.5);

doc.setFontSize(8);
doc.text("Signature client", 168, yConditions + 43.5, { align: "center" });
}

// On repart après la hauteur réellement utilisée + une marge courte.
y = yConditions + hauteurConditions + 5;

}
// ================= RIB / MODALITES DE PAIEMENT PREMIUM =================
if (ribIban || ribTitulaire || ribBic || ribBanque) {
  // Préparation des lignes avant de dessiner le cadre afin d'en calculer
  // la hauteur exacte, notamment lorsque l'IBAN passe sur deux lignes.
  const ibanCoupe = ribIban ? doc.splitTextToSize(ribIban, 56) : [];
  const nombreLignesRib =
    (ribTitulaire ? 1 : 0) +
    (ribBanque ? 1 : 0) +
    ibanCoupe.length +
    (ribBic ? 1 : 0);

  const hauteurBlocRib = Math.max(21.5, 6.3 + nombreLignesRib * 3.8);

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
  doc.text("MODALITES DE PAIEMENT", 25, y + 5.5);

  doc.setDrawColor(190, 145, 55);
  doc.line(25, y + 8, 72, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  doc.text("Règlement par virement bancaire :", 25, y + 13.5);

  if (type === "devis") {
    doc.text("Paiement selon les modalités indiquées sur le document.", 25, y + 17.8);
  } else {
    doc.text("Paiement à réception de facture.", 25, y + 17.8);
  }

  doc.setDrawColor(220);
  doc.line(102, y + 4, 102, y + hauteurBlocRib - 4);

  let ribY = y + 5.5;

  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  if (ribTitulaire) {
    doc.setFont("helvetica", "bold");
    doc.text("Titulaire :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ribTitulaire, 132, ribY);
    ribY += 3.8;
  }

  if (ribBanque) {
    doc.setFont("helvetica", "bold");
    doc.text("Banque :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ribBanque, 132, ribY);
    ribY += 3.8;
  }

  if (ribIban) {
    doc.setFont("helvetica", "bold");
    doc.text("IBAN :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ibanCoupe, 132, ribY);
    ribY += ibanCoupe.length * 3.8;
  }

  if (ribBic) {
    doc.setFont("helvetica", "bold");
    doc.text("BIC :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ribBic, 132, ribY);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  y += hauteurBlocRib + 3;
}

// ================= AVIS GOOGLE : FACTURES UNIQUEMENT =================
if (type === "facture") {
  const hauteurBlocAvis = 34;

  // Garde le QR code et son texte ensemble, au-dessus du pied de page.
  if (y + hauteurBlocAvis > limiteBasseContenu) {
    doc.addPage();
    page += 1;
    y = 35;
  }

  doc.setDrawColor(190, 145, 55);
  doc.setLineWidth(0.3);
  doc.setFillColor(248, 250, 251);
  doc.roundedRect(15, y, 180, hauteurBlocAvis, 2, 2, "FD");

  // Fond blanc et marge blanche autour du QR pour faciliter la lecture.
  doc.setFillColor(255, 255, 255);
  doc.rect(19, y + 2, 30, 30, "F");
  doc.addImage(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAYAAABRRIOnAAAQAElEQVR4AeydgXrktg2E78/7v3O7I2RILAlRWp/T5izet/BAMwNQ4sK0b5O0f/369es/vxv/+ftP1edv6Q2y700YLr7iyzWrfFjquKz8h/D6krXX5fTK+ip34cpzprm2wrOaT3kNxKtmv/YOxA60gXhN3a9PIsrfv1b1wC+IsDv74F2TB4KrfBAadMw+1SsqTvwqco1ziHV8LYTgoKP7SneYywhRk7nKX3Ew1+Y+zl17F10nbAOhix17B6aBgJhCqPHulkHU3/VXPogeQJPz1DeySIB2MuUa59B1OM+L1ksKei+vVRVYE0LUKHe4xtdCc3cRoi/UWPWZBqIybe45O7AH4jnv9a0n/daBgH40VatD6JWWOR2Piisu685VNwbEutCx8lece8G9Wvc4w7N+Z37o635ae9ZzxX/rQKwW2tqfsQPfOhCeYOHq8aFP/cqnPg774F4tfN0Hc63vQ+h7qVC6w7qvhRC9rQnFKyA0QPRpyOs4NX1R+NaB+OI97LJ/0Q7sgfgXvRn/hluZBsJH0Rl+x03n3u4HtM8NYM7tu0KI2mqNXJv1Mc8+5xB9AVNv99vIIgGa12sVtrdPiiFqKt9dzmudYdVnGojKtLnn7EAbCIiJhHtYbRH0Wk9l9pmDe75cW+WrfrBew/2g+8xdodfNPnPweT/3gV7rftYyQvdl3jl0Ha5z1wnbQOjiibGf+X0H9kC878fjr/7y0fQ76F3MPSCOqiuuqjWXEaLfV7hcM+b5/kZN1zCvK16Ra2H2wcypTnG3NvtUdxbZ9zv5PiHOdvih/DQQEFMNtC0B2l+bYM5thK55Sq0JzUH3wXmuGodrfS1ccdaEEGuoxgHBwYz2CFU/BpzXZK/qx4Dz2tGra5j9eQ0IXd5VwLkPQgN+TQPxa/959A7sgXj02z8//DQQ+TiyPXNVbl9G6McQRG4996g469bOEN77ygczt+pnLaP6jAHRF2jSVY31VvBKzFX4ktvrSrfRPl8LgeNHvHLHymdNOA2EG/zTuPv/O3fgL5in6c6tQtQBpV3TNgYwTa6LITTA1O3P9sd1dN2apES8wzRw3BN0tEdo3xXKq4DeByLPtXDOqd7hGgg/YOo2Au3ZVkXQffuEWO3UA7U9EA9801eP3D6ptAn68QFzbp+PNqG5jBC1mZNXAaEB7cdC9lW56s6i8kNfAyKvfBUH4YeO2ef7gK5D5NYyVrWZW+VnfVwDsa6vha5R/mnsE+LTHfvh/jYQEJPm6cpY7QGEH6jk9p0PLH+xgdCv1vMiEH5Yo/0Zodfk9cY811jLXJVXPoj1Kv8VB1ELHV0DnfvuddtAeLGND9uB4XH3QAwb8vTLL38O4aNKCHGE5c2E4KQ7rPtaaA7CD5hqP2qgc6px2OjrK7RfCLz1B0QfkfscxMmXyge0vtZPyica5lr3ELpAuQOixprQWkaYffKOsU+IcUceft3+2ulpgpgk6Jj3CDoPkWfdedXPGkQd9L922i+0T7nDXMZKg94bIneN/WdoH0QddLSWEboOkVd65lZ5vi+Y+7kWQoO+f9A5+zK6d+aqfJ8Q1a48mNsD8eA3v3r0NhAQR05l8nFzhbkWol+uyfqYQ/iBUXq7BtovbRB5Nni9zEH4YMbsu5tD9Kn8Xl9Y6TDXyquA0ICqtHHyOkz6WmgOaHtlLqO8Y7SByMad/w924F+6xPTXzjwxq3uGe9OXe0DUZM55XhdmH8yca9wjo7UrhOgL5PIpv+rjAuDWdyV0H0TuHkKvp9xRcdYgegCmbiPQ7nmfELe37RnGPRDPeJ9vP+U0ENCPj+qIgtCtCavVIHxZk3cMOPdBaND/vp3roesQeV7POZxrVT/XCa1D9ABEn4b9GStz1qu8qllxuYd9FWdNCBw/KpQ7poGwsPGZOzB9Upm3AWKCoKOnDjrnGmtCc1cor6LyiXdU+j/FeU0hxHN+ZS2IWvVxVH0gfFmD3+cgekCNeT3n+4TwTmw8duB5A3E89v5ytgPT5xCV0cedEOL4Ue6A4HLtqAFNBo5fZqBjE18JBP9KpxeEBvUvmlPBi1jdy0v++AVxD1eFXjf7YK61D0KD/mzwdS6v6zWucJ8Qedd23v9jX4hJzBO02h8IP9BswK3v/GoN6LXWW+OTBKLmRJ5o9xVO4geE6hUQ6wPLaqDti43QOYjcmhDOOa3tgPD5WgjBqc+nsU+IT3fsh/v3QPzwN/jTx2sDoaNGAXHcwPoXG3kdXtTXZ2gfzGvkGug6RO7ajK7JXJXDeY/Kn7m7a9gHsRbQ2lgTmlT+abg2o3tUnDVh1sccaD/S2kCMpn39zB1on1T68TVNDojJsZYRQgMaDbRJa6SThO4vhKhJckulOyB8vhY2Y5FA+IGmAtP9wcy1gpMEokb34ICZczmEBphq9wEs81aQEphrklz2y/oq3yfEanceqO2BeOCbvnrkNhAQx1A2+zjMaD1zzq0JYe4nfoyqdvTka4i+QKOB6Zhs4ivxGhkhajL3sh4vCA06Zp9z6PpROHyB0DPt2gqzr8pdk7UVZ02Ya5zDfH9tIGza+OwdmP5ZBsTUAG1ngOk7EGauFbwSTaXilbaXrhWNeCVw3ge69rIeL9U7DmL4stJg7gczl1u6H9zz5doqh+iTNZi5rK9yiFq4h1UvP6NwnxDVDj2Y2wPxuDd//cDLgYA4hnILHStnkX0w11qH0ABTJVbrANOPr1wMoefarDvP+pjbkzF7Mr/Kc43zlT9rd/32VVj1g9gfoMlA29PlQLSKnTxmB748ENCnqtotTyx0H0Re+TNX1WbduX0VQqwFHV2XEe7pucZ5XtccrPu5xv5PEKJ3VQOhAZXcToAsVvfy5YHIjXf+c3ZgD8TPeS+/5UnaP9yqjo/VCvYLV76syauoOPGOrDsHjmPPHqG1CqWPceVb6RDrQ8fsh+DzmtYhNMDUG+Ya5zYAx3MDpkp0nbAyiB+j8u0TotqVB3PTJ5V5LzxRmQPaxMJ7nn3O3UNoLiO894B+nX2qV2RulUPdxzXQdXjP7RFCaFrbIV4BoQG6PAKY9ucQfr1/hdkHnbPbawrNZYReA+955ctcle8TotqVB3N7IB785leP3gYC4rjR0eSA4KpCe4SVDnMtzJzqFVUP8Y5Kh+gHM7pOCKFXPSpONQ7rED2g/7um1oT2X6G8irs+WK+rXmNUve2B3g8ityZsA6GLHXsHPv5rp6cPYrqAtovWhCaB9kuWeIU1IYQufgzpqxj9ul75K001Y0DcE/TTIHuqPuag18J5br8Qwqf8TlzdC0Q/6Oiaq/77hLjaoYfpeyAe9oZfPW77HALieMkFq2PGmjDXrHI4XwNCg465FwSfOecQGmCq/ZiCfuw38SLRMzkqK3D0t0cIwWW/+LOA8AO5pOXAsUYjUgKhAYm9l57dj/l9Qtzbx8e4pl8qgWMyoaOnRwidh8i9WxDXUH9Xqn4MiJrMV/1WnDWh+yhfhX0Q6wPNDrQ9aOQXEuh94D33+kK3hu4RP4Z9mTeXMevOIXpnH8zcPiHyDu28/+9D7L3YO6AdmE4IHzFCGRQQRwv0HwXSHfIofC3U9RgQfUZe1xAa9DXEj6HejlE7u4bo7TohfMZB+IFyGfX8JMomiQSOH1uJaimEBvVeQeit4JX43l5pe5mD8AP7hPi1/7ztwHRCQJ8WT1CugK5D5NYhrgFT7f+uUb0aeTNRzRjA8Z0DHbPHrTPnHHqNfdA5+6xltJYRei1EnmvgHueeubbiIPpZE+aaMYfwQ8fsgeAzNw1EFn8v39V/4g7sgfgT37V/8J7bQMB8fHhdHU2fBsz93MN9M1oTmofoAZgqfwQB7ceIjdA5iNyaUOuMIf4sIHoApcW9gHYvFVcWFyREnyy5X+aq3L4Ks7/S20Bk486fuwO3BgJiWoG2U0D7TjAJnfP0WRNC6Mod9kFo0NGeTxCi3n2Fq3oIP1DaVD8GcDx7WZBIuOdLJR+nEGvke4TgrppB+KDjrYG4arz1n7MDeyB+znv5LU/SBsJHTtXVmhDieFHucI2vhRA+a2cI4VPNGGc15kd/voboC9he4lkNcPxYgMBcnGucw7mvqs0cRK17Zcy+Krc3awOXpbdnqnxtIN6q9sVjd6ANBMSUVjsBoUH/7Bw6B5Hn2mr67nIw94PgoKPXg5nzWkL7MkKvgcizPuYQHmCUjmutMwZwfEdm/jCffIHwAyeOoIGjL9QYrl9vnl/FH4j6LLWByOTOn7sDeyCe+96XT35rIPKRB3HMZM6dITTA1NuxBZxet4JX4t6v9OMXzGu4X0Y3vuKy7hxiDfcQQnDQUbwCZk78V8P3IVz1kO6AuAdfn+GtgVgturWftQPt37quHgtiqrLmyYLQoP+imX3O7Reau4uqGSPXQtzD6BmvIXy51h4IDWgy0E4yk3CPc1+hayuE3k9eRfZB1yFy6xDXgKk3BI77fyOLCwgfdNwnRLFR30T9kW32QPyRb9s/d9PTv4avo2sM6EcKRJ49EFy+TZi5XOPcNRB+wNRtBI4jEjrmYq8FXYfIrQldo9xhLqO1CiH6ArlkynPtJL6IrDt/0cfL11d4mIcvQNsrS7nPPiG8KxuPHWi/VEJMzsH+/QVm7m+pTRlg6g09dUDz2gAzZ00IXYf3XPqdgPc6oCwD2v2t7tmaEKImN4SZk1eRfVUOUSuvwz4IDTD1hkC7fzjP34qGC+h1+4QYNufpl3sgnj4Bw/O3XyrNQz8+fHxdoWuzr+Igel/5rLuHsOLEK6xdobyOygtxf/ZkhNCARgPtuK762Zg16DUQuXX7M1oTmoeoA0yVqJpVuCh7fuIJ4efc+IUdaAORp8Q5cHwHVH0hNKDJwOGHGpsxJV4rUS21JoTo2cRXIl7xStsLZl8TUwLhg45JbimE3ohXojUVr3T5gqiFjqsCmH0wc6seWYN7tdB9bSByo50/dwf2QDz3vS+ffDkQOhYVVaX4Ma58lQ5xXGUNgoOO41q6htBzrXMIDTpaE6r+LKSPkb3WKs6a0Lpyh7mMlVZxEM9iTZj7jLl0B8y11jIuByIbd/6MHZg+qYSYJLiP3qpxQnVt7QzlUWRd12NYh35f5q7QvSofrPu5FroPPsurdSsOet9K971UGqxrq5qK2ydEtSsP5r5zIB68jT/n0dtA+Di6i9UWQD+2IPLsc28IDWgy0D7DaGRKIPREtf8S/IrL+pj7noSjlq+lO8z7OqM1oXnlDpifA77Oua/XEprLKF6ROefiHW0gLG589g5MAwExrVDj/2K7INau1vIkC+Hcl2th9kFwMGOuXeWwroXQqx4QGlDJ7fQD2smpZ1bkAug6vOfZV+XqpYBeNw1EVbi55+zAHojnvNe3nvRbB0LHj+PW6snkuozQjzLz0LlU3lII3f6MzfRKMu/8RR8vXwsPYvgiXjHQx6V4x0EMX6xdIczPATPnPnmZisv6mNsv/NaBGBfa1/+fHfidVb91ICAmGCjvCTh+QdIkF8p7fAAAAPFJREFUOkrjhyREX+j/0RB0zu28phC6DpHbVyGEBzqqj8M10HVz9gjNVQi9Vl5F5cscRM0VZx3CDzV+60B40Y1/7g7sgfhz37t/5M6ngdAxtYrVXeQ6+6AfTdatnSFETaW7h7DSYa6F4KCj6s8Cug8ir9aquNyz0s1B9IWO1oQQvPIxIDToPyLzulXuHlmruGkgbNr4zB1oAwF96uA6v9quPInOIfpWtRAa0GTXCYHjF1LoKH4MF2d+xUHvB5Hbf4buXekQPYBKbpx7CBuZEvGKRLVUvAOY9gVmrhUXCXR/G4jCt6kH7sAeiG98039Cq/8CAAD//9R58mIAAAAGSURBVAMA1VHUBsahw2wAAAAASUVORK5CYII=",
    "PNG",
    23,
    y + 6,
    22,
    22,
    "qr-avis-google"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 57, 72);
  doc.text("Votre avis compte !", 56, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Un petit avis Google m'aide à faire connaître", 56, y + 15);
  doc.text("Adrien et ses mains. Merci pour votre confiance !", 56, y + 19.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 57, 72);
  doc.text("Scannez ce QR code pour partager votre expérience.", 56, y + 27);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += hauteurBlocAvis + 3;
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
  "En cas de retard de paiement, des pénalités calculées au taux légal en vigueur seront appliquées,",
  105,
  256,
  { align: "center" }
);

doc.text(
  "ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement (article L441-10 du Code de commerce).",
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

// Figer le PDF émis : un nouveau clic rend exactement le même document.
const pdfBase64 = doc.output("datauristring").split(",")[1];
if (estAcompte && dossierOrigineAcompte) {
  const factureAcompte = {
    numero, date: dateDocument, montant: montantDocumentAcompte,
    totalDevis: calcul.total, pdfBase64, nomFichier,
  };
  const historiqueMisAJour = historique.map((d) =>
    d.id === dossierOrigineAcompte.id || d.devisOrigineId === dossierOrigineAcompte.id
      ? { ...d, factureAcompte } : d);
  const sauvegarde = {
    ...construireSauvegardeComplete(),
    historique: historiqueMisAJour,
    compteurFacture: numeroSuivantAcompte + 1,
  };
  // Persister avant téléchargement : ni numéro final, ni encaissement ne changent.
  ecrireStockageLocal(CLE_SAUVEGARDE_V25, JSON.stringify(sauvegarde));
  ecrireStockageLocal(CLE_DERNIERE_MODIFICATION_LOCALE_V26, new Date().toISOString());
  ecrireStockageLocal(CLE_RATTRAPAGE_FACTURE_017, "oui");
  setHistorique(historiqueMisAJour);
  setCompteurFacture(numeroSuivantAcompte + 1);
  void envoyerDonneesCloud(sauvegarde, false);
}
if (estSituation) {
  const facture: FactureIntermediaire = {
    numero, date: dateDocument, montant: montantSituationCentimes / 100,
    cumulFacture: cumulSituationCentimes / 100, totalDevis: calcul.total,
    description: descriptionSituation.trim(), dateTravaux: dateTravauxSituation,
    pdfBase64, nomFichier,
  };
  sauvegarderFacturesIntermediaires([...facturesIntermediairesCourantes, facture], undefined, numeroSuivantAcompte + 1);
  setMontantSituation(0);
  setDescriptionSituation("");
}
doc.save(nomFichier);
return pdfBase64;
};

// 🔥 FERMETURE PROPRE DE LA FONCTION genererPDF

const genererFicheChantier = () => {
  if (lignesTravaux.length === 0) {
    alert("Ajoute au moins une prestation avant de générer la fiche chantier.");
    return;
  }

  const doc = new jsPDF();
  const largeurPage = 210;
  const marge = 15;
  const largeurUtile = largeurPage - marge * 2;
  let y = 18;

  // La détection du matériel et des vigilances repose uniquement sur le nom
  // des prestations. Les détails PDF peuvent contenir des mots génériques
  // (SPEC, carrelage, douche...) qui déclenchaient auparavant des conseils
  // sans rapport avec le chantier réel.
  const textePrestations = normaliserTexte(
    lignesTravaux.map((ligne) => ligne.prestationNom || "").join(" ")
  );

  const outils = new Set<string>([
    "Protections, bâches, ruban de masquage et sacs à gravats",
    "Mètre, crayon, niveau et petit outillage à main",
    "Aspirateur de chantier et matériel de nettoyage",
  ]);

  if (/faience|carrelage|spec|etancheite|receveur/.test(textePrestations)) {
    outils.add("Perforateur, burineur et équipements de protection");
    outils.add("Coupe-carreaux, meuleuse, peignes, croisillons et malaxeur");
    outils.add("Rouleaux, pinceaux et accessoires d’application du SPEC");
  }
  if (/plomberie|receveur|vasque|robinet|mitigeur|siphon|vidage|evacuation/.test(textePrestations)) {
    outils.add("Clés de plomberie, pince multiprise et matériel de raccordement");
    outils.add("Matériel de contrôle d’écoulement et d’étanchéité");
  }
  if (/peinture|enduit|ratissage|poncage/.test(textePrestations)) {
    outils.add("Couteaux à enduire, ponceuse, abrasifs, rouleaux et pinceaux");
  }
  if (/sol pvc|revetement de sol|plinthe/.test(textePrestations)) {
    outils.add("Cutter, règle, cale de frappe et outils de découpe du revêtement");
  }
  if (/plan de travail/.test(textePrestations)) {
    outils.add("Scie circulaire, scie sauteuse, tréteaux, serre-joints et guide de coupe");
  }
  if (/ventilation|entree d air|grille exterieure|traversee murale/.test(textePrestations)) {
    outils.add("Perforateur, scie-cloche ou carotteuse adaptée au support");
    outils.add("Détecteur de matériaux et matériel de calfeutrement");
  }

  const lignesFournitures = (detailsFournitures?.trim() || "")
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter(Boolean)
    .map((ligne) =>
      ligne
        .replace(/(\d+)€(\d{2})\b/g, "$1,$2 €")
        .replace(/(\d+(?:[.,]\d+)?)\s*€/g, "$1 €")
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
        `Fiche chantier interne - ${numeroDevis || "Devis non numéroté"}`,
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
    nouvellePageSiBesoin(13);
    doc.setFillColor(52, 63, 79);
    doc.roundedRect(marge, y, largeurUtile, 7.5, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(titre.toUpperCase(), marge + 4, y + 5.2);
    y += 10;
  };

  const ajouterTexte = (
    texte: string,
    options?: { gras?: boolean; retrait?: number; taille?: number; couleur?: number[] }
  ) => {
    const retrait = options?.retrait || 0;
    const taille = options?.taille || 9;
    const lignes = doc.splitTextToSize(texte || "-", largeurUtile - retrait);
    const hauteur = lignes.length * 3.6 + 0.5;

    nouvellePageSiBesoin(hauteur);
    doc.setFont("helvetica", options?.gras ? "bold" : "normal");
    doc.setFontSize(taille);
    const couleur = options?.couleur || [30, 41, 59];
    doc.setTextColor(couleur[0], couleur[1], couleur[2]);
    doc.text(lignes, marge + retrait, y);
    y += hauteur;
  };

  const ajouterListe = (elements: string[]) => {
    elements.filter(Boolean).forEach((element) => {
      ajouterTexte(`- ${element}`, { retrait: 3, taille: 7.7 });
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
  doc.text(numeroDevis || "Devis non numéroté", largeurPage - marge, 14, {
    align: "right",
  });
  doc.text(new Date().toLocaleDateString("fr-FR"), largeurPage - marge, 22, {
    align: "right",
  });
  y = 41;

  ajouterTitreSection("Identification du chantier");
  const yIdentification = y;
  const largeurColonneGauche = 108;
  const xEncadre = marge + largeurColonneGauche + 5;
  const largeurEncadre = largeurUtile - largeurColonneGauche - 5;
  let yGauche = yIdentification;

  const ajouterInfoGauche = (texte: string, gras = false) => {
    doc.setFont("helvetica", gras ? "bold" : "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(30, 41, 59);
    const lignes = doc.splitTextToSize(texte, largeurColonneGauche);
    doc.text(lignes, marge, yGauche);
    yGauche += lignes.length * 4.1 + 0.8;
  };

  if (modeClient === "agence") {
    ajouterInfoGauche(`Agence : ${agence || client || "Non renseignée"}`, true);
    ajouterInfoGauche(
      `Adresse chantier : ${`${adresse || ""} ${complementAdresse || ""}`.trim() || "Non renseignée"}`
    );
    if (referenceChantier) ajouterInfoGauche(`Référence : ${referenceChantier}`);
    if (locataire) {
      ajouterInfoGauche(
        `Locataire / contact : ${locataire}${telephoneLocataire ? ` - ${telephoneLocataire}` : ""}`
      );
    } else if (telephoneLocataire) {
      ajouterInfoGauche(`Téléphone locataire : ${telephoneLocataire}`);
    }
    if (proprietaire) {
      ajouterInfoGauche(
        `Propriétaire : ${proprietaire}${telephoneProprietaire ? ` - ${telephoneProprietaire}` : ""}`
      );
    } else if (telephoneProprietaire) {
      ajouterInfoGauche(`Téléphone propriétaire : ${telephoneProprietaire}`);
    }
  } else if (modeClient === "jeremie") {
    ajouterInfoGauche(`Donneur d’ordre : ${client || "Jérémie Meurisse"}`, true);
    ajouterInfoGauche(`Client chantier : ${clientFinalNom || "Non renseigné"}`);
    ajouterInfoGauche(`Adresse chantier : ${clientFinalAdresse || "Non renseignée"}`);
    if (clientFinalTelephone) ajouterInfoGauche(`Téléphone client : ${clientFinalTelephone}`);
  } else {
    ajouterInfoGauche(`Client : ${client || "Non renseigné"}`, true);
    ajouterInfoGauche(
      `Adresse : ${`${adresse || ""} ${complementAdresse || ""}`.trim() || "Non renseignée"}`
    );
    if (telephone) ajouterInfoGauche(`Téléphone : ${telephone}`);
    if (email) ajouterInfoGauche(`Email : ${email}`);
  }

  if (dateChantier) {
    ajouterInfoGauche(`Date prévue : ${dateChantier}${heureChantier ? ` à ${heureChantier}` : ""}`);
  }

  const infosPratiques = [
    ["Trajet", `${Number(kmAller || 0).toFixed(1)} km aller`],
    ["Aller-retour", `${Number(calcul.kmAR || 0).toFixed(1)} km`],
    ["Déplacement", `${formatMontant(Number(calcul.fraisLogistique || 0))} €`],
    ["Temps prévu", `${Number(calcul.totalHeuresChantier || 0).toFixed(1)} h`],
    ["Durée estimée", `${calcul.nombreJoursChantier} jour${calcul.nombreJoursChantier > 1 ? "s" : ""}`],
    ["Achat fournitures", `${formatMontant(Number(achatFournitures || 0))} € TTC`],
  ];
  const hauteurEncadre = 9 + infosPratiques.length * 5.2;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.roundedRect(xEncadre, yIdentification - 3.5, largeurEncadre, hauteurEncadre, 2, 2, "FD");
  doc.setFillColor(71, 85, 105);
  doc.roundedRect(xEncadre, yIdentification - 3.5, largeurEncadre, 7.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("INFOS PRATIQUES", xEncadre + 3, yIdentification + 1.5);

  infosPratiques.forEach(([libelle, valeur], index) => {
    const yInfo = yIdentification + 7 + index * 5.2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${libelle} :`, xEncadre + 3, yInfo);
    doc.setTextColor(15, 23, 42);
    doc.text(valeur, xEncadre + largeurEncadre - 3, yInfo, { align: "right" });
  });

  y = Math.max(yGauche, yIdentification - 3.5 + hauteurEncadre) + 4;

  const largeurBloc = (largeurUtile - 5) / 2;
  const xBlocDroit = marge + largeurBloc + 5;
  const outilsListe = Array.from(outils);
  const fournituresListe = fournituresClient
    ? ["Fournitures à la charge du client"]
    : lignesFournitures.filter((ligne) => !/^total\b/i.test(normaliserTexte(ligne)));

  const hauteurListeCompacte = (elements: string[], largeur: number) =>
    elements.reduce((total, element) => {
      const lignes = doc.splitTextToSize(`- ${element}`, largeur - 6);
      return total + Math.max(3.6, lignes.length * 3.35);
    }, 0);

  const hauteurOutils = 11 + hauteurListeCompacte(outilsListe, largeurBloc);
  const hauteurFournitures =
    16 + hauteurListeCompacte(
      fournituresListe.length > 0
        ? fournituresListe
        : ["Vérifier la liste, les quantités, les références et la disponibilité"],
      largeurBloc
    );
  const hauteurBlocs = Math.max(hauteurOutils, hauteurFournitures);
  nouvellePageSiBesoin(hauteurBlocs + 5);
  const yBlocs = y;

  const dessinerBlocCompact = (
    titre: string,
    elements: string[],
    x: number,
    largeur: number,
    sousTitre?: string
  ) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, yBlocs, largeur, hauteurBlocs, 2, 2, "FD");
    doc.setFillColor(71, 85, 105);
    doc.roundedRect(x, yBlocs, largeur, 7.5, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.4);
    doc.setTextColor(255, 255, 255);
    doc.text(titre.toUpperCase(), x + 3, yBlocs + 5.1);

    let yLigne = yBlocs + 11;
    if (sousTitre) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.7);
      doc.setTextColor(15, 23, 42);
      doc.text(sousTitre, x + 3, yLigne);
      yLigne += 4.5;
    }

    elements.forEach((element) => {
      const lignes = doc.splitTextToSize(`- ${element}`, largeur - 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.1);
      doc.setTextColor(30, 41, 59);
      doc.text(lignes, x + 3, yLigne);
      yLigne += Math.max(3.6, lignes.length * 3.35);
    });
  };

  dessinerBlocCompact("Outils à prendre", outilsListe, marge, largeurBloc);
  dessinerBlocCompact(
    "Fournitures",
    fournituresListe.length > 0
      ? fournituresListe
      : ["Vérifier la liste, les quantités, les références et la disponibilité"],
    xBlocDroit,
    largeurBloc,
    fournituresClient
      ? undefined
      : `Coût matériaux : ${formatMontant(Number(achatFournitures || 0))} € TTC`
  );
  y = yBlocs + hauteurBlocs + 5;

  ajouterTitreSection("Prestations dans l’ordre du devis");
  lignesTravaux.forEach((ligne, index) => {
    const quantite = ligne.q1 || 1;
    ajouterTexte(
      `Étape ${index + 1} - ${ligne.prestationNom || "Prestation personnalisée"} - ${quantite} ${ligne.unite || "u"}`,
      { gras: true, taille: 8.5 }
    );
    ajouterListe(
      (ligne.detailsPdfPersonnalises?.length
        ? ligne.detailsPdfPersonnalises
        : detailsTravaux(ligne)
      ).filter((detail) => detail.trim())
    );
    y += 0.5;
  });

  const vigilance = new Set<string>([
    "Photographier les lieux et les équipements avant toute intervention",
    "Confirmer l’accès, le stationnement et la présence d’eau et d’électricité",
    "Protéger les circulations et les éléments conservés",
    "Faire valider toute anomalie ou prestation supplémentaire avant exécution",
  ]);

  if (/faience|carrelage|spec|etancheite|receveur/.test(textePrestations)) {
    vigilance.add("Contrôler l’humidité, la solidité et la planéité des supports après dépose");
    vigilance.add("Respecter les temps de séchage du support, du SPEC, de la colle et des joints");
    vigilance.add("Soigner les angles, traversées, liaisons avec le receveur et joints sanitaires");
  }
  if (/paroi|cabine/.test(textePrestations)) {
    vigilance.add("Manipuler les vitrages à deux personnes et contrôler les pièces avant réemploi");
  }
  if (/peinture/.test(textePrestations)) {
    vigilance.add("Vérifier le fonctionnement de la ventilation avant remise en peinture");
  }
  if (/plan de travail/.test(textePrestations)) {
    vigilance.add("Contrôler les dimensions, l’équerrage, les découpes et la position de l’évier avant coupe");
    vigilance.add("Protéger et étancher soigneusement tous les chants découpés");
  }
  if (/ventilation|entree d air|grille exterieure|traversee murale/.test(textePrestations)) {
    vigilance.add("Contrôler l’absence de réseau dans la zone avant tout percement");
    vigilance.add("Vérifier le diamètre, la pente vers l’extérieur et l’étanchéité du passage");
  }

  ajouterTitreSection("Points de vigilance");
  ajouterListe(Array.from(vigilance));

  ajouterTitreSection("Contrôles du chantier");
  ajouterListe([
    "Photos avant travaux réalisées",
    "Implantation et dimensions contrôlées",
    "Fournitures et consommables vérifiés",
    "Protections mises en place",
    "Essais et contrôles de fin d’intervention réalisés",
    "Photos de fin de chantier réalisées",
    "Déchets évacués et zone nettoyée",
  ]);

  ajouterTitreSection("Suivi réel et imprévus");
  ajouterTexte(`Heures réellement effectuées : ____________________`, { taille: 8.5 });
  ajouterTexte(`Travaux supplémentaires validés : ______________________________________________`, { taille: 8.5 });
  ajouterTexte(`Imprévus / anomalies constatés : _______________________________________________`, { taille: 8.5 });
  ajouterTexte(`______________________________________________________________________________`, { taille: 8.5 });

  if (notes?.trim()) {
    ajouterTitreSection("Notes du dossier");
    ajouterTexte(notes.trim());
  }

  ajouterPiedDePage();

  const nomClientFichier = (clientFinalNom || locataire || client || "chantier")
    .replace(/[^a-zA-Z0-9À-ÿ -]/g, "")
    .trim();

  doc.save(
    `FICHE-${numeroDevis || "CHANTIER"}-${nomClientFichier || "chantier"}.pdf`
  );
};

return (
  <main className="atelier-app min-h-screen p-3 md:p-4">
<PlanningChantiers historique={historique} donnees={planningDonnees}
  onChange={(p) => { planningModifieRef.current = true; setEtatPlanningCloud("Enregistrement…"); setPlanningDonnees(p); }}
  ouvrir={rechargerDossier} />
{etatPlanningCloud && <div className="mb-2 flex items-center gap-2 text-xs text-slate-600" role="status">{etatPlanningCloud}
  {etatPlanningCloud.includes("réessayer") && <button type="button" className="underline" onClick={envoyerCloud}>Réessayer la synchronisation</button>}
</div>}

<div className="atelier-toolbar sticky top-0 z-40 mb-2 rounded-xl border p-2 backdrop-blur">
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
        ["Total", `${formatMontant(resumeExpress.totalDevis)} €`],
        ["Encaissé", `${formatMontant(resumeExpress.dejaEncaisse)} €`],
        ["Reste", `${formatMontant(resumeExpress.resteReel)} €`],
        ["Paiement", resumeExpress.paiementPrevu || "-"],
        ["Priorité", resumeExpress.prioriteActuelle || "-"],
      ].map(([titre, valeur]) => (
        <div key={titre} className="rounded-lg border bg-white px-2 py-1">
          <p className="text-[10px] font-semibold text-slate-500">{titre}</p>
          <p className="truncate text-sm font-bold text-slate-900">{valeur}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1 xl:grid-cols-[repeat(14,minmax(0,1fr))]">
      <button
        onClick={() => {
          setFicheOuverte(true);
          setStatutDevis("estimation_rapide");
          setNumeroDevis("");
          setNumeroFacture("");
        }}
        className="btn-orange px-2 py-1 text-[11px]"
      >
        ⚡ Esti.
      </button>

      <button onClick={nouveauDossier} className="btn-dark px-2 py-1 text-[11px]">
        Nouveau
      </button>

      <button onClick={enregistrer} className="btn-amber px-2 py-1 text-[11px]">
        Enregistrer
      </button>

      {!estAndroid && (
        <button onClick={() => genererPDF("devis")} className="btn-blue px-2 py-1 text-[11px]">
          PDF devis
        </button>
      )}

      <button
        onClick={genererFicheChantier}
        className="btn-outline px-2 py-1 text-[11px]"
      >
        Fiche chantier
      </button>

      {!estAndroid && (
        <>
          <button onClick={() => genererPDF("facture")} className="btn-emerald px-2 py-1 text-[11px]">
            PDF facture
          </button>
          <button type="button" disabled={generationPDFEnCours}
            onClick={() => genererPDF("acompte")}
            className="btn-amber px-2 py-1 text-[11px] disabled:opacity-50">
            {factureAcompteCourante ? "PDF acompte" : "Facture d'acompte"}
          </button>

          <button onClick={envoyerDevisMail} className="btn-green px-2 py-1 text-[11px]">
            Mail devis
          </button>

          <button onClick={envoyerFactureMail} className="btn-green px-2 py-1 text-[11px]">
            Mail facture
          </button>
        </>
      )}

     
      {numeroFacture.trim() && !facturePayee &&
        Math.round((calcul.total - montantEncaisse) * 100) > 0 && (
        <button
          type="button"
          onClick={() => preparerRelance({
            numeroFacture, numeroDevis, client, email,
            total: calcul.total, montantEncaisse, facturePayee,
            factureAcompte: factureAcompteCourante, facturesIntermediaires: facturesIntermediairesCourantes,
            montantAcompteEncaisse: dossierActuel?.montantAcompteEncaisse,
            referenceChantier, adresse, complementAdresse,
          })}
          className="btn-amber px-2 py-1 text-[11px]"
          title="Ouvrir un mail de relance prérempli à vérifier avant envoi"
        >
          Mail de relance
        </button>
      )}

      <button type="button" onClick={annulerDerniereModification} disabled={!historiqueAnnulation.length} title="Annuler la dernière modification des prestations ou conditions" className="btn-outline px-2 py-1 text-[11px] disabled:opacity-40">↶ Retour</button>

      <button onClick={exporter} className="btn-purple px-2 py-1 text-[11px]">
        Export
      </button>

      <button onClick={() => importRef.current?.click()} className="btn-outline px-2 py-1 text-[11px]">
        Import
      </button>


    </div>

    <details className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
      <summary className="cursor-pointer select-none text-[11px] font-semibold text-slate-500">
        ⚙️ Secours cloud
      </summary>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button onClick={envoyerCloud} className="btn-blue px-2 py-1 text-[11px]">
          ☁️ Forcer la sauvegarde cloud
        </button>
        <button onClick={recupererCloud} className="btn-emerald px-2 py-1 text-[11px]">
          📥 Forcer le chargement cloud
        </button>
      </div>
    </details>
  </div>

  {/* VERSION TÉLÉPHONE */}
  <div className="space-y-1 md:hidden">
    <div className="grid grid-cols-6 gap-1">
      {[
        ["Client", resumeExpress.clientEnCours || "-"],
        ["Total", `${formatMontant(resumeExpress.totalDevis)} €`],
        ["Enc.", `${formatMontant(resumeExpress.dejaEncaisse)} €`],
        ["Reste", `${formatMontant(resumeExpress.resteReel)} €`],
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
        Enreg. ☁️
      </button>

      <button
        onClick={genererFicheChantier}
        className="rounded-md border border-violet-200 bg-violet-50 px-1 py-1 text-[10px] font-bold text-violet-800"
      >
        Fiche
      </button>

      
      
    </div>

    <details className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
      <summary className="cursor-pointer select-none text-[10px] font-semibold text-slate-500">
        ⚙️ Secours cloud
      </summary>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button
          onClick={envoyerCloud}
          className="rounded-md border border-blue-200 bg-blue-50 px-1 py-1 text-[10px] font-bold text-blue-800"
        >
          Sauvegarder
        </button>
        <button
          onClick={recupererCloud}
          className="rounded-md border border-emerald-200 bg-emerald-50 px-1 py-1 text-[10px] font-bold text-emerald-800"
        >
          Charger
        </button>
      </div>
    </details>
  </div>
</div>
    <style jsx global>{`
  .atelier-app {
    --atelier-encre: #204d59;
    --atelier-texte: #354f57;
    --atelier-discret: #58747d;
    --atelier-bord: rgba(52, 134, 145, .23);
    color: var(--atelier-texte);
    background: linear-gradient(135deg, #e6f3f1 0%, #fff7e8 52%, #e5f2f5 100%);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "DejaVu Sans", sans-serif;
    font-size: 13px;
    line-height: 1.45;
    min-height: 100vh;
  }
  .atelier-app *, .atelier-app *::before, .atelier-app *::after { box-sizing: border-box; }
  .atelier-app .planning-table thead th,
  .atelier-app .planning-table thead th button { color: #fff !important; }
  .atelier-app .planning-table thead th { background: #173e42 !important; }
  .atelier-app .planning-chantiers .planning-table :is(input:not([type="checkbox"]),textarea) {
    min-height: 28px; padding: 3px 6px; font-size: 12px; line-height: 18px;
    color: #173e42; background: rgba(255,255,255,.92);
  }
  .atelier-app .planning-chantiers .planning-table textarea { resize: none; }
  .atelier-app .planning-chantiers .planning-table textarea::placeholder { color: #687b82; font-weight: 400; }
  .atelier-app .planning-chantiers .planning-table tbody .planning-identity { border-top: 1px solid #a8c2c5; }

  .atelier-app .atelier-toolbar {
    max-width: 1280px; margin-left: auto; margin-right: auto;
    background: rgba(246, 253, 250, .97);
    border-color: var(--atelier-bord);
    box-shadow: 0 3px 18px rgba(35, 64, 74, .045);
  }
  .atelier-app .atelier-panel {
    border: 1px solid var(--atelier-bord);
    border-radius: 12px;
    background: rgba(255,255,255,.92);
    padding: 9px 12px;
    box-shadow: 0 2px 9px rgba(35,64,74,.025);
  }
  .atelier-app .atelier-panel > button {
    min-height: 30px; border-radius: 7px;
    background: linear-gradient(100deg, rgba(94,183,188,.17), rgba(227,180,73,.09));
    padding: 3px 7px;
  }
  .atelier-app .atelier-result:has(> p:is(.text-green-700,.text-emerald-700)) {
    background: rgba(170,220,186,.35); border-color: rgba(105,176,133,.32);
  }
  .atelier-app .atelier-result:has(> p:is(.text-amber-700,.text-orange-600,.text-orange-700)) {
    background: rgba(255,218,145,.32); border-color: rgba(208,162,62,.32);
  }
  .atelier-app .atelier-result:has(> p:is(.text-red-700,.text-red-600)) {
    background: rgba(241,193,196,.27); border-color: rgba(212,138,149,.3);
  }

  .atelier-app .atelier-panel h2 {
    font-size: 14px; line-height: 1.35; font-weight: 650;
    color: var(--atelier-encre); letter-spacing: -.015em;
  }
  .atelier-app .atelier-panel .atelier-panel {
    background: rgba(217,240,238,.48); box-shadow: none;
  }
  .atelier-app .atelier-toggle {
    background: rgba(69,152,165,.19); color: #315f6c;
    border: 1px solid rgba(69,152,165,.3);
    border-radius: 7px; padding: 3px 8px;
    font-size: 10px; font-weight: 600; white-space: nowrap;
  }
  .atelier-app .atelier-brand {
    border: 1px solid rgba(197,153,66,.4);
    border-left: 3px solid rgba(197,153,66,.85);
    border-radius: 12px; padding: 11px 14px;
    background: linear-gradient(105deg, rgba(171,220,221,.82), rgba(255,225,164,.72));
    box-shadow: none; color: var(--atelier-encre);
  }
  .atelier-app .atelier-brand h1 { font-size: 16px; line-height: 1.35; font-weight: 600; margin-top: 2px; }
  .atelier-app .atelier-brand > p:first-of-type {
    color: #786844; font-size: 11px; letter-spacing: .08em; font-weight: 600;
  }
  .atelier-app .atelier-brand > p:last-of-type { font-size: 11px; color: var(--atelier-discret); margin-top: 2px; }
  .atelier-app .atelier-backups { float: right; padding: 0; margin-left: 12px; max-width: 55%; background: transparent; border: 0; }
  .atelier-app .atelier-backups > button { padding: 6px 9px; font-size: 11px; font-weight: 600; }
  .atelier-app [class*="btn-"] {
    border: 1px solid var(--atelier-bord);
    border-radius: 8px; padding: 6px 10px;
    min-height: 32px; font-size: 12px; line-height: 1.35; font-weight: 600;
    box-shadow: none; transition: background .16s ease, border-color .16s ease, box-shadow .16s ease;
  }
  .atelier-app .atelier-toolbar [class*="btn-"] { min-height: 29px; padding: 5px 7px; font-size: 11px; }
  .atelier-app .btn-blue { background: rgba(59,152,173,.22); color: #355b68; border-color: rgba(59,152,173,.35); }
  .atelier-app .btn-green, .atelier-app .btn-emerald { background: rgba(105,176,133,.23); color: #486755; border-color: rgba(105,176,133,.36); }
  .atelier-app .btn-amber { background: rgba(227,180,73,.25); color: #77643c; border-color: rgba(208,162,62,.4); }
  .atelier-app .btn-orange { background: rgba(224,154,117,.23); color: #805e50; border-color: rgba(213,143,106,.36); }
  .atelier-app .btn-purple { background: rgba(174,142,201,.22); color: #6b5e79; border-color: rgba(174,142,201,.35); }
  .atelier-app .btn-dark, .atelier-app .btn-outline { background: rgba(92,158,171,.13); color: #4c6670; }
  .atelier-app [class*="btn-"]:hover:not(:disabled) { filter: none; box-shadow: 0 2px 6px rgba(35,64,74,.07); border-color: rgba(61,95,105,.34); }
  .atelier-app button { cursor: pointer; }
  .atelier-app button:disabled { cursor: default; }
  .atelier-app :is(button,input,select,textarea,summary):focus-visible {
    outline: 2px solid #718f96; outline-offset: 2px;
  }
  .atelier-app :is(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),select,textarea) {
    background: rgba(255,255,255,.8); color: var(--atelier-texte);
    border: 1px solid rgba(86,118,127,.22); border-radius: 8px;
    padding: 6px 9px; font-size: 13px; line-height: 1.4; min-height: 33px;
  }
  .atelier-app :is(input,textarea)::placeholder { color: #8b989b; }
  .atelier-app :is(input[type="checkbox"],input[type="radio"]) { accent-color: #678892; }
  .atelier-app textarea { min-height: 58px; }
  .atelier-app label { font-size: 11px; color: #526b73; }
  .atelier-app .atelier-result {
    border: 1px solid rgba(70,145,156,.24); border-radius: 9px;
    background: rgba(213,237,239,.55); padding: 6px 10px;
  }
  .atelier-app .atelier-result > p:first-child { font-size: 10px; color: #6a7e83; }
  .atelier-app .atelier-result > p:last-child { font-size: 16px; line-height: 1.4; font-weight: 650; font-variant-numeric: tabular-nums; }
  .atelier-app .gap-6 { gap: 14px; }
  .atelier-app .gap-3 { gap: 9px; }
  .atelier-app .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 9px; }
  .atelier-app .mt-3 { margin-top: 9px; }
  .atelier-app .mb-3 { margin-bottom: 9px; }
  .atelier-app .mt-4 { margin-top: 12px; }
  .atelier-app .p-4 { padding: 12px; }
  .atelier-app .shadow-sm { box-shadow: 0 2px 8px rgba(35,64,74,.035); }
  .atelier-app .border { border-color: var(--atelier-bord); }
  .atelier-app .text-white { color: var(--atelier-encre); }
  .atelier-app :is(.text-slate-900,.text-slate-800) { color: var(--atelier-encre); }
  .atelier-app :is(.text-slate-500,.text-slate-600) { color: var(--atelier-discret); }
  .atelier-app :is(.bg-white,.bg-slate-50,.bg-slate-100) { background-color: rgba(247,253,250,.9); }
  /* Couleurs d’état lisibles, sur des fonds pastel peu saturés. */
  .atelier-app :is(.text-blue-300,.text-blue-400,.text-blue-500,.text-blue-600,.text-blue-700,.text-blue-800,.text-blue-900) { color: #496c7a; }
  .atelier-app :is(.bg-blue-50,.bg-blue-100,.bg-blue-200,.bg-blue-300,.bg-blue-400,.bg-blue-500,.bg-blue-600,.bg-blue-700) { background-color: rgba(59,152,173,.2); }
  .atelier-app :is(.border-blue-100,.border-blue-200,.border-blue-300,.border-blue-400,.border-blue-500) { border-color: rgba(105,149,164,.28); }
  .atelier-app :is(.text-green-300,.text-green-400,.text-green-500,.text-green-600,.text-green-700,.text-green-800,.text-green-900) { color: #4e705c; }
  .atelier-app :is(.bg-green-50,.bg-green-100,.bg-green-200,.bg-green-300,.bg-green-400,.bg-green-500,.bg-green-600,.bg-green-700) { background-color: rgba(105,176,133,.21); }
  .atelier-app :is(.border-green-100,.border-green-200,.border-green-300,.border-green-400,.border-green-500) { border-color: rgba(133,166,146,.28); }
  .atelier-app :is(.text-emerald-300,.text-emerald-400,.text-emerald-500,.text-emerald-600,.text-emerald-700,.text-emerald-800,.text-emerald-900) { color: #4e705c; }
  .atelier-app :is(.bg-emerald-50,.bg-emerald-100,.bg-emerald-200,.bg-emerald-300,.bg-emerald-400,.bg-emerald-500,.bg-emerald-600,.bg-emerald-700) { background-color: rgba(105,176,133,.21); }
  .atelier-app :is(.border-emerald-100,.border-emerald-200,.border-emerald-300,.border-emerald-400,.border-emerald-500) { border-color: rgba(133,166,146,.28); }
  .atelier-app :is(.text-amber-300,.text-amber-400,.text-amber-500,.text-amber-600,.text-amber-700,.text-amber-800,.text-amber-900) { color: #7c6840; }
  .atelier-app :is(.bg-amber-50,.bg-amber-100,.bg-amber-200,.bg-amber-300,.bg-amber-400,.bg-amber-500,.bg-amber-600,.bg-amber-700) { background-color: rgba(227,180,73,.23); }
  .atelier-app :is(.border-amber-100,.border-amber-200,.border-amber-300,.border-amber-400,.border-amber-500) { border-color: rgba(195,172,115,.28); }
  .atelier-app :is(.text-yellow-300,.text-yellow-400,.text-yellow-500,.text-yellow-600,.text-yellow-700,.text-yellow-800,.text-yellow-900) { color: #7c6840; }
  .atelier-app :is(.bg-yellow-50,.bg-yellow-100,.bg-yellow-200,.bg-yellow-300,.bg-yellow-400,.bg-yellow-500,.bg-yellow-600,.bg-yellow-700) { background-color: rgba(227,180,73,.23); }
  .atelier-app :is(.border-yellow-100,.border-yellow-200,.border-yellow-300,.border-yellow-400,.border-yellow-500) { border-color: rgba(195,172,115,.28); }
  .atelier-app :is(.text-orange-300,.text-orange-400,.text-orange-500,.text-orange-600,.text-orange-700,.text-orange-800,.text-orange-900) { color: #876354; }
  .atelier-app :is(.bg-orange-50,.bg-orange-100,.bg-orange-200,.bg-orange-300,.bg-orange-400,.bg-orange-500,.bg-orange-600,.bg-orange-700) { background-color: rgba(224,154,117,.22); }
  .atelier-app :is(.border-orange-100,.border-orange-200,.border-orange-300,.border-orange-400,.border-orange-500) { border-color: rgba(192,151,132,.28); }
  .atelier-app :is(.text-red-300,.text-red-400,.text-red-500,.text-red-600,.text-red-700,.text-red-800,.text-red-900) { color: #94686a; }
  .atelier-app :is(.bg-red-50,.bg-red-100,.bg-red-200,.bg-red-300,.bg-red-400,.bg-red-500,.bg-red-600,.bg-red-700) { background-color: rgba(212,138,149,.18); }
  .atelier-app :is(.border-red-100,.border-red-200,.border-red-300,.border-red-400,.border-red-500) { border-color: rgba(188,137,140,.28); }
  .atelier-app :is(.text-purple-300,.text-purple-400,.text-purple-500,.text-purple-600,.text-purple-700,.text-purple-800,.text-purple-900) { color: #756582; }
  .atelier-app :is(.bg-purple-50,.bg-purple-100,.bg-purple-200,.bg-purple-300,.bg-purple-400,.bg-purple-500,.bg-purple-600,.bg-purple-700) { background-color: rgba(174,142,201,.2); }
  .atelier-app :is(.border-purple-100,.border-purple-200,.border-purple-300,.border-purple-400,.border-purple-500) { border-color: rgba(158,146,175,.28); }

  .atelier-app :is(.text-violet-600,.text-violet-700,.text-violet-800) { color: #756582; }
  .atelier-app :is(.bg-violet-50,.bg-violet-100,.bg-violet-200) { background-color: rgba(174,142,201,.2); }
  .atelier-app :is(.border-violet-100,.border-violet-200,.border-violet-300) { border-color: rgba(158,146,175,.28); }
  .atelier-app :is(.bg-blue-600,.bg-green-600,.bg-emerald-600,.bg-red-600,.bg-purple-600,.bg-orange-600) { color: #344f58; }
  @media (prefers-reduced-motion: reduce) { .atelier-app * { transition: none !important; } }
  @media (max-width: 767px) {
    .atelier-app { padding: 5px; font-size: 11px; line-height: 1.3; }
    .atelier-app .atelier-panel { padding: 4px 6px; }
    .atelier-app .atelier-panel > button { min-height: 28px; }
    .atelier-app .atelier-panel h2 { font-size: 12px; line-height: 1.3; }
    .atelier-app .atelier-brand { padding: 6px 8px; }
    .atelier-app .atelier-brand h1 { font-size: 13px; }
    .atelier-app .atelier-brand > p:last-of-type { font-size: 10px; }
    .atelier-app .atelier-backups { float: none; max-width: none; margin: 0 0 5px; }
    .atelier-app .atelier-backups > button { font-size: 10px; padding: 5px 7px; }
    .atelier-app .text-xs { font-size: 10px; line-height: 1.35; }
    .atelier-app .text-sm { font-size: 11px; line-height: 1.35; }
    .atelier-app .text-base { font-size: 12px; line-height: 1.35; }
    .atelier-app .text-lg { font-size: 13px; line-height: 1.35; }
    .atelier-app .text-xl { font-size: 14px; line-height: 1.35; }
    .atelier-app .text-2xl { font-size: 16px; line-height: 1.3; }
    .atelier-app label { font-size: 10px; }
    .atelier-app [class*="btn-"] { min-height: 34px; padding: 4px 7px; font-size: 10px; }
    .atelier-app .atelier-toggle { font-size: 10px; padding: 2px 5px; }
    .atelier-app :is(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),select,textarea) {
      min-height: 32px; font-size: 12px; padding: 4px 7px;
    }
    .atelier-app textarea { min-height: 44px; }
    .atelier-app .atelier-result { padding: 4px 6px; }
    .atelier-app .atelier-result > p:first-child { font-size: 10px; }
    .atelier-app .atelier-result > p:last-child { font-size: 13px; line-height: 1.3; }
    .atelier-app :is(.gap-3,.gap-6) { gap: 5px; }
    .atelier-app .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 5px; }
    .atelier-app .mt-3 { margin-top: 5px; }
    .atelier-app .mb-3 { margin-bottom: 5px; }
    .atelier-app .p-4 { padding: 7px; }
  }
`}</style>
      <div key={versionParcoursDevis} className="mx-auto max-w-7xl space-y-3">
        <section className="atelier-brand">

<div className="atelier-backups">
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
    🔁 Sauvegardes de sécurité
    <span>{sauvegardesOuvertes ? "▲" : "▼"}</span>
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
          Devis, factures et suivi de votre activité.</p>
        {statutDevis === "estimation_rapide" && (
  <div className="mt-4 inline-block rounded-xl bg-yellow-400 px-4 py-2 font-bold text-slate-900">
    🟡 MODE ESTIMATION RAPIDE
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
      ←
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
      →
    </button>
  </div>

  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 mt-3">

    <MiniResult titre="Encaisse" valeur={`${formatMontant(tableauMensuel.totalEncaisse)} €`} couleur="text-green-700" />
    <MiniResult titre="Reste" valeur={`${formatMontant(tableauMensuel.resteAEncaisser)} €`} couleur="text-orange-600" />
    <MiniResult titre="Relance" valeur={`${formatMontant(tableauMensuel.totalRelance)} €`} couleur="text-red-600" />
    <MiniResult titre="Dépenses" valeur={`${formatMontant(tableauMensuel.totalDepenses)} €`} couleur="text-red-700" />
<MiniResult titre="Solde réel" valeur={`${formatMontant(tableauMensuel.soldeReel)} €`} couleur="text-blue-700" />
<MiniResult titre="URSSAF" valeur={`${formatMontant(tableauMensuel.estimationUrssaf)} €`} />
  </div>

  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
    <button type="button" aria-expanded={detailsEncaissementsOuverts}
      aria-controls="detail-encaissements-mois"
      onClick={() => setDetailsEncaissementsOuverts((ouvert) => !ouvert)}
      className="flex w-full items-center justify-between gap-2 text-left font-semibold text-slate-800">
      <span>Détail des encaissements ({tableauMensuel.encaissementsUniques.length})</span>
      <span>{detailsEncaissementsOuverts ? "▲ Masquer" : "▼ Afficher"}</span>
    </button>
    {detailsEncaissementsOuverts && (
      <div id="detail-encaissements-mois" className="mt-3 space-y-2 text-sm">
        {tableauMensuel.encaissementsUniques.length === 0 && (
          <p className="text-slate-500">Aucun règlement daté enregistré pour ce mois.</p>
        )}
        {tableauMensuel.encaissementsUniques.map((e) => (
          <div key={e.cle} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-100 py-2 last:border-0">
            <div className="min-w-0 flex-1 basis-48">
              <p className="truncate font-semibold text-slate-900" title={e.chantier || e.client}>{e.client}</p>
              <p className="text-xs text-slate-500">{e.date} · {e.nature} · {e.numero}
                {e.devis && e.devis !== e.numero ? ` · ${e.devis}` : ""}</p>
            </div>
            <span className="whitespace-nowrap font-semibold text-green-700">{formatMontant(e.montant)} €</span>
            <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => {
              const dossier = historique.find((d) => d.id === e.dossierId);
              if (dossier) rechargerDossier(dossier);
            }}>Ouvrir</button>
          </div>
        ))}
        <p className="font-semibold text-slate-800">Total des règlements : {formatMontant(tableauMensuel.totalEncaisseAutomatique)} €</p>
        {tableauMensuel.correctionManuelle && (
          <div className="rounded-lg bg-amber-50 p-3 text-amber-900">
            <p>Correction manuelle : {formatMontant(tableauMensuel.totalEncaisse - tableauMensuel.totalEncaisseAutomatique)} € d’écart avec les règlements enregistrés.</p>
            <p>Total retenu pour le mois : {formatMontant(tableauMensuel.totalEncaisse)} €. La correction n’est rattachée à aucun client.</p>
          </div>
        )}
      </div>
    )}
  </div>

  <SuiviAnnuelCA annee={anneeSelectionnee} suivi={suiviAnnuelCA} />

  <BlocRepliable titre="Corriger exceptionnellement les encaissements du mois" ouvertParDefaut={false}>
    <p className="text-sm text-slate-600">
      Choisissez le mois avec les flèches ci-dessus, puis indiquez le chiffre d’affaires
      réellement encaissé. Ce montant remplace le total du mois dans le graphique,
      le solde et l’estimation URSSAF à 21,5 %. Vos factures restent intactes.
    </p>
    <p className="mt-2 text-sm">
      Calcul automatique : <strong>{formatMontant(tableauMensuel.totalEncaisseAutomatique)} €</strong>
      {tableauMensuel.correctionManuelle && (
        <span className="ml-2 font-semibold text-amber-700">
          Correction active : {formatMontant(tableauMensuel.totalEncaisse)} €
        </span>
      )}
    </p>
    <form
      key={`${cleMoisStatistiques(anneeSelectionnee, moisSelectionne)}-${tableauMensuel.correctionManuelle ? tableauMensuel.totalEncaisse : "auto"}`}
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const valeur = new FormData(event.currentTarget).get("encaissementCorrige");
        const montant = lireMontantCorrection(String(valeur ?? ""));
        if (montant === null) {
          alert("Saisissez un montant positif ou nul, avec deux décimales maximum (exemple : 1990 ou 1990,50).");
          return;
        }
        void enregistrerCorrectionMensuelle(montant);
      }}
    >
      <label className="grid gap-1 text-sm font-medium">
        Encaissements corrigés du mois (€)
        <input
          name="encaissementCorrige" type="text" inputMode="decimal" required
          defaultValue={tableauMensuel.correctionManuelle ? formatMontant(tableauMensuel.totalEncaisse) : ""}
          placeholder="Ex. : 1990,00"
          disabled={correctionMensuelleEnCours}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <button type="submit" disabled={correctionMensuelleEnCours}
        className="btn-amber disabled:opacity-50">
        {correctionMensuelleEnCours ? "Enregistrement…" : "Appliquer la correction"}
      </button>
      {tableauMensuel.correctionManuelle && (
        <button type="button" disabled={correctionMensuelleEnCours}
          onClick={() => { void enregistrerCorrectionMensuelle(null); }}
          className="btn-outline disabled:opacity-50">
          Revenir au calcul automatique
        </button>
      )}
    </form>
    <p className="mt-2 text-xs text-slate-500">
      Un montant de 0 € est accepté. Les mois sans correction restent automatiques.
    </p>
  </BlocRepliable>

  {tableauMensuel.correctionManuelle && (
    <p className="mt-3 text-sm font-semibold text-amber-700" role="status">
      Encaissements corrigés manuellement pour ce mois — URSSAF recalculée sur ce montant.
    </p>
  )}

  {tableauMensuel.alerteFaible && (
    <div className="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm font-semibold text-orange-700">
      ⚠ Objectif non atteint — vigilance trésorerie
    </div>
  )}

  <BlocRepliable titre="Graphique mensuel" ouvertParDefaut={false}>
    <GraphiqueCourbe donnees={donneesGraphique} />
  </BlocRepliable>

</BlocRepliable>

<BlocRepliable titre="Dépenses entreprise" ouvertParDefaut={false}>
  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
    <MiniResult
      titre="Dépenses du mois"
      valeur={`${formatMontant(resumeDepenses.totalMois)} €`}
      couleur="text-red-700"
    />

    <MiniResult
      titre="Dépenses année"
      valeur={`${formatMontant(resumeDepenses.totalAnnee)} €`}
      couleur="text-orange-700"
    />

    <MiniResult
      titre="Nombre dépenses"
      valeur={`${resumeDepenses.nombreTotal}`}
      couleur="text-slate-900"
    />
  </div>

  <BlocRepliable titre="Graphique des dépenses par catégorie" ouvertParDefaut={false}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <button type="button" className="btn-outline" aria-label="Année précédente des dépenses"
        onClick={() => setAnneeGraphiqueDepenses((annee) => annee - 1)}>←</button>
      <span className="font-semibold" aria-live="polite">{anneeGraphiqueDepenses}</span>
      <button type="button" className="btn-outline" aria-label="Année suivante des dépenses"
        onClick={() => setAnneeGraphiqueDepenses((annee) => annee + 1)}>→</button>
    </div>
    <GraphiqueDepensesCategories donnees={donneesGraphiqueDepenses} annee={anneeGraphiqueDepenses} />
  </BlocRepliable>

  <div className="grid gap-3 md:grid-cols-5">
    <DateInput label="Date dépense" value={depenseDate} onChange={setDepenseDate} />

    <Select
      label="Catégorie"
      value={depenseCategorie}
      onChange={setDepenseCategorie}
      options={[
        ["Fournitures", "Fournitures"],
        ["Essence", "Essence"],
        ["Matériel", "Matériel"],
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
        ["Espèces", "Espèces"],
        ["Virement", "Virement"],
        ["Chèque", "Chèque"],
        ["Autre", "Autre"],
      ]}
    />
  </div>

  <button
    type="button"
    onClick={() => {
      if (!depenseMontant || depenseMontant <= 0) {
        alert("Indique un montant de dépense.");
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
    Ajouter dépense
  </button>

  <BlocRepliable titre={`Historique dépenses (${depenses.length})`} ouvertParDefaut={false}>
    {depensesTriees.length === 0 ? (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Aucune dépense enregistrée.
      </p>
    ) : (
      <div className="space-y-2">
        {depensesTriees.map((depense) => (
          <div key={depense.id} className="rounded-xl border bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">
                  {depense.date} — {depense.categorie}
                </p>

                <p className="text-slate-600">
                  {depense.description || "Sans description"} · {depense.modePaiement}
                </p>
              </div>

              <p className="font-bold text-red-700">
                {formatMontant((depense.montant || 0))} €
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const nouvelleDate = window.prompt("Date de la dépense :", depense.date);
                  if (nouvelleDate === null) return;

                  const nouvelleCategorie = window.prompt("Catégorie :", depense.categorie);
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
                  const confirmation = window.confirm("Supprimer cette dépense ?");
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
</BlocRepliable>

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
          <p className="text-sm text-slate-500">Aucun dossier trouvé.</p>
        ) : (
          resultatsCalendrier.map((d) => (
            <div key={d.id} className="rounded-xl border bg-white p-3 space-y-2">
              <p className="font-bold text-slate-800">
  {d.modeClient === "jeremie"
    ? d.clientFinalNom || d.client || "Client non renseigné"
    : d.modeClient === "agence"
    ? d.locataire || d.proprietaire || d.client || "Client non renseigné"
    : d.client || "Client non renseigné"}
</p>
              <p className="text-sm text-slate-600">📞 {d.telephone || "Téléphone non renseigné"}</p>
              <p className="text-sm text-slate-600">
  📍{" "}
  {d.modeClient === "jeremie"
    ? d.clientFinalAdresse || d.adresse || "Adresse non renseignée"
    : d.modeClient === "agence"
    ? `${d.adresse || ""} ${d.complementAdresse || ""}`.trim() ||
      "Adresse chantier non renseignée"
    : d.adresse || "Adresse non renseignée"}
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
      ←
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
      →
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
<section ref={ficheClientRef} className="grid gap-3">
  <BlocRepliable titre="Nouveau client / coordonnées" ouvert={ongletsDevis.client}
    onOuvertureChange={(ouvert) => reglerOngletDevis("client", ouvert)}>
    <div className="grid gap-3 md:grid-cols-2">
            <Select
  label="Client enregistré"
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
  <label className="text-sm font-medium">Téléphone</label>

  <input
    className="mt-2 w-full rounded-xl border p-3"
    value={telephone}
    list="liste-telephones-clients"
    placeholder="Tape le numéro du client..."
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
      label="Adresse de l’agence"
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
      label="Complément d’adresse / étage / appartement / bâtiment"
      value={complementAdresse}
      onChange={setComplementAdresse}
    />
    <TextArea label="Notes" value={notes} onChange={setNotes} />
  </>
)}
    </div>
          </BlocRepliable>

          <BlocRepliable titre="Dossier" ouvertParDefaut={false}>
            {dossierActuel?.devisOrigineId !== undefined && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-bold">Facture liée au devis {numeroDevis}</p>
                <p>Le devis original est conservé dans l’historique. Les nouvelles prestations sont marquées « Travaux supplémentaires » sur la facture.</p>
                <p>Les prix des lignes initiales sont figés, déplacement compris. Les éventuels jours supplémentaires sont répartis uniquement sur les nouvelles prestations.</p>
              </div>
            )}
            <NumberInput
  label="Montant déjà encaissé"
  value={montantEncaisse}
  onChange={setMontantEncaisse}
/>
            {!estAndroid ? (
              <>
                <Input label={dossierActuel?.devisOrigineId !== undefined ? "Devis d’origine de la facture" : "Numéro devis"} value={numeroDevis} onChange={setNumeroDevis} />
                <Input label="Numéro facture" value={numeroFacture} onChange={setNumeroFacture} />
              </>
            ) : (
              <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Mode Android : le dossier reste sans numéro. Le numéro du devis
                ou de la facture sera attribué uniquement depuis l'ordinateur.
              </p>
            )}

   
            <Select label="Type client" value={modeClient} onChange={setModeClient} options={[["jeremie", "Jérémie"], ["normal", "Particulier"], ["agence", "Agence immobilière"]]} />
{(modeClient === "agence" || modeClient === "jeremie") && (
  <div className="space-y-4 rounded-2xl border bg-slate-50 p-4">
   {modeClient === "agence" && (
  <>
    <Input label="Nom de l’agence" value={agence} onChange={setAgence} />
    <Input label="Référence chantier agence" value={referenceChantier} onChange={setReferenceChantier} />
    <Input label="Adresse chantier / appartement" value={adresse} onChange={setAdresse} />
    <Input label="Complément d’adresse / étage / appartement / bâtiment" value={complementAdresse} onChange={setComplementAdresse} />
        <Input label="Locataire" value={locataire} onChange={setLocataire} />
        <Input
          label="Téléphone locataire"
          value={telephoneLocataire}
          onChange={(v) => setTelephoneLocataire(formatTelephone(v))}
        />
        <Input label="Propriétaire" value={proprietaire} onChange={setProprietaire} />
        <Input
          label="Téléphone propriétaire"
          value={telephoneProprietaire}
          onChange={(v) => setTelephoneProprietaire(formatTelephone(v))}
        />
      </>
    )}

    {modeClient === "jeremie" && (
      <>
        <Input
          label="Client final de Jérémie"
          value={clientFinalNom}
          onChange={setClientFinalNom}
        />

        <Input
          label="Téléphone client final"
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
    ["envoye", "Devis envoyé"],
    ["accepte", "Devis accepté"],
    ["refuse", "Devis refusé"]
  ]}
/>
            <DateInput
  label="Date chantier prévue"
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
    Heure chantier prévue
  </label>

  <input
    type="time"
    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
    value={heureChantier}
    onChange={(e) => setHeureChantier(e.target.value)}
  />
</div>

<DateInput
  label="Date de paiement prévue"
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
        "⚠️ Incohérence : la date de paiement du solde ne peut pas être avant la date du chantier.\n\nSi c’est un acompte, indique-le plutôt dans 'Montant déjà encaissé'."
      );
      return;
    }

    setDatePaiement(v);
  }}
/>
          <Select
  label="Priorité dossier"
  value={priorite}
  onChange={setPriorite}
  options={[
    ["normale", "Normale"],
    ["urgente", "Urgente"],
    ["tres_urgente", "Très urgente"],
  ]}
/>
          </BlocRepliable>
        </section>
)}
<BlocRepliable titre="Prestations / lignes de travaux" ouvert={ongletsDevis.prestations}
  onOuvertureChange={(ouvert) => reglerOngletDevis("prestations", ouvert)}>
<div
  ref={lignesTravauxRef}
  className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"
>
  <div className="mb-4">
    <h3 className="text-base font-bold text-slate-800">
      {insertionApresId === null ? "Ajouter une prestation" : "Insérer une prestation"}
    </h3>

    <p className="mt-1 text-sm text-slate-500">
      Recherche directement une prestation ou
      sélectionne une catégorie.
    </p>
  </div>

  {insertionApresId !== null && (
    <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
      <p>Choisis une prestation : elle sera insérée après la ligne {lignesTravaux.findIndex(l => l.id === insertionApresId) + 1}.</p>
      <button type="button" onClick={() => setInsertionApresId(null)} className="mt-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 font-semibold">
        Annuler l’insertion
      </button>
    </div>
  )}

  {insertionApresId === null && (
  <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
    <div className="mb-3">
      <p className="text-sm font-bold text-blue-900">
        Packs de prestations V26
      </p>
      <p className="mt-1 text-xs text-blue-700">
        Les packs utilisent toujours les tarifs et les détails actuels du catalogue. Adapte les quantités au chantier après l’ajout.
      </p>
    </div>

    {Array.from(new Map(lignesTravaux.filter(l => l.packInstanceId).map(l => [l.packInstanceId!, l.packNom || "Pack"])).entries()).map(([instanceId, nom]) => (
      <div key={instanceId} className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-sm">
        <span className="font-semibold text-blue-900">{nom}</span>
        <button type="button" onClick={() => supprimerPackDuDevis(instanceId)} className="rounded-lg border border-red-300 px-3 py-1 font-semibold text-red-700 hover:bg-red-50">Supprimer pack</button>
      </div>
    ))}
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <select
        value={packSelectionne}
        onChange={(event) => setPackSelectionne(event.target.value)}
        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800"
      >
        <option value="">Choisir un pack de prestations</option>
        {Array.from(new Set(PACKS_PRESTATIONS_V26.map((pack) => pack.famille))).map((famille) => (
          <optgroup key={famille} label={famille}>
            {PACKS_PRESTATIONS_V26.filter((pack) => pack.famille === famille).map((pack) => (
              <option key={pack.id} value={pack.id}>{pack.nom}</option>
            ))}
          </optgroup>
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

    {packSelectionne === "PACK-SDB-RENOVATION" && (
      <div className="mt-3">
        <Select label="Revêtement de sol de la salle de bain" value={solSalleDeBain}
          onChange={(valeur) => setSolSalleDeBain(valeur === "carrelage" ? "carrelage" : "pvc")}
          options={[["pvc", "Sol PVC avec plinthes bois / MDF / PVC"], ["carrelage", "Carrelage au sol avec plinthes carrelées"]]} />
        <p className="mt-1 text-xs text-slate-600">Seul le revêtement choisi sera ajouté au devis. Renseigner les surfaces de faïence, de sol et les joints selon le chantier.</p>
      </div>
    )}

    {packSelectionne && (
      <p className="mt-3 text-xs text-slate-600">
        {
          PACKS_PRESTATIONS_V26.find(
            (pack) => pack.id === packSelectionne
          )?.description
        }
      </p>
    )}
  </div>

  )}

  <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
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
      label="Étape du chantier"
      value={categorieSelectionnee}
      onChange={(valeur) => {
        setCategorieSelectionnee(valeur);
        setSousCategorieSelectionnee("");
        setPrestationSelectionnee("");
      }}
      options={[
        ["", "Toutes les étapes du chantier"],
        ...categories.map((categorie) => [
          categorie,
          categorie,
        ]),
      ]}
    />

    <Select label="Sous-catégorie" value={sousCategorieSelectionnee}
      onChange={(valeur) => { setSousCategorieSelectionnee(valeur); setPrestationSelectionnee(""); }}
      options={[["", "Toutes les sous-catégories"], ...sousCategoriesDisponibles.map((nom) => [nom, nom])]} />

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
          ? "⭐ Favoris affichés"
          : "☆ Voir mes favoris"}
      </button>
    </div>
  </div>

  {(recherchePrestation ||
    categorieSelectionnee ||
    sousCategorieSelectionnee ||
    afficherFavorisSeulement) && (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          {prestationsFiltrees.length} prestation
          {prestationsFiltrees.length > 1
            ? "s"
            : ""}{" "}
          trouvée
          {prestationsFiltrees.length > 1
            ? "s"
            : ""}
        </p>

        <button
          type="button"
          onClick={() => {
            setRecherchePrestation("");
            setCategorieSelectionnee("");
            setSousCategorieSelectionnee("");
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
          Aucune prestation ne correspond à
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
                            [prestation.categorieChantier || prestation.categorie, prestation.sousCategorie].filter(Boolean).join(" › ")
                          }
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-semibold text-blue-700">
                        {formatMontant(prixClient)}{" "}
                        €
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
                      {favorite ? "★" : "☆"}
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

</div>

  <div className="space-y-2">
    {lignesTravaux.map((ligne, index) => {
  const labels = champsTravaux(ligne.type);

  const tarifAssocie = TARIFS_PRESTATIONS.find(
  (t: any) => t.id === ligne.tarifId
);
  

  const ligneVerrouillee = Boolean(baseFacturation?.lignes.some(l => l.id === ligne.id));
  const ligneOuverte = ligneTravauxOuverteId === ligne.id;
  const montantAffiche = calcul.montantsFacture?.[index] ?? montantLigne(ligne, modeClient);

  return (
    <div key={ligne.id} id={`ligne-travaux-${ligne.id}`} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={ligneOuverte}
          aria-controls={`details-ligne-${ligne.id}`}
          onClick={() => setLigneTravauxOuverteId(ligneOuverte ? null : ligne.id)}
          className="min-w-0 flex-1 basis-48 text-left"
        >
          <span className="block text-sm font-semibold leading-snug text-slate-800 break-words">
            {index + 1} — {ligne.prestationNom || "Prestation personnalisée"}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            {ligne.tarifId && ligne.tarifId !== ID_INTERVENTION_GLOBALE && (
              <span>{ligne.q1 || 1} {ligne.unite || "u"}</span>
            )}
            {ligne.tarifId === ID_INTERVENTION_GLOBALE && <span>Forfait</span>}
            {ligne.fournitureIncluse && <span>Fournitures incluses</span>}
            {ligne.travauxSupplementaires && <span>Travaux supplémentaires</span>}
            {ligneVerrouillee && <span>Devis initial conservé</span>}
            <span className="font-medium text-blue-700">{ligneOuverte ? "▴ Replier" : "▾ Détails"}</span>
          </span>
        </button>
        <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
          {ligne.offert && !montantAffiche ? "Offert" : `${formatMontant(montantAffiche)} €`}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setInsertionApresId(ligne.id);
              setPrestationSelectionnee("");
              lignesTravauxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            title="Insérer une prestation après cette ligne"
            aria-label={`Insérer une prestation après la ligne ${index + 1}`}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            + Insérer
          </button>
          <button
            type="button"
            disabled={ligneVerrouillee}
            onClick={() => setLignesTravaux(anciennes => anciennes.map(l => l.id === ligne.id ? { ...l, offert: !l.offert } : l))}
            className={`rounded-lg border px-2.5 py-2 text-xs font-semibold disabled:opacity-40 ${ligne.offert ? "border-green-300 bg-green-100 text-green-800" : "bg-white text-slate-700"}`}
          >
            {ligne.offert ? "Offert ✓" : "Offrir"}
          </button>
          <button
            type="button"
            disabled={ligneVerrouillee}
            onClick={() => supprimerLigne(ligne.id)}
            className="rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
          >
            Supprimer
          </button>
        </div>
      </div>
      <div id={`details-ligne-${ligne.id}`} hidden={!ligneOuverte}>
      <fieldset
        disabled={ligneVerrouillee}
        ref={index === lignesTravaux.length - 1 ? derniereLigneRef : null}
        className="min-w-0 space-y-2 border-t border-slate-200 bg-slate-50 p-3"
      >
          {ligneVerrouillee && (
            <p className="text-xs font-semibold text-blue-800">Ligne du devis initial conservée. Pour un ajout, crée une nouvelle prestation.</p>
          )}
          {(dossierActuel?.devisOrigineId !== undefined || numeroFacture || ligne.travauxSupplementaires) && (
            <Check
              label="Travaux supplémentaires (mention sur la facture)"
              checked={ligne.travauxSupplementaires || false}
              onChange={(checked) => setLignesTravaux((anciennes) => anciennes.map(
                (l) => l.id === ligne.id ? { ...l, travauxSupplementaires: checked } : l
              ))}
            />
          )}
          <div className="rounded-lg bg-white p-3 space-y-2">
           {ligne.tarifId ? (
  <div className="space-y-2">
    {ligne.tarifId === ID_INTERVENTION_GLOBALE ? (
      <div className="grid gap-3 md:grid-cols-2">
        <NumberInput
          label="Temps prévu pour le forfait (heures)"
          value={ligne.heuresUnite || 0}
          onChange={(v) => modifierLigne(ligne.id, "heuresUnite", v)}
        />
        <NumberInput
          label="Coefficient de pénibilité (1 = normal, 1,30 = +30 %)"
          value={ligne.coefficientPenibilite ?? 1}
          onChange={(v) => modifierLigne(ligne.id, "coefficientPenibilite", v)}
        />
        <p className="text-xs text-slate-500 md:col-span-2">
          Saisis ton temps, puis ajuste le prix total du forfait pour inclure tes fournitures.
          Ce prix manuel inclut déjà la pénibilité : elle ne sera pas ajoutée une seconde fois.
                Si les fournitures sont ajoutées à ce prix, ne les saisis pas aussi dans les champs de fournitures.
        </p>
      </div>
    ) : (
      <NumberInput
        label={`Quantité (${ligne.unite || "u"})`}
        value={ligne.q1}
        onChange={(v) => modifierLigne(ligne.id, "q1", v)}
      />
    )}

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
                    : l.tarifId === ID_INTERVENTION_GLOBALE
                      ? prixInterventionGlobale(l, modeClient)
                      : l.prixUnitaireAuto || l.prixUnitaire,
                }
              : l
          )
        )
      }
    />
<Check
  label="Personnaliser les détails affichés dans le devis"
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
        Détails visibles dans le devis
      </p>
      <p className="text-xs text-amber-700">
        Une ligne par détail. Ces textes apparaîtront sous la prestation dans le PDF.
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
        Aperçu PDF :
      </p>

      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {detailsTravaux(ligne).map(
          (detail, detailIndex) => (
            <li key={detailIndex}>• {detail}</li>
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
      Réinitialiser les détails automatiques
    </button>
  </div>
)}
    {ligne.prixManuel && (
      <NumberInput
        label={ligne.tarifId === ID_INTERVENTION_GLOBALE
          ? "Prix total manuel du forfait, fournitures incluses (€)"
          : `Prix unitaire manuel (€ / ${ligne.unite || "u"})`}
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
        {ligne.tarifId === ID_INTERVENTION_GLOBALE
          ? `Main-d’œuvre calculée : ${formatMontant(prixInterventionGlobale(ligne, modeClient))} € pour le forfait`
          : `Prix automatique du tableau : ${formatMontant(ligne.prixUnitaireAuto || ligne.prixUnitaire)} € / ${ligne.unite}`}
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

                <div className="grid gap-2 md:grid-cols-5">
                  <NumberInput label={labels[0]} value={ligne.q1} onChange={(v) => modifierLigne(ligne.id, "q1", v)} />
                  <NumberInput label={labels[1]} value={ligne.q2} onChange={(v) => modifierLigne(ligne.id, "q2", v)} />
                  <NumberInput label={labels[2]} value={ligne.r1} onChange={(v) => modifierLigne(ligne.id, "r1", v)} />
                  <NumberInput label={labels[3]} value={ligne.r2} onChange={(v) => modifierLigne(ligne.id, "r2", v)} />
                  <NumberInput label={labels[4]} value={ligne.option} onChange={(v) => modifierLigne(ligne.id, "option", v)} />
                </div>
              </>
            )}

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-3">
              <Check
                label="Inclure une fourniture dans cette prestation"
                checked={ligne.fournitureIncluse || false}
                onChange={(checked) =>
                  setLignesTravaux((anciennesLignes) =>
                    anciennesLignes.map((l) =>
                      l.id === ligne.id
                        ? { ...l, fournitureIncluse: checked }
                        : l
                    )
                  )
                }
              />

              {ligne.fournitureIncluse && (
                <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-2">
                  <NumberInput
                    label="Prix de vente des fournitures pour toute la ligne (€)"
                    value={ligne.prixFournitureInclus || 0}
                    onChange={(v) =>
                      modifierLigne(
                        ligne.id,
                        "prixFournitureInclus",
                        v
                      )
                    }
                  />

                  <p className="text-xs text-emerald-700">
                    Ce montant est ajouté une seule fois au prix de la ligne, quelle que soit la quantité.
                    Il est séparé de la main-d’œuvre dans ton résumé interne ; le client garde un prix unique.
                    La mention « Fournitures incluses » apparaîtra automatiquement
                    dans les sous-détails du devis.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-3 space-y-1">
            <Card
  titre="Prix ligne"
  valeur={ligne.offert && !(calcul.montantsFacture?.[index]) ? "Offert" : `${formatMontant(calcul.montantsFacture?.[index] ?? montantLigne(ligne, modeClient))} €`}
/>

            {tarifAssocie && (
              <>
                <Card
                  titre="Rentabilité"
                  valeur={`${tarifAssocie.rentabilite} ${tarifAssocie.action}`}
                />

                {tarifAssocie.conditions && (
                  <p className="text-sm text-slate-500">
                    {tarifAssocie.conditions}
                  </p>
                )}
              </>
            )}

            {ligne.tarifId !== ID_INTERVENTION_GLOBALE && ligne.prixUnitaire && ligne.unite && (
              <p className="text-sm text-slate-500">
                Tarif appliqué : {formatMontant(ligne.prixUnitaire)} € / {ligne.unite}
              </p>
            )}
          </div>
        </fieldset>
        <div className="border-t border-slate-200 bg-slate-50 px-3 pb-2 text-right">
          <button type="button" onClick={() => {
            setLigneTravauxOuverteId(null);
            document.getElementById(`ligne-travaux-${ligne.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }} className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Replier cette prestation ▴</button>
        </div>
      </div>
    </div>
      );
    })}
  </div>
</BlocRepliable>


  <BlocRepliable titre="Résultat devis — déplacement et fournitures" ouvert={ongletsDevis.resultat}
    onOuvertureChange={(ouvert) => reglerOngletDevis("resultat", ouvert)}>
  <p className="text-xs text-slate-500">
    Estimation et analyse en temps réel.
  </p>
<div className="grid gap-3 md:grid-cols-2">
 {/* Déplacement */}
<div className="rounded-lg border bg-slate-50 px-3 py-2 space-y-2"
  onChangeCapture={() => avancerParcoursDevis("conditions")}
  onClickCapture={(event) => {
    if ((event.target as HTMLElement).closest("button")) avancerParcoursDevis("conditions");
  }}>
  <h3 className="text-sm font-bold text-slate-800">
    🚚 Déplacement
  </h3>

  <NumberInput
    label="KM aller"
    value={kmAller}
    onChange={setKmAller}
  />

  {!baseFacturation && <label className="flex items-center gap-2 text-sm font-semibold">
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
    Modifier le prix du déplacement
  </label>}

  {!baseFacturation && fraisDeplacementManuelActif && (
    <NumberInput
      label="Prix déplacement manuel"
      value={fraisDeplacementManuel}
      onChange={setFraisDeplacementManuel}
    />
  )}

  <p className="text-xs text-slate-500">
    {calcul.kmAR} km A/R → {formatMontant(calcul.fraisLogistique)} €
  </p>
  {baseFacturation && (
    <p className="text-xs font-semibold text-emerald-800">
      Déplacement initial conservé : {formatMontant(baseFacturation.frais)} €.
      {" "}{calcul.joursSupplementaires} jour(s) supplémentaire(s) : {formatMontant(calcul.fraisSupplementaires)} €,
      répartis uniquement sur les nouvelles prestations. Aucun nouveau forfait de mise en place.
    </p>
  )}
</div>

 {/* Fournitures */}
<div className="rounded-lg border bg-slate-50 px-3 py-2 space-y-2"
  onChangeCapture={() => avancerParcoursDevis("conditions")}
  onClickCapture={(event) => {
    if ((event.target as HTMLElement).closest("button")) avancerParcoursDevis("conditions");
  }}>
  <h3 className="text-sm font-bold text-slate-800">
    📦 Fournitures
  </h3>

  <label className="flex items-center gap-2 text-sm font-semibold">
    <input
      type="checkbox"
      checked={fournituresClient}
      onChange={(e) => setFournituresClient(e.target.checked)}
    />
    Fournitures à la charge du client
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
    onClick={() => setCoefficientFournitures(1.3)}
    className="px-3 py-1 rounded-lg bg-green-50 text-green-800 border border-green-200 text-xs font-semibold"
  >
    x1.30
  </button>

  <button
    type="button"
    onClick={() => setCoefficientFournitures(1.5)}
    className="px-3 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold"
  >
    x1.50
  </button>

  <button
    type="button"
    onClick={() => setCoefficientFournitures(1.6)}
    className="px-3 py-1 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 text-xs font-semibold"
  >
    x1.6
  </button>
  <TextArea
  label="Détail des fournitures incluses / exclues"
  value={detailsFournitures}
  onChange={setDetailsFournitures}
/>
</div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <MiniResult titre="Achat" valeur={`${formatMontant(achatFournitures)} €`} />
        <MiniResult titre="Revente" valeur={`${formatMontant(calcul.reventeFournitures)} €`} couleur="text-blue-700" />
        <MiniResult titre="Marge" valeur={`${formatMontant(calcul.margeFournitures)} €`} couleur="text-green-700" />
      </div>

      <p className="text-xs text-slate-500">
        Minimum conseillé : coefficient 1.30. Marge renforcée : 1.50. Selon chantier : jusqu’à 1.60.
      </p>
    </div>
  )}

  {fournituresClient && (
    <p className="text-xs text-slate-500">
      Les fournitures ne sont pas ajoutées au devis.
    </p>
  )}
</div>

{/* Commentaire spécifique aux fournitures */}
<div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
  <h3 className="text-sm font-bold text-slate-800">
    📦 Commentaire à afficher sur les fournitures
  </h3>

  <div className="flex gap-2 flex-wrap">
    <button
      type="button"
      onClick={() =>
        setCommentaireFournitures((texteActuel) => {
          const phrase =
            "La fourniture est encore à définir : à la charge du client ou fournie par l’entreprise.";
          return texteActuel.trim()
            ? `${texteActuel.trim()}\n${phrase}`
            : phrase;
        })
      }
      className="px-3 py-1 rounded-lg bg-white text-amber-800 border border-amber-300 text-xs font-semibold"
    >
      Charge à définir
    </button>

    <button
      type="button"
      onClick={() =>
        setCommentaireFournitures((texteActuel) => {
          const phrase =
            "Le prix des fournitures est estimé entre ... € et ... €.";
          return texteActuel.trim()
            ? `${texteActuel.trim()}\n${phrase}`
            : phrase;
        })
      }
      className="px-3 py-1 rounded-lg bg-white text-amber-800 border border-amber-300 text-xs font-semibold"
    >
      Prix estimé
    </button>

    <button
      type="button"
      onClick={() =>
        setCommentaireFournitures((texteActuel) => {
          const phrase =
            "Les fournitures seront choisies, commandées et réglées séparément par le client. Elles ne sont pas comprises dans le montant du présent devis.";
          return texteActuel.trim()
            ? `${texteActuel.trim()}\n${phrase}`
            : phrase;
        })
      }
      className="px-3 py-1 rounded-lg bg-white text-amber-800 border border-amber-300 text-xs font-semibold"
    >
      Fournitures client
    </button>

    <button
      type="button"
      onClick={() =>
        setCommentaireFournitures((texteActuel) => {
          const phrase =
            "Les quantités définitives seront confirmées après dépose des éléments existants et contrôle des supports.";
          return texteActuel.trim()
            ? `${texteActuel.trim()}\n${phrase}`
            : phrase;
        })
      }
      className="px-3 py-1 rounded-lg bg-white text-amber-800 border border-amber-300 text-xs font-semibold"
    >
      Quantités après dépose
    </button>

    <button
      type="button"
      onClick={() => setCommentaireFournitures("")}
      className="px-3 py-1 rounded-lg bg-white text-slate-600 border text-xs font-semibold"
    >
      Effacer
    </button>
  </div>

  <TextArea
    label="Information fournitures propre à ce devis"
    value={commentaireFournitures}
    onChange={setCommentaireFournitures}
  />

  <p className="text-xs text-slate-500">
    Facultatif : un encadré « Information fournitures » est ajouté au PDF uniquement si cette zone est remplie.
  </p>
</div>


</div>
</BlocRepliable>

<BlocRepliable titre="Conditions du devis et résumé financier" ouvert={ongletsDevis.conditions}
  onOuvertureChange={(ouvert) => reglerOngletDevis("conditions", ouvert)}>
  <div onChangeCapture={() => avancerParcoursDevis("acompte")}
    onClickCapture={(event) => {
      if ((event.target as HTMLElement).closest("button")) avancerParcoursDevis("acompte");
    }}>
    <div className="grid gap-3 md:grid-cols-2">
{/* Conditions générales et conditions propres au chantier */}
<div className="md:col-span-2 rounded-lg border bg-slate-50 px-3 py-2 space-y-3">
  <div className="flex items-center justify-between gap-2 flex-wrap">
    <h3 className="text-sm font-bold text-slate-800">
      📝 Conditions du devis
    </h3>

    <button
      type="button"
      onClick={() =>
        setConditionsGeneralesDevis(CONDITIONS_GENERALES_DEVIS_DEFAUT)
      }
      className="px-3 py-1 rounded-lg bg-white text-slate-700 border text-xs font-semibold"
    >
      Remettre les phrases générales
    </button>
  </div>

  <div className="flex gap-2 flex-wrap">
    <button
      type="button"
      onClick={() =>
        setConditionsChantier((texteActuel) => {
          const phrase =
            "La dépose et l’évacuation des éléments existants sont réalisées par le client avant le commencement des travaux. La zone doit être dégagée et accessible.";
          return texteActuel.trim()
            ? `${texteActuel.trim()}\n${phrase}`
            : phrase;
        })
      }
      className="px-3 py-1 rounded-lg bg-white text-slate-700 border text-xs font-semibold"
    >
      Dépose par le client
    </button>

    <button
      type="button"
      onClick={() =>
        setConditionsChantier((texteActuel) => {
          const phrase =
            "Les quantités et réglages définitifs seront confirmés après dépose et contrôle de l’état ainsi que des niveaux du support.";
          return texteActuel.trim()
            ? `${texteActuel.trim()}\n${phrase}`
            : phrase;
        })
      }
      className="px-3 py-1 rounded-lg bg-white text-slate-700 border text-xs font-semibold"
    >
      Contrôle après dépose
    </button>


  </div>

  <div className="grid gap-3 md:grid-cols-2">
    <TextArea
      label="Phrases générales — modifiables pour ce devis"
      value={conditionsGeneralesDevis}
      onChange={setConditionsGeneralesDevis}
    />

    <TextArea
      label="Conditions propres à ce chantier"
      value={conditionsChantier}
      onChange={setConditionsChantier}
    />
  </div>

</div>

  {/* ESTIMATIONS */}
  {statutDevis === "estimation_rapide" && (
    <>
      <MiniResult titre="Basse" valeur={`${formatMontant(calcul.estimationBasse)} €`} couleur="text-green-700" />
      <MiniResult titre="Haute" valeur={`${formatMontant(calcul.estimationHaute)} €`} couleur="text-orange-600" />

      <div className="col-span-2 rounded-lg border border-purple-300 bg-purple-50 px-4 py-2">
        <p className="text-xs text-purple-600">💬 Prix à annoncer</p>
        <p className="text-xl font-bold text-purple-800">
          {formatMontant(calcul.prixConseille)} €
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
          🔴 Trop bas : déplacement + temps non rentables.
        </p>
      )}

      {calcul.estimationBasse >= 400 && calcul.estimationBasse < 800 && (
        <p className="text-sm font-semibold text-orange-600">
          🟠 Vigilance : marge serrée.
        </p>
      )}

      {calcul.estimationBasse >= 800 && (
        <p className="text-sm font-semibold text-green-700">
          🟢 Estimation cohérente et rentable.
        </p>
      )}
    </div>
  )}

  <div className="rounded-lg border bg-white px-3 py-2 space-y-2">
    <h3 className="text-sm font-bold text-slate-800">🧾 Résumé financier</h3>

    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <MiniResult titre="Main-d’œuvre hors fournitures" valeur={`${formatMontant(calcul.mainOeuvreHorsFournitures)} €`} />
      <MiniResult titre="Déplacement" valeur={`${formatMontant(calcul.fraisLogistique)} €`} />
      <MiniResult
  titre="Temps chantier"
  valeur={`${calcul.totalHeuresChantier.toFixed(1)} h`}
/>

<MiniResult
  titre="Jours calculés"
  valeur={`${calcul.nombreJoursChantier} j`}
/>
      <MiniResult titre="Fournitures facturées au total" valeur={`${formatMontant(calcul.totalFournituresFacturees)} €`} />
      {calcul.complementMinimum > 0 && (
        <MiniResult titre="Minimum intégré aux prestations" valeur={`${formatMontant(calcul.complementMinimum)} €`} />
      )}
      <MiniResult titre="Total" valeur={`${formatMontant(calcul.total)} €`} couleur="text-blue-700" />
    </div>

    <div className="rounded-lg bg-slate-50 px-3 py-2 space-y-1 text-xs">
      <div className="flex justify-between">
        <span>Déplacement ({calcul.kmAR} km)</span>
        <strong>{formatMontant(calcul.fraisLogistique)} €</strong>
      </div>

      <div className="flex justify-between">
        <span>Main-d’œuvre hors fournitures</span>
        <strong>{formatMontant(calcul.mainOeuvreHorsFournitures)} €</strong>
      </div>
      <div className="flex justify-between">
        <span>Fournitures incluses dans les prestations</span>
        <strong>{formatMontant(calcul.fournituresIncluses)} €</strong>
      </div>
      <div className="flex justify-between">
        <span>Fournitures facturées séparément</span>
        <strong>{formatMontant(calcul.reventeFournitures)} €</strong>
      </div>
      <div className="flex justify-between font-semibold">
        <span>Total des fournitures facturées</span>
        <strong>{formatMontant(calcul.totalFournituresFacturees)} €</strong>
      </div>
      <p className="text-slate-500">
        Répartition interne uniquement. La main-d’œuvre affichée est un montant facturé avant charges,
        pas un bénéfice net. Les fournitures sont affichées à leur prix de vente.
      </p>

      {calcul.complementMinimum > 0 && (
        <div className="flex justify-between">
          <span>Complément au minimum de 80 € (intégré aux prestations sur le PDF)</span>
          <strong>{formatMontant(calcul.complementMinimum)} €</strong>
        </div>
      )}
      <div className="border-t pt-1 flex justify-between font-bold text-blue-700">
        <span>Total devis</span>
        <span>{formatMontant(calcul.total)} €</span>
      </div>
    </div>
  </div>



    <button type="button" className="btn-amber mt-3"
      onClick={() => {
        progressionDevisRef.current.acompte = true;
        reglerOngletDevis("acompte", true);
      }}>
      Continuer vers acompte et encaissement
    </button>
  </div>
</BlocRepliable>

<BlocRepliable titre="Acompte et encaissement" ouvert={ongletsDevis.acompte}
  onOuvertureChange={(ouvert) => reglerOngletDevis("acompte", ouvert)}>
  <div className="space-y-2">
    {!estAndroid && (
      <div className="rounded-lg border border-amber-200 bg-white p-3 space-y-2">
        <button type="button" disabled={generationPDFEnCours}
          onClick={() => genererPDF("acompte")}
          className="btn-amber px-3 py-2 text-sm disabled:opacity-50">
          {generationPDFEnCours ? "Création du PDF…" : factureAcompteCourante
            ? "Télécharger la facture d'acompte" : "Créer une facture d'acompte"}
        </button>
        {factureAcompteCourante && (
          <p className="text-sm font-semibold text-amber-800">
            {factureAcompteCourante.numero} — {factureAcompteCourante.date} —
            {" "}{formatMontant(factureAcompteCourante.montant)} €.
            Le document émis est conservé à l'identique.
          </p>
        )}
      </div>
    )}

    <details key={`situations-${idDossierActuel ?? "nouveau"}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        Factures intermédiaires{facturesIntermediairesCourantes.length > 0 ? ` (${facturesIntermediairesCourantes.length})` : ""}
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-xs text-slate-500">
          Pour facturer les travaux réalisés avant la fin du chantier. Le règlement s’enregistre séparément.
        </p>
        {!estAndroid && !numeroFacture && !facturePayee && (
          <>
            <p className="text-xs text-slate-600">
              Déjà facturé : {formatMontant(decompteCourant.dejaFacture)} € · Reste à facturer : {formatMontant(decompteCourant.montantFinal)} €
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <NumberInput label="À facturer maintenant (€)" value={montantSituation} onChange={setMontantSituation} />
              <label className="block text-sm font-medium text-slate-700">Date des travaux réalisés
                <input type="date" value={formatDateFrVersInput(dateTravauxSituation)}
                  onChange={(e) => setDateTravauxSituation(formatDateInputVersFr(e.target.value))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">Travaux réalisés à ce jour (cumul)
              <textarea rows={2} maxLength={1000} value={descriptionSituation}
                onChange={(e) => setDescriptionSituation(e.target.value)}
                placeholder="Précise les prestations déjà réalisées selon le devis."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </label>
            {Number.isFinite(montantSituation) && montantSituation > 0 && (
              <p className={`text-xs ${resteSituationCentimes < 0 ? "text-red-700" : "text-slate-600"}`}>
                Cumul facturé : {formatMontant(cumulSituationCentimes / 100)} € · Restera à facturer : {formatMontant(resteSituationCentimes / 100)} €
              </p>
            )}
            <button type="button" disabled={generationPDFEnCours || !dossierActuel || !numeroDevis}
              onClick={() => genererPDF("situation")}
              className="btn-blue px-3 py-2 text-sm disabled:opacity-50">
              {generationPDFEnCours ? "Création du PDF…" : "Créer la facture intermédiaire"}
            </button>
          </>
        )}
        {facturesIntermediairesCourantes.map((f) => (
          <div key={f.numero} className="border-t border-slate-100 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">{f.numero} · {formatMontant(f.montant)} €</p>
                <p className="text-xs text-slate-500">{f.date} · {f.datePaiement ? `Réglée le ${f.datePaiement}` : "À régler"}</p>
              </div>
              <div className="flex gap-2">
                {!estAndroid && <button type="button" className="rounded border px-2 py-1 text-xs"
                  onClick={() => telechargerDocumentEmis(f)}>PDF</button>}
                {!f.datePaiement && !facturePayee && <button type="button" className="rounded border px-2 py-1 text-xs text-green-800"
                  onClick={() => { setReglementSituationNumero(f.numero); setDateReglementSituation(""); }}>Règlement reçu</button>}
              </div>
            </div>
            {reglementSituationNumero === f.numero && !f.datePaiement && (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-600">Date réelle du règlement
                  <input type="date" value={formatDateFrVersInput(dateReglementSituation)}
                    onChange={(e) => setDateReglementSituation(formatDateInputVersFr(e.target.value))}
                    className="mt-1 block rounded border px-2 py-1 text-sm" />
                </label>
                <button type="button" className="rounded bg-green-700 px-2 py-1 text-xs text-white"
                  onClick={enregistrerReglementSituation}>Valider {formatMontant(f.montant)} € reçus</button>
                <button type="button" className="rounded border px-2 py-1 text-xs"
                  onClick={() => setReglementSituationNumero("")}>Annuler</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </details>

   <Select
  label="Acompte (%)"
  value={String(pourcentageAcompte)}
  onChange={(v) => setPourcentageAcompte(Number(v))}
  options={[
    ["0", "0 % — pas d’acompte"],
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
      <NumberInput
        label="Montant de l'acompte (€)"
        value={acompteManuel}
        onChange={setAcompteManuel}
      />
    </div>
  )}
</div>

<div className="grid grid-cols-2 gap-2 md:grid-cols-3">
  <MiniResult titre="Acompte" valeur={`${formatMontant(calcul.acompte)} €`} />
  <MiniResult titre="Encaissé" valeur={`${formatMontant(montantEncaisse)} €`} />
  <MiniResult
    titre="Reste"
    valeur={`${formatMontant(Math.max(0, calcul.total - montantEncaisse))} €`}
    couleur="text-blue-700"
  />
</div>


{saisieDateAcompteOuverte && (
  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
    <label className="block text-sm font-medium text-slate-700">
      Date réelle de réception de l’acompte
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
      Date réelle du paiement complet
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
  {/* ================= ACOMPTE REÇU ================= */}
  <button
    onClick={() => {
      setSaisieDatePaiementCompletOuverte(false);

      if (!saisieDateAcompteOuverte) {
        setSaisieDateAcompteOuverte(true);
        return;
      }

      if (!datePaiement) {
        alert("Sélectionne la date réelle de réception de l’acompte.");
        return;
      }

      const montantAcompteRecu = factureAcompteCourante?.montant ?? calcul.acompte;
      if (!Number.isFinite(montantAcompteRecu) || montantAcompteRecu <= 0 || montantAcompteRecu > calcul.total) {
        alert("Vérifie le montant de l'acompte avant d'enregistrer son règlement.");
        return;
      }
      if (facturePayee || decompteCourant.intermediairesRecus > 0 || montantEncaisse > montantAcompteRecu) {
        alert("Un règlement supérieur est déjà enregistré. Vérifie les encaissements du dossier.");
        return;
      }

      setMontantEncaisse(montantAcompteRecu);
      if (dossierOrigineAcompte) {
        const clePlanning = `d-${dossierOrigineAcompte.id}`;
        setPlanningDonnees(p => {
          const e = { ...p.editions[clePlanning] };
          delete e.valide; delete e.acompte; delete e.dateAcompte;
          return { ...p, editions: { ...p.editions, [clePlanning]: e } };
        });
        planningModifieRef.current = true;
      }


      setHistorique((ancien) =>
        ancien.map((d) =>
          (d.id === dossierOrigineAcompte?.id || d.devisOrigineId === dossierOrigineAcompte?.id) && Boolean(dossierOrigineAcompte)
            ? {
                ...d,

                // Fonctionnement actuel conservé
                montantEncaisse: montantAcompteRecu,
                reste: Math.max(
                  0,
                  calcul.total - montantAcompteRecu
                ),
                total: calcul.total,
                acompte: montantAcompteRecu,
                facturePayee: false,

                // On conserve datePaiement pour ne rien casser
                // dans le fonctionnement actuel de l'application
                datePaiement,

                // NOUVEAU :
                // mémoire indépendante et permanente de l'acompte
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
      : "Acompte reçu"}
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
        alert("Sélectionne la date réelle du paiement complet.");
        return;
      }

      if (facturesIntermediairesCourantes.length > 0) {
        try {
          sauvegarderFacturesIntermediaires(facturesIntermediairesCourantes.map((f) =>
            f.datePaiement ? f : { ...f, datePaiement }), calcul.total, undefined, { date: datePaiement });
          setFacturePayee(true);
          setSaisieDatePaiementCompletOuverte(false);
        } catch (erreur) {
          console.error(erreur); alert("Le paiement complet n'a pas pu être enregistré.");
        }
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
           * volontairement PAS modifiés ici.
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

            // date réelle du paiement final
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

  {/* ================= REMISE À ZÉRO ================= */}
  <button
    onClick={() => {
      if (facturesIntermediairesCourantes.length > 0) {
        try {
          sauvegarderFacturesIntermediaires(facturesIntermediairesCourantes.map((f) =>
            ({ ...f, datePaiement: undefined })), 0, undefined, { date: "", remiseAZero: true });
          setFacturePayee(false);
          setDatePaiement("");
          setSaisieDateAcompteOuverte(false);
          setSaisieDatePaiementCompletOuverte(false);
          setReglementSituationNumero("");
        } catch (erreur) {
          console.error(erreur); alert("Les règlements n'ont pas pu être remis à zéro.");
        }
        return;
      }
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
</BlocRepliable>


        <BlocRepliable titre="Recherche historique" ouvertParDefaut={false}>
          <Input label="Recherche client / devis / facture" value={rechercheHistorique}
            onChange={(valeur) => {
              setRechercheHistorique(valeur);
              if (valeur.trim()) setHistoriqueOuvert(true);
            }} />
        </BlocRepliable>

<BlocRepliable titre="Historique" ouvert={historiqueOuvert} onOuvertureChange={setHistoriqueOuvert}>
  {(() => {
    const extraireNumero = (numero?: string) => {
      const match = (numero || "").match(/(?:^|-)(\d{4})-(\d+)$/);
      if (match) {
        return { annee: Number(match[1]), numero: Number(match[2]) };
      }
      // Compatibilité avec les anciens numéros dépourvus d’année.
      const ancienNumero = (numero || "").match(/(\d+)$/);
      return { annee: 0, numero: ancienNumero ? Number(ancienNumero[1]) : 0 };
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

        // Les travaux commencés sans numéro restent tout en haut afin d’être
        // retrouvés immédiatement à la prochaine ouverture de l’application.
        if (aEstBrouillon !== bEstBrouillon) {
          return aEstBrouillon ? -1 : 1;
        }

        if (aEstBrouillon && bEstBrouillon) {
          return (b.id || 0) - (a.id || 0);
        }

        const aEstFacture = Boolean(a.numeroFacture);
        const bEstFacture = Boolean(b.numeroFacture);

        // Toutes les factures passent avant les devis non encore facturés.
        if (aEstFacture !== bEstFacture) {
          return aEstFacture ? -1 : 1;
        }

        // Dans le groupe des factures, l’année puis le numéro de facture déterminent
        // l’ordre : le numéro de devis peut être présent ou totalement absent.
        if (aEstFacture && bEstFacture) {
          const numeroFactureA = extraireNumero(a.numeroFacture);
          const numeroFactureB = extraireNumero(b.numeroFacture);

          if (numeroFactureA.annee !== numeroFactureB.annee) {
            return numeroFactureB.annee - numeroFactureA.annee;
          }
          if (numeroFactureA.numero !== numeroFactureB.numero) {
            return numeroFactureB.numero - numeroFactureA.numero;
          }
        }

        // Dans le second groupe, les devis non facturés sont classés du plus
        // récent au plus ancien selon l’année puis leur numéro de devis.
        if (!aEstFacture && !bEstFacture) {
          const numeroDevisA = extraireNumero(a.numeroDevis);
          const numeroDevisB = extraireNumero(b.numeroDevis);

          if (numeroDevisA.annee !== numeroDevisB.annee) {
            return numeroDevisB.annee - numeroDevisA.annee;
          }
          if (numeroDevisA.numero !== numeroDevisB.numero) {
            return numeroDevisB.numero - numeroDevisA.numero;
          }
        }

        // Sécurité en cas de numéro identique ou absent : le dernier dossier
        // enregistré reste affiché en premier.
        return (b.id || 0) - (a.id || 0);
      });

    if (historiqueDocuments.length === 0) {
      return (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Aucun devis ou facture enregistré.
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
            ? "Payée"
            : factureEnRetard
            ? "Retard"
            : item.numeroFacture
            ? "Facture"
            : "Devis";

          const nomChantier =
            item.modeClient === "jeremie"
              ? item.clientFinalAdresse ||
                item.adresse ||
                "Chantier non renseigné"
              : item.modeClient === "agence"
              ? `${item.adresse || ""} ${item.complementAdresse || ""}`.trim() ||
                item.referenceChantier ||
                "Chantier non renseigné"
              : item.complementAdresse ||
                item.adresse ||
                "Chantier non renseigné";

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    
              {nomClientHistorique(item)}
                  </p>

                  <div className="space-y-1 text-sm text-slate-500">
                    <p>
                      {item.numeroDevis || "Aucun devis"} /{" "}
                      {item.numeroFacture || (item.devisOrigineId !== undefined ? "Facture en préparation" : "Aucune facture")}
                    </p>
                    {historique.some((d) => d.devisOrigineId === item.id) && (
                      <p className="font-semibold text-emerald-700">Devis original conservé — facture liée préparée séparément</p>
                    )}
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
                  valeur={`${formatMontant(item.total || 0)} €`}
                  couleur="text-slate-900"
                />

                <MiniResult
                  titre="Acompte"
                  valeur={`${formatMontant(item.acompte || 0)} €`}
                  couleur="text-amber-700"
                />

                <MiniResult
                  titre="Encaissé"
                  valeur={`${formatMontant(item.montantEncaisse || 0)} €`}
                  couleur="text-emerald-700"
                />

                <MiniResult
                  titre="Reste"
                  valeur={`${formatMontant(Math.max(
                    0,
                    (item.total || 0) - (item.montantEncaisse || 0)
                  ))} €`}
                  couleur={factureEnRetard ? "text-red-700" : "text-slate-900"}
                />
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <p>📅 Chantier : {item.dateChantier || "Non planifié"}</p>
                <p>💳 Paiement : {item.datePaiement || "Non renseigné"}</p>
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
          travauxSupplementaires: false,
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

  {item.numeroFacture?.trim() && !item.facturePayee &&
    Math.round(((item.total || 0) - (item.montantEncaisse || 0)) * 100) > 0 && (
    <button
      type="button"
      onClick={() => preparerRelance(item)}
      className="btn-amber"
      title="Ouvrir un mail de relance prérempli pour cette facture"
    >
      Mail de relance
    </button>
  )}

  {item.numeroDevis && !item.numeroFacture && item.devisOrigineId === undefined && (
    <button
      type="button"
      onClick={() => preparerFactureDepuisDevis(item)}
      className="btn-emerald"
    >
      {historique.some((d) => d.devisOrigineId === item.id || (d.numeroFacture && d.numeroDevis === item.numeroDevis))
        ? "Ouvrir la facture liée"
        : "Préparer la facture"}
    </button>
  )}

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

<BlocRepliable titre="Paramètres entreprise / RIB" ouvertParDefaut={false}>
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

        const evenementsJour = dossiersActifs.filter((d) => {
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
              Aucun événement prévu pour cette journée.
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
                ? "📝 Rappel"
                : estRdv
                ? "📅 RDV client"
                : estPaiement
                ? "💳 Paiement / relance"
                : estChantier
                ? "🛠️ Chantier"
                : "📌 Événement";

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
                        : d.client || "Client non renseigné"}
                    </p>

                    <span className="text-xs rounded-full border bg-white px-2 py-1 text-slate-700">
                      {badge}
                    </span>
                  </div>

                  {!estRappel && (
                    <>
                      <p className="text-sm text-slate-600">
                        📞 {d.telephone || "Non renseigné"}
                      </p>

                      <p className="text-sm text-slate-600">
                        📍 {d.adresse || "Adresse non renseignée"}
                      </p>

                      {d.email && (
                        <p className="text-sm text-slate-600">
                          ✉️ {d.email}
                        </p>
                      )}
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <span>
                      ⏱️{" "}
                      {estRdv
                        ? d.heureRdv || "-"
                        : estChantier
                        ? d.heureChantier || "-"
                        : estRappel
                        ? d.heureRappel || "-"
                        : "-"}
                    </span>

                    <span>
                      📄 {d.numeroDevis || "Pas de devis"}
                    </span>

                    <span>
                      🧾 {d.numeroFacture || "-"}
                    </span>

                    <span>
                      💶 {estPaiement ? `${formatMontant(d.reste || 0)} € à suivre` : "-"}
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
                        "Chantier planifié"
                      : estPaiement
                      ? "Paiement prévu / retard à surveiller"
                      : d.notes}
                  </p>

                  {estChantier && d.planningChantier && d.planningChantier.length > 0 && (
                    <div className="text-xs text-slate-600 bg-white/70 rounded-lg p-2">
                      <p className="font-semibold mb-1">Jours chantier prévus :</p>

                      <div className="flex flex-wrap gap-1">
                        {d.planningChantier.map((jour) => (
                          <button
                            key={jour}
                            onClick={() => supprimerJourChantier(d, jour)}
                            className="rounded-full border px-2 py-1 bg-white hover:bg-red-50"
                            title="Cliquer pour supprimer ce jour"
                          >
                            {jour} ✕
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
                        Déplacer RDV
                      </button>
                    )}

                    {estChantier && (
                      <button
                        onClick={() => deplacerEvenementCalendrier(d, "chantier")}
                        className="btn-blue"
                      >
                        Déplacer chantier
                      </button>
                    )}

                    {estPaiement && (
                      <button
                        onClick={() => deplacerEvenementCalendrier(d, "paiement")}
                        className="btn-orange"
                      >
                        Déplacer paiement
                      </button>
                    )}

                    {estRappel && (
                      <button
                        onClick={() => deplacerEvenementCalendrier(d, "rappel")}
                        className="btn-blue"
                      >
                        Déplacer rappel
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
        : `Événement - ${d.client}`,

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
Téléphone : ${d.telephone}
Email : ${d.email}

${d.notes || ""}`,
    });
  }}
  className="btn-purple"
>
  📅 Google
</button>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer cet événement du calendrier ?")) {
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

    const tel = window.prompt("Téléphone :") || "";
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
      coefficientFournitures: 1.3,
      fournituresClient: true,
      detailsFournitures: "",
      conditionsGeneralesDevis: "",
      conditionsChantier: "",
      commentaireFournitures: "",
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
    alert("RDV client enregistré");
  }}
  className="btn-green"
>
  ➕ Créer RDV client
</button>

        <button
          onClick={() => {
            creerRappelDepuisCalendrier(dateSelectionnee);
          }}
          className="btn-amber"
        >
          📝 Créer rappel / note
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
function BlocRepliable({
  titre, children, ouvertParDefaut = false,
  ouvert: ouvertControle, onOuvertureChange,
}: {
  titre: string;
  children: ReactNode;
  ouvertParDefaut?: boolean;
  ouvert?: boolean;
  onOuvertureChange?: (ouvert: boolean) => void;
}) {
  const [ouvertureLocale, setOuvertureLocale] = useState(ouvertParDefaut);
  const ouvert = ouvertControle ?? ouvertureLocale;
  const basculerBloc = () => {
    const prochaineOuverture = !ouvert;
    if (ouvertControle === undefined) setOuvertureLocale(prochaineOuverture);
    onOuvertureChange?.(prochaineOuverture);
  };
  return (
    <section className="atelier-panel">
      <button type="button" onClick={basculerBloc} aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-3 text-left">
        <h2 className="text-base font-bold text-slate-900">{titre}</h2>
        <span className="atelier-toggle">{ouvert ? "▲ Masquer" : "▼ Afficher"}</span>
      </button>
      {ouvert && <div className="mt-3 space-y-3">{children}</div>}
    </section>
  );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="atelier-panel">
      <h2 className="mb-3 text-base font-bold text-slate-900">{titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Card({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="atelier-result text-slate-900">
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
    <div className="atelier-result">
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
        title={value ? `Date sélectionnée : ${value}` : label}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        value={formatDateFrVersInput(value)}
        onChange={(e) => onChange(formatDateInputVersFr(e.target.value))}
      />


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
    return `${formatMontant(montant)} €`;
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
            Activité financière sur 12 mois
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Comparaison des encaissements, des dépenses
            payées et du résultat réel.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <div className="flex items-center gap-2 text-blue-700">
            <span className="h-3 w-3 rounded-full bg-blue-600" />
            Encaissements
          </div>

          <div className="flex items-center gap-2 text-red-700">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            Dépenses
          </div>

          <div className="flex items-center gap-2 text-emerald-700">
            <span className="h-3 w-3 rounded-full bg-emerald-600" />
            Résultat
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${largeur} ${hauteur}`}
          className="min-w-[900px]"
          role="img"
          aria-label="Graphique des encaissements, dépenses et résultats sur douze mois"
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

          {/* ================= LIGNE ZÉRO ================= */}

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
            stroke="#698d9b"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ================= COURBE DÉPENSES ================= */}

          <path
            d={cheminDepenses}
            fill="none"
            stroke="#b18a8b"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ================= COURBE RÉSULTAT ================= */}

          <path
            d={cheminResultat}
            fill="none"
            stroke="#82a18f"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ================= POINTS ET LIBELLÉS ================= */}

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
                  fill="#698d9b"
                >
                  <title>
                    {`${donnee.label} — Encaissements : ${formaterMontant(
                      donnee.encaissements
                    )}`}
                  </title>
                </circle>

                <circle
                  cx={x}
                  cy={yDepenses}
                  r="5"
                  fill="#b18a8b"
                >
                  <title>
                    {`${donnee.label} — Dépenses : ${formaterMontant(
                      donnee.depenses
                    )}`}
                  </title>
                </circle>

                <circle
                  cx={x}
                  cy={yResultat}
                  r="5"
                  fill="#82a18f"
                >
                  <title>
                    {`${donnee.label} — Résultat : ${formaterMontant(
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
            Sommes réellement reçues.
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="font-semibold text-red-800">
            Dépenses
          </div>

          <div className="mt-1 text-xs text-red-700">
            Achats payés pendant le mois, y compris le
            stock utilisé sur plusieurs chantiers.
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="font-semibold text-emerald-800">
            Résultat réel
          </div>

          <div className="mt-1 text-xs text-emerald-700">
            Encaissements moins dépenses.
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphiqueDepensesCategories({ donnees, annee }: {
  donnees: MoisDepensesGraphique[]; annee: number;
}) {
  const largeur = 960, hauteur = 330;
  const gauche = 90, droite = 30, haut = 25, bas = 50;
  const valeurs = donnees.flatMap((mois) => SERIES_DEPENSES.map((serie) => mois[serie.cle]));
  const maximum = Math.max(1, ...valeurs) * 1.1;
  const minimum = Math.min(0, ...valeurs);
  const x = (index: number) => gauche + index * (largeur - gauche - droite) / Math.max(1, donnees.length - 1);
  const y = (valeur: number) => haut + (maximum - valeur) / (maximum - minimum) * (hauteur - haut - bas);
  const totalSerie = (cle: typeof SERIES_DEPENSES[number]["cle"]) =>
    donnees.reduce((total, mois) => total + Math.round(mois[cle] * 100), 0) / 100;
  const vide = valeurs.every((valeur) => valeur === 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="text-lg font-bold text-slate-800">Dépenses mois par mois — {annee}</h3>
      <p className="mt-1 text-sm text-slate-500">Montants TTC des dépenses enregistrées, regroupés par date et par catégorie.</p>
      <div className="my-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
        {SERIES_DEPENSES.map((serie) => (
          <span key={serie.cle} className="flex items-center gap-2" style={{ color: serie.couleur }}>
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: serie.couleur }} />
            {serie.nom} : {formatMontant(totalSerie(serie.cle))} € sur l’année
          </span>
        ))}
      </div>
      {vide && <p className="mb-3 text-sm text-slate-500">Aucune dépense dans ces trois catégories pour cette année.</p>}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="w-full min-w-[760px]"
          role="img" aria-label={`Dépenses mensuelles en essence, fournitures et matériel pour ${annee}`}>
          {Array.from({ length: 5 }, (_, index) => {
            const valeur = maximum - index * (maximum - minimum) / 4;
            return <g key={index}>
              <line x1={gauche} x2={largeur - droite} y1={y(valeur)} y2={y(valeur)} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={gauche - 10} y={y(valeur) + 4} textAnchor="end" fontSize="11" fill="#64748b">{formatMontant(valeur)} €</text>
            </g>;
          })}
          <line x1={gauche} x2={largeur - droite} y1={y(0)} y2={y(0)} stroke="#94a3b8" />
          {SERIES_DEPENSES.map((serie, indexSerie) => (
            <g key={serie.cle}>
              <polyline points={donnees.map((mois, index) => `${x(index)},${y(mois[serie.cle])}`).join(" ")}
                fill="none" stroke={serie.couleur} strokeWidth="3" strokeLinejoin="round"
                strokeDasharray={indexSerie === 1 ? "8 4" : indexSerie === 2 ? "3 3" : undefined} />
              {donnees.map((mois, index) => (
                <circle key={index} cx={x(index)} cy={y(mois[serie.cle])} r="4" fill={serie.couleur}>
                  <title>{`${mois.label} ${annee} — ${serie.nom} : ${formatMontant(mois[serie.cle])} €`}</title>
                </circle>
              ))}
            </g>
          ))}
          {donnees.map((mois, index) => (
            <text key={index} x={x(index)} y={hauteur - 20} textAnchor="middle" fontSize="12" fill="#475569">{mois.label}</text>
          ))}
        </svg>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700">Voir les montants mois par mois</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-right">
            <caption className="sr-only">Dépenses mensuelles par catégorie en {annee}</caption>
            <thead><tr><th scope="col" className="p-2 text-left">Mois</th>
              {SERIES_DEPENSES.map((serie) => <th key={serie.cle} scope="col" className="p-2">{serie.nom}</th>)}
            </tr></thead>
            <tbody>{donnees.map((mois, index) => <tr key={index} className="border-t border-slate-100">
              <th scope="row" className="p-2 text-left font-normal">{mois.label}</th>
              {SERIES_DEPENSES.map((serie) => <td key={serie.cle} className="p-2">{formatMontant(mois[serie.cle])} €</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function SuiviAnnuelCA({ annee, suivi }: {
  annee: number; suivi: ReturnType<typeof calculerSuiviAnnuelCA>;
}) {
  const { total, seuils } = suivi;
  const progression = (limite: number) => Math.min(100, Math.max(0, total / limite * 100));
  const soldeAvantSeuil = (limite: number) => total > limite
    ? `Dépassé de ${formatMontant(total - limite)} €`
    : `${formatMontant(limite - total)} € restants`;
  return (
    <section className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3" aria-label={`Suivi annuel du chiffre d’affaires ${annee}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Depuis le 1er janvier {annee}</h3>
        <strong className="text-lg text-blue-800">{formatMontant(total)} € de CA suivi</strong>
      </div>
      {seuils ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <MiniResult titre={`Avant le seuil TVA de ${formatMontant(seuils.tva)} €`}
              valeur={soldeAvantSeuil(seuils.tva)} couleur={total > seuils.tva ? "text-orange-700" : "text-green-700"} />
            <MiniResult titre={`Avant le seuil majoré (+10 %) de ${formatMontant(seuils.tvaMajore)} €`}
              valeur={soldeAvantSeuil(seuils.tvaMajore)} couleur={total > seuils.tvaMajore ? "text-red-700" : "text-blue-700"} />
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex flex-wrap justify-between gap-1 text-xs font-semibold">
              <span>Seuil majoré de TVA : {formatMontant(total / seuils.tvaMajore * 100)} % utilisés</span>
              <span>{formatMontant(seuils.tvaMajore)} €</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full border border-blue-200 bg-white"
              role="progressbar" aria-label="Chiffre d’affaires par rapport au seuil majoré de TVA"
              aria-valuemin={0} aria-valuemax={seuils.tvaMajore}
              aria-valuenow={Math.min(total, seuils.tvaMajore)}
              aria-valuetext={`${formatMontant(total)} € sur ${formatMontant(seuils.tvaMajore)} €`}>
              <div className="h-full rounded-full" style={{ width: `${progression(seuils.tvaMajore)}%`,
                backgroundColor: total > seuils.tvaMajore ? "#bd7b80" : total > seuils.tva ? "#c7a052" : "#6eaaa3" }} />
              <span className="absolute inset-y-0 w-px bg-amber-800" style={{ left: `${seuils.tva / seuils.tvaMajore * 100}%` }} aria-hidden="true" />
            </div>
          </div>
          {total > seuils.tvaMajore ? (
            <p role="status" className="mt-2 text-xs font-semibold text-red-800">
              Seuil majoré dépassé : la franchise de TVA cesse dès le dépassement.
            </p>
          ) : total > seuils.tva ? (
            <p role="status" className="mt-2 text-xs font-semibold text-orange-800">
              Seuil de base dépassé : TVA à prévoir au 1er janvier suivant si la franchise reste applicable cette année.
            </p>
          ) : (
            <p className="mt-2 text-xs text-green-800">
              CA suivi sous le seuil TVA de base. Le repère doré indique ce seuil.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-700">
            Plafond micro services {annee} : <strong>{formatMontant(seuils.micro)} €</strong>
            {" — "}{soldeAvantSeuil(seuils.micro)}.
          </p>
        </>
      ) : <p className="text-xs text-slate-600">Repères de seuils à renseigner pour {annee}.</p>}
      <p className="mt-2 text-xs text-slate-500">
        Encaissements et corrections mensuelles de l’appli, à rapprocher du CA déclaré à l’URSSAF.
        Repères prestations de services ; la franchise TVA dépend aussi du CA de l’année précédente.
      </p>
    </section>
  );
}
