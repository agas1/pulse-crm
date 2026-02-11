import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <ShieldX className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
        Acesso Restrito
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
        Voce nao tem permissao para acessar esta pagina. Entre em contato com o administrador.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-5 py-2.5 text-sm font-medium text-white rounded-lg"
        style={{ backgroundColor: '#3b82f6' }}
      >
        Voltar ao Dashboard
      </button>
    </div>
  );
}
