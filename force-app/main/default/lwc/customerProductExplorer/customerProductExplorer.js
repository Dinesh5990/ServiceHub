import { LightningElement } from 'lwc';

export default class CustomerProductExplorer extends LightningElement {

    selectedCustomerId;

    handleCustomerSelect(event) {
        this.selectedCustomerId = event.detail;

        console.log('Parent received Customer Id:', this.selectedCustomerId);
    }
    
}