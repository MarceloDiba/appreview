
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const NotificationSettings: React.FC = () => {
  const { t } = useOwnerTranslation();
  const handleSaveNotifications = () => {
    toast.success(t('settings.notif.saved'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.notif.title')}</CardTitle>
        <CardDescription>{t('settings.notif.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('settings.notif.newReviews')}</Label>
            <p className="text-sm text-gray-500">{t('settings.notif.newReviewsDesc')}</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('settings.notif.negative')}</Label>
            <p className="text-sm text-gray-500">{t('settings.notif.negativeDesc')}</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('settings.notif.weekly')}</Label>
            <p className="text-sm text-gray-500">{t('settings.notif.weeklyDesc')}</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('settings.notif.email')}</Label>
            <p className="text-sm text-gray-500">{t('settings.notif.emailDesc')}</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('settings.notif.push')}</Label>
            <p className="text-sm text-gray-500">{t('settings.notif.pushDesc')}</p>
          </div>
          <Switch />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveNotifications} className="ml-auto">
          {t('settings.notif.save')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationSettings;
