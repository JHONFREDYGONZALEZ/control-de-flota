export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse" aria-busy="true">
      <div className="h-8 w-24 rounded-lg bg-panelHover mb-4" />
      <div className="h-8 w-40 rounded-lg bg-panelHover mb-2" />
      <div className="h-4 w-56 rounded bg-panelHover mb-6" />
      <div className="h-20 rounded-xl2 bg-panelHover mb-4" />
      <div className="h-28 rounded-xl2 bg-panelHover mb-3" />
      <div className="h-28 rounded-xl2 bg-panelHover" />
    </div>
  );
}
