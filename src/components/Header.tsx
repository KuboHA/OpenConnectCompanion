import { Upload, FolderUp } from 'lucide-react';
import { useWorkoutStore } from '../stores/workoutStore';
import { useToastStore } from '../stores/toastStore';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { UploadResult } from '../types';

export default function Header() {
  const { uploadFiles, isUploading, fetchDashboardData } = useWorkoutStore();
  const addToast = useToastStore((state) => state.addToast);

  const handleUploadFiles = async () => {
    try {
      const files = await open({
        multiple: true,
        filters: [{ name: 'FIT Files', extensions: ['fit', 'FIT'] }],
      });
      
      if (files && files.length > 0) {
        const paths = Array.isArray(files) ? files : [files];
        const results = await uploadFiles(paths);
        
        const successful = results.filter((r) => r.success).length;
        const duplicates = results.filter((r) => r.duplicate).length;
        const failed = results.filter((r) => !r.success && !r.duplicate).length;
        
        if (successful > 0) {
          addToast(`Successfully uploaded ${successful} workout${successful > 1 ? 's' : ''}`, 'success');
        }
        if (duplicates > 0) {
          addToast(`${duplicates} duplicate${duplicates > 1 ? 's' : ''} skipped`, 'warning');
        }
        if (failed > 0) {
          addToast(`Failed to upload ${failed} file${failed > 1 ? 's' : ''}`, 'error');
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      addToast('Failed to open file dialog', 'error');
    }
  };

  const handleUploadFolder = async () => {
    try {
      const folder = await open({
        directory: true,
      });
      
      if (folder) {
        addToast('Scanning folder for FIT files...', 'info');
        const results = await invoke<UploadResult[]>('upload_fit_folder', { folderPath: folder });
        
        const successful = results.filter((r) => r.success).length;
        const duplicates = results.filter((r) => r.duplicate).length;
        const failed = results.filter((r) => !r.success && !r.duplicate).length;
        
        if (successful > 0) {
          addToast(`Successfully uploaded ${successful} workout${successful > 1 ? 's' : ''}`, 'success');
          fetchDashboardData();
        }
        if (duplicates > 0) {
          addToast(`${duplicates} duplicate${duplicates > 1 ? 's' : ''} skipped`, 'warning');
        }
        if (failed > 0) {
          addToast(`Failed to upload ${failed} file${failed > 1 ? 's' : ''}`, 'error');
        }
        if (successful === 0 && duplicates === 0 && failed === 0) {
          addToast('No FIT files found in folder', 'warning');
        }
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
      addToast('Failed to open folder dialog', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-bg-card)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="leading-tight">
                <span className="block text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">OpenConnect</span>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">Companion</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Upload Files Button */}
            <button
              onClick={handleUploadFiles}
              disabled={isUploading}
              className="cursor-pointer inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Upload Folder Button */}
            <button
              onClick={handleUploadFolder}
              disabled={isUploading}
              className="cursor-pointer inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
            >
              <FolderUp className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Folder</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
