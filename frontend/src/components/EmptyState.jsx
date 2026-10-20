export default function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {Icon && (
        <div className="mb-3 rounded-full bg-surface p-3 text-ink-300">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-ink-400">{children}</div>}
    </div>
  )
}
