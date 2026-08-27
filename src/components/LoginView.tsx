import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { School, Lock, User, Eye, EyeOff, KeyRound, AlertCircle, Shield, ChevronDown } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, allUsers, schoolName, schoolLogo } = useApp();
  const { currentPalette } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectUser = (selectedId: string) => {
    setIdentifier(selectedId);
    const u = allUsers.find(usr => (usr.username || usr.email) === selectedId);
    if (u) {
      setSelectedUser(u.name);
      setPassword('');
      setErrorMsg('');
    } else {
      setSelectedUser('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa tu usuario/correo y contraseña.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = login(identifier, password);
      setLoading(false);
      if (!res.success) {
        setErrorMsg(res.message || 'Credenciales inválidas.');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-900/95 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-slate-100">
      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-xl rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        
        {/* Glowing Decorative Background Element */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentPalette.primary }}
        />

        {/* School Header Identity */}
        <div className="text-center space-y-3">
          <div 
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg border border-white/10 p-1 bg-slate-900"
            style={{ backgroundColor: currentPalette.primary }}
          >
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain rounded-xl p-0.5 bg-white" />
            ) : (
              <School className="w-9 h-9 text-white" />
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {schoolName}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Acceso Seguro al Sistema de Control Escolar
            </p>
          </div>
        </div>

        {/* User Selection Dropdown Button */}
        {allUsers.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider text-center">
              Selecciona tu usuario para ingresar:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <select
                value={identifier}
                onChange={(e) => handleSelectUser(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none cursor-pointer hover:border-slate-600"
              >
                <option value="" className="bg-slate-800 text-slate-400">
                  -- Seleccionar usuario registrado --
                </option>
                {allUsers.map((u) => (
                  <option 
                    key={u.id} 
                    value={u.username || u.email}
                    className="bg-slate-800 text-white py-1"
                  >
                    {u.name} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="font-semibold text-xs leading-tight">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">
              Usuario o Correo Electrónico:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Ej. admin o admin@bezaleel.edu"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white font-semibold text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">
              Contraseña:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white font-semibold text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-extrabold text-xs text-white shadow-lg transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
            style={{ backgroundColor: currentPalette.primary }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        {/* Administrator Credentials Notice */}
        <div className="pt-4 border-t border-slate-700/60 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Acceso Protegido por Administrador</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed px-2">
            Las credenciales de usuario y contraseña son gestionadas y asignadas exclusivamente por el Administrador Institucional.
          </p>
        </div>

      </div>
    </div>
  );
};
