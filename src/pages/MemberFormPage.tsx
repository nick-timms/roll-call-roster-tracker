
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getGymIdByUserId } from '@/hooks/auth/gym-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// Form validation schema
const memberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').or(z.string().length(0)),
  phone: z.string().optional(),
  belt: z.string().optional(),
  membership_type: z.string().optional(),
  notes: z.string().optional(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

const MemberFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize form with default values
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      belt: 'white',
      membership_type: 'Standard',
      notes: '',
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (values: MemberFormValues) => {
      setIsLoading(true);
      
      if (!user?.id) {
        throw new Error('You must be logged in to add members');
      }
      
      try {
        // Get gym ID for the current user
        const gymId = await getGymIdByUserId(user.id);
        
        if (!gymId) {
          throw new Error('No gym found for this account');
        }
        
        // Create member object with required fields
        const memberData = {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || '', // Ensure email is not undefined
          gym_id: gymId,
          phone: values.phone || null,
          belt: values.belt || null,
          membership_type: values.membership_type || null,
          notes: values.notes || null,
          qr_code: '', // We'll generate this later if needed
        };
        
        // Insert into database - ensure we're passing a single object, not an array
        const { data, error } = await supabase
          .from('members')
          .insert(memberData)
          .select();
          
        if (error) {
          console.error('Error adding member:', error);
          throw new Error(error.message);
        }
        
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Member added",
        description: "The member has been successfully added",
      });
      
      // Redirect to the new member's detail page
      if (data && data[0]?.id) {
        navigate(`/members/${data[0].id}`);
      } else {
        navigate('/members');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add member: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: MemberFormValues) => {
    addMemberMutation.mutate(values);
  };

  return (
    <div className="container max-w-3xl py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/members')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Members
        </Button>
        <h1 className="text-2xl font-bold">Add New Member</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Member Information</CardTitle>
          <CardDescription>
            Enter the details of the new member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="First Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Last Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="belt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Belt</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select belt rank" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="white">White</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="purple">Purple</SelectItem>
                          <SelectItem value="brown">Brown</SelectItem>
                          <SelectItem value="black">Black</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="membership_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select membership type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Premium">Premium</SelectItem>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Family">Family</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any notes about this member"
                        className="h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <CardFooter className="flex justify-end px-0 pt-5">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mr-2"
                  onClick={() => navigate('/members')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                >
                  {isLoading ? "Adding..." : "Add Member"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberFormPage;
