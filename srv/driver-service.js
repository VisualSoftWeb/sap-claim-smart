const cds = require('@sap/cds');

module.exports = class DriverService extends cds.ApplicationService {
    async init() {
        const { Claims, ClaimItems } = this.entities;

        // ---------- Cálculo Automático do Valor Total ----------
        this.before('SAVE', Claims, async (req) => {
            // Se items for vazio no payload (req.data), tentamos ler da tabela de rascunho
            let items = req.data.items;
            if (!items) {
                items = await SELECT.from(ClaimItems.drafts).where({ parent_ID: req.data.ID });
                req.data.items = items; // Alimenta para o SAVE processar se necessário
            }

            if (!items || items.length === 0) {
                req.error(400, 'É necessário informar pelo menos um item para registrar a avaria.', 'in/items');
                return;
            }

            // Calcula o total (Simulação: R$ 50,00 por unidade avariada)
            let total = 0;
            items.forEach(item => {
                total += (item.quantity || 0) * 50.00; 
            });
            req.data.totalAmount = total;

            console.log(`[CÁLCULO] Valor total da avaria ${req.data.ID} calculado em R$ ${total}`);
        });

        // ---------- Log de Lançamento (Ativação) ----------
        this.after('SAVE', Claims, (data) => {
            console.log(`[MOTORISTA] Avaria ${data.ID} lançada com sucesso para o cliente ${data.customerName}`);
        });

        // ---------- Virtual field: statusCriticality ----------
        // Mesma lógica do ClaimService para manter consistência visual
        this.after('READ', Claims, (data) => {
            const items = Array.isArray(data) ? data : [data];
            for (const claim of items) {
                if (!claim) continue;
                switch (claim.status) {
                    case 'APPROVED':  claim.statusCriticality = 3; break; // Green
                    case 'REJECTED':  claim.statusCriticality = 1; break; // Red
                    case 'COMPLETED': claim.statusCriticality = 3; break; // Green
                    default:          claim.statusCriticality = 2; break; // Yellow (PENDING)
                }
            }
        });

        return super.init();
    }
}
