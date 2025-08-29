"use client";
import { useState } from "react";
import * as XLSX from "xlsx";

type Field = {
  field_name: string;
  field_label: string;
  field_type: string;
};

type ExcelTemplateProps = {
  fields: Field[];
  formName: string;
};

export default function ExcelTemplate({ fields, formName }: ExcelTemplateProps) {
  const [showTemplate, setShowTemplate] = useState(false);

  const downloadTemplate = () => {
    // Create sample data
    const sampleData = [
      // Header row
      fields.map(f => f.field_label),
      // Sample row
      fields.map(f => {
        switch (f.field_type) {
          case 'text':
            return 'Sample text';
          case 'email':
            return 'sample@email.com';
          case 'phone':
            return '0123456789';
          case 'date':
            return '2025-01-01';
          case 'datetime':
            return '2025-01-01 10:00:00';
          case 'select':
            return 'Option 1';
          case 'database':
            return 'Sample Name'; // Will be looked up
          default:
            return 'Sample value';
        }
      })
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sampleData);

    // Set column widths
    const colWidths = fields.map(() => ({ width: 20 }));
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Download file
    XLSX.writeFile(wb, `${formName}_template.xlsx`);
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
            Excel Import Template
          </h4>
          <p className="text-xs text-blue-600 dark:text-blue-300">
            Download template or view required columns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTemplate(!showTemplate)}
            className="text-xs text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
          >
            {showTemplate ? 'Hide' : 'View'} columns
          </button>
          <button
            onClick={downloadTemplate}
            className="px-3 py-1 text-xs rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            Download Template
          </button>
        </div>
      </div>

      {showTemplate && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
          <div className="text-xs text-blue-700 dark:text-blue-300 mb-2">
            Required columns (case-insensitive):
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {fields.map((field) => (
              <div key={field.field_name} className="text-xs bg-white dark:bg-gray-800 rounded px-2 py-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {field.field_label}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {field.field_name} ({field.field_type})
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-blue-600 dark:text-blue-300">
            <div className="font-medium mb-1">Notes:</div>
            <ul className="space-y-1">
              <li>• First row must contain column headers</li>
              <li>• Column names can match field_name or field_label</li>
              <li>• Database fields will be looked up by name</li>
              <li>• Empty cells will be skipped</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
