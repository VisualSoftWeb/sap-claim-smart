using { milksales.smartclaims as my } from '../db/schema';

// Serviço exclusivo para o Portal do Motorista
service DriverService {
    @odata.draft.enabled
    entity Claims as projection on my.Claims;
    entity ClaimItems as projection on my.ClaimItems;
    entity Attachments as projection on my.Attachments;
    @readonly entity Products as projection on my.Products;
}

using from './common-annotations';
