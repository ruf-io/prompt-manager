
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Info, Webhook, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { CreatePromptTemplateInput, PromptTemplate } from '../../../server/src/schema';

interface TemplateFormProps {
  onSubmit: (data: CreatePromptTemplateInput) => Promise<void>;
  userId: number;
  initialData?: PromptTemplate;
  onCancel: () => void;
}

export function TemplateForm({ onSubmit, userId, initialData, onCancel }: TemplateFormProps) {
  const [formData, setFormData] = useState<CreatePromptTemplateInput>({
    name: initialData?.name || '',
    template_content: initialData?.template_content || '',
    openai_model: initialData?.openai_model || 'gpt-3.5-turbo',
    trigger_type: initialData?.trigger_type || 'webhook',
    schedule: initialData?.schedule || null,
    webhook_url: initialData?.webhook_url || null,
    destination_webhook_url: initialData?.destination_webhook_url || '',
    user_id: userId
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onSubmit(formData);
    } catch {
      setError('Failed to save template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerTypeChange = (value: string) => {
    setFormData((prev: CreatePromptTemplateInput) => ({
      ...prev,
      trigger_type: value as 'scheduled' | 'webhook',
      schedule: value === 'scheduled' ? { frequency: 'daily' } : null,
      webhook_url: value === 'webhook' ? prev.webhook_url : null
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          placeholder="e.g., Daily Summary Generator"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreatePromptTemplateInput) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template_content">Template Content</Label>
        <Textarea
          id="template_content"
          placeholder="Enter your prompt template using Liquid syntax (e.g., Hello {{name}}, please analyze {{data}})"
          value={formData.template_content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreatePromptTemplateInput) => ({ ...prev, template_content: e.target.value }))
          }
          rows={6}
          required
        />
        <div className="flex items-start space-x-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
          <Info className="w-4 h-4 mt-0.5" />
          <div>
            <p className="font-medium">Liquid Template Syntax:</p>
            <p>Use double curly braces for variables: <code className="bg-white px-1 rounded">{'{{variable}}'}</code></p>
            <p>Example: <code className="bg-white px-1 rounded">Summarize this data: {'{{payload.data}}'}</code></p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="openai_model">OpenAI Model</Label>
        <Select
          value={formData.openai_model || 'gpt-3.5-turbo'}
          onValueChange={(value: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k') =>
            setFormData((prev: CreatePromptTemplateInput) => ({ ...prev, openai_model: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select OpenAI model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Recommended)</SelectItem>
            <SelectItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</SelectItem>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label>Trigger Type</Label>
        <RadioGroup
          value={formData.trigger_type}
          onValueChange={handleTriggerTypeChange}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Card className="cursor-pointer hover:bg-gray-50">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="webhook" id="webhook" />
                <Webhook className="w-4 h-4 text-green-600" />
                <CardTitle className="text-base">Webhook Trigger</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription>
                Execute when a webhook receives a POST request with JSON data
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Calendar className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-base">Scheduled Trigger</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription>
                Execute automatically based on a schedule
              </CardDescription>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>

      {formData.trigger_type === 'webhook' && (
        <div className="space-y-2">
          <Label htmlFor="webhook_url">Webhook URL (optional)</Label>
          <Input
            id="webhook_url"
            type="url"
            placeholder="https://your-domain.com/webhook/endpoint"
            value={formData.webhook_url || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreatePromptTemplateInput) => ({
                ...prev,
                webhook_url: e.target.value || null
              }))
            }
          />
          <p className="text-sm text-gray-600">
            If provided, this URL will receive incoming webhook requests. Leave empty to use the default system webhook.
          </p>
        </div>
      )}

      {formData.trigger_type === 'scheduled' && (
        <div className="space-y-2">
          <Label htmlFor="frequency">Schedule Frequency</Label>
          <Select
            value={formData.schedule?.frequency || 'daily'}
            onValueChange={(value: 'hourly' | 'daily' | 'weekly') =>
              setFormData((prev: CreatePromptTemplateInput) => ({
                ...prev,
                schedule: { frequency: value }
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="destination_webhook_url">Destination Webhook URL</Label>
        <Input
          id="destination_webhook_url"
          type="url"
          placeholder="https://your-domain.com/receive/response"
          value={formData.destination_webhook_url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreatePromptTemplateInput) => ({
              ...prev,
              destination_webhook_url: e.target.value
            }))
          }
          required
        />
        <p className="text-sm text-gray-600">
          The OpenAI API response will be sent to this URL as a POST request.
        </p>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : initialData ? 'Update Template' : 'Create Template'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
