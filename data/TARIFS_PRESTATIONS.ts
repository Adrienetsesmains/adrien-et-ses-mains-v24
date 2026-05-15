export type PrestationTarif = {
  nom: string;
  unite: string;
  prixMo220: number;
  prixMoJeremie150: number;
  tva?: number;
  prixJeremieTtc?: number;
  marcheHtMin?: number;
  marcheHtMax?: number;
  temps1Pers?: string;
  temps2Pers?: string;
  heuresUnite?: number;
  rentabilite: string;
  action?: string;
  notes?: string;
  conditions?: string;
  detailsPdf?: string[];
  typeTravaux?: string;
};

export type CategorieTarifs = {
  categorie: string;
  prestations: PrestationTarif[];
};

export const DETAILS_PDF_PAR_CATEGORIE: Record<string, string[]> = {
  Nettoyage: ["Protection et préparation", "Nettoyage des surfaces", "Contrôle de fin d’intervention"],
  Débarras: ["Repérage", "Manutention", "Évacuation prévue", "Nettoyage sommaire"],
  Sols: ["Contrôle support", "Préparation simple", "Pose", "Découpes", "Finitions"],
  Carrelage: ["Contrôle support", "Pose", "Découpes", "Joints si prévus", "Nettoyage"],
  Peinture: ["Protection", "Préparation support", "Application peinture", "Nettoyage"],
  Plomberie: ["Dépose si nécessaire", "Pose/remplacement", "Raccordement simple", "Test étanchéité"],
  Électricité: ["Mise hors tension", "Pose/remplacement", "Raccordement existant", "Test"],
  Ventilation: ["Dépose si nécessaire", "Pose/remplacement", "Raccordement", "Test"],
  Bricolage: ["Préparation", "Pose/montage/fixation", "Ajustements", "Vérification"],
  Toiture: ["Contrôle visuel", "Intervention simple prévue", "Hors travaux structurels"],
  Jardin: ["Préparation zone", "Réalisation prestation", "Nettoyage sommaire"],
  PACK: ["Regroupement prestations", "Réalisation travaux", "Nettoyage final"],
  "Déplacement / logistique": ["Frais aller-retour", "Temps et logistique"],
};

export const TARIFS_PRESTATIONS_PAR_CATEGORIE: CategorieTarifs[] = [
  {
    categorie: "Nettoyage",
    prestations: [
      {
        nom: "Nettoyage fin de chantier / remise en état",
        unite: "m²",
        prixMo220: 2.24,
        prixMoJeremie150: 1.53,
        tva: 10,
        prixJeremieTtc: 1.68,
        marcheHtMin: 8,
        marcheHtMax: 12,
        temps1Pers: "0,08h/m²",
        temps2Pers: "0,05h/m²",
        heuresUnite: 0.08,
        rentabilite: "🟢 Rentable agence",
        action: "Acceptable au tarif bas",
        notes: "Dépoussiérage, sols, sanitaires; hors gros gravats.",
        conditions: "Minimum facturation 2h ou 80€",
      },
      {
        nom: "Nettoyage vitres (faces int/ext)",
        unite: "m²",
        prixMo220: 1.4,
        prixMoJeremie150: 0.95,
        tva: 10,
        prixJeremieTtc: 1.05,
        marcheHtMin: 5,
        marcheHtMax: 8,
        temps1Pers: "0,05h/m²",
        temps2Pers: "0,03h/m²",
        heuresUnite: 0.05,
        rentabilite: "🟢 Rentable agence",
        action: "Acceptable au tarif bas",
        notes: "Dégressif si grande surface. Hors accès difficile.",
        conditions: "Minimum 60€ / hors accès difficile / hors hauteur",
      },
      {
        nom: "Ménage logement standard minimum 2h",
        unite: "h",
        prixMo220: 28,
        prixMoJeremie150: 19.09,
        tva: 10,
        prixJeremieTtc: 21,
        marcheHtMin: 30,
        marcheHtMax: 60,
        heuresUnite: 1,
        rentabilite: "🟢 Rentable agence",
        action: "Acceptable au tarif bas",
        notes: "Entretien courant logement vide ou meublé.",
        conditions: "Forfait déplacement si hors zone",
      },
    ],
  },

  {
    categorie: "Débarras",
    prestations: [
      {
        nom: "Débarras / évacuation encombrants",
        unite: "m³",
        prixMo220: 14,
        prixMoJeremie150: 9.55,
        tva: 10,
        prixJeremieTtc: 10.5,
        marcheHtMin: 55,
        marcheHtMax: 85,
        heuresUnite: 0.5,
        rentabilite: "🟠 À surveiller",
        action: "Mesurer avant devis",
        notes: "Accès + étages influent.",
        conditions: "Hors déchèterie / minimum chantier",
      },
      {
        nom: "Évacuation déchèterie",
        unite: "forfait",
        prixMo220: 75,
        prixMoJeremie150: 51.13,
        tva: 10,
        prixJeremieTtc: 56.24,
        marcheHtMin: 30,
        marcheHtMax: 120,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Mise en sac / tri",
        unite: "h",
        prixMo220: 28,
        prixMoJeremie150: 19.09,
        tva: 10,
        prixJeremieTtc: 21,
        heuresUnite: 1,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Évacuation gravats",
        unite: "m³",
        prixMo220: 66.96,
        prixMoJeremie150: 45.65,
        tva: 10,
        prixJeremieTtc: 50.22,
        heuresUnite: 2.39,
        rentabilite: "🔴 À majorer",
        action: "Prendre avec conditions",
        notes: "Chargement + déchèterie. Poids lourd.",
        conditions: "Minimum 150€ / selon accessibilité / hors imprévus",
      },
    ],
  },

  {
    categorie: "Sols",
    prestations: [
      {
        nom: "Ragréage autolissant complet",
        unite: "m²",
        prixMo220: 6.09,
        prixMoJeremie150: 4.15,
        tva: 10,
        prixJeremieTtc: 4.57,
        heuresUnite: 0.22,
        rentabilite: "🟢 Rentable agence",
        notes: "Préparation + ragréage.",
        conditions: "Hors gros rattrapage / support sain obligatoire",
      },
      {
        nom: "Ragréage autolissant moyen",
        unite: "m²",
        prixMo220: 2.8,
        prixMoJeremie150: 1.91,
        tva: 10,
        prixJeremieTtc: 2.1,
        heuresUnite: 0.1,
        rentabilite: "🟢 Rentable agence",
        notes: "Surface plane / faible rattrapage.",
      },
      {
        nom: "Ragréage autolissant important",
        unite: "m²",
        prixMo220: 3.5,
        prixMoJeremie150: 2.39,
        tva: 10,
        prixJeremieTtc: 2.63,
        heuresUnite: 0.13,
        rentabilite: "🟢 Rentable agence",
        notes: "Rattrapage moyen à important.",
        conditions: "Hors dalle très dégradée",
      },
      {
        nom: "Ragréage sur dalle très abîmée",
        unite: "m²",
        prixMo220: 7.3,
        prixMoJeremie150: 4.98,
        tva: 10,
        prixJeremieTtc: 5.48,
        heuresUnite: 0.26,
        rentabilite: "🟢 Rentable agence",
        notes: "Meulage + primaire + ragréage fibré.",
        conditions: "Diagnostic obligatoire",
      },
      {
        nom: "Pose parquet flottant",
        unite: "m²",
        prixMo220: 5.6,
        prixMoJeremie150: 3.82,
        tva: 10,
        prixJeremieTtc: 4.2,
        heuresUnite: 0.2,
        rentabilite: "🟠 À surveiller",
        conditions: "Hors ragréage / hors découpe complexe",
      },
      {
        nom: "Pose parquet flottant petite surface",
        unite: "m²",
        prixMo220: 8.4,
        prixMoJeremie150: 5.73,
        tva: 10,
        prixJeremieTtc: 6.3,
        heuresUnite: 0.3,
        rentabilite: "🟠 À surveiller",
        conditions: "Minimum chantier",
      },
      {
        nom: "Pose parquet massif collé",
        unite: "m²",
        prixMo220: 15,
        prixMoJeremie150: 10.2,
        tva: 10,
        prixJeremieTtc: 11.22,
        heuresUnite: 0.4,
        rentabilite: "🟠 À surveiller",
      },
      {
        nom: "Découpe parquet complexe",
        unite: "forfait",
        prixMo220: 50,
        prixMoJeremie150: 34.09,
        tva: 10,
        prixJeremieTtc: 37.49,
        rentabilite: "🟢 Rentable agence",
        notes: "Angles, obstacles.",
      },
      {
        nom: "Ponçage parquet",
        unite: "m²",
        prixMo220: 7,
        prixMoJeremie150: 4.77,
        tva: 10,
        prixJeremieTtc: 5.25,
        heuresUnite: 0.25,
        rentabilite: "🟠 À surveiller",
        notes: "3 passes.",
      },
      {
        nom: "Application huile parquet",
        unite: "m²",
        prixMo220: 2.8,
        prixMoJeremie150: 1.91,
        tva: 10,
        prixJeremieTtc: 2.1,
        heuresUnite: 0.1,
        rentabilite: "🟢 Rentable agence",
        notes: "2 couches.",
      },
      {
        nom: "Pose sol PVC",
        unite: "m²",
        prixMo220: 7.84,
        prixMoJeremie150: 5.35,
        tva: 10,
        prixJeremieTtc: 5.88,
        heuresUnite: 0.28,
        rentabilite: "🟠 À surveiller",
      },
    ],
  },

  {
    categorie: "Carrelage",
    prestations: [
      {
        nom: "Pose carrelage sol pose droite standard",
        unite: "m²",
        prixMo220: 14,
        prixMoJeremie150: 9.55,
        tva: 10,
        prixJeremieTtc: 10.5,
        heuresUnite: 0.5,
        rentabilite: "🟠 À surveiller",
        conditions: "Support prêt / hors ragréage / hors découpe complexe",
      },
      {
        nom: "Pose carrelage sol pose diagonale",
        unite: "m²",
        prixMo220: 18.26,
        prixMoJeremie150: 12.45,
        tva: 10,
        prixJeremieTtc: 13.7,
        heuresUnite: 0.65,
        rentabilite: "🟠 À surveiller",
      },
      {
        nom: "Pose faïence murale",
        unite: "m²",
        prixMo220: 17.04,
        prixMoJeremie150: 11.62,
        tva: 10,
        prixJeremieTtc: 12.78,
        heuresUnite: 0.61,
        rentabilite: "🟠 À surveiller",
        conditions: "Hors SPEC / SEL / étanchéité",
      },
      {
        nom: "Dépose ancien carrelage",
        unite: "m²",
        prixMo220: 15.22,
        prixMoJeremie150: 10.38,
        tva: 10,
        prixJeremieTtc: 11.41,
        heuresUnite: 0.54,
        rentabilite: "🟠 À surveiller",
        conditions: "Hors évacuation gravats",
      },
      {
        nom: "Réalisation joints carrelage",
        unite: "m²",
        prixMo220: 7.3,
        prixMoJeremie150: 4.98,
        tva: 10,
        prixJeremieTtc: 5.48,
        heuresUnite: 0.26,
        rentabilite: "🟠 À surveiller",
      },
    ],
  },

  {
    categorie: "Peinture",
    prestations: [
      {
        nom: "Protection chantier peinture",
        unite: "forfait",
        prixMo220: 45,
        prixMoJeremie150: 30.68,
        tva: 10,
        prixJeremieTtc: 33.74,
        heuresUnite: 1.5,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Peinture murs support neuf/lisse",
        unite: "m²",
        prixMo220: 5,
        prixMoJeremie150: 3.4,
        tva: 10,
        prixJeremieTtc: 3.74,
        heuresUnite: 0.2,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Peinture murs état moyen",
        unite: "m²",
        prixMo220: 6.09,
        prixMoJeremie150: 4.15,
        tva: 10,
        prixJeremieTtc: 4.57,
        heuresUnite: 0.22,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Peinture plafond",
        unite: "m²",
        prixMo220: 7,
        prixMoJeremie150: 4.76,
        tva: 10,
        prixJeremieTtc: 5.24,
        heuresUnite: 0.25,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Peinture porte / boiseries",
        unite: "u",
        prixMo220: 54.78,
        prixMoJeremie150: 37.35,
        tva: 10,
        prixJeremieTtc: 41.09,
        heuresUnite: 1.96,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Joint acrylique finition peinture",
        unite: "ml",
        prixMo220: 2.75,
        prixMoJeremie150: 1.87,
        tva: 0,
        prixJeremieTtc: 1.87,
        heuresUnite: 0.08,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Enduit / ratissage complet + ponçage",
        unite: "m²",
        prixMo220: 9.33,
        prixMoJeremie150: 6.36,
        tva: 10,
        prixJeremieTtc: 7,
        heuresUnite: 0.33,
        rentabilite: "🟢 Rentable agence",
      },
    ],
  },

  {
    categorie: "Plomberie",
    prestations: [
      {
        nom: "Main d’œuvre plomberie",
        unite: "h",
        prixMo220: 28,
        prixMoJeremie150: 19.09,
        tva: 10,
        prixJeremieTtc: 21,
        heuresUnite: 1,
        rentabilite: "🔴 À majorer",
      },
      {
        nom: "Remplacement robinet / mitigeur",
        unite: "forfait",
        prixMo220: 100,
        prixMoJeremie150: 68,
        tva: 10,
        prixJeremieTtc: 74.8,
        heuresUnite: 1,
        rentabilite: "🔴 À majorer",
      },
      {
        nom: "Remplacement lavabo / vasque",
        unite: "forfait",
        prixMo220: 84,
        prixMoJeremie150: 57.26,
        tva: 10,
        prixJeremieTtc: 62.99,
        heuresUnite: 3,
        rentabilite: "🟠 À surveiller",
      },
      {
        nom: "Remplacement mécanisme WC",
        unite: "forfait",
        prixMo220: 28,
        prixMoJeremie150: 19.09,
        tva: 10,
        prixJeremieTtc: 21,
        heuresUnite: 1,
        rentabilite: "🔴 À majorer",
      },
      {
        nom: "Remplacement WC",
        unite: "forfait",
        prixMo220: 84,
        prixMoJeremie150: 57.27,
        tva: 10,
        prixJeremieTtc: 63,
        heuresUnite: 3,
        rentabilite: "🔴 À majorer",
      },
      {
        nom: "Dépose et repose WC problème fixation",
        unite: "forfait",
        prixMo220: 224,
        prixMoJeremie150: 152.73,
        tva: 10,
        prixJeremieTtc: 168,
        heuresUnite: 8,
        rentabilite: "🔴 À majorer",
      },
      {
        nom: "Recherche fuite + réparation simple",
        unite: "forfait",
        prixMo220: 56,
        prixMoJeremie150: 38.18,
        tva: 10,
        prixJeremieTtc: 42,
        heuresUnite: 2,
        rentabilite: "🔴 À majorer",
      },
    ],
  },

  {
    categorie: "Électricité",
    prestations: [
      {
        nom: "Main d’œuvre électricité",
        unite: "h",
        prixMo220: 28,
        prixMoJeremie150: 19.09,
        tva: 10,
        prixJeremieTtc: 21,
        heuresUnite: 1,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Remplacement prise / interrupteur",
        unite: "u",
        prixMo220: 14,
        prixMoJeremie150: 9.55,
        tva: 10,
        prixJeremieTtc: 10.5,
        heuresUnite: 0.5,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Pose luminaire simple",
        unite: "u",
        prixMo220: 42.61,
        prixMoJeremie150: 29.05,
        tva: 10,
        prixJeremieTtc: 31.96,
        heuresUnite: 1.52,
        rentabilite: "🟢 Rentable agence",
      },
    ],
  },

  {
    categorie: "Ventilation",
    prestations: [
      {
        nom: "Remplacement VMC simple flux groupe seul",
        unite: "forfait",
        prixMo220: 70,
        prixMoJeremie150: 47.73,
        tva: 10,
        prixJeremieTtc: 52.5,
        heuresUnite: 2.5,
        rentabilite: "🟠 À surveiller",
      },
      {
        nom: "Remplacement VMC complète",
        unite: "forfait",
        prixMo220: 517.39,
        prixMoJeremie150: 352.77,
        tva: 10,
        prixJeremieTtc: 388.04,
        heuresUnite: 18.48,
        rentabilite: "🟠 À surveiller",
      },
      {
        nom: "Remplacement bouche VMC",
        unite: "u",
        prixMo220: 14,
        prixMoJeremie150: 9.55,
        tva: 10,
        prixJeremieTtc: 10.5,
        heuresUnite: 0.5,
        rentabilite: "🟠 À surveiller",
      },
    ],
  },

  {
    categorie: "Bricolage",
    prestations: [
      {
        nom: "Montage meuble simple",
        unite: "u",
        prixMo220: 21,
        prixMoJeremie150: 14.32,
        tva: 10,
        prixJeremieTtc: 15.75,
        heuresUnite: 0.75,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Montage cuisine en kit",
        unite: "forfait",
        prixMo220: 448,
        prixMoJeremie150: 305.45,
        tva: 10,
        prixJeremieTtc: 336,
        heuresUnite: 16,
        rentabilite: "🟠 À surveiller",
      },
      {
        nom: "Pose crédence",
        unite: "ml",
        prixMo220: 35,
        prixMoJeremie150: 23.86,
        tva: 10,
        prixJeremieTtc: 26.25,
        heuresUnite: 1.5,
        rentabilite: "🟠 À surveiller",
      },
      {
        nom: "Pose plan de travail",
        unite: "ml",
        prixMo220: 80,
        prixMoJeremie150: 54.54,
        tva: 10,
        prixJeremieTtc: 59.99,
        heuresUnite: 2.8,
        rentabilite: "🔴 À cadrer",
      },
      {
        nom: "Découpe plan de travail évier/plaque",
        unite: "u",
        prixMo220: 40,
        prixMoJeremie150: 27.27,
        tva: 10,
        prixJeremieTtc: 29.99,
        heuresUnite: 1.2,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Pose évier",
        unite: "u",
        prixMo220: 65,
        prixMoJeremie150: 44.31,
        tva: 10,
        prixJeremieTtc: 48.74,
        heuresUnite: 1.75,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Pose tringle / store / étagère",
        unite: "u",
        prixMo220: 35,
        prixMoJeremie150: 23.86,
        tva: 10,
        prixJeremieTtc: 26.25,
        heuresUnite: 1.25,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Fixation étagère / tableau",
        unite: "forfait",
        prixMo220: 30.43,
        prixMoJeremie150: 20.75,
        tva: 10,
        prixJeremieTtc: 22.83,
        heuresUnite: 1.09,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Rabotage de porte",
        unite: "u",
        prixMo220: 28,
        prixMoJeremie150: 19.09,
        tva: 10,
        prixJeremieTtc: 21,
        heuresUnite: 1,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Réglage porte coulissante",
      unite: "u",
      prixMo220: 60,
      prixMoJeremie150: 40,
      heuresUnite: 0.7,
      rentabilite: "🟢",
      typeTravaux: "bricolage",
      notes: "Réglage rail et galets"+"Alignement porte"+
        "Test fonctionnement",
      conditions: "Système existant fonctionnel",
      
      },
      {
        nom: "Petite assistance bricolage",
        unite: "h",
        prixMo220: 28,
        prixMoJeremie150: 19.09,
        tva: 10,
        prixJeremieTtc: 21,
        heuresUnite: 1,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Silicone sanitaire",
        unite: "u",
        prixMo220: 25.87,
        prixMoJeremie150: 17.64,
        tva: 10,
        prixJeremieTtc: 19.4,
        heuresUnite: 0.92,
        rentabilite: "🟢 Rentable agence",
      },
    ],
  },

  {
  categorie: "Extérieur / Métal / Divers",
  prestations: [
    {
      nom: "Peinture portail / portillon / garde-corps",
      unite: "m²",
      prixMo220: 35,
      prixMoJeremie150: 25,
      heuresUnite: 0.6,
      rentabilite: "🟢",
      typeTravaux: "peinture",
      notes:"Décapage / grattage si nécessaire"+
        "Application primaire et peinture"+
        "Finition soignée",
      conditions: "Support sain, hors corrosion lourde",
      
      },
     {
      nom: "Reprise soudure métal",
      unite: "u",
      prixMo220: 45,
      prixMoJeremie150: 30,
      heuresUnite: 0.5,
      rentabilite: "🟢",
      typeTravaux: "bricolage",
       notes:"Reprise des points de soudure"+
        "Renforcement structure"+
        "Nettoyage zone",
      conditions: "Accès simple",
     
     },
    ],
  },
  {
    categorie: "Toiture",
    prestations: [
      {
        nom: "Recherche fuite toiture",
        unite: "forfait",
        prixMo220: 56,
        prixMoJeremie150: 38.18,
        tva: 10,
        prixJeremieTtc: 42,
        heuresUnite: 2,
        rentabilite: "🔴 À majorer",
      },
      {
        nom: "Remplacement tuile",
        unite: "u",
        prixMo220: 7,
        prixMoJeremie150: 4.77,
        tva: 10,
        prixJeremieTtc: 5.25,
        heuresUnite: 0.25,
        rentabilite: "🔴 À majorer",
      },
      {
        nom: "Lambris bois / PVC sous toiture",
        unite: "m²",
        prixMo220: 11.2,
        prixMoJeremie150: 7.64,
        tva: 10,
        prixJeremieTtc: 8.4,
        heuresUnite: 0.4,
        rentabilite: "🟠 À surveiller",
      },  
     {
  nom: "Dépose / repose toiture bac acier",
  unite: "m²",
  prixMo220: 55,
  prixMoJeremie150: 40,
  heuresUnite: 0.8,
  rentabilite: "🟠 À surveiller",
  typeTravaux: "toiture",
  conditions: "Hors charpente / hors étanchéité lourde",
  detailsPdf: [
    "Dépose de l’ancienne couverture si prévue",
    "Repose ou pose des plaques bac acier",
    "Fixations et ajustements simples",
  ],
},
     {
  nom: "Pose rives et faîtage",
  unite: "ml",
  prixMo220: 18,
  prixMoJeremie150: 12,
  heuresUnite: 0.3,
  rentabilite: "🟢 Rentable",
  typeTravaux: "toiture",
  conditions: "Accès toiture sécurisé",
  detailsPdf: [
    "Pose des éléments de finition",
    "Fixation et alignement",
    "Traitement simple des jonctions",
  ],
},
     ],
  },
  {
    categorie: "Jardin",
    prestations: [
      {
        nom: "Tonte pelouse sans ramassage",
        unite: "m²",
        prixMo220: 0.28,
        prixMoJeremie150: 0.19,
        tva: 10,
        prixJeremieTtc: 0.21,
        heuresUnite: 0.01,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Tonte pelouse avec ramassage",
        unite: "m²",
        prixMo220: 0.46,
        prixMoJeremie150: 0.31,
        tva: 10,
        prixJeremieTtc: 0.34,
        heuresUnite: 0.02,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Taille de haies",
        unite: "ml",
        prixMo220: 2.8,
        prixMoJeremie150: 1.91,
        tva: 10,
        prixJeremieTtc: 2.1,
        heuresUnite: 0.1,
        rentabilite: "🟠 À surveiller",
      },
      {
        nom: "Débroussaillage léger",
        unite: "m²",
        prixMo220: 0.52,
        prixMoJeremie150: 0.35,
        tva: 10,
        prixJeremieTtc: 0.39,
        heuresUnite: 0.02,
        rentabilite: "🟢 Rentable agence",
      },
    ],
  },

  {
    categorie: "PACK",
    prestations: [
      {
        nom: "Pack rafraîchissement Studio",
        unite: "forfait",
        prixMo220: 336,
        prixMoJeremie150: 229.09,
        tva: 10,
        prixJeremieTtc: 252,
        heuresUnite: 12,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Pack rafraîchissement T2",
        unite: "forfait",
        prixMo220: 504,
        prixMoJeremie150: 343.64,
        tva: 10,
        prixJeremieTtc: 378,
        heuresUnite: 18,
        rentabilite: "🟢 Rentable agence",
      },
      {
        nom: "Pack rafraîchissement T3",
        unite: "forfait",
        prixMo220: 728,
        prixMoJeremie150: 496.36,
        tva: 10,
        prixJeremieTtc: 546,
        heuresUnite: 26,
        rentabilite: "🟢 Rentable agence",
      },
    ],
  },

{
  categorie: "Déplacement / logistique",
  prestations: [
    {
      nom: "Déplacement premier jour chantier",
      unite: "km",
      prixMo220: 0.75,
      prixMoJeremie150: 0.75,
      heuresUnite: 0,
      rentabilite: "🟢",
      action: "Base déplacement premier passage",
      conditions: "Applicable uniquement au premier passage chantier.",
      detailsPdf: [
        "Déplacement aller-retour chantier",
        "Temps de trajet",
        "Usure véhicule",
      ],
      typeTravaux: "deplacement",
    },

    {
      nom: "Déplacement jours suivants",
      unite: "km",
      prixMo220: 0.30,
      prixMoJeremie150: 0.30,
      heuresUnite: 0,
      rentabilite: "🟢",
      action: "Base déplacement jours suivants",
      conditions: "Applicable après le premier jour chantier.",
      detailsPdf: [
        "Déplacement chantier",
        "Trajet journalier",
      ],
      typeTravaux: "deplacement",
    },

    {
      nom: "Forfait mise en place chantier",
      unite: "forfait",
      prixMo220: 20,
      prixMoJeremie150: 20,
      heuresUnite: 0,
      rentabilite: "🟢",
      action: "Organisation chantier",
      conditions: "Chargement matériel, achats fournitures, mise en place.",
      detailsPdf: [
        "Organisation chantier",
        "Chargement matériel",
        "Temps logistique",
      ],
      typeTravaux: "deplacement",
    },
  ],
},

];
export type TarifPrestationPlat = {
  id: string;
  categorie: string;
  prestation: string;
  unite: string;
  prix220: number;
  prix150: number;
  heuresUnite: number;
  rentabilite: string;
  action: string;
  conditions: string;
  detailsPdf: string[];
  typeTravaux?: string;
};

const creerIdPrestation = (nom: string) =>
  nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const TARIFS_PRESTATIONS: TarifPrestationPlat[] =
  TARIFS_PRESTATIONS_PAR_CATEGORIE.flatMap((categorie) =>
    categorie.prestations.map((prestation) => ({
      id: creerIdPrestation(prestation.nom),

      categorie: categorie.categorie,

      prestation: prestation.nom,

      unite: prestation.unite,

      prix220: prestation.prixMo220,

      prix150: prestation.prixMoJeremie150,

      heuresUnite: prestation.heuresUnite ?? 0,

      rentabilite: prestation.rentabilite,

      action: prestation.action ?? "",

      conditions: prestation.conditions ?? "",

      detailsPdf:
        prestation.detailsPdf ??
        (prestation.notes
          ? [prestation.notes]
          : DETAILS_PDF_PAR_CATEGORIE[categorie.categorie] ?? []),

      typeTravaux: prestation.typeTravaux ?? "main_oeuvre",
    }))
  );