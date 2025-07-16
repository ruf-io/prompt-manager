
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Webhook, Clock, Link } from 'lucide-react';
import type { CreatePromptTemplateInput, PromptTemplate, openAIModelEnum, frequencyEnum } from '../../../server/src/schema';

interface TemplateFormProps {
  onSubmit: (data: CreatePromptTemplateInput) => Promise<void>;
  initialData?: PromptTemplate;
  mode: 'create' | 'edit';
}

export function TemplateForm({ onSubmit, initialData, mode }: TemplateFormProps) {
  const [formData, setFormData] = useState<CreatePromptTemplateInput>({
    name: initialData?.name || '',
    template_content: initialData?.template_content || '',
    openai_model: initialData?.openai_model || 'gpt-3.5-turbo',
    trigger_type: initialData?.trigger_type || 'scheduled',
    schedule: initialData?.schedule || { frequency: 'daily' },
    webhook_url: initialData?.webhook_url || null,
    destination_webhook_url: initialData?.destination_webhook_url || '',
    user_id: initialData?.user_id || 0 // Will be set by parent component
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSubmit(formData);
    } catch {
      // Error handling is done in parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerTypeChange = (triggerType: 'scheduled' | 'webhook') => {
    setFormData(prev => ({
      ...prev,
      trigger_type: triggerType,
      schedule: triggerType === 'scheduled' ? { frequency: 'daily' } : null,
      webhook_url: triggerType === 'webhook' ? '' : null
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            Basic Information
          </CardTitle>
          <CardDescription>
            Set up the basic details for your prompt template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="e.g., Daily News Summary, Customer Support Response"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_content">Template Content</Label>
            <Textarea
              id="template_content"
              placeholder="Enter your Liquid template content here. Use {{ variable }} syntax for dynamic values."
              value={formData.template_content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData(prev => ({ ...prev, template_content: e.target.value }))
              }
              rows={6}
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500">
              💡 Use Liquid syntax like {'{{'} user.name {'}'} or {'{{'} data.message {'}'} for dynamic content
            </p>
          </div>

          <div className="space-y-2">
            <Label>OpenAI Model</Label>
            <Select 
              value={formData.openai_model} 
              onValueChange={(value: typeof openAIModelEnum._type) => setFormData(prev => ({ ...prev, openai_model: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select OpenAI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-3.5-turbo">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Popular</Badge>
                    GPT-3.5 Turbo
                  </div>
                </SelectItem>
                <SelectItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</SelectItem>
                <SelectItem value="gpt-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Premium</Badge>
                    GPT-4
                  </div>
                </SelectItem>
                <SelectItem value="gpt-4-turbo">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Premium</Badge>
                    GPT-4 Turbo
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trigger Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            Trigger Configuration
          </CardTitle>
          <CardDescription>
            Choose how your template will be executed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Trigger Type</Label>
            <RadioGroup 
              value={formData.trigger_type} 
              onValueChange={handleTriggerTypeChange}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label htmlFor="scheduled" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="h-4 w-4 text-green-600" />
                  Scheduled
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="webhook" id="webhook" />
                <Label htmlFor="webhook" className="flex items-center gap-2 cursor-pointer">
                  <Webhook className="h-4 w-4 text-purple-600" />
                  Webhook
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.trigger_type === 'scheduled' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule Frequency
              </Label>
              <Select 
                value={formData.schedule?.frequency || 'daily'} 
                onValueChange={(value: typeof frequencyEnum._type) => setFormData(prev => ({ 
                  ...prev, 
                  schedule: { frequency: value } 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">⏰</Badge>
                      Every Hour
                    </div>
                  </SelectItem>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">📅</Badge>
                      Daily
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">🗓️</Badge>
                      Weekly
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.trigger_type === 'webhook' && (
            <div className="space-y-2">
              <Label htmlFor="webhook_url" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Webhook URL
              </Label>
              <Input
                id="webhook_url"
                type="url"
                placeholder="https://your-app.com/webhook/endpoint"
                value={formData.webhook_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, webhook_url: e.target.value || null }))
                }
                required={formData.trigger_type === 'webhook'}
              />
              <p className="text-xs text-gray-500">
                💡 This endpoint will receive the JSON payload that triggers your template
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Destination */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            Destination
          </CardTitle>
          <CardDescription>
            Configure where the AI response will be sent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="destination_webhook_url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Destination Webhook URL
            </Label>
            <Input
              id="destination_webhook_url"
              type="url"
              placeholder="https://your-app.com/receive-ai-response"
              value={formData.destination_webhook_url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, destination_webhook_url: e.target.value }))
              }
              required
            />
            <p className="text-xs text-gray-500">
              📤 The OpenAI API response will be sent to this URL
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              {mode === 'edit' ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <span className="text-lg">✨</span>
              {mode === 'edit' ? 'Update Template' : 'Create Template'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
