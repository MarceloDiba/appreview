
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  businessId: string;
  baseUrl: string;
}

const QRCodeGenerator = ({ businessId, baseUrl }: QRCodeGeneratorProps) => {
  const { toast } = useToast();
  const [qrValue, setQrValue] = useState(`${baseUrl}/review/${businessId}`);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrName, setQrName] = useState('Avaliação Padrão');
  const [savedQRCodes, setSavedQRCodes] = useState<Array<{name: string, url: string, image: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const generateQRCode = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, you would use a QR code generation library or API
      // For now, we'll just use a placeholder image
      const dummyQRImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`;
      
      // Simulate loading time for QR code generation
      setTimeout(() => {
        setQrImage(dummyQRImage);
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
  
  const saveQRCode = () => {
    if (!qrImage) return;
    
    const newQRCode = {
      name: qrName,
      url: qrValue,
      image: qrImage
    };
    
    setSavedQRCodes([...savedQRCodes, newQRCode]);
    
    toast({
      title: "QR Code salvo",
      description: `QR Code "${qrName}" foi salvo com sucesso.`,
    });
  };
  
  const downloadQRCode = () => {
    if (!qrImage) return;
    
    // Create a temporary link to download the QR code image
    const a = document.createElement('a');
    a.href = qrImage;
    a.download = `qrcode-${qrName.toLowerCase().replace(/\s+/g, '-')}.png`;
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
              <Button variant="outline" onClick={downloadQRCode}>
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
            {savedQRCodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Você ainda não tem QR Codes salvos.</p>
                <p className="text-sm mt-2">Vá para a aba "Gerar QR Code" para criar um.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedQRCodes.map((qrCode, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="p-4 flex flex-col items-center">
                      <img src={qrCode.image} alt={qrCode.name} width={150} height={150} />
                      <h3 className="font-medium mt-2">{qrCode.name}</h3>
                      <p className="text-xs text-gray-500 truncate w-full text-center mt-1">
                        {qrCode.url}
                      </p>
                    </div>
                    <CardFooter className="bg-gray-50 px-4 py-2 flex justify-between">
                      <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => {
                        const a = document.createElement('a');
                        a.href = qrCode.image;
                        a.download = `qrcode-${qrCode.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}>
                        Baixar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                        setSavedQRCodes(savedQRCodes.filter((_, i) => i !== index));
                        toast({
                          title: "QR Code removido",
                          description: `QR Code "${qrCode.name}" foi removido.`,
                        });
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
