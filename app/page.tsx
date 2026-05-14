"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { jsPDF } from "jspdf";

import {
  TARIFS_PRESTATIONS,
  DETAILS_PDF_PAR_CATEGORIE,
} from "../data/TARIFS_PRESTATIONS";

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
  return TARIFS_PRESTATIONS.find(
    (item) => item.prestation === nomPrestation
  );
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

type Dossier = {
  
  montantEncaisse?: number;
  factureSap?: boolean;
numeroSap?: string;
  kmAller?: number;
achatFournitures?: number;
coefficientFournitures?: number;
fournituresClient?: boolean;
detailsFournitures?: string;
reventeFournitures?: number;
margeFournitures?: number;
  id: number;
  client: string;
  telephone: string;
  email: string;
  adresse: string;
  adresseAgence: string;
  notes: string;
  modeClient: string;
  clientFinalNom?: string;
clientFinalTelephone?: string;
clientFinalAdresse?: string;
  lignesTravaux: LigneTravaux[];
  numeroDevis: string;
  numeroFacture: string;
  total: number;
  acompte: number;
  reste: number;
  statutDevis: string;
  statutChantier: string;
  facturePayee: boolean;
  priorite?: string;
  date: string;
  dateChantier?: string;
  heureChantier?: string;
  dateRdv?: string;
heureRdv?: string;
motifRdv?: string;
typeRdv?: string;
  datePaiement?: string;
  locataire: string;
 telephoneLocataire: string;

 proprietaire: string;
 telephoneProprietaire: string;
 agence: string;
 referenceChantier: string;
 complementAdresse: string;
 
 
};

const prestations = TARIFS_PRESTATIONS;

const categories = Array.from(
  new Set(prestations.map((p) => p.categorie))
);

const getPrestationsByCategorie = (categorie: string) => {
  return prestations.filter((p) => p.categorie === categorie);
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
    nom: "Jérémie Meurisse",
    telephone: "06 50 95 10 89",
    email: "",
    adresse: "Revel",
    adresseAgence: "",
    complementAdresse: "",
    notes: "Sous-traitance Jérémie — base 150 €/jour — hors fournitures.",
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
    nom: "Elodie - Patrimoine Occitan",
    telephone: "06 76 04 77 19",
    email: "gestion@patrimoine-occitan.fr",
    adresse: "Revel",
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

  if (d.length > 0) return d;

  return [
    "Réalisation de la prestation prévue au devis",
    "Ajustements simples",
    "Finitions standards",
    "Nettoyage de fin d’intervention",
  ];
}
function prixLigne(ligne: LigneTravaux, modeClient: string) {
  const c = modeClient === "jeremie" ? 0.68 : 1;

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
  const backups = JSON.parse(localStorage.getItem("backupHistoriqueV24") || "[]");

  const sauvegarde = backups[index];
  if (!sauvegarde) return;

  const d = sauvegarde.data;

  setHistorique(d.historique || []);
  setDepenses(d.depenses || []);
  setClientsEnregistres(d.clientsEnregistres || clientsBase);
  setCompteurDevis(d.compteurDevis ?? 1);
  setCompteurFacture(d.compteurFacture ?? 1);
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
setAchatFournitures(b.achatFournitures ?? 0);
setCoefficientFournitures(b.coefficientFournitures ?? 1.22);
setFournituresClient(b.fournituresClient ?? true);
setDetailsFournitures(b.detailsFournitures || "");
    setLignesTravaux(b.lignesTravaux || []);

    setMontantEncaisse(b.montantEncaisse ?? 0);
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
  const importRef = useRef<HTMLInputElement | null>(null);
const actionsRef = useRef<HTMLDivElement | null>(null);
const inputClientRef = useRef<HTMLInputElement | null>(null);
const ficheClientRef = useRef<HTMLDivElement | null>(null);
const lignesTravauxRef = useRef<HTMLDivElement | null>(null);
const derniereLigneRef = useRef<HTMLDivElement | null>(null);
  const [montantEncaisse, setMontantEncaisse] = useState(0);
const [datePaiement, setDatePaiement] = useState("");
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
  const [compteurDevis, setCompteurDevis] = useState(1);
  const [compteurFacture, setCompteurFacture] = useState(1);
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
  const [notes, setNotes] = useState("Sous-traitance Jérémie — base 150 €/jour — hors fournitures.");
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
  const [numeroDevis, setNumeroDevis] = useState("");
const [numeroFacture, setNumeroFacture] = useState("");

  const [lignesTravaux, setLignesTravaux] = useState<LigneTravaux[]>([]);

const [idDossierActuel, setIdDossierActuel] = useState<number | null>(null);
  const [kmAller, setKmAller] = useState(37);
  const [achatFournitures, setAchatFournitures] = useState(0);
  const [coefficientFournitures, setCoefficientFournitures] = useState(1.22);
  const [fournituresClient, setFournituresClient] = useState(true);
  const [detailsFournitures, setDetailsFournitures] = useState("");

  const [statutDevis, setStatutDevis] = useState("envoye");
  const [pourcentageAcompte, setPourcentageAcompte] = useState(30);
  const [statutChantier, setStatutChantier] = useState("a_planifier");
  const [facturePayee, setFacturePayee] = useState(false);
  const today = new Date();

const [moisSelectionne, setMoisSelectionne] = useState(today.getMonth());
const [anneeSelectionnee, setAnneeSelectionnee] = useState(today.getFullYear());
const [sauvegardePrete, setSauvegardePrete] = useState(false);
const [sauvegardesOuvertes, setSauvegardesOuvertes] = useState(false);
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
  const sauvegarde = localStorage.getItem("tableauDeBordEntrepriseV24");

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
      setCompteurDevis(d.compteurDevis ?? 1);
      setCompteurFacture(d.compteurFacture ?? 1);
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

  setSauvegardePrete(true);
}, []);

useEffect(() => {
  if (!sauvegardePrete) return;

 const donnees = construireSauvegardeComplete();

  localStorage.setItem("tableauDeBordEntrepriseV24", JSON.stringify(donnees));
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
  clientsEnregistres,
heureChantier,
dateRdv,
heureRdv,
motifRdv,
typeRdv,
kmAller,
achatFournitures,
coefficientFournitures,
fournituresClient,
detailsFournitures,
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
  const backups = JSON.parse(localStorage.getItem("backupHistoriqueV24") || "[]");

  const maintenant = new Date();
  const horodatage = `${maintenant.getDate()}-${maintenant.getMonth() + 1}-${maintenant.getFullYear()}_${maintenant.getHours()}h${maintenant.getMinutes()}`;

  backups.push({
    date: horodatage,
    data: donnees,
  });

  // 🔒 garde seulement les 10 dernières sauvegardes
  const backupsLimites = backups.slice(-10);

  localStorage.setItem("backupHistoriqueV24", JSON.stringify(backupsLimites));

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
      achatFournitures,
      coefficientFournitures,
      fournituresClient,
      detailsFournitures,

      montantEncaisse,
      pourcentageAcompte,
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

  const fraisLogistique =
    dossierVide || kmAR <= 0
      ? 0
      : Math.round(prixPremierJour + prixJoursSuivants);

  // ================= FOURNITURES =================
  const reventeFournitures = fournituresClient
    ? 0
    : Math.round(achatFournitures * coefficientFournitures);

  const margeFournitures =
    fournituresClient || achatFournitures === 0
      ? 0
      : reventeFournitures - achatFournitures;

  let total = totalTravaux + fraisLogistique + reventeFournitures;

  // ================= MINIMUM CHANTIER =================
  const minimumChantier = 80;

  if (!dossierVide && total < minimumChantier) {
    total = minimumChantier;
  }

  const acompte =
    modeClient === "jeremie"
      ? 0
      : Math.round(total * (pourcentageAcompte / 100));

  const reste = total - acompte;
  const resteReel = total - montantEncaisse;

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
]);
const joursCalendrier = useMemo(() => {
  
  const premierJour = new Date(anneeSelectionnee, moisSelectionne, 1);
  const dernierJour = new Date(anneeSelectionnee, moisSelectionne + 1, 0);

  
  const decalage = (premierJour.getDay() + 6) % 7;
  const totalCases = Math.ceil((decalage + dernierJour.getDate()) / 7) * 7;

  return Array.from({ length: totalCases }, (_, index) => {
    const numeroJour = index - decalage + 1;

    if (numeroJour < 1 || numeroJour > dernierJour.getDate()) {
      return null;
    }

    const dateCase = new Date(anneeSelectionnee, moisSelectionne, numeroJour);

    const dossiersJour = historique.filter((d) => {
      const dateChantierObj = parseDateFr(d.dateChantier || "");
      const datePaiementObj = parseDateFr(d.datePaiement || "");
const dateRdvObj = parseDateFr(d.dateRdv || "");
const memeJourRdv =
  dateRdvObj &&
  dateRdvObj.getDate() === dateCase.getDate() &&
  dateRdvObj.getMonth() === dateCase.getMonth() &&
  dateRdvObj.getFullYear() === dateCase.getFullYear();
      const memeJourChantier =
        dateChantierObj &&
        dateChantierObj.getDate() === dateCase.getDate() &&
        dateChantierObj.getMonth() === dateCase.getMonth() &&
        dateChantierObj.getFullYear() === dateCase.getFullYear();

      const memeJourPaiement =
        datePaiementObj &&
        datePaiementObj.getDate() === dateCase.getDate() &&
        datePaiementObj.getMonth() === dateCase.getMonth() &&
        datePaiementObj.getFullYear() === dateCase.getFullYear();

      return memeJourRdv || memeJourChantier || memeJourPaiement;
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
  setAdresse(fiche.adresse || "");
  setAdresseAgence(fiche.adresseAgence || "");
  setComplementAdresse(fiche.complementAdresse || "");
  setNotes(fiche.notes || "");
  setModeClient(fiche.modeClient || "normal");
  setAgence(fiche.agence || "");
};
  const ajouterLigne = () => {
    setLignesTravaux([]);
  };

  const modifierLigne = (id: number, champ: keyof LigneTravaux, valeur: string | number) => {
    setLignesTravaux(
      lignesTravaux.map((l) =>
        l.id === id ? { ...l, [champ]: champ === "type" ? valeur : Number(valeur) } : l
      )
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
  setAchatFournitures(0);
  setCoefficientFournitures(1.22);
  setFournituresClient(true);
  setDetailsFournitures("");

  setMontantEncaisse(0);
  setPourcentageAcompte(30);

  setFactureSap(false);
setNumeroSap("");

  setStatutDevis("en_cours");
  setStatutChantier("a_planifier");
  setFacturePayee(false);

  setPriorite("normale");
  setDatePaiement("");
  setDateChantier("");

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

  setClient("RDV client à compléter");
  setTelephone("");
  setEmail("");
  setAdresse("");
  setAdresseAgence("");
  setComplementAdresse("");

  setNotes("RDV créé depuis le calendrier — à compléter");

  setModeClient("normal");

  setNumeroDevis("");
  setNumeroFacture("");

  setLignesTravaux([]);

  setKmAller(0);
  setAchatFournitures(0);
  setFournituresClient(true);
  setCoefficientFournitures(1.22);
  setDetailsFournitures("");

  setMontantEncaisse(0);
  setPourcentageAcompte(30);

  setStatutDevis("estimation_rapide");
  setStatutChantier("rdv_client");

  setDateRdv(dateFormatee);
  setHeureRdv("");
  setMotifRdv("Visite chantier / RDV client");
  setTypeRdv("visite");

  setDateChantier("");
  setHeureChantier("");
  setDatePaiement("");

  setTimeout(() => {
  inputClientRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  inputClientRef.current?.focus();
}, 150);
  };

const enregistrer = () => {
  const nouveau = idDossierActuel === null;

  const numeroDevisFinal = numeroDevis;
const numeroFactureFinal = numeroFacture;

  const idFinal = idDossierActuel ?? Date.now();

  const item: Dossier = {
    id: idFinal,
    montantEncaisse,
    kmAller,
achatFournitures,
coefficientFournitures,
fournituresClient,
detailsFournitures,
reventeFournitures: calcul.reventeFournitures,
margeFournitures: calcul.margeFournitures,
    dateChantier,
    heureChantier,
    datePaiement,
    dateRdv,
heureRdv,
motifRdv,
typeRdv,
    priorite,
    client,
    telephone,
    email,
    adresse,
    adresseAgence,
    notes,
    modeClient,
    clientFinalNom,
clientFinalTelephone,
clientFinalAdresse,
    lignesTravaux,
    numeroDevis: numeroDevisFinal,
    numeroFacture: numeroFactureFinal,
    total: calcul.total,
    acompte: calcul.acompte,
    reste: Math.max(0, calcul.total - montantEncaisse),
    statutDevis,
    statutChantier,
    facturePayee,
    date: new Date().toLocaleDateString("fr-FR"),
    locataire,
    telephoneLocataire,
    proprietaire,
    telephoneProprietaire,
    agence,
    referenceChantier,
    complementAdresse,
  };
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
  setHistorique((ancien) => {
    const existeDeja = ancien.some((d) => d.id === idFinal);

    if (existeDeja) {
      return ancien.map((d) => (d.id === idFinal ? item : d));
    }

    return [item, ...ancien];
  });

  
  setIdDossierActuel(idFinal);

  alert("Dossier enregistré");
};

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
  setFactureSap(d.factureSap || false);
setNumeroSap(d.numeroSap || "");
  setKmAller(d.kmAller ?? 0);
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
  setPriorite(d.priorite || "normale");

  setLocataire(d.locataire || "");
  setTelephoneLocataire(d.telephoneLocataire || "");
  setProprietaire(d.proprietaire || "");
  setTelephoneProprietaire(d.telephoneProprietaire || "");
  setAgence(d.agence || "");
  setReferenceChantier(d.referenceChantier || "");
  setComplementAdresse(d.complementAdresse || "");

  actionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

const envoyerDevisMail = () => {
  genererPDF("devis");

  // 🔥 passage automatique en "envoyé"
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

  const sujet = `Devis ${numeroDevis} - Adrien et ses mains`;

  const corps = `Bonjour ${client},

Veuillez trouver ci-joint le devis ${numeroDevis} concernant votre demande de travaux.

Ce devis reste valable 30 jours.

Je reste disponible pour toute question ou ajustement si nécessaire.

Belle journée

Merci pour la confiance accordée

Adrien et ses mains
06 71 17 11 76
adrienetsesmains@gmail.com`;

  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    sujet
  )}&body=${encodeURIComponent(corps)}`;

  window.location.href = mailto;
};
const envoyerFactureMail = () => {
  genererPDF("facture");

  const sujet = `Facture ${numeroFacture} - Adrien et ses mains`;

  const corps = `Bonjour ${client},

Veuillez trouver ci-joint la facture ${numeroFacture} concernant les travaux réalisés.

Le reste à payer est de ${Math.max(0, calcul.total - montantEncaisse)} €.

Je reste disponible si besoin.

Belle journée

Merci pour la confiance accordée

Adrien et ses mains
06 71 17 11 76
adrienetsesmains@gmail.com`;

  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    sujet
  )}&body=${encodeURIComponent(corps)}`;

  window.location.href = mailto;
};
const preparerRelance = (d: Dossier) => {
  const sujet = `Relance facture ${d.numeroFacture}`;

  const corps = `Bonjour ${d.client},

Je me permets de revenir vers vous concernant la facture ${d.numeroFacture}, établie suite au devis signé ${d.numeroDevis}.

Le règlement prévu pour un montant restant de ${d.reste} € semble ne pas avoir encore été réceptionné.

Sauf erreur de ma part, pouvez-vous me confirmer la date de règlement prévue ?

Je reste bien entendu disponible si besoin.

Belle journée

Merci pour la confiance accordée

Adrien et ses mains
06 71 17 11 76
adrienetsesmains@gmail.com`;

  const mailto = `mailto:${d.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;

  window.location.href = mailto;
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

  const totalEncaisse = dossiersDuMois.reduce(
    (somme, d) => somme + (d.montantEncaisse || 0),
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

    if (
      datePaiement &&
      datePaiement < new Date() &&
      !d.facturePayee
    ) {
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
    alerteFaible: totalEncaisse < objectifMensuel,
  };
}, [historique, depenses, moisSelectionne, anneeSelectionnee]);

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

  const data = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(
      aujourdHui.getFullYear(),
      aujourdHui.getMonth() - i,
      1
    );

    const mois = date.getMonth();
    const annee = date.getFullYear();

    const total = historique.reduce((somme, d) => {
      const datePaiement = parseDateFr(d.datePaiement || "") ||
        parseDateFr(d.date || "");

      if (
        datePaiement &&
        datePaiement.getMonth() === mois &&
        datePaiement.getFullYear() === annee
      ) {
        return somme + (d.montantEncaisse || 0);
      }

      return somme;
    }, 0);

    data.push({
      label: date.toLocaleString("fr-FR", {
        month: "short",
        year: "2-digit",
      }),
      total,
    });
  }

  return data;
}, [historique]);
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
  const q = rechercheHistorique.toLowerCase().trim();

  if (!q) return historique;

  return historique.filter((d) =>
    `${d.client} ${d.telephone} ${d.numeroDevis} ${d.numeroFacture}`
      .toLowerCase()
      .includes(q)
  );
}, [historique, rechercheHistorique]);

const resultatsCalendrier = useMemo(() => {
  const q = rechercheCalendrier.toLowerCase().trim();

  if (!q) return [];

  return historique.filter((d) =>
    `
    ${d.client}
    ${d.telephone}
    ${d.email}
    ${d.adresse}
    ${d.numeroDevis}
    ${d.numeroFacture}
    ${d.referenceChantier}
    ${d.locataire}
    ${d.proprietaire}
    `
      .toLowerCase()
      .includes(q)
  );
}, [historique, rechercheCalendrier]);
  
const reinitialiserApplicationComplete = () => {
  const confirmation = window.confirm(
    "⚠️ Voulez-vous vraiment réinitialiser toute l’application ?\n\nCela va supprimer le brouillon actuel, l’historique, les clients enregistrés, les dépenses et les compteurs."
  );

  if (!confirmation) return;

  const confirmationFinale = window.confirm(
    "Dernière confirmation : cette action est définitive si vous n’avez pas exporté de sauvegarde."
  );

  if (!confirmationFinale) return;

  localStorage.removeItem("tableauDeBordEntrepriseV24");
  localStorage.removeItem("backupHistoriqueV24");

  setHistorique([]);
  setDepenses([]);
  setClientsEnregistres(clientsBase);

  setCompteurDevis(1);
  setCompteurFacture(1);
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
  a.download = "sauvegarde-dashboard-adrien-v24.json";
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

      setCompteurDevis(data.compteurDevis ?? 1);
      setCompteurFacture(data.compteurFacture ?? 1);

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

      alert("✅ Import réussi : sauvegarde complète restaurée");
    } catch (error) {
      console.error("Erreur import :", error);
      alert("❌ Erreur import : le fichier ne semble pas compatible.");
    }
  };

  reader.readAsText(file);
};

  const lignesPDF = (): [string, number][] => {
    const lignes: [string, number][] = lignesTravaux.map((l) => [l.prestationNom || nomTravaux(l.type), montantLigne(l, modeClient)]);
    lignes.push(["Frais de déplacement et logistique", calcul.fraisLogistique]);
    if (!fournituresClient && calcul.reventeFournitures > 0) {
      lignes.push(["Fournitures et approvisionnement", calcul.reventeFournitures]);
    }
    return lignes;
  };

const genererPDF = (type: "devis" | "facture") => {
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

  doc.text(
    `Facture établie suite au devis signé n° ${numeroDevis}`,
    105,
    65,
    { align: "center" }
  );

  doc.text(
    `Échéance de paiement : ${datePaiement || "À réception de facture"}`,
    105,
    70,
    { align: "center" }
  );

  doc.setTextColor(0, 0, 0);
}

doc.setDrawColor(190, 145, 55);
doc.line(92, 60, 118, 60);

  doc.setFontSize(11);
  doc.text(`N° ${numero}`, 160, 58);
  doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 160, 66);

  doc.setDrawColor(60);
  doc.roundedRect(15, 75, 85, 50, 2, 2);

if (modeClient === "agence") {
  doc.roundedRect(110, 75, 85, 78, 2, 2);
} else if (modeClient === "jeremie") {
  doc.roundedRect(110, 75, 85, 78, 2, 2);
} else {
  doc.roundedRect(110, 75, 85, 50, 2, 2);
}

  doc.setFillColor(52, 63, 79);
  doc.circle(22, 84, 4, "F");
  doc.circle(117, 84, 4, "F");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.text("CLIENT", 30, 85);
  doc.text("CHANTIER", 125, 85);

  doc.setFontSize(10);
  doc.text(`Nom : ${client || "-"}`, 20, 94);
  doc.text(`Telephone : ${telephone || "-"}`, 20, 101);
  doc.text(`Email : ${email || "-"}`, 20, 108);
 const adresseClientCoupee = doc.splitTextToSize(
  modeClient === "agence"
    ? `Adresse agence : ${adresseAgence || "-"}`
    : `Adresse : ${adresse || "-"}`,
  75
);

doc.text(adresseClientCoupee[0], 20, 115);

if (adresseClientCoupee.length > 1) {
  doc.text(
    adresseClientCoupee.slice(1),
    48,
    120
  );
}
 
if (modeClient === "agence") {
  doc.setFontSize(10);

  doc.text(`Ref : ${referenceChantier || "-"}`, 115, 94);
doc.text(`Locataire : ${locataire || "-"}`, 115, 101);
doc.text(`Tel locataire : ${telephoneLocataire || "-"}`, 115, 108);

doc.text(`Proprietaire : ${proprietaire || "-"}`, 115, 115);
doc.text(`Tel proprietaire : ${telephoneProprietaire || "-"}`, 115, 122);

const adresseChantierCoupee = doc.splitTextToSize(
  `Adresse chantier : ${adresse || "-"}`,
  75
);

doc.text(adresseChantierCoupee[0], 115, 129);

if (adresseChantierCoupee.length > 1) {
  doc.text(
  adresseChantierCoupee.slice(1),
  144,
  134
);
}

let yAdresseSuite =
  129 + adresseChantierCoupee.length * 5 + 1;

if (complementAdresse) {
  const complementCoupe = doc.splitTextToSize(
    `Complement : ${complementAdresse}`,
    75
  );

  doc.text(complementCoupe, 115, yAdresseSuite);
}

} else if (modeClient === "jeremie") {
  doc.text(`Client final : ${clientFinalNom || "-"}`, 115, 94);
  doc.text(`Tel client final : ${clientFinalTelephone || "-"}`, 115, 101);

  const adresseFinaleCoupee = doc.splitTextToSize(
    `Adresse intervention : ${clientFinalAdresse || adresse || "-"}`,
    75
  );

  doc.text(adresseFinaleCoupee[0], 115, 108);

  if (adresseFinaleCoupee.length > 1) {
    doc.text(adresseFinaleCoupee.slice(1), 150, 113);
  }

  doc.text(`Statut devis : ${statutDevis}`, 115, 121);
  doc.text(`Statut chantier : ${statutChantier}`, 115, 129);
  doc.text("Validite devis : 30 jours", 115, 137);
} else {
  doc.text(`Statut devis : ${statutDevis}`, 115, 104);
  doc.text(`Statut chantier : ${statutChantier}`, 115, 112);
  doc.text("Validite devis : 30 jours", 115, 120);
}

  enteteTableau();
// ================= TABLEAU COMPACT =================
const lignesDevisPDF = lignesPDF();

lignesDevisPDF.forEach(([designationBrute, montant], index) => {
  const ligneSource = lignesTravaux[index];

  const designation =
    ligneSource?.prestationNom
      ? ligneSource.unite === "m²" || ligneSource.unite === "ml"
  ? ligneSource.prestationNom
  : `${ligneSource.prestationNom} — ${ligneSource.q1} ${ligneSource.unite || ""}`
      : designationBrute;

  const detailsLimites =
    ligneSource
      ? detailsTravaux(ligneSource).slice(0, 2)
      : designationBrute.includes("déplacement")
      ? [`Déplacement aller-retour estimé : ${calcul.kmAR} km`]
      : designationBrute.includes("Fournitures")
      ? [detailsFournitures || "Fournitures et approvisionnement prévus au devis"]
      : [];

  const detail = detailsLimites.map((t) => `• ${t}`).join("\n");

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${Math.round(montant)} €`, 182, y, { align: "right" });

  y += designationCoupe.length * 4;

  if (detailCoupe.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(90);
    doc.text(detailCoupe, 20, y);
    y += detailCoupe.length * 3;
  }

  doc.setDrawColor(220);
  doc.line(15, y - 2, 195, y - 2);

  y += 2;
});

// ================= BLOC TOTAL COMPACT =================
if (y + 35 > 292) {
  doc.addPage();
  page += 1;
  y = 35;
}

const dejaEncaissePDF = montantEncaisse || 0;
const resteAPayerPDF = Math.max(0, calcul.total - dejaEncaissePDF);

doc.setFillColor(248, 244, 236);
doc.setDrawColor(190, 145, 55);
doc.roundedRect(108, y, 87, 32, 3, 3, "FD");

doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(0, 0, 0);

doc.text("Montant total", 115, y + 10);
doc.text(`${Math.round(calcul.total)} €`, 188, y + 10, { align: "right" });

if (type === "devis") {
  doc.text("Acompte demandé", 115, y + 18);
  doc.text(`${Math.round(calcul.acompte)} €`, 188, y + 18, { align: "right" });

  doc.setDrawColor(180);
  doc.line(115, y + 21, 190, y + 21);

  doc.setFont("helvetica", "bold");
  doc.text("Reste à payer", 115, y + 28);
  doc.text(`${Math.round(calcul.reste)} €`, 188, y + 28, { align: "right" });
}

if (type === "facture") {
  doc.text("Déjà encaissé", 115, y + 18);
  doc.text(`${Math.round(dejaEncaissePDF)} €`, 188, y + 18, { align: "right" });

  doc.setDrawColor(180);
  doc.line(115, y + 21, 190, y + 21);

  doc.setFont("helvetica", "bold");
  doc.text("Reste à payer", 115, y + 28);
  doc.text(`${Math.round(resteAPayerPDF)} €`, 188, y + 28, { align: "right" });
}

y += 38;


// ================= MENTION SAP FACTURE =================
if (type === "facture" && factureSap) {
  if (y + 34 > 292) {
    doc.addPage();
    page += 1;
    y = 35;
  }

  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(15, y, 180, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text("MENTION SERVICES A LA PERSONNE", 20, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(30, 64, 54);

  const texteSap = numeroSap
    ? `Prestation relevant des services à la personne - Numéro de déclaration SAP : ${numeroSap}. Sous réserve des conditions prévues par l'article 199 sexdecies du CGI, cette prestation peut ouvrir droit à un crédit d'impôt de 50 % des sommes effectivement supportées par le client.`
    : `Prestation relevant des services à la personne. Sous réserve des conditions prévues par l'article 199 sexdecies du CGI, cette prestation peut ouvrir droit à un crédit d'impôt de 50 % des sommes effectivement supportées par le client.`;

  const lignesSap = doc.splitTextToSize(texteSap, 168);
  doc.text(lignesSap, 20, y + 15);

  y += 34;
}


// ================= CONDITIONS + SIGNATURE PREMIUM COMPACT =================

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
  "Le présent devis est établi sous réserve de l’état réel des supports existants.",
  "Toute dégradation cachée, humidité, support friable ou anomalie non visible pourra entraîner un ajustement.",
  "Les travaux supplémentaires non prévus feront l’objet d’un accord préalable du client.",
  "Les fournitures non mentionnées au devis ne sont pas incluses.",
  "Le client reconnaît que les quantités et prix sont basés sur les éléments visibles au moment de l’estimation.",
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

if (type === "devis") {
  doc.setDrawColor(80);
  doc.line(140, yConditions + 17, 140, yConditions + 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Bon pour accord", 167, yConditions + 22, { align: "center" });
  doc.text("Date :        /        / 2026", 150, yConditions + 30);

  doc.rect(147, yConditions + 35, 42, 15);

  doc.setFontSize(8.5);
  doc.text("Signature client", 167, yConditions + 57, { align: "center" });
}

y = yConditions + 82;


// ================= RIB / MODALITES DE PAIEMENT PREMIUM =================
if (ribIban || ribTitulaire || ribBic || ribBanque) {
  if (y + 46 > 292) {
    doc.addPage();
    page += 1;
    y = 35;
  }

  doc.setDrawColor(190, 145, 55);
  doc.setFillColor(248, 244, 236);
  doc.roundedRect(15, y, 180, 42, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(52, 63, 79);
  doc.text("MODALITES DE PAIEMENT", 25, y + 10);

  doc.setDrawColor(190, 145, 55);
  doc.line(25, y + 13, 78, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  doc.text("Règlement par virement bancaire :", 25, y + 22);

  if (type === "devis") {
    doc.text("Un acompte pourra être demandé à la validation du devis.", 25, y + 28);
  } else {
    doc.text("Merci d’indiquer le numéro de facture en libellé de virement.", 25, y + 28);
  }

  doc.setDrawColor(220);
  doc.line(102, y + 7, 102, y + 35);

  let ribY = y + 10;

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

    const ibanCoupe = doc.splitTextToSize(ribIban, 56);
    doc.text(ibanCoupe, 132, ribY);
    ribY += ibanCoupe.length * 5;
  }

  if (ribBic) {
    doc.setFont("helvetica", "bold");
    doc.text("BIC :", 108, ribY);
    doc.setFont("helvetica", "normal");
    doc.text(ribBic, 132, ribY);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  y += 48;
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

  doc.save(`${numero}-${client || "client"}.pdf`);
}; 


  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-900 md:p-4">

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
<Bloc titre="Résumé express chantier">
  <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">

    <MiniResult
      titre="Client"
      valeur={resumeExpress.clientEnCours}
    />

    <MiniResult
      titre="Total"
      valeur={`${resumeExpress.totalDevis} €`}
      couleur="text-blue-700"
    />

    <MiniResult
      titre="Encaissé"
      valeur={`${resumeExpress.dejaEncaisse} €`}
      couleur="text-green-700"
    />

    <MiniResult
      titre="Reste"
      valeur={`${resumeExpress.resteReel} €`}
      couleur="text-orange-600"
    />

    <MiniResult
      titre="Priorité"
      valeur={resumeExpress.prioriteActuelle}
    />

    <MiniResult
      titre="Paiement"
      valeur={resumeExpress.paiementPrevu}
    />

  </div>

  <div className="mt-3 rounded-lg border bg-slate-50 p-3">
    <button
      type="button"
      onClick={() => {
  const backups = JSON.parse(localStorage.getItem("backupHistoriqueV24") || "[]");
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
                  localStorage.getItem("backupHistoriqueV24") || "[]"
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
</Bloc>
          <p className="text-sm text-amber-300">Adrien et ses mains</p>
          <h1 className="mt-1 text-2xl font-bold">Tableau de bord entreprise V24</h1>
          <p className="mt-1 text-sm text-slate-200">
          Devis multi-lignes : plusieurs types de travaux dans un même devis.</p>
        {statutDevis === "estimation_rapide" && (
  <div className="mt-4 inline-block rounded-xl bg-yellow-400 px-4 py-2 font-bold text-slate-900">
    🟡 MODE ESTIMATION RAPIDE
  </div>
)}
        </section>
<Bloc titre="Tableau de bord mensuel">

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

  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 mt-3">

    <MiniResult titre="Encaisse" valeur={`${tableauMensuel.totalEncaisse} €`} couleur="text-green-700" />
    <MiniResult titre="Reste" valeur={`${tableauMensuel.resteAEncaisser} €`} couleur="text-orange-600" />
    <MiniResult titre="Relance" valeur={`${tableauMensuel.totalRelance} €`} couleur="text-red-600" />
    <MiniResult titre="Dépenses" valeur={`${tableauMensuel.totalDepenses} €`} couleur="text-red-700" />
<MiniResult titre="Solde réel" valeur={`${tableauMensuel.soldeReel} €`} couleur="text-blue-700" />
<MiniResult titre="URSSAF" valeur={`${tableauMensuel.estimationUrssaf} €`} />
  </div>

  {tableauMensuel.alerteFaible && (
    <div className="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm font-semibold text-orange-700">
      ⚠ Objectif non atteint — vigilance trésorerie
    </div>
  )}

  <BlocRepliable titre="Graphique mensuel" ouvertParDefaut={false}>
    <GraphiqueCourbe donnees={donneesGraphique} />
  </BlocRepliable>

</Bloc>

<Bloc titre="Dépenses entreprise">
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
</Bloc>

<Bloc titre="Calendrier chantier">
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
              <p className="font-bold text-slate-800">{d.client || "Client non renseigné"}</p>
              <p className="text-sm text-slate-600">📞 {d.telephone || "Téléphone non renseigné"}</p>
              <p className="text-sm text-slate-600">📍 {d.adresse || "Adresse non renseignée"}</p>

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
</Bloc>

<div ref={actionsRef}>
  <Bloc titre="Actions principales">

    <input
      ref={importRef}
      type="file"
      accept="application/json"
      className="hidden"
      onChange={importer}
    />

    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">

      <button onClick={envoyerDevisMail} className="btn-green">
        📧 Devis
      </button>

      <button onClick={envoyerFactureMail} className="btn-green">
        📧 Facture
      </button>

      <button onClick={() => genererPDF("devis")} className="btn-blue">
        PDF devis
      </button>

      <button onClick={() => genererPDF("facture")} className="btn-emerald">
        PDF facture
      </button>

      <button
        type="button"
        onClick={() => setFactureSap(!factureSap)}
        className={factureSap ? "btn-green" : "btn-outline"}
      >
        {factureSap ? "✅ Facture SAP activée" : "🧾 Facture SAP"}
      </button>

      <button
        onClick={() => {
          setFicheOuverte(true);
          setStatutDevis("estimation_rapide");
          setNumeroDevis("");
          setNumeroFacture("");
        }}
        className="btn-orange"
      >
        ⚡ Estimation rapide
      </button>

      <button onClick={nouveauDossier} className="btn-dark">
        Nouveau
      </button>

      <button onClick={enregistrer} className="btn-amber">
        Enregistrer
      </button>

      <button onClick={exporter} className="btn-purple">
        Export
      </button>

      <button onClick={() => importRef.current?.click()} className="btn-outline">
        Import
      </button>

      <button
        onClick={reinitialiserApplicationComplete}
        className="rounded-xl border border-red-200 bg-red-50 p-3 font-bold text-red-700 hover:bg-red-100"
      >
        🧹 Réinitialiser application
      </button>

    </div>
  </Bloc>
</div>

  
        {ficheOuverte && (
<section ref={ficheClientRef} className="grid gap-6 lg:grid-cols-2">
  <Bloc titre="Client">
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
  <label className="text-sm font-medium">Client</label>

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
            {modeClient === "agence" && (
  <Input label="Adresse de l’agence" value={adresseAgence} onChange={setAdresseAgence} />
)}

<Input label={modeClient === "agence" ? "Adresse chantier / appartement" : "Adresse client / chantier"} value={adresse} onChange={setAdresse} />
<Input label="Complément d’adresse / étage / appartement / bâtiment" value={complementAdresse} onChange={setComplementAdresse} />
            <TextArea label="Notes" value={notes} onChange={setNotes} />
          </Bloc>

          <Bloc titre="Dossier">
            <NumberInput
  label="Montant déjà encaissé"
  value={montantEncaisse}
  onChange={setMontantEncaisse}
/>
            <Input label="Numéro devis" value={numeroDevis} onChange={setNumeroDevis} />
            <Input label="Numéro facture" value={numeroFacture} onChange={setNumeroFacture} />
            {factureSap && (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
    <Input
      label="Numéro déclaration SAP"
      value={numeroSap}
      onChange={setNumeroSap}
    />

    <p className="mt-2 text-xs font-semibold text-emerald-700">
      Cette mention sera ajoutée uniquement sur les factures SAP.
    </p>
  </div>
)}
            <Select label="Type client" value={modeClient} onChange={setModeClient} options={[["jeremie", "Jérémie"], ["normal", "Particulier"], ["agence", "Agence immobilière"]]} />
{(modeClient === "agence" || modeClient === "jeremie") && (
  <div className="space-y-4 rounded-2xl border bg-slate-50 p-4">
    {modeClient === "agence" && (
      <>
        <Input label="Nom de l’agence" value={agence} onChange={setAgence} />
        <Input label="Référence chantier agence" value={referenceChantier} onChange={setReferenceChantier} />
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
          </Bloc>
        </section>
)}
<BlocRepliable titre="Lignes de travaux" ouvertParDefaut={true}>
  <div ref={lignesTravauxRef} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
    <Select
      label="Catégorie"
      value={categorieSelectionnee}
      onChange={(v) => {
        setCategorieSelectionnee(v);
        setPrestationSelectionnee("");
      }}
      options={[
        ["", "Choisir une catégorie"],
        ...categories.map((categorie) => [categorie, categorie]),
      ]}
    />

    <Select
      label="Prestation"
      value={prestationSelectionnee}
      onChange={setPrestationSelectionnee}
      options={[
        ["", "Choisir une prestation"],
        ...getPrestationsByCategorie(categorieSelectionnee).map((p) => [
          p.id,
          `${p.prestation} — ${p.prix220} €/${p.unite}`,
        ]),
      ]}
    />

    <button
      type="button"
      onClick={() => {
        const prestationTrouvee = TARIFS_PRESTATIONS.find(
          (p) => p.id === prestationSelectionnee
        );

        if (!prestationTrouvee) {
          alert("Choisis une prestation avant d'ajouter une ligne.");
          return;
        }

        const prixClient =
          modeClient === "jeremie"
            ? prestationTrouvee.prix150
            : prestationTrouvee.prix220;

        setLignesTravaux([
          ...lignesTravaux,
          {
            id: Date.now(),
            type: prestationTrouvee.typeTravaux || "prestation_tableau",
            q1: prestationTrouvee.unite === "forfait" ? 1 : 1,
            q2: 0,
            r1: 0,
            r2: 0,
            option: 0,

            tarifId: prestationTrouvee.id,
            prestationNom: prestationTrouvee.prestation,
            unite: prestationTrouvee.unite,
            prixUnitaire: prixClient,
prixUnitaireAuto: prixClient,
prixManuel: false,
heuresUnite: prestationTrouvee.heuresUnite,
          },
        ]);

        setPrestationSelectionnee("");

        setTimeout(() => {
          derniereLigneRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }}
      className="self-end rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white"
    >
      Ajouter
    </button>
  </div>

  <div className="space-y-5">
    {lignesTravaux.map((ligne, index) => {
      const labels = champsTravaux(ligne.type);
      const tarifAssocie = TARIFS_PRESTATIONS.find(
        (t) => t.id === ligne.tarifId
      );

      return (
        <div
          key={ligne.id}
          ref={index === lignesTravaux.length - 1 ? derniereLigneRef : null}
          className="rounded-2xl border bg-slate-50 p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-800">
              {ligne.prestationNom
                ? `${index + 1} — ${ligne.prestationNom}`
                : `${index + 1} — Prestation personnalisée`}
            </h3>

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
    {ligne.offert ? "Offert ✓" : "Offrir"}
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
           {ligne.prixUnitaire ? (
  <div className="space-y-3">
    <NumberInput
      label={`Quantité (${ligne.unite || "u"})`}
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

    {ligne.prixManuel && (
      <NumberInput
        label={`Prix unitaire manuel (€ / ${ligne.unite || "u"})`}
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
        Prix automatique du tableau : {ligne.prixUnitaireAuto || ligne.prixUnitaire} € / {ligne.unite}
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
  valeur={ligne.offert ? "Offert" : `${montantLigne(ligne, modeClient)} €`}
/>

            {tarifAssocie && (
              <>
                <Card
                  titre="Rentabilité"
                  valeur={`${tarifAssocie.rentabilite} ${tarifAssocie.action}`}
                />

                <Card
                  titre="Temps estimé"
                  valeur={`${(
                    (ligne.q1 || 1) * (tarifAssocie.heuresUnite || 0)
                  ).toFixed(1)} h`}
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
                Tarif appliqué : {ligne.prixUnitaire} € / {ligne.unite}
              </p>
            )}
          </div>
        </div>
      );
    })}
  </div>
</BlocRepliable>


  <Bloc titre="📈 Résultat devis">
  <p className="text-xs text-slate-500">
    Estimation et analyse en temps réel.
  </p>
<div className="grid gap-3 md:grid-cols-2">
  {/* Déplacement */}
  <div className="rounded-lg border bg-slate-50 px-3 py-2 space-y-2">
    <h3 className="text-sm font-bold text-slate-800">
      🚚 Déplacement
    </h3>

    <NumberInput
      label="KM aller"
      value={kmAller}
      onChange={setKmAller}
    />

    <p className="text-xs text-slate-500">
      {calcul.kmAR} km A/R → {calcul.fraisLogistique} €
    </p>
  </div>

 {/* Fournitures */}
<div className="rounded-lg border bg-slate-50 px-3 py-2 space-y-2">
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
  label="Détail des fournitures incluses / exclues"
  value={detailsFournitures}
  onChange={setDetailsFournitures}
/>
</div>

      <div className="grid gap-2 md:grid-cols-3">
        <MiniResult titre="Achat" valeur={`${achatFournitures} €`} />
        <MiniResult titre="Revente" valeur={`${calcul.reventeFournitures} €`} couleur="text-blue-700" />
        <MiniResult titre="Marge" valeur={`${calcul.margeFournitures} €`} couleur="text-green-700" />
      </div>

      <p className="text-xs text-slate-500">
        Minimum conseillé : coefficient 1.22. Idéal selon chantier : jusqu’à 1.6.
      </p>
    </div>
  )}

  {fournituresClient && (
    <p className="text-xs text-slate-500">
      Les fournitures ne sont pas ajoutées au devis.
    </p>
  )}
</div>

  {/* ESTIMATIONS */}
  {statutDevis === "estimation_rapide" && (
    <>
      <MiniResult titre="Basse" valeur={`${calcul.estimationBasse} €`} couleur="text-green-700" />
      <MiniResult titre="Haute" valeur={`${calcul.estimationHaute} €`} couleur="text-orange-600" />

      <div className="col-span-2 rounded-lg border border-purple-300 bg-purple-50 px-4 py-2">
        <p className="text-xs text-purple-600">💬 Prix à annoncer</p>
        <p className="text-xl font-bold text-purple-800">
          {calcul.prixConseille} €
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

    <div className="grid gap-2 md:grid-cols-4">
      <MiniResult titre="Travaux" valeur={`${calcul.totalTravaux} €`} />
      <MiniResult titre="Déplacement" valeur={`${calcul.fraisLogistique} €`} />
      <MiniResult
  titre="Temps chantier"
  valeur={`${calcul.totalHeuresChantier.toFixed(1)} h`}
/>

<MiniResult
  titre="Jours calculés"
  valeur={`${calcul.nombreJoursChantier} j`}
/>
      <MiniResult titre="Fournitures" valeur={`${calcul.reventeFournitures} €`} />
      <MiniResult titre="Total" valeur={`${calcul.total} €`} couleur="text-blue-700" />
    </div>

    <div className="rounded-lg bg-slate-50 px-3 py-2 space-y-1 text-xs">
      <div className="flex justify-between">
        <span>Déplacement ({calcul.kmAR} km)</span>
        <strong>{calcul.fraisLogistique} €</strong>
      </div>

      <div className="flex justify-between">
        <span>Fournitures</span>
        <strong>{calcul.reventeFournitures} €</strong>
      </div>

      <div className="border-t pt-1 flex justify-between font-bold text-blue-700">
        <span>Total devis</span>
        <span>{calcul.total} €</span>
      </div>
    </div>
  </div>

  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
    <p className="text-xs font-medium text-blue-800">
      ℹ️ Estimation indicative selon les éléments visibles lors de la visite.
    </p>
    <p className="text-xs text-blue-700">
      Ajustable après étude détaillée et validation technique.
    </p>
  </div>

  <div className="rounded-lg border bg-slate-50 px-3 py-2 space-y-2">
    <h3 className="text-sm font-bold text-slate-800">Acompte et encaissement</h3>

    <Select
      label="Acompte (%)"
      value={String(pourcentageAcompte)}
      onChange={(v) => setPourcentageAcompte(Number(v))}
      options={[
        ["30", "30 %"],
        ["40", "40 %"],
        ["50", "50 %"],
      ]}
    />

    <div className="grid gap-2 md:grid-cols-3">
      <MiniResult titre="Acompte" valeur={`${calcul.acompte} €`} />
      <MiniResult titre="Encaissé" valeur={`${montantEncaisse} €`} />
      <MiniResult
        titre="Reste"
        valeur={`${Math.max(0, calcul.total - montantEncaisse)} €`}
        couleur="text-blue-700"
      />
    </div>

    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => {
          setMontantEncaisse(calcul.acompte);

          setHistorique(
            historique.map((d) =>
              d.numeroDevis === numeroDevis
                ? {
                    ...d,
                    montantEncaisse: calcul.acompte,
                    reste: Math.max(0, calcul.total - calcul.acompte),
                    total: calcul.total,
                    acompte: calcul.acompte,
                    facturePayee: false,
                  }
                : d
            )
          );
        }}
        className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
      >
        Acompte reçu
      </button>

      <button
        onClick={() => {
          setMontantEncaisse(calcul.total);

          setHistorique(
            historique.map((d) =>
              d.numeroDevis === numeroDevis
                ? {
                    ...d,
                    montantEncaisse: calcul.total,
                    reste: 0,
                    total: calcul.total,
                    acompte: calcul.acompte,
                    facturePayee: true,
                  }
                : d
            )
          );
        }}
        className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"
      >
        Paiement complet
      </button>

      <button
        onClick={() => {
          setMontantEncaisse(0);

          setHistorique(
            historique.map((d) =>
              d.numeroDevis === numeroDevis
                ? {
                    ...d,
                    montantEncaisse: 0,
                    reste: calcul.total,
                    total: calcul.total,
                    acompte: calcul.acompte,
                    facturePayee: false,
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
  {historiqueFiltre.length === 0 ? (
    <p>Aucun dossier.</p>
  ) : (
    <div className="space-y-4">
      {historiqueFiltre.map((item) => (
        <div
  key={item.id}
  className={`rounded-2xl border p-5 space-y-3 ${
    item.datePaiement &&
    !item.facturePayee &&
    parseDateFr(item.datePaiement) &&
    parseDateFr(item.datePaiement)! < new Date()
      ? "bg-red-50 border-red-300"
      : "bg-white"
  }`}
>
          <div>
            <p className="text-lg font-bold text-slate-800">{item.client}</p>

            {item.priorite && item.priorite !== "normale" && (
              <p className="font-semibold text-red-600">
                PRIORITÉ : {item.priorite}
              </p>
            )}

            <p className="text-sm text-slate-500">
              {item.numeroDevis} / {item.numeroFacture}
            </p>

            {item.referenceChantier && (
              <p className="text-sm font-medium text-blue-700">
                Réf chantier : {item.referenceChantier}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4 space-y-2">
            <p>
              <strong>Total :</strong> {item.total} € — <strong>Reste :</strong> {Math.max(0, item.total - (item.montantEncaisse || 0))} €
            </p>
{item.total < 450 && (
  <div className="rounded-xl border border-red-300 bg-red-50 p-3">
    <p className="font-semibold text-red-700">
      ⚠ Chantier peu rentable
    </p>
  </div>
)}
            <p className="text-sm text-slate-500">
              {item.lignesTravaux?.[0]?.prestationNom || "Travaux divers"}
            </p>

            <p>
              <strong>Devis :</strong> {item.statutDevis}
            </p>

            <p>
              <strong>Chantier :</strong> {item.statutChantier}
            </p>

            {item.dateChantier && (
              <p>
                <strong>Date chantier prévue :</strong> {item.dateChantier}
              </p>
            )}

            {item.datePaiement && (
              <p>
                <strong>Paiement prévu :</strong> {item.datePaiement}
              </p>
            )}

            <p>
              <strong>Facture payée :</strong> {item.facturePayee ? "Oui" : "Non"}
            </p>
           {item.datePaiement &&
  !item.facturePayee &&
  parseDateFr(item.datePaiement) &&
  parseDateFr(item.datePaiement)! < new Date() && (
    <div className="rounded-xl border border-red-300 bg-red-50 p-3">
      <p className="font-semibold text-red-700">
        ⚠ Relance client à faire : paiement prévu dépassé.
      </p>
    </div>
  )} 
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => rechargerDossier(item)}
              className="rounded-xl bg-slate-800 px-4 py-2 font-semibold text-white"
            >
              Recharger
            </button>

<button
  onClick={() => {
    rechargerDossier(item);

    setStatutDevis("en_cours");
    setStatutChantier("a_planifier");

    setNumeroDevis(item.numeroDevis || "");
    setNumeroFacture("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }}
  className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white"
>
  Transformer en devis en cours
</button>
            <button
              onClick={() => {
                setClient(item.client);
                setTelephone(item.telephone);
                setEmail(item.email);
                setAdresse(item.adresse);
                setAdresseAgence(item.adresseAgence || "");
                setNotes(item.notes);
                setModeClient(item.modeClient);
                setLignesTravaux(
                  item.lignesTravaux.map((l) => ({
                    ...l,
                    id: Date.now() + Math.random(),
                  }))
                );

                setNumeroDevis("");
                setNumeroFacture(item.numeroFacture || "");

                setStatutDevis("en_cours");
                setStatutChantier("a_planifier");
                setFacturePayee(false);

                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-xl bg-purple-700 px-4 py-2 font-semibold text-white"
            >
              Dupliquer
            </button>

            <button
              onClick={() =>
                setHistorique(
                  historique.map((d) =>
                    d.id === item.id
                      ? {
                          ...d,
                          statutDevis: "accepte",
                          statutChantier: "a_planifier",
                        }
                      : d
                  )
                )
              }
              className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white"
            >
              Devis accepté
            </button>

            <button
              onClick={() =>
                setHistorique(
                  historique.map((d) =>
                    d.id === item.id
                      ? {
                          ...d,
                          statutChantier: "termine",
                        }
                      : d
                  )
                )
              }
              className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white"
            >
              Chantier terminé
            </button>
<button
  onClick={() =>
    setHistorique(
      historique.map((d) =>
        d.id === item.id
          ? {
              ...d,
              statutChantier: "facture_envoyee",
            }
          : d
      )
    )
  }
  className="rounded-xl bg-cyan-700 px-4 py-2 font-semibold text-white"
>
  Facture envoyée
</button>
            <button
 onClick={() => {
  rechargerDossier(item);

  setStatutDevis("accepte");
  setStatutChantier("facture_envoyee");
  setFacturePayee(false);
  setIdDossierActuel(item.id);

  setNumeroFacture(item.numeroFacture || "");
  setMontantEncaisse(item.montantEncaisse ?? item.acompte ?? 0);

  // 🔥 IMPORTANT (ajout)
  setDateChantier(item.dateChantier || "");
  setDatePaiement(item.datePaiement || "");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}}
  className="rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white"
>
  Transformer en facture
</button>

<button
  onClick={() => marquerPayee(item.id)}
  className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white"
>
  Payée
  
</button>

<button
  onClick={() => preparerRelance(item)}
  className="rounded-xl bg-orange-600 px-4 py-2 font-semibold text-white"
>
  Préparer relance
</button>

            <button
              onClick={() => supprimerDossier(item.id)}
              className="rounded-xl border px-4 py-2 font-semibold"
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
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
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-4">

      <h2 className="text-xl font-bold text-slate-800">
        Planning du jour
      </h2>

      <p className="text-slate-500">
        {dateSelectionnee.toLocaleDateString("fr-FR")}
      </p>

      {(() => {
        const dateStr = dateSelectionnee.toLocaleDateString("fr-FR");

        const rdvs = historique.filter(
          (d) =>
            d.dateRdv === dateStr ||
            d.dateChantier === dateStr ||
            d.datePaiement === dateStr
        );

        if (rdvs.length === 0) {
          return (
            <div className="bg-slate-100 rounded-xl p-4 text-slate-500 text-sm">
              Aucun RDV client pour cette journée.
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {rdvs.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border p-4 bg-white space-y-2"
              >
                <p className="font-bold text-slate-800">
                  {d.client || "Client non renseigné"}
                </p>

                <p className="text-sm text-slate-600">
                  📞 {d.telephone || "Non renseigné"}
                </p>

                <p className="text-sm text-slate-600">
                  📍 {d.adresse || "Adresse non renseignée"}
                </p>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>
                    ⏱️{" "}
                    {d.dateChantier === dateStr
                      ? d.heureChantier || "-"
                      : d.heureRdv || "-"}
                  </span>

                  <span>
                    📄 {d.numeroDevis || "-"}
                  </span>

                  <span>
                    🧾 {d.numeroFacture || "-"}
                  </span>

                  <span>
                    💳 {d.datePaiement ? "Paiement prévu" : "-"}
                  </span>
                </div>

                <p className="text-sm text-slate-500">
                  {d.lignesTravaux?.[0]?.prestationNom ||
                    nomTravaux(d.lignesTravaux?.[0]?.type || "") ||
                    "Travaux"}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => {
                      rechargerDossier(d);
                      setShowPopupCalendrier(false);
                    }}
                    className="btn-dark"
                  >
                    Ouvrir dossier
                  </button>

                  <button
                    onClick={() => {
                      rechargerDossier(d);
                      setShowPopupCalendrier(false);
                      // ici tu pourras brancher ton mode édition
                    }}
                    className="btn-blue"
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("Supprimer ce RDV ?")) {
                        setHistorique((prev) =>
                          prev.map((item) =>
                            item.id === d.id
                              ? {
                                  ...item,
                                  dateRdv: "",
                                  heureRdv: "",
                                  dateChantier: "",
                                  heureChantier: "",
                                  datePaiement: "",
                                }
                              : item
                          )
                        );
                      }
                    }}
                    className="btn-orange"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

<button
  onClick={() => {
    creerRDVDepuisCalendrier(dateSelectionnee);
    setShowPopupCalendrier(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }}
  className="w-full btn-green"
>
  ➕ Créer un RDV ce jour
</button>

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
  titre,
  children,
  ouvertParDefaut = false,
}: {
  titre: string;
  children: ReactNode;
  ouvertParDefaut?: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);

  return (
    <section className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h2 className="text-base font-bold text-slate-900">{titre}</h2>
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {ouvert ? "▲ Masquer" : "▼ Afficher"}
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
          Date sélectionnée : {value}
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
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <input
        type="number"
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
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
  donnees: { label: string; total: number }[];
}) {
  const largeur = 900;
  const hauteur = 260;
  const margeX = 45;
  const margeY = 35;

  const max = Math.max(...donnees.map((d) => d.total), 1);

  const points = donnees.map((d, index) => {
    const x =
      margeX +
      (index * (largeur - margeX * 2)) / Math.max(donnees.length - 1, 1);

    const y =
      hauteur -
      margeY -
      (d.total / max) * (hauteur - margeY * 2);

    return { x, y, ...d };
  });

  const chemin = points
    .map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="mb-4 text-lg font-bold text-slate-800">
        Courbe des encaissements sur 12 mois
      </h3>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="min-w-[850px]">
          <line
            x1={margeX}
            y1={hauteur - margeY}
            x2={largeur - margeX}
            y2={hauteur - margeY}
            stroke="#CBD5E1"
            strokeWidth="2"
          />

          <line
            x1={margeX}
            y1={margeY}
            x2={margeX}
            y2={hauteur - margeY}
            stroke="#CBD5E1"
            strokeWidth="2"
          />

          <path
            d={chemin}
            fill="none"
            stroke="#2563EB"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, index) => (
            <g key={index}>
              <circle cx={p.x} cy={p.y} r="5" fill="#2563EB" />

              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                fontSize="12"
                fill="#334155"
              >
                {p.total}€
              </text>

              <text
                x={p.x}
                y={hauteur - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#475569"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}