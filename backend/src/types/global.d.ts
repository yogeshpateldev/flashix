// Global type augmentations for the Flashix backend
// This file ensures Express.Multer.File and other global types are always available.

import 'multer'; // ensures @types/multer augments Express namespace

declare global {
    namespace Express {
        // Multer augmentation — adds file/files to Express.Request
        namespace Multer {
            interface File {
                fieldname: string;
                originalname: string;
                encoding: string;
                mimetype: string;
                size: number;
                destination: string;
                filename: string;
                path: string;
                buffer: Buffer;
            }
        }

        // requestId is added by our middleware in app.ts
        interface Request {
            requestId: string;
        }
    }
}

export { };
