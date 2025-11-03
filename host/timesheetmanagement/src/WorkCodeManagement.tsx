// ============================================================================
// TYPES AND INTERFACES (Interface Segregation Principle)
// ============================================================================

interface WorkCode {
  work_code_id: number;
  prefix: string;
  suffix: string;
  short_work_code: string;
  long_work_code: string;
  description: string;
  status: number;
}

interface FieldConfig {
  enabled: boolean;
  readonly: boolean;
  visible: boolean;
  label: string;
  hint: string;
  required: boolean;
}

interface ColumnConfig {
  visible: boolean;
  label: string;
}

interface ActionConfig {
  enabled: boolean;
  visible: boolean;
}

interface PageConfig {
  columns: Record<string, ColumnConfig>;
  fields: Record<string, FieldConfig>;
  actions: Record<string, ActionConfig>;
}

interface WorkCodeEditorProps {
  pageConfig?: PageConfig;
  apiClient?: IWorkCodeApiClient;
}

// API Client Interface (Dependency Inversion Principle)
interface IWorkCodeApiClient {
  getAll(): Promise<WorkCode[]>;
  getById(id: number): Promise<WorkCode>;
  create(data: Omit<WorkCode, 'work_code_id'>): Promise<WorkCode>;
  update(id: number, data: Omit<WorkCode, 'work_code_id'>): Promise<WorkCode>;
  delete(id: number): Promise<void>;
}

// ============================================================================
// SECURITY UTILITIES (OWASP Recommendations)
// ============================================================================

class SecurityValidator {
  // Input Sanitization - Prevent XSS
  static sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim()
      .substring(0, 1000); // Limit length to prevent DoS
  }

  // Validate input against expected patterns
  static validateWorkCodeInput(field: string, value: string, maxLength: number): boolean {
    if (value.length > maxLength) return false;
    
    // Only allow alphanumeric, hyphens, underscores, and spaces
    const pattern = /^[a-zA-Z0-9\s\-_]*$/;
    return pattern.test(value);
  }

  // Validate status is within expected range
  static validateStatus(status: number): boolean {
    return Number.isInteger(status) && status >= 0 && status <= 3;
  }

  // Rate limiting helper (should be implemented server-side primarily)
  private static requestTimestamps: number[] = [];
  
  static checkRateLimit(maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(ts => now - ts < windowMs);
    
    if (this.requestTimestamps.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    this.requestTimestamps.push(now);
    return true;
  }
}

// ============================================================================
// API CLIENT IMPLEMENTATION (Single Responsibility Principle)
// ============================================================================

class WorkCodeApiClient implements IWorkCodeApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      // OWASP: Add security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    };

    // Add authorization if token provided
    if (authToken) {
      this.defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }
  }

  // OWASP: Centralized error handling
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      
      // Don't expose detailed error messages to client (OWASP A01:2021 – Broken Access Control)
      const userMessage = this.getUserFriendlyError(response.status);
      
      // Log detailed error server-side (not shown to user)
      console.error(`API Error: ${response.status} - ${errorBody}`);
      
      throw new Error(userMessage);
    }
    
    return response.json();
  }

  private getUserFriendlyError(status: number): string {
    switch (status) {
      case 400: return 'Invalid request. Please check your input.';
      case 401: return 'Authentication required. Please log in.';
      case 403: return 'You do not have permission to perform this action.';
      case 404: return 'The requested resource was not found.';
      case 409: return 'This resource already exists or conflicts with existing data.';
      case 429: return 'Too many requests. Please try again later.';
      case 500: return 'Server error. Please try again later.';
      default: return 'An unexpected error occurred. Please try again.';
    }
  }

  // OWASP: Request timeout to prevent hanging requests
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeout: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw error;
    }
  }

  async getAll(): Promise<WorkCode[]> {
    // OWASP: Rate limiting check
    if (!SecurityValidator.checkRateLimit()) {
      throw new Error('Too many requests. Please wait a moment.');
    }

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/work-codes`,
      {
        method: 'GET',
        headers: this.defaultHeaders,
      }
    );
    
    return this.handleResponse<WorkCode[]>(response);
  }

  async getById(id: number): Promise<WorkCode> {
    // OWASP: Input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid ID');
    }

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/work-codes/${id}`,
      {
        method: 'GET',
        headers: this.defaultHeaders,
      }
    );
    
    return this.handleResponse<WorkCode>(response);
  }

  async create(data: Omit<WorkCode, 'work_code_id'>): Promise<WorkCode> {
    // OWASP: Input validation and sanitization
    this.validateWorkCodeData(data);

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/work-codes`,
      {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(this.sanitizeWorkCodeData(data)),
      }
    );
    
    return this.handleResponse<WorkCode>(response);
  }

  async update(id: number, data: Omit<WorkCode, 'work_code_id'>): Promise<WorkCode> {
    // OWASP: Input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid ID');
    }
    
    this.validateWorkCodeData(data);

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/work-codes/${id}`,
      {
        method: 'PUT',
        headers: this.defaultHeaders,
        body: JSON.stringify(this.sanitizeWorkCodeData(data)),
      }
    );
    
    return this.handleResponse<WorkCode>(response);
  }

  async delete(id: number): Promise<void> {
    // OWASP: Input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid ID');
    }

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/work-codes/${id}`,
      {
        method: 'DELETE',
        headers: this.defaultHeaders,
      }
    );
    
    await this.handleResponse<void>(response);
  }

  // OWASP: Input validation
  private validateWorkCodeData(data: Omit<WorkCode, 'work_code_id'>): void {
    if (!data.short_work_code || !data.long_work_code) {
      throw new Error('Required fields are missing');
    }

    if (!SecurityValidator.validateWorkCodeInput('prefix', data.prefix, 10)) {
      throw new Error('Invalid prefix format or length');
    }

    if (!SecurityValidator.validateWorkCodeInput('suffix', data.suffix, 10)) {
      throw new Error('Invalid suffix format or length');
    }

    if (!SecurityValidator.validateWorkCodeInput('short_work_code', data.short_work_code, 10)) {
      throw new Error('Invalid short work code format or length');
    }

    if (!SecurityValidator.validateWorkCodeInput('long_work_code', data.long_work_code, 50)) {
      throw new Error('Invalid long work code format or length');
    }

    if (!SecurityValidator.validateStatus(data.status)) {
      throw new Error('Invalid status value');
    }
  }

  // OWASP: Input sanitization
  private sanitizeWorkCodeData(data: Omit<WorkCode, 'work_code_id'>): Omit<WorkCode, 'work_code_id'> {
    return {
      prefix: SecurityValidator.sanitizeInput(data.prefix),
      suffix: SecurityValidator.sanitizeInput(data.suffix),
      short_work_code: SecurityValidator.sanitizeInput(data.short_work_code),
      long_work_code: SecurityValidator.sanitizeInput(data.long_work_code),
      description: SecurityValidator.sanitizeInput(data.description),
      status: data.status,
    };
  }
}

// ============================================================================
// CONFIGURATION (Open/Closed Principle)
// ============================================================================

class ConfigurationManager {
  static getApiBaseUrl(): string {
    // Check if running in Vite
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api';
    }
    // Check if running in Create React App
    if (typeof process !== 'undefined' && process.env) {
      return process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
    }
    // Fallback for direct browser usage
    return 'http://localhost:3000/api';
  }

  static getDefaultPageConfig(): PageConfig {
    return {
      columns: {
        work_code_id: { visible: true, label: 'ID' },
        prefix: { visible: true, label: 'Prefix' },
        suffix: { visible: true, label: 'Suffix' },
        short_work_code: { visible: true, label: 'Short Code' },
        long_work_code: { visible: true, label: 'Long Code' },
        description: { visible: true, label: 'Description' },
        status: { visible: true, label: 'Status' }
      },
      fields: {
        prefix: { 
          enabled: true, 
          readonly: false, 
          visible: true,
          label: 'Prefix',
          hint: 'Maximum 10 characters',
          required: false
        },
        suffix: { 
          enabled: true, 
          readonly: false, 
          visible: true,
          label: 'Suffix',
          hint: 'Maximum 10 characters',
          required: false
        },
        short_work_code: { 
          enabled: true, 
          readonly: false, 
          visible: true,
          label: 'Short Work Code',
          hint: 'Required, maximum 10 characters',
          required: true
        },
        long_work_code: { 
          enabled: true, 
          readonly: false, 
          visible: true,
          label: 'Long Work Code',
          hint: 'Required, maximum 50 characters',
          required: true
        },
        description: { 
          enabled: true, 
          readonly: false, 
          visible: true,
          label: 'Description',
          hint: 'Optional detailed description',
          required: false
        },
        status: { 
          enabled: true, 
          readonly: false, 
          visible: true,
          label: 'Status',
          hint: '',
          required: false
        }
      },
      actions: {
        add: { enabled: true, visible: true },
        edit: { enabled: true, visible: true },
        delete: { enabled: true, visible: true }
      }
    };
  }
}

// ============================================================================
// BUSINESS LOGIC (Single Responsibility Principle)
// ============================================================================

class WorkCodeService {
  static getStatusLabel(status: number): string {
    const labels: Record<number, string> = { 
      0: 'Inactive', 
      1: 'Active', 
      2: 'Pending', 
      3: 'Archived' 
    };
    return labels[status] || 'Unknown';
  }

  static getStatusColor(status: number): string {
    const colors: Record<number, string> = {
      0: 'bg-gray-100 text-gray-700',
      1: 'bg-green-100 text-green-700',
      2: 'bg-yellow-100 text-yellow-700',
      3: 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  }

  static filterWorkCodes(
    workCodes: WorkCode[], 
    searchQuery: string,
    visibleFields: string[]
  ): WorkCode[] {
    if (!searchQuery.trim()) return workCodes;

    const query = SecurityValidator.sanitizeInput(searchQuery.toLowerCase());
    
    return workCodes.filter(code => {
      return visibleFields.some(fieldName => {
        const value = code[fieldName as keyof WorkCode];
        if (value === null || value === undefined) return false;

        if (fieldName === 'status') {
          return this.getStatusLabel(value as number).toLowerCase().includes(query);
        }
        return String(value).toLowerCase().includes(query);
      });
    });
  }

  static validateRequiredFields(
    formData: Omit<WorkCode, 'work_code_id'>,
    fieldConfigs: Record<string, FieldConfig>
  ): { isValid: boolean; missingField?: string } {
    const requiredFields = Object.entries(fieldConfigs)
      .filter(([_, config]) => config.required && config.visible)
      .map(([key, _]) => key);

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        return { 
          isValid: false, 
          missingField: fieldConfigs[field].label 
        };
      }
    }

    return { isValid: true };
  }
}

// ============================================================================
// REACT COMPONENT (Presentation Layer)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as Label from '@radix-ui/react-label';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { X, Plus, Pencil, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import ReactDOM from "react-dom/client";
import "./index.css";
import { ReactTabulator } from 'react-tabulator';
import 'react-tabulator/css/tabulator.min.css';
import 'react-tabulator/css/bootstrap/tabulator_bootstrap.min.css';

const WorkCodeManagement: React.FC<WorkCodeEditorProps> = ({ 
  pageConfig = ConfigurationManager.getDefaultPageConfig(),
  apiClient 
}) => {
  // Initialize API client with Dependency Injection
  const client = useMemo(() => {
    return apiClient || new WorkCodeApiClient(ConfigurationManager.getApiBaseUrl());
  }, [apiClient]);

  // State management
  const [workCodes, setWorkCodes] = useState<WorkCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState<WorkCode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<WorkCode, 'work_code_id'>>({
    prefix: '',
    suffix: '',
    short_work_code: '',
    long_work_code: '',
    description: '',
    status: 1
  });

  // Fetch work codes on mount
  useEffect(() => {
    fetchWorkCodes();
  }, []);

  const fetchWorkCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await client.getAll();
      setWorkCodes(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Error fetching work codes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Configuration helpers (memoized for performance)
  const getFieldConfig = useCallback((fieldName: string): FieldConfig => {
    return pageConfig.fields[fieldName] || {
      enabled: true,
      readonly: false,
      visible: true,
      label: fieldName,
      hint: '',
      required: false
    };
  }, [pageConfig.fields]);

  const getActionConfig = useCallback((actionName: string): ActionConfig => {
    return pageConfig.actions[actionName] || {
      enabled: true,
      visible: true
    };
  }, [pageConfig.actions]);

  const visibleColumns = useMemo(() => {
    return Object.entries(pageConfig.columns)
      .filter(([_, config]) => config.visible)
      .map(([key, config]) => ({ key, ...config }));
  }, [pageConfig.columns]);

  const visibleFieldNames = useMemo(() => {
    return Object.entries(pageConfig.fields)
      .filter(([_, config]) => config.visible)
      .map(([key, _]) => key);
  }, [pageConfig.fields]);

  const filteredWorkCodes = useMemo(() => {
    return WorkCodeService.filterWorkCodes(workCodes, searchQuery, visibleFieldNames);
  }, [workCodes, searchQuery, visibleFieldNames]);

  const hasVisibleActions = useMemo(() => {
    return getActionConfig('edit').visible || getActionConfig('delete').visible;
  }, [getActionConfig]);

  // Event handlers
  const handleInputChange = useCallback((field: string, value: string | number) => {
    const fieldConfig = getFieldConfig(field);
    if (!fieldConfig.enabled || fieldConfig.readonly) return;
    
    // OWASP: Sanitize input
    const sanitizedValue = typeof value === 'string' 
      ? SecurityValidator.sanitizeInput(value) 
      : value;
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  }, [getFieldConfig]);

  const handleSubmit = useCallback(async () => {
    // Validate required fields
    const validation = WorkCodeService.validateRequiredFields(formData, pageConfig.fields);
    if (!validation.isValid) {
      alert(`${validation.missingField} is required`);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);

      if (editingCode) {
        const updatedCode = await client.update(editingCode.work_code_id, formData);
        setWorkCodes(prev => prev.map(code => 
          code.work_code_id === editingCode.work_code_id ? updatedCode : code
        ));
      } else {
        const newCode = await client.create(formData);
        setWorkCodes(prev => [...prev, newCode]);
      }
      
      closeDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Error saving work code:', err);
      alert(`Failed to save work code: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingCode, client, pageConfig.fields]);

  const openDialog = useCallback((code: WorkCode | null = null) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        prefix: code.prefix,
        suffix: code.suffix,
        short_work_code: code.short_work_code,
        long_work_code: code.long_work_code,
        description: code.description,
        status: code.status
      });
    } else {
      setEditingCode(null);
      setFormData({
        prefix: '',
        suffix: '',
        short_work_code: '',
        long_work_code: '',
        description: '',
        status: 1
      });
    }
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingCode(null);
  }, []);

  const openDeleteDialog = useCallback((id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;

    try {
      setIsSubmitting(true);
      setError(null);
      
      await client.delete(deletingId);
      setWorkCodes(prev => prev.filter(code => code.work_code_id !== deletingId));
      
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Error deleting work code:', err);
      alert(`Failed to delete work code: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [deletingId, client]);

  const handleSearchChange = useCallback((value: string) => {
    // OWASP: Limit search query length to prevent DoS
    const sanitized = SecurityValidator.sanitizeInput(value).substring(0, 100);
    setSearchQuery(sanitized);
  }, []);

  // Render field input (separated for clarity)
  const renderFieldInput = useCallback((fieldName: string) => {
    const fieldConfig = getFieldConfig(fieldName);
    
    if (!fieldConfig.visible) return null;

    const isDisabled = !fieldConfig.enabled || fieldConfig.readonly;
    const inputId = `field-${fieldName}`;
    const hintId = `${inputId}-hint`;

    if (fieldName === 'status') {
      return (
        <div key={fieldName}>
          <Label.Root htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {fieldConfig.label} {fieldConfig.required && <span className="text-red-500" aria-label="required">*</span>}
          </Label.Root>
          <Select.Root 
            value={formData.status.toString()} 
            onValueChange={(value) => handleInputChange('status', parseInt(value))}
            disabled={isDisabled}
          >
            <Select.Trigger 
              id={inputId}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center bg-white ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Select status"
              disabled={isDisabled}
            >
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={16} aria-hidden="true" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="0" className="px-3 py-2 cursor-pointer hover:bg-gray-100 focus:bg-gray-100 rounded outline-none">
                    <Select.ItemText>Inactive</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="1" className="px-3 py-2 cursor-pointer hover:bg-gray-100 focus:bg-gray-100 rounded outline-none">
                    <Select.ItemText>Active</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="2" className="px-3 py-2 cursor-pointer hover:bg-gray-100 focus:bg-gray-100 rounded outline-none">
                    <Select.ItemText>Pending</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="3" className="px-3 py-2 cursor-pointer hover:bg-gray-100 focus:bg-gray-100 rounded outline-none">
                    <Select.ItemText>Archived</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          {fieldConfig.hint && <span id={hintId} className="text-xs text-gray-500">{fieldConfig.hint}</span>}
        </div>
      );
    }

    if (fieldName === 'description') {
      return (
        <div key={fieldName}>
          <Label.Root htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {fieldConfig.label} {fieldConfig.required && <span className="text-red-500" aria-label="required">*</span>}
          </Label.Root>
          <textarea
            id={inputId}
            value={formData[fieldName as keyof typeof formData] as string || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            rows={3}
            disabled={isDisabled}
            readOnly={fieldConfig.readonly}
            required={fieldConfig.required}
            aria-required={fieldConfig.required}
            maxLength={1000}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            aria-describedby={fieldConfig.hint ? hintId : undefined}
          />
          {fieldConfig.hint && <span id={hintId} className="text-xs text-gray-500">{fieldConfig.hint}</span>}
        </div>
      );
    }

    const maxLengths: Record<string, number> = {
      prefix: 10,
      suffix: 10,
      short_work_code: 10,
      long_work_code: 50
    };

    return (
      <div key={fieldName}>
        <Label.Root htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {fieldConfig.label} {fieldConfig.required && <span className="text-red-500" aria-label="required">*</span>}
        </Label.Root>
        <input
          id={inputId}
          type="text"
          value={formData[fieldName as keyof typeof formData] as string || ''}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          maxLength={maxLengths[fieldName]}
          disabled={isDisabled}
          readOnly={fieldConfig.readonly}
          required={fieldConfig.required}
          aria-required={fieldConfig.required}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          aria-describedby={fieldConfig.hint ? hintId : undefined}
        />
        {fieldConfig.hint && <span id={hintId} className="text-xs text-gray-500">{fieldConfig.hint}</span>}
      </div>
    );
  }, [formData, getFieldConfig, handleInputChange]);

  const addActionConfig = getActionConfig('add');
  const editActionConfig = getActionConfig('edit');
  const deleteActionConfig = getActionConfig('delete');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Work Code Management</h1>
          {addActionConfig.visible && (
            <button
              onClick={() => openDialog()}
              disabled={!addActionConfig.enabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                addActionConfig.enabled 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              aria-label="Add new work code"
            >
              <Plus size={20} aria-hidden="true" />
              Add Work Code
            </button>
          )}
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3" role="alert">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
              aria-label="Dismiss error"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mb-6">
          <Label.Root htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-2">
            Search Work Codes
          </Label.Root>
          <div className="relative">
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by any field..."
              maxLength={100}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-describedby="search-hint"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <span id="search-hint" className="text-xs text-gray-500 mt-1 block">
            {searchQuery ? `Found ${filteredWorkCodes.length} result${filteredWorkCodes.length !== 1 ? 's' : ''}` : 'Search across all visible fields'}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden" role="region" aria-label="Work codes table">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={40} aria-hidden="true" />
            <span className="ml-3 text-gray-600">Loading work codes...</span>
          </div>
        ) : (
          <ReactTabulator
            data={filteredWorkCodes}
            columns={[
              ...visibleColumns.map(col => ({
                title: col.label,
                field: col.key,
                headerFilter: 'input',
                sorter: 'string',
                tooltip: true,
                formatter:
                  col.key === 'status'
                    ? (cell) => {
                        const value = cell.getValue();
                        return `<span class="px-2 py-1 text-xs font-medium rounded-full ${WorkCodeService.getStatusColor(
                          value
                        )}">${WorkCodeService.getStatusLabel(value)}</span>`;
                      }
                    : undefined,
              })),
              ...(hasVisibleActions
                ? [
                    {
                      title: 'Actions',
                      field: 'actions',
                      hozAlign: 'center',
                      headerSort: false,
                      width: 120,
                      formatter: (cell) => {
                        const data = cell.getRow().getData();
                        return `
                          <button class="tabulator-btn-edit" aria-label="Edit ${data.short_work_code}">
                            ✏️
                          </button>
                          <button class="tabulator-btn-delete" aria-label="Delete ${data.short_work_code}">
                            🗑️
                          </button>
                        `;
                      },
                      cellClick: (e, cell) => {
                        const data = cell.getRow().getData();
                        if (e.target.classList.contains('tabulator-btn-edit')) {
                          openDialog(data);
                        } else if (e.target.classList.contains('tabulator-btn-delete')) {
                          openDeleteDialog(data.work_code_id);
                        }
                      },
                    },
                  ]
                : []),
            ]}
            options={{
              layout: 'fitColumns',
              pagination: 'local',
              paginationSize: 10,
              movableColumns: true,
              tooltips: true,
              height: '600px',
              ariaTitle: 'Work Codes Data Grid',
            }}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          )}
        </div>


        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content 
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              aria-describedby="dialog-description"
            >
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  {editingCode ? 'Edit Work Code' : 'Add Work Code'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button 
                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                    aria-label="Close dialog"
                  >
                    <X size={24} aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </div>

              <Dialog.Description id="dialog-description" className="sr-only">
                {editingCode ? 'Edit the work code details below' : 'Enter details to create a new work code'}
              </Dialog.Description>

              <div className="space-y-4">
                {Object.keys(pageConfig.fields).map(fieldName => renderFieldInput(fieldName))}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center gap-2 ${
                      isSubmitting
                        ? 'bg-blue-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    }`}
                  >
                    {isSubmitting && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
                    {isSubmitting ? 'Saving...' : (editingCode ? 'Update' : 'Create')}
                  </button>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      className={`flex-1 px-4 py-2 rounded-md transition-colors font-medium ${
                        isSubmitting
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
                      }`}
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md focus:outline-none">
              <AlertDialog.Title className="text-lg font-bold text-gray-900 mb-2">
                Delete Work Code
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this work code? This action cannot be undone.
              </AlertDialog.Description>
              <div className="flex gap-3 justify-end">
                <AlertDialog.Cancel asChild>
                  <button 
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-md transition-colors font-medium ${
                      isSubmitting
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
                    }`}
                  >
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center gap-2 ${
                      isSubmitting
                        ? 'bg-red-400 text-white cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                    }`}
                  >
                    {isSubmitting && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
                    {isSubmitting ? 'Deleting...' : 'Delete'}
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
};

export default WorkCodeManagement;