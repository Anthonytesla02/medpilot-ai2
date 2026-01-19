import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyPayment } = useSubscription();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    
    if (!reference) {
      setStatus('failed');
      setMessage('No payment reference found');
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyPayment(reference);
        
        if (result.success) {
          setStatus('success');
          setMessage('Your subscription is now active!');
        } else {
          setStatus('failed');
          setMessage(result.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('failed');
        setMessage('Failed to verify payment. Please contact support.');
      }
    };

    verify();
  }, [searchParams, verifyPayment]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-6">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Verifying Payment</h2>
                <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-green-600">Payment Successful!</h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
              <Button onClick={() => navigate('/chat')} className="w-full">
                Start Using MediGuide AI
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-red-600">Payment Failed</h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/profile')} className="flex-1">
                  Go to Profile
                </Button>
                <Button onClick={() => navigate('/chat')} className="flex-1">
                  Try Again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
