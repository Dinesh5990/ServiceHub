import { LightningElement, api, wire } from 'lwc';
import getCustomerProducts from '@salesforce/apex/CustomerController.getCustomerProducts';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { deleteRecord } from 'lightning/uiRecordApi';
import getServiceRequests from '@salesforce/apex/CustomerController.getServiceRequests';
import { updateRecord } from 'lightning/uiRecordApi';
import SERVICE_REQUEST_ID from '@salesforce/schema/Service_Request__c.Id';
import SERVICE_STATUS from '@salesforce/schema/Service_Request__c.Status__c';


export default class CustomerProducts extends LightningElement {

    //@api customerId;
    customerProducts;
    isLoading = false;
    error;
    wiredProductsResult;
    showEditProductForm = false;
    selectedCustomerProductId;
    showDeleteConfirmation = false;
    recordIdToDelete;
    pageSize = 5;
currentPage = 1;
showServiceRequestForm = false;
selectedCustomerProductForService;
showServiceHistory = false;
serviceRequests = [];
selectedServiceCustomerProductId;
serviceHistoryLoading = false;

    @wire(getCustomerProducts, { customerId: '$customerId' })
wiredProducts(result) {

    this.wiredProductsResult = result;
    this.currentPage = 1;

    const { data, error } = result;

    if (data) {

        this.customerProducts = data.map(item => {
            return {
                ...item,
                productName: item.Product_c__r?.Name
            };
        });

        this.error = undefined;
        this.isLoading = false;

    } else if (error) {

        this.customerProducts = [];
        this.error = error;
        this.isLoading = false;

        console.error('Error loading customer products:', error);
    }
}

    get hasProducts() {
    return this.customerProducts && this.customerProducts.length > 0;
}

get hasCustomer() {
    return !!this.customerId;
}

get hasError() {
    return !!this.error;
}

_customerId;
isLoading = false;

@api get customerId() {
    return this._customerId;
}

set customerId(value) {
    this._customerId = value;

    if (value) {
        this.isLoading = true;
    }
}

columns = [
    {
        label: 'Customer Product',
        fieldName: 'Name'
    },
    {
        label: 'Product Name',
        fieldName: 'productName'
    },
    {
        label: 'Serial Number',
        fieldName: 'Serial_Number__c'
    },
    {
        label: 'Status',
         type: 'statusBadge',
    typeAttributes: {
        status: { fieldName: 'Product_Status__c' }
    }
    },
    {
        label: 'Purchase Date',
        fieldName: 'Purchase_Date__c',
        type: 'date'
    },
    {
        label: 'Warranty Start',
        fieldName: 'Warranty_Start_Date__c',
        type: 'date'
    },
    {
        label: 'Warranty End',
        fieldName: 'Warranty_End_Date__c',
        type: 'date'
    },
    {
    type: 'action',
    typeAttributes: {
        rowActions: [
            {
                label: 'Edit',
                name: 'edit'
            },
             {
        label: 'Delete',
        name: 'delete'
    },{
        label: 'Create Service Request',
        name: 'createService'
    },
    {
        label: 'View Service History',
        name: 'viewServices'
    }
        ]
    }
}
    
];

showAddProductForm = false;

handleAddProduct() {
    this.showAddProductForm = true;
}

handleCancel() {
    this.showAddProductForm = false;
}

handleSubmit(event) {
    event.preventDefault();

    const fields = event.detail.fields;

    fields.Customer__c = this.customerId;

    this.template
        .querySelector('lightning-record-edit-form')
        .submit(fields);
}

async handleSuccess() {

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: 'Product added successfully.',
            variant: 'success'
        })
    );

    this.showAddProductForm = false;

    await refreshApex(this.wiredProductsResult);
}
handleFormError(event) {

    console.error('Error creating Customer Product:', event.detail);

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Error',
            message: 'Unable to add product. Please check the entered details.',
            variant: 'error'
        })
    );
}

handleEditCancel() {
    this.showEditProductForm = false;
    this.selectedCustomerProductId = undefined;
}

async handleEditSuccess() {

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: 'Customer Product updated successfully.',
            variant: 'success'
        })
    );

    this.showEditProductForm = false;
    this.selectedCustomerProductId = undefined;

    await refreshApex(this.wiredProductsResult);
}

handleEditError(event) {

    console.error('Error updating Customer Product:', event.detail);

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Error',
            message: 'Unable to update Customer Product.',
            variant: 'error'
        })
    );
}

handleDeleteCancel() {
    this.showDeleteConfirmation = false;
    this.recordIdToDelete = undefined;
}
async handleDeleteConfirm() {

    try {

        await deleteRecord(this.recordIdToDelete);

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Customer Product deleted successfully.',
                variant: 'success'
            })
        );

        this.showDeleteConfirmation = false;
        this.recordIdToDelete = undefined;

        await refreshApex(this.wiredProductsResult);

    } catch (error) {

        console.error('Error deleting Customer Product:', error);

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: 'Unable to delete Customer Product.',
                variant: 'error'
            })
        );
    }
}

// get paginatedProducts() {

//     if (!this.customerProducts) {
//         return [];
//     }

//     const start = (this.currentPage - 1) * this.pageSize;
//     const end = start + this.pageSize;

//     return this.customerProducts.slice(start, end);
// }

get paginatedProducts() {

    const products = this.filteredProducts;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    return products.slice(start, end);
}


get disablePrevious() {
    return this.currentPage === 1;
}

get disableNext() {
    return this.currentPage === this.totalPages;
}

handlePrevious() {
    if (this.currentPage > 1) {
        this.currentPage--;
    }
}

handleNext() {
    if (this.currentPage < this.totalPages) {
        this.currentPage++;
    }
}

get totalPages() {

    const total = this.filteredProducts.length;

    if (total === 0) {
        return 1;
    }

    return Math.ceil(total / this.pageSize);
}
productSearchKey = '';

handleProductSearch(event) {
    this.productSearchKey = event.target.value;
    this.currentPage = 1;
}

get filteredProducts() {

    if (!this.customerProducts) {
        return [];
    }

    const searchKey = this.productSearchKey
        ? this.productSearchKey.toLowerCase().trim()
        : '';

    if (!searchKey) {
        return this.customerProducts;
    }

    return this.customerProducts.filter(item => {

        const productName =
            item.productName?.toLowerCase() || '';

        const serialNumber =
            item.Serial_Number__c?.toLowerCase() || '';

        const status =
            item.Product_Status__c?.toLowerCase() || '';

        return (
            productName.includes(searchKey) ||
            serialNumber.includes(searchKey) ||
            status.includes(searchKey)
        );
    });
}
handleServiceCancel() {
    this.showServiceRequestForm = false;
    this.selectedCustomerProductForService = undefined;
}

handleServiceSubmit(event) {
    event.preventDefault();

    const fields = event.detail.fields;

    fields.Customer_Product__c =
        this.selectedCustomerProductForService;

    event.target.submit(fields);
}

handleServiceSuccess() {

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: 'Service Request created successfully.',
            variant: 'success'
        })
    );

    this.showServiceRequestForm = false;
    this.selectedCustomerProductForService = undefined;
}

handleServiceError(event) {

    console.error(
        'Error creating Service Request:',
        event.detail
    );

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Error',
            message: 'Unable to create Service Request.',
            variant: 'error'
        })
    );
}

handleRowAction(event) {

    const actionName = event.detail.action.name;
    const row = event.detail.row;

    if (actionName === 'edit') {
        this.selectedCustomerProductId = row.Id;
        this.showEditProductForm = true;
    }

    if (actionName === 'delete') {
        this.recordIdToDelete = row.Id;
        this.showDeleteConfirmation = true;
    }

    if (actionName === 'createService') {
        this.selectedCustomerProductForService = row.Id;
        this.showServiceRequestForm = true;
    }

    if (actionName === 'viewServices') {
    this.selectedServiceCustomerProductId = row.Id;
    this.loadServiceHistory(row.Id);
}
}
async loadServiceHistory(customerProductId) {

    this.serviceHistoryLoading = true;

    try {

        const data = await getServiceRequests({
            customerProductId: customerProductId
        });

        this.serviceRequests = data.map(item => {
            return {
                ...item,
                agentName: item.Assigned_Agent__r?.Name,
                approverName: item.Approver__r?.Name
            };
        });

        this.showServiceHistory = true;

    } catch (error) {

        this.serviceRequests = [];

        console.error('Error loading service history:', error);

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: 'Unable to load Service History.',
                variant: 'error'
            })
        );

    } finally {
        this.serviceHistoryLoading = false;
    }
}

handleServiceSubmit(event) {

    event.preventDefault();

    const fields = event.detail.fields;

    fields.Customer_Product__c =
        this.selectedCustomerProductForService;

    event.target.submit(fields);
}

handleServiceSuccess() {

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: 'Service Request created successfully.',
            variant: 'success'
        })
    );

    this.showServiceRequestForm = false;
    this.selectedCustomerProductForService = undefined;
}

handleServiceError(event) {

    console.error(
        'Error creating Service Request:',
        event.detail
    );

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Error',
            message: 'Unable to create Service Request.',
            variant: 'error'
        })
    );
}
serviceColumns = [
    {
        label: 'Service Request',
        fieldName: 'Name'
    },
    {
        label: 'Issue',
        fieldName: 'Issue_Description__c'
    },
    {
        label: 'Priority',
        fieldName: 'Priority__c'
    },
    {
        label: 'Status',
        fieldName: 'Status__c'
    },
    {
        label: 'Assigned Agent',
        fieldName: 'agentName'
    },
    {
        label: 'Approval Status',
        fieldName: 'Approval_Status__c'
    },
    {
        label: 'Approver',
        fieldName: 'approverName'
    },
    {
        label: 'Requested Date',
        fieldName: 'Requested_Date__c',
        type: 'date'
    },
    {
    type: 'action',
    typeAttributes: {
        rowActions: [
            {
                label: 'Start Work',
                name: 'startWork'
            }
        ]
    }
}
];
get hasServiceRequests() {
    return this.serviceRequests && this.serviceRequests.length > 0;
}

async handleServiceRowAction(event) {

    const actionName = event.detail.action.name;
    const row = event.detail.row;

    if (actionName === 'startWork') {

        const fields = {};

        fields[SERVICE_REQUEST_ID.fieldApiName] = row.Id;
        fields[SERVICE_STATUS.fieldApiName] = 'In Progress';

        try {

            await updateRecord({
                fields: fields
            });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Service Request moved to In Progress.',
                    variant: 'success'
                })
            );

            await this.loadServiceHistory(
                this.selectedServiceCustomerProductId
            );

        } catch (error) {

            console.error(
                'Error starting Service Request:',
                error
            );

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Unable to start the Service Request.',
                    variant: 'error'
                })
            );
        }
    }
}
}