import { useState } from 'react';
import { useNavigate } from 'react-router';

import { DefaultButton } from '~/components/ui/default-button';

import { useAuth } from '../firebase/auth-provider';

export default function LogOut() {
  const { onLogout } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      await onLogout();
      navigate('/login');
    } catch (err: any) {
      setError(err.code);
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <DefaultButton
        text={loading ? 'Logout...' : 'Logout'}
        handleClick={handleLogout}
        disabled={loading}
      />
      {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}
    </div>
  );
}
