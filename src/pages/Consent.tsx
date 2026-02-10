import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, FileText } from 'lucide-react';

const Consent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!agreed || !user) return;
    setIsSubmitting(true);

    try {
      // Check if consent already exists
      const { data: existing } = await supabase
        .from('consent_records')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        navigate('/');
        return;
      }

      const { error } = await supabase
        .from('consent_records')
        .insert({ user_id: user.id });

      if (error) {
        toast.error('Failed to save consent. Please try again.');
        console.error('Consent error:', error);
      } else {
        toast.success('Thank you! You can now use the app.');
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-mono">
            Informed Consent
          </h1>
          <p className="text-sm text-muted-foreground">
            Eye-Wellness Browser Pilot Participation
          </p>
        </div>

        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border/50 space-y-5 text-sm text-foreground leading-relaxed">
          <p>
            You are invited to participate in a pilot evaluation of an eye-wellness browser designed to promote healthy screen-use habits and reduce digital eye strain.
          </p>

          <p>
            By agreeing to participate, you consent to: The anonymous collection of usage data (e.g. frequency of use, completion of eye exercises, break adherence) and voluntary questionnaire responses related to eye comfort, usability, and satisfaction.
          </p>

          <div className="space-y-2">
            <p className="font-semibold">The collected data will be:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Used only for research, evaluation, and future development purposes</li>
              <li>Analysed in an anonymised and aggregated manner</li>
              <li>Potentially included in academic reports or publications, with no personally identifiable information disclosed</li>
            </ul>
          </div>

          <p>
            Participation is entirely voluntary. You may withdraw at any time by discontinuing use of the browser. This study involves minimal risk, comparable to normal screen use, and does not involve medical diagnosis or treatment.
          </p>

          <div className="space-y-2">
            <p className="font-semibold">By proceeding, you confirm that:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You are 18 years of age or older</li>
              <li>You have read and understood the information above</li>
              <li>You voluntarily agree to participate in this pilot study</li>
            </ul>
          </div>

          <div className="border-t border-border pt-5 mt-5">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <Checkbox
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5"
              />
              <span className="text-foreground font-medium">
                I agree to participate and provide my informed consent
              </span>
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!agreed || isSubmitting}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              <>
                <Eye className="w-5 h-5" />
                Continue to App
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Consent;
