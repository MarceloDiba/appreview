
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { angry, meh, smile } from 'lucide-react';

interface ReviewMetrics {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  googleAverage?: number;
  tripAdvisorAverage?: number;
}

interface BusinessMetricsProps {
  metrics: ReviewMetrics;
}

const BusinessMetrics = ({ metrics }: BusinessMetricsProps) => {
  const positivePercentage = Math.round((metrics.positive / metrics.total) * 100) || 0;
  const neutralPercentage = Math.round((metrics.neutral / metrics.total) * 100) || 0;
  const negativePercentage = Math.round((metrics.negative / metrics.total) * 100) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Total de Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total}</div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            <div className="flex items-center">
              <span className="text-review-positive mr-2">
                <smile className="h-4 w-4"/>
              </span>
              Positivas
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.positive}</div>
          <div className="mt-2">
            <Progress value={positivePercentage} className="h-2 bg-gray-100" indicatorClassName="bg-review-positive" />
            <div className="text-xs text-gray-500 mt-1">{positivePercentage}%</div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            <div className="flex items-center">
              <span className="text-review-neutral mr-2">
                <meh className="h-4 w-4"/>
              </span>
              Neutras
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.neutral}</div>
          <div className="mt-2">
            <Progress value={neutralPercentage} className="h-2 bg-gray-100" indicatorClassName="bg-review-neutral" />
            <div className="text-xs text-gray-500 mt-1">{neutralPercentage}%</div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            <div className="flex items-center">
              <span className="text-review-negative mr-2">
                <angry className="h-4 w-4"/>
              </span>
              Negativas
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.negative}</div>
          <div className="mt-2">
            <Progress value={negativePercentage} className="h-2 bg-gray-100" indicatorClassName="bg-review-negative" />
            <div className="text-xs text-gray-500 mt-1">{negativePercentage}%</div>
          </div>
        </CardContent>
      </Card>

      {metrics.googleAverage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Google Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">{metrics.googleAverage.toFixed(1)}</div>
              <div className="text-yellow-500 ml-2 flex">
                {'★'.repeat(Math.round(metrics.googleAverage))}
                {'☆'.repeat(5 - Math.round(metrics.googleAverage))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.tripAdvisorAverage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">TripAdvisor Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">{metrics.tripAdvisorAverage.toFixed(1)}</div>
              <div className="text-yellow-500 ml-2 flex">
                {'★'.repeat(Math.round(metrics.tripAdvisorAverage))}
                {'☆'.repeat(5 - Math.round(metrics.tripAdvisorAverage))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BusinessMetrics;
