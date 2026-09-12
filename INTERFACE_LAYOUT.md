# Interface layout

```text
AppShell
|- Sidebar (src/components/sidebar)
|  |- Dashboard -> /
|  `- Transactions -> /transactions
`- Main content
   `- Expo Stack route
      |- DashboardScreen (src/modules/dashboard)
      `- TransactionsScreen (src/modules/transactions)
```

The sidebar is shared in the root layout. Each route imports only its module screen; the screens are deliberately blank until feature UI is added.
