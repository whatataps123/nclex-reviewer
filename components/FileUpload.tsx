import React, { useState, useRef } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

// 1. Define the props this component accepts
interface FileUploadProps {
  onUpload: (file: File) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // 2. Strongly type the ref to an HTMLInputElement
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. Type the Drag Events
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  // 4. Type the Input Change Event
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    handleFiles(files);
  };

  // 5. Type the FileList
  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      
      if (file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.');
        return;
      }
      
      setFileName(file.name);
      onUpload(file);
    }
  };

  return (
    <div 
      className={`w-full max-w-xl mx-auto p-12 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-200 ${
        isDragging 
          ? 'border-blue-500 bg-blue-50 scale-105' 
          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onFileInputChange} 
        accept="application/pdf" 
        className="hidden" 
      />
      
      <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
        {fileName ? (
          <FileText className="w-16 h-16 text-blue-500 animate-pulse" />
        ) : (
          <UploadCloud className={`w-16 h-16 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        )}
        
        <div>
          {fileName ? (
            <p className="text-lg font-semibold text-gray-700">{fileName}</p>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-700">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500 mt-1">
                PDF files only
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}