
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Webhook, Calendar, Clock, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { PromptTemplate } from '../../../server/src/schema';

interface TemplatesListProps {
  templates: PromptTemplate[];
  isLoading: boolean;
  onEdit: (template: PromptTemplate) => void;
  onDelete: (templateId: number) => void;
}

export function TemplatesList({ templates, isLoading, onEdit, onDelete }: TemplatesListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (templateId: number) => {
    setDeletingId(templateId);
    try {
      await onDelete(templateId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTriggerIcon = (triggerType: string) => {
    return triggerType === 'webhook' ? (
      <Webhook className="w-4 h-4 text-green-600" />
    ) : (
      <Calendar className="w-4 h-4 text-blue-600" />
    );
  };

  const getTriggerBadge = (template: PromptTemplate) => {
    if (template.trigger_type === 'webhook') {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <Webhook className="w-3 h-3 mr-1" />
          Webhook
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Calendar className="w-3 h-3 mr-1" />
          {template.schedule?.frequency || 'Scheduled'}
        </Badge>
      );
    }
  };

  const getModelBadge = (model: string) => {
    const colors = {
      'gpt-3.5-turbo': 'bg-gray-100 text-gray-800',
      'gpt-3.5-turbo-16k': 'bg-gray-100 text-gray-800',
      'gpt-4': 'bg-purple-100 text-purple-800',
      'gpt-4-turbo': 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge variant="outline" className={colors[model as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {model}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates yet</h3>
        <p className="text-gray-600 mb-4">Create your first prompt template to get started with AI automation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template: PromptTemplate) => (
        <Card key={template.id} className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getTriggerIcon(template.trigger_type)}
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Created {formatDate(template.created_at)}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(template)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      disabled={deletingId === template.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Template</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{template.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(template.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {getTriggerBadge(template)}
                {getModelBadge(template.openai_model)}
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <p className="font-medium mb-1">Template Content:</p>
                <p className="font-mono text-xs">
                  {template.template_content.length > 100
                    ? `${template.template_content.substring(0, 100)}...`
                    : template.template_content}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {template.trigger_type === 'webhook' && template.webhook_url && (
                  <div className="flex items-center space-x-2">
                    <Webhook className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600">Webhook:</span>
                    <a
                      href={template.webhook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <span className="truncate max-w-48">
                        {template.webhook_url.replace(/^https?:\/\//, '')}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {template.trigger_type === 'scheduled' && template.schedule && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600">Frequency:</span>
                    <span className="font-medium capitalize">{template.schedule.frequency}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">Destination:</span>
                  <a
                    href={template.destination_webhook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <span className="truncate max-w-48">
                      {template.destination_webhook_url.replace(/^https?:\/\//, '')}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
