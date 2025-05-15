
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLink } from '@/components/settings/PlatformLink';
import { toast } from 'sonner';
import { extractPlaceIdFromUrl, isValidPlaceId } from '@/utils/googlePlaceUtils';

export interface ExternalLinkWithMeta extends PlatformLink {
  validation_status?: 'pending' | 'valid' | 'invalid';
  business_name?: string;
  error_message?: string;
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

  const loadExternalLinks = async () => {
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
        const formattedLinks = links.map(link => ({
          platform: link.display_name || link.platform,
          url: link.url,
          place_id: (link as any).place_id || '',
          validation_status: (link as any).place_id ? 'valid' : 'pending',
          business_name: (link as any).business_name || undefined,
        }));
        
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
  };

  const validateGooglePlaceId = async (placeId: string, index: number) => {
    if (!placeId || !userId || !isValidPlaceId(placeId)) {
      const updatedLinks = [...externalLinks];
      updatedLinks[index] = {
        ...updatedLinks[index],
        validation_status: 'invalid',
        error_message: 'ID do local inválido ou não reconhecido'
      };
      setExternalLinks(updatedLinks);
      return null;
    }
    
    setIsValidating(true);
    
    try {
      // Call our Supabase Edge Function to validate and fetch place details
      const { data, error } = await supabase.functions.invoke('fetch-google-reviews', {
        body: { place_id: placeId, user_id: userId }
      });
      
      if (error) throw error;
      
      const updatedLinks = [...externalLinks];
      if (data && data.place_info) {
        updatedLinks[index] = {
          ...updatedLinks[index], 
          validation_status: 'valid',
          business_name: data.place_info.place_name,
          error_message: undefined
        };
        toast.success(`Link do Google verificado: ${data.place_info.place_name}`);
      } else {
        updatedLinks[index] = {
          ...updatedLinks[index],
          validation_status: 'invalid',
          error_message: 'Não foi possível verificar o local'
        };
        toast.error('Erro ao validar o ID do local do Google.');
      }
      
      setExternalLinks(updatedLinks);
      return data;
    } catch (error) {
      console.error('Error validating Google Place ID:', error);
      const updatedLinks = [...externalLinks];
      updatedLinks[index] = {
        ...updatedLinks[index],
        validation_status: 'invalid',
        error_message: error instanceof Error ? error.message : 'Erro ao validar o ID do local'
      };
      setExternalLinks(updatedLinks);
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
        toast.error('Não foi possível extrair o ID do local. Verifique o URL.');
        return null;
      }
      
      if (!isValidPlaceId(placeId)) {
        toast.warning('O formato do ID do local parece inválido. A validação pode falhar.');
      } else {
        toast.success('ID do local detectado com sucesso!');
      }
      
      // Initial update with the extracted ID
      const updatedLinks = [...externalLinks];
      updatedLinks[index] = { 
        ...updatedLinks[index], 
        place_id: placeId,
        validation_status: 'pending'
      };
      setExternalLinks(updatedLinks);
      
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
    const updatedLinks = [...externalLinks];
    updatedLinks[index] = { ...updatedLinks[index], [key]: value };
    
    // If this is a Google URL, try to extract and validate the place_id
    if (key === 'url' && updatedLinks[index].platform === 'Google Reviews') {
      processGooglePlaceId(value, index);
    }
    
    setExternalLinks(updatedLinks);
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
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // First delete all existing links
      const { error: deleteError } = await supabase
        .from('platform_links')
        .delete()
        .eq('user_id', userId);
        
      if (deleteError) {
        throw new Error(deleteError.message);
      }
      
      // Then insert all links
      const linksToInsert = externalLinks.map(link => ({
        user_id: userId,
        platform: link.platform.toLowerCase(),
        url: link.url,
        display_name: link.platform,
        place_id: link.place_id || null, // Ensure place_id is included in insert
        business_name: link.business_name || null // Include business name if available
      }));
      
      const { error: insertError } = await supabase
        .from('platform_links')
        .insert(linksToInsert);
        
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      toast.success('Links externos atualizados com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error saving external links';
      console.error('Error saving external links:', errorMessage);
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
  }, [userId]);

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
