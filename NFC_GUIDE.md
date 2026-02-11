# Guia de Implementação NFC - Tagflow

## 📋 Resumo da Implementação

Este documento descreve a implementação completa do sistema NFC para leitura e gravação de tags NFC no Tagflow.

## ✨ Funcionalidades Implementadas

### 1. Hook `useNfc` - Completo e Robusto

Localização: `apps/web/src/hooks/useNfc.ts`

**Recursos:**
- ✅ Leitura de tags NFC (serialNumber + NDEF records)
- ✅ Gravação em tags NFC (texto, URL, etc.)
- ✅ Verificação de suporte ao navegador e hardware
- ✅ Gestão de permissões NFC
- ✅ Tratamento robusto de erros com mensagens específicas
- ✅ Suporte a múltiplos formatos NDEF
- ✅ Verificação de HTTPS (obrigatório para NFC)

**Estados disponíveis:**
- `idle` - Inativo
- `checking-support` - Verificando suporte
- `not-supported` - NFC não suportado
- `permission-denied` - Permissão negada
- `scanning` - Escaneando tags
- `writing` - Gravando em tag
- `read-success` - Leitura bem-sucedida
- `write-success` - Gravação bem-sucedida
- `read-error` - Erro na leitura
- `write-error` - Erro na gravação
- `stopped` - Parado

### 2. Interface Atualizada

**AdminIdentifiers.tsx:**
- ✅ Modo leitura NFC
- ✅ Modo gravação NFC
- ✅ Feedback visual rico com ícones
- ✅ Mensagens de erro específicas
- ✅ Detalhes técnicos expansíveis (debug)
- ✅ Indicadores de status em tempo real

**AdminPdv.tsx:**
- ✅ Integrado com novo hook
- ✅ Mensagens de erro amigáveis
- ✅ Feedback visual aprimorado

## 🔧 Requisitos para Funcionamento

### 1. Navegador e Dispositivo

**Navegadores Suportados:**
- ✅ Google Chrome (Android)
- ✅ Microsoft Edge (Android)
- ✅ Opera (Android)
- ❌ Safari (iOS) - **NÃO SUPORTADO**
- ❌ Firefox - **NÃO SUPORTADO**

**Dispositivos:**
- ✅ Android com chip NFC
- ❌ iOS - **Web NFC API não disponível**

### 2. HTTPS Obrigatório

A Web NFC API **SOMENTE** funciona em:
- `https://` (produção)
- `http://localhost` (desenvolvimento)

**Verificação Automática:**
O hook verifica automaticamente se está em HTTPS e exibe erro se não estiver.

### 3. Permissões

O navegador solicitará permissão NFC ao usuário:
1. Na primeira vez que `startScan()` ou `write()` for chamado
2. Deve ser em resposta a um **gesto do usuário** (clique/toque)
3. A permissão é salva para sessões futuras

### 4. Tags NFC

**Tags Compatíveis:**
- NTAG213/215/216
- Mifare Classic/Ultralight
- Qualquer tag compatível com NDEF

**Tags Regraváveis:**
- A tag deve estar **desbloqueada**
- Não pode estar protegida contra escrita
- Memória suficiente para os dados

## 📱 Como Usar

### Leitura de Tags

```typescript
import { useNfc } from "@/hooks/useNfc";

function MyComponent() {
  const nfc = useNfc({
    onRead: (event) => {
      console.log("Serial:", event.serialNumber);
      console.log("Registros:", event.records);
    },
    onError: (error) => {
      console.error("Erro:", error.message);
    }
  });

  return (
    <div>
      <button onClick={() => nfc.startScan()}>
        Iniciar Leitura
      </button>

      {nfc.status === "read-success" && (
        <p>ID: {nfc.serialNumber}</p>
      )}
    </div>
  );
}
```

### Gravação em Tags

```typescript
function WriteComponent() {
  const nfc = useNfc({
    onWrite: () => {
      alert("Gravado com sucesso!");
    }
  });

  const handleWrite = async () => {
    const success = await nfc.write("MEU_ID_123");
    if (success) {
      console.log("Tag gravada!");
    }
  };

  return (
    <button onClick={handleWrite}>
      Gravar Tag
    </button>
  );
}
```

### Gravação de URL

```typescript
await nfc.write([{
  recordType: "url",
  data: "https://tagflow.com"
}]);
```

### Gravação de Texto com Idioma

```typescript
await nfc.write([{
  recordType: "text",
  data: "Olá Mundo",
  lang: "pt-BR"
}]);
```

## 🐛 Resolução de Problemas

### Tag não é lida

**Possíveis causas:**
1. Tag vazia ou não formatada
2. Tag protegida/bloqueada
3. Chip NFC incompatível
4. Distância muito grande (> 5cm)

**Solução:**
- Aproxime mais a tag (< 3cm)
- Use tags NTAG ou Mifare
- Verifique se a tag não está danificada

### Erro "NFC não suportado"

**Causas:**
1. Navegador não suportado
2. Dispositivo sem NFC
3. Não está em HTTPS

**Solução:**
- Use Chrome/Edge/Opera no Android
- Verifique se NFC está ativo no dispositivo
- Certifique-se de estar em HTTPS

### Erro "Permissão negada"

**Causa:**
- Usuário negou permissão NFC

**Solução:**
1. Limpe permissões do site
2. Recarregue a página
3. Aceite a permissão quando solicitada

### Tag não grava

**Possíveis causas:**
1. Tag protegida contra escrita
2. Memória insuficiente
3. Tag removida durante escrita
4. Formato incompatível

**Solução:**
- Use tags regraváveis (não OTP)
- Mantenha tag próxima durante toda gravação
- Reduza tamanho dos dados
- Formate a tag antes de gravar

## 🔍 Debug

### Ver Detalhes Técnicos

Na interface do AdminIdentifiers, clique em "Detalhes técnicos" para ver:
- Serial number da tag
- Todos os registros NDEF
- Tipo de cada registro
- Conteúdo completo

### Logs do Console

O hook registra logs importantes:
```javascript
console.log("NFC scan iniciado com sucesso");
console.log("NFC Tag detectado:", event);
console.log("NFC escrito com sucesso:", records);
console.error("Erro ao ler NFC:", err);
```

### Testar Suporte

```typescript
const nfc = useNfc();

console.log("Suportado?", nfc.isSupported);
console.log("Tem permissão?", nfc.hasPermission);
console.log("Status:", nfc.status);
console.log("Erro:", nfc.error);
```

## 📚 Referências

- [Web NFC API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API)
- [NDEFReader - MDN](https://developer.mozilla.org/en-US/docs/Web/API/NDEFReader)
- [Chrome NFC Guide](https://developer.chrome.com/docs/capabilities/nfc)
- [Web NFC Spec - W3C](https://w3c.github.io/web-nfc/)

## 🚀 Próximos Passos

Para melhorar ainda mais:

1. **Formatação de Tags**
   - Adicionar função para formatar/limpar tags

2. **Leitura Contínua**
   - Modo para ler múltiplas tags sequencialmente

3. **Histórico**
   - Salvar histórico de tags lidas

4. **Proteção contra Escrita**
   - Implementar `makeReadOnly()` para bloquear tags

5. **Vibração Háptica**
   - Feedback tátil ao ler/gravar tags

## ✅ Checklist de Produção

Antes de colocar em produção:

- [ ] Aplicação servida via HTTPS
- [ ] Certificado SSL válido
- [ ] Service Worker registrado
- [ ] PWA configurado corretamente
- [ ] Testado em dispositivos Android reais
- [ ] Testado com diferentes tipos de tags
- [ ] Mensagens de erro traduzidas
- [ ] Logs de produção desativados (ou mínimos)

## 📞 Suporte

Para problemas ou dúvidas sobre a implementação NFC, consulte:
- Documentação oficial da Web NFC API
- Issues do projeto no GitHub
- Logs do navegador (DevTools)
