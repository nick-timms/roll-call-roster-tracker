
import { useToast as useToastFromUI, type ToasterToast } from "@/components/ui/toaster";

// Create a wrapper function for the toast functionality
export const useToast = useToastFromUI;

// Export the toast function separately
export const toast = {
  // Define basic toast methods that mirror what's in the toaster component
  title: (title: string, description?: string) => {
    const { toast } = useToast();
    toast({
      title,
      description,
    });
  },
  error: (title: string, description?: string) => {
    const { toast } = useToast();
    toast({
      title,
      description,
      variant: "destructive",
    });
  },
  // Add a default method that accepts the full toast options
  default: (options: Omit<ToasterToast, "id">) => {
    const { toast } = useToast();
    toast(options);
  }
};

// Re-export the type for use in other files
export type { ToasterToast };
