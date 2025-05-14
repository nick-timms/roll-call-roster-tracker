
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Member, AttendanceRecord } from '@/types';
import { ArrowLeft, Calendar, Edit, QrCode, Save, Trash2, User } from 'lucide-react';

const MemberDetailPage: React.FC = () => {
  const { toast } = useToast();
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<Member | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMember, setEditedMember] = useState<Member | null>(null);

  useEffect(() => {
    // Mock data for demonstration purposes
    const mockMember: Member = {
      id: memberId || '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      gymId: 'gym123',
      qrCode: 'qr123',
      membershipType: 'Monthly',
      membershipStatus: 'Active',
      dateOfBirth: '1990-01-01',
      address: '123 Main St',
      phoneNumber: '555-1234',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '555-5678',
      notes: 'Regular attendee',
      createdAt: '2023-01-01',
    };

    const mockAttendance: AttendanceRecord[] = [
      {
        id: 'attendance1',
        memberId: memberId || '1',
        checkInTime: '2023-10-26 08:00:00',
        checkOutTime: '2023-10-26 09:00:00',
      },
      {
        id: 'attendance2',
        memberId: memberId || '1',
        checkInTime: '2023-10-27 09:00:00',
        checkOutTime: '2023-10-27 10:00:00',
      },
    ];

    setMember(mockMember);
    setAttendance(mockAttendance);
    setEditedMember(mockMember);
  }, [memberId]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    // Save the edited member data
    setIsEditing(false);
    toast({
      title: "Success",
      description: "Member details updated successfully",
    });
  };

  const handleDelete = () => {
    // Delete the member
    navigate('/members');
    toast({
      title: "Success",
      description: "Member deleted successfully",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedMember((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setEditedMember((prev) => ({ ...prev, [name]: value }));
  };

  if (!member) {
    return <div>Loading member details...</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      <Button variant="ghost" onClick={() => navigate('/members')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Members
      </Button>

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Member Details</CardTitle>
          </div>
          <CardDescription>
            View and manage member information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-2">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">
                    First Name
                  </Label>
                  <Input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={editedMember?.firstName || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">
                    Last Name
                  </Label>
                  <Input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={editedMember?.lastName || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={editedMember?.email || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="membershipType" className="text-right">
                    Membership Type
                  </Label>
                  <Select
                    onValueChange={(value) => handleSelectChange(value, "membershipType")}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a membership type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Annual">Annual</SelectItem>
                      <SelectItem value="Trial">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="membershipStatus" className="text-right">
                    Membership Status
                  </Label>
                  <Select
                    onValueChange={(value) => handleSelectChange(value, "membershipStatus")}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a membership status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="attendance">
              <h2 className="text-lg font-semibold">Attendance Records</h2>
              <ul>
                {attendance.map((record) => (
                  <li key={record.id} className="py-2">
                    Check-in: {record.checkInTime}, Check-out: {record.checkOutTime}
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Member
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default MemberDetailPage;
