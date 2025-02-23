// src/utils/mixbox.ts
import { Mixbox } from 'mixbox';

export const initializeMixbox = async () => {
  try {
    await Mixbox.init();
    console.log('Mixbox initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Mixbox:', error);
  }
};