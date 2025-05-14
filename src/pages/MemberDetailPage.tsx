import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { db } from '@/lib/db';
import { useToast } from "@/hooks/use-toast";

const MemberDetailPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [member, setMember] = useState(db.getMemberById(memberId!));
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (memberId) {
      const existingMember = db.getMemberById(memberId);
      if (existingMember) {
        setMember(existingMember);
      } else {
        toast({
          title: "Member Not Found",
          description: "The requested member does not exist.",
          variant: "destructive",
        });
        navigate('/members');
      }
    }
  }, [memberId, navigate, toast]);

  const handleCheckIn = () => {
    if (!member) return;

    // Optimistically update the member's status
    setMember(prevMember => {
      if (!prevMember) return prevMember;
      return {
        ...prevMember,
        membership_status: "Active"  // Changed from membershipStatus to membership_status
      };
    });

    // Add a check-in record
    db.addAttendanceRecord({
      id: uuid(),
      memberId: member.id,
      date: new Date().toISOString().split('T')[0],
      timeIn: new Date().toLocaleTimeString(),  // Changed from checkInTime to timeIn
    });

    toast({
      title: "Member Checked In",
      description: `${member.firstName} ${member.lastName} has been checked in.`,
    });
  };

  const handleCheckOut = () => {
    if (!member) return;

    // Find the last check-in record for the member without a check-out time
    const lastCheckIn = db.getAttendanceRecords()
      .filter(record => record.memberId === member.id && record.date === new Date().toISOString().split('T')[0])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (lastCheckIn) {
      // Update the check-out time for the last check-in record
      db.updateAttendanceRecord(lastCheckIn.id, {
        timeOut: new Date().toLocaleTimeString(),  // Changed from checkOutTime to timeIn
      });

      toast({
        title: "Member Checked Out",
        description: `${member.firstName} ${member.lastName} has been checked out.`,
      });
    } else {
      // If no active check-in is found, show an error message
      toast({
        title: "No Active Check-in",
        description: `${member.firstName} ${member.lastName} has no active check-in.`,
        variant: "destructive",
      });
    }
  };

  if (!member) {
    return <div>Loading...</div>;
  }

  const attendanceRecords = db.getAttendanceRecords().filter(record => record.memberId === member.id);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-zinc-900">{member.firstName} {member.lastName}</h1>
        <div className="flex space-x-2">
          <Button onClick={handleCheckIn} variant="outline">Check In</Button>
          <Button onClick={handleCheckOut} variant="outline">Check Out</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
            <CardDescription>View and edit member information.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" defaultValue={member.firstName} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" defaultValue={member.lastName} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={member.email || 'N/A'} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" defaultValue={member.phoneNumber || member.phone || 'N/A'} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="belt">Belt</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder={member.belt || 'Select a belt'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="brown">Brown</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="membershipStatus">Membership Status</Label>
              <Input id="membershipStatus" defaultValue={member.membership_status || 'N/A'} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" defaultValue={member.notes || 'N/A'} disabled />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate('/members')}>Back to Members</Button>
          </CardFooter>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>View member's check-in history.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check-In Time</TableHead>
                  <TableHead>Check-Out Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.timeIn} {record.timeOut ? `- ${record.timeOut}` : ""}</TableCell>
                    <TableCell>{record.timeOut || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberDetailPage;
