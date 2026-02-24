import { useState, useRef } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Upload, FileText, Image, File, CheckCircle, AlertCircle, Loader2, X, Trash2 } from "lucide-react";
import { Progress } from "./ui/progress";

interface BatchLabUploadProps {
  patientId: number;
  onSuccess?: () => void;
}

interface FileUploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'parsing' | 'success' | 'error';
  progress: number;
  parsedData?: any;
  error?: string;
  preview?: string;
}

export default function BatchLabUpload({ patientId, onSuccess }: BatchLabUploadProps) {
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.patientPortal.uploadUnstructuredLab.useMutation();

  const acceptedFormats = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/bmp': ['.bmp'],
    'image/tiff': ['.tiff', '.tif'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const handleFilesSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileUploadStatus[] = [];
    
    Array.from(selectedFiles).forEach((file) => {
      // Validate file type
      const isValidType = Object.keys(acceptedFormats).some(type => 
        file.type === type || file.name.match(new RegExp(`\\.(${acceptedFormats[type as keyof typeof acceptedFormats].join('|').replace(/\./g, '')})$`, 'i'))
      );

      if (!isValidType) {
        newFiles.push({
          file,
          status: 'error',
          progress: 0,
          error: 'Unsupported file format'
        });
        return;
      }

      const fileStatus: FileUploadStatus = {
        file,
        status: 'pending',
        progress: 0,
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileStatus.preview = e.target?.result as string;
          setFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(fileStatus);
    });

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const uploadFile = async (fileStatus: FileUploadStatus, index: number): Promise<void> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          // Update status to uploading
          setFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, status: 'uploading' as const, progress: 30 } : f
          ));

          const base64Content = (e.target?.result as string).split(',')[1];

          // Update status to parsing
          setFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, status: 'parsing' as const, progress: 60 } : f
          ));

          const result = await uploadMutation.mutateAsync({
            patientId,
            fileContent: base64Content,
            mimeType: fileStatus.file.type,
            filename: fileStatus.file.name,
          });

          // Update status to success
          setFiles(prev => prev.map((f, i) => 
            i === index ? { 
              ...f, 
              status: 'success' as const, 
              progress: 100,
              parsedData: result.parsed 
            } : f
          ));

          resolve();
        } catch (err: any) {
          console.error('Upload error:', err);
          setFiles(prev => prev.map((f, i) => 
            i === index ? { 
              ...f, 
              status: 'error' as const, 
              progress: 0,
              error: err.message || 'Failed to parse' 
            } : f
          ));
          resolve();
        }
      };

      reader.onerror = () => {
        setFiles(prev => prev.map((f, i) => 
          i === index ? { 
            ...f, 
            status: 'error' as const, 
            progress: 0,
            error: 'Failed to read file' 
          } : f
        ));
        resolve();
      };

      reader.readAsDataURL(fileStatus.file);
    });
  };

  const handleBatchUpload = async () => {
    setIsProcessing(true);

    // Process files sequentially to avoid overwhelming the API
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending' || files[i].status === 'error') {
        await uploadFile(files[i], i);
      }
    }

    setIsProcessing(false);

    // Check if all successful
    const allSuccessful = files.every(f => f.status === 'success');
    if (allSuccessful && onSuccess) {
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  };

  const retryFailed = async () => {
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'error') {
        await uploadFile(files[i], i);
      }
    }

    setIsProcessing(false);
  };

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;
  const overallProgress = files.length > 0 
    ? Math.round((files.reduce((sum, f) => sum + f.progress, 0) / files.length))
    : 0;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Batch Upload Lab Results</h3>
            <p className="text-sm text-gray-600">
              Upload multiple lab reports at once for automatic processing
            </p>
          </div>
          {files.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={isProcessing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Drag and Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Drag and drop multiple lab reports here, or
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={isProcessing}
          >
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={Object.values(acceptedFormats).flat().join(',')}
            onChange={(e) => handleFilesSelect(e.target.files)}
          />
          <p className="text-xs text-gray-500 mt-4">
            Supported formats: PDF, JPG, PNG, GIF, BMP, TIFF, TXT, CSV
          </p>
        </div>

        {/* Batch Progress Summary */}
        {files.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Batch Progress</span>
              <span className="text-sm text-gray-600">
                {successCount} / {files.length} completed
              </span>
            </div>
            <Progress value={overallProgress} className="mb-2" />
            <div className="flex gap-4 text-xs">
              <span className="text-green-600">✓ {successCount} successful</span>
              {errorCount > 0 && <span className="text-red-600">✗ {errorCount} failed</span>}
              {pendingCount > 0 && <span className="text-gray-600">⏳ {pendingCount} pending</span>}
            </div>
          </div>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {files.map((fileStatus, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {fileStatus.preview ? (
                    <img 
                      src={fileStatus.preview} 
                      alt="Preview" 
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(fileStatus.file.type)
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileStatus.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(fileStatus.file.size / 1024).toFixed(2)} KB
                  </p>
                  
                  {/* Status */}
                  {fileStatus.status === 'pending' && (
                    <span className="text-xs text-gray-600">Ready to upload</span>
                  )}
                  {fileStatus.status === 'uploading' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading...
                    </span>
                  )}
                  {fileStatus.status === 'parsing' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Parsing...
                    </span>
                  )}
                  {fileStatus.status === 'success' && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Parsed successfully
                      {fileStatus.parsedData?.results && 
                        ` - ${fileStatus.parsedData.results.length} tests found`
                      }
                    </span>
                  )}
                  {fileStatus.status === 'error' && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fileStatus.error || 'Failed to parse'}
                    </span>
                  )}
                </div>

                {/* Remove Button */}
                {!isProcessing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {files.length > 0 && (
          <div className="flex gap-2">
            {(pendingCount > 0 || errorCount > 0) && (
              <Button
                onClick={pendingCount > 0 ? handleBatchUpload : retryFailed}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {pendingCount > 0 ? `Upload ${pendingCount} File${pendingCount > 1 ? 's' : ''}` : `Retry ${errorCount} Failed`}
                  </>
                )}
              </Button>
            )}
            
            {successCount === files.length && successCount > 0 && (
              <Button
                variant="outline"
                onClick={clearAll}
                className="flex-1"
              >
                Upload More Files
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
