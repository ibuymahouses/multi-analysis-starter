import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Badge } from './badge';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  rowIndex?: number;
  listNo?: string;
  field?: string;
  value?: any;
}

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: ValidationIssue[];
  title: string;
  type: 'error' | 'warning' | 'info';
  onNavigateToProperty?: (listNo: string) => void;
}

export function ValidationModal({ isOpen, onClose, issues, title, type, onNavigateToProperty }: ValidationModalProps) {
  const getTypeColor = (issueType: string) => {
    switch (issueType) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (issueType: string) => {
    switch (issueType) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  const groupedIssues = issues.reduce((acc, issue) => {
    const key = issue.message;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={getTypeColor(type)}>
              {getTypeIcon(type)} {title}
            </span>
            <Badge variant="outline">{issues.length} total</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {Object.entries(groupedIssues).map(([message, issueGroup]) => (
              <div key={message} className="border rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-sm font-medium">{getTypeIcon(type)} {message}</span>
                  <Badge variant="secondary" className="text-xs">
                    {issueGroup.length} occurrence{issueGroup.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {issueGroup.slice(0, 20).map((issue, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                      {issue.listNo ? (
                        <button
                          onClick={() => {
                            if (onNavigateToProperty && issue.listNo) {
                              onNavigateToProperty(issue.listNo);
                              onClose();
                            }
                          }}
                          className="font-mono bg-blue-100 hover:bg-blue-200 px-1 rounded cursor-pointer text-blue-700 hover:text-blue-900 transition-colors"
                          title={`Click to navigate to ${issue.listNo}`}
                        >
                          {issue.listNo}
                        </button>
                      ) : (
                        <span className="font-mono bg-gray-100 px-1 rounded">
                          Row {(issue.rowIndex || 0) + 1}
                        </span>
                      )}
                      {issue.field && (
                        <span className="text-gray-500">({issue.field})</span>
                      )}
                      {issue.value && (
                        <span className="text-gray-500">= {String(issue.value)}</span>
                      )}
                    </div>
                  ))}
                  {issueGroup.length > 20 && (
                    <div className="text-xs text-gray-500 italic">
                      ... and {issueGroup.length - 20} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
