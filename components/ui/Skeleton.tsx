import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  count?: number; // Number of lines/items to render
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'text', count = 1 }) => {
  
  const getBaseClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'h-4 rounded w-3/4'; // Default text width
      case 'card':
        return 'rounded-xl h-full w-full';
      case 'rectangular':
      default:
        return 'rounded-md';
    }
  };

  const renderSkeleton = (key: number) => {
    // Card Variant is a composite skeleton
    if (variant === 'card') {
      return (
        <div key={key} className={`bg-white p-4 rounded-xl border border-gray-100 space-y-3 ${className}`}>
           {/* Image Placeholder */}
           <div className="bg-gray-200 h-32 w-full rounded-lg animate-pulse"></div>
           {/* Title Placeholder */}
           <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
           {/* Meta Placeholder */}
           <div className="flex gap-2">
              <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
           </div>
        </div>
      );
    }

    // Standard Variants
    return (
      <div 
        key={key} 
        className={`bg-gray-200 animate-pulse ${getBaseClasses()} ${className}`}
      />
    );
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => renderSkeleton(index))}
    </>
  );
};

export default Skeleton;