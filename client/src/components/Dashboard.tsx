
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateForm } from '@/components/TemplateForm';
import { TemplateCard } from '@/components/TemplateCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Webhook, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { User, PromptTemplate, CreatePromptTemplateInput } from '../../../server/src/schema';

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const result = await trpc.getPromptTemplatesByUser.query({ user_id: user.id });
      setTemplates(result);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('❌ Failed to load templates.');
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = useCallback(async (input: CreatePromptTemplateInput) => {
    try {
      const newTemplate = await trpc.createPromptTemplate.mutate({
        ...input,
        user_id: user.id
      });
      setTemplates(prev => [...prev, newTemplate]);
      setIsCreateDialogOpen(false);
      toast.success('✅ Template created successfully!');
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('❌ Failed to create template.');
      throw error;
    }
  }, [user.id]);

  const handleUpdateTemplate = useCallback(async (templateId: number, input: Omit<CreatePromptTemplateInput, 'user_id'>) => {
    try {
      const updatedTemplate = await trpc.updatePromptTemplate.mutate({
        id: templateId,
        ...input
      });
      if (updatedTemplate) {
        setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
        setEditingTemplate(null);
        toast.success('✅ Template updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('❌ Failed to update template.');
      throw error;
    }
  }, []);

  const handleDeleteTemplate = async (id: number) => {
    try {
      const success = await trpc.deletePromptTemplate.mutate({ id });
      if (success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        toast.success('🗑️ Template deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('❌ Failed to delete template.');
    }
  };

  const getStatsCards = () => {
    const scheduledCount = templates.filter(t => t.trigger_type === 'scheduled').length;
    const webhookCount = templates.filter(t => t.trigger_type === 'webhook').length;
    
    return [
      {
        title: 'Total Templates',
        value: templates.length,
        icon: <Zap className="h-4 w-4" />,
        color: 'bg-blue-500'
      },
      {
        title: 'Scheduled',
        value: scheduledCount,
        icon: <Calendar className="h-4 w-4" />,
        color: 'bg-green-500'
      },
      {
        title: 'Webhook Triggered',
        value: webhookCount,
        icon: <Webhook className="h-4 w-4" />,
        color: 'bg-purple-500'
      }
    ];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {getStatsCards().map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.color} p-2 rounded-full text-white`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Prompt Templates</h2>
          <p className="text-gray-600 mt-1">Create and manage your AI prompt templates</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <TemplateForm 
              onSubmit={handleCreateTemplate}
              mode="create"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">No templates yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first AI prompt template to get started with automated AI workflows.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: PromptTemplate) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={setEditingTemplate}
              onDelete={handleDeleteTemplate}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              initialData={editingTemplate}
              onSubmit={(data) => handleUpdateTemplate(editingTemplate.id, data)}
              mode="edit"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
