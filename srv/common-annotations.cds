using { DriverService } from './driver-service';
using { ClaimService } from './claim-service';

// ############################################################################
// # DriverService - ANOTAÇÕES
// ############################################################################

annotate DriverService.Claims with @(
    Capabilities.Insertable: true,
    Capabilities.Updateable: true,
    Capabilities.Deleteable: true
);

annotate DriverService.Claims with {
    items @Capabilities.InsertRestrictions.Insertable: true;
    attachments @Capabilities.InsertRestrictions.Insertable: true;
};

annotate DriverService.ClaimItems with @(
    Capabilities.Insertable: true,
    Capabilities.Updateable: true,
    Capabilities.Deleteable: true
);

annotate DriverService.Attachments with @(
    Capabilities.Insertable: true,
    Capabilities.Updateable: true,
    Capabilities.Deleteable: true,
    UI.HeaderInfo: {
        TypeName: 'Foto da Avaria',
        TypeNamePlural: 'Fotos da Avaria',
        Title: { Value: fileName }
    }
);

annotate DriverService.Claims with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: ID, Label: 'ID Avaria' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status', Criticality: statusCriticality },
        { $Type: 'UI.DataField', Value: customerName, Label: 'Cliente' },
        { $Type: 'UI.DataField', Value: deliveryDate, Label: 'Data Entrega' }
    ],
    UI.HeaderInfo: {
        TypeName: 'Avaria', TypeNamePlural: 'Minhas Entregas',
        Title: { Value: customerName }, Description: { Value: deliveryDate }
    },
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'Informações Básicas', Target: '@UI.FieldGroup#BasicInfo' },
        { $Type: 'UI.ReferenceFacet', Label: 'Itens Avariados', Target: 'items/@UI.LineItem' },
        { $Type: 'UI.ReferenceFacet', Label: 'Fotos da Avaria', Target: 'attachments/@UI.LineItem' }
    ],
    UI.FieldGroup #BasicInfo: {
        Data: [
            { Value: customerName, Label: 'Cliente' },
            { Value: driverName, Label: 'Motorista' },
            { Value: deliveryDate, Label: 'Data' },
            { Value: totalAmount, Label: 'Valor Estimado' }
        ]
    }
);

annotate DriverService.Claims with {
    customerName @Common.FieldControl: #Mandatory;
    deliveryDate @Common.FieldControl: #Mandatory;
};

annotate DriverService.ClaimItems with @(
    UI.LineItem: [
        { Value: productID, Label: 'Produto' },
        { Value: description, Label: 'Descrição' },
        { Value: quantity, Label: 'Qtd' },
        { Value: price, Label: 'Valor Unit.' },
        { Value: uom, Label: 'Un' },
        { Value: reason, Label: 'Motivo' }
    ]
);

annotate DriverService.Attachments with @(
    UI.LineItem: [
        { Value: content, Label: 'Foto' },
        { Value: fileName, Label: 'Arquivo' },
        { Value: createdAt, Label: 'Data/Hora' }
    ]
);

annotate DriverService.Attachments with {
    content @(
        Core.ContentDisposition.Type: 'inline',
        Core.ContentDisposition.Filename: fileName,
        Core.MediaType: mediaType
    );
    mediaType @(UI.Hidden, Core.IsMediaType: true);
    fileName @(Common.FieldControl: #Mandatory);
    size @UI.Hidden;
    url @UI.Hidden;
};

annotate DriverService.ClaimItems with {
    productID @Common.ValueList: {
        CollectionPath: 'Products',
        Parameters: [
            { $Type: 'Common.ValueListParameterOut', LocalDataProperty: productID, ValueListProperty: 'productID' },
            { $Type: 'Common.ValueListParameterOut', LocalDataProperty: description, ValueListProperty: 'description' },
            { $Type: 'Common.ValueListParameterOut', LocalDataProperty: uom, ValueListProperty: 'uom' }
        ]
    };
};

// Side Effects para atualizar o valor total quando o item muda
annotate DriverService.ClaimItems with @Common.SideEffects: {
    SourceProperties: [ quantity, price ],
    TargetProperties: [ 'parent/totalAmount' ]
};

// ############################################################################
// # ClaimService - ANOTAÇÕES
// ############################################################################

annotate ClaimService.Claims with @(
    UI.SelectionFields: [ status, driverName, customerName, deliveryDate ],
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: ID, Label: 'Nº Claim' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status', Criticality: statusCriticality },
        { $Type: 'UI.DataField', Value: driverName, Label: 'Motorista' },
        { $Type: 'UI.DataField', Value: customerName, Label: 'Cliente' },
        { $Type: 'UI.DataField', Value: deliveryDate, Label: 'Data Entrega' },
        { $Type: 'UI.DataFieldForAction', Action: 'ClaimService.approveClaim', Label: 'Aprovar', Inline: true }
    ],
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Main', Label: 'Detalhes' },
        { $Type: 'UI.ReferenceFacet', Target: 'items/@UI.LineItem', Label: 'Itens Avariados' },
        { $Type: 'UI.ReferenceFacet', Target: 'attachments/@UI.LineItem', Label: 'Fotos da Avaria' },
        { $Type: 'UI.ReferenceFacet', Target: 'returnOrders/@UI.LineItem', Label: 'Integração S/4HANA' }
    ],
    UI.FieldGroup #Main: {
        Data: [
            { Value: driverName }, { Value: customerName }, { Value: deliveryDate }
        ]
    },
    UI.Identification: [
        { $Type: 'UI.DataFieldForAction', Action: 'ClaimService.approveClaim', Label: 'Aprovar' },
        { $Type: 'UI.DataFieldForAction', Action: 'ClaimService.rejectClaim', Label: 'Rejeitar' }
    ]
);

// Controle de visibilidade das ações
annotate ClaimService.Claims actions {
    approveClaim @Core.OperationAvailable: { $edmJson: { $Eq: [{ $Path: 'in/status' }, 'PENDING'] } }
                 @Common.SideEffects: {
                     TargetProperties: [ 'in/status', 'in/statusCriticality' ],
                     TargetEntities: [ 'in/returnOrders' ]
                 };
    rejectClaim  @Core.OperationAvailable: { $edmJson: { $Eq: [{ $Path: 'in/status' }, 'PENDING'] } }
                 @Common.SideEffects: {
                     TargetProperties: [ 'in/status', 'in/statusCriticality' ]
                 };
}

annotate ClaimService.ClaimItems with @(
    UI.LineItem: [
        { Value: productID, Label: 'Produto' },
        { Value: description, Label: 'Descrição' },
        { Value: quantity, Label: 'Qtd' },
        { Value: uom, Label: 'Un' },
        { Value: reason, Label: 'Motivo' }
    ]
);

annotate ClaimService.Attachments with @(
    UI.LineItem: [
        { Value: content, Label: 'Foto' },
        { Value: fileName, Label: 'Arquivo' },
        { Value: createdAt, Label: 'Data/Hora' }
    ]
);

annotate ClaimService.Attachments with {
    content @(
        Core.ContentDisposition.Type: 'inline',
        Core.ContentDisposition.Filename: fileName,
        Core.MediaType: mediaType
    );
    mediaType @(UI.Hidden, Core.IsMediaType: true);
    fileName @(Common.FieldControl: #Mandatory);
    size @UI.Hidden;
    url @UI.Hidden;
};

annotate ClaimService.ReturnOrders with @(
    UI.HeaderInfo: {
        TypeName: 'Ordem de Retorno', TypeNamePlural: 'Ordens de Retorno',
        Title: { Value: sdOrderNumber }
    },
    UI.LineItem: [
        { Value: sdOrderNumber, Label: 'Nº Ordem SD' },
        { Value: orderType, Label: 'Tipo' },
        { Value: createdAt, Label: 'Data Criação' }
    ],
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', Target: 'creditMemos/@UI.LineItem', Label: 'Notas de Crédito Financeiras' }
    ]
);

annotate ClaimService.CreditMemos with @(
    UI.LineItem: [
        { Value: memoNumber, Label: 'Nº Nota de Crédito' },
        { Value: amount, Label: 'Valor' },
        { Value: createdAt, Label: 'Data Criação' }
    ]
);
