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
}