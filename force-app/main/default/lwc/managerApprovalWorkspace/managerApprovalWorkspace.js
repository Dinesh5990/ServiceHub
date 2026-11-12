import { LightningElement, wire } from 'lwc';
import getRequestParts
    from '@salesforce/apex/ManagerApprovalController.getRequestParts';
import getPendingApprovals
    from '@salesforce/apex/ManagerApprovalController.getPendingApprovals';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import processApproval from '@salesforce/apex/ManagerApprovalController.processApproval';
import processPartDecision from '@salesforce/apex/ManagerApprovalController.processPartDecision';


export default class ManagerApprovalWorkspace extends LightningElement {

    pendingRequests = [];
    error;
    showDecisionModal = false;
selectedRequestId;
selectedRequestName;
selectedDecision;
approvalComments = '';
showPartDecisionModal = false;

selectedPartId;
selectedPartName;
selectedPartDecision;

partApprovalComments = '';

    @wire(getPendingApprovals)
    wiredPendingApprovals({ data, error }) {

        if (data) {

            this.pendingRequests = data.map(request => ({
                id: request.Id,
                name: request.Name,
                status: request.Status__c,
                approvalStatus: request.Approval_Status__c,
                approvalRequestedDate: request.Approval_Requested_Date__c,
                issueDescription: request.Issue_Description__c,
                workComments: request.Work_Comments__c,
                customerProduct: request.Customer_Product__r?.Name,
                warrantyStatus:
                    request.Customer_Product__r?.Warranty_Status__c
            }));
             this.pendingRequests.forEach(request => {
            this.loadRequestParts(request.id);
        });

            this.error = undefined;

        } else if (error) {

            this.pendingRequests = [];
            this.error = error;

            console.error(
                'Manager Approval Error:',
                JSON.stringify(error)
            );
        }
    }

    loadRequestParts(serviceRequestId) {
    getRequestParts({ serviceRequestId })
        .then(result => {
            this.pendingRequests = this.pendingRequests.map(request => {
                if (request.id !== serviceRequestId) {
                    return request;
                }

                const parts = result.map(part => ({
                    id: part.Id,
                    name: part.Unlisted_Part__c
                        ? part.Other_Part_Name__c
                        : part.Product_c__r?.Product_Name__c,
                    description: part.Unlisted_Part__c
                        ? part.Other_Part_Description__c
                        : part.Part_Comments__c,
                    quantity: part.Quantity__c,
                    unitPrice: part.Unit_Price__c,
                    totalCost: part.Total_Cost__c,
                    approvalRequired: part.Approval_Required__c,
                    unlisted: part.Unlisted_Part__c,
                    partApprovalStatus: part.Part_Approval_Status__c,
                    partApprovalComments: part.Part_Approval_Comments__c,
                    partApprovalDecisionDate: part.Part_Approval_Decision_Date__c,
                    partApprovalStatus: part.Part_Approval_Status__c,
                    partApprovalComments: part.Part_Approval_Comments__c,
                    isPartPending: part.Part_Approval_Status__c === 'Pending'
                    
                }));

                return {
                    ...request,
                    parts
                };
            });
        })
        .catch(error => {
            console.error(
                'Request Parts Error:',
                JSON.stringify(error)
            );
        });
}

handleApproveClick(event) {
    this.openDecisionModal(event, 'APPROVE');
}

handleRejectClick(event) {
    this.openDecisionModal(event, 'REJECT');
}

openDecisionModal(event, decision) {
    this.selectedRequestId = event.target.dataset.id;
    this.selectedRequestName = event.target.dataset.name;
    this.selectedDecision = decision;
    this.approvalComments = '';
    this.showDecisionModal = true;
}

handleCommentsChange(event) {
    this.approvalComments = event.target.value;
}

handleCloseModal() {
    this.showDecisionModal = false;
    this.selectedRequestId = undefined;
    this.selectedRequestName = undefined;
    this.selectedDecision = undefined;
    this.approvalComments = '';
}

get modalTitle() {
    return this.selectedDecision === 'APPROVE'
        ? `Approve ${this.selectedRequestName}`
        : `Reject ${this.selectedRequestName}`;
}

get confirmButtonLabel() {
    return this.selectedDecision === 'APPROVE'
        ? 'Confirm Approve'
        : 'Confirm Reject';
}

get confirmButtonVariant() {
    return this.selectedDecision === 'APPROVE'
        ? 'success'
        : 'destructive';
}

handleConfirmDecision() {

    // Comments required for rejection
    if (
        this.selectedDecision === 'REJECT' &&
        !this.approvalComments?.trim()
    ) {
        this.showToast(
            'Comments Required',
            'Please provide a reason for rejecting the request.',
            'warning'
        );
        return;
    }

    processApproval({
        serviceRequestId: this.selectedRequestId,
        decision: this.selectedDecision,
        approvalComments: this.approvalComments
    })
    .then(result => {

        if (result === 'APPROVED') {
            this.showToast(
                'Approved',
                `${this.selectedRequestName} has been approved and resolved.`,
                'success'
            );
        }

        if (result === 'REJECTED') {
            this.showToast(
                'Rejected',
                `${this.selectedRequestName} has been rejected and returned to the Service Agent.`,
                'success'
            );
        }

        const processedId = this.selectedRequestId;

        this.handleCloseModal();

        // Remove processed request immediately from Manager workspace
        this.pendingRequests = this.pendingRequests.filter(
            request => request.id !== processedId
        );
    })
    .catch(error => {

        console.error(
            'Approval Decision Error:',
            JSON.stringify(error)
        );

        this.showToast(
            'Error',
            error?.body?.message ||
                'Unable to process the approval decision.',
            'error'
        );
    });
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

handlePartApprove(event) {
    this.openPartDecisionModal(event, 'APPROVE');
}

handlePartReject(event) {
    this.openPartDecisionModal(event, 'REJECT');
}

openPartDecisionModal(event, decision) {
    this.selectedPartId = event.target.dataset.id;
    this.selectedPartName = event.target.dataset.name;
    this.selectedPartDecision = decision;
    this.partApprovalComments = '';
    this.showPartDecisionModal = true;
}

handlePartCommentsChange(event) {
    this.partApprovalComments = event.target.value;
}

handleClosePartModal() {
    this.showPartDecisionModal = false;
    this.selectedPartId = undefined;
    this.selectedPartName = undefined;
    this.selectedPartDecision = undefined;
    this.partApprovalComments = '';
}

get partModalTitle() {
    return this.selectedPartDecision === 'APPROVE'
        ? `Approve ${this.selectedPartName}`
        : `Reject ${this.selectedPartName}`;
}

get partConfirmLabel() {
    return this.selectedPartDecision === 'APPROVE'
        ? 'Confirm Approve'
        : 'Confirm Reject';
}

get partConfirmVariant() {
    return this.selectedPartDecision === 'APPROVE'
        ? 'success'
        : 'destructive';
}

handleConfirmPartDecision() {

    if (
        this.selectedPartDecision === 'REJECT' &&
        !this.partApprovalComments?.trim()
    ) {
        this.showToast(
            'Comments Required',
            'Please provide the reason for rejecting this part.',
            'warning'
        );
        return;
    }

    processPartDecision({
        serviceRequestPartId: this.selectedPartId,
        decision: this.selectedPartDecision,
        comments: this.partApprovalComments
    })
    .then(result => {

        const status =
            result === 'APPROVED'
                ? 'Approved'
                : 'Rejected';

       this.pendingRequests = this.pendingRequests.map(request => ({
    ...request,

    parts: request.parts?.map(part =>
        part.id === this.selectedPartId
            ? {
                ...part,
                partApprovalStatus: status,
                partApprovalComments: this.partApprovalComments,
                isPartPending: false
            }
            : part
    )
}));


        this.showToast(
            'Success',
            `${this.selectedPartName} marked as ${status}.`,
            'success'
        );

        this.handleClosePartModal();
    })
    .catch(error => {

        console.error(
            'Part Approval Error:',
            JSON.stringify(error)
        );

        this.showToast(
            'Error',
            error?.body?.message ||
                'Unable to save the part decision.',
            'error'
        );
    });
}
}