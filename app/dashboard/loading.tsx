export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-pulse" aria-busy="true">
      <div className="h-9 w-48 rounded-lg bg-panelHover mb-6" />
      <div className="h-24 rounded-xl2 bg-panelHover mb-4" />
      <div className="h-24 rounded-xl2 bg-panelHover mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 rounded-xl2 bg-panelHover" />
        ))}
      </div>
    </div>
  );
}
