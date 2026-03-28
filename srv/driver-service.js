const cds = require('@sap/cds');

module.exports = class DriverService extends cds.ApplicationService {
    async init() {
        const { Claims, ClaimItems } = this.entities;

        // ---------- Cálculo do Valor Total (Side Effect / Pré-Save) ----------
        // Centralizamos o cálculo para garantir consistência
        const _updateTotal = async (parent_ID) => {
            if (!parent_ID) return;
            const items = await SELECT.from(ClaimItems.drafts).where({ parent_ID });
            let total = 0;
            items.forEach(item => {
                const qty = Number(item.quantity) || 0;
                const prc = (item.price === null || item.price === undefined) ? 1.00 : Number(item.price);
                total += qty * prc;
            });
            await UPDATE(Claims.drafts).set({ totalAmount: total }).where({ ID: parent_ID });
            console.log(`[DRIVER-SERVICE] Total recalculado para rascunho ${parent_ID}: R$ ${total}`);
        };

        // Resposta dinâmica ao alterar itens
        this.after(['PATCH', 'CREATE', 'DELETE'], ClaimItems, async (data, req) => {
            if (req.target.drafts) {
                const parent_ID = data.parent_ID || req.data.parent_ID || (req.params[0] && req.params[0].ID);
                await _updateTotal(parent_ID);
            }
        });

        // Garantia final antes de salvar
        this.before('SAVE', Claims, async (req) => {
            const { ID } = req.data;
            const items = await SELECT.from(ClaimItems.drafts).where({ parent_ID: ID });
            if (items.length > 0) {
                let total = 0;
                items.forEach(item => { 
                    const qty = Number(item.quantity) || 0;
                    const prc = (item.price === null || item.price === undefined) ? 1.00 : Number(item.price);
                    total += qty * prc;
                });
                req.data.totalAmount = total;
            }
        });

        // ---------- Log de Sucesso ----------
        this.after('SAVE', Claims, (data) => {
            console.log(`[MOTORISTA] Avaria ${data.ID} registrada com sucesso.`);
        });

        // ---------- Visibilidade de Status (Criticality) ----------
        this.after('READ', Claims, (data) => {
            const items = Array.isArray(data) ? data : [data];
            for (const claim of items) {
                if (!claim) continue;
                switch (claim.status) {
                    case 'APPROVED':  claim.statusCriticality = 3; break; 
                    case 'REJECTED':  claim.statusCriticality = 1; break; 
                    case 'COMPLETED': claim.statusCriticality = 3; break; 
                    default:          claim.statusCriticality = 2; break; 
                }
            }
        });

        return super.init();
    }
}
