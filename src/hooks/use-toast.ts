
// Re-export from the toaster component
import { useToast as useToastHook, type ToasterToast } from "@/components/ui/toaster";

export const useToast = useToastHook;

// Define a toast function for compatibility
export const toast = (props: Omit<ToasterToast, "id">) => {
  const { toast } = useToastHook();
  return toast(props);
};

// Re-export types
export type { ToasterToast };
