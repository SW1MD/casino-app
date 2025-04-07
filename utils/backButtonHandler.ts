import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * A utility hook to handle Android back button press in components
 * @param onBackPress - Function to execute when back button is pressed
 */
export const useBackButton = (onBackPress?: () => void) => {
  useEffect(() => {
    // Add event listener for back button press
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Call the provided back function
        if (onBackPress) {
          onBackPress();
          return true; // Prevent default behavior
        }
        return false; // Allow default behavior if no handler
      }
    );

    // Clean up the event listener on unmount
    return () => backHandler.remove();
  }, [onBackPress]);
}; 