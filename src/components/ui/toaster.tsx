'use client'

import * as React from 'react'
import * as Toast from '@radix-ui/react-toast'

type ToastVariant = 'success' | 'error'

interface ToastMessage {
  title: string
  description?: string
  variant?: ToastVariant
}

const ToastContext = React.createContext<(msg: ToastMessage) => void>(() => {})

export function useRadixToast() {
  return React.useContext(ToastContext)
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [message, setMessage] = React.useState<ToastMessage>({
    title: '',
    description: '',
    variant: 'success',
  })

  const showToast = (msg: ToastMessage) => {
    setOpen(false)
    setTimeout(() => {
      setMessage(msg)
      setOpen(true)
    }, 0)
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toast.Provider swipeDirection="right" duration={4000}>
        <Toast.Root
          open={open}
          onOpenChange={setOpen}
          className={`data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut
            rounded-lg p-4 shadow-lg text-white max-w-xs
            ${message.variant === 'error' ? 'bg-red-600' : 'bg-green-600'}
          `}
        >
          <Toast.Title className="font-bold">{message.title}</Toast.Title>
          {message.description && (
            <Toast.Description className="text-sm mt-1">
              {message.description}
            </Toast.Description>
          )}
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}
