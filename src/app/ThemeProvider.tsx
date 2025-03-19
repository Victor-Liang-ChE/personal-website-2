'use client';

import React, { useState, useEffect } from 'react';

export default function ThemeProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  
  // Initialize dark mode from localStorage when component mounts
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
    setMounted(true);
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

  // Remove the duplicate navbar
  useEffect(() => {
    const navbars = document.querySelectorAll('nav.bg-\\[\\#4DA6FF\\]');
    if (navbars.length > 0) {
      navbars.forEach(navbar => {
        navbar.remove();
      });
    }
  }, []);

  return (
    <>
      <div id="background-overlay" />
      <div className={`navbar-wrapper ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        <a href="/" className="navbar-brand">Victor Liang</a>
        <nav className="navbar">
          <a href="/simulations" className="nav-link">Simulations</a>
          <a href="/misc" className="nav-link">Misc</a>
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
      {children}
    </>
  );
}
