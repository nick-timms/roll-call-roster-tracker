
import { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, gymName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  recoverDatabaseConnection: () => Promise<boolean>; // Add recovery function
}

export interface GymDetails {
  id: string;
  name: string;
  phone?: string;
  company_name?: string;
  address?: string;
  email: string;
}
