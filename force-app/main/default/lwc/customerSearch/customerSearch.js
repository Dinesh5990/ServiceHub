import { LightningElement } from 'lwc';
import searchCustomers from '@salesforce/apex/CustomerController.searchCustomers';

export default class CustomerSearch extends LightningElement {

    searchKey = '';
    customers = [];
    error;

    handleSearchKeyChange(event) {
        this.searchKey = event.target.value;
    }

    async handleSearch() {

        try {

            this.customers = await searchCustomers({
                searchKey: this.searchKey
            });

            this.error = undefined;

            console.log('Customers:', this.customers);

        } catch (error) {

            this.customers = [];
            this.error = error;

            console.error('Customer search failed:', error);
        }
    }
}