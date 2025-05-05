
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import FeedbackForm from '@/components/forms/FeedbackForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Rating = 'negative' | 'neutral' | 'positive';

const Feedback = () => {
  const { businessId = '' } = useParams<{ businessId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get data from location state or set defaults
  const [businessData, setBusinessData] = useState({
    id: businessId,
    name: location.state?.businessName || "Carregando...",
    userId: location.state?.userId || '',
    rating: (location.state?.rating as Rating) || 'neutral'
  });
  const [loading, setLoading] = useState(!location.state);
  
  useEffect(() => {
    // If we have the data from location state, no need to fetch
    if (location.state) {
      setLoading(false);
      return;
    }
    
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
          navigate('/');
          return;
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
        } else {
          // If QR code not found, redirect to home
          toast.error('Desculpe, não encontramos o negócio especificado');
          navigate('/');
          return;
        }
        
        setBusinessData({
          id: businessId,
          name: userName,
          userId: userId,
          rating: 'negative' // Default to negative for direct feedback page access
        });
      } catch (error) {
        console.error('Error loading business data:', error);
        toast.error('Erro ao carregar dados do estabelecimento');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBusinessData();
  }, [businessId, location.state, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <FeedbackForm
        businessId={businessData.id}
        businessName={businessData.name}
        userId={businessData.userId}
        rating={businessData.rating}
      />
    </div>
  );
};

export default Feedback;
