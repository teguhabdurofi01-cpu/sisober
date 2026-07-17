export type UploadInput={key:string;bytes:Buffer;mimeType:string;storedFilename:string;folderSegments:string[]};
export type UploadResult={fileId:string;parentId:string;webViewLink?:string};
export type DirectUploadInput={objectKey:string;mimeType:string;fileSize:number};
export interface DriveStorageAdapter{provider?:"mock"|"google"|"r2";upload(input:UploadInput):Promise<UploadResult>;open(fileId:string):Promise<{stream:NodeJS.ReadableStream;mimeType?:string}>;remove(fileId:string):Promise<void>;createDirectUpload?(input:DirectUploadInput):Promise<{url:string;headers:Record<string,string>}>;verifyDirectUpload?(objectKey:string):Promise<{fileSize:number;mimeType?:string}>;createDownloadUrl?(objectKey:string,filename:string,disposition:"inline"|"attachment"):Promise<string>;}
