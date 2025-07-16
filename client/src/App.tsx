
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { Dashboard } from '@/components/Dashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { User } from '../../server/src/schema';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true
  });

  // Load authentication state from localStorage on app start
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed.user && parsed.token) {
          setAuthState({
            user: {
              ...parsed.user,
              created_at: new Date(parsed.user.created_at),
              updated_at: new Date(parsed.user.updated_at)
            },
            token: parsed.token,
            isLoading: false
          });
          return;
        }
      } catch (error) {
        console.error('Failed to parse saved auth:', error);
        localStorage.removeItem('auth');
      }
    }
    setAuthState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const response = await trpc.loginUser.mutate({ email, password });
      const authData = {
        user: response.user,
        token: response.token || null
      };
      
      setAuthState({
        ...authData,
        isLoading: false
      });
      
      // Save to localStorage
      localStorage.setItem('auth', JSON.stringify(authData));
      
      toast.success('🎉 Welcome back! Successfully logged in.');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('❌ Login failed. Please check your credentials.');
      throw error;
    }
  }, []);

  const handleRegister = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      await trpc.createUser.mutate({ email, password });
      toast.success('✅ Account created successfully! Please log in.');
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('❌ Registration failed. Please try again.');
      throw error;
    }
  }, []);

  const handleLogout = useCallback(() => {
    setAuthState({
      user: null,
      token: null,
      isLoading: false
    });
    localStorage.removeItem('auth');
    toast.success('👋 Successfully logged out.');
  }, []);

  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!authState.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <div className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🤖 AI Prompt Manager</h1>
              <p className="text-gray-600">Manage your AI prompt templates with ease</p>
            </div>
            
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <LoginForm onLogin={handleLogin} />
              </TabsContent>
              
              <TabsContent value="register" className="mt-6">
                <RegisterForm onRegister={handleRegister} />
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">🤖 AI Prompt Manager</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-medium">{authState.user.email}</span>
            </span>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <Dashboard user={authState.user} />
      </main>
    </div>
  );
}

export default App;
