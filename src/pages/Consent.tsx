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
    const { error } = await supabase.from('consent_records').upsert({
      user_id: user.id,
      username: username ?? '',
      email: user.email ?? '',
      consent_given: true,
      consent_text_version: 'v2',
    } as any, { onConflict: 'user_id' });
    if (error) {
      console.error('Consent insert failed:', error);
      setSubmitting(false);
      return;
    }
    console.log('Consent v2 saved → navigating');
    window.location.href = '/';
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
            Please read the information below carefully before deciding whether to participate.
          </p>

          <p>
            The purpose of this pilot study is to evaluate the usability, effectiveness,
            and user experience of the eye‑wellness browser.
          </p>

          <p className="font-medium text-foreground">
            If you agree to participate, you consent to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The anonymous collection of usage data (e.g. frequency of use, completion of eye exercises, break adherence)</li>
            <li>Voluntary questionnaire responses related to eye comfort, usability, and satisfaction</li>
          </ul>

          <p>No medical diagnosis or treatment is provided as part of the study.</p>

          <p className="font-medium text-foreground">The collected data will:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Be analysed in an anonymised and aggregated manner</li>
            <li>Be stored securely and accessed only by the research team</li>
            <li>Be used only for research, evaluation, and future development purposes</li>
            <li>Potentially be included in academic reports or publications, without any personally identifiable information disclosed</li>
          </ul>

          <p>Data will be retained for 2 years and then securely deleted.</p>

          <p>
            This study involves minimal risk, comparable to normal screen use. There may be
            no direct personal benefit to you, but your participation may help improve digital
            wellness tools for future users.
          </p>

          <p>
            Participation is entirely voluntary. You may withdraw at any time by discontinuing
            use of the browser.
          </p>

          <p>
            If you choose to withdraw, you may request deletion of your previously collected
            data by contacting the research team at the email below (where feasible and before
            data aggregation). Choosing not to participate or withdrawing will involve no penalty
            or loss of benefits.
          </p>

          <p className="font-medium text-foreground">Eligibility</p>
          <p>You must be 18 years of age or older to participate.</p>

          <p className="font-medium text-foreground">Contact Information</p>
          <p>
            If you have any questions about this study, please contact:<br />
            eyedle.01@gmail.com
          </p>

          <p className="font-medium text-foreground">By selecting the option below, you confirm that:</p>
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
