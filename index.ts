import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import fs from "fs";
import multer from "multer";
const app = express();
dotenv.config();

const upload = multer({ dest: "uploads" });

//configure aws for S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_ACCESS_SECRET_KEY || "",
  },
});

const uploadToAwsS3 = async (file: any) => {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME IS NOT SET");
  }

  const params = {
    Bucket: bucketName,
    Key: `${Date.now()}_${file.originalname}`,
    Body: fs.createReadStream(file.path),
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  //unlink file
  fs.unlinkSync(file.path);
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};

//upload file to S3
app.post(
  "/upload",
  upload.array("file"),
  async (req: Request, res: Response): Promise<void> => {
    const files = req.files as [];
    const fileUrls = [];
    if (!files) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    try {
      for (let file of files) {
        const data = await uploadToAwsS3(file);
        fileUrls.push(data);
      }

      res.status(200).json({
        message: "File upload successfully",
        data: fileUrls,
      });
    } catch (error) {
      // if (fs.existsSync(file?.path)) {
      //   fs.unlinkSync(file?.path);
      // }
      res.status(404).json({ message: "File upload error" });
    }
  }
);

//getting server alive response
app.get("/", (req: Request, res: Response) => {
  res.send("Server alive :)");
});

//listening
app.listen(process.env.PORT, () => {
  console.log(`Application running port: ${process.env.PORT}`);
});
