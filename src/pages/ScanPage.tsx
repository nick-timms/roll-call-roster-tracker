
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/db';
import { decodeQRCode, formatDate, formatTime, generateId } from '@/lib/utils';
import { QrCode, User, Check, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const ScanPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [qrValue, setQrValue] = useState('');
  const [scannedMemberId, setScannedMemberId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  const scannedMember = scannedMemberId ? db.getMemberById(scannedMemberId) : null;
  
  const handleScanQR = () => {
    const memberId = decodeQRCode(qrValue);
    processQrResult(memberId);
  };

  const processQrResult = (memberId: string | null) => {
    if (!memberId) {
      toast({
        title: "Invalid QR Code",
        description: "The QR code is not recognized",
        variant: "destructive"
      });
      return;
    }
    
    const member = db.getMemberById(memberId);
    
    if (!member) {
      toast({
        title: "Member Not Found",
        description: "No member found with this QR code",
        variant: "destructive"
      });
      return;
    }
    
    setScannedMemberId(memberId);
    
    // Check if already checked in today
    const today = formatDate(new Date());
    const existingAttendance = db.getAttendanceRecords().find(
      record => record.memberId === memberId && record.date === today
    );
    
    if (existingAttendance) {
      toast({
        title: "Already Checked In",
        description: `${member.firstName} ${member.lastName} already checked in today at ${existingAttendance.timeIn}`,
      });
    }

    // Stop the camera if it was active
    if (cameraActive) {
      stopCamera();
    }
  };
  
  const handleCheckIn = () => {
    if (!scannedMemberId || !scannedMember) {
      toast({
        title: "No Member Selected",
        description: "Please scan a valid QR code first",
        variant: "destructive"
      });
      return;
    }
    
    const now = new Date();
    
    const attendanceRecord = {
      id: generateId(),
      memberId: scannedMemberId,
      date: formatDate(now),
      timeIn: formatTime(now),
      notes: notes || undefined
    };
    
    try {
      db.checkInMember(attendanceRecord);
      toast({
        title: "Check-in Successful",
        description: `${scannedMember.firstName} ${scannedMember.lastName} has been checked in`,
      });
      
      // Reset the form
      setQrValue('');
      setScannedMemberId(null);
      setNotes('');
    } catch (error) {
      console.error('Error checking in member:', error);
      toast({
        title: "Error",
        description: "There was a problem checking in the member",
        variant: "destructive"
      });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        scanQRFromCamera();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    }
  };

  const scanQRFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Only proceed if video is playing
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestRef.current = requestAnimationFrame(scanQRFromCamera);
      return;
    }
    
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // In a real application, we'd use a QR code scanning library like jsQR here
      // For this demo, we'll simulate finding a QR code after a few seconds
      setTimeout(() => {
        // Get all members
        const members = db.getMembers();
        if (members.length > 0) {
          // Pick a random member for demonstration purposes
          const randomMember = members[Math.floor(Math.random() * members.length)];
          processQrResult(randomMember.id);
        } else {
          toast({
            title: "No Members Found",
            description: "There are no members in the system to scan",
            variant: "destructive"
          });
          stopCamera();
        }
      }, 2000);
    } catch (error) {
      console.error('Error scanning QR code:', error);
    }
    
    requestRef.current = requestAnimationFrame(scanQRFromCamera);
  };
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold">Scan QR Code</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scan Member QR Code</CardTitle>
            <CardDescription>
              Scan a member's QR code to check them in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cameraActive ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <AspectRatio ratio={4/3} className="bg-muted">
                      <video 
                        ref={videoRef} 
                        className="h-full w-full object-cover"
                        playsInline
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-white/50 rounded-lg"></div>
                      </div>
                    </AspectRatio>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={stopCamera}
                  >
                    Stop Camera
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Use the device camera to scan a QR code or paste the code manually below.
                  </p>
                  
                  <Button 
                    className="w-full" 
                    onClick={startCamera}
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    Start Camera
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">or paste code</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      placeholder="Paste QR code here..."
                      value={qrValue}
                      onChange={(e) => setQrValue(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          {!cameraActive && (
            <CardFooter>
              <Button onClick={handleScanQR} disabled={!qrValue}>
                <QrCode className="mr-2 h-4 w-4" />
                Process QR Code
              </Button>
            </CardFooter>
          )}
        </Card>
        
        <Card className={scannedMemberId ? "border-green-200" : ""}>
          <CardHeader>
            <CardTitle>Check-in Details</CardTitle>
            <CardDescription>
              {scannedMember 
                ? `Check in ${scannedMember.firstName} ${scannedMember.lastName}`
                : "Scan a QR code to check in a member"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scannedMember ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">
                      {scannedMember.firstName} {scannedMember.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {scannedMember.membershipType}
                    </p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <label className="text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <Input
                    placeholder="Add any notes about this check-in..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    className="flex-1" 
                    onClick={handleCheckIn}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Check In
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/members/${scannedMember.id}`)}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <QrCode className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No Member Scanned
                </h3>
                <p className="text-gray-500 mb-4">
                  Scan a member's QR code to check them in
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScanPage;
