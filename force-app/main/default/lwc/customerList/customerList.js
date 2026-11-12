import { LightningElement, wire } from 'lwc';
import getCustomers from '@salesforce/apex/CustomerController.getCustomers';

export default class CustomerList extends LightningElement {

    customers;

    @wire(getCustomers)
    wiredCustomers({ data, error }) {
        if (data) {
            this.customers = data;
        } else if (error) {
            console.error(error);
        }
    }
}