
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Webhook, Edit, Trash2, ExternalLink, Clock, Bot, Target } from 'lucide-react';
import type { PromptTemplate } from '../../../server/src/schema';

interface TemplateCardProps {
  template: PromptTemplate;
  onEdit: (template: PromptTemplate) => void;
  onDelete: (id: number) => void;
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const getTriggerIcon = () => {
    return template.trigger_type === 'scheduled' ? (
      <Calendar className="h-4 w-4 text-green-600" />
    ) : (
      <Webhook className="h-4 w-4 text-purple-600" />
    );
  };

  const getTriggerBadge = () => {
    if (template.trigger_type === 'scheduled') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {template.schedule?.frequency || 'scheduled'}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Webhook className="h-3 w-3" />
          webhook
        </Badge>
      );
    }
  };

  const getModelBadge = () => {
    const modelColors = {
      'gpt-3.5-turbo': 'bg-blue-100 text-blue-800',
      'gpt-3.5-turbo-16k': 'bg-blue-100 text-blue-800',
      'gpt-4': 'bg-purple-100 text-purple-800',
      'gpt-4-turbo': 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge className={`${modelColors[template.openai_model]} border-0`}>
        <Bot className="h-3 w-3 mr-1" />
        {template.openai_model}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {getTriggerIcon()}
              {template.name}
            </CardTitle>
            <CardDescription className="mt-1">
              Created {template.created_at.toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(template)}
              className="hover:bg-blue-50 hover:text-blue-600"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
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
                    onClick={() => onDelete(template.id)}
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
      
      <CardContent className="space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {getTriggerBadge()}
          {getModelBadge()}
        </div>

        {/* Template Content Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Template Content:</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-md border">
            <p className="text-sm font-mono text-gray-700 line-clamp-3">
              {template.template_content.length > 150 
                ? `${template.template_content.substring(0, 150)}...` 
                : template.template_content}
            </p>
          </div>
        </div>

        <Separator />

        {/* Configuration Details */}
        <div className="space-y-3">
          {template.trigger_type === 'scheduled' && template.schedule && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Runs {template.schedule.frequency}</span>
            </div>
          )}

          {template.trigger_type === 'webhook' && template.webhook_url && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ExternalLink className="h-4 w-4" />
              <span className="truncate">Webhook: {template.webhook_url}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Target className="h-4 w-4" />
            <span className="truncate">
              Destination: {template.destination_webhook_url}
            </span>
          </div>
        </div>

        {/* Last Updated */}
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500">
            Last updated: {template.updated_at.toLocaleDateString()} at {template.updated_at.toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
