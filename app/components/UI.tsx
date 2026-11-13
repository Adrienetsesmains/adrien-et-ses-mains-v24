"use client";

import { ReactNode, useState } from "react";

// ================= BLOCS =================

export function BlocRepliable({
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

export function Bloc({
  titre,
  children,
}: {
  titre: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-slate-900">{titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// ================= UI =================

export function Card({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <p className="text-xs text-slate-500">{titre}</p>
      <p className="text-lg font-bold text-slate-900">{valeur}</p>
    </div>
  );
}

export function MiniResult({
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

export function Input({
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

export function TextArea({
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

export function NumberInput({
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

// 🔥 DateInput corrigé
function formatDateInputVersFr(dateIso: string) {
  if (!dateIso) return "";
  const [annee, mois, jour] = dateIso.split("-");
  return `${jour}/${mois}/${annee}`;
}

function formatDateFrVersInput(dateFr: string) {
  if (!dateFr) return "";
  if (dateFr.includes("-")) return dateFr;

  const [jour, mois, annee] = dateFr.split("/");
  if (!jour || !mois || !annee) return "";

  return `${annee}-${mois.padStart(2, "0")}-${jour.padStart(2, "0")}`;
}

export function DateInput({
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

export function Select({
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

export function Check({
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