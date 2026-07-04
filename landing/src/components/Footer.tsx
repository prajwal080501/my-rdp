export default function Footer() {
  return (
    <footer className="relative mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span>Beam</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Beam. Self-hosted, always.</p>
      </div>
    </footer>
  );
}
