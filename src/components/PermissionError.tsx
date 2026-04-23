import { ShieldAlert } from 'lucide-react'

interface PermissionErrorProps {
  title: string
  message: string
  onBack?: () => void
}

export default function PermissionError({ title, message, onBack }: PermissionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg px-6 text-center">
      <ShieldAlert size={48} className="text-danger mb-4" />
      <h2
        className="text-3xl text-danger mb-3"
        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
      >
        {title}
      </h2>
      <p className="text-[#f0f0f0] font-mono text-sm leading-relaxed mb-8 max-w-sm">{message}</p>
      {onBack && (
        <button
          onClick={onBack}
          className="w-full max-w-xs h-12 border-2 border-accent text-accent font-display text-lg tracking-widest active:scale-[0.97] transition-transform"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          GO BACK
        </button>
      )}
    </div>
  )
}
