
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
import { db } from '@/lib/db';
import { generateId, generateQRCode } from '@/lib/utils';
import { Member } from '@/types';
import { Users, UserPlus, Search, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MembersPage: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState<Partial<Member>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    membershipType: 'Standard'
  });
  
  const gym = db.getGym();
  const members = db.getMembers();
  
  const filteredMembers = members.filter((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           member.email.toLowerCase().includes(searchQuery.toLowerCase());
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
    
    const memberId = generateId();
    const qrCode = generateQRCode(memberId);
    
    const member: Member = {
      id: memberId,
      gymId: gym?.id || '',
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      email: newMember.email,
      phone: newMember.phone || '',
      membershipType: newMember.membershipType || 'Standard',
      qrCode,
      createdAt: new Date().toISOString()
    };
    
    try {
      db.saveMember(member);
      toast({
        title: "Member Added",
        description: `${member.firstName} ${member.lastName} has been added successfully`
      });
      setNewMember({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        membershipType: 'Standard'
      });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "There was a problem adding the member",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold">Members</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
            <Link to={`/members/${member.id}`} key={member.id}>
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="font-medium text-blue-700">
                        {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.firstName} {member.lastName}</p>
                      <p className="text-sm text-gray-500">{member.membershipType}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <QrCode className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No members found</h3>
            <p className="text-gray-500">
              {searchQuery 
                ? "No members match your search criteria" 
                : "Add your first member to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)} className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>
        )}
      </div>
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name*</Label>
                <Input
                  id="lastName"
                  value={newMember.lastName}
                  onChange={(e) => setNewMember({...newMember, lastName: e.target.value})}
                  required
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="membershipType">Membership Type</Label>
              <Input
                id="membershipType"
                value={newMember.membershipType}
                onChange={(e) => setNewMember({...newMember, membershipType: e.target.value})}
                placeholder="Standard"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersPage;
