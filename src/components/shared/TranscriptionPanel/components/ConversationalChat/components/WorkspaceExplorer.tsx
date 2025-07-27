// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState, useEffect } from "react";
import { setOption, getOption, STORAGE_KEYS } from '../../../../../../services/StorageService';

// File structure interface for our custom file explorer
// We'll build a simple version first, then integrate the external library later
interface FileItem {
  id: string;
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
  updatedAt: string;
  children?: FileItem[];
}

interface Workspace {
  name: string;
  path: string;
}

export const WorkspaceExplorer: React.FC = () => {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [watcherActive, setWatcherActive] = useState(false);

  // Carregar workspace salvo na inicialização
  useEffect(() => {
    const loadSavedWorkspace = async () => {
      const savedWorkspacePath = getOption<string>(STORAGE_KEYS.WORKSPACE_PATH);
      
      if (savedWorkspacePath) {
        try {
          // Verificar se o diretório ainda existe
          const result = await window.electronAPI.readDirectory(savedWorkspacePath);
          
          if (result.success) {
            const workspaceName = savedWorkspacePath.split('/').pop() || 'Workspace';
            
            setSelectedWorkspace({
              name: workspaceName,
              path: savedWorkspacePath
            });
            setCurrentPath(savedWorkspacePath);
            
            // Carregar conteúdo do diretório
            await loadDirectoryContents(savedWorkspacePath);
            
            console.log('📁 [WORKSPACE] Workspace salvo carregado:', savedWorkspacePath);
          } else {
            // Se o diretório não existe mais, limpar das configurações
            setOption(STORAGE_KEYS.WORKSPACE_PATH, undefined);
            console.warn('⚠️ [WORKSPACE] Workspace salvo não existe mais, removido das configurações');
          }
        } catch (error) {
          console.error('❌ [WORKSPACE] Erro ao carregar workspace salvo:', error);
          setOption(STORAGE_KEYS.WORKSPACE_PATH, undefined);
        }
      }
    };
    
    loadSavedWorkspace();
  }, []);

  // Setup file system watcher when workspace changes
  useEffect(() => {
    if (!selectedWorkspace?.path || !(window as any).electronAPI?.startWorkspaceWatcher) {
      return;
    }

    const setupWatcher = async () => {
      try {
        console.log('👁️ [WORKSPACE] Setting up file system watcher for:', selectedWorkspace.path);
        
        // Start file system watcher
        const result = await (window as any).electronAPI.startWorkspaceWatcher(selectedWorkspace.path);
        
        if (result.success) {
          setWatcherActive(true);
          console.log('✅ [WORKSPACE] File system watcher started successfully');
        } else {
          console.error('❌ [WORKSPACE] Failed to start file system watcher:', result.error);
        }
      } catch (error) {
        console.error('❌ [WORKSPACE] Error setting up file system watcher:', error);
      }
    };

    setupWatcher();

    // Cleanup function
    return () => {
      if (selectedWorkspace?.path && (window as any).electronAPI?.stopWorkspaceWatcher) {
        (window as any).electronAPI.stopWorkspaceWatcher(selectedWorkspace.path)
          .then((result: any) => {
            if (result.success) {
              setWatcherActive(false);
              console.log('🚫 [WORKSPACE] File system watcher stopped');
            }
          })
          .catch((error: any) => {
            console.error('❌ [WORKSPACE] Error stopping file system watcher:', error);
          });
      }
    };
  }, [selectedWorkspace?.path]);

  // Setup file change listeners
  useEffect(() => {
    if (!(window as any).electronAPI?.onWorkspaceFileChanged) {
      return;
    }

    // Listen for file system changes
    const unsubscribeFileChanged = (window as any).electronAPI.onWorkspaceFileChanged(
      async (data: {
        eventType: string;
        filename: string;
        fullPath: string;
        workspacePath: string;
      }) => {
        console.log('📄 [WORKSPACE] File system change detected:', data);
        
        // Check if the change is in the current directory we're viewing
        if (currentPath === data.workspacePath || data.fullPath.startsWith(currentPath)) {
          console.log('🔄 [WORKSPACE] Refreshing current directory view...');
          
          // Add a small delay to ensure file system operations are complete
          setTimeout(async () => {
            try {
              await loadDirectoryContents(currentPath);
            } catch (error) {
              console.error('❌ [WORKSPACE] Error refreshing directory:', error);
            }
          }, 100);
        }
      }
    );

    // Listen for watcher errors
    const unsubscribeWatcherError = (window as any).electronAPI.onWorkspaceWatcherError?.(
      (data: { workspacePath: string; error: string }) => {
        console.error('❌ [WORKSPACE] File system watcher error:', data);
        setWatcherActive(false);
        // Optionally show user notification here
      }
    );

    // Cleanup function
    return () => {
      unsubscribeFileChanged?.();
      unsubscribeWatcherError?.();
    };
  }, [currentPath]);

  const handleSelectWorkspace = async () => {
    try {
      setIsLoading(true);
      
      // Show confirmation before selecting
      const shouldProceed = window.confirm(
        'Select a folder to use as your workspace. This will allow you to browse and manage files within that directory.'
      );
      
      if (!shouldProceed) {
        setIsLoading(false);
        return;
      }

      // Use real Electron API to select folder
      const result = await window.electronAPI.selectWorkspaceFolder();
      
      if (result.canceled || !result.filePath) {
        setIsLoading(false);
        return;
      }

      const workspacePath = result.filePath;
      const workspaceName = workspacePath.split('/').pop() || 'Workspace';
      
      setSelectedWorkspace({
        name: workspaceName,
        path: workspacePath
      });
      setCurrentPath(workspacePath);
      
      // Salvar o caminho do workspace nas configurações
      setOption(STORAGE_KEYS.WORKSPACE_PATH, workspacePath);
      console.log('💾 [WORKSPACE] Workspace salvo nas configurações:', workspacePath);
      
      // Load initial directory contents
      await loadDirectoryContents(workspacePath);
      
    } catch (error) {
      console.error('Error selecting workspace:', error);
      alert('Failed to select workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDirectoryContents = async (dirPath: string) => {
    try {
      setIsLoading(true);
      
      const result = await window.electronAPI.readDirectory(dirPath);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to read directory');
      }

      if (result.files) {
        const filesWithId = result.files.map((file, index) => ({
          id: `${index + 1}`,
          name: file.name,
          isDirectory: file.isDirectory,
          size: file.size || 0,
          updatedAt: file.updatedAt,
          path: file.path
        }));
        setFiles(filesWithId);
      }
      
    } catch (error) {
      console.error('Error loading directory contents:', error);
      alert(`Failed to load directory contents: ${error}`);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileAction = async (file: FileItem) => {
    if (file.isDirectory) {
      handleNavigateToFolder(file.path);
    } else {
      try {
        const result = await window.electronAPI.openFile(file.path);
        if (!result.success) {
          alert(`Failed to open file: ${result.error}`);
        }
      } catch (error) {
        console.error('Error opening file:', error);
        alert(`Failed to open file: ${error}`);
      }
    }
  };

  const handleNavigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
    loadDirectoryContents(folderPath);
  };

  const navigateUp = async () => {
    if (currentPath !== "/" && selectedWorkspace) {
      const parentPath = currentPath.split("/").slice(0, -1).join("/") || selectedWorkspace.path;
      setCurrentPath(parentPath);
      await loadDirectoryContents(parentPath);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="workspace-explorer">
      {/* Header */}
      <div className="workspace-header">
        <h2 className="workspace-title">Workspace</h2>
        <button
          className="select-workspace-button"
          onClick={handleSelectWorkspace}
          title="Select workspace folder"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4h3l1-1h7v9H2V4z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      </div>

      {!selectedWorkspace ? (
        /* Welcome State */
        <div className="workspace-welcome">
          <div className="welcome-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M6 12h9l3-3h21v27H6V12z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <h3 className="welcome-title">Select a Workspace</h3>
          <p className="welcome-description">
            Choose a folder to browse and manage your files
          </p>
          <button
            className="select-folder-button"
            onClick={handleSelectWorkspace}
          >
            Browse Folders
          </button>
        </div>
      ) : (
        /* File Explorer */
        <div className="file-explorer">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <button
              className="breadcrumb-item"
              onClick={() => {
                if (selectedWorkspace) {
                  setCurrentPath(selectedWorkspace.path);
                  loadDirectoryContents(selectedWorkspace.path);
                }
              }}
              title="Go to workspace root"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 5h3l1-1h6v7H2V5z"
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">
              {currentPath === "/" ? "Workspace" : currentPath.split("/").pop()}
            </span>
            {currentPath !== "/" && (
              <button
                className="breadcrumb-up"
                onClick={navigateUp}
                title="Go up"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M9 8l-3-3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* File List */}
          <div className="file-list">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>Loading files...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="empty-state">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M4 8h6l2-2h14v18H4V8z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d="M12 16h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>This folder is empty</span>
              </div>
            ) : (
              files.map((file, index) => (
                <div
                  key={`${file.path}-${index}`}
                  className={`file-item ${file.isDirectory ? "directory" : "file"}`}
                  onClick={() => handleFileAction(file)}
                >
                  <div className="file-icon">
                    {file.isDirectory ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2 4h3l1-1h7v9H2V4z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          fill="rgba(59, 130, 246, 0.1)"
                        />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 2h8l2 2v10H3V2z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          fill="rgba(156, 163, 175, 0.1)"
                        />
                        <path
                          d="M11 2v2h2"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <div className="file-meta">
                      {!file.isDirectory && file.size && (
                        <span className="file-size">{formatFileSize(file.size)}</span>
                      )}
                      <span className="file-date">{formatDate(file.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
