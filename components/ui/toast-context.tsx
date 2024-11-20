"use client"

import * as React from "react"
import {
  Toast,
  ToastProps,
} from "@radix-ui/react-toast"

type ToastActionElement = React.ReactElement<React.HTMLAttributes<HTMLButtonElement>>

type ToastContextType = {
  toast: (props: ToastProps & { action?: ToastActionElement }) => void
}

export const ToastContext = React.createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<(ToastProps & { action?: ToastActionElement })[]>([])

  const toast = React.useCallback((props: ToastProps & { action?: ToastActionElement }) => {
    setToasts((prevToasts) => [...prevToasts, props])
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.map((toastProps, index) => (
        <Toast key={index} {...toastProps} />
      ))}
    </ToastContext.Provider>
  )
}

export type { Toast, ToastProps }