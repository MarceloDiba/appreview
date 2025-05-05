
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import EmojiRating from '@/components/emoji-review/EmojiRating';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Review = () => {
  const { businessId = '' } = useParams<{ businessId: string }>();
  const [businessData, setBusinessData] = useState({
    id: businessId,
    name: "Carregando...",
    googleReviewUrl: "",
    tripAdvisorUrl: ""
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        // First try to find the QR code by ID
        const { data: qrData, error: qrError } = await supabase
          .from('qr_codes')
          .select('id, name, user_id')
          .eq('id', businessId)
          .single();
          
        if (qrError && qrError.code !== 'PGRST116') {
          console.error('Error fetching QR code:', qrError);
        }
        
        let userName = "Estabelecimento";
        let userId = businessId;
        
        // If QR code found, use its data and find the business name from profiles
        if (qrData) {
          userId = qrData.user_id;
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', userId)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
          } else if (profileData) {
            userName = profileData.business_name || qrData.name;
          } else {
            userName = qrData.name;
          }
        }
        
        // Try to find external review links
        const { data: linksData, error: linksError } = await supabase
          .from('platform_links')
          .select('platform, url')
          .eq('user_id', userId);
          
        if (linksError) {
          console.error('Error fetching platform links:', linksError);
        }
        
        let googleUrl = '';
        let tripAdvisorUrl = '';
        
        if (linksData && linksData.length > 0) {
          const googleLink = linksData.find(link => link.platform === 'google');
          const tripAdvisorLink = linksData.find(link => link.platform === 'tripadvisor');
          
          if (googleLink) googleUrl = googleLink.url;
          if (tripAdvisorLink) tripAdvisorUrl = tripAdvisorLink.url;
        }
        
        setBusinessData({
          id: businessId,
          name: userName,
          googleReviewUrl: googleUrl || "https://g.page/r/review-placeholder",
          tripAdvisorUrl: tripAdvisorUrl || ""
        });
        
        // Track the page view by incrementing the times_scanned counter in qr_codes table
        if (qrData) {
          await supabase
            .from('qr_codes')
            .update({ times_scanned: supabase.rpc('increment', { x: 1 }) })
            .eq('id', businessId);
        }
      } catch (error) {
        console.error('Error loading business data:', error);
        toast.error('Erro ao carregar dados do estabelecimento');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBusinessData();
  }, [businessId]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <EmojiRating
        businessId={businessData.id}
        businessName={businessData.name}
        googleReviewUrl={businessData.googleReviewUrl}
        tripAdvisorUrl={businessData.tripAdvisorUrl}
      />
    </div>
  );
};

export default Review;
