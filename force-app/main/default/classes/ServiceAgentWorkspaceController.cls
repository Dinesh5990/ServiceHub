public with sharing class ServiceAgentWorkspaceController {

    @AuraEnabled(cacheable=true)
    public static List<Product_c__c> getCompatibleSpareParts(Id serviceRequestId) {

        if (serviceRequestId == null) {
            return new List<Product_c__c>();
        }

        Service_Request__c serviceRequest = [
            SELECT Id,
                   Customer_Product__c,
                   Customer_Product__r.Product_c__c
            FROM Service_Request__c
            WHERE Id = :serviceRequestId
            LIMIT 1
        ];

        if (
            serviceRequest.Customer_Product__c == null ||
            serviceRequest.Customer_Product__r.Product_c__c == null
        ) {
            return new List<Product_c__c>();
        }

        Id finishedProductId =
            serviceRequest.Customer_Product__r.Product_c__c;

        List<Product_Part_Compatibility__c> compatibilityRecords = [
            SELECT Spare_Part__c,
                   Spare_Part__r.Product_Name__c,
                   Spare_Part__r.Standard_Price__c
            FROM Product_Part_Compatibility__c
            WHERE Finished_Product__c = :finishedProductId
            AND Active__c = true
            AND Spare_Part__c != null
        ];

        List<Product_c__c> spareParts = new List<Product_c__c>();

        for (
            Product_Part_Compatibility__c compatibility :
            compatibilityRecords
        ) {
            spareParts.add(compatibility.Spare_Part__r);
        }

        return spareParts;
    }
@AuraEnabled
public static String completeServiceRequest(Id serviceRequestId) {

    if (serviceRequestId == null) {
        throw new AuraHandledException(
            'Service Request Id is required.'
        );
    }

    List<Service_Request_Part__c> parts = [
        SELECT Id,
               Approval_Required__c,
               Part_Approval_Status__c,
               Part_Approval_Comments__c,
               Part_Approval_Decision_Date__c
        FROM Service_Request_Part__c
        WHERE Service_Request__c = :serviceRequestId
    ];

    Boolean approvalRequired = false;

    for (Service_Request_Part__c part : parts) {
        if (part.Approval_Required__c == true) {
            approvalRequired = true;
            break;
        }
    }

    Service_Request__c serviceRequest =
        new Service_Request__c(
            Id = serviceRequestId
        );

    if (approvalRequired) {

        // Set every approval-required part to Pending
        List<Service_Request_Part__c> partsToUpdate =
            new List<Service_Request_Part__c>();

        for (Service_Request_Part__c part : parts) {

            if (part.Approval_Required__c == true) {

                part.Part_Approval_Status__c = 'Pending';
                part.Part_Approval_Comments__c = null;
                part.Part_Approval_Decision_Date__c = null;

                partsToUpdate.add(part);
            }
        }

        if (!partsToUpdate.isEmpty()) {
            update partsToUpdate;
        }

        // THIS WAS MISSING
        serviceRequest.Status__c = 'Pending Approval';
        serviceRequest.Approval_Status__c = 'Pending';
        serviceRequest.Approval_Requested_Date__c =
            System.now();

        update serviceRequest;

        return 'PENDING_APPROVAL';

    } else {

        serviceRequest.Status__c = 'Resolved';
        serviceRequest.Resolved_Date__c = System.now();

        update serviceRequest;

        return 'RESOLVED';
    }
}
}