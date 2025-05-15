import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateQRCode } from '@/lib/utils';
import { Users, UserPlus, Search, QrCode, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  supabase, 
  hasValidSession, 
  logAuthState, 
  refreshSession,
  testDatabaseConnection 
} from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/use-auth';
import { getGymIdByUserId, testDatabaseAccess, ensureGymExists } from '@/hooks/auth/gym-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MembersPage: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [gymId, setGymId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string>("checking");
  const [dbAccessStatus, setDbAccessStatus] = useState<string>("unknown");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Check authentication and database access on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user?.id) {
          console.log("No user ID found");
          setAuthStatus("no_user");
          return;
        }
        
        const isValid = await hasValidSession();
        setAuthStatus(isValid ? "authenticated" : "not_authenticated");
        
        if (isValid) {
          await logAuthState();
          
          // Test general database access
          const dbAccessOk = await testDatabaseAccess();
          setDbAccessStatus(dbAccessOk ? "access_ok" : "access_denied");
          
          // Test connection specifically 
          await testDatabaseConnection();
        } else {
          console.log("No valid session found, attempting to refresh");
          const refreshed = await refreshSession();
          setAuthStatus(refreshed ? "refreshed" : "not_authenticated");
          
          if (refreshed) {
            const dbAccessOk = await testDatabaseAccess();
            setDbAccessStatus(dbAccessOk ? "access_ok" : "access_denied");
          }
        }
      } catch (err) {
        console.error("Error checking auth status:", err);
        setAuthStatus("error");
      }
    };
    
    checkAuth();
  }, [user?.id]);

  // Fetch gym ID on component mount
  useEffect(() => {
    const fetchGymId = async () => {
      if (!user?.id) {
        console.log("No user ID found, cannot fetch gym ID");
        return;
      }
      
      try {
        console.log("Fetching gym ID for user:", user.id);
        const id = await getGymIdByUserId(user.id);
        console.log("Fetched gym ID:", id);
        
        if (id) {
          setGymId(id);
        } else {
          // If no gym ID is found, try to create one
          console.log("No gym ID found, creating one");
          const gymName = user.email ? user.email.split('@')[0] + "'s Gym" : "My Gym";
          const newGym = await ensureGymExists(user.id, user.email || '', gymName);
          if (newGym?.id) {
            console.log("Created new gym with ID:", newGym.id);
            setGymId(newGym.id);
          } else {
            console.error("Failed to create gym");
            toast({
              title: "Error",
              description: "Could not create or find your gym profile",
              variant: "destructive"
            });
          }
        }
      } catch (err) {
        console.error("Error fetching gym ID:", err);
        toast({
          title: "Error",
          description: "Could not fetch gym information",
          variant: "destructive"
        });
      }
    };
    
    fetchGymId();
  }, [user?.id, toast, user?.email]);

  // Handler to manually refresh authentication
  const handleRefreshAuth = async () => {
    setIsRefreshing(true);
    try {
      // Refresh session token
      const refreshed = await refreshSession();
      
      if (refreshed) {
        toast({
          title: "Success",
          description: "Authentication refreshed successfully",
        });
        
        // Test database access after refresh
        const dbAccessOk = await testDatabaseAccess();
        setDbAccessStatus(dbAccessOk ? "access_ok" : "access_denied");
        
        // Refetch members data
        queryClient.invalidateQueries({ queryKey: ['members'] });
      } else {
        toast({
          title: "Error",
          description: "Could not refresh authentication",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error refreshing authentication:", err);
      toast({
        title: "Error",
        description: "An error occurred while refreshing authentication",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch members using react-query with improved error handling
  const { data: members, isLoading, isError, error } = useQuery({
    queryKey: ['members', gymId],
    queryFn: async () => {
      if (!user?.id || !gymId) {
        console.log("No user ID or gym ID found, cannot fetch members");
        return [];
      }

      console.log("Fetching members for gym ID:", gymId);
      
      // Verify authentication status
      const isAuthenticated = await hasValidSession();
      if (!isAuthenticated) {
        console.error("No valid session for fetching members, trying to refresh");
        const refreshed = await refreshSession();
        if (!refreshed) {
          console.error("Authentication required to fetch members");
          throw new Error("Authentication required to fetch members");
        }
      }
      
      try {
        // Log authentication state
        await logAuthState();
        console.log("Session state when fetching members:", !!session);
        
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('gym_id', gymId);

        if (error) {
          console.error("Error fetching members:", error);
          
          // If permission denied, try refreshing token
          if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
            console.log("Permission denied, trying to refresh token");
            const refreshed = await refreshSession();
            
            if (refreshed) {
              console.log("Token refreshed, retrying fetch");
              const { data: retryData, error: retryError } = await supabase
                .from('members')
                .select('*')
                .eq('gym_id', gymId);
                
              if (retryError) {
                console.error("Error fetching members after token refresh:", retryError);
                throw new Error(retryError.message);
              }
              
              console.log(`Successfully fetched ${retryData?.length || 0} members after token refresh`);
              return retryData || [];
            } else {
              throw new Error("Could not refresh authentication token");
            }
          } else {
            throw new Error(error.message);
          }
        }
        
        console.log(`Successfully fetched ${data?.length || 0} members`);
        return data || [];
      } catch (fetchError) {
        console.error("Failed to fetch members:", fetchError);
        throw fetchError;
      }
    },
    enabled: !!gymId && authStatus === "authenticated" || authStatus === "refreshed",
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for adding a new member with improved error handling
  const addMemberMutation = useMutation({
    mutationFn: async (newMemberName: string) => {
      console.log("Starting member creation process");
      
      if (!user?.id) {
        throw new Error("You must be logged in to add members");
      }
      
      if (!gymId) {
        throw new Error("No gym ID found. Please make sure your gym is set up correctly");
      }
      
      // Verify authentication status
      const isAuthenticated = await hasValidSession();
      if (!isAuthenticated) {
        console.log("No valid session for adding member, trying to refresh");
        const refreshed = await refreshSession();
        if (!refreshed) {
          throw new Error("Authentication required to add members");
        }
      }
      
      console.log("Adding member with name:", newMemberName, "to gym ID:", gymId);
      console.log("Authentication state:", {
        user_id: user.id,
        email: user.email,
        session_exists: !!session
      });
      
      // Log auth state for debugging
      await logAuthState();
      
      // Generate a random QR code for the member
      const baseUrl = window.location.origin;
      const tempId = Math.random().toString(36).substring(2, 15);
      const memberUrl = `${baseUrl}/members/${tempId}`;
      
      console.log("Generating QR code for URL:", memberUrl);
      const qrCodeDataUrl = await generateQRCode(memberUrl);
      
      // Create new member object
      const newMember = {
        first_name: newMemberName,
        last_name: '', // Required field
        email: '', // Required field
        gym_id: gymId,
        qr_code: qrCodeDataUrl || ''
      };
      
      console.log("Submitting new member to database:", {
        first_name: newMember.first_name,
        gym_id: newMember.gym_id
      });
      
      try {
        // Insert member into database
        const { data, error } = await supabase
          .from('members')
          .insert([newMember])
          .select();

        if (error) {
          // Log detailed error information
          console.error("Error adding member:", {
            error_message: error.message,
            error_details: error.details,
            error_hint: error.hint,
            error_code: error.code
          });
          
          // Create detailed error message
          const errorMsg = `Error: ${error.message}\nCode: ${error.code}\nHint: ${error.hint || 'None'}\nDetails: ${error.details || 'None'}`;
          setErrorDetails(errorMsg);
          
          // If permission denied, try refreshing token
          if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
            console.log("Permission denied, trying to refresh token");
            const refreshed = await refreshSession();
            
            if (refreshed) {
              console.log("Token refreshed, retrying member creation");
              const { data: retryData, error: retryError } = await supabase
                .from('members')
                .insert([newMember])
                .select();
                
              if (retryError) {
                console.error("Error adding member after token refresh:", retryError);
                throw new Error(retryError.message);
              }
              
              console.log("Member added successfully after token refresh:", retryData);
              return retryData;
            } else {
              throw new Error("Could not refresh authentication token");
            }
          } else {
            throw new Error(error.message);
          }
        }
        
        console.log("Member added successfully:", data);
        return data;
      } catch (error: any) {
        console.error("Exception in member creation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch members
      queryClient.invalidateQueries({ queryKey: ['members', gymId] });
      toast({
        title: "Success",
        description: "Member added successfully",
      });
      setNewMemberName('');
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Error in mutation:", error);
      
      // Show detailed error information
      setIsErrorDialogOpen(true);
      
      toast({
        title: "Error",
        description: `Failed to add member: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handlers
  const handleOpenDialog = () => setIsDialogOpen(true);

  const handleAddMember = async () => {
    if (newMemberName.trim() === '') {
      toast({
        title: "Error",
        description: "Member name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Attempting to add member:", newMemberName);
    await addMemberMutation.mutate(newMemberName);
  };

  const filteredMembers = members
    ? members.filter(member =>
        member.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.last_name && member.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleGenerateQrCode = async (memberId: string) => {
    setSelectedMemberId(memberId);
    const baseUrl = window.location.origin;
    const memberUrl = `${baseUrl}/members/${memberId}`;
    try {
      const qrCodeDataUrl = await generateQRCode(memberUrl);
      setQrCode(qrCodeDataUrl);
      setIsQrCodeDialogOpen(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    }
  };

  const closeQrCodeDialog = () => {
    setIsQrCodeDialogOpen(false);
    setSelectedMemberId(null);
    setQrCode(null);
  };

  const closeErrorDialog = () => {
    setIsErrorDialogOpen(false);
    setErrorDetails(null);
  };
  
  // Handle authentication issues
  if (authStatus === "no_user" || authStatus === "not_authenticated") {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
        <p className="mb-4 text-center">You need to be logged in to access this page.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate('/login')}>
            Go to Login
          </Button>
          <Button variant="outline" onClick={handleRefreshAuth} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Authentication
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Loading state when waiting for gym ID
  if (!gymId && user?.id) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading gym data...</span>
      </div>
    );
  }

  // Display loading state for members
  if (isLoading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <span className="ml-3 text-gray-600">Loading members...</span>
    </div>
  );

  // Display database access issues
  if (dbAccessStatus === "access_denied") {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Database Access Issue</h2>
        <p className="mb-4 text-center">Unable to access the database. This may be due to permissions issues.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
          <Button variant="outline" onClick={handleRefreshAuth} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Authentication
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  if (isError) {
    console.error("Error details:", error);
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-red-500 mb-2">Error fetching members</h2>
        <p className="mb-4">{error instanceof Error ? error.message : "Unknown error occurred"}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['members', gymId] })}>
            Try Again
          </Button>
          <Button variant="outline" onClick={handleRefreshAuth} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Authentication
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <Button onClick={handleOpenDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {isError && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-lg font-semibold text-red-700">Error loading members</h3>
          <p className="text-red-600">{error instanceof Error ? error.message : "Failed to load members data"}</p>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['members', gymId] })}
            className="mt-2"
          >
            Try again
          </Button>
        </div>
      )}

      {!isError && filteredMembers.length === 0 ? (
        <div className="text-center py-10">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No members</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new member.</p>
          <div className="mt-6">
            <Button onClick={handleOpenDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="bg-white shadow-md rounded-md">
              <CardContent className="p-4">
                <Link to={`/members/${member.id}`} className="block hover:underline">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {member.first_name} {member.last_name}
                  </h2>
                </Link>
                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleGenerateQrCode(member.id)}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Enter the name of the new member to add to the gym.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                type="text"
                id="name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="col-span-3"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={() => handleAddMember()} 
              disabled={addMemberMutation.isPending || newMemberName.trim() === ''}
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrCodeDialogOpen} onOpenChange={setIsQrCodeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Member QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to view member details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {qrCode && <img src={qrCode} alt="Member QR Code" />}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeQrCodeDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error Details</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[300px]">
                <pre className="whitespace-pre-wrap text-xs text-red-600">
                  {errorDetails || "Unknown error occurred"}
                </pre>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeErrorDialog}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MembersPage;
