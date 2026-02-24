import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Minus, Edit2, AlertTriangle } from 'lucide-react';

interface AuditEntry {
  id: number;
  protocolDeliveryId: number;
  physicianId: number;
  customizedProtocol: {
    title: string;
    diagnosis: string;
    duration: string;
  };
  changesSummary?: Array<{
    field: string;
    changeType: 'added' | 'removed' | 'modified';
    oldValue?: string;
    newValue?: string;
    reason?: string;
  }> | null;
  allergenConflictsResolved?: string[] | null;
  customizationReason?: string | null;
  createdAt: Date;
}

interface ProtocolAuditTrailProps {
  auditEntries: AuditEntry[];
}

export function ProtocolAuditTrail({ auditEntries }: ProtocolAuditTrailProps) {
  if (!auditEntries || auditEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Customization History
          </CardTitle>
          <CardDescription>
            Track all modifications made to care protocols before sending
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No customization history available. Protocols sent without modifications will not appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <Edit2 className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getChangeBadgeVariant = (changeType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (changeType) {
      case 'added':
        return 'default';
      case 'removed':
        return 'destructive';
      case 'modified':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Customization History
        </CardTitle>
        <CardDescription>
          Detailed audit trail of all protocol modifications for compliance and quality review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {auditEntries.map((entry) => (
              <Card key={entry.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {entry.customizedProtocol.title}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {new Date(entry.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    {entry.allergenConflictsResolved && entry.allergenConflictsResolved.length > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Allergen Resolved
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Protocol Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Diagnosis:</span>{' '}
                      <span className="text-muted-foreground">{entry.customizedProtocol.diagnosis}</span>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>{' '}
                      <span className="text-muted-foreground">{entry.customizedProtocol.duration}</span>
                    </div>
                  </div>

                  {/* Changes Summary */}
                  {entry.changesSummary && entry.changesSummary.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Changes Made:</p>
                      <div className="space-y-1">
                        {entry.changesSummary.map((change, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/50"
                          >
                            {getChangeIcon(change.changeType)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={getChangeBadgeVariant(change.changeType)} className="text-xs">
                                  {change.changeType}
                                </Badge>
                                <span className="font-medium capitalize">{change.field}</span>
                              </div>
                              {change.oldValue && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  From: <span className="line-through">{change.oldValue}</span>
                                </p>
                              )}
                              {change.newValue && (
                                <p className="text-xs text-muted-foreground">
                                  To: <span className="font-medium">{change.newValue}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Allergen Conflicts Resolved */}
                  {entry.allergenConflictsResolved && entry.allergenConflictsResolved.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange-600">Allergen Conflicts Resolved:</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.allergenConflictsResolved.map((allergen, idx) => (
                          <Badge key={idx} variant="outline" className="text-orange-600 border-orange-600">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customization Reason */}
                  {entry.customizationReason && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Justification:</p>
                      <p className="text-sm text-muted-foreground italic bg-muted/30 p-2 rounded-md">
                        "{entry.customizationReason}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
