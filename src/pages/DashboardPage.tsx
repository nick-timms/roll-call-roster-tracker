
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/db';
import { Users, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/utils';

const DashboardPage: React.FC = () => {
  const members = db.getMembers();
  const allAttendance = db.getAttendanceRecords();
  
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  
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
  
  // Attendance visualization data (last 365 days)
  const generateAttendanceData = () => {
    const data: { date: string; count: number }[] = [];
    const today = new Date();
    
    // Generate data for the last 365 days
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
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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
        <Card>
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
        <Card>
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
        <Card>
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
      
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attendance">Attendance Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent Check-ins</TabsTrigger>
        </TabsList>
        
        <TabsContent value="attendance">
          <Card>
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
        </TabsContent>
        
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>
                Members who recently checked in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAttendance.length > 0 ? (
                  <div className="space-y-2">
                    {filteredAttendance
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((record) => {
                        const member = db.getMemberById(record.memberId);
                        return (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span className="font-medium text-blue-700">
                                  {member ? member.firstName.charAt(0) + member.lastName.charAt(0) : '??'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {member ? `${member.firstName} ${member.lastName}` : 'Unknown Member'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(record.date).toLocaleDateString()} at {record.timeIn}
                                </p>
                              </div>
                            </div>
                            <div>
                              <Link to={`/members/${record.memberId}`}>
                                <Button variant="ghost" size="icon">
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                  </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;
