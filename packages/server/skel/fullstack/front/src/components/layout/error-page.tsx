// Affichée par la frontière d'erreur racine quand un composant lève. Une page
// générique vaut mieux qu'un écran blanc, qui est précisément ce qui rend une
// panne du front invisible pour tout le monde sauf l'utilisateur.
export function ErrorPage() {
  return (
    <div className="mx-auto max-w-md p-8 text-center" role="alert">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-slate-600">
        L'incident a été signalé. Vous pouvez recharger la page pour reprendre.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded bg-slate-900 px-4 py-2 text-sm text-white"
      >
        Recharger
      </button>
    </div>
  );
}
