import { DocumentAutomationService } from './src/services/DocumentAutomationService.js';

async function test() {
    await DocumentAutomationService.dispatchDocuments('471fbd7d-27b6-4c44-b16e-c3d2a4fe3d26', 'PAYMENT', 'dc6725ca-6d18-465f-acb3-97626569e805');
}
test();
