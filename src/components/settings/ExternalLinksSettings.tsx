
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, PlusCircle, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { PlatformLink } from './PlatformLink';
import { cn } from '@/lib/utils';
import { ExternalLinkWithMeta } from '@/hooks/useExternalLinks';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface ExternalLinksSettingsProps {
  externalLinks: ExternalLinkWithMeta[];
  onExternalLinkChange: (index: number, key: string, value: string) => void;
  /**
   * O negócio que a ligação oficial ao Google escolheu, quando existe.
   *
   * Com ele, o campo do Google deixa de ser um pedido e passa a ser uma
   * confirmação: o Binno já sabe para onde mandar o cliente, porque o
   * `place_id` veio do próprio Google. Colar continua possível para quem
   * prefere um endereço curto, e o que estiver colado continua a mandar —
   * é `get_public_qr_business` que decide, e ela prefere o colado.
   */
  negocioOficial?: { titulo: string; placeId: string } | null;
  /** Chamado quando o campo perde o foco — é aí que se lê o Place ID. */
  onExternalLinkCommit?: (index: number) => void;
  onDeleteExternalLink: (index: number) => void;
  onAddExternalLink: (link: PlatformLink) => void;
  onSaveExternalLinks: () => void;
  onRefreshPlaceData?: (index: number) => void;
  isLoading?: boolean;
  isValidating?: boolean;
  error?: string | null;
  refreshLinks?: () => void;
}

const ExternalLinksSettings: React.FC<ExternalLinksSettingsProps> = ({
  externalLinks,
  onExternalLinkChange,
  negocioOficial = null,
  onExternalLinkCommit,
  onDeleteExternalLink,
  onAddExternalLink,
  onSaveExternalLinks,
  onRefreshPlaceData,
  isLoading = false,
  isValidating = false,
  error = null,
  refreshLinks
}) => {
  const { t } = useOwnerTranslation();
  const [newLink, setNewLink] = useState<PlatformLink>({ platform: '', url: '' });

  const handleAddLink = () => {
    if (newLink.platform && newLink.url) {
      onAddExternalLink(newLink);
      setNewLink({ platform: '', url: '' });
    }
  };

  const renderValidationStatus = (link: ExternalLinkWithMeta) => {
    if (link.platform !== 'Google Reviews') return null;
    
    if (link.validation_status === 'valid') {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircle className="h-4 w-4 mr-1" />
          <span className="text-xs">
            {link.place_id
              ? t('settings.links.verified', { name: link.business_name })
              : (link.business_name || t('settings.links.savedNoPlaceId'))}
          </span>
        </div>
      );
    } else if (link.validation_status === 'invalid') {
      return (
        <div className="flex items-center text-amber-600">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span className="text-xs">{link.error_message || t('settings.links.notVerified')}</span>
        </div>
      );
    } else if (link.validation_status === 'pending' && link.place_id) {
      return (
        <div className="flex items-center text-blue-600">
          <RefreshCw className={cn("h-4 w-4 mr-1", isValidating && "animate-spin")} />
          <span className="text-xs">
            {isValidating
              ? t('settings.links.verifying')
              : t('settings.links.placeIdDetected')}
          </span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t('settings.links.title')}</CardTitle>
            <CardDescription>{t('settings.links.desc')}</CardDescription>
          </div>
          {refreshLinks && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshLinks}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              {t('settings.links.refresh')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          {externalLinks.map((link, index) => (
            <div key={index} className="flex items-center justify-between border p-3 rounded-md">
              <div className="flex flex-col gap-1 flex-grow pr-2">
                <div className="font-medium">{link.platform}</div>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => onExternalLinkChange(index, 'url', e.target.value)}
                    onBlur={() => onExternalLinkCommit?.(index)}
                    className="w-full text-sm p-1 border rounded"
                    placeholder="https://"
                  />
                  {link.url && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                
                {renderValidationStatus(link)}

                {/*
                  DUAS FRASES, porque sao duas situacoes. Sem ligacao oficial, o
                  link colado e a UNICA forma de o Binno saber para onde mandar
                  o cliente, e a dica explica como o encontrar. Com ligacao, o
                  Binno ja sabe: pedir outra vez e pedir o que se tem.
                */}
                {link.platform === 'Google Reviews' && !negocioOficial && (
                  <div className="text-xs text-gray-500 mt-1">{t('settings.links.googleHint')}</div>
                )}

                {link.platform === 'Google Reviews' && negocioOficial && (
                  <div className="mt-1 text-xs leading-5 text-emerald-800">
                    {t('settings.links.vemDaLigacao', { negocio: negocioOficial.titulo })}
                    {!link.url?.trim() && ` ${t('settings.links.colarEOpcional')}`}
                  </div>
                )}

                {link.platform === 'Google Reviews' && link.place_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    <span>{t('settings.links.placeId')}: {link.place_id}</span>
                    {onRefreshPlaceData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 p-1 ml-1"
                        onClick={() => onRefreshPlaceData(index)}
                        disabled={isValidating}
                      >
                        <RefreshCw className={cn("h-3 w-3", isValidating && "animate-spin")} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDeleteExternalLink(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">{t('settings.links.addTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">{t('settings.links.platformLabel')}</Label>
              <Input
                id="platform"
                placeholder={t('settings.links.platformPlaceholder')}
                value={newLink.platform}
                onChange={(e) => setNewLink({...newLink, platform: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">{t('settings.links.urlLabel')}</Label>
              <Input
                id="url"
                placeholder="https://..."
                value={newLink.url}
                onChange={(e) => setNewLink({...newLink, url: e.target.value})}
              />
            </div>
          </div>
          <Button
            onClick={handleAddLink}
            className="mt-4"
            variant="outline"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {t('settings.links.addBtn')}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSaveExternalLinks} disabled={isLoading}>
          {isLoading ? t('settings.links.saving') : t('settings.links.save')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ExternalLinksSettings;
