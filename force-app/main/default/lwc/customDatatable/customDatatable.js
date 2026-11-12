import LightningDatatable from 'lightning/datatable';
import statusTemplate from './statusTemplate.html';

export default class CustomDatatable extends LightningDatatable {

    static customTypes = {
        statusBadge: {
            template: statusTemplate,
            standardCellLayout: true,
            typeAttributes: ['status']
        }
    };
}