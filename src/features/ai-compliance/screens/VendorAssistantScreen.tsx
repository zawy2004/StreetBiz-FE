import { Navigate } from 'react-router-dom';

/** Existing vendor bookmarks open the shared, role-aware assistant. */
export function VendorAssistantScreen() {
  return <Navigate to="/assistant" replace />;
}
