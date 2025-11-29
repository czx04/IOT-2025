import SharedGroupPreferences from 'react-native-shared-group-preferences';
import type { AuthUser } from '@/lib/auth';

const APP_GROUP_ID = 'group.hdu.iot.data';

/**
 * Update widget data with user profile information
 * Calculates age from date_of_birth and stores name and age in shared preferences
 */
export const updateWidgetData = async (user: AuthUser | null) => {
  if (!user) {
    console.log('[Widget] No user data to update');
    return;
  }

  try {
    // Calculate age from date of birth
    const birthDate = user.date_of_birth ? new Date(user.date_of_birth) : null;
    const age = birthDate 
      ? new Date().getFullYear() - birthDate.getFullYear()
      : 0;

    const widgetData = {
      name: user.name || 'User',
      age: age.toString(), // Convert to string to match Swift expectations
    };

    await SharedGroupPreferences.setItem(
      'health_profile',
      JSON.stringify(widgetData),
      APP_GROUP_ID
    );

    console.log('[Widget] Data updated successfully:', widgetData);
  } catch (error) {
    console.error('[Widget] Error updating widget data:', error);
  }
};
