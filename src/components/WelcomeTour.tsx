import React, { useState } from 'react';

interface WelcomeTourProps {
  userRole: 'BRAND' | 'CREATOR';
  onClose: () => void;
}

const brandSteps = [
  {
    emoji: '👋',
    title: 'Welcome to Zenvidia!',
    description: 'Northeast India ka pehla influencer marketplace. Yahan local creators aapke brand ke liye kaam karte hain.'
  },
  {
    emoji: '🔍',
    title: 'Creators Dhundho',
    description: 'Marketplace mein browse karo. Niche, city, followers ke hisaab se filter karo. Apne brand ke liye perfect creator dhundho.'
  },
  {
    emoji: '💰',
    title: 'Offer Bhejo & Deal Karo',
    description: '"Send Offer" dabao → advance pay + bonus set karo → deal lock karo → certificate download karo. Itna simple!'
  }
];

const creatorSteps = [
  {
    emoji: '🎉',
    title: 'Welcome Creator!',
    description: 'Zenvidia pe aane ke liye shukriya! Yahan local brands tujhe dhundhte hain collab ke liye.'
  },
  {
    emoji: '📸',
    title: 'Profile Complete Karo',
    description: 'Settings mein jaao → Instagram URL, YouTube link, aur Behold Feed ID daalo. Zyada complete profile = zyada offers!'
  },
  {
    emoji: '🤝',
    title: 'Deals Accept Karo',
    description: 'Brand offer bhejega → Chat mein terms negotiate karo → Deal lock karo → Paisa lo! Zenvidia sirf 5% lega.'
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
