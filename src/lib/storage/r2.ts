import "server-only";
import {Readable} from "node:stream";
import {DeleteObjectCommand,GetObjectCommand,HeadObjectCommand,PutObjectCommand,S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import type {DirectUploadInput,DriveStorageAdapter,UploadInput} from "./types";

export class R2Storage implements DriveStorageAdapter{
  provider="r2" as const;
  private client:S3Client;
  constructor(private bucket:string){const account=process.env.R2_ACCOUNT_ID,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY;if(!account||!accessKeyId||!secretAccessKey)throw new Error("R2 credentials are incomplete");this.client=new S3Client({region:"auto",endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}});}
  async upload(i:UploadInput){const objectKey=[...i.folderSegments,`${i.key}-${i.storedFilename}`].join("/");await this.client.send(new PutObjectCommand({Bucket:this.bucket,Key:objectKey,Body:i.bytes,ContentType:i.mimeType}));return{fileId:objectKey,parentId:i.folderSegments.join("/")};}
  async open(key:string){const result=await this.client.send(new GetObjectCommand({Bucket:this.bucket,Key:key}));return{stream:Readable.fromWeb(result.Body!.transformToWebStream() as never),mimeType:result.ContentType};}
  async remove(key:string){await this.client.send(new DeleteObjectCommand({Bucket:this.bucket,Key:key}));}
  async createDirectUpload(i:DirectUploadInput){return{url:await getSignedUrl(this.client,new PutObjectCommand({Bucket:this.bucket,Key:i.objectKey,ContentType:i.mimeType,ContentLength:i.fileSize}),{expiresIn:900}),headers:{"Content-Type":i.mimeType}};}
  async verifyDirectUpload(key:string){const result=await this.client.send(new HeadObjectCommand({Bucket:this.bucket,Key:key}));return{fileSize:Number(result.ContentLength||0),mimeType:result.ContentType};}
  async createDownloadUrl(key:string,filename:string,disposition:"inline"|"attachment"){return getSignedUrl(this.client,new GetObjectCommand({Bucket:this.bucket,Key:key,ResponseContentDisposition:`${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`}),{expiresIn:900});}
}
