
import { useState, useEffect } from "react"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// Create a simple way to manage toasts
import { createContext, useContext } from "react"
import { v4 as uuid } from "uuid"

type ToastPosition = "top" | "top-left" | "top-right" | "bottom" | "bottom-left" | "bottom-right"

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  position?: ToastPosition
  variant?: "default" | "destructive"
}

type ToastContextType = {
  toasts: ToasterToast[]
  addToast: (toast: Omit<ToasterToast, "id">) => void
  updateToast: (id: string, toast: Partial<ToasterToast>) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  updateToast: () => {},
  dismissToast: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToasterToast[]>([])

  const addToast = (toast: Omit<ToasterToast, "id">) => {
    const id = uuid()
    setToasts((prev) => [...prev, { id, ...toast }])

    // Auto-dismiss after 5 seconds unless it's destructive
    if (toast.variant !== "destructive") {
      setTimeout(() => {
        dismissToast(id)
      }, 5000)
    }
  }

  const updateToast = (id: string, toast: Partial<ToasterToast>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...toast } : t))
    )
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, updateToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function Toaster() {
  const { toasts, dismissToast } = useContext(ToastContext)

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} onOpenChange={(open) => {
            if (!open) dismissToast(id)
          }}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function toast({
  title,
  description,
  variant = "default",
  ...props
}: Omit<ToasterToast, "id">) {
  const { addToast } = useContext(ToastContext)
  
  addToast({
    title,
    description,
    variant,
    ...props
  })
}
