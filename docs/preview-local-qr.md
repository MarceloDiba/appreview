# Teste local de QR no telemóvel

O QR não pode apontar para `127.0.0.1`: no telemóvel, esse endereço aponta
para o próprio telemóvel, e não para o Mac. Para um teste na mesma rede Wi-Fi,
o Binno aceita uma origem pública somente no ambiente local.

1. No Mac, obtenha o IP da rede local. Na sessão atual ele é
   `192.168.15.10`; ele pode mudar noutra rede.
2. Pare a prévia em `127.0.0.1` e inicie apenas a prévia de QR:

   ```bash
   VITE_PUBLIC_APP_URL=http://192.168.15.10:4173 npm run dev:lan
   ```

3. No painel, abra **QR Codes**, crie ou descarregue novamente o QR e escaneie
   com um telemóvel ligado à mesma rede Wi-Fi.
4. Confirme que o endereço mostrado no cartão começa por
   `http://192.168.15.10:4173/review/` e não por `127.0.0.1`.

Esta prévia fica visível apenas na rede local e serve exclusivamente ao teste.
Ela não liga o proxy local do OpenWA: ele exige
`BINNO_ENABLE_OPENWA_PROXY=true` e continua a ser testado na prévia segura
`127.0.0.1`. Para um QR externo, impresso ou de cliente, usar a origem
publicada e validada antes de imprimir.
