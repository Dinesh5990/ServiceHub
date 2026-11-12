import { LightningElement, wire } from 'lwc';
//used for apex - import getCustomerById from '@salesforce/apex/CustomerController.getCustomerById';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import CUSTOMER_ID from '@salesforce/schema/Customer__c.Id';

import CUSTOMER_NAME from '@salesforce/schema/Customer__c.Customer_Name__c';
import CUSTOMER_EMAIL from '@salesforce/schema/Customer__c.Email__c';
import CUSTOMER_PHONE from '@salesforce/schema/Customer__c.Phone__c';
import CUSTOMER_CITY from '@salesforce/schema/Customer__c.City__c';
import {MessageContext,subscribe,unsubscribe} from 'lightning/messageService';

import CUSTOMER_SELECTED_CHANNEL from '@salesforce/messageChannel/CustomerSelected__c';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const FIELDS = [
    CUSTOMER_NAME,
    CUSTOMER_EMAIL,
    CUSTOMER_PHONE,
    CUSTOMER_CITY
];
export default class CustomerSummary extends NavigationMixin(LightningElement) {

    subscription = null;
    selectedCustomerId;
    // customer;
    hasRendered = false;

renderedCallback() {

    if (this.hasRendered) {
        return;
    }

    this.hasRendered = true;

    console.log('Customer Summary rendered for the first time');
}
    

    async handleUpdateCity() {

    const cityInput = this.template.querySelector(
        'lightning-input[data-id="cityInput"]'
    );

    const cityValue = this.newCity ? this.newCity.trim() : '';

    if (!cityValue) {
        cityInput.setCustomValidity('Please enter a city.');
        cityInput.reportValidity();
        return;
    }

    if (cityValue === this.customerCity) {
        cityInput.setCustomValidity('Please enter a different city.');
        cityInput.reportValidity();
        return;
    }

    cityInput.setCustomValidity('');
    cityInput.reportValidity();

    const fields = {};

    fields[CUSTOMER_ID.fieldApiName] = this.selectedCustomerId;
    fields[CUSTOMER_CITY.fieldApiName] = cityValue;

    const recordInput = {
        fields: fields
    };

    try {
        await updateRecord(recordInput);

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Customer city updated successfully.',
                variant: 'success'
            })
        );

        this.newCity = '';

    } catch (error) {
        console.error('Error updating customer city:', error);

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: 'Unable to update customer city.',
                variant: 'error'
            })
        );
    }
}

    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscribeToMessageChannel();
    }

    subscribeToMessageChannel() {

        if (!this.subscription) {

            this.subscription = subscribe(
                this.messageContext,
                CUSTOMER_SELECTED_CHANNEL,
                (message) => this.handleMessage(message)
            );
        }
    }

    handleMessage(message) {
        this.selectedCustomerId = message.customerId;

        console.log(
            'Customer Summary received Customer Id:',
            this.selectedCustomerId
        );
    }

    disconnectedCallback() {
        unsubscribe(this.subscription);
        this.subscription = null;
    }
//     @wire(getCustomerById, { customerId: '$selectedCustomerId' })
// wiredCustomer({ data, error }) {
//     if (data) {
//         this.customer = data;                     - used for apex
//     } else if (error) {
//         this.customer = undefined;
//         console.error('Error loading customer:', error);
//     }
// }

handleViewCustomer() {
    this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
            recordId: this.selectedCustomerId,
            objectApiName: 'Customer__c',
            actionName: 'view'
        }
    });
}

@wire(getRecord, {
    recordId: '$selectedCustomerId',
    fields: FIELDS
})
customer;

get customerName() {
    return getFieldValue(this.customer.data, CUSTOMER_NAME);
}

get customerEmail() {
    return getFieldValue(this.customer.data, CUSTOMER_EMAIL);
}

get customerPhone() {
    return getFieldValue(this.customer.data, CUSTOMER_PHONE);
}

get customerCity() {
    return getFieldValue(this.customer.data, CUSTOMER_CITY);
}

newCity = '';

handleCityChange(event) {
    this.newCity = event.target.value;
}

}