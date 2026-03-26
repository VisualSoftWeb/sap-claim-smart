const cds = require('@sap/cds');

module.exports = class ClaimService extends cds.ApplicationService {
    async init() {
        const { Claims, ReturnOrders } = this.entities;

        // ---------- Virtual field: statusCriticality ----------
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

        // ---------- Action: Approve ----------
        this.on('approveClaim', Claims, async (req) => {
            const claimID = req.params[0]?.ID || req.params[0];
            if (!claimID) return req.error(400, 'ID da Avaria é obrigatório');

            // 1. Verificar se a avaria existe e está pendente
            const claim = await SELECT.one.from(Claims).where({ ID: claimID }).columns(c => {
                c.status, c.items(i => i.ID)
            });
            
            if (!claim) return req.error(404, 'Avaria não encontrada');
            if (claim.status !== 'PENDING') return req.error(409, 'A avaria não está com status PENDENTE');

            // 2. Validação de Negócio: Deve ter pelo menos um item
            if (!claim.items || claim.items.length === 0) {
                return req.error(400, 'Não é possível aprovar uma avaria sem itens selecionados');
            }

            // 3. Atualizar status para APPROVED
            await UPDATE(Claims).set({ status: 'APPROVED' }).where({ ID: claimID });

            // 4. Integração SD (Simulada): Criar Ordem de Retorno
            const sdOrderNumber = 'RE' + Math.floor(Math.random() * 900000 + 100000);
            const returnOrderInsert = await INSERT.into(ReturnOrders).entries({
                claim_ID: claimID,
                sdOrderNumber: sdOrderNumber,
                orderType: 'RE'
            });
            const returnOrderID = returnOrderInsert.results[0].ID;

            console.log(`[SD INTEGRATION] Ordem de Retorno ${sdOrderNumber} (ID: ${returnOrderID}) criada para Avaria ${claimID}`);

            // 5. Integração Financeira (Simulada): Criar Nota de Crédito
            const { CreditMemos } = this.entities;
            const memoNumber = 'CM' + Math.floor(Math.random() * 900000 + 100000);
            
            // Recalcula o valor total baseado nos itens se não estiver presente
            const claimWithItems = await SELECT.one.from(Claims).where({ ID: claimID }).columns(c => {
                c.totalAmount, c.items(i => i.quantity)
            });
            
            const finalAmount = claimWithItems.totalAmount || (claimWithItems.items.reduce((acc, item) => acc + (item.quantity * 50), 0));

            await INSERT.into(CreditMemos).entries({
                returnOrder_ID: returnOrderID,
                memoNumber: memoNumber,
                amount: finalAmount
            });

            console.log(`[FIN INTEGRATION] Nota de Crédito ${memoNumber} criada no valor de R$ ${finalAmount}`);

            // 6. Finalizar Processo
            await UPDATE(Claims).set({ status: 'COMPLETED' }).where({ ID: claimID });

            return SELECT.one.from(Claims).where({ ID: claimID });
        });

        // ---------- Action: Reject ----------
        this.on('rejectClaim', Claims, async (req) => {
            const claimID = req.params[0]?.ID || req.params[0];
            const { reason } = req.data;

            const claim = await SELECT.one.from(Claims).where({ ID: claimID });
            if (!claim) return req.error(404, 'Claim not found');

            await UPDATE(Claims).set({ status: 'REJECTED' }).where({ ID: claimID });
            console.log(`[WORKFLOW] Claim ${claimID} rejected. Reason: ${reason}`);
            return SELECT.one.from(Claims).where({ ID: claimID });
        });

        return super.init();
    }
}
