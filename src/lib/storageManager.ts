/**
 * Storage Manager for Zenvidia
 * Cycles between two Cloudinary accounts to manage free-tier limits.
 */

import { CLOUD_CONFIG } from './config';

// Using a simple local storage key to track which active account to use next
const ACCOUNT_INDEX_KEY = 'zenvidia_upload_account_index';

function getNextAccount() {
  let currentIndex = 0;
  
  if (typeof window !== 'undefined') {
    const storedIndex = localStorage.getItem(ACCOUNT_INDEX_KEY);
    if (storedIndex) {
      currentIndex = parseInt(storedIndex, 10);
    }
    
    // Cycle to the next valid index
    const nextIndex = (currentIndex + 1) % 2;
    localStorage.setItem(ACCOUNT_INDEX_KEY, nextIndex.toString());
  }

  const accountKeys = Object.keys(CLOUD_CONFIG);
  const selectedKey = accountKeys[currentIndex] as keyof typeof CLOUD_CONFIG;
  return { id: selectedKey, ...CLOUD_CONFIG[selectedKey] };
}

/**
 * Handles media upload to Cloudinary.
 * Alternates between predefined accounts with each call.
 * 
 * @param file The file to upload (File or Blob)
 * @param resourceType The type of media ('image', 'video', 'auto')
 * @returns A Promise resolving to the Cloudinary secure URL natively or the full response object
 */
export async function uploadMedia(
  file: File | Blob, 
  resourceType: 'image' | 'video' | 'auto' = 'auto'
): Promise<any> {
  const account = getNextAccount();
  
  console.log(`[StorageManager] Current Account: ${account.id} (Cloud Name: ${account.cloudName})`);
  console.log(`[StorageManager] UPLOAD_START`);

  const formData = new FormData();
  formData.append('file', file);
  if (account.uploadPreset) {
    formData.append('upload_preset', account.uploadPreset);
  }

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${account.cloudName}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    console.log(`[StorageManager] UPLOAD_SUCCESS`);
    return { ...data };
  } catch (error) {
    console.log(`[StorageManager] UPLOAD_FAILED with ${account.id}, falling back to ACCOUNT_A`);
    
    // Fallback to ACCOUNT_A
    const fallbackAccount = { id: 'ACCOUNT_A', ...CLOUD_CONFIG['ACCOUNT_A'] };
    console.log(`[StorageManager] Current Account: ${fallbackAccount.id} (Cloud Name: ${fallbackAccount.cloudName})`);
    
    const fallbackFormData = new FormData();
    fallbackFormData.append('file', file);
    if (fallbackAccount.uploadPreset) {
      fallbackFormData.append('upload_preset', fallbackAccount.uploadPreset);
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${fallbackAccount.cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: fallbackFormData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.log(`[StorageManager] UPLOAD_FAILED (Fallback)`);
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      console.log(`[StorageManager] UPLOAD_SUCCESS (Fallback)`);
      return { ...data };
    } catch (fallbackError) {
      console.log(`[StorageManager] UPLOAD_FAILED (Fallback)`);
      throw fallbackError;
    }
  }
}

