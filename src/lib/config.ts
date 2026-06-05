export const CLOUD_CONFIG = {
  ACCOUNT_A: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ""
  },
  ACCOUNT_B: {
    cloudName: "dwwusk8rq",
    uploadPreset: "hariom_upload"
  }
};
