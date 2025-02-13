import AWS from "aws-sdk";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import fs from "fs";
import multer from "multer";
const app = express();
dotenv.config();

const upload = multer({ dest: "uploads" });

//configure aws
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_ACCESS_SECRET_KEY,
  region: process.env.AWS_REGION,
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

  return await s3.upload(params).promise();
};

//upload file to S3
app.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    try {
      const data = await uploadToAwsS3(file);

      //unlink file
      fs.unlinkSync(file.path);

      res.status(200).json({
        message: "File upload successfully",
        data: data.Location,
      });
    } catch (error) {
      if (fs.existsSync(file?.path)) {
        fs.unlinkSync(file?.path);
      }
      res.status(404).json({ message: "File upload error" });
    }
  }
);

//getting server alive response
app.get("/", (req: Request, res: Response) => {
  res.send("Server alive:)");
});

//listening
app.listen(process.env.PORT, () => {
  console.log(`Application running port: ${process.env.PORT}`);
});
