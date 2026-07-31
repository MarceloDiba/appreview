
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLink } from '@/components/settings/PlatformLink';
import { toast } from 'sonner';
import { extractPlaceIdFromUrl, isGoogleReviewUrl, isValidPlaceId } from '@/utils/googlePlaceUtils';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

export type ValidationStatus = 'pending' | 'valid' | 'invalid';

export interface ExternalLinkWithMeta extends PlatformLink {
  validation_status?: ValidationStatus;
  business_name?: string;
  error_message?: string;
  place_id?: string;
}

export const useExternalLinks = (userId: string | undefined) => {
  const { t } = useOwnerTranslation();
  const [externalLinks, setExternalLinks] = useState<ExternalLinkWithMeta[]>([
    { platform: 'Google Reviews', url: '', place_id: '', validation_status: 'pending' },
    { platform: 'TripAdvisor', url: '', validation_status: 'pending' },
    { platform: 'Instagram', url: '', validation_status: 'pending' },
    { platform: 'Facebook', url: '', validation_status: 'pending' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * O utilizador já mexeu nestes campos nesta sessão?
   *
   * Isto existe por causa de um bug que dava para ver e não dava para explicar:
   * abrir as definições, começar imediatamente a colar o link do Google, e o
   * texto desaparecer sozinho a meio. A leitura da base de dados arrancava ao
   * montar o ecrã e, quando chegava — um ou dois segundos depois, mais em rede
   * fraca —, substituía tudo o que estivesse escrito pelo que estava gravado,
   * que na primeira configuração é vazio.
   *
   * A partir do primeiro toque, o que está no ecrã manda. Só uma actualização
   * pedida explicitamente pelo botão volta a trazer o que está no servidor.
   */
  const hasLocalEdits = useRef(false);

  const loadExternalLinks = useCallback(async (force = false) => {
    if (!userId) return;
    if (hasLocalEdits.current && !force) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: links, error } = await supabase
        .from('platform_links')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        throw new Error(error.message);
      }
      
      if (links && links.length > 0) {
        const formattedLinks = links.map(link => {
          const extra = link as typeof link & { place_id?: string | null; business_name?: string | null };
          const isLegacyPlaceholder =
            extra.business_name === 'Mock Place (validação ignorada)' ||
            extra.business_name === 'Link de avaliação salvo. A importação automática exige Place ID.';
          const businessName = isLegacyPlaceholder ? undefined : extra.business_name || undefined;

          return {
            platform: link.display_name || link.platform,
            url: link.url,
            place_id: extra.place_id || '',
            validation_status: extra.place_id
              ? businessName
                ? ('valid' as ValidationStatus)
                : ('pending' as ValidationStatus)
              : link.url
                ? ('valid' as ValidationStatus)
                : ('pending' as ValidationStatus),
            business_name: businessName,
          };
        });
        
        setExternalLinks(formattedLinks);
        hasLocalEdits.current = false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading external links';
      console.error('Error loading external links:', errorMessage);
      setError(t('settings.links.loadError'));
      toast.error(t('settings.links.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  const validateGooglePlaceId = async (placeId: string, index: number) => {
    if (!placeId || !userId || !isValidPlaceId(placeId)) {
      setExternalLinks((prev) => {
        const updatedLinks = [...prev];
        updatedLinks[index] = {
          ...updatedLinks[index],
          validation_status: 'invalid' as ValidationStatus,
          error_message: t('settings.links.invalidPlaceId'),
        };
        return updatedLinks;
      });
      return null;
    }

    setIsValidating(true);

    // A validação externa usa uma API potencialmente paga. Sem autorização,
    // registamos apenas que o Place ID foi detectado, sem inventar um negócio.
    setExternalLinks((prev) => {
      const updatedLinks = [...prev];
      updatedLinks[index] = {
        ...updatedLinks[index],
        validation_status: 'pending' as ValidationStatus,
        error_message: undefined,
        business_name: undefined,
      };
      return updatedLinks;
    });
    setIsValidating(false);
    return { place_info: null };
  };

  const processGooglePlaceId = async (url: string, index: number): Promise<string | null> => {
    try {
      const placeId = extractPlaceIdFromUrl(url);

      if (!placeId && isGoogleReviewUrl(url)) {
        setExternalLinks((prev) => {
          const updatedLinks = [...prev];
          updatedLinks[index] = {
            ...updatedLinks[index],
            place_id: '',
            validation_status: 'valid' as ValidationStatus,
            business_name: undefined,
            error_message: undefined,
          };
          return updatedLinks;
        });

        toast.success(t('settings.links.reviewLinkSaved'));
        return null;
      }
      
      if (!placeId) {
        toast.error(t('settings.links.extractPlaceIdError'));
        return null;
      }
      
      if (!isValidPlaceId(placeId)) {
        toast.warning(t('settings.links.placeIdFormatWarning'));
      } else {
        toast.success(t('settings.links.placeIdDetectedToast'));
      }
      
      setExternalLinks((prev) => {
        const updatedLinks = [...prev];
        updatedLinks[index] = {
          ...updatedLinks[index],
          place_id: placeId,
          validation_status: 'pending' as ValidationStatus,
        };
        return updatedLinks;
      });
      
      // Validate the place ID in the background
      validateGooglePlaceId(placeId, index);
      
      return placeId;
    } catch (error) {
      console.error('Error extracting or processing Place ID:', error);
      toast.error(t('settings.links.processPlaceIdError'));
      return null;
    }
  };

  const handleExternalLinkChange = (index: number, key: string, value: string) => {
    hasLocalEdits.current = true;
    setExternalLinks((prev) => {
      const updatedLinks = [...prev];
      updatedLinks[index] = { ...updatedLinks[index], [key]: value };
      return updatedLinks;
    });
  };

  /**
   * A leitura do Place ID acontece quando o campo perde o foco, não a cada
   * tecla. Antes corria em cada carácter escrito: um endereço colado letra a
   * letra disparava dezenas de validações e uma chuva de avisos a dizer que o
   * link estava errado, quando o dono ainda o estava a escrever.
   */
  const handleExternalLinkCommit = (index: number) => {
    const link = externalLinks[index];
    if (!link || link.platform !== 'Google Reviews') return;
    if (!link.url?.trim()) return;

    processGooglePlaceId(link.url.trim(), index);
  };

  const handleAddExternalLink = (newLink: PlatformLink) => {
    hasLocalEdits.current = true;
    if (!newLink.platform || !newLink.url) {
      toast.error(t('settings.links.fillAllFields'));
      return;
    }
    
    const linkToAdd: ExternalLinkWithMeta = { 
      ...newLink,
      validation_status: 'pending'
    };
    
    // If this is a Google URL, try to extract the place_id
    if (linkToAdd.platform === 'Google Reviews') {
      processGooglePlaceId(linkToAdd.url, externalLinks.length);
    }
    
    setExternalLinks([...externalLinks, linkToAdd]);
    toast.success(t('settings.links.linkAdded'));
  };
  
  const handleDeleteExternalLink = (index: number) => {
    hasLocalEdits.current = true;
    const updatedLinks = [...externalLinks];
    updatedLinks.splice(index, 1);
    setExternalLinks(updatedLinks);
    toast.success(t('settings.links.linkRemoved'));
  };

  const validateExternalLink = async (index: number) => {
    const link = externalLinks[index];
    
    if (link.platform === 'Google Reviews' && link.url) {
      const placeId = await processGooglePlaceId(link.url, index);
      return placeId !== null;
    }
    
    return true; // For other platforms, no validation needed
  };

  const saveExternalLinks = async () => {
  if (!userId) {
    toast.error(t('settings.links.notAuthenticated'));
    return;
  }

  
  setIsLoading(true);
  setError(null);
  
  try {
    // Primeiro, apaga os links anteriores
    const { error: deleteError } = await supabase
      .from('platform_links')
      .delete()
      .eq('user_id', userId);
      
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    // Cria uma cópia local atualizada manualmente
    const updatedLinks = await Promise.all(
      externalLinks.map(async (link) => {
        if (
          link.platform.toLowerCase() === 'google reviews' &&
          link.url &&
          !link.place_id
        ) {
          const placeId = extractPlaceIdFromUrl(link.url);
          return {
            ...link,
            place_id: placeId || null,
            validation_status: placeId || isGoogleReviewUrl(link.url) ? 'valid' : 'invalid',
            business_name: placeId ? link.business_name : undefined
          };
        }
        return link;
      })
    );

    // Agora sim, monta os linksToInsert com base na versão correta
    const linksToInsert = updatedLinks
      .filter(link => link.url?.trim())
      .map(link => ({
        user_id: userId,
        platform: link.platform.toLowerCase(),
        url: link.url,
        display_name: link.platform,
        place_id: link.place_id || null,
        business_name: link.business_name || null,
      }));

    // Insere os novos links
    const { error: insertError } = await supabase
      .from('platform_links')
      .insert(linksToInsert);
      
    if (insertError) {
      throw new Error(insertError.message);
    }

    hasLocalEdits.current = false;
    toast.success(t('settings.links.linksSaved'));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error saving external links';
    console.error('Error saving external links:', errorMessage);
    setError(t('settings.links.saveError'));
    toast.error(t('settings.links.saveError'));
  } finally {
    setIsLoading(false);
  }
};


  const refreshGooglePlaceData = async (index: number) => {
    const link = externalLinks[index];
    if (link.platform !== 'Google Reviews' || !link.place_id) {
      toast.error(t('settings.links.noGooglePlaceId'));
      return;
    }
    
    await validateGooglePlaceId(link.place_id, index);
  };

  useEffect(() => {
    if (userId) {
      loadExternalLinks();
    }
  }, [userId, loadExternalLinks]);

  return {
    externalLinks,
    isLoading,
    isValidating,
    error,
    handleExternalLinkChange,
    handleExternalLinkCommit,
    handleAddExternalLink,
    handleDeleteExternalLink,
    validateExternalLink,
    saveExternalLinks,
    refreshGooglePlaceData,
    refreshLinks: () => loadExternalLinks(true)
  };
};
