import ManualPage
  from "./ManualPage";

import ProtectedRoute
  from "../routes/ProtectedRoute";

export default function ProtectedManualPage() {
  return (
    <ProtectedRoute>
      <ManualPage />
    </ProtectedRoute>
  );
}
