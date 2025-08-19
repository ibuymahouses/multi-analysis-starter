import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Multi Analysis App
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/listings" className="text-gray-600 hover:text-gray-900">
                Listings
              </Link>
              <Link href="/comps" className="text-gray-600 hover:text-gray-900">
                Comps
              </Link>
              <Link href="/rental-rates" className="text-gray-600 hover:text-gray-900">
                Rental Rates
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Welcome, {user.firstName}!
                </div>
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
