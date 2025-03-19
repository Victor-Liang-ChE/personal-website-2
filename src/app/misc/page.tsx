import React from 'react';
import Link from "next/link";

export default function MiscPage() {
  return (
    <div className="min-h-screen bg-[#1E90FF] text-white font-['Merriweather']">
      {/* Navbar */}
      <nav className="bg-[#4DA6FF] p-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Victor Liang
        </Link>
        <div className="space-x-6">
          <Link href="/simulations" className="hover:underline">Simulations</Link>
          <Link href="/misc" className="hover:underline">Misc</Link>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto p-6 pt-12">
        <h1 className="text-3xl font-bold mb-8">Miscellaneous Projects</h1>
        
        <p className="text-xl">This page is currently under construction. Check back soon for more content!</p>
      </main>
    </div>
  );
}
