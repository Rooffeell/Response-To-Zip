import React from 'react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import TypewriterTitle from '@/components/TypewriterTitle';
import ResponseParser from '@/components/ResponseParser';
import { MultiStepLoader } from '@/components/ui/multi-step-loader';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  const loadingStates = [
    { text: "Initializing Response to Zip converter..." },
    { text: "Loading AI response parser..." },
    { text: "Setting up ZIP generation engine..." },
    { text: "Preparing file structure analyzer..." },
    { text: "Ready to convert your code!" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); 

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="min-h-screen bg-black text-white dark">
        <div
          className={cn(
            "fixed inset-0",
            "[background-size:20px_20px]",
            "dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]"
          )}
        />
        <div className="fixed inset-0 dark:bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <TypewriterTitle />
          </div>
          
          <ResponseParser />
          
          <footer className="text-center mt-16 text-neutral-500 text-sm">
            <p>A client-side tool to convert AI code responses into ZIP archives. No data is sent to any server.</p>
          </footer>
        </div>
      </div>
      
      <MultiStepLoader loadingStates={loadingStates} loading={isLoading} duration={600} loop={false} />
    </>
  );
}

export default App;
