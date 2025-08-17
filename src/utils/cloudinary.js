import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file uploaded successfully
        //console.log("file is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) return null;
        
        // Extract public_id from URL
        const urlParts = fileUrl.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        
        // Auto-detect resource type from URL
        let resourceType = "auto";
        if (fileUrl.includes('/video/upload/')) {
            resourceType = "video";
        } else if (fileUrl.includes('/image/upload/')) {
            resourceType = "image";
        }
        
        console.log(`Deleting ${resourceType}:`, publicId);
        
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });
        
        console.log('Deletion result:', result);
        return result;
        
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        return null;
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}