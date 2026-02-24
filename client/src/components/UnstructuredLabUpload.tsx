import { useState, useRef } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Upload, FileText, Image, File, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UnstructuredLabUploadProps {
  patientId: number;
  onSuccess?: () => void;
}

export default function UnstructuredLabUpload({ patientId, onSuccess }: UnstructuredLabUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
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
    if (mimeType === 'application/pdf') return <FileText className="w-12 h-12 text-red-500" />;
    if (mimeType.startsWith('image/')) return <Image className="w-12 h-12 text-blue-500" />;
    return <File className="w-12 h-12 text-gray-500" />;
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setParsedData(null);
    setUploadStatus('idle');

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Validate file type
      const isValidType = Object.keys(acceptedFormats).some(type => 
        droppedFile.type === type || droppedFile.name.match(new RegExp(`\\.(${acceptedFormats[type as keyof typeof acceptedFormats].join('|').replace(/\./g, '')})$`, 'i'))
      );

      if (!isValidType) {
        setError('Unsupported file format. Please upload PDF, image (JPG, PNG, GIF, BMP, TIFF), or text file.');
        return;
      }

      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setError(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setUploadStatus('parsing');
          const base64Content = (e.target?.result as string).split(',')[1]; // Remove data URL prefix

          const result = await uploadMutation.mutateAsync({
            patientId,
            fileContent: base64Content,
            mimeType: file.type,
            filename: file.name,
          });

          setParsedData(result.parsed);
          setUploadStatus('success');
          
          if (onSuccess) {
            setTimeout(() => {
              onSuccess();
            }, 2000);
          }
        } catch (err: any) {
          console.error('Upload error:', err);
          setError(err.message || 'Failed to parse lab report. Please try again or enter data manually.');
          setUploadStatus('error');
        }
      };

      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
        setUploadStatus('error');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
      setUploadStatus('error');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Upload Lab Results</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload lab results in any format: PDF, images (including handwritten), or text files. 
          Our AI will automatically extract and structure the data.
        </p>

        {/* Drag and Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
          {!file ? (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drag and drop your lab report here, or
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={Object.values(acceptedFormats).flat().join(',')}
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
              />
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: PDF, JPG, PNG, GIF, BMP, TIFF, TXT, CSV
              </p>
            </>
          ) : (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="flex items-center justify-center gap-4">
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 rounded border" />
                ) : (
                  getFileIcon(file.type)
                )}
              </div>
              
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>

              {/* Status Messages */}
              {uploadStatus === 'uploading' && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading file...</span>
                </div>
              )}

              {uploadStatus === 'parsing' && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AI is parsing your lab report...</span>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>Successfully parsed lab report!</span>
                </div>
              )}

              {uploadStatus === 'error' && error && (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Parsed Data Preview */}
              {parsedData && (
                <div className="mt-4 p-4 bg-green-50 rounded border border-green-200 text-left">
                  <h4 className="font-semibold text-green-900 mb-2">Extracted Data:</h4>
                  <div className="text-sm space-y-1">
                    {parsedData.labName && (
                      <p><span className="font-medium">Lab:</span> {parsedData.labName}</p>
                    )}
                    {parsedData.testDate && (
                      <p><span className="font-medium">Date:</span> {new Date(parsedData.testDate).toLocaleDateString()}</p>
                    )}
                    <p><span className="font-medium">Tests Found:</span> {parsedData.results?.length || 0}</p>
                    {parsedData.confidence && (
                      <p><span className="font-medium">Confidence:</span> {Math.round(parsedData.confidence * 100)}%</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-center">
                {uploadStatus === 'idle' && (
                  <>
                    <Button onClick={handleUpload}>
                      Parse Lab Report
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setError(null);
                        setParsedData(null);
                        setUploadStatus('idle');
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                
                {uploadStatus === 'success' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setParsedData(null);
                      setUploadStatus('idle');
                    }}
                  >
                    Upload Another
                  </Button>
                )}

                {uploadStatus === 'error' && (
                  <>
                    <Button onClick={handleUpload}>
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setError(null);
                        setUploadStatus('idle');
                      }}
                    >
                      Choose Different File
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
