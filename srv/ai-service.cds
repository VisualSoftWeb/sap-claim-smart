using { milksales.smartclaims as schema } from '../db/schema';

service AIService @(path: '/ai') {
    action chat(message: String) returns String;
}
