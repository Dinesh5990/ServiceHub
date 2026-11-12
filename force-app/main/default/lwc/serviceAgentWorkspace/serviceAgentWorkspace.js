import { LightningElement, wire } from 'lwc';
import { getListUi } from 'lightning/uiListApi';
import {
    createRecord,
    updateRecord
} from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import SERVICE_REQUEST_OBJECT
    from '@salesforce/schema/Service_Request__c';
import NAME_FIELD
    from '@salesforce/schema/Service_Request__c.Name';
import STATUS_FIELD
    from '@salesforce/schema/Service_Request__c.Status__c';
import SUPPORT_AGENT_FIELD
    from '@salesforce/schema/Service_Request__c.Support_Agent__c';
import ID_FIELD
    from '@salesforce/schema/Service_Request__c.Id';
import WORK_COMMENTS_FIELD
    from '@salesforce/schema/Service_Request__c.Work_Comments__c';

import SERVICE_REQUEST_PART_OBJECT
    from '@salesforce/schema/Service_Request_Part__c';
import SRP_SERVICE_REQUEST_FIELD
    from '@salesforce/schema/Service_Request_Part__c.Service_Request__c';
import SRP_PRODUCT_FIELD
    from '@salesforce/schema/Service_Request_Part__c.Product_c__c';
import SRP_QUANTITY_FIELD
    from '@salesforce/schema/Service_Request_Part__c.Quantity__c';
import SRP_UNLISTED_FIELD
    from '@salesforce/schema/Service_Request_Part__c.Unlisted_Part__c';
import SRP_OTHER_NAME_FIELD
    from '@salesforce/schema/Service_Request_Part__c.Other_Part_Name__c';
import SRP_OTHER_DESCRIPTION_FIELD
    from '@salesforce/schema/Service_Request_Part__c.Other_Part_Description__c';
import SRP_UNIT_PRICE_FIELD
    from '@salesforce/schema/Service_Request_Part__c.Unit_Price__c';

import getCompatibleSpareParts
    from '@salesforce/apex/ServiceAgentWorkspaceController.getCompatibleSpareParts';
import completeServiceRequest
    from '@salesforce/apex/ServiceAgentWorkspaceController.completeServiceRequest';

export default class ServiceAgentWorkspace extends LightningElement {

    serviceRequests = [];
    error;

    // Temporary testing value. We will remove this when dynamic agent
    // resolution is implemented.
    sureshAgentId = 'a05g500000E1pMzAAJ';

    compatibleParts = [];
    partsError;

    selectedPartId;
    partQuantity = 1;

    isUnlistedPart = false;
    otherPartName = '';
    otherPartDescription = '';
    unlistedUnitPrice = null;

    createdServiceRequestPartId;

    @wire(getListUi, {
        objectApiName: SERVICE_REQUEST_OBJECT,
        listViewApiName: 'All',
        fields: [
            NAME_FIELD,
            STATUS_FIELD,
            SUPPORT_AGENT_FIELD,
            WORK_COMMENTS_FIELD
        ]
    })
    wiredServiceRequests({ data, error }) {
        if (data) {
            this.serviceRequests = data.records.records
                .filter(record =>
                    record.fields.Support_Agent__c?.value ===
                    this.sureshAgentId
                )
                .map(record => ({
                    id: record.id,
                    name: record.fields.Name?.value,
                    status: record.fields.Status__c?.value,
                    supportAgentId:
                        record.fields.Support_Agent__c?.value,
                    workComments:
                        record.fields.Work_Comments__c?.value || '',
                    isNew:
                        record.fields.Status__c?.value === 'New',
                    isInProgress:
                        record.fields.Status__c?.value ===
                        'In Progress'
                }));

            /*
             * Temporary implementation:
             * load compatible parts for the first In Progress request.
             *
             * The Add Part operation itself no longer relies on this
             * request ID. It uses the ID on the clicked button.
             */
            const inProgressRequest = this.serviceRequests.find(
                request => request.isInProgress
            );

            if (inProgressRequest) {
                this.loadCompatibleParts(inProgressRequest.id);
            }

            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.serviceRequests = [];

            console.error(
                'Service Request error:',
                JSON.stringify(error)
            );
        }
    }

    handleStartWork(event) {
        const recordId = event.currentTarget.dataset.id;

        const fields = {};
        fields[ID_FIELD.fieldApiName] = recordId;
        fields[STATUS_FIELD.fieldApiName] = 'In Progress';

        updateRecord({ fields })
            .then(() => {
                this.showToast(
                    'Success',
                    'Service Request is now In Progress.',
                    'success'
                );

                this.serviceRequests = this.serviceRequests.map(
                    request =>
                        request.id === recordId
                            ? {
                                ...request,
                                status: 'In Progress',
                                isNew: false,
                                isInProgress: true
                            }
                            : request
                );

                this.loadCompatibleParts(recordId);
            })
            .catch(error => {
                console.error(
                    'Start Work error:',
                    JSON.stringify(error)
                );

                this.showToast(
                    'Error',
                    error?.body?.message ||
                        'Unable to update the Service Request.',
                    'error'
                );
            });
    }

    handleCompleteWork(event) {
        const recordId = event.currentTarget.dataset.id;

        completeServiceRequest({
            serviceRequestId: recordId
        })
            .then(result => {
                if (result === 'PENDING_APPROVAL') {
                    this.showToast(
                        'Approval Required',
                        'Work completed and the Service Request has been sent for manager approval.',
                        'success'
                    );

                    this.serviceRequests = this.serviceRequests.map(
                        request =>
                            request.id === recordId
                                ? {
                                    ...request,
                                    status: 'Pending Approval',
                                    isNew: false,
                                    isInProgress: false
                                }
                                : request
                    );
                } else if (result === 'RESOLVED') {
                    this.showToast(
                        'Success',
                        'Service Request resolved successfully.',
                        'success'
                    );

                    this.serviceRequests = this.serviceRequests.map(
                        request =>
                            request.id === recordId
                                ? {
                                    ...request,
                                    status: 'Resolved',
                                    isNew: false,
                                    isInProgress: false
                                }
                                : request
                    );
                }
            })
            .catch(error => {
                console.error(
                    'Complete Work error:',
                    JSON.stringify(error)
                );

                this.showToast(
                    'Error',
                    error?.body?.message ||
                        'Unable to complete the Service Request.',
                    'error'
                );
            });
    }

    handleWorkCommentsChange(event) {
        const recordId = event.currentTarget.dataset.id;
        const value = event.target.value;

        this.serviceRequests = this.serviceRequests.map(
            request =>
                request.id === recordId
                    ? {
                        ...request,
                        workComments: value
                    }
                    : request
        );
    }

    handleSaveWorkComments(event) {
        const recordId = event.currentTarget.dataset.id;

        const request = this.serviceRequests.find(
            item => item.id === recordId
        );

        if (!request) {
            this.showToast(
                'Error',
                'Service Request could not be identified.',
                'error'
            );
            return;
        }

        const fields = {};
        fields[ID_FIELD.fieldApiName] = recordId;
        fields[WORK_COMMENTS_FIELD.fieldApiName] =
            request.workComments;

        updateRecord({ fields })
            .then(() => {
                this.showToast(
                    'Success',
                    'Work comments saved successfully.',
                    'success'
                );
            })
            .catch(error => {
                console.error(
                    'Work Comments error:',
                    JSON.stringify(error)
                );

                this.showToast(
                    'Error',
                    error?.body?.message ||
                        'Unable to save work comments.',
                    'error'
                );
            });
    }

    loadCompatibleParts(serviceRequestId) {
        getCompatibleSpareParts({
            serviceRequestId
        })
            .then(result => {
                this.compatibleParts = result.map(part => ({
                    label:
                        `${part.Product_Name__c} - ` +
                        `₹${part.Standard_Price__c}`,
                    value: part.Id
                }));

                this.partsError = undefined;

                console.log(
                    'Compatible Parts:',
                    JSON.stringify(this.compatibleParts)
                );
            })
            .catch(error => {
                this.compatibleParts = [];
                this.partsError = error;

                console.error(
                    'Compatible Parts error:',
                    JSON.stringify(error)
                );
            });
    }

    handlePartChange(event) {
        this.selectedPartId = event.detail.value;
    }

    handleQuantityChange(event) {
        const value = parseInt(event.target.value, 10);

        this.partQuantity =
            Number.isInteger(value) && value > 0
                ? value
                : 1;
    }

    handleUnlistedPartChange(event) {
        this.isUnlistedPart = event.target.checked;

        if (this.isUnlistedPart) {
            this.selectedPartId = undefined;
        } else {
            this.otherPartName = '';
            this.otherPartDescription = '';
            this.unlistedUnitPrice = null;
        }
    }

    get showCompatibleParts() {
        return !this.isUnlistedPart;
    }

    handleOtherPartNameChange(event) {
        this.otherPartName = event.target.value;
    }

    handleOtherPartDescriptionChange(event) {
        this.otherPartDescription = event.target.value;
    }

    handleUnlistedPriceChange(event) {
        const value = Number(event.target.value);

        this.unlistedUnitPrice =
            Number.isFinite(value)
                ? value
                : null;
    }

    handleAddPart(event) {
        /*
         * This is the important fix.
         * The Service Request ID comes from the Add Part button in
         * the exact request card that was clicked.
         */
        const serviceRequestId =
            event.currentTarget.dataset.id;

        if (!serviceRequestId) {
            this.showToast(
                'Error',
                'Service Request could not be identified.',
                'error'
            );
            return;
        }

        if (!this.partQuantity || this.partQuantity < 1) {
            this.showToast(
                'Invalid Quantity',
                'Quantity must be at least 1.',
                'warning'
            );
            return;
        }

        if (this.isUnlistedPart) {
            if (!this.otherPartName?.trim()) {
                this.showToast(
                    'Part Name Required',
                    'Please enter the unlisted part name.',
                    'warning'
                );
                return;
            }

            if (
                this.unlistedUnitPrice === null ||
                this.unlistedUnitPrice === undefined ||
                this.unlistedUnitPrice < 0
            ) {
                this.showToast(
                    'Unit Price Required',
                    'Please enter a valid unit price.',
                    'warning'
                );
                return;
            }
        } else if (!this.selectedPartId) {
            this.showToast(
                'Select a Part',
                'Please select a compatible spare part.',
                'warning'
            );
            return;
        }

        const fields = {};

        fields[SRP_SERVICE_REQUEST_FIELD.fieldApiName] =
            serviceRequestId;

        fields[SRP_QUANTITY_FIELD.fieldApiName] =
            this.partQuantity;

        fields[SRP_UNLISTED_FIELD.fieldApiName] =
            this.isUnlistedPart;

        if (this.isUnlistedPart) {
            fields[SRP_OTHER_NAME_FIELD.fieldApiName] =
                this.otherPartName.trim();

            fields[
                SRP_OTHER_DESCRIPTION_FIELD.fieldApiName
            ] = this.otherPartDescription;

            fields[SRP_UNIT_PRICE_FIELD.fieldApiName] =
                this.unlistedUnitPrice;
        } else {
            fields[SRP_PRODUCT_FIELD.fieldApiName] =
                this.selectedPartId;
        }

        const recordInput = {
            apiName:
                SERVICE_REQUEST_PART_OBJECT.objectApiName,
            fields
        };

        createRecord(recordInput)
            .then(result => {
                this.createdServiceRequestPartId =
                    result.id;

                this.showToast(
                    'Success',
                    this.isUnlistedPart
                        ? 'Unlisted part added successfully. You can now upload supporting files.'
                        : 'Spare part added successfully. You can now upload supporting files.',
                    'success'
                );

                this.resetPartForm();
            })
            .catch(error => {
                console.error(
                    'Add Part error:',
                    JSON.stringify(error)
                );

                this.showToast(
                    'Error',
                    error?.body?.message ||
                        'Unable to add part.',
                    'error'
                );
            });
    }

    resetPartForm() {
        this.selectedPartId = undefined;
        this.partQuantity = 1;
        this.isUnlistedPart = false;
        this.otherPartName = '';
        this.otherPartDescription = '';
        this.unlistedUnitPrice = null;
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;

        this.showToast(
            'Files Uploaded',
            `${uploadedFiles.length} file(s) uploaded successfully.`,
            'success'
        );

        console.log(
            'Uploaded Files:',
            JSON.stringify(uploadedFiles)
        );
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}