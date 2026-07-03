import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";

// Auth & Dashboard
import { Login } from "./pages/auth/Login";
import { Dashboard } from "./pages/dashboard/Dashboard";

// Financial Control
import { Budgets } from "./pages/financial-control/Budgets";
import { BudgetDetail } from "./pages/financial-control/BudgetDetail";
import { Subscriptions } from "./pages/financial-control/Subscriptions";
import { PiggyBanks } from "./pages/financial-control/PiggyBanks";
import { PiggyBankDetail } from "./pages/financial-control/PiggyBankDetail";
import { SubscriptionDetail } from "./pages/financial-control/SubscriptionDetail";

// Accounting
import { Transactions } from "./pages/accounting/Transactions";
import { Withdrawal } from "./pages/accounting/Withdrawal";
import { Deposit } from "./pages/accounting/Deposit";
import { Transfers } from "./pages/accounting/Transfers";
import { Rules } from "./pages/accounting/automation/Rules";
import { Recurrences } from "./pages/accounting/automation/Recurrences";
import { Webhooks } from "./pages/accounting/automation/Webhooks";

// Others - Accounts
import { AssetAccounts } from "./pages/others/accounts/AssetAccounts";
import { Liabilities } from "./pages/others/accounts/Liabilities";
import { ExpenseView } from "./pages/others/accounts/ExpenseView";
import { IncomeView } from "./pages/others/accounts/IncomeView";
import { AccountDetail } from "./pages/others/accounts/AccountDetail";

// Others - Classification
import { Categories } from "./pages/others/classification/Categories";
import { Tags } from "./pages/others/classification/Tags";
import { ObjectGroups } from "./pages/others/classification/ObjectGroups";

// Others - Misc
import { Reports } from "./pages/others/Reports";
import { ExportData } from "./pages/others/ExportData";
import { ErrorPage } from "./pages/others/ErrorPage";

// Options
import { Profile } from "./pages/options/Profile";
// import { OAuthTokens } from "./pages/options/OAuthTokens";
import { Preferences } from "./pages/options/Preferences";
import { Currencies } from "./pages/options/Currencies";
import { ExchangeRates } from "./pages/options/ExchangeRates";
import { Administrations } from "./pages/options/Administrations";
// import { SystemSettings } from "./pages/options/SystemSettings";

import { NotificationCenter } from "./pages/notifications/NotificationCenter";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    errorElement: <ErrorPage />,
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      // Dashboard
      { index: true, element: <Dashboard /> },

      // ── FINANCIAL CONTROL ─────────────────────────────────────────────────
      { path: "budgets", element: <Budgets /> },
      { path: "budgets/:id", element: <BudgetDetail /> },
      // Legacy redirect
      { path: "budget", element: <Navigate to="/budgets" replace /> },

      { path: "subscriptions", element: <Subscriptions /> },
      { path: "subscriptions/:id", element: <SubscriptionDetail /> },

      { path: "piggy-banks", element: <PiggyBanks /> },
      { path: "piggy-banks/:id", element: <PiggyBankDetail /> },
      // Legacy redirect
      { path: "savings", element: <Navigate to="/piggy-banks" replace /> },

      // ── ACCOUNTING ────────────────────────────────────────────────────────
      {
        path: "transactions",
        children: [
          { index: true, element: <Navigate to="/transactions/all" replace /> },
          { path: "withdrawal", element: <Withdrawal /> },
          { path: "deposit", element: <Deposit /> },
          { path: "transfers", element: <Transfers /> },
          { path: "all", element: <Transactions /> },
        ],
      },

      // Automation
      { path: "rules", element: <Rules /> },
      { path: "recurring", element: <Recurrences /> },
      { path: "webhooks", element: <Webhooks /> },

      // ── OTHERS ────────────────────────────────────────────────────────────
      // Accounts
      {
        path: "accounts",
        children: [
          { index: true, element: <Navigate to="/accounts/asset" replace /> },
          { path: "asset", element: <AssetAccounts /> },
          { path: "expense", element: <ExpenseView /> },
          { path: "income", element: <IncomeView /> },
          { path: "liabilities", element: <Liabilities /> },
          { path: ":id/detail", element: <AccountDetail /> },
        ],
      },
      // Legacy redirect
      { path: "wallet", element: <Navigate to="/accounts/asset" replace /> },

      // Classification
      { path: "categories", element: <Categories /> },
      { path: "tags", element: <Tags /> },
      { path: "object-groups", element: <ObjectGroups /> },

      { path: "reports", element: <Reports /> },
      { path: "export", element: <ExportData /> },

      // ── NOTIFICATIONS ────────────────────────────────────────────────────
      { path: "notifications", element: <NotificationCenter /> },

      // ── OPTIONS ───────────────────────────────────────────────────────────
      { path: "profile", element: <Profile /> },
      // Legacy redirect
      { path: "account", element: <Navigate to="/profile" replace /> },
      {
        path: "profile",
        children: [
          { index: true, element: <Profile /> },
          // { path: "oauth", element: <OAuthTokens /> },
        ],
      },
      { path: "preferences", element: <Preferences /> },
      { path: "currencies", element: <Currencies /> },
      { path: "exchange-rates", element: <ExchangeRates /> },
      { path: "administrations", element: <Administrations /> },
      // { path: "settings", element: <SystemSettings /> },
    ],
  },
]);
