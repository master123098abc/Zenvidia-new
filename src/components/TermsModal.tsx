import { X } from 'lucide-react';
import { useEffect } from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Terms & Conditions
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-neutral-700 dark:text-neutral-300">
          <p className="text-sm font-medium">By registering on Zenvidia, you agree to be bound by these 21 Terms and Conditions.</p>

          <ol className="list-decimal pl-5 space-y-4 text-sm marker:font-bold marker:text-cyan-500">
            {/* General Platform Usage */}
            <li><strong>Age Requirement:</strong> You must be at least 13 years old to use this platform. If you are under 18, you need parental consent for financial deals.</li>
            <li><strong>Registration:</strong> Users must provide accurate, current, and complete information during registration.</li>
            <li><strong>Admin Rights:</strong> Zenvidia reserves the right to suspend, ban, or delete any account without prior notice if suspicious activity is detected.</li>
            
            {/* Content & Media Rights */}
            <li><strong>Content Fetching:</strong> You explicitly grant Zenvidia permission to fetch, display, and embed your public posts and videos on your profile.</li>
            <li><strong>Admin Assistance:</strong> You authorize Zenvidia administrators to upload public content on your behalf to optimize your profile visibility.</li>
            <li><strong>Ownership:</strong> You retain complete ownership of your original content; Zenvidia does not claim copyright over your videos.</li>
            <li><strong>Promotional Use:</strong> Zenvidia holds the right to use your public profile data and fetched content for platform marketing and promotional purposes.</li>
            <li><strong>Content Responsibility:</strong> You are solely responsible for ensuring your content does not violate Instagram's or YouTube's original terms of service.</li>
            <li><strong>Prohibited Content:</strong> Uploading or linking NSFW (Not Safe For Work), adult, hateful, or illegal content will result in an instant permanent ban.</li>
            
            {/* Brand & Creator Deals */}
            <li><strong>Platform Role:</strong> Zenvidia acts strictly as a bridge/facilitator between Brands and Creators. We are not a direct party to your contracts.</li>
            <li><strong>Payment Liability:</strong> Zenvidia is not responsible for unpaid dues, delayed payments, or financial fraud committed by Brands.</li>
            <li><strong>Delivery of Work:</strong> Creators are legally bound to deliver the agreed-upon content or services to the Brand once a deal is accepted.</li>
            <li><strong>Off-Platform Deals:</strong> Any communication or monetary transaction conducted outside the Zenvidia platform is entirely at your own risk.</li>
            <li><strong>Fake Metrics:</strong> Creators found using bots, fake followers, or artificial engagement to secure deals will be permanently banned.</li>
            
            {/* Data Privacy & Account Security */}
            <li><strong>Data Storage:</strong> Your profile information is securely stored, but you acknowledge that no digital database is 100% immune to breaches.</li>
            <li><strong>Third-Party Logins:</strong> Logging in via Google means you agree to share your primary email and profile picture with Zenvidia.</li>
            <li><strong>Account Deletion:</strong> You have the right to request the deletion of your account and data at any time.</li>
            <li><strong>Password Security:</strong> You are strictly responsible for maintaining the confidentiality of your account credentials.</li>
            
            {/* Technical Limitations & Disclaimers */}
            <li><strong>Uptime & Third-Party Services:</strong> Zenvidia does not guarantee 100% server uptime and is not liable if third-party services experience outages affecting your profile display.</li>
            <li><strong>Data Loss:</strong> While we take precautions, Zenvidia is not liable for the accidental loss of profile data or deal history.</li>
            <li><strong>Dispute Resolution & Modifications:</strong> Any legal disputes will be subject to the jurisdiction of the courts in Assam, India. Zenvidia reserves the right to update these terms at any time.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
