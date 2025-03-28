import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Navbar from './Navbar';

export const metadata: Metadata = {
  title: 'Victor Liang - Chemical Engineering Simulation Developer',
  description: 'Portfolio of Victor Liang, featuring chemical engineering simulations and projects',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navbar>
          {children}
        </Navbar>
      </body>
    </html>
  );
}
