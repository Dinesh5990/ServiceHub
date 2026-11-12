public with sharing class ManagerApprovalController {

    @AuraEnabled(cacheable=true)
    public static List<Service_Request__c> getPendingApprovals() {

        return [
            SELECT Id,
                   Name,
                   Status__c,
                   Approval_Status__c,
                   Approval_Requested_Date__c,
                   Issue_Description__c,
                   Work_Comments__c,
                   Customer_Product__c,
                   Customer_Product__r.Name,
                   Customer_Product__r.Warranty_Status__c
            FROM Service_Request__c
            WHERE Status__c = 'Pending Approval'
            AND Approval_Status__c = 'Pending'
            ORDER BY Approval_Requested_Date__c ASC
        ];
    }

    @AuraEnabled(cacheable=true)
public static List<Service_Request_Part__c> getRequestParts(Id serviceRequestId) {

    if (serviceRequestId == null) {
        return new List<Service_Request_Part__c>();
    }

    return [
        SELECT Id,
               Name,
               Service_Request__c,
               Product_c__c,
               Product_c__r.Product_Name__c,
               Quantity__c,
               Unit_Price__c,
               Total_Cost__c,
               Approval_Required__c,
               Part_Comments__c,
               Unlisted_Part__c,
               Other_Part_Name__c,
               Other_Part_Description__c,
               Part_Approval_Status__c,
               Part_Approval_Comments__c,
               Part_Approval_Decision_Date__c
        FROM Service_Request_Part__c
        WHERE Service_Request__c = :serviceRequestId
        ORDER BY CreatedDate ASC
    ];
}

@AuraEnabled
public static String processApproval(
    Id serviceRequestId,
    String decision,
    String approvalComments
) {
    if (serviceRequestId == null) {
        throw new AuraHandledException('Service Request Id is required.');
    }

    if (String.isBlank(decision)) {
        throw new AuraHandledException('Approval decision is required.');
    }

    Service_Request__c serviceRequest = [
        SELECT Id,
               Status__c,
               Approval_Status__c
        FROM Service_Request__c
        WHERE Id = :serviceRequestId
        LIMIT 1
    ];

    serviceRequest.Approval_Comments__c = approvalComments;
    serviceRequest.Approval_Decision_Date__c = System.now();

    if (decision == 'APPROVE') {

        serviceRequest.Approval_Status__c = 'Approved';
        serviceRequest.Status__c = 'Resolved';
        serviceRequest.Resolved_Date__c = System.now();

        update serviceRequest;

        return 'APPROVED';

    } else if (decision == 'REJECT') {

        serviceRequest.Approval_Status__c = 'Rejected';
        serviceRequest.Status__c = 'In Progress';

        update serviceRequest;

        return 'REJECTED';

    } else {
        throw new AuraHandledException('Invalid approval decision.');
    }
}

@AuraEnabled
public static String processPartDecision(
    Id serviceRequestPartId,
    String decision,
    String comments
) {
    if (serviceRequestPartId == null) {
        throw new AuraHandledException(
            'Service Request Part Id is required.'
        );
    }

    if (String.isBlank(decision)) {
        throw new AuraHandledException(
            'Decision is required.'
        );
    }

    Service_Request_Part__c part = [
        SELECT Id,
               Approval_Required__c,
               Part_Approval_Status__c
        FROM Service_Request_Part__c
        WHERE Id = :serviceRequestPartId
        LIMIT 1
    ];

    if (!part.Approval_Required__c) {
        throw new AuraHandledException(
            'This part does not require approval.'
        );
    }

    if (decision == 'APPROVE') {

        part.Part_Approval_Status__c = 'Approved';
        part.Part_Approval_Comments__c = comments;
        part.Part_Approval_Decision_Date__c = System.now();

        update part;

        return 'APPROVED';

    } else if (decision == 'REJECT') {

        if (String.isBlank(comments)) {
            throw new AuraHandledException(
                'Comments are required when rejecting a part.'
            );
        }

        part.Part_Approval_Status__c = 'Rejected';
        part.Part_Approval_Comments__c = comments;
        part.Part_Approval_Decision_Date__c = System.now();

        update part;

        return 'REJECTED';

    } else {

        throw new AuraHandledException(
            'Invalid decision.'
        );
    }
}
}