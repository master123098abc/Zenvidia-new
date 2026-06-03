export const uploadToCloudinary = async (
  file: File,
  resourceType: 'image' | 'video' | 'auto' = 'image'
): Promise<string> => {
  console.log("SENDING TO CLOUD:", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
  console.log("USING PRESET:", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  const data = await response.json();
  console.log("CLOUDINARY RESPONSE:", data);

  if (!response.ok) {
    throw new Error(data.error?.message || 'Upload failed');
  }

  if (!data.secure_url) throw new Error('No URL returned');
  return data.secure_url;
};
