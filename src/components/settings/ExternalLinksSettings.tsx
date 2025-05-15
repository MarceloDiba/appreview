
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, PlusCircle, Trash2, RefreshCw } from 'lucide-react';
import { PlatformLink } from './PlatformLink';
import { cn } from '@/lib/utils';

interface ExternalLinksSettingsProps {
  externalLinks: PlatformLink[];
  onExternalLinkChange: (index: number, key: string, value: string) => void;
  onDeleteExternalLink: (index: number) => void;
  onAddExternalLink: (link: PlatformLink) => void;
  onSaveExternalLinks: () => void;
  isLoading?: boolean;
  error?: string | null;
  refreshLinks?: () => void;
}

const ExternalLinksSettings: React.FC<ExternalLinksSettingsProps> = ({
  externalLinks,
  onExternalLinkChange,
  onDeleteExternalLink,
  onAddExternalLink,
  onSaveExternalLinks,
  isLoading = false,
  error = null,
  refreshLinks
}) => {
  const [newLink, setNewLink] = useState<PlatformLink>({ platform: '', url: '' });

  const handleAddLink = () => {
    if (newLink.platform && newLink.url) {
      onAddExternalLink(newLink);
      setNewLink({ platform: '', url: '' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Links Externos</CardTitle>
            <CardDescription>
              Gerencie links para suas plataformas externas de avaliação e redes sociais.
            </CardDescription>
          </div>
          {refreshLinks && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshLinks}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Atualizar
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
                    className="w-full text-sm p-1 border rounded"
                    placeholder="https://"
                  />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {link.platform === 'Google Reviews' && (
                  <div className="text-xs text-gray-500">
                    {link.place_id ? (
                      <span className="text-green-600">Place ID: {link.place_id}</span>
                    ) : (
                      <span className="text-amber-600">Nenhum Place ID detectado. Verifique o URL.</span>
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
          <h3 className="text-sm font-medium mb-3">Adicionar Novo Link</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Plataforma</Label>
              <Input
                id="platform"
                placeholder="Ex: WhatsApp, Instagram, etc."
                value={newLink.platform}
                onChange={(e) => setNewLink({...newLink, platform: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
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
            Adicionar Link
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSaveExternalLinks} disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Links'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ExternalLinksSettings;
