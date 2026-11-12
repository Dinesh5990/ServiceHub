import { LightningElement, api } from 'lwc';

export default class StatusBadge extends LightningElement {

    @api status;

    get badgeClass() {

        if (this.status === 'Active') {
            return 'slds-badge slds-theme_success';
        }

        if (this.status === 'Under Repair') {
            return 'slds-badge slds-theme_warning';
        }

        if (this.status === 'Inactive') {
            return 'slds-badge slds-theme_error';
        }

        return 'slds-badge';
    }
}