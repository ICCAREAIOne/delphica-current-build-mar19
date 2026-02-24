import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, CheckCircle2, XCircle, Edit3 } from 'lucide-react';

interface TemplateAnalyticsDashboardProps {
  templateId?: number;
}

export function TemplateAnalyticsDashboard({ templateId }: TemplateAnalyticsDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get all templates analytics
  const { data: allAnalytics, isLoading: loadingAll } = (trpc.templates as any).getAllAnalytics.useQuery(
    undefined,
    { enabled: isOpen && !templateId }
  );

  // Get single template analytics
  const { data: singleAnalytics, isLoading: loadingSingle } = (trpc.templates as any).getAnalytics.useQuery(
    { templateId },
    { enabled: isOpen && !!templateId }
  );

  const isLoading = templateId ? loadingSingle : loadingAll;
  const analytics = templateId ? (singleAnalytics ? [singleAnalytics] : []) : (allAnalytics || []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <BarChart3 className="h-4 w-4" />
        Analytics
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {templateId ? 'Template Analytics' : 'All Templates Analytics'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[700px] pr-4">
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                Loading analytics...
              </div>
            )}

            {!isLoading && analytics.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>No analytics data available yet</p>
                <p className="text-sm mt-2">
                  Analytics will appear once templates are used with patients
                </p>
              </div>
            )}

            {!isLoading && analytics.length > 0 && (
              <div className="space-y-6">
                {analytics.map((item: any) => (
                  <Card key={item.templateId || item.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {item.templateName || `Template #${item.templateId}`}
                          </CardTitle>
                          {item.templateCategory && (
                            <Badge variant="secondary" className="mt-2">
                              {item.templateCategory}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-lg px-4 py-2">
                          {item.totalUsages} uses
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Usages */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{item.totalUsages}</div>
                            <div className="text-sm text-muted-foreground">Total Uses</div>
                          </div>
                        </div>

                        {/* Customization Rate */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                            <Edit3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold">
                              {item.customizedUsages || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Customized ({item.customizationRate?.toFixed(0) || 0}%)
                            </div>
                          </div>
                        </div>

                        {/* Successful Outcomes */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {item.successfulOutcomes || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Successful</div>
                          </div>
                        </div>

                        {/* Unsuccessful Outcomes */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {item.unsuccessfulOutcomes || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Unsuccessful</div>
                          </div>
                        </div>
                      </div>

                      {/* Success Rate Bar */}
                      {item.successRate !== null && item.successRate !== undefined && (
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Success Rate</span>
                            <span className="text-sm font-bold">{item.successRate.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                              style={{ width: `${item.successRate}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Additional Metrics */}
                      <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Recorded Outcomes:</span>{' '}
                          <span className="font-medium">{item.recordedOutcomes || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Customizations:</span>{' '}
                          <span className="font-medium">
                            {item.avgCustomizationCount?.toFixed(1) || '0.0'} fields
                          </span>
                        </div>
                      </div>

                      {/* Insights */}
                      {item.successRate !== null && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 mt-0.5 text-primary" />
                            <div className="text-sm">
                              {item.successRate >= 80 ? (
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  High-performing template
                                </span>
                              ) : item.successRate >= 60 ? (
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                  Moderate performance
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                  Needs improvement
                                </span>
                              )}
                              {' - '}
                              {item.customizationRate > 70 ? (
                                <span>Frequently customized, consider updating base template</span>
                              ) : item.customizationRate < 30 ? (
                                <span>Rarely customized, well-suited for standard cases</span>
                              ) : (
                                <span>Moderate customization rate</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
