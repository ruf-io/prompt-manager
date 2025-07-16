
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { TemplatesList } from '@/components/TemplatesList';
import { TemplateForm } from '@/components/TemplateForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, LogOut, Bot, Webhook, Calendar } from 'lucide-react';
import type { User, PromptTemplate, CreatePromptTemplateInput } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const result = await trpc.getPromptTemplatesByUser.query({ user_id: user.id });
      setTemplates(result);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await trpc.loginUser.mutate({ email, password });
      setUser(response.user);
      // Store token in localStorage for future requests
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      const newUser = await trpc.createUser.mutate({ email, password });
      setUser(newUser);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const handleCreateTemplate = async (templateData: CreatePromptTemplateInput) => {
    try {
      const newTemplate = await trpc.createPromptTemplate.mutate(templateData);
      setTemplates((prev: PromptTemplate[]) => [...prev, newTemplate]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  };

  const handleUpdateTemplate = async (templateData: CreatePromptTemplateInput) => {
    if (!editingTemplate) return;
    
    try {
      const updatedTemplate = await trpc.updatePromptTemplate.mutate({
        id: editingTemplate.id,
        ...templateData
      });
      
      if (updatedTemplate) {
        setTemplates((prev: PromptTemplate[]) => 
          prev.map(template => 
            template.id === editingTemplate.id ? updatedTemplate : template
          )
        );
      }
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      const success = await trpc.deletePromptTemplate.mutate({ id: templateId });
      if (success) {
        setTemplates((prev: PromptTemplate[]) => 
          prev.filter(template => template.id !== templateId)
        );
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTemplates([]);
    localStorage.removeItem('auth_token');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Prompt Manager</h1>
            <p className="text-gray-600">Manage your AI prompt templates with ease</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Welcome Back</CardTitle>
              <CardDescription className="text-center">
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <LoginForm onSubmit={handleLogin} />
                </TabsContent>
                <TabsContent value="register">
                  <RegisterForm onSubmit={handleRegister} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Prompt Manager</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.email}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prompt Templates</h2>
            <p className="text-gray-600">Manage your AI prompt templates and automation workflows</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
              </DialogHeader>
              <TemplateForm
                onSubmit={handleCreateTemplate}
                userId={user.id}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Templates</p>
                  <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
                </div>
                <Bot className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Webhook Triggers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {templates.filter(t => t.trigger_type === 'webhook').length}
                  </p>
                </div>
                <Webhook className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {templates.filter(t => t.trigger_type === 'scheduled').length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Templates</CardTitle>
            <CardDescription>
              Manage your prompt templates, schedules, and webhook integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplatesList
              templates={templates}
              isLoading={isLoading}
              onEdit={setEditingTemplate}
              onDelete={handleDeleteTemplate}
            />
          </CardContent>
        </Card>
      </main>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              onSubmit={handleUpdateTemplate}
              userId={user.id}
              initialData={editingTemplate}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
