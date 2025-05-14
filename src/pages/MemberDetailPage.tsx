
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Clock, CalendarIcon } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const MemberDetailPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch member data
  const { 
    data: member, 
    isLoading: memberLoading, 
    isError: memberError 
  } = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      if (!memberId) throw new Error("Member ID is required");
      
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) {
        console.error("Error fetching member:", error);
        throw new Error(error.message);
      }
      
      return data;
    },
    retry: 1,
  });

  // Fetch attendance records
  const { 
    data: attendanceRecords,
    isLoading: recordsLoading,
    isError: recordsError
  } = useQuery({
    queryKey: ['attendance', memberId],
    queryFn: async () => {
      if (!memberId) return [];
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('member_id', memberId);

      if (error) {
        console.error("Error fetching attendance records:", error);
        throw new Error(error.message);
      }
      
      return data || [];
    },
    enabled: !!memberId,
    retry: 1,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error("Member ID is required");
      
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString();
      
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          member_id: memberId,
          date: today,
          time_in: currentTime,
        })
        .select();

      if (error) {
        console.error("Error checking in member:", error);
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', memberId] });
      toast({
        title: "Member Checked In",
        description: `${member?.first_name} ${member?.last_name} has been checked in.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error("Member ID is required");
      
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString();
      
      // Find the latest check-in record for today
      const { data: latestRecords, error: fetchError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('member_id', memberId)
        .eq('date', today)
        .is('time_out', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error("Error finding check-in record:", fetchError);
        throw new Error(fetchError.message);
      }

      if (!latestRecords || latestRecords.length === 0) {
        throw new Error("No active check-in found for today");
      }

      const latestRecord = latestRecords[0];
      
      // Update the record with checkout time
      const { data, error: updateError } = await supabase
        .from('attendance_records')
        .update({ time_out: currentTime })
        .eq('id', latestRecord.id)
        .select();

      if (updateError) {
        console.error("Error checking out member:", updateError);
        throw new Error(updateError.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', memberId] });
      toast({
        title: "Member Checked Out",
        description: `${member?.first_name} ${member?.last_name} has been checked out.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Check-out Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCheckIn = () => {
    checkInMutation.mutate();
  };

  const handleCheckOut = () => {
    checkOutMutation.mutate();
  };

  if (memberLoading || recordsLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (memberError || !member) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-red-500">Member not found</h2>
        <p className="mb-4">The member you're looking for could not be found.</p>
        <Button onClick={() => navigate('/members')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/members')}
            className="mb-2 -ml-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Members
          </Button>
          <h1 className="text-2xl font-bold text-zinc-900">
            {member.first_name} {member.last_name}
          </h1>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleCheckIn} variant="outline" disabled={checkInMutation.isPending}>
            {checkInMutation.isPending ? "Processing..." : "Check In"}
          </Button>
          <Button onClick={handleCheckOut} variant="outline" disabled={checkOutMutation.isPending}>
            {checkOutMutation.isPending ? "Processing..." : "Check Out"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
            <CardDescription>View member information.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={member.first_name || 'N/A'} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={member.last_name || 'N/A'} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={member.email || 'N/A'} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" value={member.phone || 'N/A'} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="belt">Belt</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder={member.belt || 'Not specified'} />
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
              <Label htmlFor="membershipType">Membership Type</Label>
              <Input id="membershipType" value={member.membership_type || 'Standard'} disabled />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate(`/members/${member.id}/edit`)}>
              Edit Details
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>View member's check-in/out history.</CardDescription>
          </CardHeader>
          <CardContent>
            {recordsError ? (
              <p className="text-red-500">Error loading attendance records.</p>
            ) : attendanceRecords && attendanceRecords.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.time_in}</TableCell>
                      <TableCell>{record.time_out || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No attendance records</h3>
                <p className="mt-1 text-sm text-gray-500">This member hasn't checked in yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberDetailPage;
