
import { useToast as useToastFromUI, type ToasterToast } from "@/components/ui/toaster";

// Create a wrapper function for the toast functionality
export const useToast = useToastFromUI;

// Create a toast function that can be called directly while still providing method access
interface ToastFunction {
  (props: Omit<ToasterToast, "id">): void;
  title: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

// Create the base toast function
const createToastFunction = (): ToastFunction => {
  // Create the main function that will be called directly
  const toastFn = ((props: Omit<ToasterToast, "id">) => {
    const { toast } = useToast();
    toast(props);
  }) as ToastFunction;
  
  // Add methods to the function
  toastFn.title = (title: string, description?: string) => {
    const { toast } = useToast();
    toast({
      title,
      description,
    });
  };
  
  toastFn.error = (title: string, description?: string) => {
    const { toast } = useToast();
    toast({
      title,
      description,
      variant: "destructive",
    });
  };
  
  return toastFn;
};

// Export the toast function with its methods
export const toast = createToastFunction();

// Re-export the type for use in other files
export type { ToasterToast };
