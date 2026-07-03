import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { Button } from "../../components/ui/inputs/button";
import { Input } from "../../components/ui/inputs/input";
import { Label } from "../../components/ui/inputs/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/navigation/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/layout/card";

// ─── Password strength rules (must match backend PasswordStrengthValidator) ──
const PASSWORD_RULES = [
  { label: 'Ít nhất 8 ký tự',         test: (p) => p.length >= 8 },
  { label: 'Chữ hoa (A-Z)',           test: (p) => /[A-Z]/.test(p) },
  { label: 'Ký tự đặc biệt (!@#...)',  test: (p) => /[!@#$%^&*()_\-+=.,;:<>?/~`{}[\]|\\]/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
  const checks = useMemo(
    () => PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) })),
    [password]
  );
  const passedCount = checks.filter(c => c.passed).length;
  const strength = passedCount === 0 ? 0 : (passedCount / PASSWORD_RULES.length) * 100;

  const barColor =
    strength === 0 ? 'bg-muted' :
    strength <= 40 ? 'bg-red-500' :
    strength <= 60 ? 'bg-orange-500' :
    strength <= 80 ? 'bg-yellow-500' :
    'bg-green-500';

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300 rounded-full`}
          style={{ width: `${strength}%` }}
        />
      </div>
      {/* Rule list */}
      <ul className="space-y-1">
        {checks.map((rule, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {rule.passed ? (
              <Check size={12} className="text-green-500 shrink-0" />
            ) : (
              <X size={12} className="text-muted-foreground shrink-0" />
            )}
            <span className={rule.passed ? 'text-green-600' : 'text-muted-foreground'}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [errors, setErrors] = useState({}); // field-level errors

  const [loginForm, setLoginForm] = useState({ account: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    account: '',
    password: '',
    userName: '',
    email: '',
  });

  // ─── Client-side validation ─────────────────────────────────────────────
  const validateLogin = () => {
    const errs = {};
    if (!loginForm.account.trim()) errs.loginAccount = 'Vui lòng nhập tên đăng nhập';
    if (!loginForm.password) errs.loginPassword = 'Vui lòng nhập mật khẩu';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateRegister = () => {
    const errs = {};
    if (!registerForm.account.trim()) {
      errs.regAccount = 'Vui lòng nhập tên đăng nhập';
    } else if (!/^[a-zA-Z0-9_.@-]+$/.test(registerForm.account)) {
      errs.regAccount = 'Chỉ chấp nhận chữ, số và . _ @ -';
    } else if (registerForm.account.length < 3) {
      errs.regAccount = 'Tên đăng nhập tối thiểu 3 ký tự';
    }

    if (registerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
      errs.regEmail = 'Email không hợp lệ';
    }

    if (!registerForm.password) {
      errs.regPassword = 'Vui lòng nhập mật khẩu';
    } else {
      // Check all password rules (must match backend PasswordStrengthValidator)
      const failedRules = PASSWORD_RULES.filter(r => !r.test(registerForm.password));
      if (failedRules.length > 0) {
        errs.regPassword = 'Mật khẩu chưa đáp ứng đủ yêu cầu bên dưới';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    try {
      await login(loginForm);
      toast.success('Đăng nhập thành công!');
      navigate('/');
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.message ?? data;
      toast.error(typeof msg === 'string' ? msg : 'Tên đăng nhập hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setLoading(true);
    try {
      await register(registerForm);
      toast.success('Đăng ký thành công!');
      navigate('/');
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.message ?? data;
      toast.error(typeof msg === 'string' ? msg : 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <TrendingUp className="text-white" size={20} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              MoneyFlow
            </h1>
          </div>
          <p className="text-muted-foreground">Quản lý tài chính thông minh</p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Đăng nhập</TabsTrigger>
            <TabsTrigger value="register">Đăng ký</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Chào mừng trở lại</CardTitle>
                <CardDescription>Đăng nhập vào tài khoản của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="loginAccount">Tên đăng nhập</Label>
                    <Input
                      id="loginAccount"
                      placeholder="Nhập tên đăng nhập"
                      value={loginForm.account}
                      onChange={e => {
                        setLoginForm(f => ({ ...f, account: e.target.value }));
                        if (errors.loginAccount) setErrors(e => ({ ...e, loginAccount: '' }));
                      }}
                      className={errors.loginAccount ? 'border-red-400' : ''}
                      required
                    />
                    {errors.loginAccount && (
                      <p className="text-xs text-red-500">{errors.loginAccount}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginPassword">Mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="loginPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu"
                        value={loginForm.password}
                        maxLength={128}
                        onChange={e => {
                          setLoginForm(f => ({ ...f, password: e.target.value }));
                          if (errors.loginPassword) setErrors(e => ({ ...e, loginPassword: '' }));
                        }}
                        className={errors.loginPassword ? 'border-red-400' : ''}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                        onClick={() => setShowPassword(v => !v)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.loginPassword && (
                      <p className="text-xs text-red-500">{errors.loginPassword}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={loading}
                  >
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Tạo tài khoản mới</CardTitle>
                <CardDescription>Đăng ký để bắt đầu quản lý tài chính</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="regAccount">Tên đăng nhập *</Label>
                    <Input
                      id="regAccount"
                      placeholder="Tên đăng nhập (chữ, số, . _ @ -)"
                      value={registerForm.account}
                      onChange={e => {
                        setRegisterForm(f => ({ ...f, account: e.target.value }));
                        if (errors.regAccount) setErrors(e => ({ ...e, regAccount: '' }));
                      }}
                      className={errors.regAccount ? 'border-red-400' : ''}
                      required
                    />
                    {errors.regAccount && (
                      <p className="text-xs text-red-500">{errors.regAccount}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regName">Tên hiển thị</Label>
                    <Input
                      id="regName"
                      placeholder="Tên của bạn"
                      value={registerForm.userName}
                      onChange={e => setRegisterForm(f => ({ ...f, userName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regEmail">Email</Label>
                    <Input
                      id="regEmail"
                      type="email"
                      placeholder="email@example.com"
                      value={registerForm.email}
                      onChange={e => {
                        setRegisterForm(f => ({ ...f, email: e.target.value }));
                        if (errors.regEmail) setErrors(e => ({ ...e, regEmail: '' }));
                      }}
                      className={errors.regEmail ? 'border-red-400' : ''}
                    />
                    {errors.regEmail && (
                      <p className="text-xs text-red-500">{errors.regEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regPassword">Mật khẩu *</Label>
                    <div className="relative">
                      <Input
                        id="regPassword"
                        type={showRegPassword ? 'text' : 'password'}
                        placeholder="Tối thiểu 8 ký tự, có chữ hoa và ký tự đặc biệt"
                        value={registerForm.password}
                        maxLength={128}
                        onChange={e => {
                          setRegisterForm(f => ({ ...f, password: e.target.value }));
                          if (errors.regPassword) setErrors(e => ({ ...e, regPassword: '' }));
                        }}
                        className={errors.regPassword ? 'border-red-400' : ''}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                        onClick={() => setShowRegPassword(v => !v)}
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.regPassword && (
                      <p className="text-xs text-red-500">{errors.regPassword}</p>
                    )}
                    <PasswordStrengthIndicator password={registerForm.password} />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={loading}
                  >
                    {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
