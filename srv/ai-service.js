const cds = require('@sap/cds');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

module.exports = cds.service.impl(async function() {
    // Busca as entidades diretamente do namespace correto
    const { Claims, ClaimItems, Products } = cds.entities('milksales.smartclaims');
    let activeClaimID = null;

    // --- Tools Definition for Gemini ---
    const tools = [
        {
            functionDeclarations: [
                {
                    name: "iniciarAvaria",
                    description: "Inicia o registro de uma avaria para um cliente específico.",
                    parameters: {
                        type: "object",
                        properties: {
                            customerName: { type: "string", description: "Nome do cliente (ex: Supermercado BH)" },
                            driverName: { type: "string", description: "Nome do motorista (opcional)" }
                        },
                        required: ["customerName"]
                    },
                },
                {
                    name: "adicionarItem",
                    description: "Busca um produto e adiciona à avaria ativa.",
                    parameters: {
                        type: "object",
                        properties: {
                            productSearch: { type: "string", description: "Nome ou parte da descrição do produto (ex: Leite)" },
                            quantity: { type: "number", description: "Quantidade units" },
                            reason: { type: "string", enum: ["DAMAGED", "LEAKING", "EXPIRED"], description: "Motivo da avaria" }
                        },
                        required: ["productSearch", "quantity", "reason"]
                    },
                },
                {
                    name: "finalizarEResumir",
                    description: "Finaliza o processo e retorna o resumo dos itens registrados.",
                    parameters: { type: "object", properties: {} }
                }
            ],
        },
    ];

    // --- Actions Handlers ---
    async function executeTool(name, args) {
        if (name === "iniciarAvaria") {
            const res = await INSERT.into(Claims).entries({
                customerName: args.customerName,
                driverName: args.driverName || 'Motorista Logado',
                deliveryDate: new Date().toISOString().split('T')[0],
                status: 'PENDING'
            });
            activeClaimID = res.results[0].lastID || res.results[0].ID;
            return `OK: Avaria iniciada para ${args.customerName}. ID: ${activeClaimID}.`;
        }

        if (name === "adicionarItem") {
            if (!activeClaimID) return "Erro: Chame 'iniciarAvaria' antes de adicionar itens.";
            
            // Busca o produto
            const prod = await SELECT.one.from(Products).where({ description: { like: `%${args.productSearch}%` } });
            if (!prod) return `Erro: Produto '${args.productSearch}' não encontrado.`;

            await INSERT.into(ClaimItems).entries({
                parent_ID: activeClaimID,
                productID: prod.productID,
                description: prod.description,
                quantity: args.quantity,
                reason: args.reason,
                price: 1.50, // Simulado
                uom: prod.uom
            });

            return `Sucesso: Adicionado ${args.quantity}x ${prod.description} por ${args.reason}.`;
        }

        if (name === "finalizarEResumir") {
            if (!activeClaimID) return "Nenhuma avaria ativa.";
            const claim = await SELECT.one.from(Claims).where({ ID: activeClaimID }).columns(c => {
                c.customerName, c.totalAmount, c.items(i => { i.quantity, i.description })
            });
            const summary = claim.items.map(i => `${i.quantity}x ${i.description}`).join(', ');
            const res = `Avaria concluída para ${claim.customerName}. Total: R$ ${claim.totalAmount}. Itens: ${summary}.`;
            activeClaimID = null;
            return res;
        }
    }

    this.on('chat', async (req) => {
        const { message } = req.data;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
            return "⚠️ [Erro de Configuração]: Por favor, insira sua Gemini API Key no arquivo .env do projeto.";
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", tools });
            const chat = model.startChat();

            const result = await chat.sendMessage(message);
            const response = result.response;
            const call = response.functionCalls();

            if (call) {
                // Executa as ferramentas solicitadas
                const toolResults = [];
                for (const f of call) {
                    const output = await executeTool(f.name, f.args);
                    toolResults.push({
                        functionResponse: {
                            name: f.name,
                            response: { content: output }
                        }
                    });
                }

                // Envia os resultados de volta para a IA gerar a resposta final
                const finalResult = await chat.sendMessage(toolResults);
                return finalResult.response.text();
            }

            return response.text();

        } catch (err) {
            console.error(err);
            return "Erro ao processar mensagem com a IA: " + err.message;
        }
    });
});
