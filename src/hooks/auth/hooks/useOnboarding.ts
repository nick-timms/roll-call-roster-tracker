
import { useState, useCallback, useEffect } from 'react';
import { OnboardingState } from '../types';

interface OnboardingOptions {
  totalSteps?: number;
  localStorageKey?: string;
}

const initialState: OnboardingState = {
  isComplete: false,
  currentStep: 1,
  totalSteps: 3,
  hasViewedTutorial: false
};

/**
 * Hook for managing user onboarding flow
 */
export const useOnboarding = (userId: string | null, options: OnboardingOptions = {}) => {
  const { 
    totalSteps = 3,
    localStorageKey = 'user_onboarding'
  } = options;
  
  // Initialize state with default values
  const [state, setState] = useState<OnboardingState>({
    ...initialState,
    totalSteps
  });
  
  // Load onboarding state from localStorage
  useEffect(() => {
    if (!userId) return;
    
    try {
      const key = `${localStorageKey}_${userId}`;
      const savedState = localStorage.getItem(key);
      
      if (savedState) {
        const parsedState = JSON.parse(savedState) as OnboardingState;
        setState(prev => ({
          ...prev,
          ...parsedState,
          totalSteps // Always use the current totalSteps value
        }));
      }
    } catch (error) {
      console.error('useOnboarding: Error loading onboarding state:', error);
    }
  }, [userId, localStorageKey, totalSteps]);
  
  // Save onboarding state to localStorage
  const saveState = useCallback((newState: Partial<OnboardingState>) => {
    if (!userId) return;
    
    try {
      const key = `${localStorageKey}_${userId}`;
      const updatedState = { ...state, ...newState };
      localStorage.setItem(key, JSON.stringify(updatedState));
      setState(updatedState);
    } catch (error) {
      console.error('useOnboarding: Error saving onboarding state:', error);
    }
  }, [userId, localStorageKey, state]);
  
  // Go to next step
  const nextStep = useCallback(() => {
    const currentStep = state.currentStep + 1;
    const isComplete = currentStep > state.totalSteps;
    
    saveState({
      currentStep,
      isComplete
    });
  }, [state.currentStep, state.totalSteps, saveState]);
  
  // Go to previous step
  const prevStep = useCallback(() => {
    if (state.currentStep <= 1) return;
    
    saveState({
      currentStep: state.currentStep - 1,
      isComplete: false
    });
  }, [state.currentStep, saveState]);
  
  // Go to specific step
  const goToStep = useCallback((step: number) => {
    if (step < 1 || step > state.totalSteps) return;
    
    saveState({
      currentStep: step,
      isComplete: false
    });
  }, [state.totalSteps, saveState]);
  
  // Mark onboarding as complete
  const completeOnboarding = useCallback(() => {
    saveState({
      isComplete: true,
      currentStep: state.totalSteps + 1
    });
  }, [state.totalSteps, saveState]);
  
  // Mark tutorial as viewed
  const markTutorialViewed = useCallback(() => {
    saveState({
      hasViewedTutorial: true
    });
  }, [saveState]);
  
  // Reset onboarding
  const resetOnboarding = useCallback(() => {
    saveState({
      ...initialState,
      totalSteps: state.totalSteps
    });
  }, [saveState, state.totalSteps]);
  
  return {
    ...state,
    nextStep,
    prevStep,
    goToStep,
    completeOnboarding,
    markTutorialViewed,
    resetOnboarding
  };
};
