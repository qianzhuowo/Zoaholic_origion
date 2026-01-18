import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Activity, Key, LogIn } from 'lucide-react';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. 先调用 /v1/models 验证 API Key 是否有效
      const response = await fetch('/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (response.status === 403 || response.status === 401) {
        setError('API Key 无效或已过期');
        setLoading(false);
        return;
      }

      if (response.status === 429) {
        setError('请求过于频繁，请稍后再试');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(`验证失败: HTTP ${response.status}`);
        setLoading(false);
        return;
      }

      // 2. 验证成功，尝试获取角色信息（只有 Admin 能访问 /v1/api_config）
      let role: 'admin' | 'user' = 'user';
      try {
        const configRes = await fetch('/v1/api_config', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (configRes.ok) {
          role = 'admin';
        }
      } catch (err) {
        // 静默处理，不是 Admin 就是 User
      }

      // 3. 登录成功
      login(apiKey, role);
      navigate('/');
    } catch (err) {
      setError('网络错误，请检查后端服务是否正常启动');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-card border border-border rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Zoaholic Gateway</h1>
          <p className="text-muted-foreground mt-2">请输入 API Key 登录管理控制台</p>
        </div>

        <form onSubmit={handleLogin} className="bg-card border border-border p-8 rounded-2xl shadow-lg">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                <Key className="w-4 h-4" />
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none transition-all font-mono"
                required
              />
            </div>

            {error && <div className="text-destructive text-sm font-medium bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">{error}</div>}

            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? <Activity className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? '正在验证...' : '进入控制台'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}