'use client'

import { useState } from 'react'
import { Check, ExternalLink, Mail } from 'lucide-react'

const LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/jaekwanAHN/chuksung',
    icon: ExternalLink,
    copyValue: 'https://github.com/jaekwanAHN/chuksung',
  },
  {
    label: 'ggstork@gmail.com',
    href: 'mailto:ggstork@gmail.com',
    icon: Mail,
    copyValue: 'ggstork@gmail.com',
  },
]

export function Footer() {
  const [copiedValue, setCopiedValue] = useState('')

  const handleClick = (copyValue: string) => {
    navigator.clipboard.writeText(copyValue).catch(() => {})
    setCopiedValue(copyValue)
    setTimeout(() => setCopiedValue(''), 2000)
  }

  return (
    <footer className="border-t border-zinc-200 bg-white px-4 py-4 md:px-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-xs text-zinc-400">
          © {new Date().getFullYear()} chuksung. All rights reserved.
        </p>
        <ul className="flex items-center gap-4">
          {LINKS.map(({ label, href, icon: Icon, copyValue }) => {
            const isCopied = copiedValue === copyValue
            return (
              <li key={href}>
                <a
                  href={href}
                  target={href.startsWith('mailto') ? undefined : '_blank'}
                  rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                  onClick={() => handleClick(copyValue)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 transition hover:text-zinc-700"
                >
                  {isCopied ? (
                    <Check className="size-3.5 shrink-0 text-emerald-500" aria-hidden />
                  ) : (
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                  )}
                  <span className={isCopied ? 'text-emerald-500' : undefined}>
                    {isCopied ? '복사됨!' : label}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </footer>
  )
}
