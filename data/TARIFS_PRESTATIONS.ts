export type PrestationTarif = {
  id: string;
  categorie: string;
  prestation: string;
  unite: string;
  heuresUnite: number;
  prix220: number;
  // Conservé uniquement pour compatibilité avec l'ancien code.
  // Le tarif Jérémie réel est désormais calculé dans page.tsx à partir de prix220 × 190 / 220.
  prix190: number;
  rentabilite: string;
  action?: string;
  conditions?: string;
  detailsPdf: string[];
  typeTravaux?: string;
  tags?: string[];
};

const HEURES_PAR_JOUR = 7;
const TARIF_JOUR_NORMAL = 220;
const TARIF_HORAIRE_NORMAL = TARIF_JOUR_NORMAL / HEURES_PAR_JOUR;

const arrondir2 = (n: number) => Math.round(n * 100) / 100;

const prixDepuisTemps = (heures: number) => arrondir2(heures * TARIF_HORAIRE_NORMAL);

const p = (
  id: string,
  categorie: string,
  prestation: string,
  unite: string,
  heuresUnite: number,
  detailsPdf: string[],
  options: {
    prixFixe?: number;
    rentabilite?: string;
    action?: string;
    conditions?: string;
    typeTravaux?: string;
    tags?: string[];
  } = {}
): PrestationTarif => {
  const prix220 = options.prixFixe ?? prixDepuisTemps(heuresUnite);

  return {
    id,
    categorie,
    prestation,
    unite,
    heuresUnite,
    prix220,
    prix190: prix220,
    rentabilite: options.rentabilite ?? "🟢 Base cohérente",
    action: options.action ?? "Adapter au chantier si nécessaire",
    conditions: options.conditions ?? "Hors fournitures sauf mention contraire.",
    detailsPdf,
    typeTravaux: options.typeTravaux ?? "main_oeuvre",
    tags: options.tags ?? [],
  };
};

export const DETAILS_PDF_PAR_CATEGORIE: Record<string, string[]> = {
  Nettoyage: [
    "Préparation de la zone d’intervention",
    "Nettoyage des surfaces concernées",
    "Contrôle et remise en ordre de fin d’intervention",
  ],
  Débarras: [
    "Repérage des éléments concernés",
    "Manutention et tri si nécessaire",
    "Évacuation prévue au devis",
    "Nettoyage sommaire de la zone",
  ],
  Sols: [
    "Contrôle du support existant",
    "Préparation prévue au devis",
    "Pose et découpes courantes",
    "Ajustements et finitions périphériques",
  ],
  "Carrelage / Faïence": [
    "Contrôle et préparation du support",
    "Implantation et pose du revêtement",
    "Découpes et ajustements courants",
    "Finitions prévues au devis",
  ],
  Peinture: [
    "Protection de la zone d’intervention",
    "Préparation du support selon son état",
    "Application des produits prévus",
    "Réalisation des finitions courantes",
  ],
  Déco: [
    "Préparation du support",
    "Pose ou dépose du revêtement prévu",
    "Découpes et ajustements courants",
    "Nettoyage de fin d’intervention",
  ],
  Placo: [
    "Contrôle de la zone d’intervention",
    "Pose ou reprise des éléments prévus",
    "Ajustements et finitions courantes",
  ],
  "Plomberie / Sanitaires": [
    "Dépose si prévue au devis",
    "Pose ou remplacement de l’équipement",
    "Raccordement sur installation existante accessible",
    "Contrôle d’étanchéité et de fonctionnement",
  ],
  Électricité: [
    "Mise en sécurité de l’intervention",
    "Pose ou remplacement sur installation existante",
    "Raccordement courant",
    "Essai de fonctionnement",
  ],
  Chauffage: [
    "Dépose de l’équipement existant si prévue",
    "Pose et fixation du nouvel équipement",
    "Raccordement sur installation existante",
    "Essai de fonctionnement",
  ],
  Ventilation: [
    "Contrôle de l’installation existante",
    "Dépose si nécessaire",
    "Pose ou remplacement de l’élément prévu",
    "Essai de fonctionnement",
  ],
  Cuisine: [
    "Implantation de l’élément concerné",
    "Montage ou pose prévue au devis",
    "Découpes et ajustements courants",
    "Contrôle des fixations et finitions",
  ],
  "Bricolage / Menuiserie légère": [
    "Repérage et préparation",
    "Montage, pose, réglage ou réparation prévue",
    "Ajustements courants",
    "Contrôle final",
  ],
  Équipement: [
    "Préparation de l’emplacement",
    "Mise en place de l’équipement",
    "Raccordement standard si prévu",
    "Essai de fonctionnement",
  ],
  "Extérieur / Métal": [
    "Préparation de la zone d’intervention",
    "Contrôle du support existant",
    "Réalisation de l’intervention prévue",
    "Ajustements et finitions courantes",
  ],
  "Toiture légère": [
    "Contrôle visuel de la zone accessible",
    "Intervention ponctuelle prévue au devis",
    "Ajustements et finitions courantes",
    "Hors travaux structurels et réfection complète",
  ],
  Jardin: [
    "Préparation de la zone",
    "Réalisation de l’entretien prévu",
    "Ramassage si prévu",
    "Nettoyage sommaire de fin d’intervention",
  ],
  "Déplacement / logistique": [
    "Déplacement aller-retour chantier",
    "Temps et organisation logistique",
  ],
};

export const TARIFS_PRESTATIONS: PrestationTarif[] = [
  // ================= NETTOYAGE =================
  p("NET-FIN-CHANTIER", "Nettoyage", "Nettoyage de fin de chantier / remise en état", "m²", 0.08, [
    "Dépoussiérage et nettoyage des surfaces accessibles",
    "Nettoyage courant des sols et équipements concernés",
    "Contrôle et remise en ordre de la zone",
  ], { conditions: "Hors gros gravats et nettoyage spécialisé. Minimum chantier applicable.", tags: ["nettoyage", "fin chantier"] }),

  p("NET-VITRAGE", "Nettoyage", "Nettoyage de vitrages", "m²", 0.05, [
    "Nettoyage des faces accessibles prévues au devis",
    "Essuyage et contrôle visuel de finition",
  ], { conditions: "Hors travail en hauteur ou accès nécessitant un moyen spécifique.", tags: ["vitre", "vitrage"] }),

  p("NET-LOGEMENT", "Nettoyage", "Nettoyage / ménage de logement", "h", 1, [
    "Entretien courant des surfaces prévues",
    "Nettoyage des équipements accessibles",
    "Remise en ordre de fin d’intervention",
  ], { conditions: "Temps minimum et niveau de remise en état à préciser selon le logement.", tags: ["ménage", "logement"] }),

  // ================= DEBARRAS =================
  p("DEB-ENCOMBRANTS", "Débarras", "Débarras et manutention d’encombrants", "m³", 0.5, [
    "Manutention des encombrants prévus au devis",
    "Regroupement et chargement",
  ], { conditions: "Accès, étages, poids et volume à contrôler avant devis. Hors frais de déchèterie.", rentabilite: "🟠 À contrôler", tags: ["débarras", "encombrants"] }),

  p("DEB-TRI", "Débarras", "Tri et mise en sac", "h", 1, [
    "Tri des déchets ou éléments concernés",
    "Mise en sacs ou regroupement pour évacuation",
  ], { tags: ["tri", "sac"] }),

  p("DEB-DECHETTERIE", "Débarras", "Transport / évacuation en déchèterie", "forfait", 2.5, [
    "Chargement des déchets préparés",
    "Transport vers une filière adaptée",
    "Déchargement et retour",
  ], { prixFixe: 80, conditions: "Forfait de base hors frais exceptionnels de traitement et hors volume important.", rentabilite: "🟠 À adapter", typeTravaux: "deplacement", tags: ["déchèterie", "transport"] }),

  p("DEB-GRAVATS", "Débarras", "Manutention et évacuation de gravats", "m³", 2.5, [
    "Manutention et chargement des gravats",
    "Évacuation vers une filière adaptée",
  ], { prixFixe: 80, conditions: "Prix indicatif par m³ à ajuster selon poids, accès, distance et coût de traitement.", rentabilite: "🟠 À adapter", tags: ["gravats", "évacuation"] }),

  // ================= SOLS =================
  p("SOL-DEPOSE", "Sols", "Dépose d’un revêtement de sol souple ou flottant", "m²", 0.17, [
    "Dépose du revêtement existant",
    "Retrait des éléments non adhérents accessibles",
    "Regroupement des déchets",
  ], { conditions: "Hors dépose collée difficile et hors évacuation en déchèterie.", tags: ["sol", "dépose"] }),

  p("SOL-PREP-MECA", "Sols", "Préparation mécanique d’un support de sol", "m²", 0.25, [
    "Grattage ou ponçage localisé du support",
    "Retrait des résidus non adhérents",
    "Aspiration et préparation avant finition",
  ], { conditions: "Niveau de préparation à adapter à l’état réel du support.", tags: ["sol", "préparation", "ponçage", "colle"] }),

  p("SOL-RAGREAGE", "Sols", "Ragréage autolissant du support", "m²", 0.3, [
    "Contrôle et dépoussiérage du support",
    "Application du primaire adapté si prévu",
    "Mise en œuvre du ragréage autolissant",
    "Contrôle de la planéité après séchage",
  ], { conditions: "Épaisseur courante. Hors reprise structurelle, forte épaisseur ou support très dégradé.", tags: ["ragréage", "sol"] }),

  p("SOL-SOUS-COUCHE", "Sols", "Pose d’une sous-couche / pare-vapeur", "m²", 0.09, [
    "Déroulage et pose de la sous-couche",
    "Découpes et raccords courants",
  ], { tags: ["sous couche", "pare vapeur"] }),

  p("SOL-FLOTTANT", "Sols", "Pose d’un revêtement de sol flottant", "m²", 0.25, [
    "Implantation du sens de pose",
    "Pose flottante du revêtement",
    "Découpes et jeux périphériques",
    "Finitions courantes",
  ], { conditions: "Support prêt. Minimum chantier applicable pour petite surface.", tags: ["parquet", "stratifié", "flottant"] }),

  p("SOL-PARQUET-COLLE", "Sols", "Pose d’un parquet massif collé", "m²", 0.45, [
    "Implantation et préparation de la pose",
    "Encollage et pose du parquet",
    "Découpes et ajustements périphériques",
  ], { conditions: "Support prêt et compatible. Hors fourniture de colle et reprise du support.", rentabilite: "🟠 À contrôler", tags: ["parquet", "massif", "collé"] }),

  p("SOL-PVC-CLIP", "Sols", "Pose d’un sol PVC clipsable", "m²", 0.28, [
    "Implantation du sens de pose",
    "Pose des lames ou dalles clipsables",
    "Découpes et ajustements périphériques",
  ], { conditions: "Support prêt. Hors ragréage.", tags: ["PVC", "vinyle", "clipsable"] }),

  p("SOL-PVC-COLLE", "Sols", "Pose d’un sol PVC collé", "m²", 0.32, [
    "Implantation du revêtement",
    "Encollage et pose",
    "Découpes et marouflage",
    "Finitions périphériques",
  ], { conditions: "Support plan, propre et prêt. Hors ragréage.", tags: ["PVC", "vinyle", "collé"] }),

  p("SOL-MOQUETTE", "Sols", "Pose d’une moquette", "m²", 0.22, [
    "Implantation et découpe du revêtement",
    "Pose selon le système prévu",
    "Finitions périphériques",
  ], { conditions: "Support prêt. Hors préparation lourde.", tags: ["moquette"] }),

  p("SOL-ROULEAU", "Sols", "Pose d’un revêtement souple en rouleau", "m²", 0.25, [
    "Implantation et découpe du revêtement",
    "Pose et ajustement",
    "Finitions périphériques",
  ], { conditions: "Support prêt. Hors préparation lourde.", tags: ["lino", "rouleau", "souple"] }),

  p("SOL-PLINTHE-BOIS", "Sols", "Pose de plinthes bois / MDF / PVC", "ml", 0.13, [
    "Mesure et découpe des plinthes",
    "Pose et fixation",
    "Raccords et finitions courantes",
  ], { conditions: "Angles et supports courants.", tags: ["plinthe", "MDF", "PVC", "bois"] }),

  p("SOL-PLINTHE-DEPOSE", "Sols", "Dépose de plinthes existantes", "ml", 0.08, [
    "Dépose soignée des plinthes existantes",
    "Retrait des résidus de fixation non adhérents",
    "Regroupement des éléments déposés",
  ], { conditions: "Hors réparation importante du support et hors évacuation en déchèterie.", tags: ["plinthe", "dépose"] }),

  p("SOL-PLINTHE-CARR", "Sols", "Pose de plinthes carrelées", "ml", 0.26, [
    "Découpe et implantation des plinthes",
    "Pose collée",
    "Réalisation des joints courants",
  ], { tags: ["plinthe", "carrelage"] }),

  p("SOL-PONCAGE-PARQUET", "Sols", "Ponçage d’un parquet bois", "m²", 0.25, [
    "Ponçage mécanique du parquet",
    "Passes adaptées à l’état du bois",
    "Aspiration des poussières",
  ], { conditions: "Location de matériel spécifique et abrasifs à chiffrer séparément si nécessaire.", tags: ["parquet", "ponçage"] }),

  p("SOL-FINITION-PARQUET", "Sols", "Application d’une finition sur parquet", "m²", 0.18, [
    "Préparation légère avant finition",
    "Application de la finition prévue",
    "Égrenage intermédiaire si nécessaire",
  ], { conditions: "Produit et nombre de couches à préciser dans le devis.", tags: ["parquet", "huile", "vernis"] }),

  p("SOL-DECOUPE-CPLX", "Sols", "Découpes complexes / adaptations particulières", "forfait", 1.5, [
    "Repérage des contraintes",
    "Découpes ou ajustements spécifiques prévus au devis",
  ], { conditions: "Forfait à ajuster selon nombre d’obstacles et complexité.", rentabilite: "🟠 À adapter", tags: ["découpe", "complexe"] }),

  // ================= CARRELAGE / FAIENCE =================
  p("CAR-DEPOSE", "Carrelage / Faïence", "Dépose de carrelage ou faïence", "m²", 0.5, [
    "Dépose du revêtement existant",
    "Grattage des résidus non adhérents",
    "Regroupement des gravats",
  ], { conditions: "Hors évacuation et hors remplacement complet du support.", tags: ["carrelage", "faïence", "dépose"] }),

  p("CAR-PREP", "Carrelage / Faïence", "Préparation simple du support avant carrelage", "m²", 0.25, [
    "Nettoyage et contrôle du support",
    "Reprises localisées courantes",
    "Dépoussiérage avant pose",
  ], { conditions: "Hors ragréage important ou reprise complète du support.", tags: ["carrelage", "support"] }),

  p("CAR-SOL", "Carrelage / Faïence", "Pose de carrelage au sol", "m²", 0.65, [
    "Implantation et calepinage courant",
    "Pose collée du carrelage",
    "Découpes et ajustements courants",
  ], { conditions: "Support prêt. Hors calepinage complexe et grands formats difficiles.", tags: ["carrelage", "sol"] }),

  p("CAR-COMPLEXE", "Carrelage / Faïence", "Pose de carrelage avec calepinage complexe", "m²", 0.85, [
    "Étude et implantation du calepinage",
    "Pose du revêtement",
    "Découpes et ajustements complexes",
  ], { conditions: "Motifs, diagonales, nombreux angles ou contraintes particulières.", rentabilite: "🟠 À contrôler", tags: ["carrelage", "diagonale", "calepinage"] }),

  p("CAR-FAIENCE", "Carrelage / Faïence", "Pose de faïence murale", "m²", 0.75, [
    "Implantation et calepinage courant",
    "Pose collée de la faïence",
    "Découpes et finitions courantes",
  ], { conditions: "Hors étanchéité sous carrelage et hors reprise importante du support.", tags: ["faïence", "mur"] }),

  p("CAR-JOINT", "Carrelage / Faïence", "Réalisation des joints de carrelage / faïence", "m²", 0.25, [
    "Préparation et nettoyage des joints",
    "Application du mortier de jointoiement",
    "Nettoyage des parements",
  ], { tags: ["joint", "carrelage", "faïence"] }),

  p("CAR-ETANCH", "Carrelage / Faïence", "Protection à l’eau sous carrelage", "m²", 0.35, [
    "Application du primaire adapté au support",
    "Pose des bandes d’étanchéité aux points singuliers",
    "Application du système de protection à l’eau",
  ], { conditions: "Selon prescriptions du système retenu et temps de séchage.", tags: ["SPEC", "étanchéité"] }),

  p("CAR-SILICONE", "Carrelage / Faïence", "Réalisation de joints silicone de finition", "ml", 0.08, [
    "Préparation et dégraissage des zones concernées",
    "Application du joint silicone",
    "Lissage et nettoyage de finition",
  ], { tags: ["silicone", "joint"] }),

  // ================= PEINTURE =================
  p("PEINT-PROT", "Peinture", "Protection et préparation du chantier peinture", "forfait", 1.5, [
    "Protection des sols, équipements et zones conservées",
    "Mise en place du chantier peinture",
  ], { tags: ["peinture", "protection"] }),

  p("PEINT-PREP-LEG", "Peinture", "Préparation légère d’un support avant peinture", "m²", 0.15, [
    "Grattage léger des parties non adhérentes",
    "Rebouchages ponctuels",
    "Ponçage et dépoussiérage",
  ], { conditions: "Pour support globalement sain.", tags: ["peinture", "préparation"] }),

  p("PEINT-PREP-RENF", "Peinture", "Préparation renforcée / reprise d’un support", "m²", 0.35, [
    "Grattage des parties non adhérentes",
    "Rebouchage et reprise des défauts",
    "Ponçage et dépoussiérage avant finition",
  ], { conditions: "Hors reprise structurelle ou traitement de la cause d’une infiltration active.", tags: ["peinture", "reprise", "enduit"] }),

  p("PEINT-RATISSAGE", "Peinture", "Ratissage complet et ponçage", "m²", 0.4, [
    "Application d’un enduit de ratissage",
    "Ponçage après séchage",
    "Dépoussiérage avant mise en peinture",
  ], { tags: ["ratissage", "enduit", "ponçage"] }),

  p("PEINT-PRIMAIRE", "Peinture", "Application d’un primaire d’accrochage", "m²", 0.12, [
    "Préparation légère du support",
    "Application du primaire adapté",
  ], { conditions: "Produit à adapter à la nature du support.", tags: ["primaire", "accrochage"] }),

  p("PEINT-ISOLANT", "Peinture", "Application d’un primaire isolant / bloqueur de taches", "m²", 0.2, [
    "Préparation locale du support",
    "Application du primaire isolant adapté",
    "Blocage des taches ou remontées compatibles avec le produit retenu",
  ], { conditions: "Hors traitement de la cause d’une humidité ou infiltration active.", tags: ["primaire", "tache", "isolant"] }),

  p("PEINT-MURS", "Peinture", "Mise en peinture des murs", "m²", 0.22, [
    "Application de la peinture prévue sur support préparé",
    "Réalisation des réchampis",
    "Finitions courantes",
  ], { conditions: "Nombre de couches et type de peinture à préciser si nécessaire.", tags: ["peinture", "mur"] }),

 p("PEINT-MURS-2C",
    "Peinture",
    "Mise en peinture des murs - 2 couches",
    "m²",
    0.30,
    [
      "Protection courante des zones conservées",
      "Préparation légère du support prêt à peindre",
      "Application de deux couches de peinture murale",
      "Réalisation des réchampis",
      "Contrôle et finitions courantes",
    ],
    {
      conditions:
        "Support globalement sain et prêt à peindre. Rebouchages importants, reprises renforcées, ratissage ou primaire spécifique comptés séparément.",
      tags: [
        "peinture",
        "mur",
        "2 couches",
        "deux couches",
        "finition",
      ],
    }
  ),
  p("PEINT-PLAFOND", "Peinture", "Mise en peinture des plafonds", "m²", 0.25, [
    "Application de la peinture prévue sur support préparé",
    "Réalisation des réchampis",
    "Finitions courantes",
  ], { conditions: "Nombre de couches et type de peinture à préciser si nécessaire.", tags: ["peinture", "plafond"] }),

  p("PEINT-BOIS-SURF", "Peinture", "Mise en peinture d’un support bois", "m²", 0.35, [
    "Égrenage ou préparation légère du support",
    "Application de la finition prévue",
    "Réalisation des finitions courantes",
  ], { conditions: "Primaire spécifique à ajouter séparément si nécessaire.", tags: ["peinture", "bois"] }),

  p("PEINT-MENUISERIE", "Peinture", "Mise en peinture de boiseries / menuiseries", "u", 1.75, [
    "Préparation de la menuiserie",
    "Application de la finition prévue",
    "Réalisation des réchampis et finitions",
  ], { conditions: "Temps à adapter selon dimensions, reliefs et état.", tags: ["porte", "boiserie", "menuiserie"] }),

  p("PEINT-ACRYLIQUE", "Peinture", "Réalisation d’un joint acrylique de finition", "ml", 0.08, [
    "Préparation des supports",
    "Application et lissage du joint acrylique",
  ], { tags: ["joint", "acrylique"] }),

  // ================= DECO =================
  p("DECO-DEPOSE-MURAL", "Déco", "Dépose d’un revêtement mural", "m²", 0.18, [
    "Dépose du revêtement mural existant",
    "Grattage léger des résidus",
    "Nettoyage simple du support",
  ], { conditions: "Hors colle très tenace et hors reprise lourde du support.", tags: ["papier peint", "revêtement mural", "dépose"] }),

  p("DECO-POSE-MURAL", "Déco", "Pose d’un revêtement mural", "m²", 0.3, [
    "Préparation simple du support",
    "Application de la colle si nécessaire",
    "Pose du revêtement",
    "Découpes et ajustements courants",
  ], { conditions: "Motifs à raccord ou revêtement technique : temps à adapter.", tags: ["papier peint", "revêtement mural"] }),

  p("DECO-PREP-LEG", "Déco", "Préparation légère d’un support mural", "m²", 0.15, [
    "Rebouchages ponctuels",
    "Ponçage et dépoussiérage",
  ], { tags: ["mur", "préparation"] }),

  p("DECO-PREP-RENF", "Déco", "Préparation renforcée d’un support mural", "m²", 0.35, [
    "Grattage et reprise des défauts",
    "Enduit localisé ou généralisé selon état",
    "Ponçage et dépoussiérage",
  ], { tags: ["mur", "préparation", "enduit"] }),

  // ================= PLACO =================
  p("PLAC-OSSATURE", "Placo", "Pose d’une ossature métallique légère", "m²", 0.55, [
    "Traçage et implantation",
    "Pose de l’ossature métallique",
    "Réglage et contrôle de l’alignement",
  ], { conditions: "Travaux non structurels. Hauteur et configuration courantes.", rentabilite: "🟠 À contrôler", tags: ["placo", "ossature"] }),

  p("PLAC-PLAQUE", "Placo", "Pose de plaques de plâtre", "m²", 0.45, [
    "Découpe et présentation des plaques",
    "Pose et fixation sur support prévu",
    "Ajustements courants",
  ], { conditions: "Hors bandes, peinture et renforts spécifiques.", tags: ["placo", "BA13"] }),

  p("PLAC-DOUBLAGE", "Placo", "Pose d’un doublage isolant léger", "m²", 0.7, [
    "Mise en place de l’isolant prévu",
    "Pose du parement associé",
    "Découpes et ajustements courants",
  ], { conditions: "Travaux intérieurs non structurels. Composition à préciser au devis.", rentabilite: "🟠 À contrôler", tags: ["placo", "isolant", "doublage"] }),

  p("PLAC-BANDES", "Placo", "Réalisation des bandes et joints", "m²", 0.45, [
    "Pose des bandes",
    "Passes d’enduit nécessaires",
    "Ponçage de finition courant",
  ], { conditions: "Hors reprise de plaques mal posées et hors peinture.", tags: ["placo", "bandes", "joints"] }),

  p("PLAC-REPARATION", "Placo", "Réparation locale d’une plaque de plâtre", "u", 2, [
    "Découpe de la zone endommagée si nécessaire",
    "Mise en place d’un renfort léger",
    "Pose de la pièce de réparation",
    "Reprise locale des joints",
  ], { conditions: "Petite réparation non structurelle. Taille à préciser au devis.", tags: ["placo", "réparation"] }),

  // ================= PLOMBERIE / SANITAIRES =================
  p("PLOMB-H", "Plomberie / Sanitaires", "Intervention de plomberie courante", "h", 1, [
    "Intervention sur éléments accessibles",
    "Raccordements courants prévus au devis",
    "Contrôle d’étanchéité",
  ], { conditions: "Sans création de réseau encastré ni modification lourde de l’installation.", tags: ["plomberie", "main d'œuvre"] }),

  p("PLOMB-DEPOSE-EQP", "Plomberie / Sanitaires", "Dépose d’un équipement sanitaire", "u", 1.5, [
    "Déconnexion des raccordements accessibles",
    "Dépose de l’équipement",
    "Mise en sécurité provisoire si nécessaire",
  ], { conditions: "Hors évacuation en déchèterie.", tags: ["sanitaire", "dépose"] }),

  p("PLOMB-ROBINET", "Plomberie / Sanitaires", "Pose / remplacement d’un robinet ou mitigeur", "u", 1.5, [
    "Dépose de l’ancienne robinetterie si prévue",
    "Pose de la nouvelle robinetterie",
    "Raccordement sur arrivées existantes accessibles",
    "Contrôle d’étanchéité",
  ], { conditions: "Hors modification des alimentations encastrées.", tags: ["robinet", "mitigeur"] }),

  p("PLOMB-VASQUE", "Plomberie / Sanitaires", "Pose / remplacement d’un lavabo ou d’une vasque", "u", 3, [
    "Dépose de l’ancien équipement si prévue",
    "Mise en place et fixation",
    "Raccordement du vidage et des éléments accessibles",
    "Contrôle d’étanchéité",
  ], { tags: ["lavabo", "vasque"] }),

  p("PLOMB-MEUBLE-VASQUE", "Plomberie / Sanitaires", "Pose / remplacement d’un meuble vasque", "u", 4.5, [
    "Montage et implantation du meuble",
    "Fixation au support",
    "Pose de la vasque",
    "Raccordements accessibles et finitions courantes",
  ], { conditions: "Hors modification lourde de plomberie et hors renfort structurel du support.", tags: ["meuble vasque", "lavabo"] }),

  p("PLOMB-MEUBLE-VASQUE-REEMPLOI", "Plomberie / Sanitaires", "Remplacement d’un meuble sous-vasque avec réemploi des équipements", "u", 5, [
    "Déconnexion et dépose soigneuse de la vasque et de la robinetterie existantes",
    "Dépose de l’ancien meuble et montage du nouveau meuble",
    "Réinstallation de la vasque et de la robinetterie conservées",
    "Fixation, raccordements accessibles et contrôle d’étanchéité",
  ], { conditions: "Sous réserve du bon état, de la compatibilité et des dimensions de la vasque et de la robinetterie conservées. Hors modification lourde de plomberie et renfort structurel.", rentabilite: "🟠 À contrôler", tags: ["meuble vasque", "réemploi", "vasque", "robinet"] }),

  p("PLOMB-POMME-HAUTE", "Plomberie / Sanitaires", "Pose d’une pomme haute de douche", "u", 1, [
    "Contrôle de la compatibilité avec l’installation existante",
    "Montage et fixation de la pomme haute et de son support",
    "Raccordement sur la robinetterie existante accessible",
    "Essai de fonctionnement et contrôle d’étanchéité",
  ], { conditions: "Sur installation existante compatible, sans modification encastrée des alimentations.", tags: ["douche", "pomme haute", "pomme de tête"] }),

  p("PLOMB-WC", "Plomberie / Sanitaires", "Pose / remplacement d’un WC", "u", 3, [
    "Dépose de l’ancien WC si prévue",
    "Mise en place et fixation du nouvel équipement",
    "Raccordement sur attentes existantes",
    "Essai de chasse et contrôle d’étanchéité",
  ], { conditions: "Pour WC posé au sol sur raccordements existants accessibles.", tags: ["WC", "toilettes"] }),

  p("PLOMB-WC-DEPOSE-REPOSE", "Plomberie / Sanitaires", "Dépose et repose d’un WC existant", "u", 3.5, [
    "Déconnexion et dépose soigneuse du WC",
    "Intervention prévue sur la zone de fixation",
    "Repose, fixation et raccordement",
    "Contrôle d’étanchéité et de fonctionnement",
  ], { conditions: "Réparation du support non comprise sauf mention au devis.", tags: ["WC", "dépose", "repose"] }),

  p("PLOMB-WC-MECA", "Plomberie / Sanitaires", "Remplacement d’un mécanisme de WC", "u", 1, [
    "Dépose du mécanisme existant",
    "Pose et réglage du nouveau mécanisme",
    "Essai et contrôle d’étanchéité",
  ], { tags: ["WC", "mécanisme"] }),

  p("PLOMB-SIPHON", "Plomberie / Sanitaires", "Remplacement d’un siphon / vidage", "u", 1, [
    "Dépose du siphon ou vidage existant",
    "Pose et raccordement du nouvel élément",
    "Essai d’écoulement et contrôle d’étanchéité",
  ], { tags: ["siphon", "vidage"] }),

  p("PLOMB-RACC", "Plomberie / Sanitaires", "Raccordement sanitaire sur attentes existantes", "u", 1.5, [
    "Adaptation simple des raccordements accessibles",
    "Raccordement de l’équipement prévu",
    "Essai d’écoulement et contrôle d’étanchéité",
  ], { conditions: "Sans création de réseau encastré.", tags: ["raccordement", "sanitaire"] }),

  p("PLOMB-FUITE-RECH", "Plomberie / Sanitaires", "Recherche de fuite apparente", "forfait", 2, [
    "Contrôle visuel des éléments accessibles",
    "Recherche de l’origine apparente de la fuite",
    "Compte rendu de l’intervention",
  ], { conditions: "Hors recherche destructive, caméra, réseau encastré ou diagnostic spécialisé.", rentabilite: "🟠 À contrôler", tags: ["fuite", "recherche"] }),

  p("PLOMB-FUITE-REP", "Plomberie / Sanitaires", "Réparation simple d’une fuite accessible", "forfait", 2, [
    "Mise hors eau locale si nécessaire",
    "Réparation ou remplacement simple de l’élément accessible",
    "Remise en eau et contrôle d’étanchéité",
  ], { conditions: "Hors réseau encastré et hors remplacement important de canalisation.", tags: ["fuite", "réparation"] }),

  p("PLOMB-REC-DCH", "Plomberie / Sanitaires", "Pose d’un receveur de douche", "u", 7, [
    "Préparation et contrôle de l’emplacement",
    "Pose et calage du receveur",
    "Pose de la bonde et raccordement accessible",
    "Contrôle de l’écoulement et finitions sanitaires",
  ], { conditions: "Dimensions, modèle et état du support à préciser au devis. Hors création complète du réseau.", rentabilite: "🟠 À contrôler", tags: ["receveur", "douche"] }),

  p("PLOMB-PAROI-DEP", "Plomberie / Sanitaires", "Dépose d’une paroi ou cabine de douche", "u", 2, [
    "Dépose soigneuse de la paroi ou cabine",
    "Regroupement ou stockage des éléments selon devis",
  ], { conditions: "Réemploi d’un équipement ancien sans garantie sur sa tenue au démontage.", tags: ["paroi", "douche", "dépose"] }),

  p("PLOMB-PAROI-POS", "Plomberie / Sanitaires", "Pose d’une paroi ou cabine de douche", "u", 3.5, [
    "Implantation et fixation",
    "Réglage des profilés et ouvrants",
    "Réalisation des joints sanitaires périphériques",
  ], { conditions: "Support adapté et modèle compatible avec l’implantation.", tags: ["paroi", "douche"] }),

  // ================= ELECTRICITE =================
  p("ELEC-H", "Électricité", "Intervention électrique courante", "h", 1, [
    "Mise hors tension de la zone concernée",
    "Intervention sur appareillage existant",
    "Raccordement courant et essai",
  ], { conditions: "Sur installation existante, sans création de circuit ni modification du tableau.", tags: ["électricité", "main d'œuvre"] }),

  p("ELEC-PRISE", "Électricité", "Remplacement d’une prise existante", "u", 0.5, [
    "Mise hors tension",
    "Dépose de la prise existante",
    "Pose et raccordement de la nouvelle prise",
    "Essai de fonctionnement",
  ], { conditions: "Sur câblage existant en état et conforme à l’intervention prévue.", tags: ["prise"] }),

  p("ELEC-INT", "Électricité", "Remplacement d’un interrupteur existant", "u", 0.5, [
    "Mise hors tension",
    "Dépose de l’interrupteur existant",
    "Pose et raccordement du nouvel appareillage",
    "Essai de fonctionnement",
  ], { tags: ["interrupteur"] }),

  p("ELEC-APP", "Électricité", "Remplacement d’un appareillage électrique existant", "u", 0.75, [
    "Mise hors tension",
    "Dépose de l’appareillage existant",
    "Pose et raccordement de l’appareillage prévu",
    "Essai de fonctionnement",
  ], { conditions: "Type d’appareillage à préciser au devis.", tags: ["appareillage"] }),

  p("ELEC-LUM", "Électricité", "Pose / remplacement d’un luminaire", "u", 1.25, [
    "Dépose du luminaire existant si prévue",
    "Montage et fixation du nouveau luminaire",
    "Raccordement sur sortie existante",
    "Essai de fonctionnement",
  ], { conditions: "Hors création de point lumineux ou modification du circuit.", tags: ["luminaire"] }),

  p("ELEC-SORTIE", "Électricité", "Remplacement d’une sortie de câble / connexion existante", "u", 0.5, [
    "Mise hors tension",
    "Remplacement ou reprise simple de la connexion",
    "Contrôle et essai",
  ], { conditions: "Sur câblage existant accessible.", tags: ["sortie de câble", "connexion"] }),

  p("ELEC-DIAG", "Électricité", "Diagnostic simple d’un équipement électrique", "forfait", 1.5, [
    "Contrôle visuel de l’équipement et de ses connexions accessibles",
    "Essais simples de fonctionnement",
    "Identification d’une anomalie apparente",
  ], { conditions: "Ne remplace pas un diagnostic réglementaire ni une recherche spécialisée sur circuit.", tags: ["diagnostic", "électrique"] }),

  // ================= CHAUFFAGE =================
  p("CHAU-RADIATEUR", "Chauffage", "Pose / remplacement d’un radiateur électrique", "u", 1.75, [
    "Dépose de l’ancien radiateur si prévue",
    "Implantation et fixation du nouvel appareil",
    "Raccordement sur alimentation existante",
    "Réglage et essai de fonctionnement",
  ], { conditions: "Hors création ou modification du circuit électrique et hors renfort important du support.", tags: ["radiateur", "chauffage"] }),

  // ================= VENTILATION =================
  p("VMC-GROUPE", "Ventilation", "Remplacement d’un groupe VMC existant", "u", 2.5, [
    "Dépose du groupe existant",
    "Pose du nouveau groupe sur réseau existant",
    "Raccordements accessibles",
    "Essai de fonctionnement",
  ], { conditions: "Hors création ou modification importante du réseau de gaines.", tags: ["VMC", "groupe"] }),

  p("VMC-BOUCHE", "Ventilation", "Remplacement d’une bouche de ventilation", "u", 0.5, [
    "Dépose de la bouche existante",
    "Nettoyage simple de la zone",
    "Pose de la nouvelle bouche",
  ], { tags: ["VMC", "bouche"] }),

  p("VMC-ENTREE-AIR-HYGRO", "Ventilation", "Pose d’une entrée d’air hygroréglable", "u", 0.75, [
    "Repérage et traçage de l’emplacement",
    "Découpe courante du support accessible",
    "Pose et fixation de l’entrée d’air",
    "Contrôle de l’ouverture et nettoyage de la zone",
  ], { conditions: "Sur coffre de volet roulant ou menuiserie compatible et accessible. Dimensionnement, réservation et absence d’obstacle à contrôler avant intervention.", tags: ["ventilation", "entrée d’air", "hygroréglable", "coffre volet roulant"] }),

  p("VMC-TRAVERSEE-MUR", "Ventilation", "Création d’une traversée murale pour ventilation", "u", 3.5, [
    "Repérage et contrôle de la zone de percement",
    "Percement du mur au diamètre prévu",
    "Mise en place du conduit de traversée",
    "Calfeutrement et finitions courantes autour du passage",
  ], { conditions: "Pour mur non porteur en matériau courant, accessible sur les deux faces et sans réseau dans la zone. Hors béton armé, pierre, amiante, travail en hauteur et reprise importante de façade.", rentabilite: "🟠 À contrôler", tags: ["ventilation", "traversée murale", "percement", "brique"] }),

  p("VMC-EXTRACTEUR", "Ventilation", "Pose d’un extracteur d’air individuel", "u", 2, [
    "Implantation et fixation de l’extracteur",
    "Raccordement au conduit de rejet existant ou créé séparément",
    "Raccordement sur alimentation électrique existante accessible",
    "Essai de fonctionnement et finitions courantes",
  ], { conditions: "Hors création de circuit électrique, modification du tableau et réseau de gaines. Appareil adapté au volume de sécurité de la pièce humide.", rentabilite: "🟠 À contrôler", tags: ["ventilation", "extracteur", "aérateur", "salle de bain"] }),

  p("VMC-GRILLE-EXT", "Ventilation", "Pose d’une grille extérieure de ventilation", "u", 0.75, [
    "Présentation et ajustement de la grille",
    "Fixation sur le support extérieur",
    "Calfeutrement périphérique courant",
    "Contrôle du passage d’air",
  ], { conditions: "Accès extérieur simple et sécurisé. Hors travail en hauteur ou reprise importante de façade.", tags: ["ventilation", "grille extérieure", "rejet extérieur"] }),

  p("VMC-NET", "Ventilation", "Nettoyage / entretien d’une bouche de ventilation", "u", 0.35, [
    "Dépose accessible de la bouche si nécessaire",
    "Nettoyage de l’élément",
    "Repose et contrôle simple",
  ], { tags: ["VMC", "nettoyage"] }),

  p("VMC-DIAG", "Ventilation", "Diagnostic simple d’une ventilation existante", "forfait", 1.5, [
    "Contrôle visuel des éléments accessibles",
    "Essai simple de fonctionnement",
    "Identification des anomalies apparentes",
  ], { conditions: "Hors mesure réglementaire de débit et étude de dimensionnement.", tags: ["VMC", "diagnostic"] }),

  // ================= CUISINE =================
  p("CUI-MEUBLE-MONT", "Cuisine", "Montage d’un meuble de cuisine", "u", 1.25, [
    "Assemblage du meuble",
    "Réglage des éléments courants",
    "Préparation pour la pose",
  ], { tags: ["cuisine", "meuble", "montage"] }),

  p("CUI-MEUBLE-POS", "Cuisine", "Pose / fixation d’un meuble de cuisine", "u", 1, [
    "Implantation et mise à niveau",
    "Fixation au support",
    "Réglage des portes ou façades",
  ], { conditions: "Support apte à recevoir les fixations prévues.", tags: ["cuisine", "meuble", "pose"] }),

  p("CUI-PLAN", "Cuisine", "Pose d’un plan de travail", "ml", 1.5, [
    "Mesure et présentation du plan",
    "Ajustements et mise à niveau",
    "Fixation sur meubles existants ou posés",
    "Finitions courantes",
  ], { conditions: "Découpes d’évier/plaque comptées séparément si nécessaires.", rentabilite: "🟠 À contrôler", tags: ["plan de travail"] }),

  p("CUI-PLAN-DEPOSE", "Cuisine", "Dépose d’un plan de travail existant", "ml", 0.75, [
    "Déconnexion des équipements accessibles si prévue au devis",
    "Découpe des joints et dépose soigneuse du plan de travail",
    "Préservation des meubles et revêtements muraux conservés",
    "Regroupement des éléments déposés",
  ], { conditions: "Sous réserve d’une dépose possible sans détériorer la crédence ou les supports conservés. Hors évacuation en déchèterie et réparation des dommages cachés.", rentabilite: "🟠 À contrôler", tags: ["plan de travail", "dépose", "crédence conservée"] }),

  p("CUI-DECOUPE", "Cuisine", "Découpe d’un plan de travail", "u", 1.25, [
    "Traçage de la découpe",
    "Découpe pour l’équipement prévu",
    "Protection et finition du chant découpé si nécessaire",
  ], { conditions: "Matériau courant. Hors pierre, quartz ou matériaux nécessitant un atelier spécialisé.", tags: ["plan de travail", "découpe"] }),

  p("CUI-CREDENCE", "Cuisine", "Pose d’une crédence", "m²", 0.75, [
    "Implantation et prise de mesures",
    "Découpes courantes",
    "Pose de la crédence",
    "Finitions périphériques",
  ], { conditions: "Matériau et système de pose à préciser au devis.", tags: ["crédence"] }),

  p("CUI-EVIER", "Cuisine", "Pose d’un évier", "u", 1.75, [
    "Mise en place de l’évier",
    "Fixation et étanchéité périphérique",
    "Raccordement du vidage accessible",
    "Contrôle d’étanchéité",
  ], { conditions: "Découpe du plan de travail comptée séparément si nécessaire.", tags: ["évier"] }),

  p("CUI-EVIER-DEPOSE-REPOSE", "Cuisine", "Dépose et repose d’un évier existant", "u", 3, [
    "Déconnexion et dépose soigneuse de l’évier et de la robinetterie",
    "Nettoyage des éléments conservés et préparation de la repose",
    "Réinstallation, fixation et réalisation de l’étanchéité périphérique",
    "Raccordement du vidage et de la robinetterie puis contrôle d’étanchéité",
  ], { conditions: "Sous réserve du bon état et de la compatibilité des équipements conservés avec le nouveau plan de travail. Découpe du plan comptée séparément.", rentabilite: "🟠 À contrôler", tags: ["évier", "dépose", "repose", "réemploi", "robinetterie"] }),

  p("CUI-MITIGEUR", "Cuisine", "Pose d’un mitigeur de cuisine", "u", 1.25, [
    "Pose de la robinetterie",
    "Raccordement sur alimentations existantes accessibles",
    "Contrôle d’étanchéité",
  ], { tags: ["mitigeur", "cuisine"] }),

  p("CUI-ENCASTRABLE", "Cuisine", "Pose d’un équipement encastrable", "u", 1.25, [
    "Mise en place de l’équipement",
    "Fixation selon le système prévu",
    "Raccordement standard sur attentes existantes si prévu",
    "Essai de fonctionnement",
  ], { conditions: "Hors modification de meuble importante, plomberie ou circuit électrique.", tags: ["four", "lave vaisselle", "encastrable"] }),

  p("CUI-AJUST", "Cuisine", "Ajustement / finition de cuisine", "h", 1, [
    "Réglages des éléments concernés",
    "Petits ajustements et finitions prévus au devis",
  ], { tags: ["cuisine", "réglage", "finition"] }),

  // ================= BRICOLAGE / MENUISERIE LEGERE =================
  p("BRI-MEUBLE", "Bricolage / Menuiserie légère", "Montage d’un meuble", "u", 0.75, [
    "Déballage et contrôle des éléments",
    "Assemblage du meuble",
    "Réglages courants",
  ], { conditions: "Temps à adapter selon dimensions et complexité.", tags: ["meuble", "montage"] }),

  p("BRI-FIX-MURAL", "Bricolage / Menuiserie légère", "Pose / fixation d’un équipement mural", "u", 1, [
    "Repérage de l’emplacement",
    "Perçage et fixation adaptés au support accessible",
    "Contrôle de l’alignement et de la tenue",
  ], { conditions: "Hors renfort structurel du support et hors équipement exceptionnellement lourd.", tags: ["fixation", "mur"] }),

  p("BRI-ETAGERE", "Bricolage / Menuiserie légère", "Pose d’une étagère", "u", 0.75, [
    "Implantation et traçage",
    "Perçage et fixation",
    "Contrôle du niveau et de la tenue",
  ], { tags: ["étagère"] }),

  p("BRI-TRINGLE", "Bricolage / Menuiserie légère", "Pose d’une tringle ou d’un store", "u", 1, [
    "Prise de mesures et implantation",
    "Pose des supports",
    "Montage et réglage de l’équipement",
  ], { tags: ["tringle", "store"] }),

  p("BRI-PORTE-REG", "Bricolage / Menuiserie légère", "Réglage d’une porte", "u", 0.75, [
    "Contrôle des jeux et points de frottement",
    "Réglage des paumelles ou éléments accessibles",
    "Essai de fonctionnement",
  ], { conditions: "Hors remplacement complet du bloc-porte.", tags: ["porte", "réglage"] }),

  p("BRI-COULISSANTE", "Bricolage / Menuiserie légère", "Réglage d’une porte coulissante", "u", 0.75, [
    "Contrôle du rail et des galets",
    "Réglage et alignement",
    "Essai de fonctionnement",
  ], { conditions: "Système existant réparable sans remplacement complet.", tags: ["porte coulissante", "réglage"] }),

  p("BRI-RABOT", "Bricolage / Menuiserie légère", "Rabotage / ajustement d’une porte", "u", 1, [
    "Repérage de la zone de frottement",
    "Dépose si nécessaire",
    "Rabotage ou ajustement",
    "Repose et essai",
  ], { tags: ["porte", "rabotage"] }),

  p("BRI-MENUISERIE-H", "Bricolage / Menuiserie légère", "Petite réparation de menuiserie", "h", 1, [
    "Diagnostic simple de la réparation",
    "Reprise ou ajustement courant",
    "Contrôle final",
  ], { conditions: "Hors réparation structurelle ou fabrication complexe.", tags: ["menuiserie", "réparation"] }),

  p("BRI-H", "Bricolage / Menuiserie légère", "Intervention de bricolage courante", "h", 1, [
    "Préparation de l’intervention",
    "Réalisation du petit bricolage prévu",
    "Contrôle et nettoyage sommaire",
  ], { conditions: "Pour interventions simples relevant du multiservice.", tags: ["bricolage"] }),

  p("BRI-BAL-DEPOSE-BLOC", "Bricolage / Menuiserie légère", "Dépose d’un bloc de boîtes aux lettres encastrées", "forfait", 3.5, [
    "Protection et préparation de la zone d’intervention",
    "Descellement et dépose de l’ensemble de boîtes aux lettres existant",
    "Démolition périphérique strictement nécessaire à la dépose",
    "Regroupement des éléments déposés et gravats",
  ], { conditions: "Pour bloc existant encastré en maçonnerie. Hors évacuation en déchèterie et hors reprise structurelle du mur.", rentabilite: "🟠 À contrôler", tags: ["boîte aux lettres", "dépose", "bloc", "encastré"] }),

  p("BRI-BAL-PREP", "Bricolage / Menuiserie légère", "Préparation / adaptation d’une réservation pour boîtes aux lettres", "forfait", 2.5, [
    "Nettoyage et préparation de la réservation existante",
    "Piquage et reprises localisées nécessaires",
    "Adaptation courante de l’ouverture au nouvel ensemble",
    "Préparation des supports avant scellement",
  ], { conditions: "Hors modification structurelle, linteau ou reconstruction importante de maçonnerie.", rentabilite: "🟠 À contrôler", tags: ["boîte aux lettres", "maçonnerie", "réservation", "préparation"] }),

  p("BRI-BAL-POSE", "Bricolage / Menuiserie légère", "Pose et scellement d’une boîte aux lettres en ensemble", "u", 0.65, [
    "Présentation et assemblage avec les boîtes adjacentes",
    "Calage, alignement et mise à niveau",
    "Fixation et scellement dans la réservation préparée",
    "Contrôle de l’ouverture et du fonctionnement",
  ], { conditions: "Boîte fournie séparément. Pose en ensemble accessible, support préparé. Temps à adapter si fixation ou assemblage particulier.", tags: ["boîte aux lettres", "pose", "scellement", "ensemble"] }),

  p("BRI-BAL-FIN-MAC", "Bricolage / Menuiserie légère", "Reprise de maçonnerie périphérique autour d’un bloc de boîtes aux lettres", "forfait", 2.8, [
    "Rebouchage et scellement périphérique au mortier adapté",
    "Reprise localisée des parties dégradées autour du bloc",
    "Dressage et finition des raccords avec la maçonnerie existante",
    "Nettoyage de fin d’intervention",
  ], { conditions: "Finition raccordée à l’existant, hors ravalement complet, peinture de façade et reprise structurelle.", rentabilite: "🟠 À contrôler", tags: ["boîte aux lettres", "maçonnerie", "mortier", "finition"] }),

p(
  "BRI-FENETRE-REG",
  "Bricolage / Menuiserie légère",
  "Réglage / petite réparation d’une fenêtre ou fenêtre de toit",
  "u",
  0.75,
  [
    "Contrôle de l’ouvrant et des éléments accessibles",
    "Dépose partielle si nécessaire à l’intervention",
    "Resserrage, réglage ou reprise simple de la quincaillerie",
    "Repose et essai de fonctionnement",
  ],
  {
    conditions:
      "Pour intervention simple sur fenêtre ou fenêtre de toit existante. Hors remplacement complet de menuiserie, vitrage ou mécanisme complexe.",
    tags: [
      "fenêtre",
      "fenêtre de toit",
      "Velux",
      "poignée",
      "quincaillerie",
      "réglage",
      "resserrage",
      "réparation",
    ],
  }
),
  
 // ================= FIXATIONS / MAINS COURANTES =================
  p("BRI-MAIN-COURANTE-REP",
    "Bricolage / Menuiserie légère",
    "Réparation / reprise de fixations de main courante",
    "h",
    1,
    [
      "Contrôle des fixations existantes accessibles",
      "Dépose des éléments nécessaires à l’intervention",
      "Retrait des fixations défectueuses",
      "Reprise localisée des anciens points de fixation si nécessaire",
      "Création de nouveaux points d’ancrage adaptés au support",
      "Repose, réglage et contrôle de la tenue de la main courante",
    ],
    {
      conditions:
        "Méthode de fixation à adapter à la nature et à l’état du support. Hors renforcement structurel de la paroi. Reprises de peinture comptées séparément si nécessaires.",
      rentabilite: "🟠 À contrôler",
      tags: [
        "main courante",
        "rambarde",
        "escalier",
        "fixation",
        "ancrage",
        "réparation",
      ],
    }
  ),

  p(
    "BRI-REB-FIX-MURAL",
    "Bricolage / Menuiserie légère",
    "Rebouchage et reprise locale d’anciens points de fixation",
    "u",
    0.25,
    [
      "Purge et nettoyage du point de fixation dégradé",
      "Rebouchage avec produit adapté au support",
      "Ponçage et préparation locale après séchage",
    ],
    {
      conditions:
        "Pour reprises localisées courantes. Hors réparation structurelle du support et hors mise en peinture.",
      tags: [
        "rebouchage",
        "fixation",
        "trou",
        "mur",
        "enduit",
        "réparation",
      ],
    }
  ),

  // ================= EQUIPEMENT =================
  p("EQP-ELECTRO", "Équipement", "Pose / remplacement d’un appareil électroménager", "u", 1.25, [
    "Mise en place et mise à niveau",
    "Raccordement standard sur attentes existantes si prévu",
    "Essai de fonctionnement",
  ], { conditions: "Hors modification plomberie, électricité ou meuble.", tags: ["électroménager"] }),

  p("EQP-DEPOSE", "Équipement", "Dépose d’un appareil existant", "u", 0.75, [
    "Déconnexion accessible de l’appareil",
    "Dépose et déplacement dans la zone prévue",
  ], { conditions: "Hors évacuation en déchèterie.", tags: ["équipement", "dépose"] }),

  // ================= EXTERIEUR / METAL =================
  p("EXT-METAL-PREP", "Extérieur / Métal", "Préparation d’un support métallique", "m²", 0.35, [
    "Grattage et élimination des parties non adhérentes",
    "Ponçage ou préparation mécanique légère",
    "Dépoussiérage avant finition",
  ], { conditions: "Hors décapage lourd ou corrosion structurelle.", tags: ["métal", "préparation"] }),

  p("EXT-METAL-PEINT", "Extérieur / Métal", "Mise en peinture d’un support métallique", "m²", 0.35, [
    "Application de la finition prévue",
    "Réalisation des reprises et finitions courantes",
  ], { conditions: "Support préparé. Primaire anticorrosion à ajouter si nécessaire.", tags: ["métal", "peinture"] }),

  p("EXT-ANTIROUILLE", "Extérieur / Métal", "Traitement anticorrosion", "m²", 0.2, [
    "Préparation légère des zones concernées",
    "Application du traitement anticorrosion prévu",
  ], { conditions: "Hors corrosion perforante ou structurelle.", tags: ["antirouille", "métal"] }),

  p("EXT-METAL-REP-H", "Extérieur / Métal", "Réparation / reprise légère d’un élément métallique", "h", 1, [
    "Repérage de la zone à reprendre",
    "Réparation ou renforcement léger prévu",
    "Nettoyage de la zone",
  ], { conditions: "Hors élément structurel ou réparation nécessitant une certification spécifique.", tags: ["métal", "réparation"] }),

  p("EXT-SOUDURE", "Extérieur / Métal", "Reprise ponctuelle par soudure", "u", 1, [
    "Préparation de la zone",
    "Reprise ponctuelle de la soudure",
    "Nettoyage et contrôle visuel",
  ], { conditions: "Petite reprise accessible, hors ouvrage structurel ou soumis à qualification spécifique.", tags: ["soudure", "métal"] }),

  // ================= TOITURE LEGERE =================
  p("TOIT-DIAG", "Toiture légère", "Diagnostic visuel ponctuel d’une couverture", "forfait", 1.5, [
    "Contrôle visuel des éléments accessibles",
    "Repérage d’une anomalie apparente",
    "Compte rendu de l’observation",
  ], { conditions: "Accès sécurisé obligatoire. Ne remplace pas un diagnostic spécialisé.", rentabilite: "🟠 À contrôler", tags: ["toiture", "diagnostic"] }),

  p("TOIT-ELEM", "Toiture légère", "Remplacement ponctuel d’un élément de couverture", "u", 0.5, [
    "Dépose de l’élément endommagé accessible",
    "Pose de l’élément de remplacement",
    "Contrôle visuel de la zone",
  ], { conditions: "Intervention ponctuelle uniquement, accès sécurisé, hors réfection de couverture.", rentabilite: "🟠 À contrôler", tags: ["tuile", "couverture"] }),

  p("TOIT-HABILLAGE", "Toiture légère", "Pose / remplacement d’un habillage sous toiture", "m²", 0.45, [
    "Dépose locale si prévue",
    "Découpe et pose de l’habillage",
    "Ajustements et finitions courantes",
  ], { conditions: "Hors intervention structurelle sur charpente.", tags: ["lambris", "sous toiture"] }),

  p("TOIT-FINITION", "Toiture légère", "Intervention légère de finition de couverture", "ml", 0.4, [
    "Contrôle de la zone",
    "Pose ou reprise ponctuelle de l’élément de finition prévu",
    "Fixations et ajustements courants",
  ], { conditions: "Accès sécurisé obligatoire. Hors étanchéité lourde et réfection complète.", rentabilite: "🟠 À contrôler", tags: ["rive", "finition", "toiture"] }),

// ================= HABILLAGE SOUS-FACE =================
  p(
    "TOIT-HAB-DEPOSE-COMP",
    "Toiture légère",
    "Dépose complète d’un habillage de sous-face",
    "m²",
    0.22,
    [
      "Protection et préparation de la zone d’intervention",
      "Dépose complète de l’habillage existant",
      "Retrait des fixations accessibles devenues inutiles",
      "Regroupement des éléments déposés",
      "Contrôle visuel du support rendu accessible",
    ],
    {
      conditions:
        "Hors réparation ou remplacement des éléments porteurs découverts après dépose et hors évacuation en déchèterie.",
      rentabilite: "🟠 À contrôler",
      tags: [
        "lambris",
        "sous-face",
        "sous toiture",
        "dépose",
        "habillage",
      ],
    }
  ),

  p(
    "TOIT-HAB-PVC",
    "Toiture légère",
    "Pose d’un habillage PVC de sous-face",
    "m²",
    0.55,
    [
      "Contrôle du support existant accessible",
      "Implantation de l’habillage",
      "Pose des profils de départ et de finition",
      "Découpe et pose des lames PVC",
      "Fixation sur support adapté",
      "Ajustements et finitions périphériques",
    ],
    {
      conditions:
        "Support existant sain, stable et apte à recevoir l’habillage. Fourniture PVC adaptée à l’usage prévu. Hors réparation de charpente, structure ou infiltration.",
      rentabilite: "🟠 À contrôler",
      tags: [
        "PVC",
        "lambris PVC",
        "sous-face",
        "sous toiture",
        "habillage",
        "extérieur",
      ],
    }
  ),

  // ================= JARDIN - REMISE EN ETAT =================
  p("JAR-TONTE", "Jardin", "Tonte de pelouse", "m²", 0.01, [
    "Tonte de la surface prévue",
    "Finitions courantes des zones accessibles",
  ], { conditions: "Terrain courant, dégagé et accessible.", tags: ["tonte", "pelouse"] }),

  p("JAR-RAMASSAGE", "Jardin", "Ramassage des déchets verts", "m²", 0.008, [
    "Ramassage des déchets verts issus de l’intervention",
    "Regroupement pour évacuation ou stockage sur place",
  ], { tags: ["déchets verts", "ramassage"] }),

  p("JAR-HAIE", "Jardin", "Taille de haie", "ml", 0.12, [
    "Taille d’entretien de la haie",
    "Finitions courantes",
    "Regroupement des déchets de taille",
  ], { conditions: "Hauteur, largeur, densité et accès à préciser. Hors élagage nécessitant déplacement dans l’arbre.", rentabilite: "🟠 À contrôler", tags: ["haie", "taille"] }),

  p("JAR-ARBUSTE", "Jardin", "Taille / entretien d’arbustes", "h", 1, [
    "Taille d’entretien des végétaux prévus",
    "Regroupement des déchets verts",
  ], { conditions: "Hors élagage spécialisé ou travail nécessitant déplacement dans l’arbre.", tags: ["arbuste", "taille"] }),

  p("JAR-DEBROU", "Jardin", "Débroussaillage léger", "m²", 0.02, [
    "Débroussaillage de la zone prévue",
    "Regroupement sommaire des déchets verts",
  ], { conditions: "Entretien courant uniquement, hors débroussaillage mécanisé lourd.", tags: ["débroussaillage"] }),

  p("JAR-NET-H", "Jardin", "Ramassage / nettoyage extérieur", "h", 1, [
    "Ramassage des déchets végétaux ou salissures courantes",
    "Nettoyage sommaire de la zone extérieure",
  ], { tags: ["extérieur", "nettoyage"] }),

  p("JAR-EVAC", "Jardin", "Évacuation de déchets verts", "forfait", 2, [
    "Chargement des déchets verts préparés",
    "Transport vers une filière adaptée",
    "Déchargement et retour",
  ], { prixFixe: 70, conditions: "Forfait de base à ajuster selon volume et distance.", typeTravaux: "deplacement", rentabilite: "🟠 À adapter", tags: ["déchets verts", "évacuation"] }),

  p("JAR-H", "Jardin", "Intervention d’entretien extérieur", "h", 1, [
    "Préparation de la zone",
    "Réalisation de l’entretien prévu",
    "Nettoyage sommaire de fin d’intervention",
  ], { tags: ["jardin", "entretien"] }),

   p(
    "JAR-REMISE-ETAT",
    "Jardin",
    "Remise en état d’un espace vert",
    "h",
    1,
    [
      "Tonte ou débroussaillage selon l’état de la végétation",
      "Taille légère des arbustes prévue au devis",
      "Nettoyage des bordures et zones accessibles",
      "Ramassage et regroupement des déchets verts",
      "Nettoyage sommaire de fin d’intervention",
    ],
    {
      conditions:
        "Temps à adapter à la surface, à la hauteur et à la densité de la végétation. Hors élagage spécialisé et abattage.",
      tags: [
        "jardin",
        "remise en état",
        "tonte",
        "débroussaillage",
        "arbuste",
        "nettoyage",
      ],
    }
  ),

  // ================= DEPLACEMENT / LOGISTIQUE =================
  p("deplacement_premier_jour_chantier", "Déplacement / logistique", "Déplacement premier jour chantier", "km", 0, [
    "Déplacement aller-retour chantier",
    "Temps de trajet et usure du véhicule",
  ], { prixFixe: 0.75, conditions: "Tarif par kilomètre aller-retour, premier passage chantier.", typeTravaux: "deplacement", tags: ["déplacement", "km"] }),

  p("deplacement_jours_suivants", "Déplacement / logistique", "Déplacement jours suivants", "km", 0, [
    "Déplacement aller-retour chantier",
    "Trajet journalier",
  ], { prixFixe: 0.7,conditions: "Tarif par kilomètre aller-retour après le premier jour.", typeTravaux: "deplacement", tags: ["déplacement", "km"] }),

  p("forfait_mise_en_place_chantier", "Déplacement / logistique", "Forfait mise en place chantier", "forfait", 0, [
    "Organisation du chantier",
    "Chargement du matériel",
    "Temps logistique de mise en place",
  ], { prixFixe: 20, conditions: "Forfait logistique chantier.", typeTravaux: "deplacement", tags: ["logistique", "mise en place"] }),
];