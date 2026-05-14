// @ts-nocheck
function detailsTravaux(ligne: LigneTravaux) {
  const d: string[] = [];

  if (ligne.type === "peinture") {
    if (ligne.q1 > 0) d.push("peinture murs");
    if (ligne.q2 > 0) d.push("peinture plafonds");
    if (ligne.r1 > 0) d.push("reprises / enduits");
    if (ligne.r2 > 0) d.push("joints acryliques");
    if (ligne.option > 0) d.push("portes / finitions");
  }

  if (ligne.type === "plafond") {
    if (ligne.q1 > 0 || ligne.q2 > 0) d.push("peinture plafond");
    if (ligne.r1 > 0) d.push("traitement anti-tâches");
    if (ligne.r2 > 0) d.push("reprise bande à joint");
    if (ligne.option > 0) d.push("reprise placo localisée");
  }

  if (ligne.type === "parquet") {
    if (ligne.q1 > 0) d.push("pose parquet / sol PVC");
    if (ligne.q2 > 0) d.push("pose plinthes");
    if (ligne.r1 > 0) d.push("pose seuils / finitions");
    if (ligne.r2 > 0) d.push("préparation support");
    if (ligne.option > 0) d.push("dépose ancien sol");
  }

  if (ligne.type === "cuisine") {
    if (ligne.q1 > 0) d.push("pose éléments cuisine");
    if (ligne.q2 > 0) d.push("pose plan de travail");
    if (ligne.r1 > 0) d.push("découpes évier / plaque");
    if (ligne.r2 > 0) d.push("pose électroménager");
    if (ligne.option > 0) d.push("raccordements simples");
  }

  if (ligne.type === "wc") {
    if (ligne.q1 > 0) d.push("intervention WC");
    if (ligne.q2 > 0) d.push("reprise support");
    if (ligne.r1 > 0) d.push("raccords / évacuation");
    if (ligne.r2 > 0) d.push("joint silicone");
    if (ligne.option > 0) d.push("dépose ancien WC");
  }

  if (ligne.type === "vmc") {
    if (ligne.q1 > 0) d.push("pose groupe VMC");
    if (ligne.q2 > 0) d.push("pose bouches / sorties");
    if (ligne.r1 > 0) d.push("passage gaines");
    if (ligne.r2 > 0) d.push("raccordement électrique simple");
    if (ligne.option > 0) d.push("mise en service / test");
  }

  if (ligne.type === "placo") {
    if (ligne.q1 > 0) d.push("pose / reprise placo");
    if (ligne.q2 > 0) d.push("bandes à joint");
    if (ligne.r1 > 0) d.push("remplacement isolation");
    if (ligne.r2 > 0) d.push("reprises / découpes");
    if (ligne.option > 0) d.push("dépose localisée");
  }

  if (ligne.type === "gouttiere") {
    if (ligne.q1 > 0) d.push("pose gouttière");
    if (ligne.q2 > 0) d.push("pose descente");
    if (ligne.r1 > 0) d.push("coudes / raccords");
    if (ligne.r2 > 0) d.push("dépose ancienne gouttière");
    if (ligne.option > 0) d.push("accès / travail en hauteur");
  }

  if (d.length === 0) return "Comprend : intervention et finitions.";
  return `Comprend : ${d.join(", ")}.`;
}export default function Home() {
  const rdv = [
    { heure: "09h00", client: "Tony Ferreira", detail: "Toiture cabanon", ville: "Naves" },
    { heure: "14h00", client: "Elodie - Patrimoine Occitan", detail: "Visite appartement", ville: "Revel" },
    { heure: "17h30", client: "Relance Jérémie", detail: "Validation devis plafond", ville: "SMS" },
  ];

  const alertes = [
    "Devis Elodie à envoyer aujourd’hui",
    "Acompte Tony non reçu",
    "Facture Virginie impayée",
    "Déplacement oublié sur devis Karine",
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-slate-800 p-8 text-white shadow">
          <p className="text-sm text-amber-300">Adrien et ses mains</p>
          <h1 className="mt-2 text-4xl font-bold">Tableau de bord principal</h1>
          <p className="mt-2 text-slate-200">
            Une personne de confiance pour votre maison
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Card titre="Encaissé du mois" valeur="2 140 €" />
          <Card titre="À encaisser" valeur="1 780 €" />
          <Card titre="Charges fixes" valeur="1 740 €" />
          <Card titre="Disponible réel corrigé" valeur="800 €" />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Bloc titre="Aujourd’hui">
            {rdv.map((item) => (
              <div key={item.heure} className="rounded-2xl border p-4">
                <p className="font-semibold">
                  {item.heure} — {item.client}
                </p>
                <p className="text-slate-600">{item.detail}</p>
                <p className="text-sm text-slate-500">{item.ville}</p>
              </div>
            ))}
          </Bloc>

          <Bloc titre="Alertes importantes">
            {alertes.map((alerte) => (
              <div key={alerte} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p>{alerte}</p>
              </div>
            ))}
          </Bloc>
        </section>

        <Bloc titre="Nouveau devis rapide">
          <div className="grid gap-4 md:grid-cols-4">
            <Card titre="Client" valeur="Jérémie Meurisse" />
            <Card titre="Chantier" valeur="Plafond dégât des eaux" />
            <Card titre="Prix conseillé" valeur="780 €" />
            <Card titre="Fournitures" valeur="Client fournit" />
          </div>
        </Bloc>

        <Bloc titre="PDF devis prêt à envoyer">
          <div className="space-y-2 rounded-2xl border p-5">
            <p className="text-lg font-semibold">DEV-2026-014 — PDF client final</p>
            <p>Client : Jérémie Meurisse</p>
            <p>Objet : Reprise plafonds suite ancien dégât des eaux</p>
            <p>Chambre 1 — Prix de la prestation : 290 €</p>
            <p>Chambre 2 — Prix de la prestation : 410 €</p>
            <p>Frais de déplacement et logistique : 80 €</p>
            <p className="pt-2 text-xl font-bold">Total devis : 780 €</p>
          </div>
        </Bloc>

        <Bloc titre="Actions rapides">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[
              "Nouveau client",
              "Ajouter RDV",
              "Estimation rapide",
              "Créer devis",
              "Ajouter dépense",
              "Encaissement reçu",
            ].map((action) => (
              <button
                key={action}
                className="rounded-2xl border bg-white p-4 text-sm font-medium hover:bg-slate-50"
              >
                {action}
              </button>
            ))}
          </div>
        </Bloc>
      </div>
    </main>
  );
}

function Card({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{titre}</p>
      <p className="mt-2 text-2xl font-bold">{valeur}</p>
    </div>
  );
}

function Bloc({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">{titre}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}