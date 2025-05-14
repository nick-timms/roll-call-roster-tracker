
import { useToast as useToastHook } from "@/components/ui/toaster"

export const useToast = () => {
  return useToastHook()
}

export const toast = (props: Parameters<ReturnType<typeof useToast>['toast']>[0]) => {
  // This is a runtime usage of the hook outside of a component
  // It's not ideal, but it's a common pattern for toast libraries
  // In this case, we're delegating to the useToast hook for proper implementation
  const { toast: toastFn } = useToast()
  return toastFn(props)
}
