
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/lib/db';
import { Users, Calendar, ArrowRight, Filter, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/utils';

const DashboardPage: React.FC = () => {
  const members = db.getMembers();
  const allAttendance = db.getAttendanceRecords();
  
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Get today's date in YYYY-MM-DD format
  const today = formatDate(new Date());
  
  // Filter attendance records based on the selected period
  const filteredAttendance = allAttendance.filter(record => {
    if (selectedPeriod === 'today') {
      return record.date === today;
    } else if (selectedPeriod === 'week') {
      const recordDate = new Date(record.date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return recordDate >= sevenDaysAgo;
    } else {
      const recordDate = new Date(record.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return recordDate >= thirtyDaysAgo;
    }
  });
  
  // Calculate attendance statistics
  const todayAttendance = allAttendance.filter(record => record.date === today).length;
  const uniqueMemberAttendance = Array.from(
    new Set(filteredAttendance.map(record => record.memberId))
  ).length;
  
  // Attendance visualization data
  const generateAttendanceData = () => {
    const data: { date: string; count: number }[] = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);
      
      const count = allAttendance.filter(record => record.date === dateStr).length;
      data.push({ date: dateStr, count });
    }
    
    return data;
  };
  
  const attendanceData = generateAttendanceData();
  
  // Group by month for weekly view
  const maxPerDay = Math.max(...attendanceData.map(d => d.count));
  
  // Toggle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  // Check if all members are selected
  const isAllMembersSelected = members.length > 0 && selectedMembers.length === members.length;

  // Toggle all members selection
  const toggleAllMembers = () => {
    if (isAllMembersSelected) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(m => m.id));
    }
  };
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/scan">
              <Calendar className="mr-2 h-4 w-4" />
              Check-in Member
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="attio-stat">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              All registered members in the system
            </p>
          </CardContent>
        </Card>
        <Card className="attio-stat">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAttendance}</div>
            <p className="text-xs text-muted-foreground">
              Members who checked in today
            </p>
          </CardContent>
        </Card>
        <Card className="attio-stat">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueMemberAttendance}</div>
            <p className="text-xs text-muted-foreground">
              Members with recent attendance
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="attio-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Members</CardTitle>
            <CardDescription>Manage your gym members</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-48 lg:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search members..." 
                className="h-9 w-full rounded-md border border-input bg-background px-8 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button size="sm" asChild>
              <Link to="/members/new">
                <Plus className="h-4 w-4 mr-2" />
                New Member
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox 
                    checked={isAllMembersSelected}
                    onCheckedChange={toggleAllMembers}
                    aria-label="Select all members"
                  />
                </TableHead>
                <TableHead className="font-medium">Member</TableHead>
                <TableHead className="font-medium">Belt</TableHead>
                <TableHead className="font-medium">Email</TableHead>
                <TableHead className="font-medium">Last Check-in</TableHead>
                <TableHead className="font-medium">Total Check-ins</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.slice(0, 5).map((member) => {
                const memberAttendance = allAttendance.filter(a => a.memberId === member.id);
                const lastAttendance = memberAttendance.length > 0 
                  ? memberAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                  : null;
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMemberSelection(member.id)}
                        aria-label={`Select ${member.firstName} ${member.lastName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {member.firstName.charAt(0) + member.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{`${member.firstName} ${member.lastName}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.phoneNumber || 'No phone'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        member.belt === 'white' ? 'bg-zinc-100 text-zinc-800' :
                        member.belt === 'blue' ? 'bg-blue-100 text-blue-800' :
                        member.belt === 'purple' ? 'bg-purple-100 text-purple-800' :
                        member.belt === 'brown' ? 'bg-amber-100 text-amber-800' :
                        member.belt === 'black' ? 'bg-black text-white' : 'bg-zinc-100'
                      }`}>
                        {member.belt.charAt(0).toUpperCase() + member.belt.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.email || 'No email'}
                    </TableCell>
                    <TableCell>
                      {lastAttendance ? lastAttendance.date : 'Never'}
                    </TableCell>
                    <TableCell>
                      {memberAttendance.length}
                    </TableCell>
                    <TableCell>
                      <Link to={`/members/${member.id}`}>
                        <Button variant="ghost" size="icon">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {members.length > 5 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" asChild>
                <Link to="/members">View All Members</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="attio-card">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>
            GitHub-style visualization of attendance over time
          </CardDescription>
          <div className="flex space-x-2 mt-2">
            <Button
              variant={selectedPeriod === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('today')}
            >
              Today
            </Button>
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('week')}
            >
              Last 7 days
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('month')}
            >
              Last 30 days
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {attendanceData.slice(-Math.min(365, 200)).map((day, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: day.count === 0 
                      ? '#ebedf0' 
                      : day.count < maxPerDay / 3 
                        ? '#c6e48b' 
                        : day.count < maxPerDay * 2/3 
                          ? '#7bc96f' 
                          : '#239a3b',
                    cursor: 'pointer',
                  }}
                  title={`${day.date}: ${day.count} check-ins`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-gray-500">Less</div>
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-[#ebedf0] rounded-sm"></div>
                <div className="w-3 h-3 bg-[#c6e48b] rounded-sm"></div>
                <div className="w-3 h-3 bg-[#7bc96f] rounded-sm"></div>
                <div className="w-3 h-3 bg-[#239a3b] rounded-sm"></div>
              </div>
              <div className="text-xs text-gray-500">More</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="attio-card">
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
          <CardDescription>
            Members who recently checked in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAttendance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium">Member</TableHead>
                    <TableHead className="font-medium">Check-in Time</TableHead>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((record) => {
                      const member = db.getMemberById(record.memberId);
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                <span className="font-medium text-blue-700">
                                  {member ? member.firstName.charAt(0) + member.lastName.charAt(0) : '??'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {member ? `${member.firstName} ${member.lastName}` : 'Unknown Member'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {member?.email || 'No email'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{record.timeIn}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            {member && (
                              <Link to={`/members/${record.memberId}`}>
                                <Button variant="ghost" size="icon">
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-4 text-center text-gray-500">
                No recent check-ins found
              </div>
            )}
            
            {filteredAttendance.length > 5 && (
              <div className="text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/attendance">View All Check-ins</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
