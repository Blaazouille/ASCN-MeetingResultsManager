export default function HomePage(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="text-xl font-semibold text-primary-800">Accueil</h1>
      <p className="text-neutral-600">
        La liste des meetings sera disponible en Phase 4, avec la persistance SQLite.
      </p>
    </div>
  );
}
