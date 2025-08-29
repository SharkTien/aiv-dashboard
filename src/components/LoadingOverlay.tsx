"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number; // 0-100
  showProgress?: boolean;
}

export default function LoadingOverlay({ isVisible, message = "Loading...", progress, showProgress = false }: LoadingOverlayProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setDisplayedText("");
      setCurrentIndex(0);
      return;
    }

    if (currentIndex < message.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + message[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isVisible, message, currentIndex]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          {/* GIF Animation */}
          <div className="relative w-24 h-24">
            <Image
              src="/giphy2.gif"
              alt="Loading animation"
              fill
              className="object-contain rounded-lg"
              priority
            />
          </div>

          {/* Animated Text */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Importing Data
            </h3>
            <div className="h-6 flex items-center justify-center">
              <span className="text-lg text-gray-600 dark:text-gray-300 font-mono">
                {displayedText}
                <span className="animate-pulse">|</span>
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
              style={{ 
                width: showProgress && progress !== undefined ? `${progress}%` : '100%',
                animation: showProgress && progress !== undefined ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            ></div>
          </div>
          {showProgress && progress !== undefined && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(progress)}% complete
            </div>
          )}

          {/* Status Message */}
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Please wait while we process your data...
          </p>
        </div>
      </div>
    </div>
  );
}
