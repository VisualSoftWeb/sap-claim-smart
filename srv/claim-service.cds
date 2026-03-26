using { milksales.smartclaims as my } from '../db/schema';

// Serviço para o Backoffice / Gestor
service ClaimService {
    @odata.draft.enabled
    entity Claims as projection on my.Claims
        actions {
            action approveClaim() returns Claims;
            action rejectClaim(reason: String) returns Claims;
        };

    entity ClaimItems as projection on my.ClaimItems;
    entity Attachments as projection on my.Attachments;

    @readonly
    entity ReturnOrders as projection on my.ReturnOrders;

    @readonly
    entity CreditMemos as projection on my.CreditMemos;
}

using from './common-annotations';
