import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    if (!user) {
      setConsentChecked(true);
      return;
    }

    supabase
      .from('consent_records')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasConsent(!!data);
        setConsentChecked(true);
      });
  }, [user]);

  if (loading || !consentChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If no consent and not already on consent page, redirect
  if (!hasConsent && location.pathname !== '/consent') {
    return <Navigate to="/consent" replace />;
  }

  return <>{children}</>;
}
