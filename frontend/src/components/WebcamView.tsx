import React, { useRef, useEffect } from 'react';

interface WebcamViewProps {
  stream?: MediaStream | null;
  fallbackUrl: string;
  className?: string;
  alt?: string;
  onError?: () => void;
  onLoad?: () => void;
}

export const WebcamView: React.FC<WebcamViewProps> = ({
  stream,
  fallbackUrl,
  className = "w-full h-full object-cover",
  alt = "Candidate camera stream",
  onError,
  onLoad
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn("Autoplay video error:", err);
      });
    }
  }, [stream]);

  if (stream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={className}
      />
    );
  }

  return (
    <img
      src={fallbackUrl}
      alt={alt}
      className={className}
      onError={onError}
      onLoad={onLoad}
    />
  );
};
