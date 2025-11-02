'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated and is faculty
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');

    if (!user || !token) {
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(user);
      if (userData.role !== 'faculty') {
        // Redirect to appropriate dashboard based on role
        switch (userData.role) {
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'hod':
            router.push('/hod/dashboard');
            break;
          case 'student':
            router.push('/student/dashboard');
            break;
          case 'club_incharge':
            router.push('/clubs/dashboard');
            break;
          default:
            router.push('/auth/login');
        }
        return;
      }
    } catch (error) {
      router.push('/auth/login');
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Faculty Navigation Header */}
      <header className="topnav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Faculty Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                Notifications
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                Profile
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  router.push('/auth/login');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Faculty Sidebar Navigation */}
      <div className="flex">
        <nav className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <a href="/faculty/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/faculty/attendance" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  My Classes
                </a>
              </li>
              <li>
                <a href="/faculty/permissions" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Permission Requests
                </a>
              </li>
              <li>
                <a href="/faculty/marks" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Student Marks
                </a>
              </li>
              <li>
                <a href="/faculty/reports" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Reports
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}