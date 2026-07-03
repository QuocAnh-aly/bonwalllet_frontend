import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { router } from './routes';
import { Toaster } from './components/ui/feedback/sonner';
import { AuthProvider } from './context/AuthContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLockProvider } from './context/AppLockContext';
import { SyncProvider } from './context/SyncContext';
import { LockGate } from './components/security/LockGate';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <AppLockProvider>
          <SettingsProvider>
            <CategoriesProvider>
              <NotificationProvider>
                <SyncProvider>
                  <LockGate>
                    <RouterProvider router={router} />
                  </LockGate>
                  <Toaster position="top-right" richColors />
                </SyncProvider>
              </NotificationProvider>
            </CategoriesProvider>
          </SettingsProvider>
        </AppLockProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}