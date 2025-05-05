
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface QRCodeGeneratorProps {
  businessId: string;
  baseUrl: string;
}

const QRCodeGenerator = ({ businessId, baseUrl }: QRCodeGeneratorProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [qrValue, setQrValue] = useState(`${baseUrl}/review/${businessId}`);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrName, setQrName] = useState('Avaliação Padrão');
  const [savedQRCodes, setSavedQRCodes] = useState<Array<{id: string, name: string, url: string, image: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQRs, setIsLoadingQRs] = useState(true);
  
  // Fetch saved QR codes on component mount
  useEffect(() => {
    if (user) {
      fetchSavedQRCodes();
    }
  }, [user]);
  
  const fetchSavedQRCodes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        throw error;
      }
      
      if (data) {
        // Generate QR image URLs for each saved QR code
        const qrCodesWithImages = data.map(qr => ({
          id: qr.id,
          name: qr.name,
          url: qr.redirect_url,
          image: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr.redirect_url)}`
        }));
        
        setSavedQRCodes(qrCodesWithImages);
      }
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus QR Codes",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQRs(false);
    }
  };
  
  const generateQRCode = async () => {
    setIsLoading(true);
    
    try {
      // Use a real QR code generation API
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`;
      
      // Simulate loading time for QR code generation
      setTimeout(() => {
        setQrImage(qrImageUrl);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o QR Code",
        variant: "destructive",
      });
    }
  };
  
  const saveQRCode = async () => {
    if (!qrImage || !user) return;
    
    try {
      // Generate a unique slug for the QR code
      const slug = uuidv4().substring(0, 8);
      
      // Save QR code to the database
      const { data, error } = await supabase
        .from('qr_codes')
        .insert([
          {
            user_id: user.id,
            name: qrName,
            slug: slug,
            redirect_url: qrValue,
          }
        ])
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Add new QR code to the list
      const newQRCode = {
        id: data.id,
        name: qrName,
        url: qrValue,
        image: qrImage
      };
      
      setSavedQRCodes([...savedQRCodes, newQRCode]);
      
      toast({
        title: "QR Code salvo",
        description: `QR Code "${qrName}" foi salvo com sucesso.`,
      });
    } catch (error) {
      console.error('Error saving QR code:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o QR Code",
        variant: "destructive",
      });
    }
  };
  
  const deleteQRCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      // Remove QR code from the list
      setSavedQRCodes(savedQRCodes.filter(qr => qr.id !== id));
      
      toast({
        title: "QR Code removido",
        description: "QR Code foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting QR code:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o QR Code",
        variant: "destructive",
      });
    }
  };
  
  const downloadQRCode = (qrImageUrl: string, name: string) => {
    // Create a temporary link to download the QR code image
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = `qrcode-${name.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Download iniciado",
      description: "O download do QR Code foi iniciado.",
    });
  };
  
  return (
    <Tabs defaultValue="generate">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="generate">Gerar QR Code</TabsTrigger>
        <TabsTrigger value="saved">QR Codes Salvos</TabsTrigger>
      </TabsList>
      
      <TabsContent value="generate">
        <Card>
          <CardHeader>
            <CardTitle>Gerador de QR Code</CardTitle>
            <CardDescription>
              Crie QR Codes personalizados para compartilhar com seus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qr-name">Nome do QR Code</Label>
              <Input
                id="qr-name"
                value={qrName}
                onChange={(e) => setQrName(e.target.value)}
                placeholder="Ex: Mesa 1, Balcão, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="qr-url">URL de Avaliação</Label>
              <Input
                id="qr-url"
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
                placeholder="URL para o QR Code"
              />
              <p className="text-xs text-gray-500">
                Esta é a URL que será aberta quando o cliente escanear o QR Code.
              </p>
            </div>
            
            <div className="flex justify-center pt-4">
              <Button onClick={generateQRCode} disabled={isLoading}>
                {isLoading ? 'Gerando...' : 'Gerar QR Code'}
              </Button>
            </div>
            
            {qrImage && (
              <div className="mt-6 flex flex-col items-center">
                <div className="border p-4 rounded-md bg-white">
                  <img src={qrImage} alt="QR Code" width={200} height={200} />
                </div>
                <div className="text-sm text-gray-500 mt-2">{qrName}</div>
              </div>
            )}
          </CardContent>
          
          {qrImage && (
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => downloadQRCode(qrImage, qrName)}>
                Baixar
              </Button>
              <Button onClick={saveQRCode}>
                Salvar QR Code
              </Button>
            </CardFooter>
          )}
        </Card>
      </TabsContent>
      
      <TabsContent value="saved">
        <Card>
          <CardHeader>
            <CardTitle>QR Codes Salvos</CardTitle>
            <CardDescription>
              Gerencie todos os QR Codes que você já criou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingQRs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
              </div>
            ) : savedQRCodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Você ainda não tem QR Codes salvos.</p>
                <p className="text-sm mt-2">Vá para a aba "Gerar QR Code" para criar um.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedQRCodes.map((qrCode) => (
                  <Card key={qrCode.id} className="overflow-hidden">
                    <div className="p-4 flex flex-col items-center">
                      <img src={qrCode.image} alt={qrCode.name} width={150} height={150} />
                      <h3 className="font-medium mt-2">{qrCode.name}</h3>
                      <p className="text-xs text-gray-500 truncate w-full text-center mt-1">
                        {qrCode.url}
                      </p>
                    </div>
                    <CardFooter className="bg-gray-50 px-4 py-2 flex justify-between">
                      <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => {
                        downloadQRCode(qrCode.image, qrCode.name);
                      }}>
                        Baixar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                        deleteQRCode(qrCode.id);
                      }}>
                        Excluir
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default QRCodeGenerator;
