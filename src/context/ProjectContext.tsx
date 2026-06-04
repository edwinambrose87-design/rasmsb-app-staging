'use client'
import { createContext, useContext, useState, ReactNode } from 'react';

// This defines the "shape" of our global data
interface ProjectContextType {
  projectId: string | null;
  setProjectId: (id: string) => void;
  isLocked: boolean; // Tells us if the user is allowed to switch projects
  setIsLocked: (locked: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  return (
    <ProjectContext.Provider value={{ projectId, setProjectId, isLocked, setIsLocked }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used within a ProjectProvider");
  return context;
};