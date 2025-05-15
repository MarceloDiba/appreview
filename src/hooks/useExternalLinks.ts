
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLink } from '@/components/settings/PlatformLink';
import { toast } from 'sonner';
import { extractPlaceIdFromUrl } from '@/utils/googlePlaceUtils';

export const useExternalLinks = (userId: string | undefined) => {
  const [externalLinks, setExternalLinks] = useState<PlatformLink[]>([
    { platform: 'Google Reviews', url: 'https://g.page/r/example-review-link', place_id: '' },
    { platform: 'TripAdvisor', url: 'https://tripadvisor.com/example-review' },
    { platform: 'Instagram', url: 'https://instagram.com/example' },
    { platform: 'Facebook', url: 'https://facebook.com/example' },
  ]);

  const loadExternalLinks = async () => {
    if (!userId) return;
    
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
          // Using type assertion to tell TypeScript that place_id might exist on the object
          place_id: (link as any).place_id || ''
        }));
        
        setExternalLinks(formattedLinks);
      }
    } catch (error) {
      console.error('Error loading external links:', error);
    }
  };

  const handleExternalLinkChange = (index: number, key: string, value: string) => {
    const updatedLinks = [...externalLinks];
    updatedLinks[index] = { ...updatedLinks[index], [key]: value };
    
    // If this is a Google URL, try to extract the place_id
    if (key === 'url' && updatedLinks[index].platform === 'Google Reviews') {
      const placeId = extractPlaceIdFromUrl(value);
      if (placeId) {
        updatedLinks[index].place_id = placeId;
        toast.success('Google Place ID detectado com sucesso!');
      } else {
        // Clear the place_id if we couldn't extract it
        updatedLinks[index].place_id = '';
      }
    }
    
    setExternalLinks(updatedLinks);
  };

  const handleAddExternalLink = (newLink: PlatformLink) => {
    if (!newLink.platform || !newLink.url) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    const linkToAdd: PlatformLink = { ...newLink };
    
    // If this is a Google URL, try to extract the place_id
    if (linkToAdd.platform === 'Google Reviews') {
      const placeId = extractPlaceIdFromUrl(linkToAdd.url);
      if (placeId) {
        linkToAdd.place_id = placeId;
        toast.success('Google Place ID detectado com sucesso!');
      }
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

  const saveExternalLinks = async () => {
    try {
      if (!userId) {
        toast.error('Usuário não autenticado');
        return;
      }

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
        place_id: link.place_id || null // Ensure place_id is included in insert
      }));
      
      const { error: insertError } = await supabase
        .from('platform_links')
        .insert(linksToInsert);
        
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      toast.success('Links externos atualizados com sucesso!');
    } catch (error) {
      console.error('Error saving external links:', error);
      toast.error('Erro ao salvar links externos. Por favor, tente novamente.');
    }
  };

  useEffect(() => {
    if (userId) {
      loadExternalLinks();
    }
  }, [userId]);

  return {
    externalLinks,
    handleExternalLinkChange,
    handleAddExternalLink,
    handleDeleteExternalLink,
    saveExternalLinks,
  };
};
