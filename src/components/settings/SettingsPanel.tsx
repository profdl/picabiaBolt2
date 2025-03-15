import React from 'react';
import { GenerationServiceToggle } from './GenerationServiceToggle';

export const SettingsPanel: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>
      <GenerationServiceToggle />
      {/* Add other settings components here */}
    </div>
  );
}; 