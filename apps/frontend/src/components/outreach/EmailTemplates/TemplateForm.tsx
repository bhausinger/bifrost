import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface TemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: TemplateFormData) => void;
  initialData?: Partial<TemplateFormData>;
  isEditing?: boolean;
}

export interface TemplateFormData {
  name: string;
  subject: string;
  body: string;
  type: 'INITIAL_OUTREACH' | 'FOLLOW_UP' | 'COLLABORATION_PROPOSAL' | 'THANK_YOU' | 'REJECTION_RESPONSE';
  variables: string[];
  isDefault: boolean;
}

const templateTypes = [
  { value: 'INITIAL_OUTREACH', label: 'Initial Outreach' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'COLLABORATION_PROPOSAL', label: 'Collaboration Proposal' },
  { value: 'THANK_YOU', label: 'Thank You' },
  { value: 'REJECTION_RESPONSE', label: 'Rejection Response' }
];

const commonVariables = [
  'artistName',
  'recipientName',
  'artistGenres',
  'yourName',
  'yourCompany',
  'trackTitle',
  'collaborationType'
];

const sampleTemplates = {
  INITIAL_OUTREACH: {
    subject: 'Music Promotion Opportunity - {{artistName}}',
    body: `Hi {{recipientName}},

I hope this email finds you well! I came across your music and I'm really impressed with your style, especially in the {{artistGenres}} genre.

I'm {{yourName}} from {{yourCompany}}, and we specialize in helping artists like yourself reach wider audiences through strategic promotion campaigns.

I'd love to discuss potential opportunities to promote your music to new listeners who would appreciate your unique sound.

Would you be interested in a brief call to explore how we could work together?

Best regards,
{{yourName}}`
  },
  FOLLOW_UP: {
    subject: 'Following up - {{artistName}} Promotion Opportunity',
    body: `Hi {{recipientName}},

I wanted to follow up on my previous email about potential promotion opportunities for {{artistName}}.

I understand you're probably busy, but I believe there's a great opportunity here that could benefit your music career.

If you're interested, I'd be happy to share more details about our promotion approach and how it could help you reach new fans.

Looking forward to hearing from you!

Best,
{{yourName}}`
  },
  COLLABORATION_PROPOSAL: {
    subject: 'Collaboration Proposal - {{trackTitle}}',
    body: `Hi {{recipientName}},

I've been following your work and I'm really impressed with your {{artistGenres}} style. 

I'm working on a {{collaborationType}} project and I think your unique sound would be a perfect fit. The track is tentatively titled "{{trackTitle}}" and I believe your contribution could really elevate it.

Would you be interested in discussing this collaboration opportunity? I'd love to share more details about the project and see if there's mutual interest.

Looking forward to potentially working together!

Best regards,
{{yourName}}`
  },
  THANK_YOU: {
    subject: 'Thank you - {{artistName}}',
    body: `Hi {{recipientName}},

I wanted to personally thank you for taking the time to consider our collaboration/promotion opportunity.

Working with artists like yourself who are passionate about their craft is what makes this industry so rewarding.

If any future opportunities arise that might be a good fit, I'll definitely keep you in mind.

Wishing you all the best with your music!

Warm regards,
{{yourName}}`
  },
  REJECTION_RESPONSE: {
    subject: 'No worries - {{artistName}}',
    body: `Hi {{recipientName}},

Thank you for getting back to me regarding the promotion opportunity. I completely understand that it's not the right fit at this time.

I really respect your music and artistic direction. If circumstances change in the future, please don't hesitate to reach out.

Keep making great music!

Best,
{{yourName}}`
  }
};

export function TemplateForm({ isOpen, onClose, onSubmit, initialData, isEditing = false }: TemplateFormProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: initialData?.name || '',
    subject: initialData?.subject || '',
    body: initialData?.body || '',
    type: initialData?.type || 'INITIAL_OUTREACH',
    variables: initialData?.variables || [],
    isDefault: initialData?.isDefault || false
  });
  
  const [customVariable, setCustomVariable] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (type: string) => {
    const newType = type as TemplateFormData['type'];
    setFormData(prev => ({
      ...prev,
      type: newType,
      subject: sampleTemplates[newType].subject,
      body: sampleTemplates[newType].body
    }));
  };

  const addVariable = (variable: string) => {
    if (variable && !formData.variables.includes(variable)) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, variable]
      }));
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const addCustomVariable = () => {
    if (customVariable.trim()) {
      addVariable(customVariable.trim());
      setCustomVariable('');
    }
  };

  const extractVariablesFromContent = () => {
    const content = `${formData.subject} ${formData.body}`;
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = content.match(variableRegex);
    
    if (matches) {
      const extractedVars = matches
        .map(match => match.replace(/[{}]/g, ''))
        .filter(variable => !formData.variables.includes(variable));
      
      if (extractedVars.length > 0) {
        setFormData(prev => ({
          ...prev,
          variables: [...prev.variables, ...extractedVars]
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.body.trim()) {
      newErrors.body = 'Body is required';
    }

    // Check for unmatched variables
    const content = `${formData.subject} ${formData.body}`;
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = content.match(variableRegex);
    
    if (matches) {
      const contentVars = matches.map(match => match.replace(/[{}]/g, ''));
      const undefinedVars = contentVars.filter(variable => !formData.variables.includes(variable));
      
      if (undefinedVars.length > 0) {
        newErrors.variables = `Undefined variables: ${undefinedVars.join(', ')}. Add them to the variables list.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        subject: '',
        body: '',
        type: 'INITIAL_OUTREACH',
        variables: [],
        isDefault: false
      });
    } catch (error) {
      console.error('Error submitting template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewContent = (content: string) => {
    let preview = content;
    formData.variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g');
      preview = preview.replace(regex, `[${variable.toUpperCase()}]`);
    });
    return preview;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Email Template' : 'Create Email Template'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {templateTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Initial Artist Outreach"
            error={errors.name}
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Subject
          </label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Enter email subject"
            error={errors.subject}
          />
          {formData.subject && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
              <strong>Preview:</strong> {previewContent(formData.subject)}
            </div>
          )}
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Body
          </label>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
            placeholder="Enter email content..."
            rows={12}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.body && (
            <p className="mt-1 text-sm text-red-600">{errors.body}</p>
          )}
          {formData.body && (
            <div className="mt-2 p-3 bg-gray-50 rounded text-sm max-h-32 overflow-y-auto">
              <strong>Preview:</strong>
              <div className="whitespace-pre-wrap mt-1">{previewContent(formData.body)}</div>
            </div>
          )}
        </div>

        {/* Variables */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Template Variables
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={extractVariablesFromContent}
            >
              Auto-detect Variables
            </Button>
          </div>
          
          {errors.variables && (
            <p className="mb-2 text-sm text-red-600">{errors.variables}</p>
          )}

          {/* Common Variables */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Common variables:</p>
            <div className="flex flex-wrap gap-2">
              {commonVariables.map(variable => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => addVariable(variable)}
                  disabled={formData.variables.includes(variable)}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    formData.variables.includes(variable)
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {variable}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Variable Input */}
          <div className="flex gap-2 mb-3">
            <Input
              value={customVariable}
              onChange={(e) => setCustomVariable(e.target.value)}
              placeholder="Add custom variable"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomVariable())}
            />
            <Button
              type="button"
              onClick={addCustomVariable}
              size="sm"
              variant="outline"
            >
              Add
            </Button>
          </div>

          {/* Selected Variables */}
          {formData.variables.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Selected variables:</p>
              <div className="flex flex-wrap gap-2">
                {formData.variables.map(variable => (
                  <span
                    key={variable}
                    className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {`{{${variable}}}`}
                    <button
                      type="button"
                      onClick={() => removeVariable(variable)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Default Template */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
            Set as default template for this type
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}