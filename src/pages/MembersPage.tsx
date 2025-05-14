
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Member } from '@/types';
import { Users, UserPlus, Search, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

const MembersPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState<Partial<Member>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    membershipType: 'Standard'
  });
  
  // Fetch the gym data
  const { data: gymData } = useQuery({
    queryKey: ['gym'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('email', user?.email || '')
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  
  // Fetch members data
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      if (!gymData?.id) return [];
      
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('gym_id', gymData.id);
      
      if (error) throw error;
      
      // Transform database columns to our frontend model
      return data.map(member => ({
        id: member.id,
        gymId: member.gym_id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        phone: member.phone || '',
        membershipType: member.membership_type || 'Standard',
        belt: member.belt || '',
        qrCode: member.qr_code,
        createdAt: member.created_at
      }));
    },
    enabled: !!gymData?.id,
  });
  
  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (member: Partial<Member>) => {
      if (!gymData?.id) throw new Error("Gym not found");
      
      const qrCode = generateQRCode(crypto.randomUUID());
      
      const { data, error } = await supabase
        .from('members')
        .insert({
          gym_id: gymData.id,
          first_name: member.firstName,
          last_name: member.lastName,
          email: member.email,
          phone: member.phone,
          membership_type: member.membershipType,
          belt: member.belt,
          qr_code: qrCode,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({
        title: "Member Added",
        description: `${newMember.firstName} ${newMember.lastName} has been added successfully`
      });
      setNewMember({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        membershipType: 'Standard'
      });
      setShowAddDialog(false);
    },
    onError: (error) => {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "There was a problem adding the member",
        variant: "destructive"
      });
    }
  });
  
  const handleAddMember = () => {
    if (!newMember.firstName || !newMember.lastName || !newMember.email) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    addMemberMutation.mutate(newMember);
  };
  
  const filteredMembers = members.filter((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           member.email.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-zinc-900">Members</h1>
        <Button onClick={() => setShowAddDialog(true)} className="bg-primary hover:bg-primary/90">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-zinc-200 text-zinc-800 bg-zinc-50 focus:bg-white transition-colors"
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-12 text-center bg-white rounded-xl border border-zinc-200 shadow-sm">
            <p className="text-zinc-500">Loading members...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
            <Link to={`/members/${member.id}`} key={member.id}>
              <Card className="hover:bg-zinc-50 transition-colors border-zinc-200 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                      <span className="font-medium text-primary">
                        {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">{member.firstName} {member.lastName}</p>
                      <p className="text-sm text-zinc-500">{member.membershipType}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-zinc-400">
                    <QrCode className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="py-12 text-center bg-white rounded-xl border border-zinc-200 shadow-sm">
            <Users className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-1">No members found</h3>
            <p className="text-zinc-500">
              {searchQuery 
                ? "No members match your search criteria" 
                : "Add your first member to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)} className="mt-4 bg-primary hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>
        )}
      </div>
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Add a new member to your gym. They'll receive a QR code for check-in.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name*</Label>
                <Input
                  id="firstName"
                  value={newMember.firstName}
                  onChange={(e) => setNewMember({...newMember, firstName: e.target.value})}
                  required
                  className="border-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name*</Label>
                <Input
                  id="lastName"
                  value={newMember.lastName}
                  onChange={(e) => setNewMember({...newMember, lastName: e.target.value})}
                  required
                  className="border-zinc-200"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email*</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                required
                className="border-zinc-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                className="border-zinc-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="membershipType">Membership Type</Label>
              <Input
                id="membershipType"
                value={newMember.membershipType}
                onChange={(e) => setNewMember({...newMember, membershipType: e.target.value})}
                placeholder="Standard"
                className="border-zinc-200"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddMember} 
              className="bg-primary hover:bg-primary/90"
              disabled={addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersPage;
