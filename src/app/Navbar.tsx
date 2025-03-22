'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Define page titles mapping
const pageTitles: Record<string, string> = {
  '/': 'Welcome',
  '/home': 'Welcome', // Added home path with Welcome title
  '/simulations': 'Chemical Engineering Simulations',
  '/misc': 'Miscellaneous',
  '/simulations/mccabe-thiele': 'McCabe-Thiele Diagram'
};

export default function Navbar({ 
  children,
  customTitle
}: { 
  children: React.ReactNode,
  customTitle?: string
}) {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const pathname = usePathname() || '/';
  
  // Get current page title
  const pageTitle = customTitle || pageTitles[pathname] || '';
  
  // Initialize dark mode from localStorage when component mounts
  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
  }, []);

  // Update body class and localStorage when dark mode changes
  useEffect(() => {
    if (mounted) {
      if (darkMode) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
      } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
      }
      localStorage.setItem('darkMode', darkMode.toString());
    }
  }, [darkMode, mounted]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <>
      {/* Use a static classname that won't change between SSR and hydration */}
      <div id="background-overlay" />
      <div className={`navbar-wrapper ${mounted ? (darkMode ? 'dark-mode' : 'light-mode') : 'dark-mode'}`}>
        <Link href="/" className="navbar-brand">Victor Liang</Link>
        
        {pageTitle && (
          <div className="page-title">{pageTitle}</div>
        )}
        
        <nav className="navbar">
          <Link href="/simulations" className="nav-link">Simulations</Link>
          <Link href="/misc" className="nav-link">Misc</Link>
          <button 
            onClick={toggleDarkMode} 
            className="dark-mode-toggle"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              // Moon icon shown in dark mode
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              // Sun icon shown in light mode
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </nav>
      </div>
      
      <style jsx>{`
        .navbar-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1.5rem;
          background-color: #0c2d48;
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          height: 65px; /* Fixed height to prevent layout shift */
          overflow: hidden; /* Prevent scrolling in navbar */
        }
        
        .navbar-wrapper.light-mode {
          background-color: #e6f7ff;
          border-bottom: 1px solid #d1e8ff;
        }
        
        .navbar-brand {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          text-decoration: none;
        }
        
        .light-mode .navbar-brand {
          color: #0c2d48;
        }
        
        .navbar {
          display: flex;
          gap: 1.5rem;
          align-items: center;
          margin-right: 20px; /* Add margin to the right for better spacing */
        }
        
        .nav-link {
          color: white;
          text-decoration: none;
          font-weight: 500;
        }
        
        .light-mode .nav-link {
          color: #0c2d48;
        }
        
        .dark-mode-toggle {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
        }
        
        .light-mode .dark-mode-toggle {
          color: #0c2d48;
        }
        
        .page-title {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.35rem; /* Reduced font size */
          font-weight: 600;
          color: white;
          width: auto;
          white-space: nowrap;
          text-align: center; /* Ensure text is centered */
          max-width: 60%; /* Limit width to prevent overlap */
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .light-mode .page-title {
          color: #0c2d48;
        }
        
        @media (max-width: 768px) {
          .page-title {
            display: none;
          }
        }

        /* Ensure body doesn't have horizontal scroll */
        :global(body) {
          overflow-x: hidden;
          max-width: 100vw;
        }
        
        /* Ensure content is properly constrained */
        :global(#__next), :global(main) {
          max-width: 100%;
          overflow-x: hidden;
        }
      `}</style>
      
      {children}
    </>
  );
}