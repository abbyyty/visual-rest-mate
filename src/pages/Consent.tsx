import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function Consent() {
  const { user, username, loading } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleContinue = async () => {
    if (!agreed || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from('consent_records').insert({
        user_id: user.id,
        username: username ?? '',
        email: user.email ?? '',
        consent_given: true,
        consent_text_version: 'v1',
      } as any);
      window.location.href = '/';
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card border border-border rounded-lg p-6 md:p-8 space-y-6">
        <h1 className="text-xl font-bold text-foreground text-center">
          Informed Consent for Eye‑Wellness Browser Pilot Participation
        </h1>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed max-h-[50vh] overflow-y-auto pr-2">
          <p>
            You are invited to participate in a pilot evaluation of an eye‑wellness browser
            designed to promote healthy screen‑use habits and reduce digital eye strain.
          </p>
          <p>
            By agreeing to participate, you consent to: the anonymous collection of usage data
            (e.g. frequency of use, completion of eye exercises, break adherence) and voluntary
            questionnaire responses related to eye comfort, usability, and satisfaction.
          </p>
          <p>The collected data will be used only for research, evaluation, and future development purposes, analysed in an anonymised and aggregated manner, and may be included in academic reports or publications, with no personally identifiable information disclosed.</p>
          <p>
            Participation is entirely voluntary. You may withdraw at any time by discontinuing
            use of the browser. This study involves minimal risk, comparable to normal screen use,
            and does not involve medical diagnosis or treatment.
          </p>
          <p className="font-medium text-foreground">By proceeding, you confirm that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are 18 years of age or older</li>
            <li>You have read and understood the information above</li>
            <li>You voluntarily agree to participate in this pilot study</li>
          </ul>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <Checkbox
            id="consent-checkbox"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          <Label htmlFor="consent-checkbox" className="text-sm text-foreground cursor-pointer">
            I agree to participate and provide my informed consent
          </Label>
        </div>

        <Button
          className="w-full"
          disabled={!agreed || submitting}
          onClick={handleContinue}
        >
          {submitting ? 'Saving…' : 'Continue to the app'}
        </Button>
      </div>
    </div>
  );
}
