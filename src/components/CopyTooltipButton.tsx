'use client'

import * as React from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Button } from './ui/button'
import { Copy } from 'lucide-react'

export function CopyTooltipButton({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      // Show tooltip only after a successful click
      setOpen(true)
      // Auto-hide after 1.5s
      setTimeout(() => setOpen(false), 1500)
    } catch (err) {
      // handle copy error if needed
    }
  }

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root open={open}>
        <Tooltip.Trigger asChild>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="shrink-0 bg-transparent cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="rounded bg-green-600 text-white px-2 py-1 text-xs shadow-md animate-fadeIn"
          >
            Copied!
            <Tooltip.Arrow className="fill-green-600" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
