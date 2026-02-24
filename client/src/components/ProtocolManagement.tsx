import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Send, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProtocolManagementProps {
  userId: number;
  userName: string;
}

export function ProtocolManagement({ userId, userName }: ProtocolManagementProps) {
  const { toast } = useToast();
  const [sendingProtocolId, setSendingProtocolId] = useState<number | null>(null);

  // Get patient's care plans
  const { data: carePlans, isLoading: carePlansLoading } = trpc.patientPortal.getPatientCarePlans.useQuery({ patientId: userId });

  // Get protocol delivery history
  const { data: deliveries, refetch: refetchDeliveries } = trpc.protocol.getDeliveries.useQuery({ userId });

  // Send protocol mutation
  const sendProtocol = trpc.protocol.generateAndSend.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Protocol Sent',
          description: `Protocol has been successfully emailed to ${userName}`,
        });
        refetchDeliveries();
      } else {
        toast({
          title: 'Failed to Send Protocol',
          description: result.error || 'An error occurred while sending the protocol',
          variant: 'destructive',
        });
      }
      setSendingProtocolId(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setSendingProtocolId(null);
    },
  });

  const handleSendProtocol = (carePlanId: number) => {
    setSendingProtocolId(carePlanId);
    sendProtocol.mutate({ userId, carePlanId });
  };

  if (carePlansLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Protocol Management</CardTitle>
          <CardDescription>Loading care plans...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activePlans = carePlans?.filter(plan => plan.status === 'active') || [];

  return (
    <div className="space-y-6">
      {/* Active Care Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Active Care Plans
          </CardTitle>
          <CardDescription>
            Generate and send protocol PDFs to {userName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active care plans found for this patient.</p>
          ) : (
            <div className="space-y-4">
              {activePlans.map((plan: any) => {
                const isSending = sendingProtocolId === plan.id;
                const deliveryCount = deliveries?.filter(d => d.carePlanId === plan.id).length || 0;

                return (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{plan.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {new Date(plan.createdAt).toLocaleDateString()}
                      </p>
                      {deliveryCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Sent {deliveryCount} time{deliveryCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleSendProtocol(plan.id)}
                      disabled={isSending}
                      size="sm"
                    >
                      {isSending ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Protocol
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery History */}
      {deliveries && deliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery History</CardTitle>
            <CardDescription>
              Protocol delivery records for {userName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deliveries.slice(0, 10).map((delivery: any) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-sm">{delivery.protocolName}</h5>
                      <Badge
                        variant={delivery.deliveryType === 'enrollment' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {delivery.deliveryType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {delivery.sentAt
                        ? `Sent ${new Date(delivery.sentAt).toLocaleString()}`
                        : `Created ${new Date(delivery.createdAt).toLocaleString()}`}
                    </p>
                    {delivery.errorMessage && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {delivery.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {delivery.pdfGenerated && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="mr-1 h-3 w-3" />
                        PDF
                      </Badge>
                    )}
                    {delivery.emailSent ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
