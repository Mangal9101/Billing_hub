'use client';

import React, { memo, useMemo } from 'react';
import AppIcon from './AppIcon';
import AppImage from './AppImage';

interface AppLogoProps {
  src?: string;
  iconName?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  showBrandName?: boolean;
}

const AppLogo = memo(function AppLogo({
  src = '/assets/images/app_logo.png',
  iconName = 'SparklesIcon',
  size = 64,
  className = '',
  onClick,
  showBrandName = false,
}: AppLogoProps) {
  const containerClassName = useMemo(() => {
    const classes = ['flex', 'flex-col', 'items-center'];
    if (onClick) classes.push('cursor-pointer', 'hover:opacity-80', 'transition-opacity');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [onClick, className]);

  return (
    <div className={containerClassName} onClick={onClick}>
      {src ? (
        <AppImage
          src={src}
          alt="Billing Hub logo"
          width={size}
          height={size}
          className="flex-shrink-0"
          priority={true}
          unoptimized={src.endsWith('.svg')}
        />
      ) : (
        <AppIcon name={iconName} size={size} className="flex-shrink-0" />
      )}

      {showBrandName && (
        <>
          <span className="font-bold text-xl leading-tight mt-2">Billing Hub</span>
          <span className="text-sm font-medium opacity-70 mt-0.5">BILL. MANAGE. GROW.</span>
        </>
      )}
    </div>
  );
});

export default AppLogo;
