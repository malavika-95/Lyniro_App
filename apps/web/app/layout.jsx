'use client';

import "./globals.css";
import { AppGenProvider } from "@/components/appgen-provider";
import ImpersonationBanner from "@/components/impersonation-banner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Loader } from "lucide-react";

function AuthProtection({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Public routes that don't require auth
  const publicRoutes = ['/csm-login', '/customer-login', '/forgot-password', '/reset-password', '/vendor-onboarding', '/accept-invite', '/lyniro-admin'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
  
  // Customer-facing routes (check customer session instead)
  const customerRoutes = ['/customer'];
  const isCustomerRoute = customerRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  // CSM/Vendor routes (check CSM session)
  const csmRoutes = ['/dashboard', '/plans', '/settings', '/team', '/templates', '/messages', '/analytics', '/setup'];
  const isCsmRoute = csmRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        if (isCustomerRoute) {
          // Check customer session
          const response = await fetch('/api/auth/customer-session');
          if (response.ok) {
            setIsAuthenticated(true);
          } else {
            router.push('/customer-login');
          }
        } else if (isCsmRoute) {
          // Check CSM session
          const response = await fetch('/api/auth/csm-session');
          if (response.ok) {
            setIsAuthenticated(true);
          } else {
            router.push('/csm-login');
          }
        } else {
          // Default: try CSM session
          const response = await fetch('/api/auth/csm-session');
          if (response.ok) {
            setIsAuthenticated(true);
          } else {
            router.push('/csm-login');
          }
        }
      } catch (err) {
        if (isCustomerRoute) {
          router.push('/customer-login');
        } else {
          router.push('/csm-login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [pathname, isPublicRoute, isCustomerRoute, isCsmRoute, router]);

  // Show loading while checking auth
  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <ImpersonationBanner />
      {children}
    </Suspense>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Lyniro</title>
        <meta name="description" content="Built with AppGen" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        <script src="https://unpkg.com/@phosphor-icons/web"></script>
      </head>
      <body className="antialiased">
        <AppGenProvider>
          <AuthProtection>{children}</AuthProtection>
        </AppGenProvider>
      </body>
    </html>
  );
}
