
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLink } from '@/components/settings/PlatformLink';
import { toast } from 'sonner';
import { extractPlaceIdFromUrl, isValidPlaceId } from '@/utils/googlePlaceUtils';

export type ValidationStatus = 'pending' | 'valid' | 'invalid';

export interface ExternalLinkWithMeta extends PlatformLink {
  validation_status?: ValidationStatus;
  business_name?: string;
  error_message?: string;
  place_id?: string;
}

export const useExternalLinks = (userId: string | undefined) => {
  const [externalLinks, setExternalLinks] = useState<ExternalLinkWithMeta[]>([
    { platform: 'Google Reviews', url: '', place_id: '', validation_status: 'pending' },
    { platform: 'TripAdvisor', url: '', validation_status: 'pending' },
    { platform: 'Instagram', url: '', validation_status: 'pending' },
    { platform: 'Facebook', url: '', validation_status: 'pending' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExternalLinks = useCallback(async () => {
    if (!userId) return;
    
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

          return {
            platform: link.display_name || link.platform,
            url: link.url,
            place_id: extra.place_id || '',
            validation_status: extra.place_id ? ('valid' as ValidationStatus) : ('pending' as ValidationStatus),
            business_name: extra.business_name || undefined,
          };
        });
        
        setExternalLinks(formattedLinks);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading external links';
      console.error('Error loading external links:', errorMessage);
      setError(errorMessage);
      toast.error('Erro ao carregar links externos. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

 const validateGooglePlaceId = async (placeId: string, index: number) => {
  if (!placeId || !userId || !isValidPlaceId(placeId)) {
    setExternalLinks((prev) => {
      const updatedLinks = [...prev];
      updatedLinks[index] = {
        ...updatedLinks[index],
        validation_status: 'invalid' as ValidationStatus,
        error_message: 'ID do local inválido ou não reconhecido'
      };
      return updatedLinks;
    });
    return null;
  }

  setIsValidating(true);

  try {
    // 🚫 CHAMADA COMENTADA TEMPORARIAMENTE:
    /*
    const { data, error } = await supabase.functions.invoke('fetch-google-reviews', {
      body: { place_id: placeId, user_id: userId }
    });

    if (error) throw error;

    setExternalLinks((prev) => {
      const updatedLinks = [...prev];
      if (data && data.place_info) {
        updatedLinks[index] = {
          ...updatedLinks[index],
          validation_status: 'valid' as ValidationStatus,
          business_name: data.place_info.place_name,
          error_message: undefined
        };
      } else {
        updatedLinks[index] = {
          ...updatedLinks[index],
          validation_status: 'invalid' as ValidationStatus,
          error_message: 'Não foi possível verificar o local'
        };
      }
      return updatedLinks;
    });

    if (data && data.place_info) {
      toast.success(`Link do Google verificado: ${data.place_info.place_name}`);
    } else {
      toast.error('Erro ao validar o ID do local do Google.');
    }

    return data;
    */

    // ✅ Substituto temporário: marca como válido só para seguir o fluxo
    setExternalLinks((prev) => {
      const updatedLinks = [...prev];
      updatedLinks[index] = {
        ...updatedLinks[index],
        validation_status: 'valid' as ValidationStatus,
        error_message: undefined,
        business_name: updatedLinks[index]?.business_name || 'Mock Place (validação ignorada)'
      };
      return updatedLinks;
    });
    return { place_info: { place_name: 'Mock Place (validação ignorada)' } };

  } catch (error) {
    console.error('Erro ao validar o Google Place ID:', error);
    setExternalLinks((prev) => {
      const updatedLinks = [...prev];
      updatedLinks[index] = {
        ...updatedLinks[index],
        validation_status: 'invalid' as ValidationStatus,
        error_message: error instanceof Error ? error.message : 'Erro ao validar o ID do local'
      };
      return updatedLinks;
    });
    toast.error('Erro ao validar o ID do local do Google.');
    return null;
  } finally {
    setIsValidating(false);
  }
};


  const processGooglePlaceId = async (url: string, index: number): Promise<string | null> => {
    try {
      const placeId = extractPlaceIdFromUrl(url);
      
      if (!placeId) {
        toast.error(`Não foi possível extrair o ID do local a partir do link: ${url}`);
        return null;
      }
      
      if (!isValidPlaceId(placeId)) {
        toast.warning('O formato do ID do local parece inválido. A validação pode falhar.');
      } else {
        toast.success('ID do local detectado com sucesso!');
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
      toast.error('Erro ao processar o ID do local do Google.');
      return null;
    }
  };

  const handleExternalLinkChange = (index: number, key: string, value: string) => {
    setExternalLinks((prev) => {
      const updatedLinks = [...prev];
      updatedLinks[index] = { ...updatedLinks[index], [key]: value };
      return updatedLinks;
    });
    
    // If this is a Google URL, try to extract and validate the place_id
    if (key === 'url' && externalLinks[index]?.platform === 'Google Reviews') {
      processGooglePlaceId(value, index);
    }
  };

  const handleAddExternalLink = (newLink: PlatformLink) => {
    if (!newLink.platform || !newLink.url) {
      toast.error('Preencha todos os campos');
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
    toast.success('Link adicionado com sucesso!');
  };
  
  const handleDeleteExternalLink = (index: number) => {
    const updatedLinks = [...externalLinks];
    updatedLinks.splice(index, 1);
    setExternalLinks(updatedLinks);
    toast.success('Link removido com sucesso!');
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
    toast.error('Usuário não autenticado');
    // LOG 1: Mostra o ID do usuário autenticado
  console.log("🧩 userId:", userId);

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
      externalLinks.map(async (link, index) => {
        if (
          link.platform.toLowerCase() === 'google reviews' &&
          link.url &&
          !link.place_id
        ) {
          const placeId = extractPlaceIdFromUrl(link.url);
          return {
            ...link,
            place_id: placeId || null,
            validation_status: placeId ? 'valid' : 'invalid'
          };
        }
        return link;
      })
    );

    // Agora sim, monta os linksToInsert com base na versão correta
    const linksToInsert = updatedLinks
      .filter(link => link.platform.toLowerCase() === 'google reviews' && link.place_id)
      .map(link => ({
        user_id: userId,
        platform: link.platform.toLowerCase(),
        url: link.url,
        display_name: link.platform,
        place_id: link.place_id
      }));

    // LOG 2: Mostra os dados que serão inseridos no Supabase
    console.log("📦 linksToInsert:", linksToInsert);

    // Insere os novos links
    const { error: insertError } = await supabase
      .from('platform_links')
      .insert(linksToInsert);
      
    if (insertError) {
      throw new Error(insertError.message);
    }

    toast.success('Links externos atualizados com sucesso!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar links';
    console.error('❌ Erro ao salvar links externos:', errorMessage);
    setError(errorMessage);
    toast.error('Erro ao salvar links externos. Por favor, tente novamente.');
  } finally {
    setIsLoading(false);
  }
};


  const refreshGooglePlaceData = async (index: number) => {
    const link = externalLinks[index];
    if (link.platform !== 'Google Reviews' || !link.place_id) {
      toast.error('Não há um ID do Google vinculado para atualizar.');
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
    handleAddExternalLink,
    handleDeleteExternalLink,
    validateExternalLink,
    saveExternalLinks,
    refreshGooglePlaceData,
    refreshLinks: loadExternalLinks
  };
};
