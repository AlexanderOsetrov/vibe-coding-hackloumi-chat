'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  maxWidth = 300,
  maxHeight = 200,
  onLoad,
  onError,
  onClick,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    console.log(`🖼️ Image loaded successfully: ${src}`);
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    console.error(`❌ Image failed to load: ${src}`);
    setHasError(true);
    onError?.();
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden rounded-lg bg-zinc-800 ${className}`}
      style={{
        maxWidth: `${maxWidth}px`,
        maxHeight: `${maxHeight}px`,
        minHeight: '100px',
        minWidth: '150px',
      }}
    >
      {!isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin"></div>
        </div>
      )}

      {isInView && !hasError && (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin"></div>
            </div>
          )}
          <Image
            src={src}
            alt={alt}
            width={800}
            height={600}
            className={`max-w-full h-auto rounded-lg cursor-pointer ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{
              maxHeight: '400px',
              objectFit: 'contain'
            }}
            onLoad={handleLoad}
            onError={handleError}
            onClick={onClick}
            unoptimized
          />
        </>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-xs">Failed to load image</div>
          </div>
        </div>
      )}
    </div>
  );
} 