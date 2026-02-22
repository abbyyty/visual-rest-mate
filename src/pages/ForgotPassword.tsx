import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Eye, User, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const resetSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password too long'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = resetSchema.safeParse({ username, email, newPassword, confirmPassword });
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { username: username.trim(), email: email.trim(), new_password: newPassword },
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Failed to reset password. Please check your details.');
      } else {
        toast.success('Password reset successful. Please log in with your new password.');
        navigate('/auth');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Eye className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-mono">Reset Password</h1>
          <p className="text-muted-foreground">Enter your username and email to reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-2xl border border-border/50">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" /> Username
            </label>
            <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} className={inputClass} placeholder="Your username" />
            {errors.username && <p className="text-destructive text-sm">{errors.username}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email
            </label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" /> New Password
            </label>
            <input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            {errors.newPassword && <p className="text-destructive text-sm">{errors.newPassword}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" /> Confirm New Password
            </label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full btn-primary flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
          </button>
        </form>

        <div className="text-center">
          <button onClick={() => navigate('/auth')} className="text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
