import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title, description, comingSoon }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-5 text-center max-w-sm"
      >
        <div className="w-16 h-16 rounded-2xl bg-elevated border border-border flex items-center justify-center">
          <Construction size={28} className="text-dim" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          {description && (
            <p className="text-sm text-muted leading-relaxed">{description}</p>
          )}
        </div>

        {comingSoon && (
          <span className="px-3 py-1 rounded-full text-xs bg-accent-dim text-accent-light border border-accent/20">
            Coming Soon
          </span>
        )}
      </motion.div>
    </div>
  )
}
