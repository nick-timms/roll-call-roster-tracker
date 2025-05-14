
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { AttendanceRecord } from '@/types';
import { CalendarCheck, Trash2, QrCode, Calendar, Edit, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MemberDetailPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const member = db.getMemberById(memberId || '');
  const attendanceRecords = db.getAttendanceByMemberId(memberId || '');
  
  const [showQRCode, setShowQRCode] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddAttendanceDialog, setShowAddAttendanceDialog] = useState(false);
  
  const [editedMember, setEditedMember] = useState(member ? { ...member } : null);
  const [newAttendance, setNewAttendance] = useState<Partial<AttendanceRecord>>({
    date: formatDate(new Date()),
    timeIn: new Date().toTimeString().substring(0, 5),
    notes: ''
  });
  
  if (!member) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Member not found</h3>
        <p className="text-gray-500 mb-4">The member you're looking for does not exist</p>
        <Button onClick={() => navigate('/members')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Members
        </Button>
      </div>
    );
  }
  
  const handleUpdateMember = () => {
    if (editedMember) {
      try {
        db.saveMember(editedMember);
        toast({
          title: "Member Updated",
          description: "Member information has been updated successfully",
        });
        setShowEditDialog(false);
      } catch (error) {
        console.error('Error updating member:', error);
        toast({
          title: "Error",
          description: "There was a problem updating the member",
          variant: "destructive"
        });
      }
    }
  };
  
  const handleDeleteMember = () => {
    try {
      db.deleteMember(member.id);
      toast({
        title: "Member Deleted",
        description: "Member has been removed successfully",
      });
      navigate('/members');
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: "Error",
        description: "There was a problem deleting the member",
        variant: "destructive"
      });
    }
  };
  
  const handleAddAttendance = () => {
    if (!newAttendance.date) {
      toast({
        title: "Missing Date",
        description: "Please provide a date for the attendance record",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const record: AttendanceRecord = {
        id: Date.now().toString(),
        memberId: member.id,
        date: newAttendance.date || formatDate(new Date()),
        timeIn: newAttendance.timeIn || new Date().toTimeString().substring(0, 5),
        notes: newAttendance.notes
      };
      
      db.checkInMember(record);
      toast({
        title: "Attendance Added",
        description: "Attendance record has been added successfully",
      });
      setShowAddAttendanceDialog(false);
      
      // Reset the form
      setNewAttendance({
        date: formatDate(new Date()),
        timeIn: new Date().toTimeString().substring(0, 5),
        notes: ''
      });
    } catch (error) {
      console.error('Error adding attendance:', error);
      toast({
        title: "Error",
        description: "There was a problem adding the attendance record",
        variant: "destructive"
      });
    }
  };
  
  const totalAttendance = attendanceRecords.length;
  
  // Calculate last 30 days attendance
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentAttendance = attendanceRecords.filter(
    record => new Date(record.date) >= thirtyDaysAgo
  ).length;
  
  // Find last attendance date
  const sortedAttendance = [...attendanceRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastAttendance = sortedAttendance.length > 0 ? sortedAttendance[0].date : 'Never';
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center">
        <Button variant="outline" size="icon" className="mr-4" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Member Details</h1>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="font-bold text-2xl text-blue-700">
                  {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{member.firstName} {member.lastName}</h2>
                <p className="text-gray-500">{member.membershipType}</p>
                <p className="text-gray-500">{member.email}</p>
                {member.phone && <p className="text-gray-500">{member.phone}</p>}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowQRCode(true)}>
                <QrCode className="mr-2 h-4 w-4" />
                Show QR Code
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttendance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAttendance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {lastAttendance === 'Never' 
                ? 'Never' 
                : new Date(lastAttendance).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attendance">Attendance History</TabsTrigger>
          <TabsTrigger value="details">Member Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex justify-between">
            <h3 className="text-lg font-medium">Attendance Records</h3>
            <Button size="sm" onClick={() => setShowAddAttendanceDialog(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Add Attendance
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {attendanceRecords.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {sortedAttendance.map((record) => (
                    <div key={record.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          Check-in time: {record.timeIn}
                        </div>
                        {record.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            Notes: {record.notes}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this attendance record?")) {
                            db.deleteAttendanceRecord(record.id);
                            toast({
                              title: "Record Deleted",
                              description: "Attendance record has been removed",
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CalendarCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No attendance records</h3>
                  <p className="text-gray-500 mb-4">This member hasn't checked in yet</p>
                  <Button onClick={() => setShowAddAttendanceDialog(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Add First Check-in
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
              <CardDescription>
                Detailed information about this member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                  <p>{member.firstName} {member.lastName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                  <p>{member.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                  <p>{member.phone || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Membership Type</h3>
                  <p>{member.membershipType}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
                  <p>{new Date(member.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member QR Code</DialogTitle>
            <DialogDescription>
              Scan this code to check in {member.firstName} {member.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              {/* This is a dummy QR code for demo purposes */}
              <div className="w-56 h-56 bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto text-gray-700 mb-2" />
                  <p className="text-xs text-gray-500 max-w-[200px] break-all">
                    {member.qrCode}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQRCode(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update member information
            </DialogDescription>
          </DialogHeader>
          {editedMember && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editedMember.firstName}
                    onChange={(e) => setEditedMember({...editedMember, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editedMember.lastName}
                    onChange={(e) => setEditedMember({...editedMember, lastName: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editedMember.email}
                  onChange={(e) => setEditedMember({...editedMember, email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editedMember.phone}
                  onChange={(e) => setEditedMember({...editedMember, phone: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-membershipType">Membership Type</Label>
                <Input
                  id="edit-membershipType"
                  value={editedMember.membershipType}
                  onChange={(e) => setEditedMember({...editedMember, membershipType: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMember}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Member Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {member.firstName} {member.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMember}>
              Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Attendance Dialog */}
      <Dialog open={showAddAttendanceDialog} onOpenChange={setShowAddAttendanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attendance</DialogTitle>
            <DialogDescription>
              Add an attendance record for {member.firstName} {member.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="attendance-date">Date</Label>
              <Input
                id="attendance-date"
                type="date"
                value={newAttendance.date}
                onChange={(e) => setNewAttendance({...newAttendance, date: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="attendance-time">Time</Label>
              <Input
                id="attendance-time"
                type="time"
                value={newAttendance.timeIn}
                onChange={(e) => setNewAttendance({...newAttendance, timeIn: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="attendance-notes">Notes (Optional)</Label>
              <Input
                id="attendance-notes"
                value={newAttendance.notes}
                onChange={(e) => setNewAttendance({...newAttendance, notes: e.target.value})}
                placeholder="Optional notes about this attendance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAttendanceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAttendance}>Add Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberDetailPage;
