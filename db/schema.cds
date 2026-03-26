namespace milksales.smartclaims;

using { managed, cuid } from '@sap/cds/common';

entity Claims : cuid, managed {
    status             : String(20) default 'PENDING'; // PENDING, APPROVED, REJECTED, COMPLETED
    virtual statusCriticality : Integer;                // 1=Red, 2=Yellow/Orange, 3=Green
    driverName         : String(100);
    customerName       : String(100);
    deliveryDate       : Date;
    totalAmount        : Decimal(15, 2);
    items              : Composition of many ClaimItems on items.parent = $self;
    attachments        : Composition of many Attachments on attachments.parent = $self;
    returnOrders       : Association to many ReturnOrders on returnOrders.claim = $self;
}

entity ClaimItems : cuid {
    parent        : Association to Claims;
    productID     : String(40);
    description   : String(255);
    quantity      : Integer;
    uom           : String(3);
    reason        : String(100); // DAMAGED, LEAKING, EXPIRED
    batchNumber   : String(20);
}

entity Attachments : cuid, managed {
    parent        : Association to Claims;
    @Core.MediaType: mediaType
    @Core.ContentDisposition.Filename: fileName
    @Core.AcceptableMediaTypes: ['image/*']
    content       : LargeBinary;
    @Core.IsMediaType: true
    mediaType     : String default 'image/png';
    fileName      : String;
    size          : Integer;
    url           : String;
}

// Simulation of S/4HANA SD entities
entity ReturnOrders : cuid, managed {
    claim         : Association to Claims;
    sdOrderNumber : String(10);
    orderType     : String(4) default 'RE';
    creditMemos   : Association to many CreditMemos on creditMemos.returnOrder = $self;
}

entity CreditMemos : cuid, managed {
    returnOrder   : Association to ReturnOrders;
    memoNumber    : String(10);
    amount        : Decimal(15, 2);
}

entity Products : cuid {
    productID     : String(40);
    description   : String(255);
    uom           : String(3);
}
