
import React from 'react';

interface GymLogoProps {
  gymName: string;
  small?: boolean;
}

export const GymLogo: React.FC<GymLogoProps> = ({ gymName, small = false }) => {
  // Get first letter of gym name for logo
  const initial = gymName.charAt(0).toUpperCase();
  
  return (
    <div className="flex items-center gap-2">
      <div className={`${small ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm'} bg-primary rounded-md flex items-center justify-center`}>
        <span className="text-white font-bold">{initial}</span>
      </div>
      <span className={`font-medium ${small ? 'text-sm' : 'text-base'}`}>{gymName}</span>
    </div>
  );
};
