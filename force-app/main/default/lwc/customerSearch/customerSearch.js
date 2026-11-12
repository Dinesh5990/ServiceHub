import { LightningElement, wire } from 'lwc';
import searchCustomers from '@salesforce/apex/CustomerController.searchCustomers';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {
    MessageContext,
    publish
} from 'lightning/messageService';

import CUSTOMER_SELECTED_CHANNEL
    from '@salesforce/messageChannel/CustomerSelected__c';

export default class CustomerSearch extends LightningElement {
 
    searchKey = '';
    customers = [];
    error;
    @wire(MessageContext)
    messageContext;
    handleSearchKeyChange(event) {
        this.searchKey = event.target.value;
    }

    async handleSearch() {

        // 1. User didn't enter anything
        if (!this.searchKey || !this.searchKey.trim()) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing Customer Name',
                    message: 'Please enter a customer name.',
                    variant: 'warning'
                })
            );
            return;
        }

        try {

            // 2. Call Apex to search customers
            this.customers = await searchCustomers({
                searchKey: this.searchKey
            });

            this.error = undefined;

            // 3. Apex worked, but no customer was found
            if (this.customers.length === 0) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Customer Not Found',
                        message: 'No customer found with that name.',
                        variant: 'info'
                    })
                );
            }

            console.log('Customers:', this.customers);

        } catch (error) {

            // 4. Actual Apex/server error
            this.customers = [];
            this.error = error;

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Search Error',
                    message: 'Unable to search customers. Please try again.',
                    variant: 'error'
                })
            );

            console.error('Customer search failed:', error);
        }
    }

    handleSelect(event) {

    const customerId = event.target.dataset.id;

    // Existing Child -> Parent communication
    const selectEvent = new CustomEvent('customerselect', {
        detail: customerId
    });

    this.dispatchEvent(selectEvent);

    // LMS communication
    const message = {
        customerId: customerId
    };

    publish(
        this.messageContext,
        CUSTOMER_SELECTED_CHANNEL,
        message
    );
}
}