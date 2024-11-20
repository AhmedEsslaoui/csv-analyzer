"use client"

import * as React from "react"
import {
  Toast,
  ToastActionElement,
  ToastProps,
} from "@radix-ui/react-toast"

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

export type { Toast, ToastActionElement, ToastProps }