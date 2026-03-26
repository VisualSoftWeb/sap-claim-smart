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
- **WebMCP Protocol (Google)**: Implementação do novo protocolo do Google para tornar a aplicação visível e compreensível por agentes de IA.
- **Agent Ready**: A aplicação foi projetada para que assistentes inteligentes possam navegar, extrair informações e realizar ações (como criar avarias) através da integração com o WebMCP, tornando-a uma "AI-First Enterprise App".

## Arquitetura e Estratégia SAP (Clean Core)
Este projeto é um exemplo prático da nova visão de modernização da SAP:
- **Clean Core Strategy**: Mantém o núcleo digital (S/4HANA) padrão, movendo toda a lógica de negócio e customização para extensões externas.
- **Side-by-Side Extensibility**: Construído como uma aplicação independente que reside fora do ERP, integrando-se de forma desacoplada via APIs OData.
- **Keep the Core Clean**: Reduz a complexidade de upgrades do S/4HANA ao evitar modificações invasivas (Z-programs) no sistema legado.
- **Decoupled Architecture**: Utiliza APIs estáveis para garantir a integridade do sistema central enquanto permite inovação rápida na borda (Edge).

## Ferramentas de Desenvolvimento
- **CDS Watch**: Servidor de desenvolvimento com recarga automática.
- npx cds: CLI para compilação e gestão do projeto CAP.
