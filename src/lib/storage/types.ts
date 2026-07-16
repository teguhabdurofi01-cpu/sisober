export type UploadInput={key:string;bytes:Buffer;mimeType:string;storedFilename:string;folderSegments:string[]};
export type UploadResult={fileId:string;parentId:string;webViewLink?:string};
export interface DriveStorageAdapter{upload(input:UploadInput):Promise<UploadResult>;open(fileId:string):Promise<{stream:NodeJS.ReadableStream;mimeType?:string}>;remove(fileId:string):Promise<void>;}
