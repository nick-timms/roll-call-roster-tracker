
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from 'react-qr-scanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { QrCode } from 'lucide-react';

const ScanPage: React.FC = () => {
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (scanResult) {
      // Basic validation to check if the scan result is a valid UUID
      const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(scanResult);
      if (isValidUUID) {
        navigate(`/members/${scanResult}`);
      } else {
        toast({
          title: "Invalid QR Code",
          description: "The scanned QR code does not contain a valid member ID.",
          variant: "destructive"
        });
        setScanResult(null); // Reset scan result to allow rescanning
      }
    }
  }, [scanResult, navigate, toast]);

  const handleError = (error: any) => {
    console.error(error);
    toast({
      title: "Error",
      description: "There was an error scanning the QR code.",
      variant: "destructive"
    });
    setScanning(false);
  };

  const handleScan = (data: any) => {
    if (data) {
      setScanResult(data.text);
      setScanning(false);
    }
  };

  const startScanning = () => {
    setScanning(true);
    setScanResult(null); // Clear previous scan result
  };

  const stopScanning = () => {
    setScanning(false);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-zinc-900">Scan QR Code</h1>
      </div>

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <CardTitle>QR Code Scanner</CardTitle>
          </div>
          <CardDescription>
            Scan a member's QR code to view their details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scanning ? (
            <>
              <QrScanner
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: '100%' }}
              />
              <Button onClick={stopScanning} className="w-full mt-4 bg-red-500 hover:bg-red-700 text-white">
                Stop Scanning
              </Button>
            </>
          ) : (
            <Button onClick={startScanning} className="w-full bg-primary hover:bg-primary/90 text-white">
              Start Scanning
            </Button>
          )}

          {scanResult && (
            <div className="mt-4">
              <p>Scan Result: {scanResult}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanPage;
