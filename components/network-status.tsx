"use client";

import { useState, useEffect } from 'react';
import { isOnline } from '@/lib/offline-utils';

export default function NetworkStatus() {
  const [online, setOnline] = useState<boolean>(true);
  
  useEffect(() => {
    // Başlangıçta çevrimiçi durumunu kontrol et
    setOnline(isOnline());
    
    // Çevrimiçi/çevrimdışı durumunu dinle
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (online) {
    return null; // Çevrimiçiyse hiçbir şey gösterme
  }
  
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-yellow-500 text-white p-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Çevrimdışı moddasınız - Bazı özellikler sınırlı olabilir</span>
      </div>
    </div>
  );
} 