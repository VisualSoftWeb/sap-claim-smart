# Resumo do Sistema: MilkSales Smart Claims

O **Smart Claims** é uma solução moderna desenhada para otimizar o processo de devoluções e registros de avarias no ponto de entrega, integrando-se de forma inteligente ao SAP S/4HANA.

## O Problema que Resolve
Tradicionalmente, quando um produto chega avariado ao cliente, o processo é manual e burocrático. O motorista precisa anotar o erro, o backoffice precisa receber essa informação manualmente e, por fim, alguém precisa abrir o SAP (`VA01`, `VF01`) e digitar diversos documentos para ajustar o estoque e o financeiro.

**O Smart Claims elimina esse trabalho manual e o risco de erros de digitação.**

## O que o Sistema Faz (Fluxo de Valor)

### 1. Portal do Motorista
*   **Assistente IA (Voz & Chat)**: Registro de avarias mãos-livres via comandos de voz em Português ou chat interativo, totalmente integrado à interface Fiori.
*   **Registro Imediato**: O motorista registra a avaria no momento da entrega via dispositivo móvel.
*   **Evidências**: Permite o upload de fotos da mercadoria batida/estragada.
*   **Cálculo Automático**: O sistema já estima o prejuízo baseado nas quantidades informadas.

### 2. Gestão de Backoffice
*   **Visibilidade Centralizada**: Todas as solicitações dos motoristas aparecem em tempo real para o gestor.
*   **Análise Rápida**: O gestor revisa as fotos, os motivos e o valor total.

### 3. Automação e Integração S/4HANA
O grande diferencial do aplicativo é o que acontece no momento da aprovação. O app automatiza a comunicação com o SAP:

*   **Criação da Ordem de Retorno (Logística)**: Ajusta o estoque automaticamente. O SAP recebe a informação de que o produto "X" está voltando porque estava avariado.
*   **Criação da Nota de Crédito (Financeiro)**: Garante que o cliente não seja cobrado indevidamente. O sistema gera o estorno financeiro (credit memo) de forma imediata.

> [!IMPORTANT]
> **Sem o Smart Claims**: Alguém teria que abrir o SAP e criar esses dois documentos manualmente toda vez que um motorista voltasse com uma mercadoria batida.
>
> **Com o Smart Claims**: O backoffice apenas clica em "Aprovar" e o SAP já recebe todas as ordens prontas, mantendo o "Clean Core" (núcleo do sistema limpo e eficiente).

## Tecnologias Utilizadas
*   **Backend**: SAP CAP (Cloud Application Programming Model) em Node.js.
*   **Frontend**: SAP Fiori Elements (UX padrão SAP) com extensões nativas (Fragments & Controllers).
*   **IA & Agentes**: Protocolo **WebMCP** (Google) para integração de ferramentas com assistentes inteligentes e **Web Speech API** para comando de voz.
*   **Simulação ERP**: Entidades dedicadas para espelhar o comportamento do S/4HANA.
