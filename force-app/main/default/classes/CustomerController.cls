public with sharing class CustomerController {

    @AuraEnabled(cacheable=true)
    public static List<Customer__c> searchCustomers(String searchKey) {

        if (String.isBlank(searchKey)) {
            return new List<Customer__c>();
        }

        String searchTerm = '%' + searchKey.trim() + '%';

        return [
            SELECT Id,
                   Name,
                   Customer_Name__c,
                   Email__c,
                   Phone__c,
                   City__c
            FROM Customer__c
            WHERE Customer_Name__c LIKE :searchTerm
            ORDER BY Customer_Name__c
            LIMIT 20
        ];
    }

    @AuraEnabled(cacheable=true)
public static List<Customer__c> getCustomers() {
    return [
       SELECT Id, Name, Customer_Name__c, Email__c, Phone__c, City__c
        FROM Customer__c ORDER BY Customer_Name__c
    ];
}
@AuraEnabled(cacheable=true)
public static List<Customer_Product__c> getCustomerProducts(Id customerId) {

    return [
        SELECT Id,
               Name,
               Customer__c,
               Product_c__c,
               Product_c__r.Name,
               Product_Status__c,
               Purchase_Date__c,
               Serial_Number__c,
               Warranty_Start_Date__c,
               Warranty_End_Date__c
        FROM Customer_Product__c
        WHERE Customer__c = :customerId
    ];
}

@AuraEnabled(cacheable=true)
public static Customer__c getCustomerById(Id customerId) {

    return [
        SELECT Id,
               Name,
               Customer_Name__c,
               Email__c,
               Phone__c,
               City__c
        FROM Customer__c
        WHERE Id = :customerId
        LIMIT 1
    ];
}

@AuraEnabled(cacheable=true)
public static List<Service_Request__c> getServiceRequests(Id customerProductId) {

    return [
        SELECT Id,
               Name,
               Customer_Product__c,
               Issue_Description__c,
               Priority__c,
               Status__c,
               Requested_Date__c,
               Assigned_Agent__c,
               Assigned_Agent__r.Name,
               Approver__c,
               Approver__r.Name,
               Approval_Status__c,
               Approval_Comments__c,
               Resolution__c,
               Resolved_Date__c
        FROM Service_Request__c
        WHERE Customer_Product__c = :customerProductId
        ORDER BY Requested_Date__c DESC
    ];
}
}