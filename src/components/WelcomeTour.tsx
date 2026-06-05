import React, { useState } from 'react';

interface WelcomeTourProps {
  userRole: 'BRAND' | 'CREATOR';
  onClose: () => void;
}

const brandSteps = [
  {
    emoji: '👋',
    title: 'Welcome to Zenvidia!',
    description: "Northeast India's premier influencer marketplace. Connect with verified local creators to elevate your brand."
  },
  {
    emoji: '🔍',
    title: 'Discover Talented Creators',
    description: 'Browse the marketplace and filter by niche, city, or followers to find the perfect match for your brand campaigns.'
  },
  {
    emoji: '💰',
    title: 'Send Offers & Finalize Deals',
    description: 'Click "Send Offer", set an advance payment and performance bonuses, lock the deal, and automatically generate a digital certificate.'
  }
];

const creatorSteps = [
  {
    emoji: '🎉',
    title: 'Welcome, Creator!',
    description: 'Thank you for joining Zenvidia! Local brands are actively looking to collaborate with you.'
  },
  {
    emoji: '📸',
    title: 'Complete Your Profile',
    description: 'Go to Settings and add your Instagram URL, YouTube link, and Behold Feed ID. A complete profile attracts more offers!'
  },
  {
    emoji: '🤝',
    title: 'Accept Deals & Get Paid',
    description: 'Receive brand offers, negotiate terms in chat, finalize the deal, and get paid! Zenvidia only takes a minimal 5% platform fee.'
  }
];

export default function WelcomeTour({ userRole, onClose }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = userRole === 'BRAND' ? brandSteps : creatorSteps;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden">
        
        {/* Steps indicator */}
        <div className="flex gap-1.5 p-4 pb-0">
          {steps.map((_, i) => (
            <div key={i}
                 className={`h-1 flex-1 rounded-full transition-all duration-300
                 ${i <= currentStep ? 'bg-cyan-500' : 'bg-neutral-700'}`} />
          ))}
        </div>

        {/* Step content */}
        <div className="p-6">
          <div className="text-5xl mb-4 text-center">
            {steps[currentStep].emoji}
          </div>
          <h2 className="text-white text-xl font-black text-center mb-2">
            {steps[currentStep].title}
          </h2>
          <p className="text-neutral-400 text-sm text-center leading-relaxed">
            {steps[currentStep].description}
          </p>

          {/* CTA for last step */}
          {currentStep === steps.length - 1 && (
            <button
              onClick={() => {
                localStorage.setItem('zenvidia_seen_onboarding', 'true');
                onClose();
              }}
              className="w-full mt-6 py-4 bg-gradient-to-r from-cyan-500 to-orange-500 text-white font-black rounded-2xl text-base shadow-lg">
              {userRole === 'BRAND' ? "🚀 Find My First Creator!" : "🎨 Start Getting Paid!"}
            </button>
          )}

          {/* Next button for other steps */}
          {currentStep < steps.length - 1 && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  localStorage.setItem('zenvidia_seen_onboarding', 'true');
                  onClose();
                }}
                className="flex-1 py-3 border border-neutral-700 text-neutral-500 rounded-2xl text-sm">
                Skip
              </button>
              <button
                onClick={() => setCurrentStep(s => s + 1)}
                className="flex-2 flex-1 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-2xl text-sm font-bold">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
