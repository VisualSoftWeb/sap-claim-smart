const cds = require('@sap/cds');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

module.exports = cds.service.impl(async function () {
    const { Claims, ClaimItems, Products } = cds.entities('milksales.smartclaims');

    // ======================================================================
    // Estado persistente da sessão (em memória)
    // ======================================================================
    let activeClaimID = null;
    let chatHistory = [];

    // Handler para limpar o histórico e resetar o estado
    this.on('clearChat', async () => {
        chatHistory = [];
        activeClaimID = null;
        return "Conversa reiniciada com sucesso.";
    });

    // ======================================================================
    // Catálogo de Produtos (carregado uma vez)
    // ======================================================================
    let productCatalog = [];
    async function loadProducts() {
        if (productCatalog.length === 0) {
            try {
                productCatalog = await SELECT.from(Products);
            } catch (e) {
                console.warn("[AI Service] Não foi possível carregar produtos:", e.message);
            }
        }
        return productCatalog;
    }

    // ======================================================================
    // System Prompt — Define o comportamento e o fluxo obrigatório
    // ======================================================================
    function buildSystemPrompt(products) {
        const catalogList = products.map(p =>
            `  - ID: "${p.productID}", Descrição: "${p.description}", Unidade: "${p.uom}"`
        ).join('\n');

        return `Você é o **Assistente de Logística MilkSales**, integrado a um sistema SAP de registro de avarias em entregas de laticínios.

## Sua Função
Você ajuda motoristas a registrar avarias (claims) de forma guiada, passo a passo. Você DEVE seguir o fluxo abaixo rigorosamente.

## Fluxo Obrigatório de Registro de Avaria

### Passo 1 — Identificar o Cliente
Pergunte o **nome do cliente** que recebeu a entrega (ex: "Supermercado BH", "Padaria Central").
Quando o usuário informar, chame a function \`iniciarAvaria\`.

### Passo 2 — Data da Entrega
Após criar a claim, pergunte a **data da entrega**. Se o usuário disser "hoje", use a data atual. Se informar uma data específica, utilize-a.
Chame \`atualizarDataEntrega\` com a data informada.

### Passo 3 — Adicionar Itens Avariados
Agora guie o usuário para adicionar os produtos avariados. Para cada item, você precisa de:
  a) **Produto** — Mostre o catálogo e peça que escolha. Use a descrição para buscar.
  b) **Quantidade** — Quantas unidades foram avariadas.
  c) **Valor Unitário** (preço) — Pergunte o valor unitário do produto em R$.
  d) **Motivo** — Pergunte o motivo. As opções são:
       - DAMAGED (Danificado/Quebrado)
       - LEAKING (Vazando)
       - EXPIRED (Vencido)

Quando tiver todas as informações, chame \`adicionarItem\`.

Após adicionar um item, pergunte: **"Deseja adicionar mais algum item ou finalizar a avaria?"**

### Passo 4 — Finalizar
Quando o usuário quiser finalizar, chame \`finalizarEResumir\` e apresente o resumo completo.

## Catálogo de Produtos Disponíveis
${catalogList}

## Regras Importantes
- Sempre responda em **Português do Brasil**.
- Seja **objetivo e claro**. Use emojis com moderação para facilitar a leitura.
- Nunca invente produtos fora do catálogo.
- Se o usuário pedir algo fora do fluxo (ex: consulta de status), informe que esta funcionalidade trata apenas do registro de avarias.
- O motorista logado será preenchido automaticamente pelo sistema como "Motorista Logado".
- Se o usuário mandar uma mensagem genérica como "oi" ou "olá", apresente-se e comece pelo Passo 1.
- Se já existe uma avaria ativa, lembre o usuário e pergunte se deseja continuar ou cancelar.
`;
    }

    // ======================================================================
    // Definição das Tools (Function Calling)
    // ======================================================================
    const tools = [
        {
            functionDeclarations: [
                {
                    name: "iniciarAvaria",
                    description: "Cria uma nova avaria (claim) no sistema para o cliente informado. Chamar somente depois que o usuário confirmar o nome do cliente.",
                    parameters: {
                        type: "object",
                        properties: {
                            customerName: {
                                type: "string",
                                description: "Nome completo do cliente (ex: Supermercado BH)"
                            }
                        },
                        required: ["customerName"]
                    }
                },
                {
                    name: "atualizarDataEntrega",
                    description: "Atualiza a data de entrega da avaria ativa. Chamar depois que o usuário informar a data.",
                    parameters: {
                        type: "object",
                        properties: {
                            deliveryDate: {
                                type: "string",
                                description: "Data da entrega no formato YYYY-MM-DD"
                            }
                        },
                        required: ["deliveryDate"]
                    }
                },
                {
                    name: "adicionarItem",
                    description: "Adiciona um item avariado à claim ativa. Chamar somente quando tiver produto, quantidade, preço unitário e motivo confirmados.",
                    parameters: {
                        type: "object",
                        properties: {
                            productSearch: {
                                type: "string",
                                description: "Nome ou parte da descrição do produto para buscar no catálogo (ex: 'Leite Integral')"
                            },
                            quantity: {
                                type: "number",
                                description: "Quantidade de unidades avariadas"
                            },
                            unitPrice: {
                                type: "number",
                                description: "Valor unitário do produto em Reais (R$)"
                            },
                            reason: {
                                type: "string",
                                enum: ["DAMAGED", "LEAKING", "EXPIRED"],
                                description: "Motivo da avaria: DAMAGED (danificado), LEAKING (vazando), EXPIRED (vencido)"
                            }
                        },
                        required: ["productSearch", "quantity", "unitPrice", "reason"]
                    }
                },
                {
                    name: "finalizarEResumir",
                    description: "Finaliza a avaria ativa e retorna um resumo com todos os itens e o valor total calculado.",
                    parameters: {
                        type: "object",
                        properties: {}
                    }
                }
            ]
        }
    ];

    // ======================================================================
    // Execução das Tools no Backend (CRUD real no banco)
    // ======================================================================
    async function executeTool(name, args) {
        console.log(`[AI Tool] Executando: ${name}`, JSON.stringify(args));

        if (name === "iniciarAvaria") {
            try {
                const entry = {
                    customerName: args.customerName,
                    driverName: 'Motorista Logado',
                    deliveryDate: new Date().toISOString().split('T')[0],
                    status: 'PENDING',
                    totalAmount: 0
                };
                const result = await INSERT.into(Claims).entries(entry);
                // Buscar o ID da claim criada
                const created = await SELECT.one.from(Claims)
                    .where({ customerName: args.customerName, status: 'PENDING' })
                    .orderBy({ createdAt: 'desc' });
                activeClaimID = created ? created.ID : null;

                if (!activeClaimID) {
                    return JSON.stringify({ status: "erro", mensagem: "Não foi possível obter o ID da avaria criada." });
                }
                return JSON.stringify({
                    status: "sucesso",
                    mensagem: `Avaria criada com sucesso para o cliente "${args.customerName}". ID: ${activeClaimID}. Agora pergunte a data da entrega.`
                });
            } catch (err) {
                return JSON.stringify({ status: "erro", mensagem: "Erro ao criar avaria: " + err.message });
            }
        }

        if (name === "atualizarDataEntrega") {
            if (!activeClaimID) {
                return JSON.stringify({ status: "erro", mensagem: "Nenhuma avaria ativa. Inicie uma avaria primeiro." });
            }
            try {
                await UPDATE(Claims).set({ deliveryDate: args.deliveryDate }).where({ ID: activeClaimID });
                return JSON.stringify({
                    status: "sucesso",
                    mensagem: `Data de entrega atualizada para ${args.deliveryDate}. Agora guie o usuário para adicionar os itens avariados. Mostre o catálogo de produtos.`
                });
            } catch (err) {
                return JSON.stringify({ status: "erro", mensagem: "Erro ao atualizar data: " + err.message });
            }
        }

        if (name === "adicionarItem") {
            if (!activeClaimID) {
                return JSON.stringify({ status: "erro", mensagem: "Nenhuma avaria ativa. Inicie uma avaria antes de adicionar itens." });
            }
            try {
                // Busca o produto pelo nome
                const prod = await SELECT.one.from(Products)
                    .where({ description: { like: `%${args.productSearch}%` } });

                if (!prod) {
                    const allProds = await SELECT.from(Products);
                    const options = allProds.map(p => p.description).join(', ');
                    return JSON.stringify({
                        status: "erro",
                        mensagem: `Produto "${args.productSearch}" não encontrado. Produtos disponíveis: ${options}`
                    });
                }

                const subtotal = args.quantity * args.unitPrice;

                await INSERT.into(ClaimItems).entries({
                    parent_ID: activeClaimID,
                    productID: prod.productID,
                    description: prod.description,
                    quantity: args.quantity,
                    reason: args.reason,
                    price: args.unitPrice,
                    uom: prod.uom
                });

                // Recalcular total da claim
                const items = await SELECT.from(ClaimItems).where({ parent_ID: activeClaimID });
                const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                await UPDATE(Claims).set({ totalAmount: total }).where({ ID: activeClaimID });

                return JSON.stringify({
                    status: "sucesso",
                    mensagem: `Item adicionado: ${args.quantity}x ${prod.description} a R$ ${args.unitPrice.toFixed(2)} cada (motivo: ${args.reason}). Subtotal deste item: R$ ${subtotal.toFixed(2)}. Total acumulado da avaria: R$ ${total.toFixed(2)}. Pergunte se o usuário deseja adicionar mais itens ou finalizar.`
                });
            } catch (err) {
                return JSON.stringify({ status: "erro", mensagem: "Erro ao adicionar item: " + err.message });
            }
        }

        if (name === "finalizarEResumir") {
            if (!activeClaimID) {
                return JSON.stringify({ status: "erro", mensagem: "Nenhuma avaria ativa para finalizar." });
            }
            try {
                const claim = await SELECT.one.from(Claims).where({ ID: activeClaimID });
                const items = await SELECT.from(ClaimItems).where({ parent_ID: activeClaimID });

                const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                await UPDATE(Claims).set({ totalAmount: total }).where({ ID: activeClaimID });

                const itemSummary = items.map(i =>
                    `  • ${i.quantity}x ${i.description} — R$ ${(i.quantity * i.price).toFixed(2)} (${i.reason})`
                ).join('\n');

                const result = {
                    status: "sucesso",
                    mensagem: `Avaria finalizada com sucesso!\nCliente: ${claim.customerName}\nData Entrega: ${claim.deliveryDate}\nMotorista: ${claim.driverName}\nItens:\n${itemSummary}\nTotal: R$ ${total.toFixed(2)}\nStatus: PENDENTE de aprovação.`
                };

                activeClaimID = null;
                return JSON.stringify(result);
            } catch (err) {
                return JSON.stringify({ status: "erro", mensagem: "Erro ao finalizar: " + err.message });
            }
        }

        return JSON.stringify({ status: "erro", mensagem: `Ferramenta "${name}" não reconhecida.` });
    }

    // ======================================================================
    // Handler principal do chat
    // ======================================================================
    this.on('chat', async (req) => {
        const { message } = req.data;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
            return "⚠️ Erro de Configuração: Insira sua Gemini API Key no arquivo .env do projeto.";
        }

        try {
            // Carregar produtos para o system prompt
            const products = await loadProducts();

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                tools,
                systemInstruction: buildSystemPrompt(products)
            });

            // Criar chat COM histórico persistente
            const chat = model.startChat({ history: chatHistory });

            // Enviar mensagem do usuário
            let result = await chat.sendMessage(message);
            let response = result.response;

            // Loop para processar múltiplas chamadas de function em sequência
            let maxIterations = 5; // Segurança contra loops infinitos
            while (response.functionCalls() && maxIterations > 0) {
                maxIterations--;
                const calls = response.functionCalls();

                const toolResults = [];
                for (const fc of calls) {
                    const output = await executeTool(fc.name, fc.args);
                    toolResults.push({
                        functionResponse: {
                            name: fc.name,
                            response: { content: output }
                        }
                    });
                }

                // Enviar resultados de volta para o modelo gerar a resposta
                result = await chat.sendMessage(toolResults);
                response = result.response;
            }

            // Salvar o histórico atualizado para a próxima mensagem
            chatHistory = await chat.getHistory();

            return response.text();

        } catch (err) {
            console.error("[AI Service] Erro:", err);

            // Se o erro for de cota, dar uma mensagem amigável
            if (err.message && err.message.includes('quota')) {
                return "⚠️ Cota da API Gemini excedida. Aguarde um momento e tente novamente.";
            }

            return "❌ Erro ao processar mensagem: " + err.message;
        }
    });
});
