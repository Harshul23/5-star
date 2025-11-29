"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect?: (file: File | null) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      accept = "image/*",
      maxSize = 10,
      onFileSelect,
      placeholder = "Upload a file",
      hint = "PNG, JPG up to 10MB",
      className,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = useCallback(
      (file: File): boolean => {
        setError(null);

        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
          setError(`File size must be less than ${maxSize}MB`);
          return false;
        }

        // Check file type if accept is specified
        if (accept) {
          const acceptedTypes = accept.split(",").map((t) => t.trim());
          const fileType = file.type;
          const fileNameParts = file.name.split(".");
          const fileExtension = fileNameParts.length > 1 
            ? `.${fileNameParts.pop()?.toLowerCase() ?? ""}` 
            : "";

          const isValid = acceptedTypes.some((type) => {
            if (type.startsWith(".")) {
              return fileExtension === type.toLowerCase();
            }
            if (type.endsWith("/*")) {
              return fileType.startsWith(type.replace("/*", "/"));
            }
            return fileType === type;
          });

          if (!isValid) {
            setError("Invalid file type");
            return false;
          }
        }

        return true;
      },
      [accept, maxSize]
    );

    const handleFile = useCallback(
      (selectedFile: File) => {
        if (!validateFile(selectedFile)) {
          return;
        }

        setFile(selectedFile);
        onFileSelect?.(selectedFile);

        // Create preview for images
        if (selectedFile.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreview(e.target?.result as string);
          };
          reader.readAsDataURL(selectedFile);
        }
      },
      [onFileSelect, validateFile]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
          handleFile(droppedFile);
        }
      },
      [handleFile]
    );

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
          handleFile(selectedFile);
        }
      },
      [handleFile]
    );

    const handleButtonClick = useCallback(() => {
      inputRef.current?.click();
    }, []);

    const handleRemove = useCallback(() => {
      setFile(null);
      setPreview(null);
      setError(null);
      onFileSelect?.(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }, [onFileSelect]);

    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 text-center transition-colors",
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-500",
            file && "border-green-500 bg-green-50"
          )}
        >
          {file && preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm text-gray-600 mt-2">{file.name}</p>
            </div>
          ) : file ? (
            <div className="relative inline-block">
              <div className="flex items-center justify-center space-x-2">
                <ImageIcon className="h-8 w-8 text-green-500" />
                <span className="text-sm text-gray-600">{file.name}</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Upload
                className={cn(
                  "h-12 w-12 mx-auto mb-4",
                  isDragging ? "text-blue-500" : "text-gray-400"
                )}
              />
              <p className="text-sm text-gray-600 mb-2">{placeholder}</p>
              <p className="text-xs text-gray-400 mb-4">{hint}</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleButtonClick}
              >
                Choose File
              </Button>
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export { FileUpload };
