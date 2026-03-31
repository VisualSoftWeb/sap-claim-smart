# Tecnologias do Projeto  Smart Claims

Este projeto é uma solução moderna baseada no ecossistema SAP para gestão de avarias e devoluções.

## Backend
- **SAP Cloud Application Programming Model (CAP)**: Framework principal para o desenvolvimento de serviços OData robustos.
- **Node.js & Express**: Ambiente de execução para o servidor backend.
- **SQLite**: Banco de dados relacional leve utilizado para desenvolvimento local e testes.
- **OData V4**: Protocolo de comunicação padrão para APIs SAP modernas.
- **SAP CDS (Core Data Services)**: Utilizado para modelagem de dados (DDL) e definições de serviços (DSDL).

## Frontend
- **SAP UI5 (Fiori Elements)**: Framework de interface de usuário para criação de aplicativos empresariais consistentes e responsivos.
- **Custom Extensions**: 
  - **Controller Extensions**: Lógica customizada integrada ao ciclo de vida da ListReport e ObjectPage.
  - **XML Fragments**: Diálogos nativos (`sap.m.Dialog`) para interface de chat assistida.
- **Standard Templates**: 
  - **List Report**: Para visualização e filtragem de grandes listas de avarias.
  - **Object Page**: Para detalhamento, edição e upload de anexos de uma avaria específica.
- **Manifest-first approach**: Configuração declarativa do aplicativo via `manifest.json`.

## Funcionalidades Chave
- **Draft Support**: Permite que motoristas iniciem o registro de uma avaria e continuem depois, garantindo que nenhum dado seja perdido durante o processo.
- **Media Streaming**: Suporte nativo para upload e visualização de fotos diretamente pelo serviço SAP CAP.
- **Annotations-based UI**: Interface de usuário dirigida pelo metadados (annotations), facilitando a manutenção e consistência visual.
- **Automação de Dados**: Preenchimento automático de campos utilizando Smart ValueHelp e lógica de negócio do lado do servidor (CDS hooks).

## Inteligência Artificial & Agent Readiness
- **WebMCP Protocol (Google)**: Implementação do protocolo para tornar a aplicação "Agent-Ready". Foram implementadas 3 ferramentas principais:
  - `iniciarAvaria`: Criação de registros com busca automática de cliente.
  - `adicionarItem`: Inserção de itens com busca inteligente de produto via OData.
  - `finalizarEResumir`: Cálculo e encerramento do fluxo de voz.
- **Web Speech API**: Integração nativa com reconhecimento de voz do navegador para suporte a comandos de voz em Português (pt-BR).
- **AI-First UX**: A interface permite que o motorista opere o sistema sem toque, ideal para ambientes logísticos onde o registro rápido e mãos-livres é essencial.

## Arquitetura e Estratégia SAP (Clean Core)
Este projeto é um exemplo prático da nova visão de modernização da SAP:
- **Clean Core Strategy**: Mantém o núcleo digital (S/4HANA) padrão, movendo toda a lógica de negócio e customização para extensões externas.
- **Side-by-Side Extensibility**: Construído como uma aplicação independente que reside fora do ERP, integrando-se de forma desacoplada via APIs OData.
- **Keep the Core Clean**: Reduz a complexidade de upgrades do S/4HANA ao evitar modificações invasivas (Z-programs) no sistema legado.
- **Decoupled Architecture**: Utiliza APIs estáveis para garantir a integridade do sistema central enquanto permite inovação rápida na borda (Edge).

## Ferramentas de Desenvolvimento
- **CDS Watch**: Servidor de desenvolvimento com recarga automática.
- npx cds: CLI para compilação e gestão do projeto CAP.
