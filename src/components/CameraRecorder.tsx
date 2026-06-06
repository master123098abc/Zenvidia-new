import React, { useState, useRef, useEffect } from 'react';
import { saveDraft } from '../lib/draftsManager';
import { Square, AlertCircle, CheckCircle2, X, RefreshCw } from 'lucide-react';

interface CameraRecorderProps {
  onClose: () => void;
}

export const CameraRecorder: React.FC<CameraRecorderProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [recordingTime, setRecordingTime] = useState(0);
  const [maxTime] = useState(60); // 60 second max
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [zoom, setZoom] = useState(1);
  const [lastDistance, setLastDistance] = useState(0);
  const [beautyMode, setBeautyMode] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{x: number, y: number} | null>(null);

  const filters = [
    { name: '✨ Clear', value: 'none', css: 'none', preview: 'bg-white' },
    { name: '🌸 Bloom', value: 'bloom', css: 'brightness(1.15) saturate(1.3) contrast(0.95) hue-rotate(340deg)', preview: 'bg-pink-200' },
    { name: '🌙 Moon', value: 'moon', css: 'brightness(0.9) saturate(0.8) contrast(1.1) hue-rotate(200deg)', preview: 'bg-blue-200' },
    { name: '☀️ Golden', value: 'golden', css: 'brightness(1.1) saturate(1.4) sepia(0.3) contrast(1.05)', preview: 'bg-yellow-200' },
    { name: '🌿 Fresh', value: 'fresh', css: 'brightness(1.05) saturate(1.5) hue-rotate(30deg) contrast(1.1)', preview: 'bg-green-200' },
    { name: '💜 Dream', value: 'dream', css: 'brightness(1.1) saturate(1.2) hue-rotate(280deg) contrast(0.95)', preview: 'bg-purple-200' },
    { name: '🖤 Noir', value: 'noir', css: 'grayscale(1) contrast(1.3) brightness(0.9)', preview: 'bg-neutral-400' },
    { name: '🌺 Rose', value: 'rose', css: 'brightness(1.1) saturate(1.6) hue-rotate(330deg) contrast(1.0)', preview: 'bg-rose-200' },
    { name: '❄️ Ice', value: 'ice', css: 'brightness(1.2) saturate(0.7) contrast(1.1) hue-rotate(190deg)', preview: 'bg-cyan-100' },
    { name: '🔥 Vibe', value: 'vibe', css: 'brightness(1.05) saturate(2) contrast(1.2)', preview: 'bg-orange-300' },
  ];

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facing]);

  const flipCamera = async () => {
    stopCamera();
    setFacing(f => f === 'user' ? 'environment' : 'user');
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
          frameRate: { ideal: 60, max: 60 },
          aspectRatio: { ideal: 9/16 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
      setError(null);
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Camera access denied or unavailable. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    chunksRef.current = [];
    const stream = videoRef.current.srcObject as MediaStream;
    
    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        try {
          await saveDraft(videoBlob, selectedFilter, recordingTime);
          showToast('Saved to Drafts');
        } catch (err) {
          console.error('Failed to save draft', err);
          showToast('Failed to save draft');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= maxTime - 1) {
            stopRecording();
            return 0;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start recording', err);
      setError('Failed to start recording. Format may not be supported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Camera Unavailable</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <div className="flex gap-4">
          <button 
            onClick={startCamera}
            className="px-6 py-3 bg-neutral-800 rounded-full font-semibold hover:bg-neutral-700 transition"
          >
            Try Again
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-red-500/20 text-red-500 rounded-full font-semibold hover:bg-red-500/30 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentFilterCss = filters.find(f => f.value === selectedFilter)?.css || 'none';
  const beautyCSS = beautyMode ? 'brightness(1.08) contrast(0.95) blur(0.3px)' : '';

  return (
    <div className="fixed inset-0 z-[100] w-full min-h-screen bg-black flex flex-col">
      {/* Top Controls */}
      <div className="absolute top-safe top-4 left-0 right-0 flex justify-between px-4 z-20">
        <button onClick={onClose} className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
        
        {isRecording && (
          <span className="text-white font-mono text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
            {String(Math.floor(recordingTime/60)).padStart(2,'0')}:{String(recordingTime % 60).padStart(2,'0')} / 01:00
          </span>
        )}

        <button onClick={flipCamera} className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-white" />
        </button>
      </div>

      <button
        onClick={() => setBeautyMode(b => !b)}
        className={`absolute top-16 right-4 z-20
                    w-10 h-10 rounded-full
                    flex flex-col items-center justify-center
                    text-xs font-bold transition
        ${beautyMode 
          ? 'bg-pink-500 text-white' 
          : 'bg-black/50 text-neutral-400'}`}>
        ✨
        <span style={{ fontSize: '8px' }}>
          {beautyMode ? 'ON' : 'OFF'}
        </span>
      </button>

      {zoom > 1 && (
        <div className="absolute top-16 left-1/2 
                        -translate-x-1/2 z-20
                        bg-black/60 px-3 py-1 rounded-full">
          <span className="text-white text-sm font-bold">
            {zoom.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Progress Bar (when recording) */}
      {isRecording && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-800 z-20">
          <div 
            className="h-full bg-red-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(recordingTime / maxTime) * 100}%` }}
          />
        </div>
      )}

      {/* Video Preview */}
      <div 
        className="flex-1 relative overflow-hidden bg-black flex items-center justify-center"
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            setLastDistance(dist);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2) {
            const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = dist / lastDistance;
            setZoom(z => Math.min(Math.max(z * delta, 1), 5));
            setLastDistance(dist);
          }
        }}
        onDoubleClick={() => setZoom(1)}
        onTouchEnd={(e) => {
          if (e.touches.length === 0 && 
              e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            setFocusPoint({
              x: touch.clientX - rect.left,
              y: touch.clientY - rect.top,
            });
            setTimeout(() => setFocusPoint(null), 1000);
          }
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ 
            filter: `${currentFilterCss} ${beautyCSS}`.trim(),
            transform: `scale(${zoom})`,
            transition: 'filter 0.3s ease'
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {focusPoint && (
          <div 
            className="absolute w-16 h-16 border-2 
                       border-yellow-400 rounded-sm
                       pointer-events-none z-20
                       animate-ping"
            style={{ 
              left: focusPoint.x - 32, 
              top: focusPoint.y - 32 
            }}
          />
        )}
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-16 right-6 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full z-10">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-medium">REC</span>
          </div>
        )}
      </div>

      {/* Filters & Controls Container */}
      <div className="bg-black pb-8 pt-4 relative z-10 w-full">
        {/* Filters */}
        {!isRecording && (
          <div className="absolute bottom-32 left-0 right-0 z-20">
            <div className="flex gap-3 overflow-x-auto 
                            px-4 pb-2 hide-scrollbar">
              {filters.map(f => (
                <button 
                  key={f.value}
                  onClick={() => setSelectedFilter(f.value)}
                  className="flex-shrink-0 flex flex-col 
                             items-center gap-1">
                  
                  {/* Filter preview circle */}
                  <div className={`w-14 h-14 rounded-full 
                                  border-3 transition-all
                                  ${selectedFilter === f.value 
                                    ? 'border-white scale-110 shadow-lg' 
                                    : 'border-transparent'}`}>
                    <div className={`w-full h-full rounded-full 
                                     ${f.preview} relative overflow-hidden`}>
                      {/* Mini camera icon inside */}
                      <div className="absolute inset-0 flex items-center 
                                      justify-center text-xs text-black font-bold opacity-30">
                        {f.name.split(' ')[0]}
                      </div>
                    </div>
                  </div>
                  
                  {/* Filter name */}
                  <span className={`text-xs font-medium transition
                  ${selectedFilter === f.value 
                    ? 'text-white' 
                    : 'text-neutral-400'}`}>
                    {f.name.split(' ')[1]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Record Button */}
        <div className="flex items-center justify-center h-20">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={!streamActive}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            >
              <div className="w-[68px] h-[68px] rounded-full border-[3px] border-black flex items-center justify-center bg-transparent">
                 <div className="w-16 h-16 rounded-full bg-red-500 shadow-md" />
              </div>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform backdrop-blur-md"
            >
              <div className="w-[68px] h-[68px] rounded-full border-[3px] border-black flex items-center justify-center bg-white">
                <Square className="w-8 h-8 text-black fill-current" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 bg-neutral-800 text-white px-5 py-3 rounded-full flex items-center gap-3 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="font-bold text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
